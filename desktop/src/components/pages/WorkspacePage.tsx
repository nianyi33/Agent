import { FolderOpen, FileText, Code, Music, Video, Terminal, HardDrive } from 'lucide-react';
import GlassPanel from '../shared/GlassPanel';

const workspaceDirs = [
  { name:'sandbox/',      icon:FolderOpen, desc:'AI 工作目录 — 文件读写和命令执行都在这里' },
  { name:'skills/',       icon:Code,       desc:'Agent 技能目录 — SKILL.md 定义文件' },
  { name:'music/',        icon:Music,      desc:'音乐库 — 本地音频文件' },
  { name:'sandbox/videos/',icon:Video,     desc:'AI 生成视频输出目录' },
  { name:'data/',         icon:HardDrive,  desc:'数据库和持久化存储 (dev.db)' },
];

export default function WorkspacePage() {
  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'32px 36px' }}>
      <h1 style={{ fontSize:22, fontWeight:700, color:'var(--color-text-primary)', marginBottom:24 }}>工作区</h1>

      <h2 style={{ fontSize:13, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:12, letterSpacing:'0.02em' }}>工作目录</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12, marginBottom:32 }}>
        {workspaceDirs.map(d => {
          const Icon = d.icon;
          return (
            <GlassPanel key={d.name} variant="light" padding>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(99,91,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={16} style={{ color:'#8B5CFF' }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--color-text-primary)', fontFamily:'monospace', marginBottom:2 }}>{d.name}</div>
                  <div style={{ fontSize:10, color:'var(--color-text-secondary)' }}>{d.desc}</div>
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <h2 style={{ fontSize:13, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:12, letterSpacing:'0.02em' }}>沙箱内置文件</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:10 }}>
        {[
          { name:'readme.txt', icon:FileText, desc:'沙箱使用说明 — AI 启动时自动创建' },
          { name:'world.txt',  icon:FileText, desc:'世界状态文件 — AI 环境记忆' },
          { name:'notes/',     icon:FolderOpen, desc:'笔记目录 — AI 自动整理' },
        ].map(f => {
          const Icon = f.icon;
          return (
            <GlassPanel key={f.name} variant="light" padding>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Icon size={14} style={{ color:'#8B5CFF', flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--color-text-primary)', fontFamily:'monospace' }}>{f.name}</div>
                  <div style={{ fontSize:9, color:'var(--color-text-secondary)' }}>{f.desc}</div>
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <div style={{ marginTop:24, padding:'12px 16px', borderRadius:12, background:'rgba(99,91,255,0.06)', border:'1px solid rgba(99,91,255,0.1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Terminal size={14} style={{ color:'#8B5CFF' }} />
          <span style={{ fontSize:12, color:'var(--color-text-secondary)' }}>
            AI 可通过 <code style={{ color:'var(--color-text-primary)', background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>exec_command</code> 执行命令，<code style={{ color:'var(--color-text-primary)', background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>write_file</code> 写入文件，<code style={{ color:'var(--color-text-primary)', background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>read_file</code> 读取文件。
            真实文件列表需通过 AI 对话获取。
          </span>
        </div>
      </div>
    </div>
  );
}
