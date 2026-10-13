// 화면 흐름: 시작 → 촬영 → 확인(재촬영) → 꾸미기 → 저장
import { startCamera, stopCamera, capture, countCameras } from './camera.js';
import { FRAMES, getFrame } from './frames.js';
import { FILTERS } from './filters.js';
import { render, filteredPhoto, ensureFonts, toBlob, clearCache } from './compose.js';
import { playLeaves, drawLogoLeaves } from './effects.js';
import { unlock, beep, shutter, isSoundOn, setSoundOn } from './sound.js';
import { getDrive, setDrive, isValidUrl, readSetupFromHash, setupLink, ping, upload } from './drive.js';

const $ = (sel) => document.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// 화면에 '만드는 중…'이 먼저 그려지도록 잠깐 양보 (rAF는 백그라운드 탭에서 멈추므로 타이머 사용)
const yieldToPaint = () => new Promise((r) => setTimeout(r, 50));

const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isTouch = matchMedia('(pointer: coarse)').matches;

const state = {
  facing: 'user',
  mirror: true,
  shots: [null, null, null, null], // { id, canvas }
  nextId: 1,
  queue: [], // 이번에 찍을 컷 번호들
  frameId: 'maple',
  filterId: 'film',
  showDate: true,
  resultUrl: null,
  resultFile: null,
};

let session = 0; // 촬영 화면을 벗어나면 증가 → 진행 중이던 비동기 작업을 멈춘다

function show(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  window.scrollTo(0, 0);
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

/* ---------------- 1. 시작 ---------------- */

const CAMERA_MESSAGES = {
  insecure: '카메라는 https:// 주소(또는 localhost)에서만 켜져요.\n파일을 더블클릭해서 열었다면 배포된 주소로 다시 열어 주세요.',
  denied: '카메라 사용이 꺼져 있어요.\n주소창의 🔒 또는 "aA" 버튼 → 카메라를 "허용"으로 바꾼 뒤 새로고침해 주세요.\n아이패드: 설정 › Safari › 카메라 › 허용',
  notfound: '카메라를 찾지 못했어요.\n카메라가 있는 기기에서 열어 주세요.',
  busy: '다른 앱이 카메라를 쓰고 있어요.\n그 앱(화상회의 등)을 닫고 다시 눌러 주세요.',
  unknown: '카메라를 켜지 못했어요. 새로고침 후 다시 시도해 주세요.',
};

function showNotice(text) {
  const el = $('#start-notice');
  el.textContent = text;
  el.hidden = !text;
}

function checkEnvironment() {
  const inApp = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(inapp|Line\/|DaumApps|everytimeApp|whale\/.*mobile.*inapp/i.test(navigator.userAgent);
  if (inApp) {
    showNotice('앱 안의 브라우저에서는 카메라가 안 켜질 수 있어요.\n오른쪽 위 메뉴(⋮ 또는 공유)에서 "다른 브라우저로 열기"를 눌러 크롬·사파리로 열어 주세요.');
  } else if (!window.isSecureContext && !new URLSearchParams(location.search).has('demo')) {
    showNotice(CAMERA_MESSAGES.insecure);
  }
}

document.querySelectorAll('.seg').forEach((b) =>
  b.addEventListener('click', () => {
    state.facing = b.dataset.facing;
    document.querySelectorAll('.seg').forEach((x) => x.classList.toggle('active', x === b));
  }),
);

$('#btn-start').addEventListener('click', () => {
  state.shots = [null, null, null, null];
  clearCache();
  enterShoot([0, 1, 2, 3]);
});

/* ---------------- 2. 촬영 ---------------- */

const video = $('#video');

function isRetake() {
  return state.queue.length < 4;
}

function setProgress(k) {
  const total = state.queue.length;
  $('#shoot-progress').textContent = `${isRetake() ? '다시 찍기 ' : ''}${Math.min(k + 1, total)} / ${total}`;
}

function renderStrip(nowIdx = -1) {
  const strip = $('#shot-strip');
  strip.innerHTML = '';
  state.shots.forEach((shot, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (i === nowIdx) slot.classList.add('now');
    else if (state.queue.includes(i)) slot.classList.add('target');
    if (shot) {
      const c = document.createElement('canvas');
      c.width = 144;
      c.height = 108;
      c.getContext('2d').drawImage(shot.canvas, 0, 0, 144, 108);
      slot.append(c);
    }
    strip.append(slot);
  });
}

let step = 0; // 이번 촬영에서 몇 번째 컷 차례인지 (state.queue의 인덱스)
let counting = false; // 카운트다운 중에는 버튼을 다시 못 누르게
let cameraCount = 1;

// 셔터 버튼과 전환 버튼을 '기다리는 중' 상태로
function readyForShot() {
  const btn = $('#btn-go');
  const idx = state.queue[step];
  btn.textContent = isRetake() ? `📸 ${idx + 1}번 컷 다시 찍기` : `📸 ${step + 1}번째 찍기`;
  btn.style.visibility = 'visible';
  $('#btn-flip').hidden = cameraCount < 2;
  setProgress(step);
  renderStrip(idx);
}

async function openCamera() {
  const my = ++session;
  counting = false;
  popCount('');
  $('#cam-loading').hidden = false;
  $('#btn-go').disabled = true;
  $('#btn-flip').hidden = true;
  try {
    const { facing } = await startCamera(video, state.facing);
    if (my !== session) return stopCamera();
    state.mirror = facing === 'user';
    $('#viewfinder').classList.toggle('mirror', state.mirror);
    $('#cam-loading').hidden = true;
    cameraCount = await countCameras();
    if (my !== session) return;
    $('#btn-go').disabled = false;
    readyForShot();
  } catch (e) {
    if (my !== session) return;
    stopCamera();
    show('start');
    showNotice(CAMERA_MESSAGES[e.kind] || `${CAMERA_MESSAGES.unknown}\n(${e.message})`);
  }
}

function enterShoot(queue) {
  state.queue = queue;
  step = 0;
  showNotice('');
  $('#btn-shoot-cancel').textContent = isRetake() ? '← 돌아가기' : '← 처음으로';
  $('#countdown').textContent = '';
  readyForShot();
  show('shoot');
  openCamera();
}

function popCount(text) {
  const el = $('#countdown');
  el.textContent = text;
  el.classList.remove('pop');
  void el.offsetWidth;
  if (text) el.classList.add('pop');
}

function flash() {
  const el = $('#flash');
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}

// 버튼을 누르면 3초 세고 한 장 찍는다. 다음 장은 다시 버튼을 눌러야 찍힘.
async function shootOne() {
  if (counting) return;
  counting = true;
  unlock(); // iOS: 버튼을 누른 순간에 소리를 깨워 둬야 3초 뒤 셔터음이 난다
  const my = session;
  const idx = state.queue[step];
  $('#btn-go').style.visibility = 'hidden'; // 자리는 유지해서 화면이 흔들리지 않게
  $('#btn-flip').hidden = true;
  for (let n = 3; n >= 1; n--) {
    popCount(String(n));
    beep(n === 1);
    await wait(1000);
    if (my !== session) return;
  }
  popCount('');
  shutter();
  flash();
  state.shots[idx] = { id: state.nextId++, canvas: capture(video, state.mirror) };
  renderStrip(idx);
  await wait(700);
  if (my !== session) return;
  counting = false;
  step++;
  if (step >= state.queue.length) {
    session++;
    stopCamera();
    enterReview();
    return;
  }
  readyForShot();
}

$('#btn-go').addEventListener('click', shootOne);

function updateSoundButton() {
  const on = isSoundOn();
  $('#btn-sound').textContent = on ? '🔊' : '🔇';
  $('#btn-sound').setAttribute('aria-label', on ? '촬영 소리 끄기' : '촬영 소리 켜기');
}
updateSoundButton();

$('#btn-sound').addEventListener('click', () => {
  setSoundOn(!isSoundOn());
  updateSoundButton();
  if (isSoundOn()) {
    unlock();
    beep();
  }
});

$('#btn-flip').addEventListener('click', () => {
  state.facing = state.facing === 'user' ? 'environment' : 'user';
  document.querySelectorAll('.seg').forEach((x) => x.classList.toggle('active', x.dataset.facing === state.facing));
  openCamera();
});

$('#btn-shoot-cancel').addEventListener('click', () => {
  session++;
  counting = false;
  stopCamera();
  popCount('');
  if (isRetake() && state.shots.every(Boolean)) enterReview();
  else show('start');
});

// 다른 앱으로 넘어가면 카메라를 끈다 (돌아오면 다시 켜고, 세던 컷은 다시 누르면 찍힘)
document.addEventListener('visibilitychange', () => {
  if (!$('#screen-shoot').classList.contains('active')) return;
  if (document.hidden) {
    session++;
    counting = false;
    stopCamera();
    popCount('');
  } else {
    openCamera();
  }
});

/* ---------------- 3. 확인 ---------------- */

function enterReview() {
  const grid = $('#review-grid');
  grid.innerHTML = '';
  state.shots.forEach((shot, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cut';
    b.setAttribute('aria-label', `${i + 1}번 사진 다시 찍기`);
    const c = document.createElement('canvas');
    c.width = 480;
    c.height = 360;
    c.getContext('2d').drawImage(shot.canvas, 0, 0, 480, 360);
    b.append(c);
    b.insertAdjacentHTML('beforeend', `<span class="num">${i + 1}</span><span class="badge">↺ 다시 찍기</span>`);
    // 사진을 누르면 그 컷만 바로 다시 찍으러 간다
    b.addEventListener('click', () => enterShoot([i]));
    grid.append(b);
  });
  show('review');
}

$('#btn-review-next').addEventListener('click', enterDecorate);

/* ---------------- 4. 꾸미기 ---------------- */

const preview = $('#preview');
let previewQueued = false;

function opts(extra) {
  return { shots: state.shots, frame: getFrame(state.frameId), filterId: state.filterId, showDate: state.showDate, ...extra };
}

function drawPreview() {
  if (previewQueued) return;
  previewQueued = true;
  setTimeout(() => {
    previewQueued = false;
    const frame = getFrame(state.frameId);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssH = preview.clientHeight || 600;
    const scale = Math.max(0.15, Math.min(0.6, (cssH * dpr) / frame.height));
    render(preview, opts({ scale }));
  });
}

function buildFrameList() {
  const list = $('#frame-list');
  list.innerHTML = '';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  for (const f of FRAMES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice frame' + (f.id === state.frameId ? ' active' : '');
    const c = document.createElement('canvas');
    render(c, opts({ frame: f, scale: (180 * dpr) / f.height }));
    b.append(c, f.name);
    b.addEventListener('click', () => {
      state.frameId = f.id;
      list.querySelectorAll('.choice').forEach((x) => x.classList.toggle('active', x === b));
      drawPreview();
    });
    list.append(b);
  }
}

function buildFilterList() {
  const list = $('#filter-list');
  list.innerHTML = '';
  for (const flt of FILTERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice filter' + (flt.id === state.filterId ? ' active' : '');
    const c = document.createElement('canvas');
    c.width = 208;
    c.height = 156;
    c.getContext('2d').drawImage(filteredPhoto(state.shots[0], flt.id, 208, 156), 0, 0);
    b.append(c, flt.name);
    b.addEventListener('click', () => {
      state.filterId = flt.id;
      list.querySelectorAll('.choice').forEach((x) => x.classList.toggle('active', x === b));
      drawPreview();
      buildFrameList();
    });
    list.append(b);
  }
}

async function enterDecorate() {
  show('decorate');
  await ensureFonts();
  buildFrameList();
  buildFilterList();
  drawPreview();
}

document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
    $('#frame-list').hidden = t.dataset.tab !== 'frames';
    $('#filter-list').hidden = t.dataset.tab !== 'filters';
  }),
);

$('#opt-date').addEventListener('change', (e) => {
  state.showDate = e.target.checked;
  drawPreview();
  buildFrameList();
});

$('#btn-deco-back').addEventListener('click', enterReview);
$('#btn-deco-done').addEventListener('click', enterSave);
window.addEventListener('resize', () => {
  if ($('#screen-decorate').classList.contains('active')) drawPreview();
});

/* ---------------- 5. 저장 ---------------- */

function fileName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `가을네컷_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
}

async function enterSave() {
  const btn = $('#btn-save');
  btn.disabled = true;
  btn.textContent = '만드는 중…';
  $('#save-hint').hidden = true;
  $('#result-img').removeAttribute('src');
  show('save');
  await ensureFonts();
  await yieldToPaint();
  // 저장 버튼을 누르는 순간 바로 공유창을 띄울 수 있도록 PNG를 미리 만들어 둔다 (iOS 제약)
  const canvas = render(document.createElement('canvas'), opts({ scale: 1 }));
  const blob = await toBlob(canvas);
  if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
  state.resultUrl = URL.createObjectURL(blob);
  state.resultFile = new File([blob], fileName(), { type: 'image/png' });
  // 드라이브용은 JPEG (PNG는 필름 노이즈 때문에 7MB 안팎 → 교실 와이파이에서 느림)
  state.driveFile = getDrive()
    ? new File([await toBlob(canvas, 'image/jpeg', 0.92)], fileName().replace(/\.png$/, '.jpg'), { type: 'image/jpeg' })
    : null;
  $('#result-img').src = state.resultUrl;
  btn.disabled = false;
  btn.textContent = '📥 저장하기';
  $('#btn-share').hidden = !(isTouch && navigator.canShare?.({ files: [state.resultFile] }));
  // 아이폰·아이패드는 다운로드가 '파일' 앱으로 가므로 사진첩에 넣는 방법을 알려 준다
  if (isIOS) {
    $('#save-hint').textContent = '저장하기는 "파일" 앱의 다운로드 폴더로 가요.\n사진첩에 넣으려면 공유하기 → "이미지 저장"을 누르거나 사진을 길게 눌러 주세요.';
    $('#save-hint').hidden = false;
  }
  playLeaves($('#leaf-fx'));
  sendToDrive();
}

/* ---------------- 드라이브 자동 저장 ---------------- */

// 같은 사진·꾸미기 조합은 한 번만 올린다 (다시 꾸미기 → 그대로 완성 시 중복 방지)
const uploaded = new Set();
const designKey = () => [...state.shots.map((s) => s.id), state.frameId, state.filterId, state.showDate].join('|');

function setDriveStatus(kind, text) {
  const box = $('#drive-status');
  box.hidden = !kind;
  box.className = `drive-status ${kind || ''}`;
  $('#drive-status-text').textContent = text || '';
  $('#btn-drive-retry').hidden = kind !== 'fail';
}

async function sendToDrive() {
  const cfg = getDrive();
  const file = state.driveFile;
  if (!cfg || !file) return setDriveStatus(null);
  const key = designKey();
  if (uploaded.has(key)) return setDriveStatus('ok', '☁️ 드라이브에 저장됨 ✓');
  setDriveStatus('busy', '☁️ 드라이브에 올리는 중…');
  try {
    await upload(cfg, file);
    uploaded.add(key);
    if (state.driveFile === file) setDriveStatus('ok', '☁️ 드라이브에 저장됨 ✓');
  } catch (e) {
    if (state.driveFile === file) setDriveStatus('fail', `드라이브 저장 실패: ${e.message}`);
  }
}

$('#btn-drive-retry').addEventListener('click', sendToDrive);

function save() {
  const file = state.resultFile;
  if (!file) return;
  const a = document.createElement('a');
  a.href = state.resultUrl;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  toast(isTouch ? '저장했어요! 갤러리나 다운로드 폴더를 확인하세요' : '저장했어요! 다운로드 폴더를 확인하세요');
}

// 공유창은 버튼을 누른 그 순간에 열어야 한다 (PNG는 저장 화면에 들어올 때 미리 만들어 둠)
async function share() {
  const file = state.resultFile;
  if (!file) return;
  try {
    await navigator.share({ files: [file], title: '가을네컷' });
  } catch (e) {
    if (e.name !== 'AbortError') toast('공유할 수 없어요. 저장하기를 눌러 주세요');
  }
}

$('#btn-save').addEventListener('click', save);
$('#btn-share').addEventListener('click', share);
$('#btn-deco-again').addEventListener('click', () => {
  show('decorate');
  drawPreview();
});
$('#btn-restart').addEventListener('click', () => {
  state.shots = [null, null, null, null];
  state.resultFile = null;
  state.driveFile = null;
  if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
  state.resultUrl = null;
  setDriveStatus(null);
  clearCache();
  show('start');
});

/* ---------------- 드라이브 설정 (선생님용) ---------------- */

const dlg = $('#settings');

function updateDriveBadge() {
  $('#drive-badge').hidden = !getDrive();
}

function setMsg(kind, text) {
  const el = $('#set-msg');
  el.className = `set-msg ${kind || ''}`;
  el.textContent = text || '';
}

function formCfg() {
  return { url: $('#set-url').value.trim(), key: $('#set-key').value.trim() };
}

function refreshSettings() {
  const cfg = getDrive();
  $('#set-link').hidden = !cfg;
  $('#set-off').hidden = !cfg;
  updateDriveBadge();
}

$('#btn-settings').addEventListener('click', () => {
  const cfg = getDrive();
  $('#set-url').value = cfg?.url || '';
  $('#set-key').value = cfg?.key || '';
  setMsg(null, cfg ? '이 기기는 드라이브에 연결되어 있어요.' : '');
  refreshSettings();
  dlg.showModal();
});

$('#set-close').addEventListener('click', () => dlg.close());

$('#set-test').addEventListener('click', async () => {
  const cfg = formCfg();
  if (!isValidUrl(cfg.url)) return setMsg('fail', '주소는 https://script.google.com/macros/s/…/exec 모양이어야 해요.');
  setMsg(null, '확인하는 중…');
  try {
    await ping(cfg);
    setMsg('ok', '연결 성공! "저장"을 눌러 주세요.');
  } catch (e) {
    setMsg('fail', e.message);
  }
});

$('#set-save').addEventListener('click', async () => {
  const cfg = formCfg();
  if (!isValidUrl(cfg.url)) return setMsg('fail', '주소는 https://script.google.com/macros/s/…/exec 모양이어야 해요.');
  if (!cfg.key) return setMsg('fail', '비밀 코드를 입력해 주세요.');
  if (!setDrive(cfg)) return setMsg('fail', '이 브라우저에서는 설정을 저장할 수 없어요 (개인정보 보호 모드인지 확인).');
  refreshSettings();
  setMsg('ok', '저장했어요. 이제 완성본이 드라이브로 자동 저장돼요.');
});

$('#set-link').addEventListener('click', async () => {
  const cfg = getDrive();
  if (!cfg) return;
  const link = setupLink(cfg);
  try {
    await navigator.clipboard.writeText(link);
    setMsg('ok', '연결 링크를 복사했어요. 다른 태블릿에서 이 링크를 한 번 열면 연결돼요.\n(비밀 코드가 들어 있으니 학생들에게 공유하지 마세요)');
  } catch {
    window.prompt('아래 링크를 복사해 다른 태블릿에서 열어 주세요', link);
  }
});

$('#set-off').addEventListener('click', () => {
  setDrive(null);
  $('#set-url').value = '';
  $('#set-key').value = '';
  refreshSettings();
  setMsg(null, '이 기기의 드라이브 연결을 끊었어요.');
});

/* ---------------- 시작 ---------------- */
checkEnvironment();
const setup = readSetupFromHash();
if (setup?.error) showNotice(setup.error);
else if (setup) toast('☁️ 구글 드라이브 자동 저장이 연결됐어요');
updateDriveBadge();
drawLogoLeaves($('#logo-leaves'));
ensureFonts();
