import { useState, useEffect } from 'react';
import { Bot, Cpu, Code, Wrench, Activity, Play, Pause, Clock, Brain, CheckCircle2, Loader2, Circle, ArrowRight, ListTodo, Sparkles, AlertTriangle } from 'lucide-react';
import GlassPanel from '../shared/GlassPanel';
import GlowButton from '../shared/GlowButton';
import { useAppStore } from '../../stores/app-store';
import { sseClient } from '../../lib/sse-client';
import { getStatus } from '../../lib/api-client';
import { API_BASE } from '../../lib/constants';

// ── Types ──
interface PipelineTask {
  id: string;
  type: 'think' | 'tool' | 'reply';
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail: string;
  time?: string;
}

const ts = () => new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit',second:'2-digit'});

export default function AgentStudioPage() {
  const aiStatus = useAppStore(s => s.aiStatus);
  const setAIStatus = useAppStore(s => s.setAIStatus);
  const [memoryCount, setMemoryCount] = useState(0);
  const [toolCount, setToolCount] = useState(18);
  const [pipeline, setPipeline] = useState<PipelineTask[]>([]);
  const [currentTask, setCurrentTask] = useState('');
  const [lessons, setLessons] = useState<{title:string; content:string}[]>([]);

  // Load status
  useEffect(() => {
    getStatus().then(s => {
      if (s?.memory_count) setMemoryCount(s.memory_count);
      if (s?.self_evolution?.recent) {
        setLessons(s.self_evolution.recent.filter((l:any) => l.content).slice(0,5).map((l:any) => ({
          title: l.title || '', content: (l.content || '').slice(0,140),
        })));
      }
    }).catch(()=>{});
  }, []);

  // Pipeline — orchestrate SSE events into a visual workflow
  useEffect(() => {
    const add = (t: PipelineTask) => {
      setPipeline(prev => {
        // Replace duplicate ids
        const filtered = prev.filter(p => p.id !== t.id);
        return [...filtered, t].slice(-20);
      });
    };

    const unsub = sseClient.on(e => {
      switch (e.type) {
        case 'message_in':
          setPipeline([]);
          setCurrentTask('分析任务...');
          add({ id:'think', type:'think', name:'任务分析', status:'running', detail:'正在理解用户意图并分解任务', time:ts() });
          break;

        case 'injector_result': {
          setToolCount(e.data?.tools?.length || toolCount);
          add({ id:'think', type:'think', name:'任务分析', status:'done', detail:`匹配 ${e.data?.matchedMemories?.length || 0} 条相关记忆，加载 ${e.data?.tools?.length || toolCount} 个工具`, time:ts() });
          if (e.data?.directions?.length) {
            e.data.directions.forEach((d: string, i: number) => {
              add({ id:`subtask-${i}`, type:'think', name:`子任务 ${i+1}`, status:'pending', detail: d.slice(0,80), time:ts() });
            });
          }
          break;
        }

        case 'tool_executing': {
          const name = e.data?.name || '工具';
          setCurrentTask(`执行: ${name}`);
          add({ id:`tool-${e.data?.name}-${Date.now()}`, type:'tool', name, status:'running', detail:'执行中...', time:ts() });
          break;
        }

        case 'tool_call': {
          const name = e.data?.name || '工具';
          const ok = e.data?.ok;
          add({ id:`tool-${name}-${Date.now()}`, type:'tool', name, status: ok ? 'done' : 'error',
            detail: ok ? (e.data?.summary || '完成').slice(0,80) : ((e.data?.error || '失败').slice(0,80)),
            time:ts() });
          break;
        }

        case 'stream_start':
          setCurrentTask('生成回复...');
          add({ id:'reply', type:'reply', name:'AI 回复', status:'running', detail:'正在生成...', time:ts() });
          break;

        case 'stream_chunk':
          setCurrentTask('流式输出中...');
          break;

        case 'stream_end':
        case 'message':
          setCurrentTask('');
          add({ id:'reply', type:'reply', name:'AI 回复', status:'done', detail:'回复完成', time:ts() });
          // Mark all pending as done
          setPipeline(prev => prev.map(p => p.status === 'running' ? {...p, status:'done'} : p));
          break;

        case 'memories_written':
          if (e.data?.count > 0) {
            setMemoryCount(prev => prev + e.data.count);
            add({ id:`mem-${Date.now()}`, type:'think', name:'记忆写入', status:'done', detail:`存储 ${e.data.count} 条新经验`, time:ts() });
          }
          break;

        case 'error':
          setCurrentTask('');
          add({ id:`err-${Date.now()}`, type:'tool', name:'执行异常', status:'error', detail: e.data?.error || '未知错误', time:ts() });
          break;
      }
    });
    return unsub;
  }, [toolCount]);

  const handleToggle = async () => {
    const running = aiStatus !== 'offline';
    try {
      await fetch(`${API_BASE}/admin/${running ? 'stop' : 'start'}`, { method: 'POST' });
      setAIStatus(running ? 'offline' : 'online');
    } catch {}
  };

  const steps = ['分析', '分解', '调度', '执行', '回复'];

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'32px 36px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Sparkles size={22} style={{ color:'#8B5CFF' }} />
          <h1 style={{ fontSize:22, fontWeight:700, color:'#F0F0FF', margin:0 }}>智能体编排</h1>
          <span style={{ fontSize:10, color:'#555588', background:'rgba(255,255,255,0.04)', padding:'3px 10px', borderRadius:6 }}>
            {aiStatus === 'offline' ? '已暂停' : pipeline.length > 0 ? '编排中' : '待命中'}
          </span>
        </div>
        <GlowButton size="sm" variant={aiStatus === 'offline' ? 'primary' : 'ghost'} onClick={handleToggle}>
          {aiStatus === 'offline' ? <><Play size={14} style={{marginRight:4}}/>启动</> : <><Pause size={14} style={{marginRight:4}}/>暂停</>}
        </GlowButton>
      </div>

      {/* Flow indicator */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginBottom:20, padding:'12px 0' }}>
        {steps.map((step, i) => {
          const done = pipeline.some(p => {
            if (step === '分析') return p.id === 'think';
            if (step === '回复') return p.type === 'reply' && p.status === 'done';
            return p.type === 'tool' && p.status === 'done';
          });
          const running = pipeline.some(p => {
            if (step === '分析') return p.id === 'think' && p.status === 'running';
            if (step === '回复') return p.type === 'reply' && p.status === 'running';
            return p.type === 'tool' && p.status === 'running';
          });
          return (
            <div key={step} style={{ display:'flex', alignItems:'center' }}>
              <div style={{
                display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20,
                background: done ? 'rgba(0,230,118,0.1)' : running ? 'rgba(74,156,255,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${done ? 'rgba(0,230,118,0.25)' : running ? 'rgba(74,156,255,0.3)' : 'rgba(150,150,255,0.08)'}`,
              }}>
                {done ? <CheckCircle2 size={14} style={{color:'#00E676'}}/> :
                 running ? <Loader2 size={14} className="animate-spin" style={{color:'#4A9CFF'}}/> :
                 <Circle size={14} style={{color:'#555588'}}/>}
                <span style={{ fontSize:12, fontWeight:600, color: done ? '#00E676' : running ? '#4A9CFF' : '#555588' }}>{step}</span>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight size={14} style={{ color:'#333366', margin:'0 -2px', zIndex:-1 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Stat pills */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        <MiniStat icon={<Cpu size={14} style={{color:'#8B5CFF'}}/>} label="核心" value="闪电树懒 AI" />
        <MiniStat icon={<Brain size={14} style={{color:'#C0C0EE'}}/>} label="记忆" value={`${memoryCount} 条`} />
        <MiniStat icon={<Wrench size={14} style={{color:'#4A9CFF'}}/>} label="工具" value={`${toolCount} 个`} />
        <MiniStat icon={<Activity size={14} style={{color:'#00E676'}}/>} label="活动" value={`${pipeline.length} 步`} />
      </div>

      {/* Current task */}
      {currentTask && (
        <div style={{
          display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderRadius:12, marginBottom:16,
          background:'rgba(74,156,255,0.08)', border:'1px solid rgba(74,156,255,0.2)',
        }}>
          <Loader2 size={14} className="animate-spin" style={{color:'#4A9CFF'}} />
          <span style={{ fontSize:13, color:'#C0C0EE', fontWeight:500 }}>{currentTask}</span>
        </div>
      )}

      <div style={{ display:'flex', gap:20, flex:1, minHeight:0 }}>
        {/* Pipeline view */}
        <div style={{ flex:2, minWidth:0 }}>
          <h2 style={{ fontSize:13, fontWeight:600, color:'#8888BB', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <ListTodo size={13} style={{color:'#8B5CFF'}}/> 任务编排流水线
          </h2>
          {pipeline.length === 0 ? (
            <GlassPanel variant="light" padding>
              <div style={{ textAlign:'center', padding:32 }}>
                <Activity size={32} style={{ color:'#555588', marginBottom:12, opacity:0.4 }} />
                <div style={{ fontSize:14, color:'#8888BB', marginBottom:4 }}>等待用户任务</div>
                <div style={{ fontSize:11, color:'#555588' }}>发送消息后，这里会展示 AI 如何分析→分解→调度工具→生成回复</div>
              </div>
            </GlassPanel>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:'calc(100vh - 380px)', overflowY:'auto' }}>
              {pipeline.map((p, i) => {
                return (
                  <div key={`${p.id}-${i}`} style={{
                    display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8,
                    background: p.status === 'running' ? 'rgba(74,156,255,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${p.status === 'running' ? 'rgba(74,156,255,0.15)' : 'rgba(150,150,255,0.06)'}`,
                    fontSize:11,
                  }}>
                    <span style={{
                      color: p.status === 'done' ? '#00E676' : p.status === 'error' ? '#FF5252' : '#4A9CFF',
                      display:'flex', alignItems:'center', flexShrink:0,
                    }}>
                      {p.status === 'done' ? <CheckCircle2 size={11}/> :
                       p.status === 'error' ? <AlertTriangle size={11}/> :
                       p.status === 'running' ? <Loader2 size={11} className="animate-spin"/> :
                       <Circle size={11}/>}
                    </span>
                    <span style={{
                      fontSize:10, fontWeight:600, color:'#555588',
                      background:'rgba(255,255,255,0.04)', padding:'1px 5px', borderRadius:4, flexShrink:0,
                    }}>{p.type === 'think' ? '思考' : p.type === 'reply' ? '回复' : p.name}</span>
                    <span style={{ color: p.status === 'done' ? '#C0C0EE' : '#8888BB', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.detail}</span>
                    {p.time && <span style={{ color:'#555588', fontSize:10, flexShrink:0, display:'flex', alignItems:'center', gap:3 }}><Clock size={10}/>{p.time}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Agent cards + lessons */}
        <div style={{ flex:1, minWidth:240, display:'flex', flexDirection:'column', gap:10 }}>
          <h2 style={{ fontSize:13, fontWeight:600, color:'#8888BB', display:'flex', alignItems:'center', gap:6 }}>
            <Cpu size={13} style={{color:'#8B5CFF'}}/> 工作 Agent
          </h2>
          {[
            { name:'闪电树懒 AI', icon:Bot, color:'#8B5CFF', status: aiStatus !== 'offline', desc:'主控·任务分解·对话生成' },
            { name:'工具调度器', icon:Wrench, color:'#FFB800', status: true, desc:`${toolCount} 个工具注册, web_search/write_file/media_mode...` },
            { name:'沙箱执行器', icon:Code, color:'#00D4FF', status: true, desc:'文件读写·命令执行·安全隔离' },
          ].map(a => {
            const Icon = a.icon;
            return (
              <GlassPanel key={a.name} variant="light" padding>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:`${a.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={14} style={{ color:a.color }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#F0F0FF' }}>{a.name}</div>
                    <div style={{ fontSize:9, color:'#8888BB', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.desc}</div>
                  </div>
                  <div style={{ width:5, height:5, borderRadius:'50%', background: a.status ? '#00E676' : '#555588', boxShadow: a.status ? '0 0 5px #00E676' : 'none' }} />
                </div>
              </GlassPanel>
            );
          })}

          {/* Lessons */}
          {lessons.length > 0 && (
            <>
              <h2 style={{ fontSize:13, fontWeight:600, color:'#8888BB', display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                <Brain size={13} style={{color:'#8B5CFF'}}/> 自进化
              </h2>
              {lessons.map((l,i) => (
                <div key={i} style={{ fontSize:9, color:'#8888BB', padding:'6px 8px', borderRadius:6, border:'1px solid rgba(150,150,255,0.06)', lineHeight:1.4 }}>
                  <div style={{ fontWeight:600, fontSize:10, color:'#C0C0EE', marginBottom:2 }}>{l.title}</div>
                  {l.content}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon:React.ReactNode; label:string; value:string }) {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:12, borderRadius:16,
      background:'rgba(255,255,255,0.04)', border:'1px solid rgba(150,150,255,0.12)',
      backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)' }}>
      <div style={{ width:28, height:28, borderRadius:8, background:'rgba(99,91,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:9, color:'#555588' }}>{label}</div>
        <div style={{ fontSize:12, fontWeight:700, color:'#F0F0FF' }}>{value}</div>
      </div>
    </div>
  );
}
