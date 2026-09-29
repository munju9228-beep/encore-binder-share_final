// 아이카츠 앙코르: 인터넷이 되면 항상 최신 파일을, 안 되면 저장해 둔 파일을 씁니다.
const PREFIX = "encore-binder-";
const CACHE = PREFIX + "v6";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => fetch(u, {cache: "reload"}).then(r => r.ok && c.put(u, r)).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
  // 앱 파일: 먼저 인터넷에서 새로 받고, 실패하면 저장본
  e.respondWith(fetch(req, {cache: "no-cache"}).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, copy)); }
    return res;
  }).catch(async () => {
    const c = await caches.open(CACHE);
    return (await c.match(req, {ignoreSearch: true})) || (req.mode === "navigate" ? c.match("./index.html") : undefined);
  }));
});
