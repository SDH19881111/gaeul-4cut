// 결과 화면 낙엽 효과(2초 이내 1회)와 시작 화면 로고 장식
import { rng, maple, ginkgo } from './shapes.js';

const COLORS = ['#B5462F', '#D2642E', '#E08A2E', '#E3A73B', '#C8501F'];
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function playLeaves(canvas, duration = 2000) {
  if (reduceMotion()) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  const r = rng(Date.now());
  const leaves = Array.from({ length: 18 }, () => ({
    x: r() * W,
    y: -30 - r() * H * 0.45,
    s: 14 + r() * 16,
    rot: r() * 6.28,
    vr: (r() - 0.5) * 4,
    vy: H * (0.5 + r() * 0.25),
    amp: 20 + r() * 40,
    ph: r() * 6.28,
    ginkgo: r() < 0.35,
    color: COLORS[(r() * COLORS.length) | 0],
  }));
  const t0 = performance.now();
  const tick = (now) => {
    const t = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (t * 1000 >= duration) return;
    ctx.globalAlpha = Math.min(1, (duration / 1000 - t) / 0.45);
    for (const l of leaves) {
      const x = l.x + Math.sin(t * 2.2 + l.ph) * l.amp;
      const y = l.y + l.vy * t;
      const rot = l.rot + l.vr * t;
      if (l.ginkgo) ginkgo(ctx, x, y, l.s, rot, '#E3A73B');
      else maple(ctx, x, y, l.s, rot, l.color);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function drawLogoLeaves(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 240, h = canvas.clientHeight || 120;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  maple(ctx, w / 2 - 34, h / 2 + 4, 42, -0.35, '#B5462F');
  ginkgo(ctx, w / 2 + 40, h / 2 + 30, 38, 0.5, '#E3A73B');
  maple(ctx, w / 2 + 6, h / 2 - 20, 24, 0.6, '#E08A2E');
}
