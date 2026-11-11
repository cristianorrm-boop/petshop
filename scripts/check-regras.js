const fs = require("fs");
const path = require("path");
const target = path.join(__dirname, "..", "regras.md");
const md = fs.readFileSync(target, "utf8");
const m = md.match(/```\nrules_version[\s\S]*?\n```/);
if (!m) throw new Error("bloco de regras não encontrado entre crases");
const rules = m[0].replace(/^```\n/, "").replace(/\n```$/, "");
const open = (rules.match(/\{/g) || []).length;
const close = (rules.match(/\}/g) || []).length;
if (open !== close) throw new Error(`chaves desbalanceadas: ${open} abrem, ${close} fecham`);
const mustHave = ["produtos", "categorias", "cupons", "configuracoes", "tiposVariacao", "acompanhamento", "vendas", "movimentos", "clientes", "pedidos", "emailsAdmin", "isAdmin"];
for (const m2 of mustHave) {
  if (!rules.includes(m2)) throw new Error(`falta referência a "${m2}" nas regras`);
}
if (rules.includes("fretes") || rules.includes("caixas") || rules.includes("/contas/")) {
  throw new Error("regras contêm coleção fora de escopo (fretes/caixas/contas)");
}
console.log(`OK: regras com ${open} chaves balanceadas, todas as 9 coleções/funções esperadas presentes, nenhuma fora de escopo`);
