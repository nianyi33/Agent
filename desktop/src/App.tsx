import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import WindowFrame from './components/layout/WindowFrame';
import MainLayout from './components/layout/MainLayout';
import ParticleBackground from './components/shared/ParticleBackground';
import Dashboard from './components/dashboard/Dashboard';
import WorkspacePage from './components/pages/WorkspacePage';
import AgentStudioPage from './components/pages/AgentStudioPage';
import MemoryUniversePage from './components/pages/MemoryUniversePage';
import ToolsPage from './components/pages/ToolsPage';
import ChatZone from './components/chat/ChatZone';
import SettingsPage from './components/settings/SettingsPage';
import { useSSE } from './hooks/useSSE';
import { useLoadHistory } from './hooks/useLoadHistory';
import { API_BASE } from './lib/constants';
import { useAppStore } from './stores/app-store';

/* ── Startup Splash ── */
function StartupSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    // Play startup audio
    const audio = new Audio('/startup.wav');
    audio.volume = 0.6;
    audio.play().catch(() => {});
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'radial-gradient(ellipse at 50% 50%, #0D1130 0%, #080B24 50%, #040610 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Animated ring pulse */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.15 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          border: '2px solid rgba(139,92,255,0.5)',
        }}
      />
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.1 }}
        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.15 }}
        style={{
          position: 'absolute', width: 260, height: 260, borderRadius: '50%',
          border: '1px solid rgba(99,91,255,0.3)',
        }}
      />

      {/* Center icon — scale in with glow */}
      <motion.div
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
        style={{
          width: 140, height: 140, borderRadius: 32,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 60px rgba(99,91,255,0.5), 0 0 120px rgba(139,92,255,0.25), 0 0 200px rgba(99,91,255,0.15)',
          zIndex: 1,
          background: 'rgba(99,91,255,0.05)',
        }}
      >
        <img src="/app-logo.png" alt="闪电树懒" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </motion.div>

      {/* Title — fade up */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
        style={{ marginTop: 28, zIndex: 1, textAlign: 'center' }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color: '#F0F0FF', letterSpacing: '0.04em' }}>
          闪电树懒
        </div>
        <div style={{ fontSize: 12, color: '#8888BB', marginTop: 6, letterSpacing: '0.08em' }}>
          v0.1.3 · 智能桌面助手
        </div>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        style={{ marginTop: 32, width: 180, zIndex: 1 }}
      >
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(150,150,255,0.15)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.0, ease: 'easeInOut', delay: 0.5 }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #635BFF, #8B5CFF)', borderRadius: 2 }}
          />
        </div>
      </motion.div>

      {/* Scan line effect */}
      <motion.div
        initial={{ top: '-2px', opacity: 0 }}
        animate={{ top: '100%', opacity: [0, 0.5, 0] }}
        transition={{ duration: 2.5, ease: 'linear', delay: 0.3 }}
        style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(139,92,255,0.6), transparent)',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}

function App() {
  useSSE();
  useLoadHistory();

  const activeRoute = useAppStore((s) => s.activeRoute);
  const isSettings = activeRoute === 'settings';
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  // Listen for URLs from hotspot/worldcup iframes (Tauri WebView2 blocks target="_blank")
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'open_url' && e.data?.url) {
        window.open(e.data.url, '_blank');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Restore appearance settings on mount
  useEffect(() => {
    const v = parseFloat(localStorage.getItem('lightningsloth_brightness') || '1.0');
    const el = document.getElementById('root') as HTMLElement | null;
    if (el) el.style.filter = `brightness(${v})`;
    const t = localStorage.getItem('lightningsloth_theme') || 'purple';
    document.documentElement.setAttribute('data-theme', t);
    const show = localStorage.getItem('lightningsloth_showCoreLogo');
    if (show === 'false') document.documentElement.setAttribute('data-core-visible', 'false');
  }, []);

  // After splash fades, check if the user has already activated the app.
  // Only show the welcome guide if the backend reports NOT activated.
  useEffect(() => {
    if (showSplash) return;
    // User already has an API key stored — skip welcome dialog even if backend not yet ready
    const savedKey = localStorage.getItem('velora_llm_api_key');
    if (savedKey) return;
    let cancelled = false;
    // Poll /activation-status for up to 15s (backend may still be starting)
    (async () => {
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1500));
        if (cancelled) return;
        try {
          const res = await fetch(`${API_BASE}/activation-status`);
          const data = await res.json();
          if (!cancelled && data && !data.activated) {
            setShowWelcome(true);
          }
          return; // got a real response, stop polling
        } catch {
          // backend not up yet — keep polling
        }
      }
    })();
    return () => { cancelled = true; };
  }, [showSplash]);

  const dismissWelcome = () => {
    setShowWelcome(false);
  };

  // Close settings on Escape
  useEffect(() => {
    if (!isSettings) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useAppStore.getState().setActiveRoute('home');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSettings]);

  const renderPage = () => {
    switch (activeRoute) {
      case 'workspace':      return <WorkspacePage />;
      case 'agent-studio':   return <AgentStudioPage />;
      case 'memory-universe':return <MemoryUniversePage />;
      case 'tools':          return <ToolsPage />;
      default:               return <Dashboard />;
    }
  };

  return (
    <>
      {/* Startup Splash */}
      <AnimatePresence>
        {showSplash && <StartupSplash onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      <WindowFrame>
        <ParticleBackground />
        <MainLayout>
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            {renderPage()}
            {(activeRoute === 'home' || activeRoute === 'workspace' || activeRoute === 'agent-studio' || activeRoute === 'memory-universe' || activeRoute === 'tools') && <ChatZone />}
          </div>
        </MainLayout>

        {/* Welcome Guide Modal */}
        <AnimatePresence>
          {showWelcome && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={dismissWelcome}
                style={{
                  position: 'fixed', inset: 0, zIndex: 100,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'fixed',
                  top: '50%', left: '50%',
                  marginTop: -228, marginLeft: -220,
                  width: 440, maxWidth: '92vw',
                  zIndex: 101,
                  borderRadius: 24,
                  border: '1px solid rgba(150,150,255,0.2)',
                  background: 'linear-gradient(160deg, rgba(20,22,60,0.98) 0%, rgba(10,13,30,0.98) 100%)',
                  boxShadow: '0 0 80px rgba(99,91,255,0.2), 0 24px 60px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                }}
              >
                {/* Gradient accent top bar */}
                <div style={{
                  height: 4,
                  background: 'linear-gradient(90deg, #635BFF, #8B5CFF, #FF8FB2)',
                  borderRadius: '24px 24px 0 0',
                }} />
                <div style={{ padding: '32px 32px 28px' }}>
                  {/* Icon */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'linear-gradient(135deg, rgba(99,91,255,0.2), rgba(139,92,255,0.1))',
                    border: '1px solid rgba(139,92,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20,
                  }}>
                    <span style={{ fontSize: 28 }}>⚡</span>
                  </div>
                  {/* Title */}
                  <div style={{
                    fontSize: 20, fontWeight: 700, color: '#F0F0FF',
                    marginBottom: 8, letterSpacing: '0.02em',
                  }}>
                    欢迎使用闪电树懒
                  </div>
                  {/* Body */}
                  <p style={{
                    fontSize: 13, color: '#A0A0CC', lineHeight: 1.7,
                    margin: '0 0 24px',
                  }}>
                    闪电树懒 通过 <strong style={{ color: '#C0C0EE' }}>芯云 API 聚合平台</strong> 接入多种大模型，
                    使用前需要先注册一个 API Key。
                  </p>
                  {/* Feature pills */}
                  <div style={{
                    display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const,
                  }}>
                    {['DeepSeek', 'GLM', 'Kimi', 'Qwen', 'MiniMax'].map(m => (
                      <span key={m} style={{
                        padding: '5px 10px', borderRadius: 8,
                        backgroundColor: 'rgba(99,91,255,0.12)',
                        border: '1px solid rgba(139,92,255,0.2)',
                        fontSize: 11, color: '#8B5CFF',
                        fontWeight: 600, letterSpacing: '0.02em',
                      }}>{m}</span>
                    ))}
                  </div>
                  {/* CTA: open website */}
                  <a
                    href="https://xinyuntoken.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={dismissWelcome}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', height: 48,
                      borderRadius: 14,
                      border: 'none',
                      background: 'linear-gradient(135deg, #635BFF, #8B5CFF)',
                      color: '#fff', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', textDecoration: 'none',
                      letterSpacing: '0.03em',
                      boxShadow: '0 0 24px rgba(99,91,255,0.35)',
                      marginBottom: 12,
                    }}
                  >
                    <span>🔗</span>
                    <span>前往 芯云平台 注册 API Key</span>
                    <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>xinyuntoken.com →</span>
                  </a>
                  {/* Skip */}
                  <button
                    onClick={dismissWelcome}
                    style={{
                      display: 'block', width: '100%',
                      padding: '10px 0',
                      border: '1px solid rgba(150,150,255,0.12)',
                      borderRadius: 14,
                      background: 'transparent',
                      color: '#8888BB', fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#C0C0EE'; e.currentTarget.style.borderColor = 'rgba(150,150,255,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#8888BB'; e.currentTarget.style.borderColor = 'rgba(150,150,255,0.12)'; }}
                  >
                    我已注册，去设置页绑定 Key
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Settings Modal — centered overlay */}
        <AnimatePresence>
          {isSettings && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => useAppStore.getState().setActiveRoute('home')}
                style={{
                  position: 'fixed', inset: 0, zIndex: 80,
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'fixed',
                  top: '50%', left: '50%',
                  marginTop: -340, marginLeft: -480,
                  width: 960, maxWidth: '95vw',
                  height: '88vh', maxHeight: 800,
                  zIndex: 90,
                  borderRadius: 28,
                  overflow: 'hidden',
                  boxShadow: '0 0 80px rgba(99,91,255,0.25), 0 20px 60px rgba(0,0,0,0.5)',
                }}
              >
                <SettingsPage />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </WindowFrame>
    </>
  );
}

export default App;
