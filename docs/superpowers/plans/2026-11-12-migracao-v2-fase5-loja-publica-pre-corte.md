# Fase 5 (parte 1) — Loja pública: ordenação e modo de recebimento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a loja pública (`v2-index.html` + `v2-js/store.js`) respeitar o campo `ordem` (como admin/PDV já fazem) e sair da caixa com o modo de recebimento correto (só retirada/balcão), sem tocar em nada que dependa do Firebase Console (regras).

**Architecture:** Duas correções pontuais e independentes, em cima do código já existente (copiado do loja-online nas fases anteriores): (1) aplicar o comparador `compararPorOrdem` — já provado e usado em `v2-js/admin.js` e `v2-js/admin-pdv.js` — nos pontos de `v2-js/store.js` que hoje ordenam categorias/produtos sem olhar pro campo `ordem`; (2) estender os padrões que `v2-seed-config.html` grava em `configuracoes/geral` para incluir `entregaAtiva: false, retiradaAtiva: true`, reaproveitando a função `camposFaltantes` já existente nesse arquivo.

**Tech Stack:** JS puro (sem framework/bundler), Firestore (Firebase compat SDK), scripts Node standalone em `scripts/` pra provar lógica pura antes de colar no HTML/JS do navegador (mesmo padrão das Fases 2–4).

**Spec:** `docs/superpowers/specs/2026-11-10-migracao-manejo-mix-v2-design.md` — decisão #3 ("a vitrine/loja e o admin ordenarem [pelo campo `ordem`] quando presente") e a lista "Módulos que FICAM DE FORA" (Fretes — "loja trabalha só com balcão/PDV e retirada, por ora").

## Global Constraints

- Campo `ordem` é extensão própria (fora do schema padrão do loja-online); comparador padrão do projeto: `(a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || a.nome.localeCompare(b.nome, "pt-BR")` — não reinventar, reusar literalmente.
- Nenhuma mudança nesta fase pode exigir publicar regra nova no Firestore nem acesso ao Firebase Console — só leitura/gravação de coleções já liberadas hoje (`configuracoes`) ou lógica 100% client-side (`store.js`).
- `v2-seed-config.html` só grava campo que ainda não existir em `configuracoes/geral` (via `.set(faltantes, {merge:true})`) — nunca sobrescreve valor que a cliente já tenha salvo pelo admin.
- Sem framework de teste: provar lógica pura em script Node standalone (`scripts/check-*.js`) e depois copiar a mesma lógica pro arquivo do navegador, igual às fases anteriores.

## Review Focus

- Produto sem `ordem` misturado com produtos que têm `ordem`, dentro da mesma categoria da loja — comparador precisa jogar os sem-ordem pro final (`?? Infinity`), não quebrar nem jogar pro início.
- Categoria com subcategorias (campo `pai`) — a ordenação por `ordem` tem que valer tanto pra lista de categorias-raiz quanto pra lista de filhas de cada uma, senão a subcategoria fica "arrumada" mas a categoria-mãe não (ou vice-versa).
- Cliente que já configurou manualmente `entregaAtiva`/`retiradaAtiva` pelo admin (Configurações → Aparência) antes desta fase rodar — o seed não pode sobrescrever a escolha dela.
- Carrossel de destaques (`renderHome`) mistura produtos de categorias diferentes — ordenar por `ordem` sozinho pode intercalar "ordem:1" de categorias distintas; aceitável aqui (não é a listagem principal da categoria, é só o carrossel de destaque), mas o comportamento tem que ser determinístico (nunca a ordem "crua" do Firestore).
- `ordem` escolhido manualmente pelo cliente na loja (dropdown "Ordenar por: menor preço/maior preço/nome") precisa continuar funcionando exatamente como hoje — a mudança é só no desempate/ordem *padrão*, não nas opções explícitas de preço/nome.

---

### Task 1: Loja pública ordena categorias e produtos pelo campo `ordem`

**Files:**
- Modify: `v2-js/store.js:26-27` (`filhosDe`, `raizes`), `v2-js/store.js:174-176` (destaques em `renderHome`), `v2-js/store.js:256-262` (`ordenadores.destaque` em `renderGrid`)
- Create: `scripts/check-loja-ordenacao.js`

**Interfaces:**
- Consumes: comparador `compararPorOrdem` — mesma assinatura e corpo já provados em `scripts/check-ordenacao-logic.js` e colados em `v2-js/admin.js`/`v2-js/admin-pdv.js`: `(a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || a.nome.localeCompare(b.nome, "pt-BR")`.
- Produces: nada consumido por outra task desta fase.

- [ ] **Step 1: Escrever o teste (`scripts/check-loja-ordenacao.js`)**

Replicar `compararPorOrdem` (copiado literal de `scripts/check-ordenacao-logic.js`) e provar os três pontos de aplicação do Task:

```js
function compararPorOrdem(a, b) {
  return (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || a.nome.localeCompare(b.nome, "pt-BR");
}

// 1) categorias-raiz e subcategorias ordenadas por `ordem`, não pela ordem "crua" do array
const categorias = [
  { id: "c2", nome: "Gatos", ordem: 2 },
  { id: "c1", nome: "Cães", ordem: 1 },
  { id: "c1a", nome: "Ração filhote", ordem: 1, pai: "c1" },
  { id: "c1b", nome: "Ração adulto", ordem: 2, pai: "c1" },
];
const filhosDe = (id) => categorias.filter((c) => c.pai === id).sort(compararPorOrdem);
const raizes = () => categorias.filter((c) => !c.pai).sort(compararPorOrdem);

let falhas = 0;
function assert(cond, msg) { console.log(`${cond ? "OK" : "FALHOU"} — ${msg}`); if (!cond) falhas++; }

assert(raizes()[0].id === "c1" && raizes()[1].id === "c2", "categorias-raiz na ordem certa (Cães antes de Gatos)");
assert(filhosDe("c1")[0].id === "c1a" && filhosDe("c1")[1].id === "c1b", "subcategorias na ordem certa (filhote antes de adulto)");

// 2) destaque: dentro do grupo "é destaque", desempata por ordem (não pela ordem crua do Firestore)
const produtos = [
  { id: "p2", nome: "Ração B", destaque: true, ordem: 2 },
  { id: "p1", nome: "Ração A", destaque: true, ordem: 1 },
  { id: "p3", nome: "Brinquedo", destaque: false, ordem: 1 },
];
const comparadorDestaque = (a, b) => Number(b.destaque) - Number(a.destaque) || compararPorOrdem(a, b);
const ordenadosPorDestaque = [...produtos].sort(comparadorDestaque);
assert(ordenadosPorDestaque[0].id === "p1" && ordenadosPorDestaque[1].id === "p2", "dentro dos destaques, ordem:1 vem antes de ordem:2, mesmo chegando depois no array");
assert(ordenadosPorDestaque[2].id === "p3", "não-destaque sempre depois dos destaques");

// 3) produto sem `ordem` não quebra e vai pro final do grupo
const comOuSemOrdem = [{ id: "s", nome: "Sem ordem" }, { id: "x", nome: "Com ordem", ordem: 1 }];
const ordenado = [...comOuSemOrdem].sort(compararPorOrdem);
assert(ordenado[0].id === "x" && ordenado[1].id === "s", "produto sem ordem vai pro final, não quebra nem fica na frente");

if (falhas > 0) { console.log(`\nRESULTADO: ERRO — ${falhas} caso(s) falharam.`); process.exit(1); }
console.log("\nRESULTADO: OK — ordenação da loja pública (categorias, subcategorias e destaques) correta em todos os casos.");
```

- [ ] **Step 2: Rodar o teste**

Run: `node scripts/check-loja-ordenacao.js`
Expected: todas as linhas `OK`, `RESULTADO: OK` (arquivo autocontido — a lógica já está correta no script antes de tocar em `store.js`; este passo confirma a prova, a implementação real começa no Step 3).

- [ ] **Step 3: Colar a mesma lógica em `v2-js/store.js`**

No topo do arquivo (perto de `const chave = (i) => ...`, linha ~23), adicionar o comparador:

```js
// mesmo comparador de Produtos/Categorias e PDV (ordem é extensão própria, fora do schema
// padrão do loja-online) — sem isso a loja pública ordena categorias/produtos pela ordem
// "crua" do Firestore em vez de respeitar o número que a cliente escolheu.
const compararPorOrdem = (a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity) || a.nome.localeCompare(b.nome, "pt-BR");
```

Em `filhosDe`/`raizes` (linhas 26-27), acrescentar `.sort(compararPorOrdem)` ao resultado de cada filter. Em `renderHome` (onde `destaques` é montado, linhas ~174-176), ordenar a lista de destaques com `.sort((a, b) => Number(b.destaque) - Number(a.destaque) || compararPorOrdem(a, b))` antes do `.slice(0, qtd)`. Em `renderGrid`, no objeto `ordenadores` (linhas 256-262), trocar a entrada `destaque` para `(a, b) => Number(b.destaque) - Number(a.destaque) || compararPorOrdem(a, b)` — as entradas `menor`/`maior`/`nome` ficam exatamente como estão (são escolha explícita da cliente final na loja, não usam `ordem`).

- [ ] **Step 4: Verificar sintaxe**

Run: `node --check v2-js/store.js`
Expected: sem saída (sintaxe OK).

- [ ] **Step 5: Commit**

```bash
git add v2-js/store.js scripts/check-loja-ordenacao.js
git commit -m "Fase 5: loja publica ordena categorias/subcategorias/destaques pelo campo ordem"
```

---

### Task 2: Loja sai da caixa só com retirada (sem oferecer Entrega)

**Files:**
- Modify: `v2-seed-config.html` (objeto `PADROES_MANEJO_MIX`)

**Interfaces:**
- Consumes: `camposFaltantes(atual, padroes)` já existente em `v2-seed-config.html` — sem mudança de assinatura, só mais duas chaves no objeto `padroes` passado a ela.
- Produces: nada consumido por outra task desta fase.

- [ ] **Step 1: Atualizar o objeto de padrões em `v2-seed-config.html`**

Em `PADROES_MANEJO_MIX` (dentro do `<script>`, hoje com `nomeLoja`, `whatsapp`, cores e campos de retirada), adicionar:

```js
entregaAtiva: false,
retiradaAtiva: true,
```

Justificativa (decisão do design, não é escolha livre do implementador): a loja atende hoje só balcão/retirada — "Fretes" está fora do escopo desta migração — então a configuração padrão da loja nova não pode sair oferecendo "Entrega" por default; `v2-js/store.js` (`aplicarCheckout`) já lê esses dois campos e esconde/mostra a etapa de entrega de acordo, não precisa de nenhuma mudança lá.

- [ ] **Step 2: Verificar sintaxe**

HTML standalone não roda `node --check`; usar o helper de sintaxe reaproveitado das Fases 3/4 (copiar `check-html-script-syntax.js` do workspace desta fase, mesmo conteúdo).

Run: `node .superpowers/sdd/2026-11-12-migracao-v2-fase5-loja-publica-pre-corte/check-html-script-syntax.js v2-seed-config.html`
Expected: `Sintaxe OK: v2-seed-config.html`

- [ ] **Step 3: Confirmar visualmente que a lógica de "só grava o que falta" continua intacta**

Reler o trecho do botão `btnRodar` em `v2-seed-config.html` e confirmar que ele segue chamando `camposFaltantes(atual, PADROES_MANEJO_MIX)` sem nenhuma outra mudança — as duas chaves novas entram automaticamente no mesmo fluxo (só grava se `"entregaAtiva" in atual` for falso), sem precisar de código novo.
Expected: nenhuma edição adicional necessária além do Step 1.

- [ ] **Step 4: Commit**

```bash
git add v2-seed-config.html
git commit -m "Fase 5: loja nasce configurada so para retirada (Fretes fica fora do escopo)"
```

## Conclusão da Fase 5 (parte 1)

Depois destas duas tasks, a loja pública está pronta na parte que não depende do Firebase Console. Ainda ficam pendentes, **fora deste plano**, até a cliente confirmar acesso ao Console:

- Publicar as novas regras do Firestore (decisão #10 do design) — bloqueado até o acesso de amanhã.
- Reexecutar `v2-seed-config.html` (botão "Preencher identidade visual") pelo menos uma vez depois de publicar, pra gravar `entregaAtiva`/`retiradaAtiva` em produção (idempotente, pode rodar antes também, não depende da regra nova).
- Corte final: trocar os arquivos em produção (`index.html`/`admin.html` → versões `v2-*`), reexecutar as ferramentas de migração (`v2-migrar-datas.html`, `v2-migrar-pedidos.html`, `v2-migrar-itens.html`, `v2-migrar-cupons.html`) por causa de qualquer pedido/venda novo gravado pelo sistema antigo entre agora e o corte, e publicar numa janela de baixo movimento — a combinar com a cliente, nunca decidir a janela sozinho.
