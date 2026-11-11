# Regras do Firestore — Manejo Mix Pet Shop (V2)

> **Atenção:** esta é a versão **para o dia do corte final** (Fase 5), feita
> aqui na Fase 1 só pra já deixar pronta. **Não publicar ainda** — publicar
> regras novas vale pro banco inteiro na hora, e o site/admin atuais ainda
> dependem das regras antigas (mais simples, sem `isAdmin()`/`emailsAdmin()`)
> até a migração terminar. A versão que está valendo hoje no Firebase
> Console continua sendo a anterior (ver histórico do git deste arquivo)
> até o corte.

Copie o bloco abaixo e cole no Console do Firebase (quando chegar a hora):

**Firestore Database → Regras** → apague o conteúdo atual → cole isto → **Publicar**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // E-mails com acesso de administrador (cadastre o mesmo e-mail em Authentication → Users).
    // Confirmado real (login visto em uso): manejomix@gmail.com.
    function emailsAdmin() {
      return ['manejomix@gmail.com'];
    }

    function isAdmin() {
      return request.auth != null
        && request.auth.token.email != null
        && request.auth.token.email.lower() in emailsAdmin();
    }

    match /produtos/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /categorias/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /cupons/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /configuracoes/{doc} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Formato antigo de variação (coleção de "tipos"), substituído pela lista de
    // variações dentro do próprio produto (ver decisão #4 da spec). Mantida
    // bloqueada por padrão — não é mais usada depois da Fase 2.
    match /tiposVariacao/{doc} {
      allow read, write: if false;
    }

    // Consulta pública do cliente: só por código (get). Listar é do admin.
    // Não guarda telefone nem endereço.
    match /acompanhamento/{codigo} {
      allow get: if true;
      allow list: if isAdmin();
      allow create: if isAdmin()
                    || (request.resource.data.status == 'novo'
                        && request.resource.data.codigo == codigo
                        && codigo.size() >= 8 && codigo.size() <= 12);
      allow update, delete: if isAdmin();
    }

    // Gestão interna (PDV e relatórios): só administrador. Sem coleção de
    // caixa — o PDV do Manejo Mix vende direto, sem abrir/fechar caixa
    // (decisão #13 da spec).
    match /vendas/{doc} {
      allow read, write: if isAdmin();
    }

    // Histórico de ajustes de estoque (entrada/saída/ajuste/venda/pedido),
    // gravado dentro da mesma transação que atualiza o estoque do produto.
    match /movimentos/{doc} {
      allow read, write: if isAdmin();
    }

    match /clientes/{doc} {
      allow read, write: if isAdmin();
    }

    match /pedidos/{doc} {
      allow create: if request.resource.data.codigo == doc
                    && request.resource.data.keys().hasAll(['itens', 'total', 'tipo', 'cliente', 'status', 'codigo'])
                    && request.resource.data.status == 'novo'
                    && request.resource.data.itens is list
                    && request.resource.data.itens.size() > 0
                    && request.resource.data.itens.size() <= 50
                    && request.resource.data.total is number
                    && request.resource.data.total >= 0;
      allow read, update, delete: if isAdmin();
    }
  }
}
```

## O que mudou em relação às regras atuais

- Troca de `request.auth != null` (qualquer usuário logado) para `isAdmin()`
  (usuário logado **e** com e-mail na lista `emailsAdmin()`) — mesmo padrão
  usado no RA Modas depois da migração dele.
- `tiposVariacao` passa de liberada-para-admin para **bloqueada** (ninguém
  lê nem escreve) — a funcionalidade de variação continua existindo, só que
  dentro do próprio documento do produto, não numa coleção separada.
- Nova coleção `acompanhamento` (consulta pública de pedido por código) —
  recurso que o Manejo Mix não tinha antes, veio junto por já fazer parte da
  arquitetura do loja-online copiada na Fase 1.
- A regra de criação de `pedidos` passa a exigir o formato novo
  (`itens`/`total`/`tipo`/`cliente`/`status`/`codigo`) em vez de aceitar
  qualquer formato — só funciona depois que o checkout do site for
  reescrito nesse formato (Fase 5). Publicar essas regras antes da Fase 5
  quebraria o checkout atual.
- Sem coleções de `fretes`, `caixas` ou `contas` — módulos fora do escopo
  desta V2 (spec, módulos que ficam de fora).

## Pré-requisito antes de publicar (Fase 5)

1. ~~Confirmar o e-mail administrador real~~ — confirmado: `manejomix@gmail.com`.
2. Confirmar que o checkout do site (Fase 5) já grava pedidos no formato
   novo antes de publicar — senão nenhum pedido novo consegue ser criado.
