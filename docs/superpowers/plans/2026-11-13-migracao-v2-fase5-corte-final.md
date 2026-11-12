# Fase 5 (parte 2) — Corte final: V2 vira o site de verdade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar, no repositório local, tudo que falta pra V2 deixar de ser "modo de teste" e virar o site de verdade (loja + admin) — removendo as travas de segurança da Fase 1, trocando o conteúdo de `index.html`/`admin.html` pelas versões V2, e deixando pronto o que a usuária precisa publicar manualmente (upload no Hostinger, regras definitivas do Firestore).

**Architecture:** Duas tasks de código, pequenas e independentes, seguidas de uma seção operacional (não é código, é checklist pra usuária executar fora deste repositório — upload de arquivo e publicação de regra no Console — com pontos de confirmação explícitos antes de cada ação que afeta o site/banco de verdade).

**Tech Stack:** JS puro, PWA (service worker/manifest), Firestore. Scripts Node standalone em `scripts/` pra provar lógica antes de colar no navegador — mesmo padrão das fases anteriores.

**Spec:** `docs/superpowers/specs/2026-11-10-migracao-manejo-mix-v2-design.md` — decisão #10 (regras definitivas) e #12 (corte cuidadoso, sem decidir a janela sozinho). `regras.md` (regras definitivas já escritas na Fase 1, não publicadas ainda). Achados técnicos desta sessão (travas da Fase 1 que precisam sair: `v2-firebase-config.js` `USAR_PROJETO_REAL`, `v2-js/pwa.js` escopo `"./v2-"` do service worker — ambas comentadas no próprio código como "trava temporária, tirar no corte final").

## Global Constraints

- Nenhum arquivo do site/admin **antigo** (`index.html`, `admin.html`, `script.js`, `style.css`, `sw.js`, `sw-admin.js`, `manifest.json`, `manifest-admin.json`, `firebase-config.js`) pode ser apagado — só deixa de ser referenciado. Backup renomeado, nunca `rm`.
- As regras **definitivas** (`regras.md`) só podem ser publicadas **depois** que os arquivos novos estiverem no ar — `admin.html` antigo lê/escreve `tiposVariacao` diretamente (confirmado: `admin.html:1351,1455,1458,1491`), e a regra definitiva bloqueia essa coleção (`allow read, write: if false`); publicar antes do arquivo novo quebra o admin antigo ainda em uso.
- As regras **já publicadas hoje** (aditivo de `movimentos`+`acompanhamento`, feito nesta sessão) continuam permissivas o bastante (`pedidos: allow create: if true`, sem validar formato) pra V2 funcionar de ponta a ponta mesmo antes das regras definitivas — não há dependência de ordem entre "subir os arquivos" e "publicar regras definitivas" além da acima.
- Upload pro Hostinger e publicação das regras definitivas são ações **fora deste repositório**, manuais, feitas pela usuária — este plano só prepara o que entra nesses dois passos; nenhuma delas acontece sem confirmação explícita dela no momento.

## Review Focus

- Service worker antigo (`sw.js`, escopo `/`, já registrado no navegador de clientes que já visitaram o site) continua ativo depois da troca de conteúdo de `index.html` — precisa ceder o controle pro `v2-sw.js` sem exigir nenhuma ação manual do cliente (sem isso, visitante que já tem o PWA instalado pode ficar travado numa versão velha).
- `v2-manifest.webmanifest`/`v2-manifest-admin.webmanifest` ainda têm `name`/`theme_color` genéricos do `loja-online` ("Loja Online", roxo `#4f46e5`) — se for pro ar assim, o app instalado no celular da cliente mostra marca errada.
- Ferramenta de migração rodada **antes** do corte não cobre pedido/venda gravado pelo sistema **antigo** entre aquele momento e o corte de verdade — precisa rodar de novo bem perto da hora de subir os arquivos.
- `v2-firebase-config.js` tirando a trava precisa continuar funcionando igual em localhost/arquivo local (usado pelas ferramentas de migração) — não pode virar "sempre bloqueado" por engano.
- Rollback: se algo no Hostinger der errado depois do upload, a usuária precisa conseguir voltar pro `index.html`/`admin.html` antigo rapidamente — por isso backup nomeado, não deletado.

---

### Task 1: V2 sai do "modo de teste" (trava de produção, escopo do service worker, identidade visual do app)

**Files:**
- Modify: `v2-firebase-config.js` (remove gate `USAR_PROJETO_REAL`)
- Modify: `v2-js/pwa.js:7` (escopo do `register()`)
- Modify: `v2-manifest.webmanifest`, `v2-manifest-admin.webmanifest` (name/short_name/theme_color)
- Create: `scripts/check-v2-pronto-para-producao.js`

**Interfaces:**
- Consumes: nenhuma interface de outra task.
- Produces: nenhuma consumida por outra task desta fase (Task 2 só depende do conteúdo de `v2-index.html`/`v2-admin.html`, que esta task não toca).

- [ ] **Step 1: Escrever o teste (`scripts/check-v2-pronto-para-producao.js`)**

```js
const fs = require("fs");
const path = require("path");

let falhas = 0;
function assert(cond, msg) { console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`); if (!cond) falhas++; }

// 1) v2-firebase-config.js: sem trava — qualquer origem usa o projeto real
const cfgSrc = fs.readFileSync(path.join(__dirname, "..", "v2-firebase-config.js"), "utf8");
function cfgCom(hostname, protocol) {
  const location = { hostname, protocol };
  const window = {};
  new Function("location", "window", "console", cfgSrc)(location, window, { error: () => {} });
  return window.firebaseConfig;
}
for (const c of [{ hostname: "manejomix.com.br", protocol: "https:" }, { hostname: "localhost", protocol: "http:" }]) {
  assert(cfgCom(c.hostname, c.protocol).projectId === "manejomix-930d1", `${c.hostname} usa o projeto real (sem trava)`);
}

// 2) pwa.js: escopo "./" (não mais "./v2-")
const pwaSrc = fs.readFileSync(path.join(__dirname, "..", "v2-js", "pwa.js"), "utf8");
assert(pwaSrc.includes('scope: "./"'), 'pwa.js registra o service worker com escopo "./" (controla o site todo)');
assert(!pwaSrc.includes('"./v2-"'), 'pwa.js não tem mais o escopo restrito da fase de testes');

// 3) manifests com a identidade do Manejo Mix, não a genérica do loja-online
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "v2-manifest.webmanifest"), "utf8"));
const manifestAdmin = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "v2-manifest-admin.webmanifest"), "utf8"));
assert(manifest.name.includes("Manejo Mix") && manifest.theme_color.toLowerCase() === "#d4a017", "manifest da loja usa nome e cor do Manejo Mix");
assert(manifestAdmin.name.includes("Manejo Mix") && manifestAdmin.theme_color.toLowerCase() === "#d4a017", "manifest do admin usa nome e cor do Manejo Mix");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — v2 pronto para produção (sem trava, escopo correto, identidade certa).");
```

- [ ] **Step 2: Rodar o teste**

Run: `node scripts/check-v2-pronto-para-producao.js`
Expected: FAIL (`v2-firebase-config.js` ainda tem a trava; `pwa.js` ainda usa `"./v2-"`; manifests ainda genéricos) — confirma que as mudanças ainda não existem.

- [ ] **Step 3: Remover a trava e ajustar escopo/identidade**

Em `v2-firebase-config.js`: remover a constante `USAR_PROJETO_REAL`, o bloco `if (!USAR_PROJETO_REAL) { console.error(...) }`, e o operador ternário — `firebaseConfig` passa a ser direto o objeto com os valores reais (o mesmo que já está no branch `USAR_PROJETO_REAL ? {...} : {...}` de hoje). Atualizar o comentário do topo do arquivo pra não falar mais de "TRAVA DA FASE 1" (explicar que a trava foi removida no corte final, já que agora os arquivos `v2-*` são o site de verdade).

Em `v2-js/pwa.js:7`: trocar `{ scope: "./v2-" }` por `{ scope: "./" }`. Atualizar o comentário das linhas 4-6 (não precisa mais explicar a proteção contra colidir com `sw.js`/`sw-admin.js` antigos — a Task 2 vai aposentar essas referências).

Em `v2-manifest.webmanifest` e `v2-manifest-admin.webmanifest`: trocar `"name"` para `"Manejo Mix Pet Shop"` (loja) e `"Manejo Mix — Administração"` (admin), `"short_name"` para `"Manejo Mix"`, `"theme_color"` para `"#D4A017"` (dourado, mesma cor que já está em `v2-seed-config.html`/`PADROES_MANEJO_MIX`).

- [ ] **Step 4: Rodar o teste de novo**

Run: `node scripts/check-v2-pronto-para-producao.js`
Expected: `RESULTADO: OK`

- [ ] **Step 5: Verificar sintaxe dos arquivos tocados**

Run: `node --check v2-js/pwa.js`
Expected: sem saída (sintaxe OK) — `v2-firebase-config.js` e os `.webmanifest` não são JS executável de função solta com `node --check` da mesma forma (o `.webmanifest` é JSON puro, já validado pelo `JSON.parse` do Step 4; `v2-firebase-config.js` já foi exercitado pelo próprio teste via `new Function`).

- [ ] **Step 6: Commit**

```bash
git add v2-firebase-config.js v2-js/pwa.js v2-manifest.webmanifest v2-manifest-admin.webmanifest scripts/check-v2-pronto-para-producao.js
git commit -m "Fase 5 (corte): remove trava de producao do v2, amplia escopo do SW e personaliza identidade do app instalavel"
```

---

### Task 2: `index.html`/`admin.html` passam a ser a V2 (com backup do antigo)

**Files:**
- Create: `index-v1-backup.html` (cópia do `index.html` atual, antes da troca)
- Create: `admin-v1-backup.html` (cópia do `admin.html` atual, antes da troca)
- Modify: `index.html` (conteúdo substituído pelo de `v2-index.html`)
- Modify: `admin.html` (conteúdo substituído pelo de `v2-admin.html`)
- Create: `scripts/check-corte-arquivos.js`

**Interfaces:**
- Consumes: nenhuma (independe da Task 1 no código — mas só faz sentido rodar depois, já que o conteúdo copiado de `v2-index.html`/`v2-admin.html` já reflete as correções da Task 1 em `v2-firebase-config.js`/`v2-js/pwa.js`, que esses arquivos carregam por referência).
- Produces: nenhuma consumida por outra task desta fase.

- [ ] **Step 1: Escrever o teste (`scripts/check-corte-arquivos.js`)**

```js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

let falhas = 0;
function assert(cond, msg) { console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`); if (!cond) falhas++; }

const le = (f) => fs.readFileSync(path.join(root, f), "utf8");

assert(fs.existsSync(path.join(root, "index-v1-backup.html")), "backup do index.html antigo existe");
assert(fs.existsSync(path.join(root, "admin-v1-backup.html")), "backup do admin.html antigo existe");
assert(le("index.html") === le("v2-index.html"), "index.html tem exatamente o conteúdo de v2-index.html");
assert(le("admin.html") === le("v2-admin.html"), "admin.html tem exatamente o conteúdo de v2-admin.html");
assert(le("index-v1-backup.html").includes("script.js"), "backup preserva o index.html antigo (ainda referencia script.js)");
assert(le("admin-v1-backup.html").includes("sw-admin.js"), "backup preserva o admin.html antigo (ainda referencia sw-admin.js)");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — index.html/admin.html agora são a V2, com backup do antigo preservado.");
```

- [ ] **Step 2: Rodar o teste**

Run: `node scripts/check-corte-arquivos.js`
Expected: FAIL (backups ainda não existem; `index.html`/`admin.html` ainda são os antigos)

- [ ] **Step 3: Fazer o backup e a troca**

```bash
cp index.html index-v1-backup.html
cp admin.html admin-v1-backup.html
cp v2-index.html index.html
cp v2-admin.html admin.html
```

`v2-index.html`/`v2-admin.html` continuam existindo (sem mudança) — `v2-js/*`, `v2-css/*`, `v2-icons/*`, `v2-firebase-config.js`, `v2-acompanhar.html`, `v2-manifest*.webmanifest`, `v2-sw.js` são referenciados por caminho relativo e não precisam de nenhuma alteração de nome.

- [ ] **Step 4: Rodar o teste de novo**

Run: `node scripts/check-corte-arquivos.js`
Expected: `RESULTADO: OK`

- [ ] **Step 5: Commit**

```bash
git add index.html admin.html index-v1-backup.html admin-v1-backup.html scripts/check-corte-arquivos.js
git commit -m "Fase 5 (corte): index.html e admin.html passam a ser a V2 (backup do antigo preservado para rollback)"
```

## Conclusão: o que ainda falta (fora deste repositório, com a usuária)

Depois destas duas tasks, **nada foi publicado ainda** — é tudo local, no repositório. O que falta é operacional, feito pela usuária, nesta ordem, cada passo com confirmação antes do próximo:

1. **Reexecutar as 4 ferramentas de migração** (`v2-migrar-datas.html`, `v2-migrar-pedidos.html`, `v2-migrar-itens.html`, `v2-migrar-cupons.html`) — pegar qualquer pedido/venda gravado pelo sistema antigo entre a última vez que rodaram e agora. Todas idempotentes, sem risco de rodar de novo.
2. **Subir os arquivos pro Hostinger** (upload manual, como ela já faz hoje) — é o momento em que o site de verdade passa a ser a V2. **Confirmar com a usuária antes deste passo especificamente** — é a ação que não tem como eu fazer por ela e que torna tudo público.
3. **Verificar o site no ar**: abrir a loja (navegação, categorias na ordem certa, carrinho, um pedido de teste) e o admin (login, Dashboard, Estoque, PDV) na URL de verdade, não só localhost.
4. **Só depois do passo 3 confirmado OK**: publicar o conteúdo definitivo de `regras.md` no Firestore (substituindo as regras aditivas de hoje) — isso é o que efetivamente bloqueia `tiposVariacao` e aperta pra `isAdmin()`. **Confirmar com a usuária antes de publicar** — é a última trava de segurança descendo.
