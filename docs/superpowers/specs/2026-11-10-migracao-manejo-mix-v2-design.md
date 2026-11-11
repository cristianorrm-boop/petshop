# Migração do Manejo Mix para a arquitetura loja-online (V2)

## Intenção e porquê

O Manejo Mix hoje já roda uma arquitetura "ra-suplementos" bastante completa para
o padrão da casa: tem Produtos, Categorias, Variações (como coleção `tiposVariacao`
separada, no modelo antigo), Cupons, Clientes (com dados de bichinho de estimação),
Pedidos Online (com checkout que grava pedido no Firestore e redireciona pro
WhatsApp), PDV com caixa, e Relatório. Mas a loja cresceu muito: já são 9 categorias
e 165+ produtos cadastrados, e a cliente (dona do pet shop) sentiu que a navegação
está "poluída" — muita categoria, muito produto, grade confusa.

A usuária (desenvolvedora) já migrou o RA Modas para a arquitetura "loja-online"
(mesma família de projeto que inspira este documento — ver
`ra-modas/docs/superpowers/specs/2026-10-29-migracao-loja-online-design.md`) e quer
repetir o processo aqui, parcialmente: reaproveitar a estrutura mais organizada e
os módulos de Dashboard e Estoque que o Manejo Mix ainda não tem, mas **sem puxar
tudo** que o loja-online oferece — a cliente já aprovou e vai pagar por essa
melhoria, mas o pacote contratado é mais enxuto que o do RA Modas.

Diferença importante em relação à migração do RA Modas: lá, os produtos antigos
foram descartados e recadastrados do zero (formato de variação incompatível,
pedidos antigos eram só dado de teste). Aqui a situação é diferente: os 165
produtos de ração (e demais categorias) já cadastrados são justamente o que a
usuária mais quer preservar — ela pediu explicitamente para aproveitar banco de
dados e imagens, "não recadastrar nada do que já fizemos". E os `pedidos`/`vendas`/
`clientes` do Manejo Mix são de uma loja de verdade em operação, não dado de teste
— por isso a abordagem aqui é de **migração in-place** (adaptar o que existe),
não de recomeço limpo como foi no RA Modas.

## Escopo deste projeto

- Projeto alvo: `Manejo Mix -Pet Shop` (pasta local, repositório Git próprio,
  remoto `petshop.git`).
- Espelho/fonte da arquitetura nova: `loja-online` (cópia local — **não deve ser
  alterada**, é só referência a copiar/adaptar), a mesma fonte usada no RA Modas.
- Banco de dados: reaproveitar o mesmo projeto Firebase do Manejo Mix (o atual),
  editando por cima. Não criar projeto novo.

### Módulos que ENTRAM (do catálogo completo do loja-online)

Produtos, Categorias, Variações, Cupons, Clientes, Pedidos Online, PDV (com leitor
de código de barras — a cliente tem o leitor físico e já perguntou sobre isso),
Relatórios, Configurações, **mais Dashboard e Estoque (módulos novos que o Manejo
Mix não tem hoje)**.

### Módulos que FICAM DE FORA (por enquanto)

- Impressora térmica/fiscal (`admin-impressao.js`) — a cliente não tem esse
  equipamento.
- Fretes (módulo de frete/entrega) — loja trabalha só com balcão/PDV e retirada,
  por ora.
- Financeiro (Contas a Pagar / Contas a Receber) — avaliado e descartado para
  esta rodada; pode entrar numa melhoria futura.
- **Abertura/fechamento de caixa no PDV.** O loja-online original exige abrir um
  "caixa" no início do dia e fechar no final (conferência de dinheiro), com toda
  venda amarrada a esse caixa. Avaliado e descartado: a cliente já está
  acostumada a vender direto, sem essa etapa, e isso não vai mudar agora. O PDV
  novo precisa ser adaptado pra vender sem exigir caixa aberto (diferença real
  em relação ao `admin-pdv.js` original do loja-online, que bloqueia a tela de
  venda até abrir caixa) — ver decisão #13.

## Decisões já tomadas (da conversa e do levantamento técnico)

1. **Migração in-place dos dados, não recomeço limpo.** Todas as coleções
   existentes (`produtos`, `categorias`, `cupons`, `clientes`, `pedidos`, `vendas`)
   são preservadas e adaptadas ao novo formato por cima, em vez de apagadas e
   recadastradas. É a diferença central em relação ao piloto do RA Modas.

2. **Produtos (165 já cadastrados)**: migram como produtos simples (sem lista de
   `variantes`), carregando `nome`, `categoria`, `preco`, `imagem` (mantém os
   caminhos `./assets/...` já usados, nada de recadastrar foto), `descricao`.
   Campos novos que o loja-online exige/usa, preenchidos com padrão sensato:
   `estoque: 0` (a cliente vai contar e lançar o estoque real depois, pela aba
   Estoque — é esperado que tudo apareça "zerado"/"estoque baixo" logo após a
   migração, não é bug), `codigo: null` (nenhum produto tem código de barras
   registrado ainda; ela vai escanear com o leitor físico aos poucos, pelo
   cadastro do produto ou pela aba Estoque), `estoqueMinimo: null` (usa o padrão
   do sistema até ela customizar), `ativo: true`, `destaque: false`,
   `precoAntigo`/`custo: null`.

3. **Campo `ordem` (categorias e produtos) é mantido como extensão própria.** O
   loja-online não usa um campo `ordem` armazenado (categoria usa `pai` pra
   subcategoria e nada mais; produto não tem ordem no schema padrão) — a
   ordenação cuidadosa que já foi feita a dedo neste catálogo (categoria por
   categoria, produto por produto, inclusive reordenando pra respeitar pedidos
   específicos da cliente) é importante demais pra perder. Then: mantemos
   `ordem` como campo adicional tanto em `categorias` quanto em `produtos`
   (Firestore não tem schema fixo, então isso é só adicionar o campo e fazer a
   vitrine/loja e o admin ordenarem por ele quando presente). Campo `pai`
   (subcategoria) do loja-online fica disponível mas não usado agora — todas as
   9 categorias atuais continuam no mesmo nível, sem hierarquia.

4. **Variações passam a viver dentro do cadastro de cada produto** (lista plana
   de variações, cada uma com seu próprio estoque e código de barras — modelo do
   loja-online), em vez de numa aba/coleção `tiposVariacao` separada como é hoje.
   Na prática, nenhum dos 165 produtos atuais usa variação de verdade (cada
   tamanho/sabor já é um produto próprio), então a migração não precisa converter
   nada — a funcionalidade só fica disponível pra ela usar daqui pra frente, em
   produtos que realmente tiverem variação (cor, tamanho etc).

5. **Clientes com dados de bichinho são preservados e estendidos, não
   recriados.** O formulário de cliente novo (baseado no do loja-online) ganha de
   volta os campos que já existem hoje: `aniversario`, `pet` (nome livre do
   bichinho) e `animais: { cachorro, gato, aves, roedores }` (quantidade por
   tipo) — os mesmos nomes de campo de hoje, pra não perder histórico dos
   clientes já cadastrados.

6. **Cupons**: formato é parecido o suficiente entre os dois sistemas (mesma
   decisão tomada no RA Modas) — reaproveitar a coleção existente, com ajuste de
   campo se necessário, em vez de recriar do zero.

7. **Pedidos e vendas**: ao contrário do RA Modas (onde o histórico era só
   teste), aqui `pedidos` e `vendas` são de clientes reais — são preservados.
   Pedidos/vendas antigos que não tiverem todo campo do novo formato continuam
   aparecendo nas telas (Pedidos Online, Relatórios) com os campos que não
   existirem tratados como vazio/zero, sem quebrar a tela.

8. **Configurações da loja**: a aba "Aparência" do admin novo é preenchida com o
   que já está configurado hoje (nome da loja, cores dourado/vinho, fonte), não
   com o valor padrão do loja-online. O banner novo (gerado com IA, no estilo do
   cartão de visita da cliente) entra por aqui quando estiver pronto.

9. **`firebase-config.js`**: hoje é `const firebaseConfig = {...}` (usado por
   `script.js`, `admin.html` e `seed-manejo-mix.html` via `const` global); o
   loja-online espera `window.firebaseConfig = {...}`. Ajuste técnico simples:
   adaptar o arquivo final pra expor dos dois jeitos (`const` + atribuição em
   `window`), sem quebrar nada que já lê `firebaseConfig` direto.

10. **Regras do Firestore**: trocar para as regras do loja-online
    (`emailsAdmin()` com lista de e-mails administradores), publicando no mesmo
    projeto Firebase, igual foi feito no RA Modas. E-mail administrador: o que
    já está cadastrado no Authentication do projeto do Manejo Mix hoje.

11. **`seed-manejo-mix.html` (script de importação em massa)**: continua
    existindo e sendo útil mesmo depois da migração — é a ferramenta que a
    usuária já domina pra cadastrar leva de produtos rapidamente. É adaptado pra
    gravar no novo formato (campos novos com os padrões da decisão #2), mas o
    fluxo de trabalho dela (colar descrição, eu cadastro, ela roda o botão)
    continua igual.

12. **Hospedagem**: mantém o mesmo destino de publicação que o Manejo Mix já usa
    hoje (push pro `petshop.git`); não é um ambiente mostrado a clientes em
    potencial como vitrine de venda (diferente do RA Modas), é o sistema real
    que a cliente já usa — então a troca precisa ser cuidadosa com o período em
    que o site pode ficar incompleto/quebrado no ar, evitando longas janelas de
    indisponibilidade durante o horário comercial dela.

13. **PDV sem caixa.** O PDV novo mantém o comportamento atual: venda direta, sem
    exigir abertura/fechamento de caixa. É uma adaptação deliberada em relação ao
    `admin-pdv.js` original do loja-online (que trava a tela de venda até abrir
    caixa) — aqui essa trava é removida, cada venda grava em `vendas` sem
    `caixaId` (ou com um valor fixo tipo `"sem-caixa"`), igual é hoje.

14. **Mapeamento do status de pedido (`atendido` boolean → `status` enum).** O
    loja-online usa `status: novo/confirmado/enviado/entregue/cancelado`, e mudar
    o status pela tela do admin é o que dispara baixa de estoque. Pra não gerar
    baixa de estoque indevida em produtos migrados com `estoque: 0`, a migração
    escreve o campo `status` **direto no banco** (sem passar pela lógica de
    transição da tela): pedido com `atendido: true` vira `status: "entregue"`
    (estado final, sem disparar nada); pedido com `atendido: false` vira
    `status: "novo"` (continua pendente — se a cliente avançar esse pedido
    depois pela tela nova, aí sim desconta do estoque real que ela já tiver
    lançado, que é o comportamento certo).

## Não-objetivos (fora do escopo deste projeto)

- Não mexer em nenhum outro projeto (RA Modas, Burger House, Comando Store,
  loja-online).
- Não incluir impressora térmica/fiscal, Fretes ou Financeiro (Contas a
  Pagar/Receber) nesta rodada.
- Não inventar código de barras pros produtos existentes — ficam em branco até a
  cliente escanear.
- Não converter/forçar os produtos existentes pro modelo de variações — eles
  entram como produtos simples.

## O que fica a critério de quem for construir

- Estrutura exata de arquivos/branch de trabalho (replicar a organização de
  arquivos do loja-online adaptada aos nomes/conteúdo do Manejo Mix).
- Ordem exata dos passos de implementação e como dividir em tarefas (isso é
  assunto do plano, não deste documento).
- Detalhes de UI que o loja-online já resolve bem (ex.: exato layout do
  Dashboard, da aba Estoque) — seguir o padrão do loja-online como está, sem
  reinventar.
- Janela de corte para publicar a V2 (ex.: horário de menor movimento da loja)
  — comunicar à usuária antes de publicar em definitivo, já que é sistema em uso
  real, não procedimento automático a decidir sozinho.

## Critério de sucesso

A usuária consegue abrir o Manejo Mix (loja + admin) rodando na estrutura nova,
com Dashboard e Estoque funcionando, PDV reconhecendo o leitor de código de
barras físico da cliente, todos os 165+ produtos e categorias existentes
visíveis e na ordem certa, e os clientes/pedidos/vendas antigos preservados e
visíveis no sistema novo — pronta pra mostrar pra cliente como a versão
definitiva, sem precisar recadastrar nada do que já foi feito.
