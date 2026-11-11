# Migração Manejo Mix V2 — Fase 1: Fundação e migração de dados — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar o terreno da migração do Manejo Mix para a arquitetura
loja-online — estrutura de arquivos, config/regras do Firebase, e os dados das
8 coleções existentes (`produtos`, `categorias`, `cupons`, `clientes`,
`pedidos`, `vendas`) adaptados por cima (não recriados) para o formato novo —
sem ainda trocar a tela que o público/admin usa no dia a dia. Esta fase não
expõe nada novo pra cliente; é 100% preparação de bastidor, validável por
scripts de verificação, com o site/admin atuais continuando no ar sem
interrupção.

**Architecture:** Arquivos novos (admin/loja v2) são criados **em paralelo**
aos atuais, sob um prefixo `v2-` (ex.: `v2-admin.html`, `v2-index.html`,
`v2-js/...`), copiando e adaptando a estrutura modular do `loja-online`
(múltiplos arquivos `admin-*.js` por módulo, em vez do `admin.html` monolítico
de 120KB atual). As migrações de dado são ferramentas HTML standalone com
login próprio (mesmo padrão do `seed-manejo-mix.html`: e-mail/senha via
Firebase Auth, depois grava direto pelo SDK cliente do Firestore), usando
`.update()` (mescla campos) em vez de `.set()` (sobrescreve o documento
inteiro) — crítico para não apagar nenhum campo que já existe. Nada troca de
lugar pro público ainda; o corte pra v2 valendo de verdade é uma fase futura.

**Tech Stack:** HTML/CSS/JS puro (sem framework/bundler, igual o resto da
casa), Firebase (Auth + Firestore, client SDK v8/compat, mesmo usado em
`seed-manejo-mix.html`), Node.js só para os scripts de verificação (lidos via
Firestore REST API pública, mesmo padrão de `verify-seed.js`).

**Spec:** `docs/superpowers/specs/2026-11-10-migracao-manejo-mix-v2-design.md`

## Global Constraints

- Banco de dados: mesmo projeto Firebase do Manejo Mix de hoje — não criar
  projeto novo (spec, escopo).
- Migração **in-place**: nenhuma coleção existente é apagada ou recriada do
  zero; todo script de migração usa `.update()` (merge), nunca `.set()`
  (overwrite) (spec, decisão #1).
- Produtos migrados ganham `estoque: 0`, `codigo: null`, `estoqueMinimo: null`,
  `ativo: true`, `destaque: false`, `precoAntigo: null`, `custo: null` — sem
  mexer em `nome`, `categoria`, `preco`, `imagem`, `descricao`, `ordem` (spec,
  decisão #2).
- Campo `ordem` é mantido (extensão própria, fora do schema padrão do
  loja-online) em `categorias` e `produtos` (spec, decisão #3).
- Pedidos migram `atendido: true/false` para `status: "entregue"/"novo"`
  **escrito direto no banco**, sem passar pela lógica de transição de status
  da tela (spec, decisão #14) — crítico para não disparar baixa de estoque.
- PDV não terá caixa (spec, decisão #13) — não é escopo desta fase, mas a
  migração de `vendas` não precisa de nenhum campo `caixaId` por conta disso.
- Nenhuma mudança visível pro público ou pra cliente nesta fase — site e admin
  atuais continuam intactos e no ar.

## Review Focus

- Um produto que já tinha algum campo extra não documentado aqui (ex.: algo
  cadastrado manualmente direto no Firestore console, fora do seed) não pode
  ser apagado pela migração — teste explícito usando `.update()` e conferindo
  que um campo "estranho" plantado de propósito sobrevive.
- Um pedido com `atendido` ausente (nem `true` nem `false` — nunca deveria
  acontecer, mas Firestore não garante isso) não pode quebrar o script nem
  ficar com `status` indefinido — precisa de um valor-padrão explícito.
- Rodar a migração de produtos **duas vezes seguidas** não pode duplicar nem
  sobrescrever um `estoque`/`codigo` que a cliente já tenha preenchido manualmente
  entre as duas rodadas (idempotência real, não só "não dá erro").
- Uma categoria sem o campo `ordem` (não deveria existir hoje, mas o script
  tem que lidar com isso) não pode sumir da listagem nem quebrar a ordenação.
- O script de verificação precisa detectar e apontar claramente qualquer
  produto/categoria/pedido que não bateu o formato esperado, em vez de só
  dizer "ok" quando na verdade pulou silenciosamente um documento com erro.

---

## Task 1: Scaffold da estrutura de arquivos v2

**Files:**
- Create: `v2-js/db.js`, `v2-js/admin.js`, `v2-js/admin-pdv.js`,
  `v2-js/admin-estoque.js`, `v2-js/admin-clientes.js`,
  `v2-js/admin-relatorios.js`, `v2-js/admin-config.js`,
  `v2-js/admin-camera.js`, `v2-js/store.js`, `v2-js/acompanhar.js`,
  `v2-js/pwa.js`, `v2-js/splash.js`
- Create: `v2-css/admin.css`, `v2-css/splash.css`
- Create: `v2-firebase-config.js`
- Create: `v2-admin.html`, `v2-index.html`, `v2-acompanhar.html`
- Reference (read-only): todos os arquivos equivalentes em
  `C:\Users\crist\Desktop\SISTEMAS COM FIREBASE\loja-online\`

**Interfaces:**
- Produces: o esqueleto completo de arquivos v2 que as próximas fases (2-5)
  vão editar modularmente. Nenhum HTML/JS aqui é funcional ainda de verdade —
  é a cópia 1:1 do loja-online, só renomeada pros caminhos `v2-*`.

- [ ] **Step 1: Copiar cada arquivo do `loja-online` listado acima para o
  caminho `v2-*` correspondente dentro de `Manejo Mix -Pet Shop`**, sem alterar
  o conteúdo ainda (cópia crua).

- [ ] **Step 2: Rodar um grep em todos os arquivos `v2-*` recém-copiados
  procurando por caminhos relativos a outros arquivos do próprio projeto**
  (ex.: `href="css/`, `src="js/`, `href="manifest`) e corrigir cada um para o
  prefixo `v2-` correspondente (ex.: `css/admin.css` → `v2-css/admin.css`).

- [ ] **Step 3: Verificação — abrir `v2-admin.html` direto no navegador (file://
  ou Live Server) e confirmar no console que não há nenhum erro 404 de arquivo
  não encontrado.**

Expected: console limpo de erros 404; a tela de login do admin v2 aparece
(mesmo que o login ainda não funcione — isso é Task 2).

- [ ] **Step 4: Commit**

```bash
git add v2-js v2-css v2-firebase-config.js v2-admin.html v2-index.html v2-acompanhar.html
git commit -m "Copia esqueleto do loja-online como v2-* (cópia crua, ainda não funcional)"
```

---

## Task 2: firebase-config.js dual-export e regras do Firestore

**Files:**
- Modify: `v2-firebase-config.js`
- Modify: `regras.md` (regras atuais do Manejo Mix, referência) → aplicar
  regras novas no Firebase Console/CLI do projeto (fora do repositório — é
  configuração no próprio Firebase, não um arquivo que o navegador carrega)
- Reference: `loja-online/regras.md`, `firebase-config.js` atual do Manejo Mix
  (`Manejo Mix -Pet Shop/firebase-config.js`)

**Interfaces:**
- Consumes: credenciais do projeto Firebase do Manejo Mix (de
  `Manejo Mix -Pet Shop/firebase-config.js`, já existente).
- Produces: `v2-firebase-config.js` exportando `firebaseConfig` (`const`,
  compatível com o jeito que o projeto atual consome) **e também**
  `window.firebaseConfig` (compatível com o jeito que os arquivos `v2-js/*`
  copiados do loja-online esperam) — as duas formas apontando pro mesmo
  objeto, sem duplicar os valores.

- [ ] **Step 1: Editar `v2-firebase-config.js`** para declarar
  `const firebaseConfig = {...}` com os mesmos valores do
  `firebase-config.js` atual, seguido de `window.firebaseConfig = firebaseConfig;`.

- [ ] **Step 2: Verificação — abrir `v2-admin.html`, no console do navegador
  rodar `window.firebaseConfig.projectId` e `firebaseConfig.projectId`.**

Expected: os dois retornam o mesmo project id do Manejo Mix (não o do
loja-online nem de outro projeto).

- [ ] **Step 3: Comparar `regras.md` atual do Manejo Mix com
  `loja-online/regras.md`, linha a linha**, e escrever a versão final das
  regras pro Manejo Mix v2: usar a estrutura do loja-online
  (`emailsAdmin()`/`isAdmin()`) com o e-mail administrador que já está
  cadastrado no Authentication do projeto do Manejo Mix (confirmar o e-mail
  exato olhando o Firebase Console do projeto, ou perguntando — não
  adivinhar), ajustada pra cobrir as 8 coleções que o Manejo Mix já usa hoje
  (`produtos`, `categorias`, `cupons`, `configuracoes`, `pedidos`, `clientes`,
  `vendas`, `tiposVariacao` — esta última pode ficar bloqueada por padrão,
  já que não é mais usada depois da Fase 2).

- [ ] **Step 4: Salvar a versão final em `regras.md`** (substituindo o
  conteúdo atual, que fica preservado no histórico do git) **mas NÃO publicar
  ainda no Firebase Console** — publicar as regras novas é um corte que afeta
  o site/admin atual em produção imediatamente (regras valem pro banco
  inteiro, não por versão de arquivo), então isso só acontece no dia do corte
  final (fase futura, fora deste plano).

- [ ] **Step 5: Commit**

```bash
git add v2-firebase-config.js regras.md
git commit -m "Adapta firebase-config para dual export e escreve regras novas (regras.md) para o dia do corte"
```

---

## Task 3: Migração de `categorias` e `produtos`

**Files:**
- Create: `v2-migrar-produtos-categorias.html` (ferramenta standalone de
  migração, mesmo padrão de login de `seed-manejo-mix.html`)
- Test: `scripts/verify-migracao-produtos.js` (script Node, roda contra a
  Firestore REST API pública, mesmo padrão de `verify-seed.js`)

**Interfaces:**
- Consumes: coleções `produtos` e `categorias` já existentes no Firestore do
  projeto (165+ produtos, 9 categorias, confirmados nesta conversa).
- Produces: os mesmos documentos, com os campos novos da decisão #2 da spec
  adicionados via `.update()`. Nenhum id de documento muda.

- [ ] **Step 1: Escrever `v2-migrar-produtos-categorias.html`** com: tela de
  login (copiar o bloco de login de `seed-manejo-mix.html`), um botão
  "Migrar categorias" que itera `db.collection("categorias").get()` e roda
  `.update({ pai: null })` em cada doc que não tiver o campo `pai` ainda
  (preserva `ordem` existente, não mexe em mais nada), e um botão "Migrar
  produtos" que itera `db.collection("produtos").get()` e roda `.update(...)`
  em cada doc que ainda não tiver o campo `estoque`, setando exatamente:
  `estoque: 0, codigo: null, estoqueMinimo: null, ativo: true, destaque: false,
  precoAntigo: null, custo: null` — pulando (sem tocar) qualquer doc que já
  tenha `estoque` definido (idempotência: rodar duas vezes não reseta nada).

- [ ] **Step 2: Escrever `scripts/verify-migracao-produtos.js`** que busca
  todas as `categorias` e `produtos` via REST pública e confere: (a) toda
  categoria tem `pai` (mesmo que `null`) sem perder `ordem`/`icone`/`nome`
  originais, **e aponta explicitamente qualquer categoria sem `ordem`**
  (não deveria existir hoje, mas o script não pode mascarar isso como "ok" —
  se achar uma, reporta qual, sem inventar valor-padrão sozinho); (b) todo produto tem os 7 campos novos da decisão #2, com
  `estoque`/`custo`/`precoAntigo`/`codigo`/`estoqueMinimo` dos tipos certos
  (number ou null); (c) a contagem total de produtos é a mesma de antes da
  migração (nenhum documento sumiu); (d) nenhum produto perdeu `nome`,
  `categoria`, `preco`, `imagem`, `descricao` ou `ordem` originais.

- [ ] **Step 3: Rodar `node scripts/verify-migracao-produtos.js` ANTES de
  clicar em qualquer botão da ferramenta de migração**, só pra confirmar a
  contagem/estado atual (baseline).

Expected: reporta os produtos/categorias como estão hoje — sem os campos
novos ainda (é esperado falhar nesse ponto, serve de baseline).

- [ ] **Step 4: Abrir `v2-migrar-produtos-categorias.html` no navegador, fazer
  login com o admin, clicar nos dois botões.**

- [ ] **Step 5: Rodar `node scripts/verify-migracao-produtos.js` de novo.**

Expected: todas as checagens (a)-(d) passam.

- [ ] **Step 6: Clicar nos dois botões de novo (sem mudar nada manualmente
  entre uma rodada e outra) e rodar a verificação mais uma vez.**

Expected: resultado idêntico ao Step 5 (prova de idempotência).

- [ ] **Step 7: Commit**

```bash
git add v2-migrar-produtos-categorias.html scripts/verify-migracao-produtos.js
git commit -m "Adiciona ferramenta de migracao in-place de categorias/produtos (estoque, codigo, etc) e script de verificacao"
```

---

## Task 4: Migração de `pedidos` (status) e verificação de `cupons`/`clientes`

**Files:**
- Create: `v2-migrar-pedidos.html` (mesmo padrão de login/ferramenta)
- Test: `scripts/verify-migracao-pedidos.js`

**Interfaces:**
- Consumes: coleção `pedidos` existente (campo `atendido: boolean`).
- Produces: cada doc de `pedidos` ganha `status: "entregue"` (quando
  `atendido === true`) ou `status: "novo"` (quando `atendido === false` **ou**
  ausente — tratado como não atendido, decisão de segurança desta fase) via
  `.update()`, mantendo o campo `atendido` original intacto (não remove nada).

- [ ] **Step 1: Escrever `v2-migrar-pedidos.html`** com login (mesmo padrão) e
  um botão que itera `db.collection("pedidos").get()`, pula qualquer doc que
  já tenha `status` definido (idempotência), e nos demais roda
  `.update({ status: doc.data().atendido === true ? "entregue" : "novo" })`.

- [ ] **Step 2: Escrever `scripts/verify-migracao-pedidos.js`** que busca todos
  os `pedidos` via REST e confere: (a) todo pedido tem `status` em
  `["novo","entregue"]` (nenhum `confirmado/enviado/cancelado` nesta migração
  — esses só surgem depois, por ação manual na tela nova); (b) todo pedido com
  `atendido: true` tem `status: "entregue"`; (c) todo pedido com `atendido:
  false` OU sem o campo `atendido` tem `status: "novo"`; (d) a contagem total
  de pedidos é a mesma de antes.

- [ ] **Step 3: Rodar a verificação antes (baseline), depois abrir a
  ferramenta e clicar no botão, depois rodar a verificação de novo.**

Expected: baseline sem `status`; depois da migração, todas as checagens
(a)-(d) passam.

- [ ] **Step 4: Conferir manualmente (sem script, é rápido) o schema de um
  documento de `cupons` e de `clientes` via o Firestore Console ou a REST API,
  e comparar com os campos que `loja-online/js/admin.js` (cupons) e
  `loja-online/js/admin-clientes.js` esperam.** Anotar no corpo do commit
  (Step 5) qualquer diferença de nome de campo encontrada — não precisa
  migração de dado agora (ambos os formatos são "parecidos o suficiente" por
  decisão da spec #6), só confirmar que não há incompatibilidade que vá
  quebrar a Fase 4 (Clientes/Cupons) mais adiante.

- [ ] **Step 5: Commit**

```bash
git add v2-migrar-pedidos.html scripts/verify-migracao-pedidos.js
git commit -m "Adiciona migracao de status de pedidos (atendido -> status) e verificacao; confirma compatibilidade de cupons/clientes"
```

---

## Conclusão da Fase 1

Ao final desta fase: os dados das 8 coleções estão no formato que a Fase 2 em
diante vai precisar, o esqueleto de arquivos `v2-*` existe e carrega sem erro
de caminho, e nada do que está em produção (admin.html, index.html atuais)
foi tocado — a cliente não percebe nada diferente ainda. As fases seguintes
(cada uma com seu próprio plano, escrito quando chegar a vez):

- **Fase 2:** Produtos/Categorias/Variações no admin v2 + adaptar
  `seed-manejo-mix.html` pro formato novo.
- **Fase 3:** Dashboard + Estoque (módulos novos).
- **Fase 4:** PDV (sem caixa) + Cupons + Clientes (com pets) + Pedidos Online
  + Relatórios + Configurações.
- **Fase 5:** Loja pública (index v2, acompanhar pedido, pwa/splash) + corte
  final (publicar regras novas, trocar `admin.html`/`index.html` pelos `v2-*`,
  escolhido num horário de baixo movimento da loja).
