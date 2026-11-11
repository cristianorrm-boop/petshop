const fs = require("fs");
const path = require("path");
const target = path.join(__dirname, "..", "v2-firebase-config.js");
const src = fs.readFileSync(target, "utf8");

function runWith(hostname, protocol) {
  const location = { hostname, protocol };
  const window = {};
  const console = { error: () => {} };
  const run = new Function("location", "window", "console", src + "\nreturn window.firebaseConfig;");
  return run(location, window, console);
}

const casosReal = [
  { hostname: "localhost", protocol: "http:" },
  { hostname: "127.0.0.1", protocol: "http:" },
  { hostname: "", protocol: "file:" },
];
const casosBloqueados = [
  { hostname: "manejomix.com.br", protocol: "https:" },
  { hostname: "crist.github.io", protocol: "https:" },
];

let falhas = 0;
for (const c of casosReal) {
  const cfg = runWith(c.hostname, c.protocol);
  const ok = cfg.projectId === "manejomix-930d1";
  console.log(`${ok ? "OK" : "FALHOU"} — ${c.protocol}//${c.hostname} deveria usar projeto real -> projectId=${cfg.projectId}`);
  if (!ok) falhas++;
}
for (const c of casosBloqueados) {
  const cfg = runWith(c.hostname, c.protocol);
  const ok = cfg.projectId !== "manejomix-930d1";
  console.log(`${ok ? "OK" : "FALHOU"} — ${c.protocol}//${c.hostname} deveria estar BLOQUEADO -> projectId=${cfg.projectId}`);
  if (!ok) falhas++;
}

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — gate de localhost/arquivo funciona em todos os casos testados.");
