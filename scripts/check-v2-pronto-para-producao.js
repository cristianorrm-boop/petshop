const fs = require("fs");
const path = require("path");

let falhas = 0;
function assert(cond, msg) { console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`); if (!cond) falhas++; }

// 1) v2-firebase-config.js: sem trava — qualquer origem usa o projeto real
const cfgSrc = fs.readFileSync(path.join(__dirname, "..", "v2-firebase-config.js"), "utf8");
function cfgCom(hostname, protocol) {
  const location = { hostname, protocol };
  const window = {};
  new Function("location", "window", "console", cfgSrc)(location, window, { error: () => {} });
  return window.firebaseConfig;
}
for (const c of [{ hostname: "manejomix.com.br", protocol: "https:" }, { hostname: "localhost", protocol: "http:" }]) {
  assert(cfgCom(c.hostname, c.protocol).projectId === "manejomix-930d1", `${c.hostname} usa o projeto real (sem trava)`);
}

// 2) pwa.js: escopo "./" (não mais "./v2-")
const pwaSrc = fs.readFileSync(path.join(__dirname, "..", "v2-js", "pwa.js"), "utf8");
const registro = pwaSrc.match(/\.register\([^)]*\)/)[0];
assert(registro.includes('scope: "./"'), 'pwa.js registra o service worker com escopo "./" (controla o site todo)');
assert(!registro.includes('"./v2-"'), 'o register() não usa mais o escopo restrito da fase de testes (comentário pode mencionar o valor antigo)');

// 3) manifests com a identidade do Manejo Mix, não a genérica do loja-online
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "v2-manifest.webmanifest"), "utf8"));
const manifestAdmin = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "v2-manifest-admin.webmanifest"), "utf8"));
assert(manifest.name.includes("Manejo Mix") && manifest.theme_color.toLowerCase() === "#d4a017", "manifest da loja usa nome e cor do Manejo Mix");
assert(manifestAdmin.name.includes("Manejo Mix") && manifestAdmin.theme_color.toLowerCase() === "#d4a017", "manifest do admin usa nome e cor do Manejo Mix");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — v2 pronto para produção (sem trava, escopo correto, identidade certa).");
