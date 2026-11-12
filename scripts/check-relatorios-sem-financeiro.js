// Prova que Relatórios não depende mais da coleção `contas` (Financeiro,
// fora de escopo desta rodada do Manejo Mix).
const fs = require("fs");
const path = require("path");

const arquivo = path.join(__dirname, "..", "v2-js", "admin-relatorios.js");
const conteudo = fs.readFileSync(arquivo, "utf8");
const PROIBIDOS = ["DB.contas", "rel-escopo", "despesasCat", "projReceber", "abertoPagar"];

let falhas = 0;
for (const termo of PROIBIDOS) {
  const achou = conteudo.includes(termo);
  console.log(`${achou ? "FALHOU" : "OK"} — admin-relatorios.js não deveria conter "${termo}"`);
  if (achou) falhas++;
}

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} ocorrência(s) encontrada(s).`); process.exit(1); }
console.log("\nRESULTADO: OK — relatorios sem dependencia de Financeiro.");
