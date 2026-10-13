// 필터 4종. ctx.filter는 iOS 사파리에서 동작하지 않으므로 픽셀을 직접 계산한다.
import { rng } from './shapes.js';

export const FILTERS = [
  { id: 'none', name: '원본' },
  { id: 'film', name: '필름톤' },
  { id: 'amber', name: '앰버' },
  { id: 'vintage', name: '빈티지' },
];

// imageData를 그 자리에서 바꾼다. Uint8ClampedArray라 0~255 범위는 자동으로 맞춰진다.
export function applyFilter(imageData, id, seed = 1) {
  if (id === 'none') return imageData;
  const { data: d, width: w, height: h } = imageData;
  const r = rng(seed);
  const cx = w / 2, cy = h / 2;
  const maxD2 = cx * cx + cy * cy;
  // 노이즈 크기는 해상도와 상관없이 비슷해 보이게
  const grain = id === 'film' ? 26 : id === 'vintage' ? 14 : 0;
  const vig = id === 'vintage' ? 0.55 : id === 'film' ? 0.22 : id === 'amber' ? 0.15 : 0;

  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let R = d[i], G = d[i + 1], B = d[i + 2];
    const L = 0.299 * R + 0.587 * G + 0.114 * B;

    if (id === 'film') {
      // 채도 ↓, 대비 살짝 ↓, 어두운 곳 들뜨게, 그림자는 살짝 청록
      R = L + (R - L) * 0.7;
      G = L + (G - L) * 0.7;
      B = L + (B - L) * 0.7;
      R = 16 + R * 0.9;
      G = 18 + G * 0.9;
      B = 22 + B * 0.86;
    } else if (id === 'amber') {
      // 따뜻한 색온도 + 약간 진하게
      R = L + (R - L) * 1.12;
      G = L + (G - L) * 1.12;
      B = L + (B - L) * 1.12;
      R = R * 1.06 + 16;
      G = G * 1.0 + 6;
      B = B * 0.82;
    } else if (id === 'vintage') {
      // 세피아 쪽으로 바래게 + 검정 들뜸 + 대비 ↓
      const sR = L * 1.05 + 24, sG = L * 0.92 + 14, sB = L * 0.72 + 8;
      R = R * 0.55 + sR * 0.45;
      G = G * 0.55 + sG * 0.45;
      B = B * 0.55 + sB * 0.45;
      R = 34 + R * 0.8;
      G = 28 + G * 0.8;
      B = 26 + B * 0.76;
    }

    if (grain) {
      const n = (r() - 0.5) * grain;
      R += n; G += n; B += n;
    }
    if (vig) {
      const x = p % w - cx, y = ((p / w) | 0) - cy;
      const t = (x * x + y * y) / maxD2; // 0(가운데)~1(모서리)
      const v = 1 - vig * t * t;
      R *= v; G *= v; B *= v;
    }
    d[i] = R; d[i + 1] = G; d[i + 2] = B;
  }
  return imageData;
}
