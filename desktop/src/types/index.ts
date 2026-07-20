export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'streaming' | 'error';
  conversationId?: number;
  channel?: string;
}

export type AIStatus = 'online' | 'busy' | 'idle' | 'offline';

export type SSEEventType =
  | 'connected' | 'message' | 'message_in'
  | 'stream_start' | 'stream_chunk' | 'stream_end'
  | 'message_received' | 'tick' | 'action'
  | 'task_set' | 'task_cleared' | 'task_step_updated'
  | 'tool_call' | 'tool_executing' | 'memories_written'
  | 'agent_name_updated' | 'activated' | 'model_switched'
  | 'admin' | 'ui_signal' | 'error' | 'quota'
  | 'reminder_fired' | 'context_gathered' | 'injector_result' | 'focus_frame';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
  ts: string;
}

export type AppRoute =
  | 'home' | 'workspace' | 'agent-studio'
  | 'memory-universe' | 'tools' | 'settings';
