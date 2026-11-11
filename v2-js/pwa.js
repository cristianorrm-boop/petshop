// Registro do service worker e botão "Instalar app"
(function () {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    // escopo explícito "./v2-" — sem isso, o registro pega o escopo padrão
    // "/" e passa a controlar também o site atual (sw.js/sw-admin.js
    // registrados nesse mesmo escopo), apagando os caches dele.
    window.addEventListener("load", () => navigator.serviceWorker.register("v2-sw.js", { scope: "./v2-" }).catch(() => {}));
  }

  let evento = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evento = e;
    const b = document.getElementById("instalar");
    if (b) b.hidden = false;
  });
  document.addEventListener("click", async (e) => {
    if (!e.target.closest("#instalar") || !evento) return;
    evento.prompt();
    await evento.userChoice.catch(() => {});
    evento = null;
    document.getElementById("instalar").hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    const b = document.getElementById("instalar");
    if (b) b.hidden = true;
  });
})();
