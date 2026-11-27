// 여행 수첩 서비스 워커 — 앱 화면을 기기에 저장해 오프라인에서도 열리게 해요.
// index.html 등을 고친 뒤에는 아래 VERSION 숫자를 올려야 새 버전이 반영돼요.
const VERSION = 'tripnote-v4';
const SHELL = ['./', './index.html', './firebase-config.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 앱 화면·Firebase 설정: 인터넷 되면 최신, 안 되면 저장본
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('firebase-config.js'))) {
    const key = req.mode === 'navigate' ? './index.html' : req;
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(key, copy));
        return res;
      }).catch(() => caches.match(key))
    );
    return;
  }

  // 같은 사이트 파일 + 구글 폰트 + Firebase 라이브러리: 저장본 먼저, 없으면 받아서 저장
  if (url.origin === location.origin || url.hostname === 'www.gstatic.com' || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
