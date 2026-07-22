import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { ArrowLeft, Cpu, Mic, Search, Brain, MessageCircle, Shield, Sliders, Upload, Check, Eye, EyeOff, Wifi, Zap } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import StatusBadge from './StatusBadge';
import GlowButton from '../shared/GlowButton';
import { API_BASE } from '../../lib/constants';

// ── Types ──
interface BackendLLM { activated?: boolean; provider?: string; model?: string; baseURL?: string; models?: ModelInfo[]; temperature?: number; thinking?: boolean; apiKey?: string; }
interface ModelInfo { id: string; label: string; deprecated: boolean; }
interface LLMSettings { agent_name?: string; llm?: BackendLLM; providers?: Record<string, any>; minimax?: { configured?: boolean }; }
type ConfirmAction = { type: 'restart' } | { type: 'reset-memories' } | { type: 'reset-files' } | null;
type VoiceServerStatus = 'online' | 'offline' | 'error' | 'loading';
type SettingsTab = 'general' | 'voice' | 'search' | 'memory' | 'social' | 'admin' | 'security';

// ── Constants ──
const ASR_ENGINES = ['DashScope'] as const;
const ASR_LANGUAGES = ['zh', 'en', 'auto'] as const;
const TTS_VOICES = [
  { id:'Cherry',    label:'Cherry',    desc:'女声推荐' },
  { id:'Emily',     label:'Emily',     desc:'女声知性' },
  { id:'Serena',    label:'Serena',    desc:'女声温柔' },
  { id:'Vivian',    label:'Vivian',    desc:'女声明亮' },
  { id:'Ryan',      label:'Ryan',      desc:'男声' },
  { id:'Dylan',     label:'Dylan',     desc:'男声' },
  { id:'Uncle_Fu',  label:'Uncle Fu',  desc:'大叔音' },
] as const;
const SEARCH_ENGINES = ['duckduckgo', 'google', 'bing', 'serpapi'] as const;
const EMBEDDING_PROVIDERS = ['local'] as const;
const LLM_API_URL = 'https://xinyuntoken.com/v1';

interface TabDef { id: SettingsTab; label: string; icon: typeof Cpu; desc: string; }

const TABS: TabDef[] = [
  { id: 'general',   label: '通用',     icon: Sliders,         desc: 'LLM 模型、API Key、AI 身份与头像' },
  { id: 'voice',     label: '语音',     icon: Mic,             desc: '语音识别 (ASR) 与语音合成 (TTS)' },
  { id: 'search',    label: '搜索',     icon: Search,          desc: 'AI 网络搜索引擎配置' },
  { id: 'memory',    label: '记忆',     icon: Brain,           desc: '嵌入模型与记忆向量化' },
  { id: 'social',    label: '社交',     icon: MessageCircle,   desc: 'Discord / 飞书 / 微信 ClawBot' },
  { id: 'admin',     label: '管理',     icon: Cpu,             desc: 'AI 启停、重启与数据清理' },
  { id: 'security',  label: '安全',     icon: Shield,          desc: '沙箱隔离模式' },
];

// ── Shared styles (compact but comfortable) ──
const C = {
  input: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(150,150,255,0.15)',
    borderRadius: 10, padding: '9px 14px', fontSize: 13, color: '#F0F0FF',
    outline: 'none', width: '100%', fontFamily: 'inherit',
  } satisfies React.CSSProperties,
  display: {
    background: 'rgba(15,18,40,0.95)', border: '1px solid rgba(150,150,255,0.1)',
    borderRadius: 10, padding: '9px 14px', fontSize: 12, color: '#8B5CFF',
    fontFamily: '"JetBrains Mono", monospace', letterSpacing: '0.02em',
  } satisfies React.CSSProperties,
  label: {
    fontSize: 11, fontWeight: 600, color: '#A0A0CC', letterSpacing: '0.03em',
    marginBottom: 6, textTransform: 'uppercase' as const,
  } satisfies React.CSSProperties,
  section: {
    marginBottom: 32,
  } satisfies React.CSSProperties,
  sectionHead: {
    fontSize: 13, fontWeight: 600, color: '#F0F0FF', marginBottom: 2,
  } satisfies React.CSSProperties,
  sectionSub: {
    fontSize: 11, color: '#555588', marginBottom: 14,
  } satisfies React.CSSProperties,
};

function toggleButton(checked: boolean, onClick: () => void) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onClick}
      style={{ width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? 'linear-gradient(135deg, #635BFF, #8B5CFF)' : 'rgba(150,150,255,0.15)',
        transition: 'background 0.2s', position: 'relative', padding: 0, flexShrink: 0 }}>
      <span style={{ position:'absolute', top:2, left: checked?20:2, width:20, height:20,
        borderRadius:'50%', background:'#F0F0FF', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

// ── Component ──
export default function SettingsPage() {
  const { agentName, setAgentName: storeSetAgentName, modelName, setModelName, aiStatus, setAIStatus } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // State (unchanged from original)
  const [localAgentName, setLocalAgentName] = useState(agentName);
  const [savingName, setSavingName] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem('velora_model') || modelName || '');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [modelSearch, setModelSearch] = useState('');
  const [fetchingModels, setFetchingModels] = useState(false);
  const [temperature, setTemperature] = useState(() => parseFloat(localStorage.getItem('velora_temperature') || '0.7'));
  const [thinking, setThinking] = useState(() => localStorage.getItem('velora_thinking') === 'true');
  const [llmApiKey, setLlmApiKey] = useState(() => localStorage.getItem('velora_llm_api_key') || '');
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [aiAvatar, setAiAvatar] = useState(localStorage.getItem('velora_ai_avatar') || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [asrEngine, setAsrEngine] = useState(() => localStorage.getItem('velora_asr_engine') || 'DashScope');
  const [asrLang, setAsrLang] = useState(() => localStorage.getItem('velora_asr_lang') || 'zh');
  const [ttsVoice, setTtsVoice] = useState(() => localStorage.getItem('velora_tts_voice') || 'Cherry');
  const [voiceStatus, setVoiceStatus] = useState<VoiceServerStatus>('offline');
  const [ttsStatus, setTtsStatus] = useState<VoiceServerStatus>('offline');
  const [voiceApiKey, setVoiceApiKey] = useState('');
  const [showVoiceKey, setShowVoiceKey] = useState(false);

  const [searchEngine, setSearchEngine] = useState(() => localStorage.getItem('velora_search_engine') || 'duckduckgo');
  const [searchApiKey, setSearchApiKey] = useState(() => localStorage.getItem('velora_search_key') || '');
  const [showSearchKey, setShowSearchKey] = useState(false);

  const [embedProvider, setEmbedProvider] = useState(() => localStorage.getItem('velora_embed_provider') || 'openai');
  const [embedModel, setEmbedModel] = useState(() => localStorage.getItem('velora_embed_model') || '');
  const [embedTesting, setEmbedTesting] = useState(false);
  const [embedTestResult, setEmbedTestResult] = useState<string | null>(null);
  const [memoryCount, setMemoryCount] = useState<number>(0);

  const [discordWebhook, setDiscordWebhook] = useState('');
  const [feishuAppId, setFeishuAppId] = useState('');
  const [feishuAppSecret, setFeishuAppSecret] = useState('');
  const [feishuConnected, setFeishuConnected] = useState(false);
  const [wechatQr, setWechatQr] = useState<string | null>(null);
  const [wechatLoggedIn, setWechatLoggedIn] = useState(false);
  const [qrExpiresAt, setQrExpiresAt] = useState<number>(0);
  const [qrCountdown, setQrCountdown] = useState<string>('');

  // Sync WeChat status from SSE real-time events
  const wechatStatusSSE = useAppStore(s => s.wechatStatus);
  const wechatQrSSE = useAppStore(s => s.wechatQr);
  useEffect(() => {
    if (wechatStatusSSE === 'connected') {
      setWechatLoggedIn(true);
      setWechatQr(null);
    } else if (wechatStatusSSE === 'qr_ready') {
      setWechatLoggedIn(false);
    } else if (wechatStatusSSE === 'idle') {
      setWechatLoggedIn(false);
    }
  }, [wechatStatusSSE]);
  useEffect(() => {
    if (wechatQrSSE) {
      setWechatQr(wechatQrSSE);
      setQrExpiresAt(Date.now() + 180000);
    }
  }, [wechatQrSSE]);

  const [sandboxEnabled, setSandboxEnabled] = useState(true);  // match backend default (fileSandbox/execSandbox: true)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);

  const aiRunning = aiStatus !== 'offline';

  const showToast = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    setToast({ message, kind }); setTimeout(() => setToast(null), 3000);
  }, []);

  const postJson = useCallback(async (path: string, body: unknown) => {
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  }, []);
  const getJson = useCallback(async (path: string) => {
    const res = await fetch(`${API_BASE}${path}`);
    return res.json();
  }, []);

  useEffect(() => { setLocalAgentName(agentName); }, [agentName]);

  // Load from backend (unchanged logic)
  useEffect(() => {
    const saved = localStorage.getItem('velora_llm_api_key');
    if (saved) setLlmApiKey(saved);
    const savedVoice = localStorage.getItem('velora_voice_api_key');
    if (savedVoice) setVoiceApiKey(savedVoice);
    let cancelled = false;
    async function load() {
      try {
        const [settings, voice, tts, status, _social, security, voices, ttss] = await Promise.allSettled([
          getJson('/settings'), getJson('/settings/voice'), getJson('/settings/tts'), getJson('/status'),
          getJson('/settings/social'), getJson('/settings/security'), getJson('/voice/status'), getJson('/tts/status'),
        ]);
        if (cancelled) return;
        if (settings.status === 'fulfilled' && settings.value) {
          const s = settings.value as LLMSettings;
          const llm = s.llm;
          if (llm) {
            if (llm.model) { setModel(llm.model); setModelName(llm.model); }
            if (llm.temperature !== undefined) setTemperature(llm.temperature);
            if (llm.thinking !== undefined) { setThinking(llm.thinking); localStorage.setItem('velora_thinking', String(llm.thinking)); }
            if (llm.models?.length) setAvailableModels(llm.models.filter((m: ModelInfo) => !m.deprecated));
          }
        }
        if (voice.status === 'fulfilled' && voice.value) {
          const v = voice.value as { voice?: { voiceProvider?: string } };
          if (v.voice?.voiceProvider) setAsrEngine(v.voice.voiceProvider);
        }
        if (tts.status === 'fulfilled' && tts.value) {
          const t = tts.value as { tts?: { ttsProvider?: string; ttsVoiceId?: string } };
          if (t.tts?.ttsVoiceId) setTtsVoice(t.tts.ttsVoiceId);
        }
        if (status.status === 'fulfilled' && status.value && typeof (status.value as any).memory_count === 'number') setMemoryCount((status.value as any).memory_count);
        if (security.status === 'fulfilled' && security.value) {
          const sec = security.value as { security?: { fileSandbox?: boolean; execSandbox?: boolean } };
          if (sec.security?.fileSandbox !== undefined) setSandboxEnabled(sec.security.fileSandbox);
        }
        if (voices.status === 'fulfilled' && voices.value) setVoiceStatus(voices.value.running ? 'online' : 'offline');
        if (ttss.status === 'fulfilled' && ttss.value) setTtsStatus(ttss.value.running ? 'online' : 'offline');
        getJson('/social/feishu/status').then((fs: unknown) => { const d = fs as { status?: string }; if (d.status === 'connected') setFeishuConnected(true); }).catch(() => {});
        getJson('/social/wechat-clawbot/qr').then(async (qr: unknown) => {
          const d = qr as { qr_url?: string; status?: string; logged_in?: boolean };
          if (d.status === 'connected') {
            setWechatLoggedIn(true);
            setWechatQr(null);
            return;
          }
          if (d.logged_in) setWechatLoggedIn(true);
          if (d.qr_url && d.status === 'qr_ready') {
            try {
              const imgResp = await fetch(`${API_BASE}/social/wechat-clawbot/qr-image`);
              if (imgResp.ok) {
                const b64 = await imgResp.text();
                setWechatQr(b64);
                setQrExpiresAt(Date.now() + 180000);
              }
            } catch {}
          }
        }).catch(() => {});
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [getJson, setModelName]);

  // ── Handlers (unchanged logic) ──
  const handleSaveAgentName = async () => { const t = localAgentName.trim(); if (!t) return; setSavingName(true); try { await postJson('/settings/agent-name', { agent_name: t }); storeSetAgentName(t); showToast('已保存'); } catch { showToast('失败', 'error'); } finally { setSavingName(false); } };
  const handleTemperature = async (v: number) => { setTemperature(v); localStorage.setItem('velora_temperature', String(v)); try { await postJson('/settings/temperature', { temperature: v }); } catch {} };
  const handleThinkingToggle = async (enabled: boolean) => { setThinking(enabled); localStorage.setItem('velora_thinking', String(enabled)); try { await postJson('/settings/thinking', { thinking: enabled }); } catch {} };
  const handleAvatarUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const base64 = reader.result as string; localStorage.setItem('velora_ai_avatar', base64); setAiAvatar(base64); showToast('头像已更新'); };
    reader.readAsDataURL(file);
  };
  // Retry-aware POST: the Node backend takes ~9-30s to start on first launch
  // (synchronous system/desktop/software scans before server.listen(3721)).
  // During that window fetch throws ECONNREFUSED (TypeError) — retry with backoff
  // instead of failing activation outright.
  const postJsonRetry = useCallback(async (path: string, body: unknown, retries = 10) => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        return res.json();
      } catch (err) {
        lastErr = err;
        // Network failure (backend not up yet) → wait and retry. Non-network errors (e.g. 400) rethrow immediately.
        const isNetwork = err instanceof TypeError;
        if (!isNetwork || attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    throw lastErr;
  }, []);

  const handleSaveApiKey = async () => {
    const t = llmApiKey.trim(); if (!t) return;
    localStorage.setItem('velora_llm_api_key', t);
    try {
      await postJsonRetry('/activate', { apiKey: t, model: model || 'deepseek-v4-pro', provider: 'xinyun', agentName: localAgentName || '闪电树懒' });
      showToast('已激活'); fetchModels();
    } catch {
      try {
        const prep = await postJsonRetry('/activate/prepare', { apiKey: t, model: model || 'deepseek-v4-pro', provider: 'xinyun' }) as any;
        if (prep?.token) { await postJsonRetry('/activate', { token: prep.token, apiKey: t, model: model || 'deepseek-v4-pro', provider: 'xinyun', agentName: localAgentName || '闪电树懒' }); showToast('已激活'); fetchModels(); }
        else { showToast('激活失败', 'error'); }
      } catch {
        showToast('后端未启动，请稍后重试', 'error');
      }
    }
  };
  const fetchModels = async () => { setFetchingModels(true); try { const data = await getJson('/settings') as any; if (data?.llm?.models) setAvailableModels(data.llm.models.filter((m: ModelInfo) => !m.deprecated)); } catch {} setFetchingModels(false); };
  const handleSelectModel = async (modelId: string) => {
    setModel(modelId);
    try { await postJson('/settings/model', { provider: 'xinyun', model: modelId }); setModelName(modelId); localStorage.setItem('velora_model', modelId); showToast(`已切换到 ${modelId}`); }
    catch { showToast('切换失败', 'error'); }
  };
  const handleSaveVoice = async () => {
    const t = voiceApiKey.trim();
    if (t) localStorage.setItem('velora_voice_api_key', t);
    localStorage.setItem('velora_asr_engine', asrEngine); localStorage.setItem('velora_asr_lang', asrLang);
    try { await postJson('/settings/voice', { voiceProvider: asrEngine, aliyunApiKey: t || undefined }); showToast('已保存'); } catch { showToast('失败', 'error'); }
  };
  const handleSaveTTS = async () => { localStorage.setItem('velora_tts_voice', ttsVoice); const t = voiceApiKey.trim(); try { await postJson('/settings/tts', { ttsProvider: 'aliyun', ttsVoiceId: ttsVoice, aliyunKey: t || undefined }); showToast('已保存'); } catch { showToast('失败', 'error'); } };
  const handleSaveSearch = async () => { localStorage.setItem('velora_search_engine', searchEngine); localStorage.setItem('velora_search_key', searchApiKey); try { await postJson('/settings/web-search', { serperKey: searchApiKey }); showToast('已保存'); } catch { showToast('失败', 'error'); } };
  const handleTestEmbedding = async () => { setEmbedTesting(true); setEmbedTestResult(null); try { const res = (await postJson('/settings/embedding/test', {})) as { ok?: boolean; error?: string }; setEmbedTestResult(res.ok ? '连接成功' : `失败: ${res.error || '未知'}`); } catch { setEmbedTestResult('请求失败'); } finally { setEmbedTesting(false); } };
  const handleSaveEmbedding = async () => { try { await postJson('/settings/embedding', { model: embedModel }); showToast('已保存'); } catch { showToast('失败', 'error'); } };
  const handleSaveSocial = async () => {
    const body: Record<string, string> = {};
    if (discordWebhook.trim()) body['DISCORD_BOT_TOKEN'] = discordWebhook.trim();
    if (feishuAppId.trim()) body['FEISHU_APP_ID'] = feishuAppId.trim();
    if (feishuAppSecret.trim()) body['FEISHU_APP_SECRET'] = feishuAppSecret.trim();
    try { await postJson('/settings/social', body); showToast('已保存'); } catch { showToast('失败', 'error'); }
  };
  const handleWechatLogout = async () => { try { await postJson('/social/wechat-clawbot/logout', {}); setWechatLoggedIn(false); showToast('已登出'); } catch { showToast('失败', 'error'); } };
  const handleConnectWechat = async () => { try { await postJson('/settings/social', { _clawbot_connect: '1' }); showToast('正在生成二维码…'); setTimeout(async () => { try { const qrResp = await getJson('/social/wechat-clawbot/qr'); const d = qrResp as { qr_url?: string; status?: string }; if (d?.qr_url && d?.status === 'qr_ready') { const imgResp = await fetch(`${API_BASE}/social/wechat-clawbot/qr-image`); if (imgResp.ok) { setWechatQr(await imgResp.text()); setQrExpiresAt(Date.now() + 180000); } } } catch {} }, 3000); } catch { showToast('启动失败', 'error'); } };

  // QR code countdown timer
  const qrSecondsLeft = qrExpiresAt ? Math.max(0, Math.floor((qrExpiresAt - Date.now()) / 1000)) : 0;
  useEffect(() => {
    if (!qrExpiresAt || qrExpiresAt <= Date.now()) return;
    const update = () => {
      const left = Math.max(0, Math.floor((qrExpiresAt - Date.now()) / 1000));
      if (left <= 0) { setQrCountdown('二维码已过期，请刷新'); return; }
      const m = Math.floor(left / 60);
      const s = left % 60;
      setQrCountdown(`二维码 ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} 后过期`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [qrExpiresAt]);
  const handleSaveSecurity = async () => { try { await postJsonRetry('/settings/security', { fileSandbox: sandboxEnabled, execSandbox: sandboxEnabled }); showToast('已保存'); } catch { showToast('失败', 'error'); } };
  const handleAdminAction = async (actionType: ConfirmAction) => { if (!actionType) return; setActionLoading(true); try { switch (actionType.type) { case 'restart': await postJson('/admin/restart', {}); showToast('正在重启...'); break; case 'reset-memories': await postJson('/admin/reset-memories', {}); setMemoryCount(0); showToast('已清除'); break; case 'reset-files': await postJson('/admin/reset-files', {}); showToast('已清除'); break; } } catch { showToast('操作失败', 'error'); } finally { setActionLoading(false); setConfirmAction(null); } };
  const handleToggleAI = async () => { try { if (aiRunning) { await postJson('/admin/stop', {}); setAIStatus('offline'); showToast('已暂停'); } else { await postJson('/admin/start', {}); setAIStatus('online'); showToast('已恢复'); } } catch { showToast('操作失败', 'error'); } };

  const renderSelect = (value: string, onChange: (e: ChangeEvent<HTMLSelectElement>) => void, options: readonly string[]) => (
    <select value={value} onChange={onChange} style={{
      ...C.input, background: 'rgba(15,18,40,0.95)',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238B5CFF' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
      appearance: 'none' as const, WebkitAppearance: 'none' as const, MozAppearance: 'none' as const, cursor: 'pointer',
    }}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
  );

  // ── Tab content ──
  const renderContent = () => {
    switch (activeTab) {
      case 'general': return (
        <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
          {/* ── LLM Config ── */}
          <section style={C.section}>
            <div style={C.sectionHead}>LLM 连接</div>
            <div style={C.sectionSub}>芯云 API 聚合平台 — 一把 Key 通吃全部模型</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:520 }}>
              <div>
                <div style={C.label}>API Key</div>
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ position:'relative', flex:1 }}>
                    <input type={showLlmKey ? 'text' : 'password'} value={llmApiKey} onChange={e => setLlmApiKey(e.target.value)}
                      style={{ ...C.input, paddingRight:36 }} placeholder="sk-..." />
                    <button onClick={() => setShowLlmKey(p => !p)}
                      style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#8888BB', cursor:'pointer', padding:4 }}>
                      {showLlmKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <GlowButton size="sm" onClick={handleSaveApiKey}>激活</GlowButton>
                </div>
              </div>
              <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
                <div style={{ flex:1 }}>
                  <div style={C.label}>服务端点</div>
                  <div style={{ ...C.display, borderColor: 'rgba(139,92,255,0.2)' }}>{LLM_API_URL}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, paddingBottom:9 }}>
                  <Wifi size={12} style={{ color: modelName ? '#00E676' : '#555588' }} />
                  <span style={{ fontSize:11, color: modelName ? '#00E676' : '#555588' }}>{modelName ? '已连接' : '未激活'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── AI Identity ── */}
          <section style={C.section}>
            <div style={C.sectionHead}>AI 身份</div>
            <div style={C.sectionSub}>名称与头像</div>
            <div style={{ display:'flex', gap:20, alignItems:'flex-start', maxWidth:520, flexWrap:'wrap' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, flexShrink:0 }}>
                <div style={{
                  width:72, height:72, borderRadius:20, overflow:'hidden',
                  background:'#0A0F2D', border:'2px solid rgba(150,150,255,0.25)',
                }}>
                  <img src={aiAvatar || '/sidebar-logo.png'} alt="AI 头像" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} style={{ display:'none' }} />
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize:11, color:'#8888BB', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  <Upload size={10} style={{ marginRight:2 }} />更换
                </button>
              </div>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={C.label}>AI 名称</div>
                <div style={{ display:'flex', gap:8 }}>
                  <input type="text" value={localAgentName} onChange={e => setLocalAgentName(e.target.value)} onKeyDown={e => { if (e.key==='Enter') handleSaveAgentName(); }}
                    style={C.input} placeholder="输入 AI 名称..." />
                  <button onClick={handleSaveAgentName} disabled={savingName}
                    style={{ width:34, height:34, borderRadius:10, border:'none', cursor:'pointer',
                      background: 'linear-gradient(135deg, #635BFF, #8B5CFF)', color:'#fff',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Check size={14} />
                  </button>
                </div>
                <div style={{ ...C.label, marginTop:12 }}>当前模型</div>
                <div style={{ ...C.display, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ color: modelName ? '#C0C0EE' : '#8888BB' }}>{modelName || '未配置'}</span>
                  <StatusBadge status={modelName ? 'online' : 'offline'} label={modelName ? '激活' : '无'} />
                </div>
              </div>
            </div>
          </section>

          {/* ── Models ── */}
          <section style={C.section}>
            <div style={C.sectionHead}>模型选择</div>
            <div style={C.sectionSub}>按厂商分组，点击切换当前模型</div>
            <div style={{ display:'flex', gap:8, marginBottom:16, maxWidth:520 }}>
              <input type="text" value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                style={{ ...C.input, flex:1 }} placeholder="搜索模型..." />
              <GlowButton size="sm" variant="ghost" onClick={fetchModels} disabled={fetchingModels}>
                {fetchingModels ? '...' : '刷新'}
              </GlowButton>
            </div>
            {(() => {
              const filtered = availableModels.filter(m => !modelSearch || m.id.includes(modelSearch) || m.label.includes(modelSearch));
              const groups: Record<string, typeof filtered> = {};
              for (const m of filtered) {
                const vendor = m.id.startsWith('deepseek') ? 'DeepSeek' : m.id.startsWith('glm') ? 'GLM' : m.id.startsWith('kimi') ? 'Kimi'
                  : m.id.startsWith('qwen') ? 'Qwen' : m.id.startsWith('minimax') ? 'MiniMax' : m.id.startsWith('mimo') ? 'MiMo' : 'Other';
                (groups[vendor] ||= []).push(m);
              }
              return ['DeepSeek','GLM','Kimi','Qwen','MiniMax','MiMo','Other'].filter(v => groups[v]).map(v => (
                <div key={v} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:'#555588', letterSpacing:'0.06em', marginBottom:6 }}>{v}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {groups[v].map(m => {
                      const active = model === m.id;
                      return (
                        <button key={m.id} onClick={() => handleSelectModel(m.id)}
                          style={{
                            padding:'7px 13px', borderRadius:10, cursor:'pointer', fontSize:11, fontWeight: active?600:400,
                            border: active?'1.5px solid #8B5CFF':'1px solid rgba(150,150,255,0.12)',
                            background: active?'rgba(99,91,255,0.18)':'rgba(255,255,255,0.03)',
                            color: active?'#F0F0FF':'#8888BB', transition:'all 0.15s', fontFamily:'inherit',
                          }}>
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
            {availableModels.length === 0 && !fetchingModels && (
              <span style={{ fontSize:12, color:'#555588' }}>输入 API Key 并激活后可加载模型列表</span>
            )}
            <div style={{ borderTop:'1px solid rgba(150,150,255,0.08)', paddingTop:14, marginTop:18, maxWidth:520 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={C.label}>温度</div>
                <span style={{ fontSize:12, fontWeight:600, color:'#8B5CFF', fontFamily:'monospace' }}>{temperature.toFixed(1)}</span>
              </div>
              <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => handleTemperature(parseFloat(e.target.value))}
                style={{ width:'100%', accentColor:'#635BFF', height:6, cursor:'pointer' }} />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:14 }}>
                <div>
                  <div style={{ ...C.label, marginBottom:0 }}>深度思考</div>
                  <div style={{ fontSize:10, color:'#555588', marginTop:2 }}>DeepSeek 模型在回复前先推理</div>
                </div>
                {toggleButton(thinking, () => handleThinkingToggle(!thinking))}
              </div>
            </div>
          </section>
        </div>
      );

      case 'voice': return (
        <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
          <section style={C.section}>
            <div style={C.sectionHead}>语音识别 ASR</div>
            <div style={C.sectionSub}>阿里云 DashScope Paraformer 实时流式</div>
            <div style={{ maxWidth:520, display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <div style={C.label}>DashScope API Key</div>
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ position:'relative', flex:1 }}>
                    <input type={showVoiceKey ? 'text' : 'password'} value={voiceApiKey} onChange={e => setVoiceApiKey(e.target.value)}
                      style={{ ...C.input, paddingRight:36 }} placeholder="sk-..." />
                    <button onClick={() => setShowVoiceKey(p => !p)}
                      style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#8888BB', cursor:'pointer', padding:4 }}>
                      {showVoiceKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:12 }}>
                <div style={{ flex:1 }}><div style={C.label}>识别引擎</div>{renderSelect(asrEngine, e => setAsrEngine(e.target.value), ASR_ENGINES)}</div>
                <div style={{ flex:1 }}><div style={C.label}>语言</div>{renderSelect(asrLang, e => setAsrLang(e.target.value), ASR_LANGUAGES)}</div>
              </div>
              <GlowButton size="sm" variant="ghost" onClick={handleSaveVoice}>保存</GlowButton>
            </div>
          </section>
          <section style={C.section}>
            <div style={C.sectionHead}>语音合成 TTS</div>
            <div style={C.sectionSub}>阿里云 DashScope Qwen-TTS — 7 种中文音色</div>
            <div style={{ maxWidth:520, display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {TTS_VOICES.map(v => {
                  const active = ttsVoice === v.id;
                  return (
                    <button key={v.id} onClick={() => setTtsVoice(v.id)}
                      style={{
                        padding:'8px 16px', borderRadius:12, cursor:'pointer', textAlign:'left' as const,
                        border: active?'1.5px solid #8B5CFF':'1px solid rgba(150,150,255,0.12)',
                        background: active?'rgba(99,91,255,0.15)':'rgba(255,255,255,0.03)',
                        transition:'all 0.15s', fontFamily:'inherit',
                      }}>
                      <div style={{ fontSize:12, fontWeight:600, color: active?'#F0F0FF':'#C0C0EE' }}>{v.label}</div>
                      <div style={{ fontSize:10, color: active?'#A78BFA':'#8888BB', marginTop:2 }}>{v.desc}</div>
                    </button>
                  );
                })}
              </div>
              <GlowButton size="sm" variant="ghost" onClick={handleSaveTTS}>保存</GlowButton>
            </div>
          </section>
          <section style={C.section}>
            <div style={C.sectionHead}>服务状态</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:520 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(150,150,255,0.08)' }}>
                <Zap size={14} style={{ color: voiceStatus === 'online' ? '#00E676' : '#555588' }} />
                <span style={{ fontSize:12, color:'#C0C0EE', flex:1 }}>ASR 识别服务</span>
                <StatusBadge status={voiceStatus === 'online' ? 'online' : 'offline'} label={voiceStatus === 'online' ? '在线' : '离线'} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(150,150,255,0.08)' }}>
                <Zap size={14} style={{ color: ttsStatus === 'online' ? '#00E676' : '#555588' }} />
                <span style={{ fontSize:12, color:'#C0C0EE', flex:1 }}>TTS 合成服务</span>
                <StatusBadge status={ttsStatus === 'online' ? 'online' : 'offline'} label={ttsStatus === 'online' ? '就绪' : '离线'} />
              </div>
            </div>
          </section>
        </div>
      );

      case 'search': return (
        <section style={C.section}>
          <div style={C.sectionHead}>网络搜索</div>
          <div style={C.sectionSub}>配置 AI 搜索引擎</div>
          <div style={{ maxWidth:520, display:'flex', flexDirection:'column', gap:14 }}>
            <div><div style={C.label}>搜索引擎</div>{renderSelect(searchEngine, e => setSearchEngine(e.target.value), SEARCH_ENGINES)}</div>
            <div>
              <div style={C.label}>Serper API Key</div>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ position:'relative', flex:1 }}>
                  <input type={showSearchKey ? 'text' : 'password'} value={searchApiKey} onChange={e => setSearchApiKey(e.target.value)}
                    style={{ ...C.input, paddingRight:36 }} placeholder="输入 API Key..." />
                  <button onClick={() => setShowSearchKey(p => !p)}
                    style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#8888BB', cursor:'pointer', padding:4 }}>
                    {showSearchKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <GlowButton size="sm" variant="ghost" onClick={handleSaveSearch}>保存</GlowButton>
          </div>
        </section>
      );

      case 'memory': return (
        <section style={C.section}>
          <div style={C.sectionHead}>嵌入模型</div>
          <div style={C.sectionSub}>记忆向量化 — 仅本地离线模型可用</div>
          <div style={{ maxWidth:520, display:'flex', flexDirection:'column', gap:14 }}>
            <div><div style={C.label}>嵌入提供商</div>{renderSelect(embedProvider, e => setEmbedProvider(e.target.value), EMBEDDING_PROVIDERS)}</div>
            <div><div style={C.label}>模型名称</div><input type="text" value={embedModel} onChange={e => setEmbedModel(e.target.value)} style={C.input} placeholder="Xenova/bge-large-zh-v1.5" /></div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <GlowButton size="sm" variant="ghost" onClick={handleSaveEmbedding}>保存</GlowButton>
              <GlowButton size="sm" variant="ghost" onClick={handleTestEmbedding} disabled={embedTesting}>{embedTesting ? '测试中...' : '测试连接'}</GlowButton>
              {embedTestResult && <span style={{ fontSize:12, color: embedTestResult.includes('成功') ? '#00E676' : '#FFAB00' }}>{embedTestResult}</span>}
            </div>
          </div>
          <div style={{ marginTop:20, display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderRadius:14, background:'rgba(99,91,255,0.06)', border:'1px solid rgba(99,91,255,0.1)', maxWidth:520 }}>
            <Brain size={18} style={{ color:'#8B5CFF', flexShrink:0 }} />
            <span style={{ fontSize:12, color:'#8888BB', flex:1 }}>已存储记忆</span>
            <span style={{ fontSize:24, fontWeight:700, color:'#8B5CFF', fontFamily:'"JetBrains Mono", monospace' }}>{memoryCount}</span>
          </div>
        </section>
      );

      case 'social': return (
        <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
          <section style={C.section}>
            <div style={C.sectionHead}>Discord</div>
            <div style={{ maxWidth:520 }}><div style={C.label}>Bot Token</div><input type="password" value={discordWebhook} onChange={e => setDiscordWebhook(e.target.value)} style={C.input} placeholder="Bot &lt;token&gt;..." /></div>
          </section>
          <section style={C.section}>
            <div style={C.sectionHead}>飞书</div>
            <div style={{ maxWidth:520, display:'flex', gap:12 }}>
              <div style={{ flex:1 }}><div style={C.label}>App ID</div><input type="text" value={feishuAppId} onChange={e => setFeishuAppId(e.target.value)} style={C.input} placeholder="cli_..." /></div>
              <div style={{ flex:1 }}><div style={C.label}>App Secret</div><input type="password" value={feishuAppSecret} onChange={e => setFeishuAppSecret(e.target.value)} style={C.input} placeholder="••••" /></div>
            </div>
            <div style={{ marginTop:10 }}>
              <StatusBadge status={feishuConnected ? 'online' : 'offline'} label={feishuConnected ? '已连接' : '未连接'} />
            </div>
          </section>
          <section style={C.section}>
            <div style={C.sectionHead}>微信 ClawBot</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <StatusBadge status={wechatLoggedIn ? 'online' : 'offline'} label={wechatLoggedIn ? '已登录' : '未登录'} />
              {wechatLoggedIn && <GlowButton size="sm" variant="ghost" onClick={handleWechatLogout}>登出</GlowButton>}
            </div>
            {!wechatLoggedIn && (
              <div style={{ marginTop:8 }}>
                {wechatQr ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:6 }}>
                    <div style={{ display:'inline-flex', justifyContent:'center', padding:14, background:'#fff', borderRadius:14, position:'relative' }}>
                      <img src={`data:image/png;base64,${wechatQr}`} alt="微信扫码" style={{ width:160, height:160 }} />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color: qrSecondsLeft <= 30 ? '#FF5F57' : qrSecondsLeft <= 60 ? '#FFAB00' : '#8888BB' }}>
                        {qrCountdown || '加载中…'}
                      </span>
                      <GlowButton size="sm" variant="ghost" onClick={handleConnectWechat}>刷新二维码</GlowButton>
                    </div>
                  </div>
                ) : (
                  <GlowButton size="sm" variant="primary" onClick={handleConnectWechat}>连接微信</GlowButton>
                )}
              </div>
            )}
          </section>
          <GlowButton size="sm" variant="ghost" onClick={handleSaveSocial}>保存社交设置</GlowButton>
        </div>
      );

      case 'admin': return (
        <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
          <section style={C.section}>
            <div style={C.sectionHead}>AI 意识核心</div>
            <div style={C.sectionSub}>暂停后 AI 不再处理消息和自主 tick</div>
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(150,150,255,0.1)', maxWidth:520 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background: aiRunning ? '#00E676' : '#555588', boxShadow: aiRunning ? '0 0 10px #00E676' : 'none', flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight:600, color:'#F0F0FF', flex:1 }}>{aiRunning ? '运行中' : '已暂停'}</span>
              <GlowButton size="sm" variant={aiRunning ? 'ghost' : 'primary'} onClick={handleToggleAI}>{aiRunning ? '暂停' : '启动'}</GlowButton>
            </div>
          </section>
          <section style={C.section}>
            <div style={C.sectionHead}>数据管理</div>
            <div style={C.sectionSub}>危险操作，确认后不可撤销</div>
            <div style={{ maxWidth:520, display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label:'重启应用', action:'restart' as const, danger:false },
                { label:'清除所有记忆', action:'reset-memories' as const, danger:true },
                { label:'清除沙箱文件', action:'reset-files' as const, danger:true },
              ].map(item => (
                <div key={item.action} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0' }}>
                  <span style={{ fontSize:12, color: item.danger ? '#FF5252' : '#8888BB' }}>{item.label}</span>
                  {confirmAction?.type === item.action ? (
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontSize:11, color: item.danger ? '#FF5252' : '#FFAB00', fontWeight:600 }}>{item.danger ? '不可撤销！' : '确认？'}</span>
                      <GlowButton size="sm" onClick={() => handleAdminAction({ type: item.action })} disabled={actionLoading}
                        style={item.danger ? { background: 'linear-gradient(135deg, #FF5252, #D32F2F)' } : { color:'#FFAB00', borderColor:'rgba(255,171,0,0.3)' }}>确认</GlowButton>
                      <GlowButton size="sm" variant="ghost" onClick={() => setConfirmAction(null)}>取消</GlowButton>
                    </div>
                  ) : (
                    <GlowButton size="sm" variant="ghost" onClick={() => setConfirmAction({ type: item.action })}
                      style={item.danger ? { color:'#FF5252', borderColor:'rgba(255,82,82,0.3)' } : {}}>{item.label}</GlowButton>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      );

      case 'security': return (
        <section style={C.section}>
          <div style={C.sectionHead}>沙箱模式</div>
          <div style={C.sectionSub}>启用后 AI 的文件读写和命令执行限制在沙箱目录内</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(150,150,255,0.1)', maxWidth:520 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'#F0F0FF' }}>文件系统隔离</div>
              <div style={{ fontSize:10, color:'#555588', marginTop:2 }}>限制 AI 可访问的路径范围</div>
            </div>
            {toggleButton(sandboxEnabled, () => setSandboxEnabled(p => !p))}
          </div>
          <div style={{ marginTop:16 }}><GlowButton size="sm" variant="ghost" onClick={handleSaveSecurity}>保存</GlowButton></div>
        </section>
      );

      default: return null;
    }
  };

  const curTab = TABS.find(t => t.id === activeTab);

  return (
    <div style={{ display:'flex', height:'100%', width:'100%', overflow:'hidden' }}>
      <style>{`select option { background:#0D1130; color:#F0F0FF; } select:focus, input:focus { border-color:rgba(99,91,255,0.5)!important; box-shadow:0 0 12px rgba(99,91,255,0.15); }`}</style>

      {/* ── Left sidebar ── */}
      <div style={{
        width:210, flexShrink:0, borderRight:'1px solid rgba(150,150,255,0.12)',
        display:'flex', flexDirection:'column',
        background:'rgba(10,13,30,0.85)', backdropFilter:'blur(40px)', WebkitBackdropFilter:'blur(40px)',
      }}>
        <div style={{ padding:'20px 14px 16px' }}>
          <button onClick={() => useAppStore.getState().setActiveRoute('home')}
            style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none',
              color:'#8888BB', fontSize:12, cursor:'pointer', padding:'8px 10px', borderRadius:10,
              transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color='#F0F0FF'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.color='#8888BB'; e.currentTarget.style.background='none'; }}>
            <ArrowLeft size={15} />返回
          </button>
        </div>
        <div style={{ fontSize:10, fontWeight:600, color:'#555588', letterSpacing:'0.08em', padding:'0 16px 10px', textTransform:'uppercase' }}>设置</div>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display:'flex', alignItems:'center', gap:9, width:'calc(100% - 12px)', margin:'1px 6px',
                padding:'9px 12px', borderRadius:10, background: isActive?'rgba(99,91,255,0.15)':'transparent',
                border:'none', cursor:'pointer', color: isActive?'#F0F0FF':'#8888BB',
                fontSize:12, fontWeight: isActive?600:400, transition:'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color='#C0C0EE'; e.currentTarget.style.background='rgba(99,91,255,0.06)'; }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color='#8888BB'; e.currentTarget.style.background='transparent'; }}}>
              <Icon size={15} style={{ opacity: isActive?1:0.6 }} />{tab.label}
            </button>
          );
        })}
        <div style={{ marginTop:'auto', padding:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px',
            borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(150,150,255,0.06)' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background: aiRunning?'#00E676':'#555588', boxShadow: aiRunning?'0 0 6px #00E676':'none', flexShrink:0 }} />
            <span style={{ fontSize:10, color:'#8888BB' }}>{aiRunning?'AI 运行中':'AI 已暂停'}</span>
          </div>
        </div>
      </div>

      {/* ── Right content ── */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', background:'#080B24' }}>
        <div style={{ padding:'24px 40px', borderBottom:'1px solid rgba(150,150,255,0.08)' }}>
          <h1 style={{ fontSize:20, fontWeight:700, color:'#F0F0FF', margin:'0 0 4px' }}>{curTab?.label}</h1>
          <p style={{ fontSize:11, color:'#555588', margin:0 }}>{curTab?.desc}</p>
        </div>
        <div style={{ padding:'28px 40px' }}>{renderContent()}</div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'absolute', bottom:16, right:16, padding:'10px 20px', borderRadius:12, fontSize:13, fontWeight:500,
          background: toast.kind==='success'?'rgba(0,230,118,0.15)':'rgba(255,82,82,0.15)',
          border: toast.kind==='success'?'1px solid rgba(0,230,118,0.4)':'1px solid rgba(255,82,82,0.4)',
          color: toast.kind==='success'?'#00E676':'#FF5252', zIndex:100,
          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
