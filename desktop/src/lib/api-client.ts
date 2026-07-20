import { API_BASE } from './constants';

// ── Message ──
export async function sendMessage(content: string, channel = 'desktop') {
  const res = await fetch(`${API_BASE}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_id: 'ID:000001', content, channel }),
  });
  return res.json();
}

// ── History ──
export async function getConversations(limit = 60) {
  const res = await fetch(`${API_BASE}/conversations?limit=${limit}`);
  return res.json();
}

// ── Status ──
export async function getStatus() {
  const res = await fetch(`${API_BASE}/status`);
  return res.json();
}

// ── Memories ──
export async function getMemories(limit = 20, search?: string) {
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${API_BASE}/memories?limit=${limit}${searchParam}`);
  return res.json();
}
