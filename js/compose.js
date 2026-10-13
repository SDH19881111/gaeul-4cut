// 4컷 + 프레임 + 필터 + 날짜를 한 장의 캔버스로 합성한다.
import { WIDTH } from './frames.js';
import { applyFilter } from './filters.js';

const TITLE_FONT = '"Nanum Pen Script"';

// 같은 사진·필터·크기 조합은 다시 계산하지 않는다 (프레임만 바꿀 때 빠르게)
const cache = new Map();
export function clearCache() {
  cache.clear();
}

export function filteredPhoto(shot, filterId, w, h) {
  const key = `${shot.id}|${filterId}|${w}x${h}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(shot.canvas, 0, 0, w, h);
  if (filterId !== 'none') {
    const img = ctx.getImageData(0, 0, w, h);
    applyFilter(img, filterId, shot.id * 97 + 13);
    ctx.putImageData(img, 0, 0);
  }
  if (cache.size > 80) cache.clear();
  cache.set(key, c);
  return c;
}

export function formatDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}. ${p(d.getMonth() + 1)}. ${p(d.getDate())}`;
}

export async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load(`100px ${TITLE_FONT}`, '가을네컷 0123456789.'),
      document.fonts.load('600 26px "Pretendard"', 'GAEUL 400'),
    ]);
  } catch {
    /* 글꼴을 못 받아도 기본 글꼴로 계속 진행 */
  }
}

// scale: 1이면 원본 해상도(1200px 폭), 미리보기는 작게
export function render(canvas, { shots, frame, filterId, showDate, date = new Date(), scale = 1 }) {
  const W = Math.round(WIDTH * scale);
  const H = Math.round(frame.height * scale);
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingQuality = 'high';

  frame.bg(ctx, frame);

  frame.slots.forEach((s, i) => {
    const shot = shots[i];
    if (!shot) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      return;
    }
    const pw = Math.max(1, Math.round(s.w * scale));
    const ph = Math.max(1, Math.round(s.h * scale));
    ctx.drawImage(filteredPhoto(shot, filterId, pw, ph), s.x, s.y, s.w, s.h);
  });

  frame.fg(ctx, frame);
  drawFooter(ctx, frame, showDate, date);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

function drawFooter(ctx, frame, showDate, date) {
  const last = frame.slots[frame.slots.length - 1];
  const top = last.y + last.h;
  const mid = (top + frame.height) / 2;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = frame.title;
  ctx.font = `128px ${TITLE_FONT}, cursive`;
  ctx.fillText('가을네컷', WIDTH / 2, showDate ? mid - 32 : mid);
  if (showDate) {
    ctx.fillStyle = frame.date;
    ctx.font = `66px ${TITLE_FONT}, cursive`;
    ctx.fillText(formatDate(date), WIDTH / 2, mid + 72);
  }
  ctx.restore();
}

export function toBlob(canvas, type = 'image/png', quality) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob 실패'))), type, quality));
}
