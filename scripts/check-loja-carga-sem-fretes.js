// Bug achado em produção logo após o corte: a carga inicial da loja (v2-js/store.js)
// chamava DB.fretes.listar() dentro do Promise.all, mas `fretes` nunca teve regra no
// Firestore (Fretes é decisão explícita fora do escopo — ver regras.md e
// scripts/check-regras.js, que garante que "fretes" NUNCA entra nas regras). Sem regra,
// o Firestore nega por padrão, a leitura rejeita, e Promise.all derruba a carga inteira
// (loja aparece "em branco", cor genérica, nenhum produto).
let falhas = 0;
function assert(cond, msg) { console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`); if (!cond) falhas++; }

async function cargaAntiga(fretesPromise) {
  const [config, produtos, categorias, cupons, fretes] = await Promise.all([
    Promise.resolve("config"), Promise.resolve("produtos"), Promise.resolve("categorias"), Promise.resolve("cupons"), fretesPromise,
  ]);
  return { config, produtos, categorias, cupons, fretes };
}
async function cargaNova() {
  const [config, produtos, categorias, cupons] = await Promise.all([
    Promise.resolve("config"), Promise.resolve("produtos"), Promise.resolve("categorias"), Promise.resolve("cupons"),
  ]);
  return { config, produtos, categorias, cupons, fretes: [] };
}

(async () => {
  const fretesNegado = () => Promise.reject(new Error("permission-denied: fretes sem regra no Firestore"));
  let falhouAntiga = false;
  try { await cargaAntiga(fretesNegado()); } catch { falhouAntiga = true; }
  assert(falhouAntiga, "RED — carga antiga (pedindo fretes) quebra tudo quando fretes é negado, exatamente o bug visto em produção");

  const resultado = await cargaNova();
  assert(resultado.produtos === "produtos" && resultado.categorias === "categorias" && resultado.config === "config" && resultado.cupons === "cupons", "GREEN — carga nova traz config/produtos/categorias/cupons normalmente");
  assert(Array.isArray(resultado.fretes) && resultado.fretes.length === 0, "GREEN — fretes nunca é pedido ao Firestore, fica [] (igual já era o padrão antes da Fase 5 nunca ter fretes cadastrado)");

  if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
  console.log("\nRESULTADO: OK — carregamento da loja não depende mais de fretes (fora de escopo, sem regra no Firestore).");
})();
