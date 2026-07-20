import { useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/chat-store';
import ChatMessage from './ChatMessage';
import type { Message } from '../../types';

export default function ChatMessageList() {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const currentStreamContent = useChatStore((s) => s.currentStreamContent);
  const isThinking = useChatStore((s) => s.isThinking);
  const setIsThinking = useChatStore((s) => s.setIsThinking);

  // Safety timeout: if thinking lasts > 20s with no response, clear it and show error hint
  useEffect(() => {
    if (!isThinking) return;
    const t = setTimeout(() => {
      setIsThinking(false);
      // Show a system hint if no reply arrived
      const msgs = useChatStore.getState().messages;
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg?.role === 'user') {
        useChatStore.getState().addMessage({
          id: `timeout-${Date.now()}`,
          role: 'system',
          content: 'AI 回复超时，请检查网络或稍后重试。',
          timestamp: Date.now(),
          status: 'error',
        });
      }
    }, 20000);
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
            color: '#555588',
          }}
        >
          开始和VeloraAgent对话吧
        </div>
      )}

      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {/* Loading indicator — only when thinking, before first token arrives */}
      {isThinking && !currentStreamContent && (
        <div style={{ display: 'flex', gap: 10, maxWidth: '85%', alignSelf: 'flex-start' }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, overflow: 'hidden' }}>
            <img src={localStorage.getItem('velora_ai_avatar') || '/sidebar-logo.png'}
              alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(150,150,255,0.12)',
            borderRadius: 18, borderTopLeftRadius: 4, padding: '10px 15px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#8B5CFF', animation:'thinkBounce 1.4s ease-in-out infinite' }} />
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#8B5CFF', animation:'thinkBounce 1.4s ease-in-out 0.2s infinite' }} />
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#8B5CFF', animation:'thinkBounce 1.4s ease-in-out 0.4s infinite' }} />
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
