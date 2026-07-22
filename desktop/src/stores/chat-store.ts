import { create } from 'zustand';
import type { Message } from '../types';
import { API_BASE } from '../lib/constants';

interface ChatStore {
  messages: Message[];
  inputValue: string;
  isStreaming: boolean;
  isThinking: boolean;
  currentStreamContent: string;
  thinkingSteps: string[];
  /** message id → blob URL, preloaded on reply arrival */
  audioCache: Record<string, string>;

  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setInputValue: (value: string) => void;
  setIsStreaming: (v: boolean) => void;
  setIsThinking: (v: boolean) => void;
  addThinkingStep: (step: string) => void;
  setCurrentStreamContent: (v: string) => void;
  appendStreamChunk: (chunk: string, mode?: string) => void;
  finalizeStream: () => void;
  clearChat: () => void;
  /** Preload TTS audio for a message and store the blob URL. */
  preloadAudio: (messageId: string, text: string) => Promise<void>;
}

/** Kick off TTS request in background; store blob URL when ready. */
async function fetchAndCacheAudio(
  messageId: string,
  text: string,
  set: (fn: (s: ChatStore) => Partial<ChatStore>) => void,
) {
  const voice = localStorage.getItem('velora_tts_voice') || 'Cherry';
  try {
    const res = await fetch(`${API_BASE}/tts/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: voice }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (errBody?.needsConfig) {
        console.warn('[TTS] Configuration needed:', errBody.error || errBody.guide);
      }
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    set((s) => ({ audioCache: { ...s.audioCache, [messageId]: url } }));
  } catch {
    // Silently ignore — playback will fall back to on-demand fetch
  }
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  inputValue: '',
  isStreaming: false,
  isThinking: false,
  currentStreamContent: '',
  thinkingSteps: [],
  audioCache: {},

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  setInputValue: (value) => set({ inputValue: value }),

  setIsStreaming: (v) => set({ isStreaming: v }),

  setIsThinking: (v) => set({ isThinking: v, thinkingSteps: [] }),

  addThinkingStep: (step) => set((s) => ({ thinkingSteps: [...s.thinkingSteps, step] })),

  setCurrentStreamContent: (v) => set({ currentStreamContent: v }),

  appendStreamChunk: (chunk, mode) => {
    // Ignore reasoning/think tokens — they are internal model reasoning, not user-facing chat
    if (mode === 'think') return;
    set((s) => ({ currentStreamContent: s.currentStreamContent + chunk }));
  },

  finalizeStream: () => {
    const { currentStreamContent, messages } = get();
    if (!currentStreamContent.trim()) return;
    const id = `stream-${Date.now()}`;
    const assistantMsg: Message = {
      id,
      role: 'assistant',
      content: currentStreamContent,
      timestamp: Date.now(),
      status: 'sent',
    };
    set({
      messages: [...messages, assistantMsg],
      currentStreamContent: '',
      isStreaming: false,
      isThinking: false,
      thinkingSteps: [],
    });
    // Preload TTS in background — ready when user clicks 朗读
    fetchAndCacheAudio(id, currentStreamContent, set);
  },

  clearChat: () => {
    // Revoke all cached blob URLs to free memory
    const { audioCache } = get();
    for (const url of Object.values(audioCache)) {
      URL.revokeObjectURL(url);
    }
    set({ messages: [], inputValue: '', currentStreamContent: '', thinkingSteps: [], isThinking: false, audioCache: {} });
  },

  preloadAudio: async (messageId, text) => {
    await fetchAndCacheAudio(messageId, text, set);
  },
}));
