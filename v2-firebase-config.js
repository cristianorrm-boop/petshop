// Mesmo projeto Firebase do Manejo Mix (firebase-config.js atual) — reaproveitado
// aqui, só exportado também em window.firebaseConfig porque os arquivos v2-js/*
// (copiados do loja-online) esperam esse formato.
// (Estes valores são públicos; a segurança vem das regras do Firestore — veja regras.md.)
const firebaseConfig = {
  apiKey: "AIzaSyAlY_dxgGzb1pqcKRfZeeJr3LCFUDGvoWk",
  authDomain: "manejomix-930d1.firebaseapp.com",
  projectId: "manejomix-930d1",
  storageBucket: "manejomix-930d1.firebasestorage.app",
  messagingSenderId: "547364408961",
  appId: "1:547364408961:web:3f0873ae351e19ece90780"
};
window.firebaseConfig = firebaseConfig;
