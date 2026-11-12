# Migração Manejo Mix V2 — Fase 4: PDV, Cupons, Clientes, Pedidos, Relatórios, Configurações — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar PDV, Cupons, Clientes, Pedidos, Relatórios e Configurações
funcionando contra os dados reais do Manejo Mix na arquitetura V2, adaptando
os módulos copiados crus do loja-online onde eles dependem de recursos fora
de escopo (caixa, financeiro, impressora térmica) ou de formatos de dado que
os registros antigos não têm.

**Architecture:** Os seis módulos já vieram prontos (cópia crua do
loja-online) nas Fases 1–3 em `v2-js/admin-pdv.js`, `admin-clientes.js`,
`admin-relatorios.js`, `admin-config.js` e as telas `cupons`/`pedidos` dentro
de `admin.js`. Esta fase não cria tela nova — adapta o que existe em três
frentes: (1) remove código morto que trava a UI porque depende de um módulo
nunca copiado (impressora) ou de uma coleção fora de escopo (`contas`,
Financeiro); (2) adapta o PDV para vender sem caixa (decisão #13 do design);
(3) migra/estende três formatos de dado antigos (cupons, clientes, itens de
pedidos/vendas) para o que o código novo espera.

**Tech Stack:** HTML/CSS/JS puro, Firebase. Migração de dado no mesmo padrão
das fases anteriores (ferramenta HTML standalone com login, `.update()`/
`.set(..., {merge:true})` só nos campos que precisam mudar, nunca um
`.set()` cheio). Testes como scripts Node standalone em `scripts/` que
provam a lógica pura (comparadores, casamento de item por nome, detecção de
campo antigo) antes de colar a mesma lógica na ferramenta HTML — mesmo
padrão das Fases 1–3, já que o projeto não tem framework de teste.

**Spec:** `docs/superpowers/specs/2026-11-10-migracao-manejo-mix-v2-design.md`

## Global Constraints

- Impressora térmica/fiscal, Fretes e Financeiro (Contas a Pagar/Receber)
  não entram nesta rodada (Não-objetivos do design doc).
- PDV vende direto, sem exigir abertura/fechamento de caixa (decisão #13);
  venda grava sem `caixaId` real (campo fixo `"sem-caixa"` ou omitido).
- Clientes mantém `aniversario`, `pet` e `animais: {cachorro, gato, aves,
  roedores}` (decisão #5), com os mesmos nomes de campo de hoje.
- Cupons reaproveita a coleção existente, com ajuste de campo onde
  necessário (decisão #6) — nunca recriar do zero.
- `pedidos`/`vendas` antigos são preservados; campos ausentes aparecem como
  vazio/zero sem quebrar a tela (decisão #7).
- Configurações (aba Aparência) é preenchida com o que já está configurado
  hoje (nome, cores dourado/vinho, WhatsApp, horário de retirada), não com o
  padrão do loja-online (decisão #8).
- Nenhuma mudança toca `script.js`/`admin.html`/`seed-manejo-mix.html`
  (sistema antigo em produção) nem a pasta `loja-online` (só referência).
- Toda migração de dado é aditiva/idempotente: roda de novo sem duplicar
  nem reverter trabalho manual já feito.

## Review Focus

- Abrir a aba Configurações não pode travar/lançar erro no console por
  causa de `A.impressora`/`A.avisoTeste` indefinidos (módulo de impressora
  nunca foi copiado — a cliente não tem esse equipamento) — é erro real
  hoje, confirmado lendo `admin-config.js:449`.
- Uma venda no PDV sem caixa aberto não pode ficar bloqueada pedindo para
  abrir caixa — ela vende direto, igual é hoje (decisão #13); isso também
  vale para o pagamento "A prazo" (grava conta a receber — Financeiro, fora
  de escopo), que não pode continuar disponível.
- Um pedido ou venda antigo cujos itens não têm `id`/`vid` (formato de
  antes da migração, confirmado em `script.js`/`admin.html`) não pode fazer
  `mudarStatus`/cancelamento de venda "funcionar" sem avisar nada mas sem
  realmente baixar/devolver estoque nenhum.
- Um cupom antigo com `valorMinimo`/`validade` não pode virar "sem
  mínimo"/"nunca expira" só porque o campo mudou de nome (`minimo` no
  loja-online) ou porque o loja-online nunca teve esse conceito.
- Relatórios e Clientes não podem mostrar cartão/coluna de Financeiro
  (`contas`) sempre vazio/zerado como se fosse um recurso disponível —
  melhor remover o que não se aplica a esta rodada do que deixar morto.

---

## Task 1: Remover dependência de impressora térmica (módulo nunca copiado)

**Files:**
- Modify: `v2-js/admin-config.js` (painel `#painel-impressora` e seu
  JavaScript de inicialização, ~linhas 254–289 e 443–487; adicionar stub de
  `A.configMudou`)
- Modify: `v2-js/admin-pdv.js` (`imprimirCupom`, `autoImprimir`, botão
  "Imprimir cupom" em `mostrarRecibo`)
- Modify: `v2-js/admin.js` (`telas.pedidos`'s `verPedido`: botão/handler
  `imprimir-termica`)
- Test: `scripts/check-v2-sem-impressora.js`

**Interfaces:**
- Produces: `A.configMudou(parcial)` definido (no-op seguro) — é chamado
  por `admin-config.js` e por `v2-js/admin-estoque.js:527`; nenhuma outra
  task desta fase depende dele além de precisar que ele exista.

- [ ] **Step 1: Escrever `scripts/check-v2-sem-impressora.js`** — lê
  `v2-js/admin-config.js`, `admin-pdv.js` e `admin.js`, falha
  (`process.exit(1)`) se encontrar qualquer ocorrência de `A.impressora`,
  `window.Admin.impressora`, `A.avisoTeste`, `painel-impressora` ou
  `imprimir-termica`.

- [ ] **Step 2: Rodar `node scripts/check-v2-sem-impressora.js`**

Expected: FALHA (strings ainda presentes).

- [ ] **Step 3: Editar `v2-js/admin-config.js`** — remover o bloco HTML
  `<div class="painel" id="painel-impressora">...</div>` inteiro (inclui o
  painel de impressora Bluetooth/serial e o de avisos de pedido/som, já que
  ambos dependem de globais nunca copiados: `A.impressora` e
  `A.avisoTeste`) e todo o JavaScript que só existe para esse painel
  (seção "impressora e avisos", variáveis `imp`/`sup`, `conectar`,
  `estadoNotif`). Adicionar, no topo do módulo, `A.configMudou =
  A.configMudou || (() => {});`.

- [ ] **Step 4: Editar `v2-js/admin-pdv.js`** — remover as funções
  `imprimirCupom` e `autoImprimir`, a chamada `autoImprimir(venda);` dentro
  do callback de sucesso de `receber()`, o botão `#imp-cupom` em
  `mostrarRecibo` e seu `onclick`.

- [ ] **Step 5: Editar `v2-js/admin.js`** — em `verPedido`, remover o botão
  `#imprimir-termica` e seu `onclick`.

- [ ] **Step 6: Rodar `node scripts/check-v2-sem-impressora.js`**

Expected: OK (nenhuma ocorrência).

- [ ] **Step 7: Commit**

```bash
git add v2-js/admin-config.js v2-js/admin-pdv.js v2-js/admin.js scripts/check-v2-sem-impressora.js
git commit -m "Fase 4 Task 1: remove dependencia de impressora termica (modulo nunca copiado)"
```

- [ ] **Step 8: Verificação manual (pedir pra usuária)** — abrir
  `v2-admin.html`, logar, abrir a aba Configurações (deve abrir sem erro no
  console do navegador) e abrir um pedido existente em Pedidos (o botão de
  impressão na térmica não deve mais aparecer).

Expected: usuária confirma que Configurações abre normalmente.

---

## Task 2: PDV sem caixa e sem pagamento "A prazo" (Financeiro fora de escopo)

**Files:**
- Modify: `v2-js/admin-pdv.js`
- Test: `scripts/check-pdv-sem-caixa-escopo.js`

**Interfaces:**
- Produces: `DB.vendas.salvar({..., caixaId: "sem-caixa", ...})` — venda
  gravada sem depender de um documento `caixas` real.

- [ ] **Step 1: Escrever `scripts/check-pdv-sem-caixa-escopo.js`** — lê
  `v2-js/admin-pdv.js` e falha se encontrar qualquer ocorrência de `"A
  prazo"`, `DB.caixas`, `"Caixa fechado"`, `parcelasLista`, ou
  `DB.fs.collection("contas")`.

- [ ] **Step 2: Rodar o script**

Expected: FALHA.

- [ ] **Step 3: Editar `v2-js/admin-pdv.js`**:
  - `desenharBase()`/sub-abas: tirar a aba "Caixa" (fica só `["venda",
    "Venda"]`, `["vendas", "Vendas"]`).
  - `A.telas.pdv`/estado: remover `carregarCaixa()`, a variável `caixa` e
    seu uso como gate.
  - `telaVenda()`: remover o bloco `if (!caixa) {...}` — a tela de venda
    sempre renderiza.
  - `FORMAS`/`ICONE`: remover a entrada `"A prazo"` (e o alias
    `"Fiado"` do `ICONE`, já sem uso).
  - `receber()`/`painel()`/`ligar()`/`desenhar()`/`adicionar()` (dentro de
    `receber`): remover inteiramente o ramo de pagamento "A prazo"
    (`prazo`, `pg-parc`/`pg-venc`/`pg-int`/`pg-cliente`/`pg-novo-cli*`,
    `gerarParcelas`, `addMesesIso`, `addDiasIso` só usada ali, `INTERVALOS`,
    `dataCurta`) — manter `rotuloPagamento` (ainda usado por
    Dinheiro/PIX/Débito/Crédito).
  - `finalizar()`: trocar `caixaId: caixa.id` por `caixaId: "sem-caixa"`;
    remover o bloco que grava parcelas em `contas` (`for (const pg of
    pags.filter(...parcelasLista))`).
  - Remover `telaCaixa` e `resumoCaixa` por completo.
  - `cancelarVenda()`: remover o bloco que consulta/remove
    `DB.fs.collection("contas").where("vendaId", ...)`.
  - Atalho de teclado (F2/F4): tirar `|| !caixa` da condição de guarda.

- [ ] **Step 4: Rodar o script**

Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add v2-js/admin-pdv.js scripts/check-pdv-sem-caixa-escopo.js
git commit -m "Fase 4 Task 2: PDV vende sem caixa e sem pagamento a prazo (financeiro fora de escopo)"
```

- [ ] **Step 6: Verificação manual (pedir pra usuária)** — abrir o PDV,
  confirmar que a tela de Venda abre direto (sem pedir para abrir caixa),
  vender um item com Dinheiro ou PIX, confirmar que a venda aparece em
  "Vendas" do dia e que "A prazo" não aparece mais como forma de
  pagamento.

Expected: usuária confirma a venda completa de ponta a ponta.

---

## Task 3: Clientes — campos de bichinho de estimação, sem coluna de Financeiro

**Files:**
- Modify: `v2-js/admin-clientes.js`
- Test: `scripts/check-clientes-pet-fields.js`

- [ ] **Step 1: Escrever `scripts/check-clientes-pet-fields.js`** — lê
  `v2-js/admin-clientes.js` e falha se faltar `name="aniversario"`,
  `name="pet"`, `name="animais_cachorro"`, `name="animais_gato"`,
  `name="animais_aves"` ou `name="animais_roedores"`, ou se ainda contiver
  `DB.contas`.

- [ ] **Step 2: Rodar o script**

Expected: FALHA.

- [ ] **Step 3: Editar `A.formCliente`** — adicionar ao objeto padrão e ao
  modal: `aniversario` (`<input type="date">`), `pet` (texto livre) e
  `animais: {cachorro, gato, aves, roedores}` (4 `<input type="number"
  min="0">`, nomes `animais_cachorro` etc.). No `salvar`, incluir
  `aniversario: d.aniversario, pet: d.pet.trim(), animais: {cachorro:
  parseInt(d.animais_cachorro, 10) || 0, gato: ..., aves: ..., roedores:
  ...}`.

- [ ] **Step 4: Editar `A.telas.clientes`** — remover `DB.contas.listar()`
  e a coluna "A receber (em aberto)"; no lugar, adicionar uma coluna
  "Bichinho(s)" mostrando `c.pet` e um resumo curto de `c.animais` (ex.:
  "2 cães, 1 gato") quando houver algum valor > 0, ou "—" quando não.

- [ ] **Step 5: Rodar o script**

Expected: OK.

- [ ] **Step 6: Commit**

```bash
git add v2-js/admin-clientes.js scripts/check-clientes-pet-fields.js
git commit -m "Fase 4 Task 3: clientes recupera campos de bichinho de estimacao"
```

- [ ] **Step 7: Verificação manual (pedir pra usuária)** — editar um
  cliente existente, preencher aniversário e quantidade de bichinhos,
  salvar, confirmar que aparece certo na listagem.

Expected: usuária confirma.

---

## Task 4: Cupons — migrar `valorMinimo` → `minimo`, manter `validade`

**Files:**
- Modify: `v2-js/admin.js` (`telas.cupons`, `formCupom`)
- Modify: `v2-js/store.js` (validação de cupom, ~linhas 666–675)
- Create: `v2-migrar-cupons.html`
- Test: `scripts/check-migracao-cupons-logic.js`

**Interfaces:**
- Consumes: coleção `cupons` existente (campos antigos possíveis:
  `valorMinimo`, `validade` em formato `YYYY-MM-DD`).
- Produces: mesmos documentos com `minimo` preenchido; `validade` continua
  existindo como extensão própria (mesmo espírito do campo `ordem` —
  decisão #3), lida pela loja para invalidar cupom expirado.

- [ ] **Step 1: Escrever `scripts/check-migracao-cupons-logic.js`** com
  `precisaMigrarCupom(c)` → `true` só quando `c.minimo === undefined &&
  c.valorMinimo !== undefined`. Casos: `{valorMinimo: 50}` → `true`;
  `{minimo: 50}` → `false`; `{}` → `false`.

- [ ] **Step 2: Rodar o script**

Expected: FAIL (função não existe).

- [ ] **Step 3: Implementar `precisaMigrarCupom` e escrever
  `v2-migrar-cupons.html`** (login padrão igual às outras ferramentas) —
  botão que itera `cupons`, aplica `.update({minimo: doc.data().valorMinimo
  ?? 0})` nos que `precisaMigrarCupom` identificar (sem remover
  `valorMinimo`, campo extra inofensivo). Botão "Verificar" conta quantos
  ainda faltam.

- [ ] **Step 4: Rodar o script**

Expected: OK (3 casos passam).

- [ ] **Step 5: Editar `admin.js` `formCupom`/`telas.cupons`** — adicionar
  campo `validade` (`<input type="date">`, opcional) ao formulário e à
  tabela (coluna "Validade", mostrando data formatada ou "—"); salvar
  `validade: d.validade || ""`.

- [ ] **Step 6: Editar `v2-js/store.js`** — na validação de cupom, tratar
  `c.validade && c.validade < isoDiaDeHoje()` como cupom inválido (mesma
  mensagem/ramo de "Cupom inválido.").

- [ ] **Step 7: Commit**

```bash
git add v2-js/admin.js v2-js/store.js v2-migrar-cupons.html scripts/check-migracao-cupons-logic.js
git commit -m "Fase 4 Task 4: migra cupons (valorMinimo -> minimo) e mantem validade"
```

- [ ] **Step 8: Verificação manual (pedir pra usuária)** — abrir
  `v2-migrar-cupons.html`, logar, migrar, clicar em Verificar (deve dar
  OK); testar um cupom na loja (válido) e, se possível, um com validade
  passada (deve recusar).

Expected: usuária confirma os dois comportamentos.

---

## Task 5: Relatórios — remover seções de Financeiro (fora de escopo)

**Files:**
- Modify: `v2-js/admin-relatorios.js`
- Test: `scripts/check-relatorios-sem-financeiro.js`

- [ ] **Step 1: Escrever `scripts/check-relatorios-sem-financeiro.js`** —
  falha se `admin-relatorios.js` ainda contiver `DB.contas`,
  `"rel-escopo"`, `despesasCat`, `projReceber` ou `abertoPagar`.

- [ ] **Step 2: Rodar o script**

Expected: FALHA.

- [ ] **Step 3: Editar `admin-relatorios.js`**:
  - Remover o `<select id="rel-escopo">` e seu `onchange`.
  - `gerar()`: tirar `DB.contas.listar()` do `Promise.all`.
  - `preparar(p, vendas, pedidos, contas, produtos, categorias)`: tirar o
    parâmetro `contas` e tudo que só existe por causa dele —
    `escopoOk`, `empresaOk`, `baixadasEntre`, `valorConta`, `despesasCat`,
    `projReceber`/`projPagar`/`semanas`, `abertoReceber`/`abertoPagar`/
    `vencidoPagar`, `contasPeriodo`.
  - `metricas()`: tirar `recebidas`, `saidas`, `despesasEmpresa`,
    `entradas`, `saldo`, `lucroLiquido` do retorno (ficam `receita`, `qtd`,
    `ticket`, `lucro`, `cobertura`).
  - `montar()`: remover as `<section>` "Fluxo de caixa", "Despesas por
    categoria" e "Projeção: contas em aberto", e os KPIs "Entradas",
    "Saídas", "Saldo do período", "Lucro após despesas", "A receber (em
    aberto)", "A pagar (em aberto)".
  - Remover o botão "CSV contas" e o ramo `exportar("contas")`.
  - Atualizar a lista "Como os números são calculados" tirando as linhas
    de Entradas/Saídas/Lucro após despesas.

- [ ] **Step 4: Rodar o script**

Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add v2-js/admin-relatorios.js scripts/check-relatorios-sem-financeiro.js
git commit -m "Fase 4 Task 5: relatorios remove secoes de financeiro (fora de escopo)"
```

- [ ] **Step 6: Verificação manual (pedir pra usuária)** — abrir
  Relatórios, confirmar que abre sem erro e mostra Receita, Vendas, Ticket
  médio, Lucro bruto, Formas de pagamento, Receita por categoria, Produtos
  mais vendidos e o mapa de calor de horários — sem nenhuma seção de
  Financeiro.

Expected: usuária confirma.

---

## Task 6: Configurações — preencher com a identidade visual atual

**Files:**
- Create: `v2-seed-config.html`
- Test: `scripts/check-seed-config-logic.js`

**Interfaces:**
- Consumes: `configuracoes/geral` (pode não existir, ou existir parcial —
  hoje `script.js` já lê esse documento com fallback para um `CONFIG_PADRAO`
  local: `nomeLoja: "Manejo Mix Pet Shop"`, `whatsapp: "5534988147596"`,
  `corPrimaria: "#D4A017"`, `corSecundaria: "#4A0E0E"`, `corDestaque:
  "#E8B923"`, `retiradaDias: [0,1,2,3,4,5,6]`, `retiradaHoraInicio:
  "08:00"`, `retiradaHoraFim: "18:00"`, `retiradaIntervalo: 60`).
- Produces: mesmo documento com `.set(faltantes, {merge: true})` — só os
  campos acima que ainda não existirem nele; nunca sobrescreve um valor já
  salvo.

- [ ] **Step 1: Escrever `scripts/check-seed-config-logic.js`** com
  `camposFaltantes(atual, padroes)` → objeto só com as chaves de `padroes`
  ausentes em `atual`. Casos: `atual = {}` → devolve todas; `atual =
  {corPrimaria: "#000000"}` → não inclui `corPrimaria`.

- [ ] **Step 2: Rodar o script**

Expected: FAIL.

- [ ] **Step 3: Implementar `camposFaltantes` e escrever
  `v2-seed-config.html`** (login padrão) — botão único: lê
  `configuracoes/geral`, calcula `camposFaltantes` contra os valores acima,
  grava com `.set(faltantes, {merge: true})`, lista no log quais campos
  foram gravados (ou "nenhum campo faltava" se já estava tudo preenchido).

- [ ] **Step 4: Rodar o script**

Expected: OK.

- [ ] **Step 5: Commit**

```bash
git add v2-seed-config.html scripts/check-seed-config-logic.js
git commit -m "Fase 4 Task 6: preenche configuracoes/geral com a identidade visual atual"
```

- [ ] **Step 6: Verificação manual (pedir pra usuária)** — abrir
  `v2-seed-config.html`, logar, rodar; depois abrir `v2-admin.html` →
  Configurações → Aparência e confirmar que as cores dourado/vinho já
  aparecem (não o roxo padrão do loja-online).

Expected: usuária confirma as cores certas.

---

## Task 7: Backfill de `id`/`vid` nos itens de pedidos e vendas antigos

**Files:**
- Create: `v2-migrar-itens.html`
- Test: `scripts/check-migracao-itens-logic.js`

**Interfaces:**
- Consumes: `pedidos`/`vendas` cujos `itens[]` estão no formato anterior
  (`{nome, preco, qtd, variacao?}`, sem `id`/`vid` — confirmado em
  `script.js:700` e `admin.html:1220`); lista de `produtos` atuais (para
  casar por nome).
- Produces: mesmos itens com `id` preenchido (casado por `nome`,
  comparação sem distinguir maiúsculas/minúsculas) quando houver produto
  correspondente, e `vid: ""` sempre; item sem correspondência fica com
  `id: null` (não quebra `DB.produtos.ajustarEstoque`, que já ignora um id
  inexistente sem lançar erro — só não baixa aquele item).

- [ ] **Step 1: Escrever `scripts/check-migracao-itens-logic.js`** com
  `casarItem(item, produtos)` → `{...item, id: produtoEncontrado?.id ??
  null, vid: ""}`, casando por `nome.trim().toLowerCase()`. Casos: item já
  com `id` → devolve sem alterar o `id` (idempotente, mas ainda garante
  `vid: ""`); nome casa com um produto da lista → ganha o `id` dele; nome
  não casa com nada → `id: null`.

- [ ] **Step 2: Rodar o script**

Expected: FAIL.

- [ ] **Step 3: Implementar `casarItem` e escrever
  `v2-migrar-itens.html`** (login padrão) — carrega `produtos`, itera
  `pedidos` e `vendas`; para cada doc cujos `itens` tenham algum item sem
  `id`, aplica `casarItem` em todos os itens do doc e `.update({itens:
  novosItens})`. Botão "Verificar" conta quantos documentos ainda têm item
  sem `id`.

- [ ] **Step 4: Rodar o script**

Expected: OK (3 casos passam).

- [ ] **Step 5: Commit**

```bash
git add v2-migrar-itens.html scripts/check-migracao-itens-logic.js
git commit -m "Fase 4 Task 7: preenche id/vid nos itens de pedidos e vendas antigos"
```

- [ ] **Step 6: Verificação manual (pedir pra usuária)** — abrir
  `v2-migrar-itens.html`, logar, migrar, Verificar (deve dar OK); depois,
  em Pedidos, abrir um pedido antigo e avançar o status para "Confirmado",
  conferindo na aba Estoque que o produto realmente teve o estoque
  baixado.

Expected: usuária confirma a baixa de estoque de ponta a ponta.

---

## Conclusão da Fase 4

Ao final: PDV, Cupons, Clientes, Pedidos, Relatórios e Configurações
funcionam contra os dados reais, sem depender de Financeiro/Fretes/Caixa/
Impressora (fora de escopo). Ainda falta:

- A regra do Firestore para a coleção `movimentos` (bloqueada pelo acesso
  da usuária ao Firebase Console da cliente — ver ledger da Fase 3).
- **No dia do corte final:** o `admin.html` antigo continua em produção até
  lá e pode gerar `pedidos`/`vendas`/`cupons` novos (ou editados) no formato
  antigo depois que as ferramentas desta fase já tiverem rodado. Antes de
  publicar a V2 em definitivo, rodar de novo: `v2-migrar-datas.html`,
  `v2-migrar-pedidos.html`, `v2-migrar-itens.html` e `v2-migrar-cupons.html`
  (todos seguros de rodar quantas vezes forem precisas).
- **Fase 5:** loja pública (`v2-index.html`/`v2-js/store.js`) adaptada
  (`ordem`-aware já herdado do Phase 2, confirmar cupom/validade da Task 4
  em produção), acompanhar pedido, e o corte final (publicar as regras
  novas do `regras.md`, trocar os arquivos em produção, horário de menor
  movimento).
