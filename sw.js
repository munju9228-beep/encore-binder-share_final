// 아이카츠 앙코르: 인터넷이 되면 항상 최신 파일을, 안 되면 저장해 둔 파일을 씁니다.
const PREFIX = "encore-binder-";
const CACHE = PREFIX + "v8";
const PHOTOS = PREFIX + "photos"; // 공식 카드 사진은 버전이 바뀌어도 지우지 않아요
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./jszip.min.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => fetch(u, {cache: "reload"}).then(r => r.ok && c.put(u, r)).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== PHOTOS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFont) return;
  if (url.origin === location.origin && !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (isFont) {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { c.put(req, r.clone()); return r; })));
    return;
  }
  // 공식 카드 사진 (photos/, series-photos/): 저장본을 바로 보여 주고, 뒤에서 새 사진이 있는지 확인
  if (/\/(series-)?photos\//.test(url.pathname)) {
    e.respondWith(caches.open(PHOTOS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req, {cache: "no-cache"}).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    }));
    return;
  }
  // 앱 파일: 먼저 인터넷에서 새로 받고, 실패하면 저장본
  e.respondWith(fetch(req, {cache: "no-cache"}).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, copy)); }
    return res;
  }).catch(async () => {
    const c = await caches.open(CACHE);
    return (await c.match(req, {ignoreSearch: true})) || (req.mode === "navigate" ? c.match("./index.html") : undefined);
  }));
});
