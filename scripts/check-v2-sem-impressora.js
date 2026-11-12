// Prova que nenhum arquivo v2-js/*.js ainda referencia o módulo de impressora
// térmica (nunca copiado do loja-online — a cliente não tem esse equipamento)
// nem o aviso de pedido novo (A.avisoTeste, também nunca copiado).
const fs = require("fs");
const path = require("path");

const ARQUIVOS = ["admin-config.js", "admin-pdv.js", "admin.js"].map((f) => path.join(__dirname, "..", "v2-js", f));
const PROIBIDOS = ["A.impressora", "window.Admin.impressora", "A.avisoTeste", "painel-impressora", "imprimir-termica"];

let falhas = 0;
for (const arquivo of ARQUIVOS) {
  const conteudo = fs.readFileSync(arquivo, "utf8");
  for (const termo of PROIBIDOS) {
    const achou = conteudo.includes(termo);
    console.log(`${achou ? "FALHOU" : "OK"} — ${path.basename(arquivo)} não deveria conter "${termo}"`);
    if (achou) falhas++;
  }
}

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} ocorrência(s) encontrada(s).`); process.exit(1); }
console.log("\nRESULTADO: OK — nenhuma referência a impressora/aviso de pedido novo.");
