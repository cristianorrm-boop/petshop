// Prova que o cadastro de clientes recuperou os campos de bichinho de
// estimação (aniversario/pet/animais) e não depende mais de Financeiro (contas).
const fs = require("fs");
const path = require("path");

const arquivo = path.join(__dirname, "..", "v2-js", "admin-clientes.js");
const conteudo = fs.readFileSync(arquivo, "utf8");

const OBRIGATORIOS = ['name="aniversario"', 'name="pet"', 'name="animais_cachorro"', 'name="animais_gato"', 'name="animais_aves"', 'name="animais_roedores"'];
const PROIBIDOS = ["DB.contas"];

let falhas = 0;
for (const termo of OBRIGATORIOS) {
  const achou = conteudo.includes(termo);
  console.log(`${achou ? "OK" : "FALHOU"} — admin-clientes.js deveria conter "${termo}"`);
  if (!achou) falhas++;
}
for (const termo of PROIBIDOS) {
  const achou = conteudo.includes(termo);
  console.log(`${achou ? "FALHOU" : "OK"} — admin-clientes.js não deveria conter "${termo}"`);
  if (achou) falhas++;
}

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} problema(s) encontrado(s).`); process.exit(1); }
console.log("\nRESULTADO: OK — campos de bichinho presentes, sem dependência de Financeiro.");
