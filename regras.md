# Regras do Firestore — Manejo Mix Pet Shop

Copie o bloco abaixo e cole no Console do Firebase:

**Firestore Database → Regras** → apague o conteúdo atual → cole isto → **Publicar**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /produtos/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /categorias/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /cupons/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /configuracoes/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /vendas/{doc} {
      allow read, write: if request.auth != null;
    }

    match /pedidos/{doc} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    match /tiposVariacao/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /clientes/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## O que essas regras fazem

- **produtos, categorias, cupons, configuracoes, tiposVariacao**: qualquer visitante da loja pode *ler* (necessário para o site funcionar sem login), mas só usuários logados no admin podem *escrever* (criar, editar, excluir).
- **vendas**: dado sensível (faturamento) — só usuários logados podem ler ou escrever. Não é público.
- **pedidos**: histórico de pedidos feitos pelo site. Qualquer visitante pode *criar* um pedido (é o próprio cliente, no checkout, que grava), mas só o admin logado pode *ler, editar ou apagar* — sem essa restrição, qualquer pessoa poderia ver nome, telefone e endereço de todos os clientes que já compraram.
- **clientes**: cadastro de clientes da loja (nome, telefone, aniversário, pet) — dado sensível (dados pessoais), só o admin logado pode ler ou escrever. Não é público.

## Pré-requisito

Essas regras só funcionam depois de:
1. Criar o projeto no Firebase e preencher o `firebaseConfig` em `admin.html`.
2. Ativar **Authentication → Sign-in method → E-mail/senha**.
3. Criar o usuário admin em **Authentication → Users**.

Sem isso, `request.auth` nunca será preenchido e as escritas ficarão bloqueadas até o login por e-mail/senha estar configurado.
