// Prova o achado Important do review final da Fase 5 (corte): com o site antigo
// aposentado, o v2-sw.js não pode mais deixar os caches "manejo-mix-shell-v2"/
// "manejo-mix-admin-shell-v2" intocados (regra de convivência da Fase 1, hoje sem
// sentido) nem buscar no cache global sem escopo — senão um cliente offline pode
// receber a página V1 antiga guardada antes do corte, em vez da V2.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "v2-sw.js"), "utf8");
const VERSAO = src.match(/const VERSAO = "([^"]+)"/)[1];

function carregarSW() {
  const handlers = {};
  const fakeSelf = { addEventListener: (tipo, fn) => { handlers[tipo] = fn; }, skipWaiting: () => {}, clients: { claim: () => {} } };
  const bancoDeCaches = {
    "manejo-mix-shell-v2": { "https://manejomix.com.br/index.html": "RESPOSTA ANTIGA (V1, guardada antes do corte)" },
    [VERSAO]: { "https://manejomix.com.br/index.html": "RESPOSTA NOVA (V2)" },
  };
  const deletadas = [];
  const caches = {
    keys: async () => Object.keys(bancoDeCaches),
    delete: async (nome) => { deletadas.push(nome); delete bancoDeCaches[nome]; return true; },
    open: async (nome) => ({
      addAll: async () => {},
      put: async () => {},
      match: async (req) => (bancoDeCaches[nome] || {})[typeof req === "string" ? req : req.url],
    }),
    // CacheStorage.match (sem escopo): procura em TODOS os caches, o mais antigo primeiro —
    // é exatamente o jeito que um navegador real resolveria isso.
    match: async (req) => {
      for (const nome of Object.keys(bancoDeCaches)) {
        const r = (bancoDeCaches[nome] || {})[typeof req === "string" ? req : req.url];
        if (r) return r;
      }
      return undefined;
    },
  };
  new Function("self", "caches", "location", src)(fakeSelf, caches, { origin: "https://manejomix.com.br" });
  return { handlers, caches, deletadas, bancoDeCaches };
}

let falhas = 0;
function assert(cond, msg) { console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`); if (!cond) falhas++; }

(async function main() {
  // 1) activate precisa apagar o cache antigo da Fase 1 (não só os que começam com "manejomix-v2-")
  const { handlers: h1, deletadas } = carregarSW();
  let feito;
  h1.activate({ waitUntil: (p) => { feito = p; } });
  await feito;
  assert(deletadas.includes("manejo-mix-shell-v2"), "activate() apaga o cache antigo manejo-mix-shell-v2 (site V1 aposentado)");
  assert(!deletadas.includes(VERSAO), "activate() nunca apaga o cache da própria versão atual");

  // 2) fallback offline não pode devolver a RESPOSTA ANTIGA guardada antes do corte
  const { handlers: h2 } = carregarSW();
  const req = { url: "https://manejomix.com.br/index.html", method: "GET", mode: "navigate" };
  global.fetch = () => Promise.reject(new Error("offline"));
  let resultado;
  h2.fetch({ request: req, respondWith: (p) => { resultado = p; } });
  const resposta = await resultado;
  assert(resposta === "RESPOSTA NOVA (V2)", `offline, cliente que visitou antes do corte recebe a V2 do cache (recebeu: ${JSON.stringify(resposta)})`);

  if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
  console.log("\nRESULTADO: OK — service worker aposenta o cache do V1 e nunca serve a página antiga offline.");
})();
