"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  speed: number;
  phase: number;
  ci: number; // color index
}

// Mostly white/blue-white, rare cyan and purple hints
const COLORS: [number, number, number][] = [
  [255, 255, 255],
  [255, 255, 255],
  [255, 255, 255],
  [255, 255, 255],
  [210, 225, 255],
  [210, 225, 255],
  [185, 210, 255],
  [160, 200, 255],
  [200, 255, 245],
  [230, 210, 255],
];

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  life: number;
  maxLife: number;
  a: number;
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let stars: Star[] = [];
    let shooting: ShootingStar[] = [];
    let w = 0;
    let h = 0;
    let nextShoot = 0;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w;
      canvas!.height = h;
      buildStars();
    }

    function buildStars() {
      // ~1 star per 5000 px² — rich but not cluttered
      const count = Math.min(Math.floor((w * h) / 4800), 420);
      stars = Array.from({ length: count }, () => {
        // Size biased towards small: most 0.2–0.8, some up to 2
        const rand = Math.random();
        const r = rand < 0.75
          ? 0.2 + rand * 0.8
          : 0.8 + (rand - 0.75) * 6.4;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.min(r, 2.2),
          a: 0.2 + Math.random() * 0.8,
          speed: 0.15 + Math.random() * 0.85,
          phase: Math.random() * Math.PI * 2,
          ci: Math.floor(Math.random() * COLORS.length),
        };
      });
    }

    function spawnShooter() {
      // Start from top-left quadrant, travel diagonally
      const x = Math.random() * w * 0.7;
      const y = Math.random() * h * 0.4;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.6;
      const speed = 6 + Math.random() * 6;
      const len = 80 + Math.random() * 120;
      const life = len / speed + 20;
      shooting.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, len, life, maxLife: life, a: 0.9 + Math.random() * 0.1 });
    }

    function draw(t: number) {
      ctx!.clearRect(0, 0, w, h);

      // --- Twinkling stars ---
      for (const s of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 0.0007 * s.speed + s.phase);
        const alpha = s.a * (0.25 + 0.75 * twinkle);
        const [r, g, b] = COLORS[s.ci];

        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx!.fill();

        // Soft halo for brighter / larger stars
        if (s.r > 1.0 && alpha > 0.4) {
          const haloR = s.r * 3.5;
          const grad = ctx!.createRadialGradient(s.x, s.y, s.r * 0.5, s.x, s.y, haloR);
          grad.addColorStop(0, `rgba(${r},${g},${b},${(alpha * 0.25).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, haloR, 0, Math.PI * 2);
          ctx!.fillStyle = grad;
          ctx!.fill();
        }
      }

      // --- Shooting stars ---
      if (t > nextShoot) {
        spawnShooter();
        nextShoot = t + 4000 + Math.random() * 8000;
      }

      shooting = shooting.filter((s) => s.life > 0);
      for (const s of shooting) {
        const progress = s.life / s.maxLife;
        const alpha = s.a * Math.min(progress * 4, 1) * Math.min((1 - progress) * 4, 1);
        if (alpha > 0.01) {
          const tail = ctx!.createLinearGradient(
            s.x - s.vx * (s.len / Math.hypot(s.vx, s.vy)),
            s.y - s.vy * (s.len / Math.hypot(s.vx, s.vy)),
            s.x, s.y,
          );
          tail.addColorStop(0, `rgba(255,255,255,0)`);
          tail.addColorStop(1, `rgba(255,255,255,${alpha.toFixed(3)})`);
          ctx!.beginPath();
          ctx!.strokeStyle = tail;
          ctx!.lineWidth = 1.5;
          ctx!.moveTo(s.x - s.vx * (s.len / Math.hypot(s.vx, s.vy)), s.y - s.vy * (s.len / Math.hypot(s.vx, s.vy)));
          ctx!.lineTo(s.x, s.y);
          ctx!.stroke();
        }
        s.x += s.vx;
        s.y += s.vy;
        s.life--;
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    // Stagger initial shoot
    nextShoot = 2000 + Math.random() * 4000;
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true">
      {/* Deep space base */}
      <div className="absolute inset-0 bg-[#020308]" />

      {/* Upper nebula — violet haze */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(55,30,110,0.55) 0%, transparent 65%)",
        }}
      />
      {/* Lower-left nebula — deep blue */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 45% at 10% 95%, rgba(10,40,100,0.4) 0%, transparent 55%)",
        }}
      />
      {/* Right cloud — purple tinge */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 35% at 90% 65%, rgba(45,10,90,0.3) 0%, transparent 55%)",
        }}
      />
      {/* Milky Way band — faint diagonal luminosity */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(108deg, transparent 15%, rgba(90,70,160,0.07) 38%, rgba(110,85,200,0.11) 50%, rgba(90,70,160,0.07) 62%, transparent 85%)",
        }}
      />

      {/* Star canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
