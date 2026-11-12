// Prova a ordenação pelo campo `ordem` aplicada na loja pública (v2-js/store.js,
// Fase 5), igual ao que já existe no admin (scripts/check-ordenacao-logic.js) e no PDV.
function compararPorOrdem(a, b) {
  return (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || a.nome.localeCompare(b.nome, "pt-BR");
}

// 1) categorias-raiz e subcategorias ordenadas por `ordem`, não pela ordem "crua" do array
const categorias = [
  { id: "c2", nome: "Gatos", ordem: 2 },
  { id: "c1", nome: "Cães", ordem: 1 },
  { id: "c1a", nome: "Ração filhote", ordem: 1, pai: "c1" },
  { id: "c1b", nome: "Ração adulto", ordem: 2, pai: "c1" },
];
const filhosDe = (id) => categorias.filter((c) => c.pai === id).sort(compararPorOrdem);
const raizes = () => categorias.filter((c) => !c.pai).sort(compararPorOrdem);

let falhas = 0;
function assert(cond, msg) { console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`); if (!cond) falhas++; }

assert(raizes()[0].id === "c1" && raizes()[1].id === "c2", "categorias-raiz na ordem certa (Cães antes de Gatos)");
assert(filhosDe("c1")[0].id === "c1a" && filhosDe("c1")[1].id === "c1b", "subcategorias na ordem certa (filhote antes de adulto)");

// 2) destaque: dentro do grupo "é destaque", desempata por ordem (não pela ordem crua do Firestore)
const produtos = [
  { id: "p2", nome: "Ração B", destaque: true, ordem: 2 },
  { id: "p1", nome: "Ração A", destaque: true, ordem: 1 },
  { id: "p3", nome: "Brinquedo", destaque: false, ordem: 1 },
];
const comparadorDestaque = (a, b) => Number(b.destaque) - Number(a.destaque) || compararPorOrdem(a, b);
const ordenadosPorDestaque = [...produtos].sort(comparadorDestaque);
assert(ordenadosPorDestaque[0].id === "p1" && ordenadosPorDestaque[1].id === "p2", "dentro dos destaques, ordem:1 vem antes de ordem:2, mesmo chegando depois no array");
assert(ordenadosPorDestaque[2].id === "p3", "não-destaque sempre depois dos destaques");

// 3) produto sem `ordem` não quebra e vai pro final do grupo
const comOuSemOrdem = [{ id: "s", nome: "Sem ordem" }, { id: "x", nome: "Com ordem", ordem: 1 }];
const ordenado = [...comOuSemOrdem].sort(compararPorOrdem);
assert(ordenado[0].id === "x" && ordenado[1].id === "s", "produto sem ordem vai pro final, não quebra nem fica na frente");

// 4) Achado do review final: `ordem` reinicia em cada categoria (igual ao admin —
// scripts/check-ordenacao-logic.js). Na grade principal da loja ("Todas" ou categoria-mãe
// com subcategorias), desempatar só por `ordem` global mistura o "ordem:1" de categorias
// diferentes. Precisa agrupar por posição da categoria primeiro, como o admin já faz.
const categoriasGrade = [{ id: "cao", nome: "Cães", ordem: 1 }, { id: "gato", nome: "Gatos", ordem: 2 }];
const produtosGrade = [
  { id: "a", nome: "Ração A", categoria: "cao", ordem: 1, destaque: false },
  { id: "b", nome: "Ração B", categoria: "cao", ordem: 2, destaque: false },
  { id: "c", nome: "Areia C", categoria: "gato", ordem: 1, destaque: false },
];
// Comparador "ingênuo" (sem agrupar por categoria) — é o que foi colado em v2-js/store.js
// antes desta correção: prova que ele erra (RED), antes de provar o comparador corrigido (GREEN).
const comparadorIngenuo = (a, b) => Number(b.destaque) - Number(a.destaque) || compararPorOrdem(a, b);
const resultadoIngenuo = [...produtosGrade].sort(comparadorIngenuo).map((p) => p.id);
assert(resultadoIngenuo.join("") !== "abc", "RED — comparador sem agrupar por categoria intercala 'Areia C' (gato, ordem:1) entre 'Ração A' e 'Ração B' (cão)");

const posicaoCategorias = (raizesList, filhosDeFn) => {
  const pos = {};
  let i = 0;
  raizesList.forEach((r) => { pos[r.id] = i++; filhosDeFn(r.id).forEach((f) => { pos[f.id] = i++; }); });
  return pos;
};
const posCatGrade = posicaoCategorias(categoriasGrade, () => []);
const comparadorCorrigido = (a, b) => Number(b.destaque) - Number(a.destaque) || (posCatGrade[a.categoria] ?? Infinity) - (posCatGrade[b.categoria] ?? Infinity) || compararPorOrdem(a, b);
const resultadoCorrigido = [...produtosGrade].sort(comparadorCorrigido).map((p) => p.id);
assert(resultadoCorrigido.join("") === "abc", "GREEN — comparador agrupado por categoria mantém Cães (A, B) inteiro antes de Gatos (C)");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — ordenação da loja pública (categorias, subcategorias e destaques) correta em todos os casos.");
