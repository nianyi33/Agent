import { useState, useEffect, useRef } from 'react';
import { Brain, Search, Calendar } from 'lucide-react';
import GlassPanel from '../shared/GlassPanel';
import { getMemories } from '../../lib/api-client';

interface Memory { id: number; title: string; content: string; created_at: string; tags: string; }

export default function MemoryUniversePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      getMemories(50, search || undefined)
        .then((rows: Memory[]) => setMemories(rows || []))
        .catch(() => setMemories([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'32px 36px', display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Brain size={22} style={{ color:'#8B5CFF' }} />
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--color-text-primary)', margin:0 }}>记忆宇宙</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(150,150,255,0.15)', borderRadius:12, padding:'8px 14px' }}>
          <Search size={14} style={{ color:'var(--color-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索记忆..."
            style={{ background:'transparent', border:'none', outline:'none', color:'var(--color-text-primary)', fontSize:12, width:160 }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, fontSize:13, color:'var(--color-text-muted)' }}>加载中...</div>
      ) : memories.length === 0 ? (
        <GlassPanel variant="light" padding>
          <div style={{ textAlign:'center', padding:32 }}>
            <Brain size={32} style={{ color:'var(--color-text-muted)', marginBottom:12 }} />
            <div style={{ fontSize:14, color:'var(--color-text-secondary)' }}>{search ? '没有匹配的记忆' : '记忆库为空'}</div>
            <div style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:4 }}>{search ? '尝试其他关键词' : '与 AI 对话后记忆会自动写入'}</div>
          </div>
        </GlassPanel>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1 }}>
          {memories.map(m => (
            <GlassPanel key={m.id} variant="light" padding>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <Calendar size={14} style={{ color:'var(--color-text-muted)', marginTop:2, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#C0C0EE', marginBottom:4 }}>{m.title || '未命名记忆'}</div>
                  <div style={{ fontSize:11, color:'var(--color-text-secondary)', lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {(m.content || '').slice(0, 200)}
                  </div>
                  {(m.tags || '') && (
                    <div style={{ display:'flex', gap:4, marginTop:6 }}>
                      {m.tags.split(',').slice(0, 5).map((tag, i) => (
                        <span key={i} style={{ fontSize:9, color:'#8B5CFF', background:'rgba(99,91,255,0.1)', padding:'2px 6px', borderRadius:4 }}>{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize:10, color:'var(--color-text-muted)', flexShrink:0 }}>{new Date(m.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
