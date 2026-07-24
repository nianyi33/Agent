import { useRef, useEffect, useState } from 'react';
import { useChatStore } from '../../stores/chat-store';
import ChatMessage from './ChatMessage';
import type { Message } from '../../types';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';

export default function ChatMessageList() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const currentStreamContent = useChatStore((s) => s.currentStreamContent);
  const isThinking = useChatStore((s) => s.isThinking);
  const setIsThinking = useChatStore((s) => s.setIsThinking);
  const [thinkingExpanded, setThinkingExpanded] = useState(true);

  // Safety timeout: if thinking spinner runs > 60s with no stream event,
  // silently stop the spinner. Do NOT add an error message — the backend's
  // SSE may still deliver the reply (DeepSeek thinking mode can take 30-50s).
  // If SSE is truly dead, the frontend polls /status every 10s and will
  // eventually show an offline indicator.
  useEffect(() => {
    if (!isThinking) return;
    const t = setTimeout(() => {
      setIsThinking(false);
    }, 60000);
    return () => clearTimeout(t);
  }, [isThinking, setIsThinking]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom — use raf + scrollTop for instant, smooth tracking
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, currentStreamContent, isThinking]);

  // Build a synthetic streaming message if currently streaming
  const streamingMessage: Message | null =
    isStreaming && currentStreamContent
      ? {
          id: 'streaming',
          role: 'assistant',
          content: currentStreamContent,
          timestamp: Date.now(),
          status: 'streaming',
        }
      : null;

  const isEmpty = messages.length === 0 && !streamingMessage;

  return (
    <div
      ref={scrollContainerRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
      className="chat-message-list"
    >
      {isEmpty && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            color: 'var(--color-text-muted)',
          }}
        >
          开始和闪电树懒对话吧
        </div>
      )}

      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {/* Thinking indicator: show a full thinking block (not dots) before the first token arrives */}
      {isThinking && !currentStreamContent && (
        <div style={{ display: 'flex', gap: 10, maxWidth: '85%', alignSelf: 'flex-start' }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, overflow: 'hidden' }}>
            <img src={localStorage.getItem('velora_ai_avatar') || '/sidebar-logo.png'}
              alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:2, minWidth:0, flex:1 }}>
            <div style={{
              padding: '10px 15px', borderRadius: 18, fontSize: 13, lineHeight: 1.55,
              color: 'var(--color-text-primary)',
              background: 'var(--color-glass-bg)',
              border: '1px solid rgba(150,150,255,0.12)',
              borderTopLeftRadius: 4,
            }}>
              <button
                onClick={() => setThinkingExpanded(o => !o)}
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
                  {thinkingExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {streamingMessage && (
        <ChatMessage
          key="streaming"
          message={streamingMessage}
          isStreaming={true}
        />
      )}

      {/* Custom scrollbar + blink keyframe */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes thinkBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 1; }
          30% { transform: translateY(-6px); opacity: 0.6; }
        }
        .chat-message-list::-webkit-scrollbar {
          width: 3px;
        }
        .chat-message-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-message-list::-webkit-scrollbar-thumb {
          background: rgba(150, 150, 255, 0.25);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
