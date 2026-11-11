// Service worker: rede primeiro, com cache de reserva do casco do app (e requisito para instalar como PWA).
// Requisições ao Firebase (outros domínios) nunca passam pelo cache.
const VERSAO = "manejomix-v2-0";
const BASE = [
  "./", "v2-index.html", "v2-acompanhar.html", "v2-css/style.css", "v2-css/splash.css",
  "v2-js/db.js", "v2-js/store.js", "v2-js/acompanhar.js", "v2-js/pwa.js", "v2-js/splash.js",
  "v2-firebase-config.js", "v2-manifest.webmanifest", "v2-icons/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  // `caches` é por ORIGEM, não por escopo do service worker — mesmo com o
  // registro restrito a "./v2-", um cleanup "apaga tudo que não for a minha
  // versão" apagaria também os caches do site atual (sw.js/sw-admin.js).
  // Por isso só mexe em chaves que comecem com "manejomix-v2-".
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("manejomix-v2-") && k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // painel administrativo sempre direto da rede
  if (url.pathname.endsWith("v2-admin.html") || url.pathname.endsWith("/admin.js") || url.pathname.endsWith("/admin.css")) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match("v2-index.html") : Response.error())))
  );
});
