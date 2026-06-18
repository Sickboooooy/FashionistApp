import { FC, useEffect, useRef } from 'react';
import HeroSection from '@/components/hero-section';
import OutfitShowcase from '@/components/outfit-showcase';
import AnnaDesigns from '@/components/anna-designs';
import PreferenceManager from '@/components/preference-manager';

// ── Particle types ──────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  opacity: number; decay: number;
  size: number; color: string;
  rotation: number; rotSpeed: number;
  shape: 'star' | 'diamond' | 'dot';
}

const COLORS = ['#fbbf24', '#fcd34d', '#f59e0b', '#d4a017', '#e7e5e4', '#a8956a'];
const MAX_PARTICLES = 150;

function createParticle(x: number, y: number, scale = 1): Particle {
  return {
    x: x + (Math.random() - 0.5) * 14,
    y: y + (Math.random() - 0.5) * 14,
    vx: (Math.random() - 0.5) * 2.2,
    vy: -(Math.random() * 1.8 + 0.6) * scale,
    opacity: Math.random() * 0.5 + 0.5,
    decay: Math.random() * 0.014 + 0.006,
    size: (Math.random() * 5 + 3) * scale,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.14,
    shape: (['star', 'diamond', 'dot'] as const)[Math.floor(Math.random() * 3)],
  };
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = p.color;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);

  if (p.shape === 'dot') {
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.shape === 'diamond') {
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.5, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.5, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    // 4-pointed star / sparkle
    const outer = p.size;
    const inner = p.size * 0.3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const r = i % 2 === 0 ? outer : inner;
      const px = Math.cos(angle - Math.PI / 2) * r;
      const py = Math.sin(angle - Math.PI / 2) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ── Particle canvas component ────────────────────────────────────────────────

const ParticleTrail: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = [];
    let rafId = 0;
    const isTouchDevice = 'ontouchstart' in window;

    // Fixed canvas → viewport dimensions only
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const spawn = (x: number, y: number, count: number, scale = 1) => {
      if (particles.length >= MAX_PARTICLES) particles.splice(0, count);
      for (let i = 0; i < count; i++) particles.push(createParticle(x, y, scale));
    };

    const onMouseMove = (e: MouseEvent) => {
      spawn(e.clientX, e.clientY, Math.floor(Math.random() * 3) + 1);
    };

    // Touch: más partículas, más grandes, en cada punto del dedo
    const onTouchMove = (e: TouchEvent) => {
      for (let t = 0; t < e.touches.length; t++) {
        const touch = e.touches[t];
        spawn(touch.clientX, touch.clientY, Math.floor(Math.random() * 5) + 4, 1.4);
      }
    };

    // Burst al primer toque
    const onTouchStart = (e: TouchEvent) => {
      for (let t = 0; t < e.touches.length; t++) {
        const touch = e.touches[t];
        spawn(touch.clientX, touch.clientY, 10, 1.6);
      }
    };

    window.addEventListener('resize', resize);
    if (isTouchDevice) {
      canvas.addEventListener('touchmove', onTouchMove);
      canvas.addEventListener('touchstart', onTouchStart);
    } else {
      document.addEventListener('mousemove', onMouseMove);
    }

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.opacity -= p.decay;
        p.rotation += p.rotSpeed;

        if (p.opacity > 0) {
          drawParticle(ctx, p);
        } else {
          particles.splice(i, 1);
        }
      }

      rafId = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => {
      window.removeEventListener('resize', resize);
      if (isTouchDevice) {
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchstart', onTouchStart);
      } else {
        document.removeEventListener('mousemove', onMouseMove);
      }
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
};

const Home: FC = () => {
  return (
    <div className="relative w-full">
      <ParticleTrail />
      <div className="relative z-0">
        <HeroSection />
        <OutfitShowcase />
        <AnnaDesigns />
        <PreferenceManager />
      </div>
    </div>
  );
};

export default Home;
