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
