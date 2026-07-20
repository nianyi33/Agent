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
        <img src="/app-logo.png" alt="VeloraAgent" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </motion.div>

      {/* Title — fade up */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6 }}
        style={{ marginTop: 28, zIndex: 1, textAlign: 'center' }}
      >
        <div style={{ fontSize: 26, fontWeight: 700, color: '#F0F0FF', letterSpacing: '0.04em' }}>
          VeloraAgent
        </div>
        <div style={{ fontSize: 12, color: '#8888BB', marginTop: 6, letterSpacing: '0.08em' }}>
          v2.0 · 智能桌面助手
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
