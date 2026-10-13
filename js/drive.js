// 완성본을 선생님 구글 드라이브로 보내기 (Apps Script 웹 앱 경유).
// 주소와 비밀 코드는 저장소에 넣지 않고 기기마다 localStorage에만 둔다.

const STORE_KEY = 'gaeul4cut.drive';
const URL_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;

export function isValidUrl(url) {
  return URL_PATTERN.test(String(url || '').trim());
}

export function getDrive() {
  try {
    const cfg = JSON.parse(localStorage.getItem(STORE_KEY));
    return cfg && isValidUrl(cfg.url) ? cfg : null;
  } catch {
    return null;
  }
}

export function setDrive(cfg) {
  try {
    if (cfg) localStorage.setItem(STORE_KEY, JSON.stringify({ url: cfg.url.trim(), key: cfg.key || '' }));
    else localStorage.removeItem(STORE_KEY);
    return true;
  } catch {
    return false;
  }
}

// 연결 링크(…/#drive=주소&key=코드)로 열면 이 기기에 저장하고 주소창에서 지운다.
// # 뒤쪽은 서버로 전송되지 않는다.
export function readSetupFromHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const url = params.get('drive');
  if (!url) return null;
  history.replaceState(null, '', location.pathname + location.search);
  if (!isValidUrl(url)) return { error: '연결 링크의 주소가 올바르지 않아요.' };
  const cfg = { url, key: params.get('key') || '' };
  return setDrive(cfg) ? cfg : { error: '이 브라우저에서는 설정을 저장할 수 없어요 (개인정보 보호 모드인지 확인).' };
}

export function setupLink(cfg) {
  const base = location.origin + location.pathname;
  return `${base}#drive=${encodeURIComponent(cfg.url)}&key=${encodeURIComponent(cfg.key || '')}`;
}

async function call(cfg, payload) {
  // Content-Type을 지정하지 않아야(text/plain) CORS 사전 요청 없이 Apps Script로 바로 간다
  const res = await fetch(cfg.url, { method: 'POST', body: JSON.stringify({ ...payload, key: cfg.key }) });
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('Apps Script 응답을 읽지 못했어요. 배포 시 "액세스 권한: 모든 사용자"인지 확인해 주세요.');
  }
  if (!json.ok) throw new Error(json.error || '드라이브 저장 실패');
  return json;
}

export function ping(cfg) {
  return call(cfg, { action: 'ping' });
}

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

export async function upload(cfg, file) {
  const data = await blobToBase64(file);
  return call(cfg, { action: 'upload', filename: file.name, mimeType: file.type, data });
}
