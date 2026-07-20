#!/usr/bin/env python3
"""Piper TTS bridge — stdin text → stdout WAV."""

import sys
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

# Default voice model directory
DEFAULT_DIR = Path.home() / "AppData" / "Roaming" / "AI_Agent" / "piper"


def main():
    model_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DIR / "zh_CN-huayan-medium.onnx"
    if not model_path.exists():
        sys.stderr.write(f"model not found: {model_path}\n")
        sys.exit(1)

    text = sys.stdin.read().strip()
    if not text:
        sys.exit(0)

    voice = PiperVoice.load(str(model_path))
    with wave.open(sys.stdout.buffer, "wb") as wf:
        wf.setframerate(voice.config.sample_rate)
        wf.setsampwidth(2)
        wf.setnchannels(1)
        for chunk in voice.synthesize(text, SynthesisConfig()):
            wf.writeframes(chunk.audio_int16_bytes)


if __name__ == "__main__":
    main()
