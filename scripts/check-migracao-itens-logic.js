// Prova a lógica que casa um item antigo de pedido/venda (formato de antes
// da migração: {nome, preco, qtd, variacao?}, sem id/vid) com o produto
// atual de mesmo nome, para que DB.produtos.ajustarEstoque(i.id, ...)
// funcione quando o status do pedido avançar pela tela nova.
function casarItem(item, produtos) {
  if (item.id) return { ...item, vid: item.vid || "" };
  const alvo = String(item.nome || "").trim().toLowerCase();
  const produto = produtos.find((p) => String(p.nome || "").trim().toLowerCase() === alvo);
  return { ...item, id: produto ? produto.id : null, vid: "" };
}

let falhas = 0;
function assert(cond, msg) {
  console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`);
  if (!cond) falhas++;
}

const produtos = [{ id: "p1", nome: "Ração Golden 15kg" }, { id: "p2", nome: "Areia Sanitária" }];

const jaTemId = casarItem({ id: "p9", nome: "Qualquer", qtd: 1 }, produtos);
assert(jaTemId.id === "p9" && jaTemId.vid === "", "item que já tem id -> devolve sem alterar o id (idempotente), garante vid");

const casaPorNome = casarItem({ nome: "Ração Golden 15kg", preco: 10, qtd: 1 }, produtos);
assert(casaPorNome.id === "p1" && casaPorNome.vid === "", "nome igual a um produto atual -> ganha o id dele");

const semCorrespondencia = casarItem({ nome: "Produto Descontinuado", preco: 10, qtd: 1 }, produtos);
assert(semCorrespondencia.id === null && semCorrespondencia.vid === "", "nome sem correspondência -> id null, não quebra");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — casamento de item por nome correto em todos os casos.");
