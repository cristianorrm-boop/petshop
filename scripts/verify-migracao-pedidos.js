// `pedidos` é uma coleção admin-only-read (dado sensível: nome/telefone/
// endereço do cliente) — a REST pública do Firestore devolve "Missing or
// insufficient permissions" pra ela, então (ao contrário de produtos/
// categorias) não dá pra verificar o estado ao vivo a partir daqui. A
// verificação ao vivo roda dentro de v2-migrar-pedidos.html (botão
// "Verificar migração"), autenticada no navegador.
//
// O que ESTE script prova, sem precisar de acesso: a regra de mapeamento
// atendido -> status é exatamente a que a spec pede (decisão #14), incluindo
// o caso em que `atendido` nem existe no documento (não deveria acontecer,
// mas o Firestore não garante isso).
function mapear(atendido) {
  return atendido === true ? "entregue" : "novo";
}

const casos = [
  { nome: "atendido: true", atendido: true, esperado: "entregue" },
  { nome: "atendido: false", atendido: false, esperado: "novo" },
  { nome: "atendido ausente (undefined)", atendido: undefined, esperado: "novo" },
  { nome: "atendido: null", atendido: null, esperado: "novo" },
];

let falhas = 0;
for (const c of casos) {
  const resultado = mapear(c.atendido);
  const ok = resultado === c.esperado;
  console.log(`${ok ? "OK" : "FALHOU"} — ${c.nome} -> "${resultado}" (esperado "${c.esperado}")`);
  if (!ok) falhas++;
}

if (falhas > 0) {
  console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) de mapeamento falharam.`);
  process.exit(1);
}
console.log("\nRESULTADO: OK — mapeamento atendido->status correto em todos os casos, incluindo atendido ausente.");

// Resync pré-corte (achado #6 da revisão final): o admin atual continua
// mudando `atendido` dia a dia antes da Fase 5, então a migração precisa
// recalcular `status` toda vez que rodar — mas NUNCA quando o pedido já
// avançou pra um status pós-corte (confirmado/enviado/cancelado), que só a
// tela nova de verdade deveria produzir.
function deveAtualizar(data) {
  const statusDestaMigracao = new Set(["novo", "entregue"]);
  if (Object.prototype.hasOwnProperty.call(data, "status") && !statusDestaMigracao.has(data.status)) {
    return false; // pós-corte, nunca mexer
  }
  const statusCalculado = mapear(data.atendido);
  return data.status !== statusCalculado;
}

let falhas2 = 0;
function assertResync(cond, msg) {
  console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`);
  if (!cond) falhas2++;
}

assertResync(deveAtualizar({ atendido: true }) === true, "pedido sem status, atendido:true -> deve atualizar");
assertResync(deveAtualizar({ status: "novo", atendido: true }) === true, "pedido 'novo' que virou atendido -> deve reprocessar pra 'entregue'");
assertResync(deveAtualizar({ status: "entregue", atendido: false }) === true, "pedido 'entregue' que foi desmarcado -> deve voltar pra 'novo' (reversível antes do corte)");
assertResync(deveAtualizar({ status: "novo", atendido: false }) === false, "pedido já 'novo' com atendido:false -> nada a fazer");
assertResync(deveAtualizar({ status: "confirmado", atendido: false }) === false, "pedido 'confirmado' (pós-corte) -> NUNCA mexer, mesmo que atendido mude");
assertResync(deveAtualizar({ status: "enviado", atendido: true }) === false, "pedido 'enviado' (pós-corte) -> NUNCA mexer");
assertResync(deveAtualizar({ status: "cancelado", atendido: true }) === false, "pedido 'cancelado' (pós-corte) -> NUNCA mexer");

if (falhas2 > 0) {
  console.log(`\nRESULTADO: ERRO — ${falhas2} caso(s) de resync falharam.`);
  process.exit(1);
}
console.log("RESULTADO: OK — resync pré-corte nunca toca em status pós-corte.");
