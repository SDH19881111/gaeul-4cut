// 프레임 6종. 각 프레임은 크기·사진 칸 좌표·배경(bg)·장식(fg)·글자색을 가진 데이터다.
// 새 프레임은 이 배열에 하나 추가하면 끝 (겨울네컷 등으로 바꿀 때도 이 파일만 교체).
import { rng, maple, ginkgo, acorn, cosmos, dragonfly, star, glowDot, cloud, tape, roundRect } from './shapes.js';

export const WIDTH = 1200;
const RATIO = 3 / 4; // 사진 칸 세로/가로 (4:3 가로 사진)

function stack({ x = 70, top = 70, w = 1060, gap = 30 } = {}) {
  const h = Math.round(w * RATIO);
  return Array.from({ length: 4 }, (_, i) => ({ x, y: top + i * (h + gap), w, h }));
}

// 사진 칸 둘레를 따라 무작위 위치를 뽑는다 (테두리 장식용)
function edgePoints(r, height, n, margin = 70) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const side = r();
    let x, y;
    if (side < 0.38) { x = r() * margin; y = r() * height; }
    else if (side < 0.76) { x = WIDTH - r() * margin; y = r() * height; }
    else if (side < 0.88) { x = r() * WIDTH; y = r() * margin; }
    else { x = r() * WIDTH; y = height - r() * margin * 0.8; }
    pts.push([x, y]);
  }
  return pts;
}

function paperGrain(ctx, w, h, seed, alpha = 0.05) {
  const r = rng(seed);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = r() < 0.5 ? `rgba(90,60,30,${alpha})` : `rgba(255,255,255,${alpha * 1.4})`;
    ctx.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3);
  }
}

const MAPLE_COLORS = ['#B5462F', '#C8501F', '#D2642E', '#E08A2E', '#9E3B25', '#E3A73B'];
const GINKGO_COLORS = ['#E3A73B', '#F0C24B', '#D9952A', '#F5D36A', '#EDB740'];

export const FRAMES = [
  {
    id: 'maple',
    name: '단풍잎',
    height: 3600,
    slots: stack(),
    title: '#8B6B4A',
    date: '#B5462F',
    bg(ctx, f) {
      ctx.fillStyle = '#F4EBDD';
      ctx.fillRect(0, 0, WIDTH, f.height);
      paperGrain(ctx, WIDTH, f.height, 11);
    },
    fg(ctx, f) {
      const r = rng(7);
      for (const [x, y] of edgePoints(r, f.height, 30, 60)) {
        maple(ctx, x, y, 42 + r() * 34, r() * 6.28, MAPLE_COLORS[(r() * MAPLE_COLORS.length) | 0]);
      }
      // 모서리 큰 단풍 무리
      const big = [
        [70, 80, 110, -0.4, '#B5462F'], [175, 40, 70, 0.6, '#E08A2E'], [40, 200, 64, 1.9, '#D2642E'],
        [1130, 1660, 90, 0.5, '#C8501F'], [1170, 1540, 56, -1.1, '#E3A73B'],
        [1120, 3320, 120, 0.3, '#B5462F'], [1010, 3360, 70, -0.8, '#E08A2E'], [1175, 3200, 60, 1.2, '#9E3B25'],
      ];
      for (const [x, y, s, rot, c] of big) maple(ctx, x, y, s, rot, c);
      acorn(ctx, 110, 3470, 48, -0.3);
      acorn(ctx, 170, 3500, 40, 0.4);
    },
  },
  {
    id: 'ginkgo',
    name: '은행나무길',
    height: 3600,
    slots: stack(),
    title: '#8B6B4A',
    date: '#C9832A',
    bg(ctx, f) {
      const g = ctx.createLinearGradient(0, 0, 0, f.height);
      g.addColorStop(0, '#FCF5DE');
      g.addColorStop(1, '#F8E8B8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WIDTH, f.height);
      paperGrain(ctx, WIDTH, f.height, 21, 0.04);
    },
    fg(ctx, f) {
      const r = rng(17);
      for (const [x, y] of edgePoints(r, f.height, 46, 64)) {
        ginkgo(ctx, x, y, 40 + r() * 30, r() * 6.28, GINKGO_COLORS[(r() * GINKGO_COLORS.length) | 0]);
      }
      const big = [
        [90, 110, 100, 2.6], [190, 60, 64, 3.6], [60, 230, 56, 1.8],
        [1100, 3330, 110, 0.6], [1000, 3380, 70, -0.5], [1160, 3220, 60, 0.2],
        [120, 3420, 70, -0.9], [200, 3500, 54, 0.4],
      ];
      for (const [x, y, s, rot] of big) ginkgo(ctx, x, y, s, rot, GINKGO_COLORS[((x + y) | 0) % GINKGO_COLORS.length]);
    },
  },
  {
    id: 'kraft',
    name: '크라프트 종이',
    height: 3600,
    slots: stack({ x: 100, top: 100, w: 1000, gap: 56 }),
    title: '#3B2A20',
    date: '#6B4A2B',
    bg(ctx, f) {
      ctx.fillStyle = '#C49A6C';
      ctx.fillRect(0, 0, WIDTH, f.height);
      paperGrain(ctx, WIDTH, f.height, 31, 0.09);
      // 종이 섬유
      const r = rng(32);
      ctx.strokeStyle = 'rgba(80,55,30,0.12)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 260; i++) {
        const x = r() * WIDTH, y = r() * f.height, a = r() * 6.28, l = 10 + r() * 30;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
      // 사진 아래 흰 인화지 테두리 + 그림자
      for (const s of f.slots) {
        ctx.save();
        ctx.shadowColor = 'rgba(40,25,10,0.35)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#FBF8F2';
        ctx.fillRect(s.x - 20, s.y - 20, s.w + 40, s.h + 40);
        ctx.restore();
      }
    },
    fg(ctx, f) {
      const tapes = [
        ['rgba(244,235,221,0.82)', 'rgba(181,70,47,0.35)'],
        ['rgba(227,167,59,0.78)', null],
        ['rgba(244,235,221,0.82)', 'rgba(139,107,74,0.35)'],
        ['rgba(181,70,47,0.7)', 'rgba(255,255,255,0.25)'],
      ];
      f.slots.forEach((s, i) => {
        const [c, st] = tapes[i];
        if (i % 2 === 0) tape(ctx, s.x + 30, s.y - 6, 190, 54, -0.6, c, st);
        else tape(ctx, s.x + s.w - 30, s.y - 6, 190, 54, 0.6, c, st);
      });
      maple(ctx, 1090, 3480, 70, 0.4, '#B5462F');
      ginkgo(ctx, 1010, 3520, 50, -0.5, '#E3A73B');
    },
  },
  {
    id: 'film',
    name: '필름 스트립',
    height: 3260,
    slots: stack({ x: 135, top: 80, w: 930, gap: 40 }),
    title: '#E3A73B',
    date: '#F08A24',
    bg(ctx, f) {
      ctx.fillStyle = '#16120F';
      ctx.fillRect(0, 0, WIDTH, f.height);
      ctx.fillStyle = '#EDE3D2';
      for (let y = 30; y < f.height - 40; y += 74) {
        roundRect(ctx, 38, y, 52, 36, 8);
        ctx.fill();
        roundRect(ctx, WIDTH - 90, y, 52, 36, 8);
        ctx.fill();
      }
    },
    fg(ctx, f) {
      ctx.save();
      ctx.fillStyle = '#F08A24';
      ctx.font = '600 26px "Pretendard", sans-serif';
      f.slots.forEach((s, i) => {
        ctx.save();
        ctx.translate(WIDTH - 108, s.y + s.h / 2);
        ctx.rotate(Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(`▸ ${i + 1}A`, 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(112, s.y + s.h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('GAEUL 400', 0, 0);
        ctx.restore();
      });
      ctx.restore();
    },
  },
  {
    id: 'sky',
    name: '가을 하늘',
    height: 3600,
    slots: stack(),
    title: '#3E5F7A',
    date: '#B5462F',
    bg(ctx, f) {
      const g = ctx.createLinearGradient(0, 0, 0, f.height);
      g.addColorStop(0, '#BFDDF2');
      g.addColorStop(0.7, '#DCEDF7');
      g.addColorStop(1, '#F4EBDD');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WIDTH, f.height);
      const r = rng(41);
      for (let i = 0; i < 9; i++) {
        cloud(ctx, r() < 0.5 ? r() * 60 : WIDTH - r() * 60, 200 + r() * (f.height - 600), 60 + r() * 50);
      }
    },
    fg(ctx, f) {
      const r = rng(43);
      const colors = ['#F2A7C3', '#E7739B', '#FFFFFF', '#F7C6D7'];
      const flowers = [
        [60, 3300, 64], [150, 3380, 50], [50, 3450, 44], [1140, 3290, 66], [1060, 3400, 52], [1150, 3450, 46],
        [40, 1700, 44], [1160, 900, 42], [1160, 2500, 46], [40, 820, 38],
      ];
      flowers.forEach(([x, y, s], i) => cosmos(ctx, x, y, s, r() * 6.28, colors[i % colors.length]));
      dragonfly(ctx, 1080, 60, 56, 1.9);
      dragonfly(ctx, 120, 1660, 44, -1.1);
      dragonfly(ctx, 1100, 2520, 40, 1.3);
    },
  },
  {
    id: 'night',
    name: '밤 산책',
    height: 3600,
    slots: stack(),
    title: '#F4E3B5',
    date: '#E3A73B',
    bg(ctx, f) {
      const g = ctx.createLinearGradient(0, 0, 0, f.height);
      g.addColorStop(0, '#1A2340');
      g.addColorStop(1, '#2D2F4E');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WIDTH, f.height);
      const r = rng(51);
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = `rgba(255,248,220,${0.3 + r() * 0.6})`;
        ctx.beginPath();
        ctx.arc(r() * WIDTH, r() * f.height, 1 + r() * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const s of f.slots) {
        ctx.fillStyle = '#F5D8A0';
        ctx.fillRect(s.x - 6, s.y - 6, s.w + 12, s.h + 12);
      }
    },
    fg(ctx, f) {
      const r = rng(53);
      for (let i = 0; i < 22; i++) {
        const x = r() < 0.5 ? 10 + r() * 50 : WIDTH - 10 - r() * 50;
        star(ctx, x, 120 + r() * (f.height - 300), 8 + r() * 12, '#FFE9A8');
      }
      // 보름달
      const mx = 1040, my = 3460;
      glowDot(ctx, mx, my, 60, 'rgba(255,236,170,0.5)');
      ctx.fillStyle = '#FBEFC4';
      ctx.beginPath();
      ctx.arc(mx, my, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(200,180,120,0.35)';
      for (const [dx, dy, rr] of [[-20, -15, 14], [22, 10, 10], [-5, 28, 8]]) {
        ctx.beginPath();
        ctx.arc(mx + dx, my + dy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      // 꼬마전구 줄 (왼쪽 아래)
      ctx.strokeStyle = 'rgba(40,30,25,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 3370);
      ctx.quadraticCurveTo(170, 3480, 330, 3390);
      ctx.stroke();
      for (let t = 0.08; t < 1; t += 0.12) {
        const x = 2 * (1 - t) * t * 170 + t * t * 330;
        const y = (1 - t) * (1 - t) * 3370 + 2 * (1 - t) * t * 3480 + t * t * 3390 + 14;
        glowDot(ctx, x, y, 9, 'rgba(255,200,110,0.95)');
      }
      star(ctx, 70, 60, 26, '#FFE9A8');
      star(ctx, 1150, 120, 18, '#FFE9A8');
    },
  },
];

export function getFrame(id) {
  return FRAMES.find((f) => f.id === id) || FRAMES[0];
}
