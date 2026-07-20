import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/app-store';

export function useKeyboardShortcut() {
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const chatOpenRef = useRef(useAppStore.getState().chatOpen);

  // Keep ref in sync without causing re-renders
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      chatOpenRef.current = state.chatOpen;
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K — toggle chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setChatOpen(!chatOpenRef.current);
        return;
      }

      // Escape — close chat
      if (e.key === 'Escape' && chatOpenRef.current) {
        setChatOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setChatOpen]);
}
