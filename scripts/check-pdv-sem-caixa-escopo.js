// Prova que o PDV não depende mais de caixa (abrir/fechar) nem do pagamento
// "A prazo" (grava conta a receber — Financeiro, fora de escopo desta fase).
const fs = require("fs");
const path = require("path");

const arquivo = path.join(__dirname, "..", "v2-js", "admin-pdv.js");
const conteudo = fs.readFileSync(arquivo, "utf8");
const PROIBIDOS = ["A prazo", "DB.caixas", "Caixa fechado", "parcelasLista", 'DB.fs.collection("contas")'];

let falhas = 0;
for (const termo of PROIBIDOS) {
  const achou = conteudo.includes(termo);
  console.log(`${achou ? "FALHOU" : "OK"} — admin-pdv.js não deveria conter "${termo}"`);
  if (achou) falhas++;
}

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} ocorrência(s) encontrada(s).`); process.exit(1); }
console.log("\nRESULTADO: OK — PDV sem caixa e sem pagamento a prazo.");
