import { useEffect, useRef } from 'react';
import { sseClient } from '../lib/sse-client';
import { useChatStore } from '../stores/chat-store';
import { useAppStore } from '../stores/app-store';

export function useSSE() {
  const busyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = sseClient.on((event) => {
      const chat = useChatStore.getState();
      const app = useAppStore.getState();

      switch (event.type) {
        case 'stream_start':
          chat.setIsStreaming(true);
          chat.setIsThinking(false);
          break;

        case 'stream_chunk':
          chat.setIsThinking(false);
          // Pass mode — 'think' tokens are discarded by appendStreamChunk
          chat.appendStreamChunk(event.data?.text || '', event.data?.mode);
          break;

        case 'stream_end':
          chat.finalizeStream();
          break;

        case 'message':
          chat.finalizeStream();
          chat.setIsThinking(false);
          // localReply: stream chunks already wrote the reply via finalizeStream.
          // Only add a new message if the content differs from what was streamed.
          if (event.data?.content) {
            const msgs = useChatStore.getState().messages;
            const lastMsg = msgs[msgs.length - 1];
            const isDuplicate = lastMsg?.role === 'assistant' && lastMsg?.content === event.data.content;
            if (!isDuplicate) {
              chat.addMessage({
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: event.data.content,
                timestamp: new Date(event.ts).getTime(),
                status: 'sent',
                conversationId: event.data.conversation_id,
              });
            }
          }
          break;

        case 'message_in':
          chat.setIsThinking(true);
          break;

        case 'message_received':
        case 'tick':
          app.setAIStatus('busy');
          if (busyTimeoutRef.current) clearTimeout(busyTimeoutRef.current);
          busyTimeoutRef.current = setTimeout(() => app.setAIStatus('online'), 2000);
          chat.setIsThinking(true);
          break;

        case 'tool_executing':
          chat.addThinkingStep(event.data?.name || '工具');
          break;

        case 'tool_call':
          chat.addThinkingStep(event.data?.ok
            ? `已完成: ${event.data?.name}`
            : `失败: ${event.data?.name}`);
          break;

        case 'injector_result':
          if (event.data?.tools?.length) chat.addThinkingStep('正在准备上下文...');
          break;

        case 'agent_name_updated':
          app.setAgentName(event.data?.name || '闪电树懒');
          break;

        case 'model_switched':
          app.setModelName(event.data?.model || '');
          break;

        // Informational events — TaskPanel and other components consume via sseClient
        case 'task_set':
        case 'task_cleared':
        case 'task_step_updated':
        case 'memories_written':
        case 'quota':
        case 'reminder_fired':
        case 'context_gathered':
        case 'connected':
        case 'activated':
        case 'action':
        case 'admin':
        case 'ui_signal':
        case 'focus_frame':
          break;

        // Social status events — picked up by SettingsPage via app-store
        case 'social_status':
          if (event.data?.platform === 'wechat-clawbot') {
            if (event.data?.status === 'connected') {
              app.setWechatStatus('connected');
            } else if (event.data?.status === 'qr_ready' && event.data?.qr_url) {
              app.setWechatStatus('qr_ready');
              // Fetch QR image and store base64
              fetch(`http://127.0.0.1:3721/social/wechat-clawbot/qr-image`)
                .then(r => r.ok ? r.text() : null)
                .then(b64 => { if (b64) app.setWechatQr(b64); })
                .catch(() => {});
            } else if (event.data?.status === 'idle') {
              app.setWechatStatus('idle');
            } else if (event.data?.status === 'session_expired') {
              app.setWechatStatus('idle');
            }
          }
          break;

        case 'error':
          console.error(`[SSE] ${event.data?.label || 'error'}:`, event.data?.error);
          chat.setIsThinking(false);
          chat.setIsStreaming(false);
          chat.addMessage({
            id: `err-${Date.now()}`,
            role: 'system',
            content: `AI 回复出错: ${event.data?.error || event.data?.label || '未知错误'}`,
            timestamp: Date.now(),
            status: 'error',
          });
          break;

        default:
          break;
      }
    });

    sseClient.connect();
    return () => {
      unsub();
      sseClient.disconnect();
      if (busyTimeoutRef.current) clearTimeout(busyTimeoutRef.current);
    };
  }, []);
}
