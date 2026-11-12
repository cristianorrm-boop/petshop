// Prova a lógica pura por trás dos fixes do review final da Fase 4
// (ver .superpowers/sdd/2026-11-11-migracao-v2-fase4-.../progress.md,
// achados C1, C2, I1, I2, I3, I4). Cada função aqui tem a mesma
// implementação colada no arquivo de produção correspondente.

// C1 — admin.js mudarStatus(): não mexe em estoque se o status não mudou
// (pedido legado "entregue" não pode perder estoque só por ser resalvo).
function precisaMudarEstoque(statusAtual, statusNovo) {
  return statusAtual !== statusNovo;
}

// C2 — db.js gravarEstoque(): item sem produto correspondente (id null/
// vazio) é ignorado, não tenta gravar num documento inexistente.
function idValido(id) {
  return !!id;
}

// I1 — admin-pdv.js cancelarVenda(): só devolve estoque de vendas que o
// próprio V2 debitou ao vender (origem "pdv" gravado por finalizar()).
// Vendas legadas (sem esse campo, migradas do admin.html antigo) nunca
// debitaram estoque no V2, então cancelar não deve devolver nada.
function vendaDebitouEstoqueNoV2(v) {
  return v.origem === "pdv";
}

// I2 — admin-relatorios.js preparar(): uma venda espelhada de um pedido
// online antigo (campo pedidoOrigem, admin.html:1228) já é contada via o
// próprio pedido — contar os dois é dobrar a receita.
function ehVendaEspelhoDePedido(v) {
  return !!v.pedidoOrigem;
}
// Pedido antigo guarda a forma de pagamento em cliente.pagamento (script.js),
// não em pagamento (campo só do pedido novo do loja-online).
function pagamentoDoPedido(o) {
  return o.pagamento ?? o.cliente?.pagamento ?? "";
}
// Pedido antigo nunca gravou `codigo` (script.js não tem esse campo) — cai
// pro id do documento em vez de "#undefined".
function refDoPedido(o) {
  return "#" + (o.codigo || o.id || "?");
}

// I3 — cupons: lê minimo com fallback pro campo antigo valorMinimo, pra não
// depender de quando a ferramenta de migração rodou.
function minimoDoCupom(c) {
  return c.minimo ?? c.valorMinimo ?? 0;
}

// I4 — v2-migrar-itens.html: distingue item nunca processado (precisa
// rodar a migração) de item processado sem correspondência (id: null —
// rodar de novo não resolve, precisa de ação manual).
function precisaProcessarItens(itens) {
  return (itens || []).some((i) => !("id" in i));
}
function itensSemCorrespondencia(itens) {
  return (itens || []).filter((i) => i.id === null).map((i) => i.nome);
}

let falhas = 0;
function assert(cond, msg) {
  console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`);
  if (!cond) falhas++;
}

// C1
assert(precisaMudarEstoque("entregue", "entregue") === false, "C1: resalvar o mesmo status -> não precisa mudar estoque");
assert(precisaMudarEstoque("novo", "confirmado") === true, "C1: status realmente mudou -> precisa mudar estoque");

// C2
assert(idValido(null) === false, "C2: id null -> inválido, não tenta ajustar");
assert(idValido("") === false, "C2: id vazio -> inválido");
assert(idValido("p1") === true, "C2: id normal -> válido");

// I1
assert(vendaDebitouEstoqueNoV2({ origem: "pdv" }) === true, "I1: venda nova do V2 (origem pdv) -> debitou estoque, pode devolver ao cancelar");
assert(vendaDebitouEstoqueNoV2({}) === false, "I1: venda legada (sem origem) -> não debitou no V2, não devolve ao cancelar");

// I2
assert(ehVendaEspelhoDePedido({ pedidoOrigem: { pedidoId: "x" } }) === true, "I2: venda espelho de pedido online -> já contada via o pedido");
assert(ehVendaEspelhoDePedido({}) === false, "I2: venda normal do PDV -> conta normalmente");
assert(pagamentoDoPedido({ pagamento: "PIX" }) === "PIX", "I2: pedido novo usa o campo pagamento direto");
assert(pagamentoDoPedido({ cliente: { pagamento: "Dinheiro" } }) === "Dinheiro", "I2: pedido antigo cai pro cliente.pagamento");
assert(refDoPedido({ codigo: "ABC123" }) === "#ABC123", "I2: pedido novo usa o codigo");
assert(refDoPedido({ id: "xyz" }) === "#xyz", "I2: pedido antigo sem codigo cai pro id do documento");

// I3
assert(minimoDoCupom({ minimo: 50 }) === 50, "I3: cupom já migrado usa minimo direto");
assert(minimoDoCupom({ valorMinimo: 30 }) === 30, "I3: cupom ainda não migrado cai pro valorMinimo (não depende de quando a ferramenta rodou)");
assert(minimoDoCupom({}) === 0, "I3: cupom sem nenhum dos dois -> 0, não quebra");

// I4
assert(precisaProcessarItens([{ nome: "x" }]) === true, "I4: item nunca processado (sem a chave id) -> precisa migrar");
assert(precisaProcessarItens([{ id: null, nome: "x" }]) === false, "I4: item já processado sem correspondência -> não fica preso em PENDENTE pra sempre");
assert(precisaProcessarItens([{ id: "p1" }]) === false, "I4: item já com produto correspondente -> não precisa migrar");
assert(itensSemCorrespondencia([{ id: null, nome: "Produto Antigo" }, { id: "p1", nome: "Ok" }]).length === 1, "I4: lista só os itens sem correspondência, pelo nome, pra ação manual");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — todos os fixes do review final provados.");
