// 카운트다운 '삑'과 카메라 셔터 '찰칵'을 Web Audio로 직접 만든다 (소리 파일 없음).
// iOS는 사용자가 버튼을 누를 때 unlock()을 불러야 이후 소리가 난다.
// 아이폰·아이패드는 무음 스위치가 켜져 있으면 소리가 나지 않을 수 있다.

const STORE_KEY = 'gaeul4cut.sound';
let ctx = null;
let enabled = true;
try {
  enabled = localStorage.getItem(STORE_KEY) !== 'off';
} catch {
  /* 저장소를 못 쓰면 기본값(켜짐) */
}

export function isSoundOn() {
  return enabled;
}

export function setSoundOn(on) {
  enabled = on;
  try {
    localStorage.setItem(STORE_KEY, on ? 'on' : 'off');
  } catch {
    /* 무시 */
  }
}

export function unlock() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
}

export function beep(last = false) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = last ? 1320 : 880;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.18);
}

let noiseBuf = null;
function noise() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// 셔터 막이 열리고 닫히는 두 번의 '착-칵'
function click(at, freq, vol, len) {
  const src = ctx.createBufferSource();
  src.buffer = noise();
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(band).connect(gain).connect(ctx.destination);
  src.start(at);
  src.stop(at + len + 0.01);

  const thump = ctx.createOscillator();
  const tg = ctx.createGain();
  thump.frequency.setValueAtTime(220, at);
  thump.frequency.exponentialRampToValueAtTime(60, at + 0.05);
  tg.gain.setValueAtTime(vol * 0.6, at);
  tg.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  thump.connect(tg).connect(ctx.destination);
  thump.start(at);
  thump.stop(at + 0.07);
}

export function shutter() {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime;
  click(t, 3200, 0.9, 0.05);
  click(t + 0.075, 2200, 0.7, 0.08);
}
