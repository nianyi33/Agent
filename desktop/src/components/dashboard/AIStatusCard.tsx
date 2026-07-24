import { useState, useEffect } from 'react';
import GlassPanel from '../shared/GlassPanel';
import { useAppStore } from '../../stores/app-store';
import { getStatus } from '../../lib/api-client';

/* ── Audio wave bar ── */
function AudioWave() {
  const bars = Array.from({length:18},()=>0);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:22, marginTop:12 }}>
      {bars.map((_,i) => (
        <div key={i} style={{ flex:1, borderRadius:2,
          background:'linear-gradient(to top, rgba(99,91,255,0.3), rgba(139,92,255,0.6))',
          animation:`aw 1.4s ease-in-out ${i*0.06}s infinite` }} />
      ))}
    </div>
  );
}

export default function AIStatusCard() {
  const agentName = useAppStore(s => s.agentName);
  const aiStatus = useAppStore(s => s.aiStatus);
  const modelName = useAppStore(s => s.modelName);
  const [memoryCount, setMemoryCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const s = await getStatus();
        if (typeof s.memory_count === 'number') setMemoryCount(s.memory_count);
        setIsRunning(s.running === true);
        useAppStore.getState().setAIStatus(s.running ? 'online' : 'idle');
      } catch {
        useAppStore.getState().setAIStatus('offline');
      }
    };
    fetch();
    const t = setInterval(fetch, 10000);
    return () => clearInterval(t);
  }, []);

  const dotColor = aiStatus === 'online' ? '#00E676' : aiStatus === 'busy' ? '#FFAB00' : '#FF5252';
  const statusText = aiStatus === 'online' ? '在线' : aiStatus === 'busy' ? '忙碌' :
    aiStatus === 'offline' ? '离线' : '空闲';

  return (
    <GlassPanel variant="light" className="w-[min(300px,22vw)]" padding>
      {/* Title row */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <span style={{ width:7, height:7, borderRadius:'50%', background:dotColor, boxShadow:`0 0 8px ${dotColor}`, flexShrink:0 }} />
        <span style={{ fontSize:12, fontWeight:600, color:'var(--color-text-primary)', letterSpacing:'0.02em' }}>{agentName}</span>
        <span style={{ fontSize:10, color:'var(--color-text-muted)', marginLeft:'auto' }}>{statusText}</span>
      </div>

      {/* Stat pills */}
      <div style={{ display:'flex', gap:6, marginBottom:4 }}>
        <StatPill label="模型" value={modelName || '未配置'} active />
        <StatPill label="记忆" value={`${memoryCount}`} />
        <StatPill label={isRunning ? '运行中' : '已暂停'} value={isRunning ? '●' : '○'} active={isRunning} />
      </div>

      <AudioWave />
      <style>{`
        @keyframes aw { 0%,100%{height:3px;opacity:0.3} 50%{height:18px;opacity:0.85} }
      `}</style>
    </GlassPanel>
  );
}

function StatPill({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div style={{
      flex:1, padding:'8px 10px', borderRadius:10,
      background: active ? 'rgba(99,91,255,0.12)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? 'rgba(99,91,255,0.25)' : 'rgba(150,150,255,0.08)'}`,
      textAlign:'center',
    }}>
      <div style={{ fontSize:10, color:'var(--color-text-muted)', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:12, fontWeight:600, color: active ? '#8B5CFF' : 'var(--color-text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</div>
    </div>
  );
}
