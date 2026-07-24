import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Clock, ListTodo, Activity } from 'lucide-react';
import GlassPanel from '../shared/GlassPanel';
import { sseClient } from '../../lib/sse-client';

interface LiveTask {
  id: string;
  title: string;
  status: 'in-progress' | 'completed' | 'pending';
}

const iconMap = { completed: CheckCircle2, 'in-progress': Loader2, pending: Clock } as const;
const dotColor = { completed: '#00E676', 'in-progress': '#4A9CFF', pending: '#555588' } as const;

export default function TaskPanel() {
  const [tasks, setTasks] = useState<LiveTask[]>([]);
  const [action, setAction] = useState('');

  useEffect(() => {
    const unsub = sseClient.on(e => {
      switch (e.type) {
        case 'task_set': setTasks([{ id: `t-${Date.now()}`, title: e.data?.task || e.data?.description || 'AI 任务', status: 'in-progress' }]); break;
        case 'task_cleared': setTasks(p => p.filter(t => t.title !== e.data?.task)); break;
        case 'tool_executing': setAction(e.data?.name || '工具'); break;
        case 'tool_call': setAction(e.data?.ok ? `✓ ${e.data?.name}` : `✗ ${e.data?.name}`); break;
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!action) return;
    const t = setTimeout(() => setAction(''), 4000);
    return () => clearTimeout(t);
  }, [action]);

  const hasContent = tasks.length > 0 || action;

  return (
    <GlassPanel variant="light" className="w-[min(300px,22vw)]" padding>
      {/* Title */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom: hasContent ? 12 : 0 }}>
        <Activity size={14} style={{ color:'#8B5CFF' }} />
        <span style={{ fontSize:12, fontWeight:600, color:'var(--color-text-primary)', letterSpacing:'0.02em' }}>AI 活动</span>
        {tasks.length > 0 && <span style={{ fontSize:10, color:'#555588', marginLeft:'auto', background:'rgba(99,91,255,0.1)', padding:'2px 7px', borderRadius:6 }}>{tasks.length}</span>}
      </div>

      {/* Action pulse */}
      {action && (
        <div style={{
          display:'flex', alignItems:'center', gap:6, padding:'7px 10px', borderRadius:8, marginBottom:8,
          background:'rgba(99,91,255,0.08)', border:'1px solid rgba(99,91,255,0.15)',
          fontSize:11, color:'var(--color-text-secondary)',
        }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:'#8B5CFF', animation:'pp 1s ease-in-out infinite' }} />
          {action}
        </div>
      )}

      {/* Tasks */}
      {tasks.map(t => {
        const Icon = iconMap[t.status];
        const c = dotColor[t.status];
        const done = t.status === 'completed';
        return (
          <div key={t.id} style={{
            display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:8,
            cursor:'default', transition:'background 0.15s', marginBottom:4,
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon size={13} className={t.status === 'in-progress' ? 'animate-spin' : ''} style={{ color:c, flexShrink:0 }} />
            <span style={{ fontSize:12, color: done ? '#555588' : '#C0C0EE', textDecoration: done ? 'line-through' : 'none', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {t.title}
            </span>
          </div>
        );
      })}

      {/* Empty */}
      {!hasContent && (
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 0', justifyContent:'center' }}>
          <ListTodo size={13} style={{ color:'#555588' }} />
          <span style={{ fontSize:11, color:'#555588' }}>等待活动</span>
        </div>
      )}

      <style>{`@keyframes pp { 0%,100%{opacity:1} 50%{opacity:0.2} } @keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </GlassPanel>
  );
}
