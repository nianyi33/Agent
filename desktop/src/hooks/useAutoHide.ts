import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/app-store';
import { useChatStore } from '../stores/chat-store';

export function useAutoHide() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      const chatOpen = state.chatOpen;
      const hoverInput = state.hoverInput;
      const messages = useChatStore.getState().messages;

      clearTimer();

      // Start 5-second auto-hide timer when:
      // - Chat is open
      // - Mouse is NOT hovering the input area
      // - Messages exist
      if (chatOpen && !hoverInput && messages.length > 0) {
        timerRef.current = setTimeout(() => {
          useAppStore.getState().setChatOpen(false);
        }, 5000);
      }
    });

    return () => {
      unsub();
      clearTimer();
    };
  }, []);
}
