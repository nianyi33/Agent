import { X, TrendingUp, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../../lib/constants';

export type OverlayType = 'hotspot' | 'worldcup' | null;

interface Props { type: OverlayType; onClose: () => void; }

const SRC = {
  hotspot: `${API_BASE}/src/ui/brain-ui/treesloth-earth.html`,
  worldcup: `${API_BASE}/src/ui/brain-ui/worldcup-broadcast-v2.html`,
};

export default function DashboardOverlay({ type, onClose }: Props) {
  if (!type) return null;
  const title = type === 'hotspot' ? '实时热点' : '世界杯赛况';
  const Icon = type === 'hotspot' ? TrendingUp : Trophy;

  return (
    <AnimatePresence>
      <motion.div key="backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}}
        onClick={onClose}
        style={{position:'fixed',inset:0,zIndex:70,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)'}}/>
      <motion.div key="panel" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} transition={{duration:0.25,ease:[0.22,1,0.36,1]}}
        style={{position:'fixed',top:'5vh',left:'5vw',width:'90vw',height:'90vh',zIndex:80,borderRadius:24,
          background:'rgba(8,11,36,0.95)',backdropFilter:'blur(30px)',WebkitBackdropFilter:'blur(30px)',
          border:'1px solid rgba(150,150,255,0.25)',boxShadow:'0 0 60px rgba(99,91,255,0.15)',
          display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',borderBottom:'1px solid rgba(150,150,255,0.15)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Icon size={20} style={{color:'#8B5CFF'}}/><span style={{fontSize:16,fontWeight:700,color:'#F0F0FF'}}>{title}</span>
          </div>
          <button onClick={onClose} style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(150,150,255,0.15)',color:'#8888BB',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.color='#F0F0FF';e.currentTarget.style.borderColor='rgba(150,150,255,0.4)'}}
            onMouseLeave={e=>{e.currentTarget.style.color='#8888BB';e.currentTarget.style.borderColor='rgba(150,150,255,0.15)'}}><X size={18}/></button>
        </div>
        <iframe src={SRC[type]} style={{flex:1,width:'100%',border:'none'}} title={title}/>
      </motion.div>
    </AnimatePresence>
  );
}
