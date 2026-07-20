#!/usr/bin/env python3
"""
FunASR Streaming ASR WebSocket Server.
Replaces whisper_server.py — uses FunASR Paraformer-large ONNX model
with Fsmn_vad for voice activity detection and CT_Transformer for punctuation.

Protocol (identical to whisper_server.py):
  - JSON control: {"type":"config","lang":"zh"} → {"type":"config_ok","lang":"zh"}
  - JSON control: {"type":"flush"} → transcribe buffered audio immediately
  - Binary PCM chunks (Int16, 16kHz, mono)
  - Result:        {"type":"transcript","text":"...","is_final":true}
"""

import asyncio
import json
import os
import sys
import tempfile
import traceback
import wave
import warnings
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import websockets

# ── Environment (China mirror compat) ──
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("FUNASR_DEVICE", "cpu")
os.environ.setdefault("OMP_NUM_THREADS", "8")
warnings.filterwarnings("ignore")

# ── Audio constants ──
SAMPLE_RATE = 16000
CHUNK_SAMPLES = SAMPLE_RATE // 4       # ~250 ms per incoming chunk
VAD_INTERVAL_S = 1.5                   # run VAD every N seconds of new audio
SILENCE_MARGIN_MS = 400                # wait after segment end before transcribing
MAX_BUFFER_S = 30                      # force-flush buffer limit
MIN_SEGMENT_MS = 300                   # skip VAD segments shorter than this

# ── ModelScope model IDs (auto-download to ~/.cache/modelscope/hub/) ──
MODEL_IDS = {
    "asr":  "iic/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-onnx",
    "vad":  "iic/speech_fsmn_vad_zh-cn-16k-common-onnx",
    "punc": "iic/punc_ct-transformer_zh-cn-common-vocab272727-onnx",
}


class FunASRServer:
    """Streaming WebSocket ASR server backed by FunASR ONNX models."""

    def __init__(self):
        self.asr_model = None
        self.vad_model = None
        self.punc_model = None
        self._executor = ThreadPoolExecutor(max_workers=2)

    # ── Model loading (auto-downloads from ModelScope on first run) ──

    @staticmethod
    def _patch_funasr_onnx_init():
        """Make SenseVoiceSmall import optional so torch is not required."""
        try:
            import importlib.util as _util
            spec = _util.find_spec("funasr_onnx")
            if not spec or not spec.origin:
                return
            init_file = spec.origin
            with open(init_file, encoding="utf-8") as f:
                content = f.read()
            old = "from .sensevoice_bin import SenseVoiceSmall"
            new = "try:\n    from .sensevoice_bin import SenseVoiceSmall\nexcept ImportError:\n    pass"
            if old in content and new not in content:
                content = content.replace(old, new, 1)  # count=1: prevent recursive replacement
                with open(init_file, "w", encoding="utf-8") as f:
                    f.write(content)
                print("[FunASR] funasr_onnx patched (SenseVoice now optional)", flush=True)
        except Exception:
            pass

    def _load_models(self):
        self._patch_funasr_onnx_init()

        print("[FunASR] 正在加载模型（首次从 ModelScope 下载，之后从本地缓存）…", flush=True)
        print("[FunASR] [进度] 开始加载 ASR 语音识别模型（约 238MB）…", flush=True)

        from funasr_onnx import Paraformer
        self.asr_model = Paraformer(
            MODEL_IDS["asr"], batch_size=1, device_id=-1, quantize=True,
            intra_op_num_threads=int(os.environ.get("OMP_NUM_THREADS", "8")),
        )
        print("[FunASR] ASR 语音识别模型已加载", flush=True)

        print("[FunASR] [进度] 开始加载 VAD 语音检测模型…", flush=True)
        from funasr_onnx import Fsmn_vad
        self.vad_model = Fsmn_vad(
            MODEL_IDS["vad"], batch_size=1, device_id=-1, quantize=True,
            intra_op_num_threads=int(os.environ.get("OMP_NUM_THREADS", "8")),
        )
        print("[FunASR] VAD 语音检测模型已加载", flush=True)

        print("[FunASR] [进度] 开始加载 PUNC 标点恢复模型…", flush=True)
        from funasr_onnx import CT_Transformer
        self.punc_model = CT_Transformer(
            MODEL_IDS["punc"], batch_size=1, device_id=-1, quantize=True,
            intra_op_num_threads=int(os.environ.get("OMP_NUM_THREADS", "8")),
        )
        print("[FunASR] PUNC loaded", flush=True)
        print("[FunASR] All models ready", flush=True)

    # ── Audio preprocessing (device-adaptive) ──
    #
    # Different microphones produce wildly different signal levels:
    #   Desktop USB:   peak 15,000–25,000  (Int16)
    #   Laptop built-in: peak  3,000–8,000
    #   Bluetooth headset: peak  1,500–4,000  ← VAD often misses these
    #
    # These two steps bring all devices to the same operating point
    # before VAD / ASR see the audio.  Both are pure NumPy — zero
    # extra dependencies and negligible CPU cost (~1 ms per 10 s).

    @staticmethod
    def _normalize_gain(audio: np.ndarray, target_rms: float = 0.1) -> np.ndarray:
        """RMS gain normalization so quiet mics trigger VAD reliably.

        target_rms=0.1 means RMS = 10 % of full scale (-20 dBFS) — the
        sweet spot where Paraformer / Fsmn_vad were trained.

        Uses the 80th-percentile frame RMS to avoid being pulled down by
        silent gaps or pulled up by isolated clicks.  Gain is capped at
        20× (≈26 dB) to prevent making pure noise sound like speech.
        """
        if len(audio) < 160:
            return audio

        f32 = audio.astype(np.float32) / 32768.0
        frame_len = 160          # 10 ms @ 16 kHz
        num_frames = len(f32) // frame_len
        if num_frames < 2:
            return audio

        frame_rms = np.array([
            np.sqrt(np.mean(f32[i * frame_len : (i + 1) * frame_len] ** 2))
            for i in range(num_frames)
        ])
        speech_rms = float(np.percentile(frame_rms, 80))
        if speech_rms < 1e-6:
            return audio  # pure silence — don't amplify noise

        gain = min(target_rms / speech_rms, 20.0)
        normalized = f32 * gain
        # Soft clip: tanh prevents hard digital clipping on transients
        # while keeping consonant clarity (which lives in the transients).
        normalized = np.tanh(normalized * 1.5) / 1.5
        return (normalized * 32767.0).astype(np.int16)

    @staticmethod
    def _spectral_noise_gate(audio: np.ndarray) -> np.ndarray:
        """Lightweight noise gate for constant background sounds.

        Computes short-time energy, estimates the noise floor from the
        quietest 10 % of frames, then attenuates frames below
        *noise floor + 12 dB*.  Uses 5 ms attack / 50 ms release so
        speech onsets are preserved while tail noise is suppressed.

        Removes: fan hum, room tone, HVAC rumble, coil whine.
        Does NOT remove: keyboard clicks, door slams (non-stationary).
        """
        if len(audio) < 160:
            return audio

        f32 = audio.astype(np.float32) / 32768.0
        frame_len, hop_len = 160, 80   # 10 ms / 5 ms, 50 % overlap

        n_frames = (len(f32) - frame_len) // hop_len + 1
        if n_frames < 5:
            return audio

        # Per-frame energy in dB
        energy_db = np.zeros(n_frames)
        for i in range(n_frames):
            start = i * hop_len
            e = np.mean(f32[start : start + frame_len] ** 2)
            energy_db[i] = 10.0 * np.log10(max(e, 1e-10))

        noise_floor = float(np.percentile(energy_db, 10))
        threshold = noise_floor + 12.0  # dB above noise floor

        # Attack / release smoothing coefficients
        atk = np.exp(-1.0 / (0.005 * 16000 / hop_len))   #  5 ms
        rel = np.exp(-1.0 / (0.050 * 16000 / hop_len))   # 50 ms

        gain = np.ones(n_frames)
        for i in range(n_frames):
            target = 1.0 if energy_db[i] >= threshold else 0.01  # -40 dB
            if i == 0:
                gain[i] = target
            else:
                coeff = atk if target < gain[i - 1] else rel
                gain[i] = coeff * gain[i - 1] + (1.0 - coeff) * target

        # Overlap-add with Hann window
        out = np.zeros(len(f32), dtype=np.float32)
        weight = np.zeros(len(f32), dtype=np.float32)
        hann = np.hanning(frame_len).astype(np.float32)

        for i in range(n_frames):
            start = i * hop_len
            g = gain[i]
            out[start : start + frame_len] += f32[start : start + frame_len] * hann * g
            weight[start : start + frame_len] += hann

        weight = np.maximum(weight, 1e-6)
        out /= weight
        return (np.clip(out, -1.0, 1.0) * 32767.0).astype(np.int16)

    # ── I/O helpers ──

    @staticmethod
    def _write_wav(samples: np.ndarray, path: str):
        """Write Int16 PCM samples as a 16 kHz mono WAV file."""
        with wave.open(path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(samples.astype(np.int16).tobytes())

    def _run_vad(self, audio: np.ndarray):
        """Run VAD on raw audio, return list of [start_ms, end_ms] segments."""
        audio = self._normalize_gain(audio)
        audio = self._spectral_noise_gate(audio)
        fd, wav_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        try:
            self._write_wav(audio, wav_path)
            result = self.vad_model(wav_path)
            return result[0] if (result and result[0]) else []
        except Exception as e:
            print(f"[FunASR] VAD error: {e}", flush=True)
            return []
        finally:
            try:
                os.unlink(wav_path)
            except OSError:
                pass

    def _transcribe(self, audio: np.ndarray) -> str:
        """Run ASR + PUNC on a speech segment. Returns transcribed text."""
        audio = self._normalize_gain(audio)
        audio = self._spectral_noise_gate(audio)
        fd, wav_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        try:
            self._write_wav(audio, wav_path)

            # ── ASR ──
            result = self.asr_model([wav_path])
            text = ""
            if isinstance(result, list) and result:
                item = result[0]
                if isinstance(item, dict):
                    if "text" in item:
                        text = item["text"]
                    elif "preds" in item:
                        preds = item["preds"]
                        text = str(preds[0]) if (isinstance(preds, tuple) and preds) else str(preds)
                else:
                    text = str(item)

            if not text or not text.strip():
                return ""

            # ── PUNC (punctuation restoration) ──
            try:
                punc_result = self.punc_model(text)
                if isinstance(punc_result, tuple) and punc_result:
                    text = str(punc_result[0])
            except Exception:
                pass  # keep unpuncuated text on failure

            return text.strip()
        except Exception as e:
            print(f"[FunASR] ASR error: {e}", flush=True)
            traceback.print_exc()
            return ""
        finally:
            try:
                os.unlink(wav_path)
            except OSError:
                pass

    # ── WebSocket handler ──

    async def handle(self, websocket):
        print("[FunASR] Client connected", flush=True)

        buf = np.array([], dtype=np.int16)
        lang = "zh"
        last_end_ms = 0.0
        loop = asyncio.get_event_loop()

        async def _maybe_transcribe():
            """Run VAD on the buffer, transcribe newly-complete segments."""
            nonlocal buf, last_end_ms

            if len(buf) < SAMPLE_RATE * 0.3:
                return

            buf_ms = len(buf) / SAMPLE_RATE * 1000
            segments = await loop.run_in_executor(self._executor, self._run_vad, buf)

            for start_ms, end_ms in segments:
                if end_ms <= last_end_ms:
                    continue
                if end_ms - start_ms < MIN_SEGMENT_MS:
                    last_end_ms = max(last_end_ms, end_ms)
                    continue
                # Only transcribe when the segment is "complete"
                # (buffered past its end + a silence margin)
                if end_ms + SILENCE_MARGIN_MS >= buf_ms:
                    continue

                s = int(start_ms * SAMPLE_RATE / 1000)
                e = int(end_ms * SAMPLE_RATE / 1000)
                seg_audio = buf[s:e].copy()

                text = await loop.run_in_executor(self._executor, self._transcribe, seg_audio)
                if text:
                    await websocket.send(json.dumps({
                        "type": "transcript", "text": text, "is_final": True,
                    }, ensure_ascii=False))
                    last_end_ms = max(last_end_ms, end_ms)
                else:
                    # Retry once; if still empty, skip to avoid infinite loop
                    if not hasattr(self, '_failed_segs'):
                        self._failed_segs = {}
                    key = (int(start_ms / 100), int(end_ms / 100))  # 100ms buckets
                    retries = self._failed_segs.get(key, 0) + 1
                    self._failed_segs[key] = retries
                    if retries > 2:
                        last_end_ms = max(last_end_ms, end_ms)  # give up

            # Trim processed audio from buffer (keep ~0.5 s overlap for context)
            if last_end_ms > 500:
                trim_to = int((last_end_ms - 500) * SAMPLE_RATE / 1000)
                if trim_to > 0:
                    buf = buf[trim_to:]
                    last_end_ms -= trim_to / SAMPLE_RATE * 1000

        try:
            async for raw in websocket:
                # ── JSON control messages ──
                if isinstance(raw, str):
                    try:
                        msg = json.loads(raw)
                    except Exception:
                        continue

                    if msg.get("type") == "config":
                        lang = msg.get("lang", "zh") or "zh"
                        await websocket.send(json.dumps({"type": "config_ok", "lang": lang}))

                    elif msg.get("type") == "flush":
                        snapshot = buf.copy()
                        buf = np.array([], dtype=np.int16)
                        last_end_ms = 0.0
                        if len(snapshot) >= SAMPLE_RATE // 8:
                            text = await loop.run_in_executor(
                                self._executor, self._transcribe, snapshot,
                            )
                            if text:
                                await websocket.send(json.dumps({
                                    "type": "transcript", "text": text, "is_final": True,
                                }, ensure_ascii=False))
                    continue

                # ── Binary audio (Int16 PCM, 16 kHz, mono) ──
                if not isinstance(raw, (bytes, bytearray)):
                    continue

                chunk = np.frombuffer(raw, dtype=np.int16)
                buf = np.append(buf, chunk)
                buf_s = len(buf) / SAMPLE_RATE

                # Periodic VAD → ASR
                unprocessed_s = buf_s - last_end_ms / 1000.0
                if unprocessed_s >= VAD_INTERVAL_S:
                    await _maybe_transcribe()

                # Buffer-overflow protection: force-transcribe everything
                if buf_s >= MAX_BUFFER_S:
                    snapshot = buf.copy()
                    buf = np.array([], dtype=np.int16)
                    last_end_ms = 0.0
                    text = await loop.run_in_executor(
                        self._executor, self._transcribe, snapshot,
                    )
                    if text:
                        await websocket.send(json.dumps({
                            "type": "transcript", "text": text, "is_final": True,
                        }, ensure_ascii=False))

        except websockets.exceptions.ConnectionClosed:
            print("[FunASR] Connection closed during processing", flush=True)
        except Exception:
            pass

        print("[FunASR] Client disconnected", flush=True)

    # ── Server entry point ──

    async def run(self, host="127.0.0.1", port=3723):
        self._load_models()

        try:
            import websockets
        except ImportError:
            print("[FunASR] Missing 'websockets' package. Install: pip install websockets", flush=True)
            sys.exit(1)

        print(f"[FunASR] Listening on ws://{host}:{port}", flush=True)
        async with websockets.serve(self.handle, host, port):
            await asyncio.Future()


def main():
    import argparse
    p = argparse.ArgumentParser(description="FunASR Streaming ASR WebSocket Server")
    p.add_argument("--host", default="127.0.0.1", help="Listen address")
    p.add_argument("--port", type=int, default=3723, help="WebSocket port")
    args = p.parse_args()

    server = FunASRServer()
    asyncio.run(server.run(host=args.host, port=args.port))


if __name__ == "__main__":
    main()
