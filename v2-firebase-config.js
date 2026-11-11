// Mesmo projeto Firebase do Manejo Mix (firebase-config.js atual) — reaproveitado
// aqui, só exportado também em window.firebaseConfig porque os arquivos v2-js/*
// (copiados do loja-online) esperam esse formato.
// (Estes valores são públicos; a segurança vem das regras do Firestore — veja regras.md.)
//
// TRAVA DA FASE 1: as páginas v2-* ainda não são pra valer (sem corte final,
// sem revisão completa) — mas se este arquivo for publicado no host de
// verdade (ex.: GitHub Pages/Hostinger, via o mesmo push que sobe o resto do
// projeto), qualquer um que abra v2-admin.html teria um admin completo e
// funcional escrevendo direto no banco real, sem nenhum aviso. Essa trava
// faz o Firebase inicializar com um projeto que não existe fora de
// localhost/arquivo local, então nenhuma leitura/escrita real acontece.
const USAR_PROJETO_REAL = (
  location.protocol === "file:" ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1"
);

const firebaseConfig = USAR_PROJETO_REAL
  ? {
      apiKey: "AIzaSyAlY_dxgGzb1pqcKRfZeeJr3LCFUDGvoWk",
      authDomain: "manejomix-930d1.firebaseapp.com",
      projectId: "manejomix-930d1",
      storageBucket: "manejomix-930d1.firebasestorage.app",
      messagingSenderId: "547364408961",
      appId: "1:547364408961:web:3f0873ae351e19ece90780",
    }
  : {
      apiKey: "v2-bloqueado-fora-de-localhost",
      authDomain: "v2-bloqueado.firebaseapp.com",
      projectId: "v2-bloqueado-nao-e-o-projeto-real",
      storageBucket: "v2-bloqueado.firebasestorage.app",
      messagingSenderId: "0",
      appId: "1:0:web:0",
    };

if (!USAR_PROJETO_REAL) {
  console.error(
    "v2-* ainda está em construção (Fase 1 da migração) e só funciona de verdade " +
    "em localhost ou aberto como arquivo local. Nesta origem (" + location.hostname + ") " +
    "ele está propositalmente desconectado do banco real."
  );
}

window.firebaseConfig = firebaseConfig;
