// PDV (frente de caixa): venda direta e vendas do dia — sem caixa (a loja não abre/fecha caixa) e sem
// pagamento a prazo (gera conta a receber, módulo de Financeiro fora de escopo desta rodada).
window.Admin.modulos.push((A) => {
  const { $, toast, tentar, abrirModal, fecharModal, carregando, dataBR } = A;
  const { moeda, esc } = DB;

  const FORMAS = ["Dinheiro", "PIX", "Cartão de Débito", "Cartão de Crédito"];
  const ICONE = { Dinheiro: "fa-money-bill-wave", PIX: "fa-qrcode", "Cartão de Débito": "fa-credit-card", "Cartão de Crédito": "fa-credit-card" };

  let sub = "venda"; // venda | vendas
  let produtos = [], categorias = [];
  let cart = [];     // { id, vid, nome, variante, preco, custo, qtd }
  let desconto = { tipo: "valor", valor: 0 };
  let cliente = "", clienteId = "", clientes = [];
  let formaRapida = ""; // forma de pagamento escolhida na tela da venda (antes de abrir o recebimento)
  let catAtiva = "all", termo = "";
  let diaVendas = "";

  const pad = (n) => String(n).padStart(2, "0");
  const isoDia = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const arred = (v) => Math.round(v * 100) / 100;
  const temVariantes = (p) => Array.isArray(p.variantes) && p.variantes.length > 0;
  const estoqueDe = (p, vid) => (temVariantes(p) ? (p.variantes.find((v) => v.id === vid)?.estoque ?? 0) : p.estoque);
  const chave = (i) => i.id + "|" + i.vid;
  const nomeItem = A.nomeItem;

  // ---------- Cálculos da venda ----------
  const totais = () => {
    const subtotal = arred(cart.reduce((s, i) => s + i.preco * i.qtd, 0));
    const bruto = desconto.tipo === "percentual" ? subtotal * (desconto.valor || 0) / 100 : desconto.valor || 0;
    const desc = arred(Math.min(subtotal, Math.max(0, bruto)));
    return { subtotal, desconto: desc, total: arred(subtotal - desc) };
  };

  // ---------- Estrutura da tela ----------
  A.telas.pdv = async () => {
    carregando("pdv");
    [produtos, categorias, clientes] = await Promise.all([DB.produtos.listar(), DB.categorias.listar(), DB.clientes.listar()]);
    desenharBase();
  };

  const desenharBase = () => {
    $("#tab-pdv").innerHTML = `
      <div class="cab"><h1>PDV</h1>
        <div class="seg" id="pdv-sub">
          ${[["venda", "Venda"], ["vendas", "Vendas"]].map(([k, n]) => `<button type="button" data-sub="${k}" class="${k === sub ? "ativo" : ""}">${n}</button>`).join("")}
        </div>
      </div>
      <div id="pdv-corpo"></div>`;
    $("#pdv-sub").onclick = (e) => {
      const b = e.target.closest("[data-sub]");
      if (!b) return;
      sub = b.dataset.sub;
      document.querySelectorAll("#pdv-sub button").forEach((x) => x.classList.toggle("ativo", x === b));
      desenharSub();
    };
    desenharSub();
  };
  const desenharSub = () => ({ venda: telaVenda, vendas: telaVendas })[sub]();

  // ---------- Sub-aba: Venda ----------
  const telaVenda = () => {
    $("#pdv-corpo").innerHTML = `
      <div class="pdv">
        <div class="pdv-cat">
          <div class="pdv-topo">
            <input id="pdv-busca" placeholder="Buscar produto ou ler código de barras (F2)" autocomplete="off" />
            <button type="button" class="btn sec" id="pdv-camera" title="Ler código de barras ou SKU com a câmera"><i class="fa-solid fa-camera"></i> <span class="rot">Câmera</span></button>
            <button type="button" class="btn" id="pdv-novo-produto" title="Cadastrar um produto agora"><i class="fa-solid fa-box-open"></i> <span class="rot">Novo produto</span></button>
          </div>
          <div class="chips-adm" id="pdv-chips"></div>
          <div class="pdv-grid" id="pdv-produtos"></div>
        </div>
        <aside class="pdv-cart">
          <h3>Venda atual</h3>
          <div class="pdv-cli">
            <input id="pdv-cliente" list="pdv-clientes" placeholder="Cliente (opcional)" value="${esc(cliente)}" autocomplete="off" />
            <datalist id="pdv-clientes">${clientes.map((c) => `<option value="${esc(c.nome)}">`).join("")}</datalist>
            <button type="button" class="btn sec" id="pdv-novo-cliente" title="Cadastrar um cliente agora"><i class="fa-solid fa-user-plus"></i></button>
          </div>
          <small class="dica" id="pdv-cli-info"></small>
          <div class="pdv-itens" id="pdv-itens"></div>
          <div class="pdv-desc"><span>Desconto</span>
            <input id="pdv-desc-valor" type="number" min="0" step="0.01" value="${desconto.valor || ""}" placeholder="0" />
            <select id="pdv-desc-tipo"><option value="valor" ${desconto.tipo === "valor" ? "selected" : ""}>R$</option><option value="percentual" ${desconto.tipo === "percentual" ? "selected" : ""}>%</option></select>
          </div>
          <div class="pdv-totais" id="pdv-totais"></div>
          <div class="pdv-formas" id="pdv-formas">
            <span class="pdv-formas-rot">Forma de pagamento</span>
            <div class="pdv-formas-grade" role="radiogroup" aria-label="Forma de pagamento">
              ${FORMAS.map((f) => `<button type="button" class="pdv-forma ${f === formaRapida ? "ativo" : ""}" data-forma-rapida="${esc(f)}" role="radio" aria-checked="${f === formaRapida}"><i class="fa-solid ${ICONE[f]}"></i> ${esc(f)}</button>`).join("")}
            </div>
          </div>
          <button class="btn grande" id="pdv-receber"><i class="fa-solid fa-sack-dollar"></i> Receber (F4)</button>
          <button class="btn sec" id="pdv-limpar">Limpar venda</button>
        </aside>
      </div>`;

    $("#pdv-busca").value = termo;
    $("#pdv-busca").oninput = (e) => { termo = e.target.value; desenharProdutos(); };
    $("#pdv-busca").onkeydown = (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const t = termo.trim();
      if (!t) return;
      const achado = acharPorCodigo(t);
      if (achado) {
        if (achado.vid) adicionar(achado.p, achado.vid); else escolher(achado.p);
        termo = ""; e.target.value = ""; desenharProdutos();
        return;
      }
      const alvo = filtrados().length === 1 ? filtrados()[0] : null;
      if (!alvo) return toast("Produto não encontrado");
      escolher(alvo);
      termo = ""; e.target.value = ""; desenharProdutos();
    };
    $("#pdv-cliente").oninput = (e) => { cliente = e.target.value; const c = clientes.find((x) => x.nome.toLowerCase() === cliente.trim().toLowerCase()); clienteId = c ? c.id : ""; infoCliente(); };
    $("#pdv-novo-cliente").onclick = () => A.formCliente(null, (novo) => definirCliente(novo), { nome: cliente });
    $("#pdv-novo-produto").onclick = () => produtoRapido();
    $("#pdv-camera").onclick = abrirCamera;
    infoCliente();
    $("#pdv-desc-valor").oninput = (e) => { desconto.valor = parseFloat(e.target.value) || 0; desenharTotais(); };
    $("#pdv-desc-tipo").onchange = (e) => { desconto.tipo = e.target.value; desenharTotais(); };
    $("#pdv-receber").onclick = receber;
    $("#pdv-formas").onclick = (e) => {
      const b = e.target.closest("[data-forma-rapida]");
      if (!b) return;
      formaRapida = formaRapida === b.dataset.formaRapida ? "" : b.dataset.formaRapida; // clicar de novo desmarca
      document.querySelectorAll("[data-forma-rapida]").forEach((x) => {
        const on = x.dataset.formaRapida === formaRapida;
        x.classList.toggle("ativo", on); x.setAttribute("aria-checked", String(on));
      });
      desenharTotais();
    };
    $("#pdv-limpar").onclick = () => { if (cart.length && !confirm("Limpar a venda atual?")) return; novaVenda(); telaVenda(); };
    $("#pdv-chips").onclick = (e) => { const b = e.target.closest("[data-cat]"); if (b) { catAtiva = b.dataset.cat; desenharChips(); desenharProdutos(); } };
    $("#pdv-produtos").onclick = (e) => { const b = e.target.closest("[data-pid]"); if (b) escolher(produtos.find((p) => p.id === b.dataset.pid)); };
    $("#pdv-itens").onclick = (e) => {
      const m = e.target.closest("[data-mais]"), n = e.target.closest("[data-menos]"), r = e.target.closest("[data-rem]");
      const alvo = (b, attr) => b && cart.find((i) => chave(i) === b.getAttribute(attr));
      if (alvo(m, "data-mais")) alterarQtd(alvo(m, "data-mais"), 1);
      if (alvo(n, "data-menos")) alterarQtd(alvo(n, "data-menos"), -1);
      if (alvo(r, "data-rem")) { cart = cart.filter((i) => i !== alvo(r, "data-rem")); desenharCarrinho(); }
    };
    $("#pdv-itens").onchange = (e) => {
      const inp = e.target.closest("[data-qtd]");
      if (!inp) return;
      const item = cart.find((i) => chave(i) === inp.dataset.qtd);
      if (item) alterarQtd(item, (parseInt(inp.value, 10) || 1) - item.qtd);
    };
    desenharChips(); desenharProdutos(); desenharCarrinho();
    $("#pdv-busca").focus();
  };

  const filtrados = () => {
    const t = termo.trim().toLowerCase();
    return produtos.filter((p) =>
      (catAtiva === "all" || p.categoria === catAtiva) &&
      (!t || (p.nome + " " + (p.codigo || "") + " " + (p.variantes || []).map((v) => v.codigo || "").join(" ")).toLowerCase().includes(t)));
  };
  const desenharChips = () => {
    $("#pdv-chips").innerHTML = `<button type="button" data-cat="all" class="${catAtiva === "all" ? "ativo" : ""}">Todos</button>` +
      categorias.map((c) => `<button type="button" data-cat="${esc(c.id)}" class="${catAtiva === c.id ? "ativo" : ""}">${esc(c.nome)}</button>`).join("");
  };
  const desenharProdutos = () => {
    const lista = filtrados().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    $("#pdv-produtos").innerHTML = lista.map((p) => `
      <button type="button" class="pdv-card ${p.estoque <= 0 ? "sem" : ""}" data-pid="${p.id}">
        <img src="${esc(p.imagem || DB.placeholder("📦", "#e5e7eb"))}" alt="" />
        <strong>${esc(p.nome)}</strong>
        <span>${moeda(p.preco)}</span>
        <small>${p.estoque <= 0 ? "Sem estoque" : `${p.estoque} em estoque`}${temVariantes(p) ? " · variações" : ""}</small>
      </button>`).join("") || `<p class="vazio">Nenhum produto.</p>`;
  };
  const desenharCarrinho = () => {
    $("#pdv-itens").innerHTML = cart.map((i) => `
      <div class="pdv-item">
        <div class="pi-nome"><strong>${esc(i.nome)}</strong>${i.variante ? `<small>${esc(i.variante)}</small>` : ""}<small>${moeda(i.preco)} un.</small></div>
        <div class="pi-qtd"><button type="button" data-menos="${esc(chave(i))}">−</button>
          <input type="number" min="1" value="${i.qtd}" data-qtd="${esc(chave(i))}" aria-label="Quantidade" />
          <button type="button" data-mais="${esc(chave(i))}">+</button></div>
        <div class="pi-total">${moeda(i.preco * i.qtd)}</div>
        <button type="button" class="rem-var" data-rem="${esc(chave(i))}" aria-label="Remover">&times;</button>
      </div>`).join("") || `<p class="dica" style="padding:14px 0;text-align:center">Nenhum item. Clique em um produto ou leia o código de barras.</p>`;
    desenharTotais();
  };
  const desenharTotais = () => {
    const t = totais();
    $("#pdv-totais").innerHTML = `
      <div><span>Subtotal</span><span>${moeda(t.subtotal)}</span></div>
      ${t.desconto ? `<div><span>Desconto</span><span>- ${moeda(t.desconto)}</span></div>` : ""}
      <div class="grande"><span>Total</span><span>${moeda(t.total)}</span></div>`;
    $("#pdv-receber").disabled = cart.length === 0;
    $("#pdv-receber").innerHTML = `<i class="fa-solid fa-sack-dollar"></i> Receber (F4)${formaRapida ? ` — ${esc(formaRapida)}` : ""}`;
  };

  const novaVenda = () => { cart = []; desconto = { tipo: "valor", valor: 0 }; cliente = ""; clienteId = ""; formaRapida = ""; };

  // ---------- Cliente e produto cadastrados na hora ----------
  const infoCliente = () => {
    const el = $("#pdv-cli-info");
    if (!el) return;
    const nome = cliente.trim();
    el.textContent = !nome ? "" : clienteId ? "Cliente cadastrado." : "Nome avulso (não cadastrado). Use o botão para cadastrar.";
    el.style.color = clienteId ? "var(--ok)" : "var(--suave)";
  };
  // seleciona o cliente na venda; `soEstado` evita mexer na tela quando chamado de dentro do recebimento
  const definirCliente = (c, soEstado) => {
    if (!clientes.some((x) => x.id === c.id)) clientes.push(c);
    cliente = c.nome; clienteId = c.id;
    const inp = $("#pdv-cliente");
    if (inp) inp.value = c.nome;
    const dl = $("#pdv-clientes");
    if (dl) dl.innerHTML = clientes.map((x) => `<option value="${esc(x.nome)}">`).join("");
    infoCliente();
  };

  // ---------- código de barras / SKU ----------
  const normCodigo = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "");
  const semZeros = (s) => s.replace(/^0+(?=\d)/, "");
  const acharPorCodigo = (texto) => {
    const alvo = normCodigo(texto);
    if (!alvo) return null;
    const igual = (c) => { const x = normCodigo(c); return !!x && (x === alvo || (/^\d+$/.test(x) && /^\d+$/.test(alvo) && semZeros(x) === semZeros(alvo))); };
    for (const p of produtos) {
      if (igual(p.codigo)) return { p, vid: "" };
      const v = (p.variantes || []).find((x) => igual(x.codigo));
      if (v) return { p, vid: v.id };
    }
    return null;
  };
  // chamado pelo leitor de câmera a cada código lido
  const lerCodigo = (codigo) => {
    const achado = acharPorCodigo(codigo);
    if (!achado) return { manter: true, erro: `Código ${codigo} não cadastrado`, acao: { texto: "Cadastrar produto com este código", fn: () => produtoRapido(codigo) } };
    const { p, vid } = achado;
    if (temVariantes(p) && !vid) { setTimeout(() => escolher(p), 0); return { manter: false, ok: `${p.nome}: escolha a variação` }; }
    const nome = p.nome + (vid ? " — " + p.variantes.find((v) => v.id === vid).nome : "");
    return adicionar(p, vid) ? { manter: true, ok: `${nome} adicionado` } : { manter: true, erro: `${nome}: sem estoque suficiente` };
  };
  const abrirCamera = () => {
    if (!A.scanner.suportado()) return toast("Este navegador não permite usar a câmera. Digite o código na busca ou use um leitor USB.");
    A.scanner.abrir({ titulo: "Ler código de barras / SKU", aoLer: lerCodigo });
  };

  const produtoRapido = (codigoInicial = "") => {
    abrirModal("Novo produto", `
      <label>Nome<input name="nome" required autocomplete="off" /></label>
      <div class="grid2">
        <label>Código de barras / SKU<span class="campo-scan"><input name="codigo" autocomplete="off" value="${esc(codigoInicial)}" /><button type="button" class="btn sec" id="rapido-scan" title="Ler com a câmera" aria-label="Ler código com a câmera"><i class="fa-solid fa-camera"></i></button></span></label>
        <label>Categoria<select name="categoria"><option value="">Sem categoria</option>${categorias.map((c) => `<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join("")}</select></label>
      </div>
      <div class="grid2">
        <label>Preço de venda (R$)<input name="preco" type="number" min="0" step="0.01" required /></label>
        <label>Custo (R$) — opcional<input name="custo" type="number" min="0" step="0.01" /></label>
      </div>
      <label>Estoque inicial<input name="estoque" type="number" min="0" step="1" value="1" required /></label>
      <label class="check"><input type="checkbox" name="add" checked /> Adicionar à venda atual</label>
      <p class="dica">Cadastro rápido. Foto, descrição e variações podem ser completadas depois em Produtos.</p>`,
      async (d) => {
        const nome = d.nome.trim(), codigo = d.codigo.trim(), preco = parseFloat(d.preco);
        if (!nome || !(preco >= 0)) return false;
        if (codigo && produtos.some((p) => (p.codigo || "").toLowerCase() === codigo.toLowerCase())) { toast("Já existe um produto com esse código"); return false; }
        let novo = null;
        const ok = await tentar(async () => {
          novo = await DB.produtos.salvar({
            nome, codigo, categoria: d.categoria, preco, precoAntigo: 0, custo: d.custo === "" ? null : parseFloat(d.custo),
            estoque: Math.max(0, parseInt(d.estoque, 10) || 0), descricao: "", imagem: DB.placeholder("📦", "#e5e7eb"),
            destaque: false, ativo: true, variantes: [],
          });
        });
        if (!ok) return false;
        produtos.push(novo);
        await tentar(() => DB.movimentos.registrar(novo, "", 0, novo.estoque, { tipo: "entrada", motivo: "Estoque inicial (cadastro rápido no PDV)" }));
        toast("Produto cadastrado");
        setTimeout(() => { desenharProdutos(); if (d.add === "on") adicionar(novo, ""); }, 0);
      }, { salvar: "Cadastrar produto" });
    $("#rapido-scan").onclick = () => {
      if (!A.scanner.suportado()) return toast("Este navegador não permite usar a câmera.");
      A.scanner.abrir({ titulo: "Ler código do produto", aoLer: (c) => { $("#modal-form").elements.codigo.value = c; return { manter: false, ok: `Código ${c} lido` }; } });
    };
  };

  const escolher = (p) => {
    if (!p) return;
    if (temVariantes(p)) {
      abrirModal(`${p.nome} — escolha a opção`, `
        <div class="variantes-pdv">${p.variantes.map((v) => `
          <label class="var ${v.estoque <= 0 ? "off" : ""}"><input type="radio" name="vid" value="${esc(v.id)}" ${v.estoque <= 0 ? "disabled" : ""} /><span>${esc(v.nome)} <small>(${v.estoque})</small></span></label>`).join("")}</div>`,
        (d) => { if (!d.vid) { toast("Escolha uma opção"); return false; } adicionar(p, d.vid); }, { salvar: "Adicionar" });
      return;
    }
    adicionar(p, "");
  };
  const adicionar = (p, vid) => {
    const disponivel = estoqueDe(p, vid);
    const existente = cart.find((i) => i.id === p.id && i.vid === vid);
    if ((existente ? existente.qtd : 0) + 1 > disponivel) { toast(disponivel <= 0 ? "Produto sem estoque" : `Estoque disponível: ${disponivel}`); return false; }
    if (existente) existente.qtd++;
    else cart.push({ id: p.id, vid, nome: p.nome, variante: vid ? p.variantes.find((v) => v.id === vid).nome : "", preco: p.preco, custo: p.custo ?? null, qtd: 1 });
    desenharCarrinho();
    return true;
  };
  const alterarQtd = (item, delta) => {
    const p = produtos.find((x) => x.id === item.id);
    const nova = item.qtd + delta;
    if (nova <= 0) cart = cart.filter((i) => i !== item);
    else if (p && nova > estoqueDe(p, item.vid)) { toast(`Estoque disponível: ${estoqueDe(p, item.vid)}`); }
    else item.qtd = nova;
    desenharCarrinho();
  };

  // ---------- Recebimento ----------
  const rotuloPagamento = (p) => p.forma;

  const receber = () => {
    if (!cart.length) return toast("Adicione itens à venda");
    const t = totais();
    if (t.total <= 0) return toast("Total da venda deve ser maior que zero");
    let pags = [];       // { forma, valor (aplicado na venda), recebido }
    let forma = formaRapida || "Dinheiro";
    // PIX e cartões: o valor total já entra lançado, basta concluir (dá para remover e dividir o pagamento)
    if (["PIX", "Cartão de Débito", "Cartão de Crédito"].includes(formaRapida)) pags.push({ forma: formaRapida, valor: t.total, recebido: t.total });
    const pago = () => arred(pags.reduce((s, p) => s + p.valor, 0));
    const restante = () => arred(t.total - pago());
    const troco = () => arred(pags.reduce((s, p) => s + (p.recebido - p.valor), 0));

    // ----- painel da forma escolhida -----
    const painel = () => {
      const falta = restante();
      if (forma === "Dinheiro") return `
        <div class="grid2">
          <label>Valor recebido do cliente (R$)<input type="number" id="pg-valor" min="0.01" step="0.01" value="${falta.toFixed(2)}" /></label>
          <div class="pg-troco"><span>Troco a devolver</span><strong id="pg-troco">${moeda(0)}</strong></div>
        </div>
        <button type="button" class="btn" id="pg-add"><i class="fa-solid fa-plus"></i> Adicionar dinheiro</button>`;
      return `
        <label>Valor no ${esc(forma)} (R$)<input type="number" id="pg-valor" min="0.01" step="0.01" value="${falta.toFixed(2)}" /></label>
        <button type="button" class="btn" id="pg-add"><i class="fa-solid fa-plus"></i> Adicionar ${esc(forma)}</button>`;
    };

    const desenhar = () => {
      const falta = restante();
      $("#pg-area").innerHTML = `
        <div class="pg-resumo">
          <div><span>Pago</span><strong>${moeda(pago())}</strong></div>
          <div class="${falta > 0 ? "falta" : "ok"}"><span>Restante</span><strong>${moeda(falta)}</strong></div>
          <div><span>Troco</span><strong>${moeda(troco())}</strong></div>
        </div>
        <ul class="pg-lista">${pags.map((p, i) => `
          <li><span><i class="fa-solid ${ICONE[p.forma]}"></i> ${esc(rotuloPagamento(p))}
            ${p.recebido > p.valor ? `<small>(recebido ${moeda(p.recebido)})</small>` : ""}</span>
            <b>${moeda(p.valor)}</b><button type="button" class="rem-var" data-rpg="${i}" aria-label="Remover">&times;</button></li>`).join("")}</ul>
        ${falta > 0 ? `
          <div class="pg-formas">${FORMAS.map((f) => `<button type="button" class="btn sec ${f === forma ? "ativo" : ""}" data-forma="${esc(f)}"><i class="fa-solid ${ICONE[f]}"></i> ${esc(f)}</button>`).join("")}</div>
          <div class="pg-painel">${painel()}</div>` : ""}`;
      ligar();
    };

    const ligar = () => {
      const v = $("#pg-valor");
      if (!v) return;
      v.focus(); v.select();
      if (forma === "Dinheiro") {
        v.oninput = () => { $("#pg-troco").textContent = moeda(Math.max(0, arred((parseFloat(v.value) || 0) - restante()))); };
        v.oninput();
      }
    };

    abrirModal("Receber venda", `
      <div class="pg-total"><span>Total a receber</span><strong>${moeda(t.total)}</strong></div>
      <div id="pg-area"></div>`,
      async () => {
        if (restante() > 0.009) { toast(`Falta receber ${moeda(restante())}`); return false; }
        const venda = await finalizar(t, pags, troco());
        if (!venda) return false;
        novaVenda();
        setTimeout(() => { telaVenda(); mostrarRecibo(venda, true); }, 0);
      }, { salvar: "Concluir venda", largo: true });

    desenhar();

    const adicionar = () => {
      const digitado = parseFloat($("#pg-valor").value);
      if (!(digitado > 0)) return toast("Informe o valor");
      const falta = restante();
      const aplicado = arred(Math.min(digitado, falta));
      if (forma !== "Dinheiro" && digitado > falta + 0.009) toast(`Valor ajustado para ${moeda(falta)} (restante)`);
      pags.push({ forma, valor: aplicado, recebido: forma === "Dinheiro" ? digitado : aplicado });
      desenhar();
    };

    $("#pg-area").onclick = (e) => {
      const f = e.target.closest("[data-forma]"), r = e.target.closest("[data-rpg]");
      if (r) { pags.splice(+r.dataset.rpg, 1); desenhar(); return; }
      if (f) { forma = f.dataset.forma; desenhar(); return; }
      if (e.target.closest("#pg-add")) adicionar();
    };
    // Enter dentro dos campos adiciona o pagamento (e nunca conclui a venda por engano)
    $("#pg-area").onkeydown = (e) => {
      if (e.key !== "Enter" || e.target.tagName === "BUTTON") return;
      e.preventDefault();
      if (e.target.id === "pg-nc-nome" || e.target.id === "pg-nc-fone") return $("#pg-nc-salvar").click();
      $("#pg-add") && adicionar();
    };
  };

  const finalizar = async (t, pags, troco) => {
    let venda = null;
    const ok = await tentar(async () => {
      // revalida estoque com o servidor
      const frescos = await Promise.all([...new Set(cart.map((i) => i.id))].map((id) => DB.produtos.obter(id)));
      for (const i of cart) {
        const p = frescos.find((x) => x && x.id === i.id);
        if (!p || estoqueDe(p, i.vid) < i.qtd) {
          toast(`Estoque insuficiente para "${i.nome}"`);
          throw Object.assign(new Error("estoque"), { silencioso: true });
        }
      }
      const numero = await DB.proximoNumero("venda");
      venda = await DB.vendas.salvar({
        numero, criadoEm: new Date().toISOString(), origem: "pdv", status: "concluida", caixaId: "sem-caixa",
        operador: DB.auth.currentUser.email, cliente: cliente.trim(), clienteId: clienteId || "",
        itens: cart.map(({ id, vid, variante, nome, preco, custo, qtd }) => ({ id, vid, variante, nome, preco, custo, qtd })),
        subtotal: t.subtotal, desconto: t.desconto, total: t.total,
        pagamentos: pags.map(({ forma, valor }) => ({ forma, valor })),
        troco,
      });
      for (const i of cart) await DB.produtos.ajustarEstoque(i.id, -i.qtd, i.vid, { tipo: "venda_pdv", motivo: `Venda PDV #${numero}`, ref: String(numero) });
    }, "Não foi possível concluir a venda");
    if (!ok) venda = null;
    if (venda) produtos = await DB.produtos.listar(); // atualiza o estoque exibido
    return venda;
  };

  // ---------- Cupom / recibo ----------
  const htmlCupom = (v, cfg) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Venda #${v.numero}</title>
    <style>
      @page{margin:0}
      body{font-family:"Courier New",monospace;font-size:12px;width:76mm;margin:4mm;color:#000}
      h1{font-size:15px;text-align:center;margin:0}.c{text-align:center}.l{border-top:1px dashed #000;margin:6px 0}
      table{width:100%;border-collapse:collapse}td{padding:1px 0;vertical-align:top}.r{text-align:right}.b{font-weight:bold}
      .no{margin-top:10px;text-align:center}@media print{.no{display:none}}
    </style></head><body>
    <h1>${esc(cfg.nomeLoja)}</h1>
    <div class="c">${esc(cfg.endereco || "")}</div>
    <div class="l"></div>
    <div>Venda nº ${v.numero}${v.status === "cancelada" ? " (CANCELADA)" : ""}</div>
    <div>${dataBR(v.criadoEm)}${v.cliente ? " — " + esc(v.cliente) : ""}</div>
    <div class="l"></div>
    <table>${v.itens.map((i) => `<tr><td colspan="2">${esc(nomeItem(i))}</td></tr><tr><td>${i.qtd} x ${moeda(i.preco)}</td><td class="r">${moeda(i.preco * i.qtd)}</td></tr>`).join("")}</table>
    <div class="l"></div>
    <table>
      <tr><td>Subtotal</td><td class="r">${moeda(v.subtotal)}</td></tr>
      ${v.desconto ? `<tr><td>Desconto</td><td class="r">- ${moeda(v.desconto)}</td></tr>` : ""}
      <tr class="b"><td>TOTAL</td><td class="r">${moeda(v.total)}</td></tr>
      ${v.pagamentos.map((p) => `<tr><td>${esc(rotuloPagamento(p))}</td><td class="r">${moeda(p.valor)}</td></tr>`).join("")}
      ${v.troco ? `<tr><td>Troco</td><td class="r">${moeda(v.troco)}</td></tr>` : ""}
    </table>
    <div class="l"></div><div class="c">Obrigado pela preferência!</div>
    <div class="no"><button onclick="window.print()">Imprimir</button></div>
    <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`;

  // Impressora térmica não entra nesta rodada (a cliente não tem esse equipamento);
  // abre a janela de impressão normal do navegador em vez de ligar numa térmica Bluetooth.
  const imprimirCupom = async (v) => {
    const cfg = await DB.config.obter();
    const w = window.open("", "_blank", "width=380,height=640");
    if (!w) return toast("Permita pop-ups para imprimir");
    w.document.write(htmlCupom(v, cfg));
    w.document.close();
  };

  const mostrarRecibo = (v, nova) => {
    abrirModal(`Venda #${v.numero}${v.status === "cancelada" ? " — cancelada" : ""}`, `
      <div class="detalhe">
        <p>${dataBR(v.criadoEm)} · operador ${esc(v.operador || "—")}${v.cliente ? ` · cliente ${esc(v.cliente)}` : ""}</p>
        <ul>${v.itens.map((i) => `<li>${i.qtd}x ${esc(nomeItem(i))} — ${moeda(i.preco * i.qtd)}</li>`).join("")}</ul>
        <p>Subtotal ${moeda(v.subtotal)}${v.desconto ? ` · Desconto -${moeda(v.desconto)}` : ""}</p>
        <p><b>Total ${moeda(v.total)}</b></p>
        <p>${v.pagamentos.map((p) => `${esc(rotuloPagamento(p))} ${moeda(p.valor)}`).join(" · ")}${v.troco ? ` · Troco ${moeda(v.troco)}` : ""}</p>
      </div>
      <button type="button" class="btn sec" id="imp-cupom"><i class="fa-solid fa-print"></i> Imprimir cupom</button>`,
      () => {}, { salvar: nova ? "Nova venda" : "Fechar", semCancelar: true });
    $("#imp-cupom").onclick = () => imprimirCupom(v);
  };

  // ---------- Sub-aba: Vendas ----------
  const telaVendas = async () => {
    if (!diaVendas) diaVendas = isoDia();
    $("#pdv-corpo").innerHTML = `<p class="vazio">Carregando...</p>`;
    const [a, b] = [new Date(diaVendas + "T00:00:00"), new Date(diaVendas + "T23:59:59.999")];
    const lista = (await DB.vendas.listarEntre("criadoEm", a.toISOString(), b.toISOString())).sort((x, y) => y.numero - x.numero);
    const validas = lista.filter((v) => v.status !== "cancelada");
    const total = validas.reduce((s, v) => s + v.total, 0);
    $("#pdv-corpo").innerHTML = `
      <div class="filtros"><input type="date" id="dia-vendas" value="${diaVendas}" />
        <span class="dica" style="align-self:center">${validas.length} venda(s) · ${moeda(total)}</span></div>
      <table><thead><tr><th>Nº</th><th>Hora</th><th>Cliente</th><th>Pagamento</th><th>Total</th><th>Situação</th><th></th></tr></thead><tbody>
      ${lista.map((v) => `<tr>
        <td>${v.numero}</td><td>${new Date(v.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
        <td>${esc(v.cliente || "—")}</td><td>${esc(v.pagamentos.map((p) => rotuloPagamento(p)).join(" + "))}</td><td>${moeda(v.total)}</td>
        <td><span class="status ${v.status === "cancelada" ? "s-cancelado" : "s-entregue"}">${v.status === "cancelada" ? "Cancelada" : "Concluída"}</span></td>
        <td class="acoes"><button class="btn sec peq" data-ver="${v.id}">Ver</button>
          ${v.status === "cancelada" ? "" : `<button class="btn perigo peq" data-cancel="${v.id}">Cancelar</button>`}</td></tr>`).join("") || `<tr><td colspan="7" class="vazio">Nenhuma venda neste dia.</td></tr>`}
      </tbody></table>`;
    $("#dia-vendas").onchange = (e) => { diaVendas = e.target.value || isoDia(); telaVendas(); };
    $("#pdv-corpo").onclick = async (e) => {
      const ver = e.target.closest("[data-ver]"), can = e.target.closest("[data-cancel]");
      if (ver) mostrarRecibo(lista.find((v) => v.id === ver.dataset.ver), false);
      if (can) cancelarVenda(lista.find((v) => v.id === can.dataset.cancel));
    };
  };

  // Só venda gravada pelo próprio V2 (origem "pdv") debitou estoque na hora de vender — vendas
  // antigas migradas (sem esse campo) nunca tiraram do estoque do sistema novo, então cancelar
  // não pode devolver nada que não foi tirado.
  const vendaDebitouEstoqueNoV2 = (v) => v.origem === "pdv";

  const cancelarVenda = async (v) => {
    const devolve = vendaDebitouEstoqueNoV2(v);
    if (!confirm(`Cancelar a venda #${v.numero}?${devolve ? " O estoque será devolvido." : ""}`)) return;
    const ok = await tentar(async () => {
      if (devolve) for (const i of v.itens) await DB.produtos.ajustarEstoque(i.id, i.qtd, i.vid, { tipo: "cancelamento_pdv", motivo: `Venda PDV #${v.numero} cancelada`, ref: String(v.numero) });
      await DB.vendas.salvar({ ...v, status: "cancelada", canceladaEm: new Date().toISOString(), canceladaPor: DB.auth.currentUser.email });
    }, "Não foi possível cancelar a venda");
    if (ok) { produtos = await DB.produtos.listar(); toast("Venda cancelada"); telaVendas(); }
  };

  // ---------- Atalhos de teclado ----------
  document.addEventListener("keydown", (e) => {
    if ($("#tab-pdv").hidden || sub !== "venda" || !$("#modal").hidden) return;
    if (e.key === "F2") { e.preventDefault(); $("#pdv-busca")?.focus(); }
    if (e.key === "F4") { e.preventDefault(); receber(); }
  });
});
