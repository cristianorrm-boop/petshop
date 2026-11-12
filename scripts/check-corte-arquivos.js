const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

let falhas = 0;
function assert(cond, msg) { console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`); if (!cond) falhas++; }

const le = (f) => fs.readFileSync(path.join(root, f), "utf8");

assert(fs.existsSync(path.join(root, "index-v1-backup.html")), "backup do index.html antigo existe");
assert(fs.existsSync(path.join(root, "admin-v1-backup.html")), "backup do admin.html antigo existe");
assert(le("index.html") === le("v2-index.html"), "index.html tem exatamente o conteúdo de v2-index.html");
assert(le("admin.html") === le("v2-admin.html"), "admin.html tem exatamente o conteúdo de v2-admin.html");
assert(le("index-v1-backup.html").includes("script.js"), "backup preserva o index.html antigo (ainda referencia script.js)");
assert(le("admin-v1-backup.html").includes("sw-admin.js"), "backup preserva o admin.html antigo (ainda referencia sw-admin.js)");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — index.html/admin.html agora são a V2, com backup do antigo preservado.");
