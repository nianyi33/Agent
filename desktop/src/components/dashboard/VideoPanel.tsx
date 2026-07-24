import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { sseClient } from '../../lib/sse-client';

interface VideoState {
  visible: boolean;
  url: string;
  title: string;
  expanded: boolean;
}

export default function VideoPanel() {
  const [state, setState] = useState<VideoState>({ visible: false, url: '', title: '', expanded: false });

  useEffect(() => {
    const unsub = sseClient.on((event) => {
      if ((event.type as string) !== 'media_mode') return;
      const d = event.data || {};
      if (d.mode === 'video' && d.action === 'show' && d.url) {
        setState({ visible: true, url: d.url, title: d.title || '', expanded: false });
      }
      if ((d.action === 'close' || d.action === 'hide') && d.mode === 'video') {
        setState(prev => ({ ...prev, visible: false }));
      }
    });
    return unsub;
  }, []);

  const close = () => setState(prev => ({ ...prev, visible: false }));
  const toggle = () => setState(prev => ({ ...prev, expanded: !prev.expanded }));

  if (!state.visible) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: state.expanded ? 20 : 'min(340px, 30vw)',
      zIndex: 20,
      width: state.expanded ? 'calc(100% - 40px)' : 'min(520px, 38vw)',
      height: state.expanded ? 'calc(100% - 40px)' : 'min(340px, 45vh)',
      borderRadius: 20,
      overflow: 'hidden',
      background: 'rgba(8,11,36,0.95)',
      backdropFilter: 'blur(30px)',
      border: '1px solid rgba(150,150,255,0.25)',
      boxShadow: '0 0 40px rgba(99,91,255,0.2)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid rgba(150,150,255,0.15)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          🎬 {state.title || '视频播放'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={toggle} style={btnStyle}>
            {state.expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={close} style={btnStyle}><X size={14} /></button>
        </div>
      </div>
      {/* Iframe */}
      <iframe
        src={state.url}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        style={{ flex: 1, width: '100%', border: 'none' }}
        title={state.title || 'Video'}
      />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 8,
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(150,150,255,0.15)',
  color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
};
