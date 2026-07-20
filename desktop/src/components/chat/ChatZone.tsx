import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/app-store';
import { useChatStore } from '../../stores/chat-store';
import ChatOverlay from './ChatOverlay';
import InputBar from '../input/InputBar';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { useAutoHide } from '../../hooks/useAutoHide';
import { sendMessage } from '../../lib/api-client';

export default function ChatZone() {
  const chatOpen = useAppStore((s) => s.chatOpen);
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const setHoverInput = useAppStore((s) => s.setHoverInput);
  const addMessage = useChatStore((s) => s.addMessage);
  const inputValue = useChatStore((s) => s.inputValue);
  const setInputValue = useChatStore((s) => s.setInputValue);
  const setIsThinking = useChatStore((s) => s.setIsThinking);
  const setCurrentStreamContent = useChatStore((s) => s.setCurrentStreamContent);

  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoneHoveredRef = useRef(false);
  const inputFocusedRef = useRef(false);

  useKeyboardShortcut();
  useAutoHide();

  const clearAllTimers = useCallback(() => {
    if (openTimerRef.current) { clearTimeout(openTimerRef.current); openTimerRef.current = null; }
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  }, []);

  const openChat = useCallback(() => {
    clearAllTimers();
    openTimerRef.current = setTimeout(() => setChatOpen(true), 250);
  }, [clearAllTimers, setChatOpen]);

  const openChatNow = useCallback(() => {
    clearAllTimers();
    setChatOpen(true);
  }, [clearAllTimers, setChatOpen]);

  const closeChat = useCallback(() => {
    clearAllTimers();
    const msgs = useChatStore.getState().messages;
    // Only auto-close if there are no messages — once conversation started, user must click X or ESC
    if (msgs.length === 0) {
      closeTimerRef.current = setTimeout(() => setChatOpen(false), 500);
    }
  }, [clearAllTimers, setChatOpen]);

  const closeImmediate = useCallback(() => {
    clearAllTimers();
    setChatOpen(false);
  }, [clearAllTimers, setChatOpen]);

  // ── single hover zone: entire #chat-zone ──
  const handleZoneEnter = useCallback(() => {
    zoneHoveredRef.current = true;
    setHoverInput(true);
    openChat();
  }, [setHoverInput, openChat]);

  const handleZoneLeave = useCallback(() => {
    zoneHoveredRef.current = false;
    if (!inputFocusedRef.current) {
      setHoverInput(false);
      closeChat();
    }
  }, [setHoverInput, closeChat]);

  const handleInputFocus = useCallback(() => {
    inputFocusedRef.current = true;
    setHoverInput(true);
    openChatNow();
  }, [setHoverInput, openChatNow]);

  const handleInputBlur = useCallback(() => {
    inputFocusedRef.current = false;
    setTimeout(() => {
      if (!zoneHoveredRef.current && !inputFocusedRef.current) {
        setHoverInput(false);
        closeChat();
      }
    }, 200);
  }, [setHoverInput, closeChat]);

  const handleSend = useCallback(async () => {
    const text = useChatStore.getState().inputValue.trim();
    if (!text) return;
    clearAllTimers();
    setChatOpen(true);
    // Reset any stale thinking/streaming state from previous turn
    setIsThinking(false);
    setCurrentStreamContent('');
    addMessage({ id: `user-${Date.now()}`, role: 'user', content: text, timestamp: Date.now(), status: 'sent' });
    setInputValue('');
    try {
      const result = await sendMessage(text, 'desktop');
      console.log('[ChatZone] message sent, conversation_id:', result.conversation_id);
    } catch (err) {
      console.error('[ChatZone] sendMessage failed:', err);
      addMessage({ id: `err-${Date.now()}`, role: 'system', content: '发送失败，请检查后端是否在运行。', timestamp: Date.now(), status: 'error' });
    }
  }, [inputValue, clearAllTimers, setChatOpen, addMessage, setInputValue]);

  useEffect(() => () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  return (
    <div
      onMouseEnter={handleZoneEnter}
      onMouseLeave={handleZoneLeave}
      style={{
        position: 'absolute', bottom: 28, left: '50%',
        transform: 'translateX(-50%)', width: 660,
        maxWidth: 'calc(100% - 48px)', zIndex: 10,
      }}
    >
      <ChatOverlay
        chatOpen={chatOpen}
        onClose={closeImmediate}
      />
      <InputBar
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onSend={handleSend}
      />
    </div>
  );
}
