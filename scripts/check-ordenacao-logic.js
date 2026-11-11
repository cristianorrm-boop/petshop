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

// Achado da revisão final (Important #1): produto reinicia a contagem de
// `ordem` dentro de cada categoria (igual script.js:83-96 do site público) —
// por isso a listagem de produtos do admin precisa agrupar por categoria
// primeiro, senão os "ordem: 1" de categorias diferentes ficam grudados.
function compararProdutos(a, b, posCat) {
  const pa = posCat[a.categoria] ?? Infinity, pb = posCat[b.categoria] ?? Infinity;
  if (pa !== pb) return pa - pb;
  return (a.ordem ?? Number(a.id) ?? 0) - (b.ordem ?? Number(b.id) ?? 0);
}

const posCatTeste = { "racao-cao": 0, "racao-gato": 1 };
const produtoCaoOrdem1 = { id: 1, nome: "Ração Z", categoria: "racao-cao", ordem: 1 };
const produtoGatoOrdem1 = { id: 2, nome: "Ração A", categoria: "racao-gato", ordem: 1 };
const listaMisturada = [produtoGatoOrdem1, produtoCaoOrdem1].sort((a, b) => compararProdutos(a, b, posCatTeste));
assert(listaMisturada[0] === produtoCaoOrdem1, "produto de categoria anterior vem primeiro, mesmo com o mesmo 'ordem' (1) que um produto de outra categoria");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — ordenação e gravação do campo ordem corretas em todos os casos.");
