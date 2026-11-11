// Prova a lógica de ordenação/gravação do campo `ordem` (extensão própria,
// usada em produtos e categorias) antes de colar a mesma lógica dentro de
// v2-js/admin.js (Tasks 2 e 3 da Fase 2).
function compararPorOrdem(a, b) {
  return (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || a.nome.localeCompare(b.nome, "pt-BR");
}

function ordemParaGravar(valorDoInput) {
  return valorDoInput === "" ? null : parseInt(valorDoInput, 10);
}

let falhas = 0;
function assert(cond, msg) {
  console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`);
  if (!cond) falhas++;
}

const a = { nome: "Zebra", ordem: 2 };
const b = { nome: "Abacaxi", ordem: 1 };
assert(compararPorOrdem(a, b) > 0, "ordem 2 vem depois de ordem 1, mesmo com nome 'menor' alfabeticamente");

const c = { nome: "Zebra", ordem: 5 };
const d = { nome: "Abacaxi" }; // sem ordem
assert(compararPorOrdem(c, d) < 0, "produto com ordem vem antes de produto sem ordem");

const e = { nome: "Zebra" };
const f = { nome: "Abacaxi" };
assert(compararPorOrdem(e, f) > 0, "sem ordem nos dois, desempate por nome (Abacaxi antes de Zebra)");

assert(ordemParaGravar("") === null, 'ordemParaGravar("") -> null (nunca string vazia gravada)');
assert(ordemParaGravar("12") === 12 && typeof ordemParaGravar("12") === "number", 'ordemParaGravar("12") -> 12 (number)');

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — ordenação e gravação do campo ordem corretas em todos os casos.");
