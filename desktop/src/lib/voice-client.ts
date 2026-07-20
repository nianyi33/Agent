/**
 * VoiceClient — WebSocket /voice/cloud → 阿里云 DashScope Paraformer ASR
 *
 * 链路: 麦克风 → AudioContext(16kHz) → Int16 PCM → WS ws://127.0.0.1:3721/voice/cloud
 *       → api.js → cloud-asr.js → 阿里云 DashScope → 文字返回
 */

const port = import.meta.env.VITE_API_PORT || '3721';
const WS_URL = `ws://127.0.0.1:${port}/voice/cloud`;
const TARGET_RATE = 16000;

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'error';

export class VoiceClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;

  public state: VoiceState = 'idle';
  public onTranscript: ((text: string, isFinal: boolean) => void) | null = null;
  public onStateChange: ((state: VoiceState) => void) | null = null;

  private setState(s: VoiceState) { this.state = s; this.onStateChange?.(s); }

  async start(lang = 'zh') {
    if (this.state !== 'idle') return;
    this.setState('connecting');

    try {
      // 1. Mic
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const firstTrack = this.stream.getAudioTracks()[0];
      console.log('[Voice] ✅ mic acquired, track:', firstTrack?.label, 'tracks:', this.stream.getAudioTracks().length);

      // 2. AudioContext — CRITICAL: must resume() after user gesture
      //    Tauri WebView2 enforces autoplay policy; AudioContext starts in "suspended" state.
      this.audioCtx = new AudioContext();
      if (this.audioCtx.state === 'suspended') {
        console.log('[Voice] AudioContext suspended — calling resume()');
        await this.audioCtx.resume();
      }
      const actualRate = this.audioCtx.sampleRate;
      console.log('[Voice] AudioContext state:', this.audioCtx.state, 'rate:', actualRate, '→ target:', TARGET_RATE);

      // 3. WebSocket 连接
      this.ws = new WebSocket(WS_URL);
      this.ws.binaryType = 'arraybuffer';
      console.log('[Voice] connecting WS to:', WS_URL);

      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => { reject(new Error('WS timeout (12s)')); }, 12000);
        this.ws!.onopen = () => {
          clearTimeout(t);
          console.log('[Voice] ✅ WS connected');
          resolve();
        };
        this.ws!.onerror = (err) => {
          clearTimeout(t);
          console.error('[Voice] ❌ WS connection failed:', err);
          reject(new Error('WS connection failed'));
        };
      });

      // 4. 发送 config 帧
      const apiKey = localStorage.getItem('velora_voice_api_key') || '';
      console.log('[Voice] sending config, provider=aliyun, lang=', lang, 'keyPresent=', apiKey.length > 0);
      this.ws.send(JSON.stringify({ type: 'config', provider: 'aliyun', lang, apiKey }));

      this.ws.onmessage = (e) => {
        if (typeof e.data === 'string') {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === 'transcript' && msg.text) {
              console.log('[Voice] ← transcript:', msg.text.slice(0, 60), msg.is_final ? '(final)' : '(interim)');
              this.onTranscript?.(msg.text, msg.is_final === true);
            }
            if (msg.type === 'error') {
              console.error('[Voice] ❌ server error:', msg.message);
            }
          } catch {}
        }
      };

      this.ws.onclose = () => {
        console.log('[Voice] WS closed');
        if (this.state === 'listening') this.setState('idle');
      };
      this.ws.onerror = () => {
        console.error('[Voice] ❌ WS transport error');
        if (this.state === 'listening') this.setState('idle');
      };

      // 5. 启动音频管线: source → processor → gain(zero) → destination
      //    Must connect through destination to keep ScriptProcessor alive in Chromium,
      //    but we zero the gain to prevent feedback loop from speakers.
      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0;

      // Use ScriptProcessorNode
      // This is deprecated but WebView2 and all browsers still support it;
      // AudioWorklet requires loading from a static file which doesn't work in Tauri dev mode
      this.processor = this.audioCtx.createScriptProcessor(2048, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);

        // Downsample to 16kHz Int16 PCM
        const ratio = actualRate / TARGET_RATE;
        const outLen = Math.floor(input.length / ratio);
        const pcm = new Int16Array(outLen);

        for (let i = 0; i < outLen; i++) {
          const srcIdx = Math.floor(i * ratio);
          const sample = input[srcIdx];
          pcm[i] = Math.max(-32768, Math.min(32767, Math.trunc(sample * 32768)));
        }

        const buf = pcm.buffer.slice(0, pcm.byteLength);
        try { this.ws.send(buf); } catch {}
      };

      this.source.connect(this.processor);
      this.processor.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      console.log('[Voice] ✅ audio pipeline running');
      this.setState('listening');
    } catch (err: any) {
      console.error('[Voice] ❌ start failed:', err.message || err);
      this.stop();
      this.setState('error');
    }
  }

  async stop() {
    console.log('[Voice] stopping');
    this.processor?.disconnect();
    this.source?.disconnect();
    this.gainNode?.disconnect();
    await this.audioCtx?.close().catch(() => {});
    this.stream?.getTracks().forEach(t => t.stop());

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify({ type: 'flush' })); this.ws.close(1000); } catch {}
    }
    this.ws = this.processor = this.source = this.gainNode = this.audioCtx = this.stream = null;
    if (this.state !== 'error') this.setState('idle');
  }
}

export const voiceClient = new VoiceClient();
