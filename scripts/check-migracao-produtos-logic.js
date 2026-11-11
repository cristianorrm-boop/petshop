// Prova, sem precisar do banco real, que a correção do Critical #1 (revisão
// final) funciona: nenhum campo que já existe no documento entra no payload
// do .update(), mesmo que o valor existente seja "falsy" (false, 0, null).
function calcularFaltando(data) {
  const padroes = {
    estoque: 0,
    codigo: Object.prototype.hasOwnProperty.call(data, "codigoBarras") ? data.codigoBarras : null,
    estoqueMinimo: null,
    ativo: true,
    destaque: false,
    precoAntigo: null,
    custo: null,
  };
  const faltando = {};
  for (const [campo, valor] of Object.entries(padroes)) {
    if (!Object.prototype.hasOwnProperty.call(data, campo)) faltando[campo] = valor;
  }
  return faltando;
}

let falhas = 0;
function assert(cond, msg) {
  console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`);
  if (!cond) falhas++;
}

// Caso 1 (o bug real encontrado pela revisão): produto já tem ativo:false
// (esgotado) e destaque:true, mas ainda não tem estoque/codigo/etc.
const produtoEsgotadoEDestaque = { nome: "x", ativo: false, destaque: true };
const r1 = calcularFaltando(produtoEsgotadoEDestaque);
assert(!("ativo" in r1), "produto com ativo:false (esgotado) NÃO entra no update — não reverte pra 'à venda'");
assert(!("destaque" in r1), "produto com destaque:true NÃO entra no update — não perde o destaque");
assert(r1.estoque === 0 && r1.codigo === null, "campos realmente ausentes (estoque/codigo) ainda são adicionados com o padrão");

// Caso 2: produto totalmente novo, sem nenhum dos 7 campos.
const produtoNovo = { nome: "y" };
const r2 = calcularFaltando(produtoNovo);
assert(Object.keys(r2).length === 7, "produto sem nenhum campo novo recebe todos os 7 padrões");

// Caso 3: produto já tem codigoBarras preenchido (leitor de código já usado) — `codigo` deve copiar o valor, não ficar null.
const produtoComBarras = { nome: "z", codigoBarras: "7891234567890" };
const r3 = calcularFaltando(produtoComBarras);
assert(r3.codigo === "7891234567890", "codigoBarras existente é copiado pro campo `codigo` novo, não descartado");

// Caso 3b (Review Focus #1, explícito): campo totalmente estranho/não
// documentado (ex.: algo que a cliente plantou direto no Firestore Console,
// fora de qualquer seed ou admin) sobrevive — o .update() só manda os 7
// campos calculados, nunca manda o documento inteiro de volta.
const produtoComCampoEstranho = { nome: "k", campoMisterioso: "nao mexe nisso" };
const r3b = calcularFaltando(produtoComCampoEstranho);
assert(!("campoMisterioso" in r3b), "o payload do .update() nunca inclui campos que não são um dos 7 novos — campo estranho nem aparece, nem seria apagado");

// Caso 4 (idempotência real): produto já migrado por completo não gera payload nenhum.
const produtoJaMigrado = { nome: "w", estoque: 5, codigo: "123", estoqueMinimo: 2, ativo: true, destaque: false, precoAntigo: null, custo: 10 };
const r4 = calcularFaltando(produtoJaMigrado);
assert(Object.keys(r4).length === 0, "produto já com os 7 campos não gera nenhum campo a atualizar (update({}) nunca é chamado)");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — a migração de produtos nunca sobrescreve campo já existente, em nenhum dos 4 casos testados.");
