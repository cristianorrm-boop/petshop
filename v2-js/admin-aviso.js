// Aviso de novo pedido do site: enquanto o painel estiver aberto no navegador (pode ficar em
// segundo plano), toca um som, mostra um aviso na tela, pisca o título da aba e, se permitido,
// envia uma notificação do navegador. Portado do admin-impressao.js do loja-online, sem a parte
// de impressora térmica (esta loja não tem esse equipamento).
window.Admin.modulos.push((A) => {
  const { $, toast } = A;
  const { moeda, esc } = DB;

  const area = document.createElement("div");
  area.id = "avisos-pedido"; area.className = "avisos-pedido"; area.setAttribute("aria-live", "assertive");
  document.body.appendChild(area);
  const titulo0 = document.title;
  let naoVistos = 0, pararEscuta = null, primeiraLeitura = true;
  const vistos = new Set();

  const bip = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      [[880, 0], [660, 0.22], [880, 0.44]].forEach(([f, at]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f; o.type = "sine"; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
        g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.18);
        o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.2);
      });
      setTimeout(() => ctx.close && ctx.close(), 900);
    } catch { /* navegador bloqueou o som */ }
  };
  const restaurarTitulo = () => { naoVistos = 0; document.title = titulo0; };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) restaurarTitulo(); });
  window.addEventListener("focus", restaurarTitulo);

  const mostrarBanner = (p) => {
    const el = document.createElement("div");
    el.className = "aviso-pedido";
    el.innerHTML = `
      <i class="fa-solid fa-bell"></i>
      <div class="ap-texto"><strong>Novo pedido pelo site!</strong>
        <span>#${esc(p.codigo)} · ${esc(p.cliente.nome)} · ${p.tipo === "entrega" ? "Entrega" : "Retirada"} · <b>${moeda(p.total)}</b></span></div>
      <div class="ap-acoes"><button type="button" class="btn peq" data-ap="ver">Ver pedido</button>
        <button type="button" class="ap-fechar" data-ap="fechar" aria-label="Fechar aviso">&times;</button></div>`;
    el.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-ap]");
      if (!b) return;
      if (b.dataset.ap === "ver") { el.remove(); await A.abrirTab("pedidos"); if (A.verPedido) A.verPedido(p.id); }
      if (b.dataset.ap === "fechar") el.remove();
    });
    area.prepend(el);
    while (area.children.length > 4) area.lastChild.remove(); // no máximo 4 avisos empilhados
  };

  const novoPedido = (p) => {
    const cfg = A.config || {};
    if (cfg.avisoPedidoSite === false) return;
    mostrarBanner(p);
    if (cfg.avisoSom !== false) bip();
    naoVistos++;
    if (document.hidden) document.title = `🔔 (${naoVistos}) Novo pedido! — ${titulo0}`;
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      try {
        const n = new Notification("Novo pedido pelo site", { body: `#${p.codigo} · ${p.cliente.nome} · ${moeda(p.total)}`, tag: "pedido-" + p.id, requireInteraction: true });
        n.onclick = () => { window.focus(); A.abrirTab("pedidos"); if (A.verPedido) A.verPedido(p.id); n.close(); };
      } catch { /* ignorado */ }
    }
  };

  const iniciarEscuta = () => {
    if (pararEscuta) return;
    primeiraLeitura = true;
    pararEscuta = DB.fs.collection("pedidos").where("status", "==", "novo").onSnapshot((snap) => {
      if (primeiraLeitura) {
        primeiraLeitura = false;
        snap.docs.forEach((d) => vistos.add(d.id));
        if (snap.size && (A.config || {}).avisoPedidoSite !== false) toast(`Você tem ${snap.size} pedido(s) novo(s) aguardando`);
        return;
      }
      snap.docChanges().forEach((ch) => {
        if (ch.type !== "added" || vistos.has(ch.doc.id)) return;
        vistos.add(ch.doc.id);
        novoPedido({ ...ch.doc.data(), id: ch.doc.id });
      });
      A.atualizarPill();
      if (!$("#tab-pedidos").hidden) A.abrirTab("pedidos"); // lista aberta: atualiza na hora
    }, (err) => console.error("escuta de pedidos:", err));
  };

  // ligações com o restante do painel (encadeia com o que outros módulos já registraram)
  const aoEntrarAnterior = A.aoEntrar;
  A.aoEntrar = async () => {
    if (aoEntrarAnterior) await aoEntrarAnterior();
    try { A.config = await DB.config.obter(); } catch { A.config = A.config || {}; }
    iniciarEscuta();
  };
  const aoSairAnterior = A.aoSair;
  A.aoSair = () => {
    if (aoSairAnterior) aoSairAnterior();
    if (pararEscuta) { pararEscuta(); pararEscuta = null; }
    vistos.clear(); area.innerHTML = ""; restaurarTitulo();
  };
  A.configMudou = (c) => { A.config = { ...(A.config || {}), ...c }; };
  A.avisoTeste = () => novoPedido({
    id: "teste", codigo: "TESTE123", criadoEm: new Date().toISOString(), tipo: "entrega", cliente: { nome: "Cliente de teste", telefone: "(00) 00000-0000" },
    endereco: "Rua de exemplo, 123", regiao: "Centro", itens: [{ nome: "Produto de exemplo", qtd: 1, preco: 10 }], subtotal: 10, desconto: 0, frete: 0, total: 10, pagamento: "PIX",
  });
});
