// Prova a lógica que calcula quais campos de configuracoes/geral ainda
// faltam preencher com a identidade visual atual do Manejo Mix (dourado/
// vinho), sem nunca sobrescrever um valor já salvo.
function camposFaltantes(atual, padroes) {
  const faltam = {};
  for (const chave of Object.keys(padroes)) {
    if (!(chave in atual)) faltam[chave] = padroes[chave];
  }
  return faltam;
}

let falhas = 0;
function assert(cond, msg) {
  console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`);
  if (!cond) falhas++;
}

const padroes = { corPrimaria: "#D4A017", corSecundaria: "#4A0E0E" };

assert(JSON.stringify(camposFaltantes({}, padroes)) === JSON.stringify(padroes), "documento vazio -> faltam todos os campos");
assert(!("corPrimaria" in camposFaltantes({ corPrimaria: "#000000" }, padroes)), "campo já salvo (mesmo com outro valor) -> não entra nos faltantes");
assert(Object.keys(camposFaltantes({ corPrimaria: "#000000", corSecundaria: "#111111" }, padroes)).length === 0, "todos os campos já salvos -> nenhum faltante");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — calculo de campos faltantes correto em todos os casos.");
