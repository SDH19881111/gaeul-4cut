/**
 * 가을네컷 → 구글 드라이브 자동 저장용 Apps Script
 *
 * 1) 아래 SECRET을 아무도 모르는 문자열로 바꾼다 (앱 설정의 '비밀 코드'와 똑같이)
 * 2) 배포 › 새 배포 › 웹 앱 / 실행: 나 / 액세스 권한: 모든 사용자
 * 자세한 순서는 drive/SETUP.md 참고
 */
const SECRET = '여기에-비밀코드-입력';
const ROOT_FOLDER_NAME = '가을네컷';
const MAX_BYTES = 15 * 1024 * 1024;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (SECRET === '여기에-비밀코드-입력') return out({ ok: false, error: 'Apps Script의 SECRET을 먼저 바꿔 주세요.' });
    if (body.key !== SECRET) return out({ ok: false, error: '비밀 코드가 맞지 않아요.' });

    if (body.action === 'ping') {
      return out({ ok: true, folder: rootFolder().getUrl() });
    }
    if (body.action === 'upload') {
      const bytes = Utilities.base64Decode(body.data);
      if (bytes.length > MAX_BYTES) return out({ ok: false, error: '파일이 너무 커요.' });
      const mime = body.mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      const name = String(body.filename || 'gaeul4cut.png').replace(/[\\/:*?"<>|]/g, '_').slice(0, 100);
      const file = dayFolder().createFile(Utilities.newBlob(bytes, mime, name));
      return out({ ok: true, id: file.getId(), url: file.getUrl() });
    }
    return out({ ok: false, error: '알 수 없는 요청이에요.' });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function doGet() {
  return out({ ok: true, app: 'gaeul-4cut' });
}

// 여러 태블릿이 동시에 올려도 폴더가 두 개 생기지 않도록 잠금
function dayFolder() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const root = rootFolder();
    const name = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    const it = root.getFoldersByName(name);
    return it.hasNext() ? it.next() : root.createFolder(name);
  } finally {
    lock.releaseLock();
  }
}

function rootFolder() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_ID');
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (e) {
      /* 폴더가 지워졌으면 새로 만든다 */
    }
  }
  const f = DriveApp.createFolder(ROOT_FOLDER_NAME);
  props.setProperty('ROOT_ID', f.getId());
  return f;
}

// 처음 한 번 편집기에서 실행하면 권한 승인 + 폴더 생성이 된다
function setup() {
  Logger.log('저장 폴더: ' + rootFolder().getUrl());
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
