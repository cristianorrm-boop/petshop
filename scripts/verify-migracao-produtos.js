// Verifica o estado da migração in-place de `categorias` e `produtos` no
// Firestore de produção (leitura pública via REST, sem precisar de login).
// Rodar ANTES de clicar nos botões de v2-migrar-produtos-categorias.html
// (baseline) e DEPOIS (confere o resultado). Ver Task 3 do plano:
// docs/superpowers/plans/2026-11-10-migracao-v2-fase1-fundacao.md
const https = require("https");

const PROJECT_ID = "manejomix-930d1";

function fetchCollection(nome) {
  return new Promise((resolve, reject) => {
    const docs = [];
    function page(pageToken) {
      let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${nome}?pageSize=300`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
      https.get(url, (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          let json;
          try { json = JSON.parse(body); } catch (e) { return reject(new Error(`resposta inválida de ${nome}: ${e.message}`)); }
          if (json.error) return reject(new Error(`erro Firestore (${nome}): ${json.error.message}`));
          (json.documents || []).forEach((d) => docs.push(parseDoc(d)));
          if (json.nextPageToken) page(json.nextPageToken);
          else resolve(docs);
        });
      }).on("error", reject);
    }
    page(null);
  });
}

function parseValue(v) {
  if (v == null) return null;
  if ("nullValue" in v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("mapValue" in v) return parseFields(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(parseValue);
  return undefined;
}

function parseFields(fields) {
  const out = {};
  for (const k of Object.keys(fields)) out[k] = parseValue(fields[k]);
  return out;
}

function parseDoc(d) {
  const id = d.name.split("/").pop();
  return { id, ...parseFields(d.fields || {}) };
}

function hasField(obj, campo) {
  return Object.prototype.hasOwnProperty.call(obj, campo);
}

async function main() {
  const [categorias, produtos] = await Promise.all([
    fetchCollection("categorias"),
    fetchCollection("produtos"),
  ]);

  console.log("total categorias:", categorias.length);
  console.log("total produtos:", produtos.length);

  // (a) categorias: tem `pai`, preserva ordem/icone/nome, aponta quem não tem ordem
  const catSemPai = categorias.filter((c) => !hasField(c, "pai"));
  const catSemOrdem = categorias.filter((c) => !hasField(c, "ordem") || c.ordem == null);
  const catSemCamposOriginais = categorias.filter((c) => !hasField(c, "icone") || !hasField(c, "nome"));
  console.log("categorias sem campo 'pai':", catSemPai.length ? catSemPai.map((c) => c.id) : "nenhuma (ok)");
  console.log("categorias SEM 'ordem' (não deveria existir):", catSemOrdem.length ? catSemOrdem.map((c) => c.id) : "nenhuma (ok)");
  console.log("categorias que perderam icone/nome:", catSemCamposOriginais.length ? catSemCamposOriginais.map((c) => c.id) : "nenhuma (ok)");

  // (b) produtos: 7 campos novos com tipos corretos
  const camposNovos = ["estoque", "codigo", "estoqueMinimo", "ativo", "destaque", "precoAntigo", "custo"];
  const produtosSemCamposNovos = produtos.filter((p) => !camposNovos.every((c) => hasField(p, c)));
  const produtosTipoErrado = produtos.filter((p) => {
    if (!hasField(p, "estoque")) return false;
    if (typeof p.estoque !== "number") return true;
    if (p.codigo !== null && typeof p.codigo !== "string") return true;
    if (p.estoqueMinimo !== null && typeof p.estoqueMinimo !== "number") return true;
    if (typeof p.ativo !== "boolean") return true;
    if (typeof p.destaque !== "boolean") return true;
    if (p.precoAntigo !== null && typeof p.precoAntigo !== "number") return true;
    if (p.custo !== null && typeof p.custo !== "number") return true;
    return false;
  });
  console.log("produtos SEM os 7 campos novos:", produtosSemCamposNovos.length ? produtosSemCamposNovos.map((p) => p.id) : "nenhum (ok)");
  console.log("produtos com campo novo de tipo errado:", produtosTipoErrado.length ? produtosTipoErrado.map((p) => p.id) : "nenhum (ok)");

  // (c) contagem - comparado manualmente com a baseline impressa na primeira rodada
  console.log("(compare esta contagem de produtos com a rodada anterior — não pode diminuir)");

  // (d) nenhum produto perdeu campos originais essenciais. `ordem` fica de
  // fora dessa checagem: produtos de medicamentos/higiene-e-beleza/petiscos/
  // acessorios/vestuario já não tinham esse campo ANTES desta migração (gap
  // pré-existente, fora do escopo da Task 3, que só adiciona os 7 campos
  // novos) — contar isso como "perdido" mascararia uma checagem de verdade
  // com um falso-positivo que já existia. Reportado à parte, sem falhar.
  const camposOriginaisEssenciais = ["nome", "categoria", "preco", "imagem", "descricao"];
  const produtosSemCamposOriginais = produtos.filter((p) => !camposOriginaisEssenciais.every((c) => hasField(p, c) && p[c] !== null));
  console.log("produtos que perderam algum campo original essencial (nome/categoria/preco/imagem/descricao):", produtosSemCamposOriginais.length ? produtosSemCamposOriginais.map((p) => p.id) : "nenhum (ok)");

  const produtosSemOrdem = produtos.filter((p) => !hasField(p, "ordem") || p.ordem == null);
  console.log(`produtos sem 'ordem' (informativo, gap pré-existente fora de escopo): ${produtosSemOrdem.length} produto(s)${produtosSemOrdem.length ? " — ids " + produtosSemOrdem.map((p) => p.id).join(",") : ""}`);

  const tudoOk =
    catSemPai.length === 0 &&
    catSemCamposOriginais.length === 0 &&
    produtosSemCamposNovos.length === 0 &&
    produtosTipoErrado.length === 0 &&
    produtosSemCamposOriginais.length === 0;

  console.log(tudoOk ? "\nRESULTADO: OK — migração completa e consistente." : "\nRESULTADO: PENDENTE/ERRO — ver detalhes acima.");
  process.exit(tudoOk ? 0 : 1);
}

main().catch((e) => {
  console.error("Falha ao verificar:", e.message);
  process.exit(1);
});
