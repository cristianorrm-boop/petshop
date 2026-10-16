// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
// firebaseConfig é carregado de ./firebase-config.js
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    const cartIcon = document.querySelector(".cart-icon"),
        cartSidebar = document.querySelector(".cart-sidebar"),
        cartOverlay = document.querySelector(".cart-overlay"),
        closeCartBtn = document.querySelector(".close-cart-btn"),
        cartBody = document.querySelector(".cart-body"),
        cartBadge = document.querySelector(".cart-badge");
    const deliveryToggleBtns = document.querySelectorAll(".delivery-btn");
    const deliveryForm = document.getElementById("delivery-form-container"),
        pickupForm = document.getElementById("pickup-form-container");
    const trocoContainer = document.getElementById("troco-container");
    const couponInput = document.getElementById("coupon-input"),
        applyCouponBtn = document.getElementById("apply-coupon-btn"),
        couponFeedback = document.getElementById("coupon-feedback");
    const subtotalElem = document.getElementById("cart-subtotal"),
        cartDiscountElem = document.getElementById("cart-discount"),
        discountLineElem = document.querySelector(".discount-line"),
        totalElem = document.getElementById("cart-total");
    const finishOrderBtn = document.getElementById("finish-order-btn");
    const viewCartBanner = document.querySelector(".view-cart-banner");
    const bannerTotalElem = document.getElementById("banner-total");
    const viewCartBannerBtn = document.querySelector(".view-cart-banner-btn");
    const categoriesBar = document.getElementById("categories-bar");
    const searchInput = document.querySelector(".search-input");

    // Seletores do popup de detalhes do produto
    const productModalOverlay = document.getElementById("product-modal-overlay"),
        productModalCloseBtn = document.getElementById("product-modal-close"),
        productModalImg = document.getElementById("product-modal-img"),
        productModalDestaque = document.getElementById("product-modal-destaque"),
        productModalNome = document.getElementById("product-modal-nome"),
        productModalDescricao = document.getElementById("product-modal-descricao"),
        productModalPreco = document.getElementById("product-modal-preco"),
        productModalComprarBtn = document.getElementById("product-modal-comprar");

    // --- CARREGAR PRODUTOS DO FIREBASE ---
    // Busca todos (inclusive inativos) — os inativos aparecem na loja com selo ESGOTADO
    // em vez de sumir, para o cliente ver que o produto existe mas está fora de estoque.
    let produtos = [];
    try {
        const snap = await db.collection("produtos").orderBy("id").get();
        produtos = snap.docs.map((d) => ({ ...d.data() }));
    } catch (e) {
        console.error("Erro ao carregar produtos do Firebase:", e);
    }

    // --- CARREGAR CATEGORIAS DO FIREBASE ---
    // Ordem padrão pedida pela loja. Categorias com "ordem" definida manualmente no
    // admin têm prioridade; as demais seguem esta lista; o resto cai no final (alfabético).
    const ORDEM_PADRAO_CATEGORIAS = ["proteinas", "carboidratos", "creatina", "colageno", "acessorios"];
    const posicaoCategoria = (c) => {
        if (typeof c.ordem === "number") return c.ordem;
        const idx = ORDEM_PADRAO_CATEGORIAS.indexOf(c.id);
        return idx === -1 ? 9999 : 1000 + idx;
    };
    const compararCategorias = (a, b) => {
        const diff = posicaoCategoria(a) - posicaoCategoria(b);
        return diff !== 0 ? diff : (a.nome || "").localeCompare(b.nome || "");
    };

    let categorias = [];
    try {
        const catSnap = await db.collection("categorias").get();
        categorias = catSnap.docs.map(d => ({ ...d.data() })).sort(compararCategorias);
    } catch (e) {
        console.error("Erro ao carregar categorias do Firebase:", e);
    }

    // Reordena os produtos: primeiro pela ordem da categoria (a mesma que
    // já define a barra de categorias), e dentro de cada categoria pelo id
    // (ordem de cadastro). Assim, um produto novo cadastrado hoje numa
    // categoria vai pro fim DAQUELA categoria, não pro fim da grade inteira.
    const posicaoCategoriaPorId = {};
    categorias.forEach((c, idx) => { posicaoCategoriaPorId[c.id] = idx; });
    produtos.sort((a, b) => {
        const pa = posicaoCategoriaPorId[a.categoria] ?? 9999;
        const pb = posicaoCategoriaPorId[b.categoria] ?? 9999;
        if (pa !== pb) return pa - pb;
        return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    const renderizarCategoriasBar = () => {
        const botoesExtra = categorias
            .map(
                (c) => `
                    <button class="category-btn" data-category="${c.id}">
                        <i class="fa-solid ${c.icone || 'fa-tag'}"></i> ${c.nome}
                    </button>
                `,
            )
            .join("");
        categoriesBar.innerHTML = `
            <button class="category-btn active" data-category="all">
                <i class="fa-solid fa-border-all"></i> Todos
            </button>
            ${botoesExtra}
        `;
    };
    renderizarCategoriasBar();

    // --- CARREGAR CUPONS DO FIREBASE ---
    let coupons = [];
    try {
        const cuponsSnap = await db.collection("cupons").get();
        coupons = cuponsSnap.docs.map((d) => ({ docId: d.id, ...d.data() }));
    } catch (e) {
        console.error("Erro ao carregar cupons do Firebase:", e);
    }

    // --- CARREGAR CONFIGURAÇÕES DA LOJA DO FIREBASE ---
    const CONFIG_PADRAO = {
        nomeLoja: "Manejo Mix Pet Shop",
        whatsapp: "5534988147596",
        retiradaDias: [0, 1, 2, 3, 4, 5, 6],
        retiradaHoraInicio: "08:00",
        retiradaHoraFim: "18:00",
        retiradaIntervalo: 60,
        bannerUrl: "",
        corPrimaria: "#D4A017",
        corSecundaria: "#4A0E0E",
        corDestaque: "#E8B923",
    };
    let configLoja = { ...CONFIG_PADRAO };
    try {
        const configDoc = await db.collection("configuracoes").doc("geral").get();
        if (configDoc.exists) configLoja = { ...CONFIG_PADRAO, ...configDoc.data() };
    } catch (e) {
        console.error("Erro ao carregar configurações da loja:", e);
    }

    const aplicarConfiguracoesDaLoja = () => {
        document.title = configLoja.nomeLoja;

        const headerEl = document.querySelector("header");
        if (headerEl && configLoja.bannerUrl) {
            headerEl.style.backgroundImage = `url("${configLoja.bannerUrl}")`;
            headerEl.classList.add("header--banner");
        }

        const root = document.documentElement;
        if (configLoja.corPrimaria) root.style.setProperty("--primary-color", configLoja.corPrimaria);
        if (configLoja.corSecundaria) root.style.setProperty("--secondary-color", configLoja.corSecundaria);
        if (configLoja.corDestaque) root.style.setProperty("--accent-color", configLoja.corDestaque);

        const logoTextEl = document.querySelector(".logo-text");
        if (logoTextEl) logoTextEl.textContent = configLoja.nomeLoja;

        const footerEl = document.querySelector(".footer-copyright");
        if (footerEl) {
            const ano = new Date().getFullYear();
            footerEl.textContent = `© ${ano} - ${configLoja.nomeLoja}. Todos os direitos reservados.`;
        }

        const pickupDateInput = document.getElementById("pickup-date");
        if (pickupDateInput) {
            const hoje = new Date();
            pickupDateInput.min = hoje.toISOString().split("T")[0];
        }

        const pickupTimeSelect = document.getElementById("pickup-time");
        if (pickupTimeSelect) {
            const [hIni, mIni] = configLoja.retiradaHoraInicio.split(":").map(Number);
            const [hFim, mFim] = configLoja.retiradaHoraFim.split(":").map(Number);
            const inicioMin = hIni * 60 + mIni;
            const fimMin = hFim * 60 + mFim;
            const passo = configLoja.retiradaIntervalo || 60;
            let opcoes = `<option value="" disabled selected>Selecione</option>`;
            for (let m = inicioMin; m <= fimMin; m += passo) {
                const h = String(Math.floor(m / 60)).padStart(2, "0");
                const min = String(m % 60).padStart(2, "0");
                opcoes += `<option value="${h}:${min}">${h}:${min}</option>`;
            }
            pickupTimeSelect.innerHTML = opcoes;
        }
    };
    aplicarConfiguracoesDaLoja();

    let carrinho = [],
        tipoEntrega = "delivery",
        appliedCoupon = null;

    let categoriaAtiva = "all";
    let termoBusca = "";

    const formatarMoeda = (v) =>
        v.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    const getScrollbarWidth = () =>
        window.innerWidth - document.documentElement.clientWidth;
    const lockScroll = () => {
        document.body.style.paddingRight = `${getScrollbarWidth()}px`;
        document.body.classList.add("no-scroll");
    };
    const unlockScroll = () => {
        document.body.style.paddingRight = "";
        document.body.classList.remove("no-scroll");
    };
    const abrirCarrinho = () => {
        cartSidebar.classList.add("show");
        cartOverlay.classList.add("show");
        lockScroll();
    };
    const fecharCarrinho = () => {
        cartSidebar.classList.remove("show");
        cartOverlay.classList.remove("show");
        unlockScroll();
    };

    const animacaoVoarParaCarrinho = (productCard) => {
        const productImg = productCard.querySelector(".product-img"),
            imgRect = productImg.getBoundingClientRect(),
            cartRect = cartIcon.getBoundingClientRect(),
            flyingImg = document.createElement("img");
        flyingImg.src = productImg.src;
        flyingImg.classList.add("product-image-fly");
        flyingImg.style.left = `${imgRect.left}px`;
        flyingImg.style.top = `${imgRect.top}px`;
        flyingImg.style.width = `${imgRect.width}px`;
        flyingImg.style.height = `${imgRect.height}px`;
        document.body.appendChild(flyingImg);
        requestAnimationFrame(() => {
            flyingImg.style.left = `${cartRect.left + cartRect.width / 2}px`;
            flyingImg.style.top = `${cartRect.top + cartRect.height / 2}px`;
            flyingImg.style.width = "0px";
            flyingImg.style.height = "0px";
            flyingImg.style.opacity = "0";
        });
        flyingImg.addEventListener("transitionend", () => flyingImg.remove());
    };

    // Cria o HTML de um card de produto (reaproveitado na grade normal e nos destaques)
    const criarCardProduto = (p) => {
        const estaAtivo = p.ativo !== false;

        const botao = estaAtivo
            ? '<button class="product-button">Adicionar</button>'
            : '<button class="product-button" disabled style="opacity:.5;cursor:not-allowed">ESGOTADO</button>';

        const badgeEsgotado = !estaAtivo
            ? '<span style="position:absolute;top:10px;right:10px;background:#B71C1C;color:#fff;padding:4px 8px;border-radius:4px;font-size:.7rem;font-weight:bold;z-index:10">ESGOTADO</span>'
            : '';

        const galeriaThumbs = p.imagem2
            ? `
                <div class="product-thumbs">
                    <button type="button" class="thumb-dot active" data-img="${p.imagem}"></button>
                    <button type="button" class="thumb-dot" data-img="${p.imagem2}"></button>
                </div>
            `
            : '';

        return `
            <div class="product-card" data-id="${p.id}" style="position:relative">
                ${badgeEsgotado}
                <div class="product-img-container">
                   <img class="product-img" src="${p.imagem}" alt="${p.nome}" onerror="this.onerror=null;this.src='./assets/placeholder.svg'">
                </div>
                ${galeriaThumbs}
                <div class="product-info">
                    <h3 class="product-name">${p.nome}</h3>
                    <p class="product-description">${p.descricao}</p>
                    <p class="product-price">${formatarMoeda(p.preco)}</p>
                    ${botao}
                </div>
            </div>`;
    };

    const filtrarEMostrarProdutos = () => {
        let produtosFiltrados = produtos;

        if (categoriaAtiva !== "all") {
            produtosFiltrados = produtosFiltrados.filter(
                (produto) => produto.categoria === categoriaAtiva,
            );
        }

        if (termoBusca.trim() !== "") {
            const termo = termoBusca.toLowerCase();
            produtosFiltrados = produtosFiltrados.filter(
                (produto) =>
                    produto.nome.toLowerCase().includes(termo) ||
                    (produto.descricao || "").toLowerCase().includes(termo),
            );
        }

        const container = document.querySelector(".products .products-container");
        if (produtosFiltrados.length === 0) {
            container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #999;">
                        <i class="fa-solid fa-gem" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                        <p style="font-size: 1.2rem; font-weight: 600;">Nenhum Suplemento encontrado</p>
                    </div>`;
        } else {
            container.innerHTML = produtosFiltrados.map(criarCardProduto).join("");
        }
    };

    // Renderizar seção de destaques da semana
    const renderizarDestaques = () => {
        const destaquesSection = document.getElementById("destaques-section");
        const destaquesContainer = document.querySelector(".destaques-container");
        if (!destaquesSection || !destaquesContainer) return;

        const produtosDestaque = produtos.filter((p) => p.destaque && p.ativo !== false);
        if (produtosDestaque.length === 0) {
            destaquesSection.style.display = "none";
            return;
        }

        destaquesSection.style.display = "block";
        destaquesContainer.innerHTML = produtosDestaque.map(criarCardProduto).join("");
    };

    // --- POPUP DE DETALHES DO PRODUTO ---
    // Guarda o produto aberto no popup e as opções de variação (Sabor,
    // Tamanho...) que o cliente já escolheu, enquanto o popup está aberto.
    let modalProdutoAtual = null;
    let modalVariacoesEscolhidas = {};

    const renderizarVariacoesNoModal = (produto) => {
        const cont = document.getElementById("product-modal-variacoes");
        const variacoes = produto.variacoes || [];
        if (!variacoes.length) { cont.innerHTML = ""; return; }
        cont.innerHTML = variacoes
            .map(
                (grupo) => `
                    <div class="variacao-grupo">
                        <div class="variacao-grupo-nome">${grupo.tipoNome}</div>
                        <div class="variacao-opcoes">
                            ${grupo.opcoes
                                .map(
                                    (opcao) => `
                                        <button type="button" class="variacao-opcao-btn" data-tipo-id="${grupo.tipoId}" data-tipo-nome="${grupo.tipoNome}" data-opcao="${opcao}">${opcao}</button>
                                    `,
                                )
                                .join("")}
                        </div>
                    </div>`,
            )
            .join("") + `<p class="variacao-aviso" id="variacao-aviso">Escolha uma opção de cada variação antes de comprar.</p>`;
    };

    // Só libera o botão "Comprar" quando todo grupo de variação (se o
    // produto tiver algum) já tem uma opção escolhida.
    const atualizarBotaoComprarModal = () => {
        if (!modalProdutoAtual) return;
        const variacoes = modalProdutoAtual.variacoes || [];
        const faltaEscolher = variacoes.some((g) => !modalVariacoesEscolhidas[g.tipoId]);
        productModalComprarBtn.disabled = faltaEscolher;
        const aviso = document.getElementById("variacao-aviso");
        if (aviso) aviso.classList.toggle("show", faltaEscolher && variacoes.length > 0);
    };

    const abrirModalProduto = (produtoId) => {
        const produto = produtos.find((p) => p.id === produtoId);
        if (!produto) return;

        productModalImg.src = produto.imagem;
        productModalImg.alt = produto.nome;
        productModalDestaque.style.display = produto.destaque ? "flex" : "none";
        productModalNome.textContent = produto.nome;
        productModalDescricao.textContent = produto.descricao || "";
        productModalPreco.textContent = formatarMoeda(produto.preco);
        productModalComprarBtn.dataset.id = produto.id;

        modalProdutoAtual = produto;
        modalVariacoesEscolhidas = {};
        renderizarVariacoesNoModal(produto);
        atualizarBotaoComprarModal();

        productModalOverlay.classList.add("show");
        lockScroll();
    };
    const fecharModalProduto = () => {
        productModalOverlay.classList.remove("show");
        unlockScroll();
    };

    // variacaoEscolhida é um texto tipo "Sabor: Chocolate" (ou null se o
    // produto não tem variação). Dois itens do mesmo produto com variações
    // diferentes viram linhas separadas no carrinho — só juntam a
    // quantidade se a variação escolhida for igual. "button" é opcional
    // (só existe quando o clique partiu do card, pra mostrar "Adicionado ✓").
    const adicionarAoCarrinho = (produtoId, productCard, button, variacaoEscolhida = null) => {
        if (productCard) animacaoVoarParaCarrinho(productCard);

        if (button) {
            button.innerHTML = "Adicionado ✓";
            button.disabled = true;
            setTimeout(() => {
                button.innerHTML = "Adicionar";
                button.disabled = false;
            }, 2000);
        }

        const produto = produtos.find((p) => p.id === produtoId);
        const itemNoCarrinho = carrinho.find(
            (item) => item.id === produtoId && (item.variacaoEscolhida || null) === (variacaoEscolhida || null),
        );
        if (itemNoCarrinho) itemNoCarrinho.quantidade++;
        else carrinho.push({ ...produto, quantidade: 1, variacaoEscolhida });
        atualizarCarrinho();
    };

    // Endereça a linha do carrinho pela posição no array, não pelo id do
    // produto — assim funciona certo mesmo com duas linhas do mesmo produto
    // (variações diferentes) ao mesmo tempo.
    const alterarQuantidade = (index, acao) => {
        const item = carrinho[index];
        if (!item) return;
        if (acao === "aumentar") item.quantidade++;
        else if (acao === "diminuir") {
            item.quantidade--;
            if (item.quantidade <= 0) carrinho.splice(index, 1);
        }
        atualizarCarrinho();
    };

    const calcularDesconto = (subtotal) => {
        if (!appliedCoupon) return 0;
        if (appliedCoupon.tipo === "fixo")
            return Math.min(appliedCoupon.valor, subtotal);
        return subtotal * (appliedCoupon.valor / 100);
    };

    const atualizarCarrinho = () => {
        if (carrinho.length === 0) {
            cartBody.innerHTML = `<div class="cart-empty"><i class="fa-solid fa-box-open"></i><p>Sua sacola está vazia.</p></div>`;
        } else {
            cartBody.innerHTML = carrinho
                .map(
                    (item, index) =>
                        `<div class="cart-item" data-index="${index}"><img src="${item.imagem}" alt="${item.nome}" class="cart-item-img" onerror="this.onerror=null;this.src='./assets/placeholder.svg'"><div class="cart-item-info"><h4 class="cart-item-name">${item.nome}</h4>${item.variacaoEscolhida ? `<p class="cart-item-variacao">${item.variacaoEscolhida}</p>` : ""}<p class="cart-item-price">${formatarMoeda(item.preco)}</p><div class="cart-item-controls"><button class="quantity-btn" data-action="diminuir">-</button><span class="quantity">${item.quantidade}</span><button class="quantity-btn" data-action="aumentar">+</button></div></div><button class="remove-item-btn">&times;</button></div>`,
                )
                .join("");
        }
        const subtotal = carrinho.reduce(
            (acc, item) => acc + item.preco * item.quantidade,
            0,
        );

        if (
            appliedCoupon &&
            appliedCoupon.valorMinimo &&
            subtotal < appliedCoupon.valorMinimo
        ) {
            appliedCoupon = null;
            couponFeedback.textContent =
                "Cupom removido: o pedido não atinge mais o valor mínimo exigido.";
            couponFeedback.classList.remove("success");
            couponFeedback.classList.add("error");
        }

        const discountAmount = calcularDesconto(subtotal);
        const total = subtotal - discountAmount;
        subtotalElem.textContent = formatarMoeda(subtotal);
        if (discountAmount > 0) {
            cartDiscountElem.textContent = `- ${formatarMoeda(discountAmount)}`;
            discountLineElem.style.display = "flex";
        } else {
            discountLineElem.style.display = "none";
        }
        totalElem.textContent = formatarMoeda(total);
        cartBadge.textContent = carrinho.reduce(
            (acc, item) => acc + item.quantidade,
            0,
        );
        finishOrderBtn.disabled = carrinho.length === 0;

        if (carrinho.length > 0) {
            bannerTotalElem.textContent = formatarMoeda(total);
            viewCartBanner.classList.add("show");
        } else {
            viewCartBanner.classList.remove("show");
        }
    };

    const applyCoupon = () => {
        const code = couponInput.value.trim().toUpperCase();
        const subtotal = carrinho.reduce(
            (acc, item) => acc + item.preco * item.quantidade,
            0,
        );
        const foundCoupon = coupons.find((c) => c.codigo === code);

        couponFeedback.classList.remove("success", "error");

        if (!foundCoupon) {
            appliedCoupon = null;
            couponFeedback.textContent = "Cupom inválido. Tente novamente.";
            couponFeedback.classList.add("error");
        } else if (foundCoupon.ativo === false) {
            appliedCoupon = null;
            couponFeedback.textContent = "Este cupom não está mais disponível.";
            couponFeedback.classList.add("error");
        } else if (
            foundCoupon.validade &&
            new Date(`${foundCoupon.validade}T23:59:59`) < new Date()
        ) {
            appliedCoupon = null;
            couponFeedback.textContent = "Este cupom expirou.";
            couponFeedback.classList.add("error");
        } else if (
            foundCoupon.valorMinimo &&
            subtotal < foundCoupon.valorMinimo
        ) {
            appliedCoupon = null;
            couponFeedback.textContent = `Pedido mínimo de ${formatarMoeda(
                foundCoupon.valorMinimo,
            )} para usar este cupom.`;
            couponFeedback.classList.add("error");
        } else {
            appliedCoupon = foundCoupon;
            couponFeedback.textContent = "Cupom aplicado com sucesso!";
            couponFeedback.classList.add("success");
        }

        setTimeout(() => {
            couponFeedback.textContent = "";
            couponFeedback.classList.remove("success", "error");
        }, 3000);

        atualizarCarrinho();
    };

    const finalizarPedido = async () => {
        let valid = true;
        let fieldsToValidate = [];

        if (tipoEntrega === "delivery") {
            fieldsToValidate = [
                "delivery-name",
                "delivery-phone",
                "delivery-cep",
                "delivery-address",
            ];
        } else {
            fieldsToValidate = ["pickup-name", "pickup-date", "pickup-time"];
        }

        if (tipoEntrega === "pickup") {
            const dataInput = document.getElementById("pickup-date");
            if (dataInput.value) {
                const [ano, mes, dia] = dataInput.value.split("-").map(Number);
                const diaSemana = new Date(ano, mes - 1, dia).getDay();
                if (!configLoja.retiradaDias.includes(diaSemana)) {
                    dataInput.classList.add("error");
                    alert("A loja não realiza retiradas no dia selecionado. Escolha outra data.");
                    return;
                }
            }
        }

        fieldsToValidate.forEach((id) => {
            const el = document.getElementById(id);
            let isFieldValid = el.value.trim() !== "";

            if (id.includes("name") && isFieldValid) {
                if (
                    el.value
                        .trim()
                        .split(" ")
                        .filter((word) => word).length < 2
                ) {
                    isFieldValid = false;
                }
            }

            if (!isFieldValid) {
                el.classList.add("error");
                valid = false;
            } else {
                el.classList.remove("error");
            }
        });

        if (!valid) {
            alert(
                "Por favor, preencha todos os campos obrigatórios marcados em vermelho.",
            );
            return;
        }

        const numeroWhatsApp = configLoja.whatsapp;
        const itensPedido = carrinho
            .map((item) => ` - ${item.quantidade}x ${item.nome}${item.variacaoEscolhida ? ` (${item.variacaoEscolhida})` : ""}`)
            .join("\n");
        const subtotal = carrinho.reduce(
            (acc, item) => acc + item.preco * item.quantidade,
            0,
        );
        const discountAmount = calcularDesconto(subtotal);
        let cupomInfo = "";
        if (appliedCoupon) {
            cupomInfo = `\n*Cupom Aplicado:* ${appliedCoupon.codigo} (${formatarMoeda(discountAmount)})`;
        }
        const total = subtotal - discountAmount;
        let mensagem = `*-- NOVO PEDIDO ${configLoja.nomeLoja} --*\n\n*Itens:*\n${itensPedido}\n\n*Subtotal:* ${formatarMoeda(subtotal)}${cupomInfo}\n*Total:* ${formatarMoeda(total)}\n\n-------------------------\n\n`;

        let dadosCliente = {};

        if (tipoEntrega === "delivery") {
            const nome = document.getElementById("delivery-name").value;
            const phone = document.getElementById("delivery-phone").value;
            const cep = document.getElementById("delivery-cep").value;
            const address = document.getElementById("delivery-address").value;

            const paymentMethod = document.querySelector(
                'input[name="payment"]:checked',
            ).value;
            let paymentInfo = `*Forma de Pagamento:* ${paymentMethod}`;
            if (paymentMethod === "Dinheiro") {
                const troco = document.getElementById("troco-para").value;
                paymentInfo += troco
                    ? ` (Troco para R$ ${troco})`
                    : " (Não precisa de troco)";
            }

            dadosCliente = { nome, telefone: phone, cep, endereco: address, pagamento: paymentMethod };

            mensagem += `*Tipo de Pedido:* Entrega\n\n*Nome:* ${nome}\n*Telefone:* ${phone}\n*Endereço:* ${address}\n\n${paymentInfo}`;
        } else {
            const nome = document.getElementById("pickup-name").value;
            const dataInput = document.getElementById("pickup-date").value;
            const hora = document.getElementById("pickup-time").value;
            const [year, month, day] = dataInput.split("-");
            const dataFormatada = `${day}/${month}/${year}`;

            dadosCliente = { nome, dataRetirada: dataInput, horaRetirada: hora };

            mensagem += `*Tipo de Pedido:* Retirada\n\n*Nome para Retirada:* ${nome}\n*Data Agendada:* ${dataFormatada}\n*Hora Agendada:* ${hora}`;
        }

        // Salva o pedido no Firestore para ficar no histórico do admin (não bloqueia o checkout se falhar)
        try {
            await db.collection("pedidos").add({
                itens: carrinho.map((item) => ({ nome: item.nome, preco: item.preco, qtd: item.quantidade, variacao: item.variacaoEscolhida || null })),
                subtotal,
                desconto: discountAmount,
                total,
                cupom: appliedCoupon ? appliedCoupon.codigo : null,
                tipoEntrega,
                cliente: dadosCliente,
                atendido: false,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            });
        } catch (err) {
            console.error("Não foi possível salvar o pedido no histórico:", err);
        }

        const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, "_blank");
    };

    // --- EVENT LISTENERS ---
    cartIcon.addEventListener("click", abrirCarrinho);
    closeCartBtn.addEventListener("click", fecharCarrinho);
    cartOverlay.addEventListener("click", fecharCarrinho);
    applyCouponBtn.addEventListener("click", applyCoupon);
    finishOrderBtn.addEventListener("click", finalizarPedido);
    viewCartBannerBtn.addEventListener("click", abrirCarrinho);

    categoriesBar.addEventListener("click", (e) => {
        const btn = e.target.closest(".category-btn");
        if (!btn) return;
        categoriesBar
            .querySelectorAll(".category-btn")
            .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        categoriaAtiva = btn.dataset.category;
        filtrarEMostrarProdutos();
    });

    searchInput.addEventListener("input", (e) => {
        termoBusca = e.target.value;
        filtrarEMostrarProdutos();
    });

    // Delegado no body pois existe grade normal e de destaques
    document.body.addEventListener("click", (e) => {
        const button = e.target.closest(".product-button");
        if (button) {
            const productCard = button.closest(".product-card");
            const produtoId = Number.parseInt(productCard.dataset.id);
            const produtoClicado = produtos.find((p) => p.id === produtoId);
            // Produto com variação (Sabor, Tamanho...) precisa passar pelo
            // popup pra escolher a opção antes de ir pro carrinho.
            if (produtoClicado && (produtoClicado.variacoes || []).length) {
                abrirModalProduto(produtoId);
                return;
            }
            adicionarAoCarrinho(produtoId, productCard, button);
            return;
        }

        const thumb = e.target.closest(".thumb-dot");
        if (thumb) {
            const productCard = thumb.closest(".product-card");
            productCard.querySelector(".product-img").src = thumb.dataset.img;
            productCard.querySelectorAll(".thumb-dot").forEach((d) => d.classList.remove("active"));
            thumb.classList.add("active");
            return;
        }

        // Clique em qualquer outra parte do card (imagem, nome, descrição)
        // abre o popup com os detalhes do produto.
        const cardClicado = e.target.closest(".product-card");
        if (cardClicado) abrirModalProduto(Number.parseInt(cardClicado.dataset.id));
    });

    productModalCloseBtn.addEventListener("click", fecharModalProduto);
    productModalOverlay.addEventListener("click", (e) => {
        if (e.target === productModalOverlay) fecharModalProduto();
    });
    document.getElementById("product-modal-variacoes").addEventListener("click", (e) => {
        const btn = e.target.closest(".variacao-opcao-btn");
        if (!btn) return;
        modalVariacoesEscolhidas[btn.dataset.tipoId] = {
            tipoNome: btn.dataset.tipoNome,
            opcao: btn.dataset.opcao,
        };
        // desmarca só os outros botões do mesmo grupo de variação
        btn.closest(".variacao-opcoes")
            .querySelectorAll(".variacao-opcao-btn")
            .forEach((b) => b.classList.remove("selecionada"));
        btn.classList.add("selecionada");
        atualizarBotaoComprarModal();
    });
    productModalComprarBtn.addEventListener("click", () => {
        if (productModalComprarBtn.disabled) return;
        const produtoId = Number.parseInt(productModalComprarBtn.dataset.id);
        const escolhas = Object.values(modalVariacoesEscolhidas);
        const variacaoEscolhida = escolhas.length
            ? escolhas.map((v) => `${v.tipoNome}: ${v.opcao}`).join(", ")
            : null;
        adicionarAoCarrinho(produtoId, null, null, variacaoEscolhida);
        fecharModalProduto();
        abrirCarrinho();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && productModalOverlay.classList.contains("show")) fecharModalProduto();
    });

    cartBody.addEventListener("click", (e) => {
        const cartItem = e.target.closest(".cart-item");
        if (cartItem) {
            const index = Number.parseInt(cartItem.dataset.index);
            if (e.target.matches(".quantity-btn"))
                alterarQuantidade(index, e.target.dataset.action);
            if (e.target.matches(".remove-item-btn")) {
                carrinho.splice(index, 1);
                atualizarCarrinho();
            }
        }
    });

    deliveryToggleBtns.forEach((btn) =>
        btn.addEventListener("click", () => {
            deliveryToggleBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            tipoEntrega = btn.dataset.option;
            if (tipoEntrega === "delivery") {
                deliveryForm.style.display = "block";
                pickupForm.style.display = "none";
            } else {
                deliveryForm.style.display = "none";
                pickupForm.style.display = "block";
            }
        }),
    );

    document.querySelectorAll('input[name="payment"]').forEach((radio) => {
        radio.addEventListener("change", (e) => {
            trocoContainer.style.display =
                e.target.value === "Dinheiro" ? "block" : "none";
            document
                .querySelectorAll(".payment-option")
                .forEach((label) => label.classList.remove("selected"));
            e.target.closest(".payment-option").classList.add("selected");
        });
    });

    document
        .querySelectorAll(
            "#delivery-form-container input[required], #pickup-form-container input[required], #pickup-form-container select[required]",
        )
        .forEach((input) => {
            input.addEventListener("input", () => {
                if (input.value.trim() !== "") input.classList.remove("error");
            });
        });

    // --- BOTÃO FLUTUANTE DO WHATSAPP ---
    const botaoWhatsapp = document.createElement("a");
    botaoWhatsapp.className = "whatsapp-float";
    botaoWhatsapp.target = "_blank";
    botaoWhatsapp.rel = "noopener";
    botaoWhatsapp.setAttribute("aria-label", "Falar no WhatsApp");
    botaoWhatsapp.innerHTML = `<i class="fab fa-whatsapp" aria-hidden="true"></i>`;
    botaoWhatsapp.href = `https://wa.me/${configLoja.whatsapp}?text=${encodeURIComponent("Olá! Vim pelo site e tenho uma dúvida.")}`;
    document.body.appendChild(botaoWhatsapp);

    // --- INICIALIZAÇÃO ---
    renderizarDestaques();
    filtrarEMostrarProdutos();
    atualizarCarrinho();
});
