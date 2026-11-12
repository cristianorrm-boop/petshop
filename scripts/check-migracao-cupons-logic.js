// Prova a lógica de detecção de cupom em formato antigo (campo `valorMinimo`,
// do admin.html de hoje) que precisa ganhar o campo `minimo` (loja-online).
function precisaMigrarCupom(c) {
  return c.minimo === undefined && c.valorMinimo !== undefined;
}

let falhas = 0;
function assert(cond, msg) {
  console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`);
  if (!cond) falhas++;
}

assert(precisaMigrarCupom({ valorMinimo: 50 }) === true, "cupom antigo (valorMinimo, sem minimo) -> precisa migrar");
assert(precisaMigrarCupom({ minimo: 50 }) === false, "cupom já novo (minimo) -> não precisa migrar");
assert(precisaMigrarCupom({}) === false, "cupom sem nenhum dos dois campos -> não precisa migrar (não quebra)");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — deteccao de cupom antigo correta em todos os casos.");
