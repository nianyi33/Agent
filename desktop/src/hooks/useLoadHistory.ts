import { useEffect } from 'react';
import { getConversations } from '../lib/api-client';
import { useChatStore } from '../stores/chat-store';
import type { Message } from '../types';

interface ConversationRow {
  id: number;
  role: string;
  content: string;
  timestamp: string;
  channel?: string;
}

export function useLoadHistory() {
  const setMessages = useChatStore((s) => s.setMessages);

  useEffect(() => {
    getConversations(60)
      .then((rows) => {
        const typedRows = rows as ConversationRow[];
        const msgs: Message[] = typedRows.map((r) => ({
          id: String(r.id),
          role:
            r.role === 'jarvis'
              ? 'assistant'
              : r.role === 'user'
                ? 'user'
                : 'system',
          content: r.content || '',
          timestamp: new Date(r.timestamp || Date.now()).getTime(),
          status: 'sent' as const,
          conversationId: r.id,
          channel: r.channel,
        }));
        setMessages(msgs);
      })
      .catch((err: unknown) =>
        console.error('Failed to load history:', err),
      );
  }, [setMessages]);
}
