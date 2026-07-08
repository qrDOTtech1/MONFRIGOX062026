'use client';

import { useEffect, useRef } from 'react';

// Confettis + feux d'artifice de félicitations, en Canvas (aucune dépendance).
// Optimisé mobile : un seul canvas, DPR plafonné, nombre de particules borné,
// et l'animation s'ARRÊTE d'elle-même après ~3,3 s (pas de boucle infinie →
// pas de batterie qui chauffe). Respecte prefers-reduced-motion.

type Particle = {
  x: number; y: number; vx: number; vy: number;
  size: number; rot: number; vrot: number;
  color: string; shape: 0 | 1;   // 0 = rectangle (confetti), 1 = point (étincelle)
  life: number; decay: number;
};

const COLORS = ['#2563eb', '#7aa2f7', '#34d399', '#f59e0b', '#ef4444', '#ec4899', '#ffffff'];

export default function Celebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);   // plafonné pour mobile
    let W = window.innerWidth, H = window.innerHeight;
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const parts: Particle[] = [];

    // Pluie de confettis depuis le haut
    const confettiCount = W < 480 ? 90 : 140;   // moins sur petit écran
    for (let i = 0; i < confettiCount; i++) {
      parts.push({
        x: Math.random() * W,
        y: -20 - Math.random() * H * 0.5,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 2 + Math.random() * 3.5,
        size: 5 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        shape: 0,
        life: 1, decay: 0.004 + Math.random() * 0.004,
      });
    }

    // Bouquets de feux d'artifice (étincelles qui explosent puis retombent)
    const burst = (cx: number, cy: number, n: number) => {
      const c = COLORS[(Math.random() * COLORS.length) | 0];
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
        const sp = 2 + Math.random() * 4;
        parts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          size: 2.5 + Math.random() * 2,
          rot: 0, vrot: 0,
          color: c, shape: 1,
          life: 1, decay: 0.012 + Math.random() * 0.01,
        });
      }
    };
    const perBurst = W < 480 ? 26 : 38;
    setTimeout(() => burst(W * 0.28, H * 0.32, perBurst), 150);
    setTimeout(() => burst(W * 0.72, H * 0.28, perBurst), 650);
    setTimeout(() => burst(W * 0.5, H * 0.42, perBurst), 1150);

    let raf = 0;
    const start = performance.now();
    const MAX_MS = 3300;

    const tick = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += p.shape === 1 ? 0.06 : 0.04;   // gravité
        p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
        p.life -= p.decay;
        if (p.life <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.color;
        if (p.shape === 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (elapsed < MAX_MS && parts.length > 0) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, W, H);   // fin propre
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}
    />
  );
}
