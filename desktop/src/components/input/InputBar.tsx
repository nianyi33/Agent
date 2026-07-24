import { useRef, useState, useEffect } from 'react';
import { Mic, MicOff, ArrowUp } from 'lucide-react';
import { useChatStore } from '../../stores/chat-store';
import { voiceClient } from '../../lib/voice-client';
import type { VoiceState } from '../../lib/voice-client';

interface InputBarProps {
  onFocus: () => void;
  onBlur: () => void;
  onSend: () => void;
}

export default function InputBar({ onFocus, onBlur, onSend }: InputBarProps) {
  const inputValue = useChatStore((s) => s.inputValue);
  const setInputValue = useChatStore((s) => s.setInputValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceText, setVoiceText] = useState('');
  const listening = voiceState === 'listening' || voiceState === 'connecting';

  useEffect(() => {
    voiceClient.onStateChange = setVoiceState;
    voiceClient.onTranscript = (text, isFinal) => {
      setVoiceText(text);
      if (isFinal && text.trim()) {
        // Write directly to store to avoid stale closure
        useChatStore.getState().setInputValue(text);
        setVoiceText('');
        onSend();
      }
    };
    return () => {
      voiceClient.onStateChange = null;
      voiceClient.onTranscript = null;
    };
  }, [onSend, setInputValue]);

  const hasValue = inputValue.trim().length > 0 || voiceText.trim().length > 0;

  const handleSend = () => {
    const text = voiceText || inputValue;
    if (!text.trim()) return;
    if (voiceText) setInputValue(voiceText);
    onSend();
    inputRef.current?.focus();
  };

  const toggleMic = () => {
    if (listening) {
      voiceClient.stop();
    } else {
      voiceClient.start('zh');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    // Space bar: hold-to-talk when input is empty
    if (e.key === ' ' && !inputValue && !listening) {
      e.preventDefault();
      toggleMic();
    }
  };

  // Show voice hint when input is empty and idle
  const stateLabel = voiceState === 'connecting' ? '连接中...' : voiceState === 'listening' ? '正在聆听...' : '按住空格键开始说话';

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 20px', borderRadius: 20,
        background: 'var(--color-glass-bg)',
        backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        border: listening
          ? '1px solid rgba(0,230,118,0.5)'
          : '1px solid rgba(150, 150, 255, 0.25)',
        boxShadow: listening
          ? '0 0 30px rgba(0,230,118,0.25)'
          : '0 0 20px rgba(99, 91, 255, 0.08)',
        transition: 'all 0.3s',
      }}
      className="input-bar"
      >
        {/* Mic button */}
        <button type="button" aria-label={listening ? '停止录音' : '语音输入'} onClick={toggleMic}
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: listening ? 'rgba(0,230,118,0.15)' : 'transparent',
            border: 'none',
            color: listening ? '#00E676' : '#8888BB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { if (!listening) { e.currentTarget.style.color = '#F0F0FF'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
          onMouseLeave={(e) => { if (!listening) { e.currentTarget.style.color = '#8888BB'; e.currentTarget.style.background = 'transparent'; } }}>
          {listening ? <MicOff size={17} /> : <Mic size={17} />}
        </button>

        {/* Text input */}
        <input ref={inputRef} type="text"
          value={listening ? voiceText : inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={onFocus} onBlur={onBlur} onKeyDown={handleKeyDown}
          placeholder={stateLabel}
          readOnly={listening}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 14, fontWeight: 500,
            color: listening ? '#00E676' : 'var(--color-text-primary)',
            fontFamily: 'inherit', letterSpacing: '0.02em', minWidth: 0,
          }}
        />

        {/* Send button */}
        <button type="button" onClick={handleSend} disabled={!hasValue} aria-label="发送消息"
          style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'linear-gradient(135deg, #635BFF, #8B5CFF)',
            border: 'none', color: '#fff',
            cursor: hasValue ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, opacity: hasValue ? 1 : 0.4, transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { if (hasValue) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 91, 255, 0.5)'; } }}
          onMouseLeave={(e) => { if (hasValue) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = 'none'; } }}>
          <ArrowUp size={15} strokeWidth={2.5} />
        </button>
      </div>

      {/* Focus-within glow + voice pulse animation */}
      <style>{`
        .input-bar:focus-within {
          border-color: rgba(99, 91, 255, 0.6) !important;
          box-shadow: 0 0 40px rgba(99, 91, 255, 0.35) !important;
        }
      `}</style>
    </div>
  );
}
