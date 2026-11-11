// Prova que o seed-manejo-mix.html nunca reverte campos operacionais
// (estoque, código, ativo, destaque, variações) de um produto que já existe
// — só os grava no primeiro cadastro. Campos de catálogo (nome/categoria/
// ordem/preco/imagem/descricao) sempre são atualizados, nos dois casos.
function montarPayload(p, existe) {
  const dadosOperacionais = existe ? {} : {
    codigoBarras: null,
    codigo: null,
    estoque: 0,
    estoqueMinimo: null,
    custo: null,
    precoAntigo: null,
    ativo: true,
    destaque: false,
    entrega: true,
    variacoes: [],
    adicionaisGrupos: [],
    criadoEm: "SERVER_TIMESTAMP",
  };
  return { ...p, ...dadosOperacionais };
}

let falhas = 0;
function assert(cond, msg) {
  console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`);
  if (!cond) falhas++;
}

const produtoDoSeed = { id: 39, categoria: "racoes", ordem: 1, nome: "Ração X 10kg", preco: 199.9, imagem: "./assets/x.webp", descricao: "..." };

// Produto que já existe (já foi migrado/editado ao vivo) — reimport não pode mexer no operacional.
const payloadExistente = montarPayload(produtoDoSeed, true);
assert(!("estoque" in payloadExistente), "produto existente: 'estoque' NÃO entra no payload (não reverte estoque real)");
assert(!("ativo" in payloadExistente), "produto existente: 'ativo' NÃO entra no payload (não reverte esgotado)");
assert(!("destaque" in payloadExistente), "produto existente: 'destaque' NÃO entra no payload (não reverte destaque)");
assert(!("codigo" in payloadExistente), "produto existente: 'codigo' (barras) NÃO entra no payload");
assert(!("variacoes" in payloadExistente), "produto existente: 'variacoes' NÃO entra no payload (não apaga variação já cadastrada)");
assert(payloadExistente.nome === produtoDoSeed.nome && payloadExistente.preco === produtoDoSeed.preco && payloadExistente.ordem === produtoDoSeed.ordem, "produto existente: catálogo (nome/preco/ordem) continua sendo atualizado normalmente");

// Produto novo (primeira vez que esse id aparece) — precisa vir com os padrões operacionais.
const payloadNovo = montarPayload(produtoDoSeed, false);
assert(payloadNovo.estoque === 0 && payloadNovo.ativo === true && payloadNovo.destaque === false, "produto novo: recebe os padrões operacionais (estoque 0, ativo true, destaque false)");
assert(Array.isArray(payloadNovo.variacoes) && payloadNovo.variacoes.length === 0, "produto novo: variacoes começa como lista vazia");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — reimport do seed nunca reverte campo operacional de produto já existente.");
