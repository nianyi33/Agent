import { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../../stores/app-store';

/* ── Particle & Lightning types ── */
interface Particle {
  ba: number; // base angle
  br: number; // base radius
  sx: number; // stretch x
  sy: number; // stretch y
  size: number;
  alpha: number;
  speed: number;
  drift: number;
  color: string;
}

interface Pt {
  x: number;
  y: number;
}

interface LightningArc {
  pts: Pt[];
  life: number;
  age: number;
}

/* ── Constants ── */
const N_PARTICLES = 100;
const COLORS = ['#8B5CFF', '#4A9CFF', '#00D4FF', '#A78BFA'];

/* ── Helpers ── */
function cx(): number {
  return 415 / 2; // container is fixed 415×415
}
function cy(): number {
  return 415 / 2;
}
function rMid(): number {
  return Math.min(cx(), cy()) * 0.5;
}

function initParticles(): Particle[] {
  const Rmid = rMid();
  const pts: Particle[] = [];
  for (let i = 0; i < N_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2;
    const baseR = Rmid * (0.6 + Math.random() * 0.55);
    pts.push({
      ba: a,
      br: baseR,
      sx: 0.7 + Math.random() * 0.6,
      sy: 0.7 + Math.random() * 0.6,
      size: Math.random() * 1.6 + 0.4,
      alpha: Math.random() * 0.5 + 0.15,
      speed: Math.random() * 0.003 + 0.002,
      drift: Math.random() * 0.01 - 0.005,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }
  return pts;
}

function spawnLightning(): LightningArc {
  const rr = rMid() * 0.7;
  const a1 = Math.random() * Math.PI * 2;
  const a2 = a1 + 0.3 + Math.random() * 1.2;
  const steps = 4 + Math.floor(Math.random() * 5);
  const pts: Pt[] = [];
  const Cx = cx();
  const Cy = cy();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a1 + (a2 - a1) * t;
    pts.push({
      x: Cx + Math.cos(a) * (rr + (Math.random() - 0.5) * rr * 0.25),
      y: Cy + Math.sin(a) * (rr + (Math.random() - 0.5) * rr * 0.25),
    });
  }
  return { pts, life: 0.3 + Math.random() * 0.25, age: 0 };
}

/* ═══════════════════════════════════════════════
   AICore – multi‑layer animated engine
   ═══════════════════════════════════════════════ */
export default function AICore() {
  /* ── Refs ── */
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const r1Ref = useRef<HTMLDivElement>(null);
  const r2Ref = useRef<HTMLDivElement>(null);
  const r3Ref = useRef<HTMLDivElement>(null);
  const r4Ref = useRef<HTMLDivElement>(null);
  const r5Ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const particlesRef = useRef<Particle[]>(initParticles());
  const arcsRef = useRef<LightningArc[]>([]);
  const nextLightningRef = useRef<number>(2 + Math.random() * 4);
  const mouseRef = useRef({ mx: 0, my: 0, tmx: 0, tmy: 0 });
  const dataStateRef = useRef<'idle' | 'thinking' | 'speaking'>('idle');

  /* ── State ── */
  const aiStatus = useAppStore((s) => s.aiStatus);
  const [dataState, setDataState] = useState<'idle' | 'thinking' | 'speaking'>('idle');

  // Keep ref in sync for the animation loop
  dataStateRef.current = dataState;

  // Derive data-state from store
  useEffect(() => {
    if (aiStatus === 'busy') setDataState('thinking');
    else setDataState('idle');
  }, [aiStatus]);

  /* ── Resize canvas ── */
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    function resize() {
      const w = wrap!.offsetWidth;
      const h = wrap!.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      const ctx = canvas!.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctxRef.current = ctx;
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  /* ── Mouse tracking ── */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    function onMove(e: MouseEvent) {
      const r = wrap!.getBoundingClientRect();
      mouseRef.current.tmx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      mouseRef.current.tmy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    }
    function onLeave() {
      mouseRef.current.tmx = 0;
      mouseRef.current.tmy = 0;
    }

    wrap.addEventListener('mousemove', onMove);
    wrap.addEventListener('mouseleave', onLeave);
    return () => {
      wrap.removeEventListener('mousemove', onMove);
      wrap.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  /* ── Animation loop ── */
  useEffect(() => {
    const glow = glowRef.current;
    const img = imgRef.current;
    const r1 = r1Ref.current;
    const r2 = r2Ref.current;
    const r3 = r3Ref.current;
    const r4 = r4Ref.current;
    const r5 = r5Ref.current;
    const canvas = canvasRef.current;
    if (!glow || !img || !r1 || !r2 || !r3 || !r4 || !r5 || !canvas) return;

    let prevTs = 0;

    function loop(ts: number) {
      rafRef.current = requestAnimationFrame(loop);

      const t = ts / 1000;
      const dt = prevTs ? (ts - prevTs) / 1000 : 1 / 60;
      prevTs = ts;

      const m = mouseRef.current;
      // Smooth mouse interpolation
      m.mx += (m.tmx - m.mx) * 0.08;
      m.my += (m.tmy - m.my) * 0.08;

      const W = 415;
      const H = 415;

      /* ── Canvas: particles + lightning + quantum pulse ── */
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.clearRect(0, 0, W, H);

        // Particles – elliptical orbits
        const particles = particlesRef.current;
        const CeX = cx();
        const CeY = cy();
        for (const p of particles) {
          const a = p.ba + t * p.speed + p.drift;
          const x = CeX + Math.cos(a) * p.br * p.sx + m.mx * 15;
          const y = CeY + Math.sin(a) * p.br * p.sy + m.my * 15;
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha + Math.sin(t * 3 + p.ba) * 0.1;
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Quantum pulse wave – every 8s
        const pulsePhase = (t % 8) / 8;
        if (pulsePhase < 0.35) {
          const pr = pulsePhase / 0.35; // 0→1 during expansion
          const prr = rMid() * (0.5 + pr * 1.2);
          const pa = 1 - pr;
          ctx.beginPath();
          ctx.arc(CeX, CeY, prr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(139,92,255,${pa * 0.35})`;
          ctx.lineWidth = 1.5 + pr * 3;
          ctx.stroke();
          ctx.strokeStyle = `rgba(99,91,255,${pa * 0.2})`;
          ctx.lineWidth = 3 + pr * 6;
          ctx.stroke();
        }

        // Lightning arcs
        const arcs = arcsRef.current;
        if (t > nextLightningRef.current) {
          arcs.push(spawnLightning());
          nextLightningRef.current = t + 1.5 + Math.random() * 4;
        }
        for (const a of arcs) {
          a.age += dt;
          const fade =
            a.age < 0.06
              ? a.age / 0.06
              : 1 - (a.age - 0.06) / Math.max(a.life - 0.06, 0.01);
          if (fade <= 0) continue;
          ctx.globalAlpha = fade * 0.75;
          ctx.strokeStyle = '#C4B5FD';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#8B5CFF';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(a.pts[0].x, a.pts[0].y);
          for (let i = 1; i < a.pts.length; i++) {
            ctx.quadraticCurveTo(
              (a.pts[i - 1].x + a.pts[i].x) / 2 + (Math.random() - 0.5) * 8,
              (a.pts[i - 1].y + a.pts[i].y) / 2 + (Math.random() - 0.5) * 8,
              a.pts[i].x,
              a.pts[i].y,
            );
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        // Remove dead arcs
        arcsRef.current = arcs.filter((a) => a.age < a.life);
      }

      /* ── Breathing + Float ── */
      const breath = 1 + Math.sin(t * 1.26) * 0.04;
      const floatY = Math.sin(t * 1.05) * 6;

      // Glow pulse — faster when speaking
      const ds = dataStateRef.current;
      const glowPeriod = ds === 'speaking' ? 0.6 : 1.4;
      const glowAmp = ds === 'speaking' ? 0.06 : 0.08;
      const glowPhase = (t % glowPeriod) / glowPeriod;
      const glowS = 1 + Math.sin(glowPhase * Math.PI * 2) * glowAmp;
      const glowO = ds === 'speaking'
        ? 0.5 + Math.sin(glowPhase * Math.PI * 2) * 0.35
        : 0.5 + Math.sin(t * 1.4) * 0.35;

      /* ── Apply transforms ── */
      glow!.style.transform = `translate(-50%,-50%) translate(${m.mx * 4}px,${m.my * 4}px) scale(${glowS})`;
      glow!.style.opacity = String(glowO);

      r1!.style.transform = `translate(${m.mx * 8}px,${m.my * 8}px) rotateZ(${(t / 18) * 360}deg)`;
      r2!.style.transform = `rotateX(65deg) translate(${m.mx * 10}px,${m.my * 10}px) rotateZ(${(-t / 26) * 360}deg)`;
      r3!.style.transform = `rotateX(-60deg) rotateY(30deg) translate(${m.mx * 12}px,${m.my * 12}px) rotateZ(${(t / 22) * 360}deg)`;
      r4!.style.transform = `rotateX(70deg) rotateY(-40deg) translate(${m.mx * 14}px,${m.my * 14}px) rotateZ(${(-t / 30) * 360}deg)`;
      r5!.style.transform = `rotateX(25deg) rotateY(55deg) translate(${m.mx * 11}px,${m.my * 11}px) rotateZ(${(-t / 38) * 360}deg)`;

      img!.style.transform = `translate(-50%,-50%) translate(${m.mx * 3}px,${m.my * 3 + floatY}px) scale(${breath})`;
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */
  const wrapStyle: React.CSSProperties = {
    position: 'absolute',
    top: '32%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(415px, 40vw)',
    height: 'min(415px, 40vw)',
    zIndex: 1,
    perspective: '600px',
  };

  // Dynamic styles based on data-state
  const isThinking = dataState === 'thinking';
  const isSpeaking = dataState === 'speaking';

  const glowBackground = isSpeaking
    ? 'radial-gradient(circle, rgba(0,212,255,0.4) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(139,92,255,0.35) 0%, transparent 70%)';

  const glowFilter = isThinking ? 'blur(25px)' : 'blur(30px)';

  const glowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '70%',
    aspectRatio: '1',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    background: glowBackground,
    filter: glowFilter,
    pointerEvents: 'none',
  };

  const ringBase: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderRadius: '50%',
    border: '1.5px solid rgba(139,92,255,0.3)',
    pointerEvents: 'none' as const,
  };

  const imgDropShadow = isSpeaking
    ? 'drop-shadow(0 0 60px rgba(0,212,255,0.7))'
    : isThinking
      ? 'drop-shadow(0 0 70px rgba(99,91,255,0.8))'
      : 'drop-shadow(0 0 50px rgba(99,91,255,0.5))';

  const imgBrightness = isThinking ? 'brightness(1.15)' : isSpeaking ? 'brightness(1.1)' : 'none';

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '66%',
    height: '66%',
    transform: 'translate(-50%, -50%)',
    objectFit: 'contain',
    zIndex: 2,
    filter: `${imgDropShadow} ${imgBrightness}`,
  };

  const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 3,
    pointerEvents: 'none' as const,
  };

  return (
    <div
      id="core-wrap"
      ref={wrapRef}
      data-state={dataState}
      style={wrapStyle}
    >
      {/* --- Glow --- */}
      <div id="core-glow" ref={glowRef} style={glowStyle} />

      {/* --- Orbit Rings --- */}
      <div
        id="r1"
        ref={r1Ref}
       
        style={{
          ...ringBase,
          width: '86%',
          height: '86%',
          marginLeft: '-43%',
          marginTop: '-43%',
          borderColor: 'rgba(139,92,255,0.35)',
        }}
      />
      <div
        id="r2"
        ref={r2Ref}
       
        style={{
          ...ringBase,
          width: '93%',
          height: '93%',
          marginLeft: '-46.5%',
          marginTop: '-46.5%',
          borderColor: 'rgba(99,91,255,0.22)',
        }}
      />
      <div
        id="r3"
        ref={r3Ref}
       
        style={{
          ...ringBase,
          width: '79%',
          height: '79%',
          marginLeft: '-39.5%',
          marginTop: '-39.5%',
          borderColor: 'rgba(74,156,255,0.18)',
        }}
      />
      <div
        id="r4"
        ref={r4Ref}
       
        style={{
          ...ringBase,
          width: '99%',
          height: '99%',
          marginLeft: '-49.5%',
          marginTop: '-49.5%',
          borderColor: 'rgba(0,212,255,0.15)',
        }}
      />
      <div
        id="r5"
        ref={r5Ref}
       
        style={{
          ...ringBase,
          width: '73%',
          height: '73%',
          marginLeft: '-36.5%',
          marginTop: '-36.5%',
          borderColor: 'rgba(232,121,249,0.14)',
        }}
      />

      {/* --- Center icon --- */}
      <img
        id="core-img"
        ref={imgRef}
        src="/core-icon.png"
        alt="AI Core"
        style={imgStyle}
      />

      {/* --- Particles canvas --- */}
      <canvas id="p-canvas" ref={canvasRef} style={canvasStyle} />
    </div>
  );
}
