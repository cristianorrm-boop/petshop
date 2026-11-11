# Migração Manejo Mix V2 — Fase 3: Dashboard e Estoque — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar os dois módulos novos que a cliente pediu — Dashboard e
Estoque — funcionando contra os dados reais já migrados (165 produtos, 21
pedidos, histórico de vendas do PDV antigo), corrigindo primeiro um
problema de formato de data que, sem isso, deixa as duas telas com números
errados ou consultas que não retornam nada.

**Architecture:** `v2-js/admin.js` (`telas.dashboard`) e
`v2-js/admin-estoque.js` já vieram prontos da cópia crua do loja-online na
Fase 1 e **não deveriam precisar de nenhuma mudança de código** — o que os
impede de funcionar hoje é só o formato do campo `criadoEm` em `pedidos` e
`vendas` (ver Task 1). Depois de corrigido, esta fase é principalmente
**verificação**: confirmar que as duas telas realmente mostram os números
certos contra o banco de verdade, não construção de tela nova.

**Tech Stack:** HTML/CSS/JS puro, Firebase. Migração de dado no mesmo
padrão das Fases 1 (ferramenta HTML standalone com login, `.update()` só
nos campos que precisam mudar, verificação embutida na própria ferramenta
pra coleções admin-only-read).

**Spec:** `docs/superpowers/specs/2026-11-10-migracao-manejo-mix-v2-design.md`

## Global Constraints

- Nenhuma mudança nesta fase toca no site/admin público atual — só
  arquivos `v2-*` e a migração de dado roda contra o mesmo banco real já
  usado nas fases anteriores, sempre com ferramenta separada e `.update()`.
- `pedidos` e `vendas` são admin-only-read nas regras atuais (dado
  sensível) — toda verificação dessas duas coleções precisa rodar
  autenticada, dentro da própria ferramenta de migração, igual foi feito
  na Fase 1 com a migração de status de pedidos.
- Nenhum documento de `pedidos` ou `vendas` pode ter outro campo alterado
  além de `criadoEm` — é a mesma garantia de "só adiciona/corrige o que
  precisa" das fases anteriores.
- Dashboard e Estoque não dependem de PDV, Caixa ou Financeiro (nenhum dos
  dois módulos referencia essas coleções no código copiado — conferido);
  esta fase não cria nem adianta nada desses módulos, que são da Fase 4.

## Review Focus

- Um pedido ou venda cujo `criadoEm` já esteja em formato de texto (string
  ISO) — não deveria acontecer hoje, já que tudo foi criado com
  `serverTimestamp()`, mas a ferramenta de migração não pode quebrar nem
  duplicar trabalho se encontrar um assim (idempotência).
- Uma venda antiga sem o campo `status` (confirmado: nenhuma venda do PDV
  atual tem esse campo) não pode ser contada como cancelada nem sumir dos
  números do Dashboard.
- O gráfico "Vendas por dia" e a aba "Movimentações" do Estoque fazem
  consulta por intervalo de data (`listarEntre`, que compara strings) — se
  a migração do Task 1 deixar passar um documento sem corrigir, a consulta
  simplesmente não vai incluir aquele documento, sem erro nenhum aparecer
  — por isso a verificação do Task 1 precisa contar quantos documentos
  ficaram sem `criadoEm` corrigido, não só confirmar que "rodou sem erro".
- Um produto com `estoque` zerado (todos os 165 estão assim agora, já que
  a Fase 1 migrou com `estoque: 0` por padrão) vai aparecer inteiro na
  lista de "Estoque baixo" do Dashboard e na aba Itens do Estoque — isso é
  o comportamento esperado (ela ainda não lançou os números reais), não
  um bug a esconder.
- Rodar a migração do Task 1 duas vezes seguidas não pode gerar erro nem
  tentar converter de novo um documento que já está no formato novo.

---

## Task 1: Migrar `criadoEm` de `pedidos` e `vendas` (Timestamp → string ISO)

**Files:**
- Create: `v2-migrar-datas.html` (ferramenta standalone de migração, mesmo
  padrão de login de `seed-manejo-mix.html` / `v2-migrar-pedidos.html`)
- Test: `scripts/check-migracao-datas-logic.js`

**Interfaces:**
- Consumes: coleções `pedidos` (21 documentos) e `vendas` (quantidade a
  confirmar na hora, histórico do PDV antigo) já existentes, ambas com
  `criadoEm` gravado via `firebase.firestore.FieldValue.serverTimestamp()`
  (confirmado lendo `script.js:704` e `admin.html:1154,1229,1942` — é
  assim em todo o projeto atual, não só em pedidos).
- Produces: os mesmos documentos, com `criadoEm` convertido para string
  ISO (`"2026-01-15T14:30:00.000Z"`, formato que `v2-js/db.js:178`
  (`new Date().toISOString()`) e `v2-js/admin.js` (`dataBR`,
  `.localeCompare`) já esperam). Nenhum outro campo é tocado.

- [ ] **Step 1: Escrever `scripts/check-migracao-datas-logic.js`** com a
  função `precisaConverter(valor)` — recebe o valor bruto do campo
  `criadoEm` e retorna `true` só quando for um objeto com método
  `toDate` (characterístico do Firestore Timestamp do SDK compat) e
  `false` quando já for string. Casos de teste:
  - um objeto `{ toDate: () => new Date(...) }` (simula Timestamp) → `true`;
  - uma string ISO → `false`;
  - `null`/`undefined` → `false` (nada a converter, documento sem data —
    não deveria existir, mas não pode quebrar o script).

- [ ] **Step 2: Rodar `node scripts/check-migracao-datas-logic.js`**

Expected: os 3 casos passam.

- [ ] **Step 3: Escrever `v2-migrar-datas.html`** com login (mesmo padrão
  das outras ferramentas) e um botão que, para `pedidos` e depois
  `vendas`: itera `db.collection(nome).get()`, usa `precisaConverter`
  (copiada pro arquivo) pra pular documentos que já estão em string, e nos
  demais roda `.update({ criadoEm: doc.data().criadoEm.toDate().toISOString() })`.
  Um segundo botão "Verificar" (igual `v2-migrar-pedidos.html` fez pra
  `status`) itera as duas coleções de novo e reporta quantos documentos em
  cada uma ainda têm `criadoEm` em formato de Timestamp (não string) —
  essa contagem tem que chegar a zero depois de migrar.

- [ ] **Step 4: Commit**

```bash
git add v2-migrar-datas.html scripts/check-migracao-datas-logic.js
git commit -m "Fase 3 Task 1: adiciona migracao de criadoEm (Timestamp -> string ISO) em pedidos e vendas"
```

- [ ] **Step 5: Verificação manual (pedir pra usuária) — abrir
  `v2-migrar-datas.html` localmente, logar, clicar no botão de migrar e
  depois no de verificar.**

Expected: a usuária reporta a contagem de "ainda em formato antigo" indo a
zero, nas duas coleções.

---

## Task 2: Confirmar Dashboard contra dados reais

**Files:**
- Nenhuma mudança de código esperada em `v2-js/admin.js` (`telas.dashboard`,
  linhas 236-280) — esta task é verificação; só vira edição de código se a
  verificação do Step 2 encontrar um problema real.

**Interfaces:**
- Consumes: Task 1 (datas de `pedidos`/`vendas` já em string ISO —
  sem isso, "Receita hoje" e o gráfico "Vendas por dia" ficam incorretos
  silenciosamente, sem erro nenhum aparecer).

- [ ] **Step 1: Verificação manual (pedir pra usuária) — no mesmo acesso a
  `v2-admin.html`, abrir a aba Dashboard e conferir: os cartões de Receita
  total/hoje, Pedidos online, Vendas no PDV e Ticket médio aparecem com
  números (não "R$ NaN" nem vazios); a lista "Estoque baixo" aparece com
  produtos (esperado: a maioria, já que o estoque real ainda não foi
  lançado); o gráfico "Vendas por dia" desenha alguma coisa (mesmo que
  quase vazio, dependendo de quando os pedidos/vendas antigos aconteceram).**

Expected: usuária confirma que os números aparecem (não é preciso que
batam com nenhum valor específico — é a primeira vez que ela vê esse
Dashboard, o objetivo é só confirmar que não quebra e mostra dado real).

- [ ] **Step 2: Se a usuária reportar "R$ NaN", tela em branco, ou erro no
  console: usar superpowers:systematic-debugging** pra achar a causa raiz
  (provavelmente outro campo em formato inesperado, parecido com o
  `criadoEm` do Task 1) antes de alterar qualquer código.

---

## Task 3: Confirmar Estoque contra dados reais

**Files:**
- Nenhuma mudança de código esperada em `v2-js/admin-estoque.js` — mesma
  lógica da Task 2 (verificação, só vira edição se achar problema real).

**Interfaces:**
- Consumes: Task 1 (as sub-abas "Painel" e "Movimentações" do Estoque
  fazem consulta por intervalo de data em `vendas`/`pedidos`/`movimentos`
  via `listarEntre`, que só funciona com `criadoEm` em string ISO).

- [ ] **Step 1: Verificação manual (pedir pra usuária) — abrir a aba
  Estoque e conferir as 4 sub-abas: "Painel" (mostra algum gráfico/KPI,
  sem travar), "Itens" (lista os 165 produtos, todos com estoque 0 — é o
  esperado, ela ainda não lançou o estoque real), "Contagem" (abre sem
  erro) e "Movimentações" (lista vazia é esperado, já que nenhum ajuste de
  estoque foi feito ainda pelo sistema novo).**

Expected: usuária confirma que as 4 sub-abas abrem sem travar e mostram os
165 produtos na aba Itens.

- [ ] **Step 2: Pedir pra usuária testar UM ajuste de estoque de verdade**
  (ex.: lançar uma "entrada" de 10 unidades num produto qualquer, pela aba
  Itens) **e conferir que ele aparece na aba Movimentações logo em
  seguida, com a data certa (não "Invalid Date").**

Expected: usuária confirma o ajuste aparecendo corretamente, provando que
o fluxo de escrita nova (que já usa string ISO nativamente, sem depender
da migração do Task 1) funciona de ponta a ponta.

- [ ] **Step 3: Se algo quebrar: superpowers:systematic-debugging antes de
  alterar código.**

---

## Conclusão da Fase 3

Ao final: Dashboard e Estoque funcionam contra o catálogo e o histórico
reais, sem erro de formato de data. Ainda falta:

- **Fase 4:** PDV (sem caixa) + Cupons + Clientes (com pets) + Pedidos
  Online + Relatórios + Configurações. Nota pra essa fase: `telas.pedidos`
  (linha 286 de `admin.js`) ordena por `b.criadoEm.localeCompare(a.criadoEm)`
  — com o Task 1 desta fase já aplicado, isso deve funcionar sem ajuste
  extra, mas vale conferir de novo quando a aba Pedidos for a vez.
- **Fase 5:** Loja pública + acompanhar pedido + corte final.
