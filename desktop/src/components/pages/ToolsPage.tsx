import { useState, useMemo } from 'react';
import {
  Wrench, Search, Globe, FileText, FolderOpen, Trash2, MessageCircle,
  Music, Monitor, Brain, Bell, Terminal, ExternalLink, Image, Cog,
  Cpu, BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ── Tool definitions — single source of truth ── */

interface ToolDef {
  name: string;
  desc: string;
  icon: LucideIcon;
  category: string;
  categoryColor: string;
}

const CATEGORY_META: Record<string, { color: string; label: string }> = {
  '文件':   { color: '#4A9CFF', label: '文件系统' },
  '终端':   { color: '#00D4FF', label: '终端' },
  '媒体':   { color: '#E879F9', label: '媒体' },
  '网络':   { color: '#00E676', label: '网络' },
  '通信':   { color: '#FFB800', label: '通信' },
  '记忆':   { color: '#8B5CFF', label: '记忆' },
  '系统':   { color: '#FF6B6B', label: '系统' },
  '智能':   { color: '#C084FC', label: '智能体' },
  '视觉':   { color: '#F97316', label: '视觉' },
  '文档':   { color: '#A78BFA', label: '文档' },
};

const tools: ToolDef[] = [
  { name: 'read_file',        desc: '读取文件内容，支持范围读取',                 category: '文件', icon: FileText,      categoryColor: CATEGORY_META['文件'].color },
  { name: 'write_file',       desc: '写入文件到沙箱',                           category: '文件', icon: FileText,      categoryColor: CATEGORY_META['文件'].color },
  { name: 'list_dir',         desc: '列出目录下的文件和文件夹',                    category: '文件', icon: FolderOpen,    categoryColor: CATEGORY_META['文件'].color },
  { name: 'delete_file',      desc: '删除文件或目录',                           category: '文件', icon: Trash2,        categoryColor: CATEGORY_META['文件'].color },
  { name: 'make_dir',         desc: '创建目录',                                 category: '文件', icon: FolderOpen,    categoryColor: CATEGORY_META['文件'].color },

  { name: 'exec_command',           desc: '在沙箱中执行系统命令',                       category: '终端', icon: Terminal, categoryColor: CATEGORY_META['终端'].color },
  { name: 'exec_quick_command',     desc: '快速命令执行（短耗时）',                     category: '终端', icon: Terminal, categoryColor: CATEGORY_META['终端'].color },
  { name: 'exec_task_command',      desc: '任务式命令（长耗时后台运行）',               category: '终端', icon: Terminal, categoryColor: CATEGORY_META['终端'].color },

  { name: 'media_mode',       desc: '播放视频 / B站 / 音乐 / 图片',               category: '媒体', icon: Monitor,  categoryColor: CATEGORY_META['媒体'].color },
  { name: 'generate_image',   desc: 'AI 图片生成',                               category: '媒体', icon: Image,    categoryColor: CATEGORY_META['媒体'].color },
  { name: 'generate_music',   desc: 'AI 音乐生成',                               category: '媒体', icon: Music,    categoryColor: CATEGORY_META['媒体'].color },
  { name: 'speak',            desc: 'TTS 语音合成并播放',                         category: '媒体', icon: Music,    categoryColor: CATEGORY_META['媒体'].color },

  { name: 'web_search',       desc: '搜索引擎查询并返回结果',                      category: '网络', icon: Search,   categoryColor: CATEGORY_META['网络'].color },
  { name: 'fetch_url',        desc: '抓取并解析网页内容',                         category: '网络', icon: Globe,    categoryColor: CATEGORY_META['网络'].color },

  { name: 'send_message',     desc: '通过微信/飞书/Discord 发送消息',             category: '通信', icon: MessageCircle, categoryColor: CATEGORY_META['通信'].color },

  { name: 'list_memories',    desc: '列出已存储的记忆',                           category: '记忆', icon: Brain,    categoryColor: CATEGORY_META['记忆'].color },
  { name: 'search_memories',  desc: '搜索记忆内容',                               category: '记忆', icon: Brain,    categoryColor: CATEGORY_META['记忆'].color },

  { name: 'hotspot_mode',     desc: '打开实时热点面板',                           category: '系统', icon: ExternalLink, categoryColor: CATEGORY_META['系统'].color },
  { name: 'worldcup_mode',    desc: '打开世界杯赛况直播',                         category: '系统', icon: Globe,        categoryColor: CATEGORY_META['系统'].color },
  { name: 'reminder',         desc: '设置提醒事项',                               category: '系统', icon: Bell,         categoryColor: CATEGORY_META['系统'].color },
  { name: 'task_set',         desc: '设定当前任务',                               category: '系统', icon: Cog,          categoryColor: CATEGORY_META['系统'].color },

  { name: 'delegate_to_agent',      desc: '委派任务给本地 AI Agent',              category: '智能', icon: Cpu, categoryColor: CATEGORY_META['智能'].color },
  { name: 'grant_agent_delegation', desc: '授权 Agent 委派权限',                  category: '智能', icon: Cpu, categoryColor: CATEGORY_META['智能'].color },

  { name: 'analyze_image',    desc: 'AI 图片分析',                               category: '视觉', icon: Image, categoryColor: CATEGORY_META['视觉'].color },

  { name: 'open_doc_panel',   desc: '打开自知识文档面板',                         category: '文档', icon: BookOpen, categoryColor: CATEGORY_META['文档'].color },
];

const categories = [...new Set(tools.map(t => t.category))];

/* ── Styles ── */

const inputBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(150,150,255,0.15)',
  borderRadius: 12,
  padding: '9px 14px',
  fontSize: 13,
  color: 'var(--color-text-primary)',
  outline: 'none',
  width: '100%',
};

const categoryLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

/* ── Component ── */

export default function ToolsPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return tools;
    const q = search.toLowerCase();
    return tools.filter(
      t => t.name.includes(q) || t.desc.includes(q) || t.category.includes(q),
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map: Record<string, ToolDef[]> = {};
    for (const t of filtered) {
      (map[t.category] ??= []).push(t);
    }
    // Keep original category order, only show non-empty
    return categories.filter(c => map[c]).map(c => ({ category: c, tools: map[c] }));
  }, [filtered]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '32px 40px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(99,91,255,0.3), rgba(139,92,255,0.15))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Wrench size={20} style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.2 }}>工具库</h1>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>{tools.length} 个工具 · {categories.length} 个分类</p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索工具名或描述…"
            style={{ ...inputBase, paddingLeft: 34 }}
          />
        </div>
      </div>

      {/* ── Category grid: 2 columns on wide, 1 on narrow ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: 28,
      }}>
        {grouped.map(({ category, tools: catTools }) => {
          const meta = CATEGORY_META[category] ?? { color: '#8B5CFF', label: category };
          return (
            <section key={category}>
              {/* Category header */}
              <div style={{ ...categoryLabel, color: meta.color }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: meta.color,
                  boxShadow: `0 0 10px ${meta.color}44`,
                }} />
                {meta.label}
                <span style={{
                  fontSize: 10, fontWeight: 400, color: 'var(--color-text-muted)',
                  marginLeft: 'auto', letterSpacing: 0,
                }}>
                  {catTools.length}
                </span>
              </div>

              {/* Tool cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catTools.map(t => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.name}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 14px', borderRadius: 14,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(150,150,255,0.08)',
                        transition: 'all 0.2s',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.borderColor = `${meta.color}44`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(150,150,255,0.08)';
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: `${meta.color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={15} style={{ color: meta.color }} />
                      </div>

                      {/* Name + desc */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 600, color: '#E0E0FF',
                          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                          marginBottom: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {t.name}
                        </div>
                        <div style={{
                          fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {t.desc}
                        </div>
                      </div>

                      {/* Category dot */}
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: meta.color,
                        opacity: 0.5,
                        flexShrink: 0,
                      }} />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Empty state */}
      {grouped.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Search size={32} style={{ color: 'var(--color-text-muted)', marginBottom: 12 }} />
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>没有匹配 "{search}" 的工具</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>尝试其他关键词</div>
        </div>
      )}
    </div>
  );
}
