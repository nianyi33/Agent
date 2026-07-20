import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import ChatMessageList from './ChatMessageList';

const CHAT_MAX_HEIGHT = 'min(60vh, 600px)';

interface ChatOverlayProps {
  chatOpen: boolean;
  onClose: () => void;
}

export default function ChatOverlay({
  chatOpen,
  onClose,
}: ChatOverlayProps) {
  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.div
          initial={{ maxHeight: 0, opacity: 0, scaleY: 0.92 }}
          animate={{ maxHeight: CHAT_MAX_HEIGHT, opacity: 1, scaleY: 1 }}
          exit={{ maxHeight: 0, opacity: 0, scaleY: 0.92 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: 12,
            transformOrigin: 'bottom center',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: CHAT_MAX_HEIGHT,
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(10, 15, 45, 0.85)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(150, 150, 255, 0.25)',
              borderRadius: 28,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid rgba(150, 150, 255, 0.25)',
                height: 52,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#F0F0FF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#00E676',
                    boxShadow: '0 0 8px #00E676',
                    animation: 'chat-dot-pulse 2s ease-in-out infinite',
                  }}
                />
                AI Assistant
              </span>

              <button
                onClick={onClose}
                aria-label="Close chat"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  background: 'transparent',
                  border: 'none',
                  color: '#8888BB',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#F0F0FF';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#8888BB';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* Message List */}
            <ChatMessageList />

            {/* Footer */}
            <div
              style={{
                flexShrink: 0,
                padding: '12px 20px',
                borderTop: '1px solid rgba(150, 150, 255, 0.25)',
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: '#555588' }}>
                在下方输入栏中输入消息…
              </span>
            </div>
          </div>
          {/* Keyframe animation for the green dot pulse */}
          <style>{`
            @keyframes chat-dot-pulse {
              0%, 100% { box-shadow: 0 0 6px #00E676; }
              50% { box-shadow: 0 0 16px #00E676, 0 0 24px rgba(0, 230, 118, 0.4); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
