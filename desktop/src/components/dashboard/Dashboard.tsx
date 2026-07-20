import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Trophy } from 'lucide-react';
import AICore from './AICore';
import AIStatusCard from './AIStatusCard';
import TaskPanel from './TaskPanel';
import DashboardOverlay from './DashboardOverlay';
import VideoPanel from './VideoPanel';
import type { OverlayType } from './DashboardOverlay';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

const scrollStyles = `
  .right-panels-scroll::-webkit-scrollbar { width: 3px; }
  .right-panels-scroll::-webkit-scrollbar-track { background: transparent; }
  .right-panels-scroll::-webkit-scrollbar-thumb { background: rgba(150,150,255,0.2); border-radius: 2px; }
`;

export default function Dashboard() {
  const [overlay, setOverlay] = useState<OverlayType>(null);

  return (
    <>
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 20px 0',
        gap: 24,
      }}
    >
      {/* Right cards: absolutely positioned at top-right, max-height prevents collision */}
      <div style={{
        position: 'absolute', top: 20, right: 24, zIndex: 4,
        display: 'flex', flexDirection: 'column', gap: 10,
        maxHeight: 'calc(100vh - 260px)', overflowY: 'auto',
        paddingRight: 4,
      }}
      className="right-panels-scroll"
      >
        <motion.div variants={item}><AIStatusCard /></motion.div>
        <motion.div variants={item}><TaskPanel /></motion.div>
      </div>

      {/* Center: AI Core */}
      <motion.div variants={item} style={{ flex: '0 1 auto' }}>
        <AICore />
      </motion.div>

      {/* Video panel — AI-triggered, right side */}
      <VideoPanel />

      {/* Quick-access buttons: bottom-left */}
      <div style={{ position:'absolute', bottom:30, left:24, zIndex:5, display:'flex', gap:8 }}>
        <QuickBtn icon={<TrendingUp size={16}/>} label="热点" color="#FF0050" onClick={() => setOverlay('hotspot')} />
        <QuickBtn icon={<Trophy size={16}/>} label="世界杯" color="#FFB800" onClick={() => setOverlay('worldcup')} />
      </div>

      <style>{scrollStyles}</style>
    </motion.div>

    <DashboardOverlay type={overlay} onClose={()=>setOverlay(null)}/>
    </>
  );
}

interface QuickBtnProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

function QuickBtn({ icon, label, color, onClick }: QuickBtnProps) {
  const onEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.borderColor = color + '44';
    el.style.background = color + '12';
    el.style.color = '#F0F0FF';
  };
  const onLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.borderColor = 'rgba(150,150,255,0.15)';
    el.style.background = 'rgba(255,255,255,0.06)';
    el.style.color = '#C0C0EE';
  };
  return (
    <button onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}
      style={{
        display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:20,
        border:'1px solid rgba(150,150,255,0.15)',cursor:'pointer',
        background:'rgba(255,255,255,0.06)',backdropFilter:'blur(20px)',
        color:'#C0C0EE',fontSize:12,fontWeight:600,transition:'all 0.2s',
      }}>
      {icon}{label}
    </button>
  );
}
