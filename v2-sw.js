// Service worker: rede primeiro, com cache de reserva do casco do app (e requisito para instalar como PWA).
// Requisições ao Firebase (outros domínios) nunca passam pelo cache.
// Muda o sufixo "?v=" aqui (e nos <script>/<link> do HTML) a cada publicação que mexer em
// JS/CSS — foi a falta disso que fez um bug de cache da CDN da Hostinger prender clientes
// numa versão de dias atrás mesmo depois de limpar cache e aguardar o site inteiro (ver
// commit da correção do carrossel "Em promoção"). Com o nome do arquivo mudando a cada
// publicação, não tem cache (navegador, CDN ou daqui) que consiga servir o antigo no lugar.
const VERSAO = "manejomix-v2-1";
const BASE = [
  "./", "v2-index.html", "v2-acompanhar.html", "v2-css/style.css?v=20261115", "v2-css/splash.css?v=20261115",
  "v2-js/db.js?v=20261115", "v2-js/store.js?v=20261115", "v2-js/acompanhar.js?v=20261115", "v2-js/pwa.js?v=20261115", "v2-js/splash.js?v=20261115",
  "v2-firebase-config.js?v=20261115", "v2-manifest.webmanifest", "v2-icons/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  // Achado do review final do corte: até o corte, o V1 (sw.js/sw-admin.js) convivia
  // com o V2 e só se apagava cache que começasse com "manejomix-v2-", pra nunca tocar
  // nos caches do V1 ("manejo-mix-shell-v2"/"manejo-mix-admin-shell-v2"). Agora que o
  // V2 é o site inteiro, esses caches do V1 não servem pra nada — e, sem apagá-los, um
  // cliente que visitou antes do corte e fica offline pode receber a página V1 antiga
  // guardada neles (ver fallback do fetch abaixo). Agora apaga qualquer cache que não
  // seja da versão atual.
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
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
      // offline: busca só no cache da versão atual — nunca num cache antigo que algum
      // cliente ainda tenha guardado de antes do corte (ver comentário do activate).
      .catch(() => caches.open(VERSAO).then((c) => c.match(req)).then((r) => r || (req.mode === "navigate" ? caches.open(VERSAO).then((c2) => c2.match("v2-index.html")) : Response.error())))
  );
});
