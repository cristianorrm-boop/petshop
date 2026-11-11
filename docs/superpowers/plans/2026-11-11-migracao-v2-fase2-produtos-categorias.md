# Migração Manejo Mix V2 — Fase 2: Produtos, Categorias e Variações — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar as abas Produtos, Categorias e Variações do `v2-admin.html`
funcionando de ponta a ponta contra os dados já migrados na Fase 1 (165
produtos, 9 categorias), incluindo o campo `ordem` (extensão própria, fora
do schema padrão do loja-online) nos formulários e nas listagens — e
remover do admin v2 os módulos que ficaram fora do escopo desta V2 (Fretes,
Contas a Pagar, Contas a Receber), que hoje aparecem na barra lateral sem
ter nenhuma tela por trás.

**Architecture:** `v2-js/admin.js` e `v2-admin.html` (copiados crus do
loja-online na Fase 1) são editados no lugar — sem criar arquivo novo,
seguindo o padrão já estabelecido do projeto (um `admin.js` cobrindo
produtos/categorias/cupons/pedidos/dashboard, módulos maiores em arquivos
`admin-*.js` à parte). `v2-js/db.js` não muda (as funções genéricas
`DB.produtos.*`/`DB.categorias.*` já leem/escrevem qualquer campo que o
documento tiver, incluindo `ordem`, sem precisar de ajuste). A loja pública
(`v2-index.html`/`v2-js/store.js`) **não entra nesta fase** — é
explicitamente trabalho da Fase 5.

**Tech Stack:** HTML/CSS/JS puro, Firebase (client SDK, já configurado na
Fase 1 com a trava de localhost). Sem framework de teste automatizado no
projeto — verificação por scripts Node de lógica pura (mesmo padrão da
Fase 1, em `scripts/`) mais checagem manual da usuária no navegador local
para os fluxos que só existem na UI (ela já fez isso na Fase 1 com as
ferramentas de migração).

**Spec:** `docs/superpowers/specs/2026-11-10-migracao-manejo-mix-v2-design.md`

## Global Constraints

- Nenhuma mudança nesta fase toca no site/admin público atual
  (`admin.html`, `index.html`, `script.js`) — só os arquivos `v2-*`, que só
  funcionam de verdade em localhost (trava da Fase 1, `v2-firebase-config.js`).
- `ordem` é uma extensão própria do projeto (não existe no schema padrão do
  loja-online) e precisa ser respeitada tanto no formulário quanto na
  ordenação das listagens — é o motivo de toda a reorganização cuidadosa
  que já foi feita a dedo neste catálogo (spec, decisão #3).
- Fretes, Contas a Pagar e Contas a Receber estão fora do escopo desta V2
  (spec, módulos que ficam de fora) — não é "ainda não construído", é
  **não vai ser construído nesta V2**.
- Variações continuam existindo dentro do cadastro de cada produto (lista
  de variações com estoque e código de barras próprios) — já está assim no
  código copiado da Fase 1, não precisa de nova implementação, só
  confirmação de que funciona contra os dados reais (spec, decisão #4).
- Nenhum produto ou categoria existente pode ser apagado ou ter campo
  perdido por esta fase — qualquer alteração em `v2-js/admin.js` é só
  adição (um campo a mais no formulário, um critério a mais na ordenação),
  nunca remoção de lógica que já funciona.

## Review Focus

- Produto ou categoria sem `ordem` (os 25 produtos de
  medicamentos/higiene/petiscos/acessórios/vestuário, ids 10-34, que nunca
  tiveram esse campo) não pode sumir da listagem nem quebrar a ordenação —
  precisa de um critério de desempate (nome) quando `ordem` falta.
- Produto com `variantes` já preenchido (nenhum dos 165 atuais tem, mas o
  formulário precisa continuar aceitando) não pode ter a lista de variações
  apagada só por causa do campo `ordem` novo sendo adicionado ao formulário.
- Categoria com `pai` preenchido (nenhuma tem hoje, mas o campo existe desde
  a Fase 1) não pode quebrar a ordenação por `ordem` nem o dropdown de
  categoria dentro do formulário de produto.
- Clicar numa aba removida (Fretes/Pagar/Receber) não deve deixar nenhum
  link morto na barra lateral nem erro no console — a aba some de vez, não
  fica "escondida mas ainda referenciada".
- Salvar um produto ou categoria sem preencher `ordem` (campo deixado em
  branco no formulário) não pode gravar a string vazia `""` nem quebrar a
  ordenação — precisa virar `null` ou ser omitido, igual os 25 produtos que
  já não têm esse campo.

---

## Task 1: Remove módulos fora de escopo (Fretes, Contas a Pagar, Contas a Receber)

**Files:**
- Modify: `v2-admin.html:45,47-48,66,68-69` (botões da barra lateral e
  `<section>` das abas)
- Modify: `v2-js/admin.js:629-665` (bloco `telas.fretes` e `formFrete`, ou
  nome equivalente — remover por completo)
- Test: `scripts/check-v2-escopo.sh`

**Interfaces:**
- Produces: `v2-admin.html` sem nenhum `data-tab="fretes|pagar|receber"` nem
  `id="tab-fretes|pagar|receber"`; `v2-js/admin.js` sem `telas.fretes` nem
  qualquer referência a `DB.fretes`.

- [ ] **Step 1: Remover de `v2-admin.html`** os 3 botões da barra lateral
  (`data-tab="fretes"`, `"pagar"`, `"receber"`) e as 3 `<section>`
  correspondentes (`id="tab-fretes"`, `"tab-pagar"`, `"tab-receber"`).

- [ ] **Step 2: Remover de `v2-js/admin.js`** o bloco `telas.fretes = async () => {...}`
  por inteiro (em torno da linha 629-665) e qualquer função auxiliar que só
  ele usa (ex.: `formFrete`, se existir separada). Não remover `DB.fretes`
  de `db.js` — esse arquivo é cópia crua da Fase 1 e módulos não usados nele
  não atrapalham nada.

- [ ] **Step 3: Escrever `scripts/check-v2-escopo.sh`** que roda
  `grep -c 'data-tab="fretes"\|data-tab="pagar"\|data-tab="receber"' v2-admin.html`
  e `grep -c 'telas.fretes\|telas.pagar\|telas.receber' v2-js/admin.js`,
  falhando (`exit 1`) se qualquer contagem for maior que zero.

- [ ] **Step 4: Rodar `bash scripts/check-v2-escopo.sh`**

Expected: `OK: nenhuma referencia a fretes/pagar/receber em v2-admin.html ou v2-js/admin.js`

- [ ] **Step 5: Commit**

```bash
git add v2-admin.html v2-js/admin.js scripts/check-v2-escopo.sh
git commit -m "Fase 2: remove Fretes/Pagar/Receber do admin v2 (fora de escopo desta V2)"
```

---

## Task 2: Campo `ordem` e ordenação em Produtos

**Files:**
- Modify: `v2-js/admin.js:419-556` (`telas.produtos`, `formProduto`)
- Test: `scripts/check-ordenacao-logic.js`

**Interfaces:**
- Consumes: Task 1 (nenhuma dependência direta de dado, só não deve haver
  mais nenhuma referência a `telas.fretes` no arquivo).
- Produces: `formProduto` com um campo `ordem` (number, opcional); payload
  salvo grava `ordem: valor` quando preenchido ou `ordem: null` quando
  vazio (nunca string vazia); `telas.produtos` lista ordenada por
  `ordem` crescente (produtos sem `ordem` vão para o final, em ordem
  alfabética entre si).

- [ ] **Step 1: Escrever `scripts/check-ordenacao-logic.js`** com a função
  `compararPorOrdem(a, b)` extraída/reimplementada (mesma lógica que vai
  entrar em `admin.js`): `(a.ordem ?? Infinity) - (b.ordem ?? Infinity) ||
  a.nome.localeCompare(b.nome, "pt-BR")`, e a função `ordemParaGravar(valorDoInput)`:
  `valorDoInput === "" ? null : parseInt(valorDoInput, 10)`. Casos de teste:
  - dois produtos com `ordem` diferente → o menor `ordem` vem primeiro;
  - um produto com `ordem` e outro sem → o que tem `ordem` vem primeiro;
  - dois produtos sem `ordem` → desempate por `nome` (ordem alfabética);
  - `ordemParaGravar("")` → `null` (nunca string vazia gravada no banco);
  - `ordemParaGravar("12")` → `12` (number, não string).

- [ ] **Step 2: Rodar `node scripts/check-ordenacao-logic.js`**

Expected: FALHA — a função ainda não existe em lugar nenhum pra importar
(o script é autocontido, então "falhar" aqui significa só confirmar que os
3 casos realmente testam o comportamento esperado antes de copiar a mesma
lógica pro admin.js — rode e leia a saída, não deve dar erro de sintaxe).

- [ ] **Step 3: Em `v2-js/admin.js`, no `formProduto` (em torno da linha 463-474),
  adicionar um campo `ordem`** ao objeto-padrão de produto novo
  (`ordem: ""` quando `id` for nulo, ou `p.ordem ?? ""` quando estiver
  editando) e um `<label>Ordem de exibição<input name="ordem" type="number" ...></label>`
  no HTML do formulário, próximo ao campo Categoria.

- [ ] **Step 4: No handler de salvar do mesmo formulário (em torno da linha 502),
  incluir `ordem: d.ordem === "" ? null : parseInt(d.ordem, 10)`** no objeto
  gravado via `DB.produtos.salvar`.

- [ ] **Step 5: Em `telas.produtos` (linha 423), trocar o `.sort((a, b) => a.nome.localeCompare(...))`
  pela função `compararPorOrdem` do Step 1** (copiada/adaptada pra dentro do
  arquivo, já que não há módulo compartilhado entre `scripts/` e `v2-js/`).

- [ ] **Step 6: Rodar `node scripts/check-ordenacao-logic.js` de novo**

Expected: os 3 casos passam.

- [ ] **Step 7: Verificação manual (pedir pra usuária) — abrir `v2-admin.html`
  localmente, logar, abrir a aba Produtos, confirmar que a lista aparece na
  mesma ordem das categorias de ração (Cão, depois Gato, Aves, Roedores,
  dentro de cada uma pela ordem que já foi cadastrada), editar um produto
  qualquer preenchendo o campo Ordem novo, salvar, e confirmar que a
  posição dele na lista muda de acordo. Pedir também pra ela adicionar uma
  variação de teste (nome + estoque) nesse mesmo produto, salvar, reabrir o
  produto e confirmar que a variação continua lá (prova de que o campo
  Ordem novo não interfere na lista de variações).**

Expected: a usuária confirma que a ordem bate com o que já foi construído
nas Fases anteriores, e que a variação de teste sobrevive ao salvar.

- [ ] **Step 8: Commit**

```bash
git add v2-js/admin.js scripts/check-ordenacao-logic.js
git commit -m "Fase 2: adiciona campo ordem ao formulario de produto e ordena a listagem por ele"
```

---

## Task 3: Campo `ordem` e ordenação em Categorias

**Files:**
- Modify: `v2-js/admin.js:560-626` (`telas.categorias`, `formCategoria`)

**Interfaces:**
- Consumes: Task 2's `compararPorOrdem(a, b)` (mesma função, copiada pra
  este bloco também — arquivo único, sem import entre funções internas).
- Produces: `formCategoria` com campo `ordem`; `telas.categorias` ordenada
  por `ordem` (categorias-raiz entre si por `ordem`; dentro de cada uma,
  as subcategorias — campo `pai` — continuam agrupadas logo abaixo da mãe,
  como já é hoje, só que a raiz e as subcategorias cada uma ordenada por
  `ordem` entre si em vez de por nome).

- [ ] **Step 1: Em `formCategoria` (linha 580), adicionar `ordem: c.ordem ?? ""`
  ao objeto-padrão e um `<label>Ordem de exibição<input name="ordem" type="number" ...></label>`
  no formulário**, próximo ao campo Nome.

- [ ] **Step 2: No handler de salvar (linha 600), incluir
  `ordem: d.ordem === "" ? null : parseInt(d.ordem, 10)`** no objeto gravado
  via `DB.categorias.salvar`.

- [ ] **Step 3: Em `telas.categorias`, trocar os dois `.sort((x, y) => x.nome.localeCompare(...))`
  (linhas 564 e 565, raízes e filhos) pela função `compararPorOrdem`.**

- [ ] **Step 4: Rodar `node scripts/check-ordenacao-logic.js`** (mesmo script
  da Task 2 — a função é a mesma, só comprova que continua correta depois
  de copiada pra cá também).

Expected: os 3 casos continuam passando (nenhuma mudança na lógica, só
reaproveitada).

- [ ] **Step 5: Verificação manual (pedir pra usuária) — na mesma sessão do
  Step 7 da Task 2, abrir a aba Categorias e confirmar que as 9 categorias
  aparecem na ordem certa (Ração Cão, Ração Gato, Ração Aves, Ração
  Roedores, Medicamentos, Higiene e Beleza, Petiscos, Acessórios,
  Vestuário) e que editar uma categoria preenchendo Ordem muda a posição
  dela.**

Expected: usuária confirma a ordem batendo com o que já está no site atual.

- [ ] **Step 6: Commit**

```bash
git add v2-js/admin.js
git commit -m "Fase 2: adiciona campo ordem ao formulario de categoria e ordena raizes/subcategorias por ele"
```

---

## Conclusão da Fase 2

Ao final: as abas Produtos e Categorias do admin v2 funcionam de ponta a
ponta contra os 165 produtos e 9 categorias reais, respeitando a ordem
cuidadosamente construída nas sessões anteriores, com Variações já
funcionando (herdado do loja-online, só confirmado). Fretes/Pagar/Receber
não aparecem mais no admin v2. Ainda falta, pras próximas fases:

- **Fase 3:** Dashboard + Estoque (módulos novos).
- **Fase 4:** PDV (sem caixa) + Cupons + Clientes (com pets) + Pedidos
  Online + Relatórios + Configurações.
- **Fase 5:** Loja pública (`v2-index.html`/`v2-js/store.js`, incluindo
  ordenação por `ordem` na vitrine pro cliente final) + acompanhar pedido +
  corte final.
