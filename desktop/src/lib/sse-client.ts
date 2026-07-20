import type { SSEEvent } from '../types';

const port = import.meta.env.VITE_API_PORT || '3721';
const SSE_URL = `http://127.0.0.1:${port}/events`;

export type SSEHandler = (event: SSEEvent) => void;

class SSEClientImpl {
  private es: EventSource | null = null;
  private handlers: SSEHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    if (this.es) return;
    this.es = new EventSource(SSE_URL);
    this.es.onmessage = (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data) as SSEEvent;
        for (const h of this.handlers) h(parsed);
      } catch {
        // heartbeat ping or unparseable line — ignore
      }
    };
    this.es.onerror = () => {
      this.disconnect();
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }

  on(handler: SSEHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }
}

export const sseClient = new SSEClientImpl();
