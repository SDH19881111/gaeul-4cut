// 프레임·애니메이션에 쓰는 가을 장식 도형. 모두 직접 그려서 저작권 걱정이 없다.

// 같은 시드면 항상 같은 배치가 나오도록 하는 난수 (미리보기와 저장본이 똑같이 보이게)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const deg = (d) => (d * Math.PI) / 180;
const polar = (a, r) => [Math.cos(deg(a)) * r, Math.sin(deg(a)) * r];

// 다섯 갈래 단풍잎 윤곽 (반지름 1 기준, 위쪽이 잎끝)
const MAPLE = (() => {
  const lobes = [[-90, 1], [-38, 0.86], [18, 0.6], [162, 0.6], [218, 0.86]];
  const pts = [];
  lobes.forEach(([a, L], i) => {
    pts.push(polar(a - 24, L * 0.48));
    pts.push(polar(a - 13, L * 0.74));
    pts.push(polar(a - 8, L * 0.64));
    pts.push(polar(a, L));
    pts.push(polar(a + 8, L * 0.64));
    pts.push(polar(a + 13, L * 0.74));
    pts.push(polar(a + 24, L * 0.48));
    const next = lobes[(i + 1) % lobes.length][0];
    const gap = ((next - a + 360) % 360) || 360;
    pts.push(polar(a + gap / 2, i === 2 ? 0.22 : 0.3));
  });
  return pts;
})();

export function maple(ctx, x, y, size, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size, size);
  ctx.beginPath();
  MAPLE.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,20,10,0.28)';
  ctx.lineWidth = 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0.62);
  ctx.lineTo(0, -0.85);
  for (const a of [-38, 18, 162, 218]) {
    const [ex, ey] = polar(a, a === 18 || a === 162 ? 0.5 : 0.72);
    ctx.moveTo(0, 0.06);
    ctx.lineTo(ex, ey);
  }
  ctx.stroke();
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0.15);
  ctx.quadraticCurveTo(0.04, 0.45, -0.02, 0.68);
  ctx.stroke();
  ctx.restore();
}

// 부채꼴 은행잎 (원점이 잎자루 끝, 위로 펼쳐짐)
export function ginkgo(ctx, x, y, size, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-0.35, -0.2, -0.8, -0.6);
  ctx.quadraticCurveTo(-0.62, -1.02, -0.13, -1.0);
  ctx.lineTo(0, -0.8);
  ctx.lineTo(0.13, -1.0);
  ctx.quadraticCurveTo(0.62, -1.02, 0.8, -0.6);
  ctx.quadraticCurveTo(0.35, -0.2, 0, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,10,0.22)';
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  for (let a = -140; a <= -40; a += 14) {
    const [ex, ey] = polar(a, 0.85);
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
  }
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(0.08, 0.3, 0.02, 0.55);
  ctx.stroke();
  ctx.restore();
}

export function acorn(ctx, x, y, size, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size, size);
  ctx.fillStyle = '#A8693A';
  ctx.beginPath();
  ctx.ellipse(0, 0.15, 0.42, 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(-0.15, 0.1, 0.08, 0.25, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6B4A2B';
  ctx.beginPath();
  ctx.ellipse(0, -0.25, 0.5, 0.28, 0, Math.PI, 0);
  ctx.lineTo(0.5, -0.18);
  ctx.quadraticCurveTo(0, -0.05, -0.5, -0.18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6B4A2B';
  ctx.lineWidth = 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -0.5);
  ctx.lineTo(0.05, -0.68);
  ctx.stroke();
  ctx.restore();
}

export function cosmos(ctx, x, y, size, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size, size);
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-0.32, -0.45, -0.2, -0.95);
    ctx.lineTo(-0.1, -0.88);
    ctx.lineTo(0, -0.98);
    ctx.lineTo(0.1, -0.88);
    ctx.lineTo(0.2, -0.95);
    ctx.quadraticCurveTo(0.32, -0.45, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#E3A73B';
  ctx.beginPath();
  ctx.arc(0, 0, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#B5772A';
  for (let i = 0; i < 7; i++) {
    const [px, py] = polar(i * 51, 0.1);
    ctx.beginPath();
    ctx.arc(px, py, 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function dragonfly(ctx, x, y, size, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(size, size);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.strokeStyle = 'rgba(70,90,110,0.55)';
  ctx.lineWidth = 0.03;
  for (const [dx, dy, a, l] of [[0, -0.18, -0.25, 0.75], [0, -0.18, 0.25, 0.75], [0, 0.0, -0.05, 0.65], [0, 0.0, 0.05, 0.65]]) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * (l / 2 + 0.06), dy, l / 2, 0.11, side * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#C0452B';
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.09;
  ctx.beginPath();
  ctx.moveTo(0, -0.3);
  ctx.lineTo(0, 1.0);
  ctx.stroke();
  ctx.fillStyle = '#9E3B25';
  ctx.beginPath();
  ctx.arc(0, -0.36, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function star(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const [px, py] = polar(-90 + i * 36, i % 2 ? r * 0.45 : r);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function glowDot(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
  g.addColorStop(0, color);
  g.addColorStop(0.3, color.replace(/[\d.]+\)$/, '0.45)'));
  g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
  ctx.fill();
}

export function cloud(ctx, x, y, s) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  for (const [dx, dy, r] of [[0, 0, 0.5], [0.45, 0.08, 0.38], [-0.45, 0.1, 0.36], [0.2, -0.25, 0.4], [-0.2, -0.2, 0.32]]) {
    ctx.moveTo(x + (dx + r) * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

// 마스킹테이프: 반투명 띠 + 톱니 끝
export function tape(ctx, x, y, w, h, rot, color, stripe) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  const teeth = 6;
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  for (let i = 1; i <= teeth; i++) ctx.lineTo(w / 2 + (i % 2 ? 5 : 0), -h / 2 + (h * i) / teeth);
  ctx.lineTo(-w / 2, h / 2);
  for (let i = teeth - 1; i >= 0; i--) ctx.lineTo(-w / 2 - (i % 2 ? 5 : 0), -h / 2 + (h * i) / teeth);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (stripe) {
    ctx.clip();
    ctx.strokeStyle = stripe;
    ctx.lineWidth = 8;
    for (let sx = -w; sx < w; sx += 22) {
      ctx.beginPath();
      ctx.moveTo(sx, h / 2);
      ctx.lineTo(sx + h, -h / 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
