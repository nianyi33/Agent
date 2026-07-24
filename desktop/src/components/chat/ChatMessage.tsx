import { User, Volume2, Loader2, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import Markdown from 'react-markdown';
import type { Message } from '../../types';
import { API_BASE } from '../../lib/constants';
import { useChatStore } from '../../stores/chat-store';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const { role, content, status } = message;
  const cachedUrl = useChatStore((s) => s.audioCache[message.id]);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSpeak = useCallback(async () => {
    if (playing) return;
    setLoading(true);
    try {
      let url = cachedUrl;
      if (!url) {
        // Fallback: fetch on demand if preload hasn't finished yet
        const voice = localStorage.getItem('velora_tts_voice') || 'Cherry';
        const res = await fetch(`${API_BASE}/tts/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content, voiceId: voice }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
      }
      const audio = new Audio(url);
      audio.play();
      setPlaying(true);
      setLoading(false);
      audio.onended = () => {
        setPlaying(false);
        // Only revoke if it wasn't from the cache
        if (!cachedUrl) URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlaying(false);
        setLoading(false);
      };
    } catch {
      setLoading(false);
    }
  }, [content, cachedUrl, playing]);

  // System or error messages: centered, muted, no avatar
  if (role === 'system' || status === 'error') {
    return (
      <div
        style={{
          alignSelf: 'center',
          textAlign: 'center',
          fontSize: 12,
          color: status === 'error' ? '#FF5F57' : '#555588',
          padding: '6px 12px',
          maxWidth: '80%',
        }}
      >
        {content}
      </div>
    );
  }

  const isUser = role === 'user';

  // Extract thinking section: content starting with "思考：" signals a reasoning preamble
  const { thinkingText, answerText } = useMemo(() => {
    if (isUser || !content) return { thinkingText: '', answerText: content || '' };
    const trimmed = content.trimStart();
    const thinkIdx = trimmed.indexOf('思考：');
    if (thinkIdx > 3) return { thinkingText: '', answerText: content }; // too far from start — not a thinking block
    if (thinkIdx < 0) return { thinkingText: '', answerText: content }; // no "思考：" at all
    // drop the leading whitespace + "思考：" marker
    const rest = trimmed.slice(thinkIdx + 3);
    // Split at first double-newline OR "---" after the 思考 marker
    const sep = rest.match(/\n\n|---/);
    if (!sep || typeof sep.index !== 'number') {
      // No separator yet — treat everything as thinking (streaming in progress)
      return { thinkingText: rest, answerText: '' };
    }
    return {
      thinkingText: rest.slice(0, sep.index).trim(),
      answerText: rest.slice(sep.index + (sep[0].length)).trim(),
    };
  }, [content, isUser]);

  const [thinkingOpen, setThinkingOpen] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        maxWidth: '85%',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: isUser
            ? 'linear-gradient(135deg, #4A9CFF, #635BFF)'
            : 'transparent',
        }}
      >
        {isUser ? (
          <User size={14} color="#fff" />
        ) : (
          <img
            src={localStorage.getItem('velora_ai_avatar') || '/sidebar-logo.png'}
            alt="AI"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Bubble column: bubble + optional speak button */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:isUser?'flex-end':'flex-start', gap:2, minWidth:0 }}>
        <div
          style={{
            padding: '10px 15px', borderRadius: 18, fontSize: 13, lineHeight: 1.55,
            color: 'var(--color-text-primary)',
            borderTopLeftRadius: isUser ? undefined : 4,
            borderTopRightRadius: isUser ? 4 : undefined,
            background: isUser
              ? 'linear-gradient(135deg, rgba(99, 91, 255, 0.35), rgba(74, 156, 255, 0.22))'
              : 'var(--color-glass-bg)',
            border: isUser
              ? '1px solid rgba(150, 150, 255, 0.18)'
              : '1px solid rgba(150, 150, 255, 0.12)',
            wordBreak: 'break-word',
          }}
          className="chat-bubble"
        >
          {isUser ? (
            content
          ) : (
            <>
              {/* Streaming placeholder: show a thinking block IMMEDIATELY before the first token */}
              {isStreaming && !thinkingText && !answerText ? (
                <div style={{ marginBottom: 10 }}>
                  <button
                    onClick={() => setThinkingOpen(o => !o)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(139,92,255,0.08)',
                      border: '1px solid rgba(139,92,255,0.2)',
                      borderRadius: 10, padding: '6px 12px',
                      cursor: 'pointer', width: '100%',
                      color: '#A78BFA', fontSize: 12, fontWeight: 600,
                      fontFamily: 'inherit',
                    }}
                  >
                    <Loader2 size={12} className="animate-spin" />
                    <span>正在思考...</span>
                    <span style={{ marginLeft: 'auto' }}>
                      {thinkingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </button>
                </div>
              ) : null}
              {thinkingText ? (
                <div style={{ marginBottom: answerText ? 10 : 0 }}>
                  <button
                    onClick={() => setThinkingOpen(o => !o)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(139,92,255,0.08)',
                      border: '1px solid rgba(139,92,255,0.2)',
                      borderRadius: 10, padding: '6px 12px',
                      cursor: 'pointer', width: '100%',
                      color: '#A78BFA', fontSize: 12, fontWeight: 600,
                      fontFamily: 'inherit',
                    }}
                  >
                    <Brain size={14} />
                    <span>思考过程</span>
                    {isStreaming && !answerText && <Loader2 size={12} className="animate-spin" style={{ marginLeft: 4 }} />}
                    <span style={{ marginLeft: 'auto' }}>
                      {thinkingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </button>
                  {thinkingOpen && (
                    <div style={{
                      marginTop: 6, padding: '8px 12px',
                      borderRadius: 10,
                      background: 'rgba(139,92,255,0.04)',
                      border: '1px solid rgba(139,92,255,0.08)',
                      fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6,
                    }}>
                      <Markdown
                        components={{
                          p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
                          code: ({ children, className }) => {
                            const inline = !className;
                            return inline
                              ? <code style={{ background: 'rgba(150,150,255,0.15)', padding: '1px 5px', borderRadius: 4, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{children}</code>
                              : <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 8, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', overflowX: 'auto', margin: '4px 0' }}><code>{children}</code></pre>;
                          },
                          strong: ({ children }) => <strong style={{ color: '#C4B5FD' }}>{children}</strong>,
                          em: ({ children }) => <em style={{ color: 'var(--color-text-secondary)' }}>{children}</em>,
                        }}
                      >
                        {thinkingText}
                      </Markdown>
                    </div>
                  )}
                </div>
              ) : null}
              {answerText ? (
                <Markdown
                  components={{
                    p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
                    code: ({ children, className }) => {
                      const inline = !className;
                      return inline
                        ? <code style={{ background: 'rgba(150,150,255,0.15)', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{children}</code>
                        : <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 10, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', overflowX: 'auto', margin: '8px 0' }}><code>{children}</code></pre>;
                    },
                    ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '4px 0' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '4px 0' }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ color: '#C4B5FD' }}>{children}</strong>,
                    em: ({ children }) => <em style={{ color: 'var(--color-text-secondary)' }}>{children}</em>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#8B5CFF', textDecoration: 'underline' }}>{children}</a>,
                    blockquote: ({ children }) => <blockquote style={{ borderLeft: '2px solid rgba(150,150,255,0.3)', paddingLeft: 10, margin: '6px 0', color: 'var(--color-text-secondary)' }}>{children}</blockquote>,
                    hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(150,150,255,0.15)', margin: '8px 0' }} />,
                  }}
                >
                  {answerText}
                </Markdown>
              ) : thinkingText ? null : (
                <Markdown
                  components={{
                    p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
                    code: ({ children, className }) => {
                      const inline = !className;
                      return inline
                        ? <code style={{ background: 'rgba(150,150,255,0.15)', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{children}</code>
                        : <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: 10, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', overflowX: 'auto', margin: '8px 0' }}><code>{children}</code></pre>;
                    },
                    ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '4px 0' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '4px 0' }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                    strong: ({ children }) => <strong style={{ color: '#C4B5FD' }}>{children}</strong>,
                    em: ({ children }) => <em style={{ color: 'var(--color-text-secondary)' }}>{children}</em>,
                    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#8B5CFF', textDecoration: 'underline' }}>{children}</a>,
                    blockquote: ({ children }) => <blockquote style={{ borderLeft: '2px solid rgba(150,150,255,0.3)', paddingLeft: 10, margin: '6px 0', color: 'var(--color-text-secondary)' }}>{children}</blockquote>,
                    hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(150,150,255,0.15)', margin: '8px 0' }} />,
                  }}
                >
                  {content}
                </Markdown>
              )}
            </>
          )}
          {isStreaming && (
            <span style={{ display:'inline-block', width:7, height:13, background:'#C4B5FD', marginLeft:2, verticalAlign:'text-bottom', animation:'blink 0.8s steps(1) infinite' }} />
          )}
        </div>
        {!isUser && !isStreaming && content && (
          <button onClick={handleSpeak} disabled={playing || loading} title={playing ? '播放中' : loading ? '加载中...' : '朗读'}
          style={{ width:22, height:22, borderRadius:6, background:'transparent', border:'none',
            color: playing ? '#00E676' : '#8888BB',
            cursor: playing || loading ? 'default' : 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Volume2 size={12} />}
        </button>)}
      </div>
    </div>
  );
}
