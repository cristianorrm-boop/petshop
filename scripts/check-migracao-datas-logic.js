// Prova a lógica de detecção de Firestore Timestamp (precisa converter pra
// string ISO) antes de colar a mesma lógica em v2-migrar-datas.html.
function precisaConverter(valor) {
  return !!(valor && typeof valor === "object" && typeof valor.toDate === "function");
}

let falhas = 0;
function assert(cond, msg) {
  console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`);
  if (!cond) falhas++;
}

const timestampSimulado = { toDate: () => new Date("2026-01-15T14:30:00.000Z") };
assert(precisaConverter(timestampSimulado) === true, "objeto com toDate() (Firestore Timestamp) -> precisa converter");
assert(precisaConverter("2026-01-15T14:30:00.000Z") === false, "string ISO -> já está certo, não precisa converter");
assert(precisaConverter(null) === false, "null -> não quebra, não precisa converter");
assert(precisaConverter(undefined) === false, "undefined -> não quebra, não precisa converter");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — deteccao de Timestamp correta em todos os casos.");
