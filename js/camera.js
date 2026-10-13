// 카메라 켜기/끄기와 한 장 캡처.
// 주소 끝에 ?demo 를 붙이면 진짜 카메라 대신 움직이는 테스트 화면을 쓴다 (카메라 없는 PC에서 확인용).

const DEMO = new URLSearchParams(location.search).has('demo');
let stream = null;
let demoTimer = null;

export class CameraError extends Error {
  constructor(kind, cause) {
    super(kind);
    this.kind = kind; // insecure | denied | notfound | busy | unknown
    this.cause = cause;
  }
}

export async function startCamera(video, facing) {
  stopCamera();
  if (DEMO) {
    stream = demoStream(facing);
  } else {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new CameraError('insecure');
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
      });
    } catch (e) {
      const kind =
        e.name === 'NotAllowedError' || e.name === 'SecurityError' ? 'denied'
        : e.name === 'NotFoundError' || e.name === 'OverconstrainedError' ? 'notfound'
        : e.name === 'NotReadableError' ? 'busy'
        : 'unknown';
      throw new CameraError(kind, e);
    }
  }
  video.srcObject = stream;
  if (!video.videoWidth) {
    await new Promise((res) => video.addEventListener('loadedmetadata', res, { once: true }));
  }
  await video.play().catch(() => {});
  const settings = stream.getVideoTracks()[0]?.getSettings?.() || {};
  // 기기가 알려주면 그걸 믿고, 모르면 요청한 방향으로 판단
  return { facing: settings.facingMode || facing };
}

export function stopCamera() {
  if (demoTimer) {
    cancelAnimationFrame(demoTimer);
    demoTimer = null;
  }
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

export async function countCameras() {
  if (DEMO) return 2;
  try {
    const list = await navigator.mediaDevices.enumerateDevices();
    return list.filter((d) => d.kind === 'videoinput').length;
  } catch {
    return 1;
  }
}

// 영상 가운데를 4:3으로 잘라 한 장 캡처. 앞 카메라면 거울처럼 좌우 반전(미리보기와 똑같이).
export function capture(video, mirror, maxW = 1280) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const target = 4 / 3;
  let sw = vw, sh = vh;
  if (vw / vh > target) sw = vh * target;
  else sh = vw / target;
  const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
  const w = Math.round(Math.min(maxW, sw));
  const h = Math.round(w / target);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  return c;
}

function demoStream(facing) {
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 960;
  const ctx = c.getContext('2d');
  const t0 = performance.now();
  const hue = facing === 'user' ? 25 : 200;
  const draw = () => {
    const t = (performance.now() - t0) / 1000;
    const g = ctx.createLinearGradient(0, 0, 1280, 960);
    g.addColorStop(0, `hsl(${hue + Math.sin(t) * 20},55%,62%)`);
    g.addColorStop(1, `hsl(${hue + 40},45%,35%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1280, 960);
    // 얼굴 비슷한 동그라미
    const x = 640 + Math.sin(t * 1.3) * 220, y = 470 + Math.cos(t * 0.9) * 80;
    ctx.fillStyle = '#F6D7B8';
    ctx.beginPath(); ctx.arc(x, y, 190, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3B2A20';
    ctx.beginPath(); ctx.arc(x - 65, y - 30, 20, 0, Math.PI * 2); ctx.arc(x + 65, y - 30, 20, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 12; ctx.strokeStyle = '#B5462F';
    ctx.beginPath(); ctx.arc(x, y + 30, 80, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(`DEMO ${facing === 'user' ? '앞' : '뒤'} · ←L R→`, 40, 900);
    ctx.fillText(new Date().toLocaleTimeString(), 40, 80);
    demoTimer = requestAnimationFrame(draw);
  };
  draw();
  return c.captureStream(30);
}
