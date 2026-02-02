// ============================
    // LOCALSTORAGE PADRONIZADO (OS Flow)
    // ============================
    const LS = Object.freeze({
      clientes: 'osflow:clientes',
      produtos: 'osflow:produtos',
      vendas: 'osflow:vendas',
      cobrancas: 'osflow:cobrancas',            // NOVO: cobranças
      carrinhoVendas: 'osflow:pdv:carrinho',
      sidebarCollapsed: 'osflow:ui:sidebarCollapsed',

      // legado (migração)
      legacyClientes: 'clientesOSFlow',
      legacyProdutos: 'produtosOSFlow',
      legacyVendas: 'vendasOSFlow',
      legacyCarrinho: 'carrinhoVendas',
      legacySidebarCollapsed: 'sidebarCollapsed'
    });

    function migrateLocalStorageKeys() {
      if (!localStorage.getItem(LS.clientes) && localStorage.getItem(LS.legacyClientes)) {
        localStorage.setItem(LS.clientes, localStorage.getItem(LS.legacyClientes));
      }
      if (!localStorage.getItem(LS.produtos) && localStorage.getItem(LS.legacyProdutos)) {
        localStorage.setItem(LS.produtos, localStorage.getItem(LS.legacyProdutos));
      }
      if (!localStorage.getItem(LS.vendas) && localStorage.getItem(LS.legacyVendas)) {
        localStorage.setItem(LS.vendas, localStorage.getItem(LS.legacyVendas));
      }
      if (!localStorage.getItem(LS.carrinhoVendas) && localStorage.getItem(LS.legacyCarrinho)) {
        localStorage.setItem(LS.carrinhoVendas, localStorage.getItem(LS.legacyCarrinho));
      }
      if (!localStorage.getItem(LS.sidebarCollapsed) && localStorage.getItem(LS.legacySidebarCollapsed)) {
        localStorage.setItem(LS.sidebarCollapsed, localStorage.getItem(LS.legacySidebarCollapsed));
      }
    }

    function lsReadJSON(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    }

    function lsWriteJSON(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }

    migrateLocalStorageKeys();

    // ============================
    // STATE
    // ============================
    let produtosDisponiveis = []; // vem do osflow:produtos
    let carrinho = lsReadJSON(LS.carrinhoVendas, []) || [];
    let formaPagamentoSelecionada = null;
    let descontoAplicado = 0;

    // Fonte da verdade sempre: osflow:vendas
    let vendas = lsReadJSON(LS.vendas, []) || [];

    // ============================
    // INIT
    // ============================
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('ano-atual').textContent = new Date().getFullYear();

      restoreSidebarState();

      carregarProdutosDoStorage();
      carregarProdutosGrid();
      carregarClientesSelect();

      atualizarCarrinho();
      carregarVendas();
      atualizarEstatisticas();

      document.getElementById('valorRecebido').addEventListener('input', calcularTroco);
    });

    function restoreSidebarState() {
      const isCollapsed = localStorage.getItem(LS.sidebarCollapsed) === 'true';
      const layout = document.getElementById('mainLayout');
      if (isCollapsed) layout.classList.add('collapsed');
    }

    // TOGGLE SIDEBAR
    function toggleSidebar() {
      const layout = document.getElementById('mainLayout');
      layout.classList.toggle('collapsed');
      localStorage.setItem(LS.sidebarCollapsed, layout.classList.contains('collapsed'));
    }

    // ============================
    // PRODUTOS (REAIS) - vindo do produtos.html
    // ============================
    function carregarProdutosDoStorage() {
      const produtos = lsReadJSON(LS.produtos, []) || [];
      // Mostrar somente produtos "ativos" ou "esgotado" (esgotado aparece mas bloqueia compra)
      produtosDisponiveis = produtos
        .filter(p => p && (p.status === 'ativo' || p.status === 'esgotado'))
        .map(p => ({
          id: p.id,
          nome: p.nome,
          codigo: p.codigo,
          preco: Number(p.preco_venda || 0),
          estoque: Number(p.estoque_atual || 0),
          marca: p.marca || '',
          categoria: p.categoria || ''
        }));
    }

    function carregarProdutosGrid() {
      const produtosGrid = document.getElementById('produtosGrid');

      if (!Array.isArray(produtosDisponiveis) || produtosDisponiveis.length === 0) {
        produtosGrid.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; padding: var(--space-8);">
            <div style="font-size: 2rem; margin-bottom: var(--space-2);">📦</div>
            <p style="color: var(--text-tertiary);">
              Nenhum produto cadastrado. Cadastre produtos em <strong>Produtos</strong> para aparecerem aqui.
            </p>
          </div>
        `;
        return;
      }

      produtosGrid.innerHTML = produtosDisponiveis.map(produto => {
        const statusEstoque =
          produto.estoque === 0 ? 'stock-out' :
          produto.estoque <= 3 ? 'stock-low' : 'stock-ok';

        const textoEstoque =
          produto.estoque === 0 ? 'Esgotado' :
          produto.estoque <= 3 ? `${produto.estoque} un` : 'Em estoque';

        return `
          <div class="product-card" onclick="adicionarAoCarrinho(${produto.id})" data-categoria="${produto.categoria}">
            <div class="product-card-header">
              <div>
                <div class="product-name">${produto.nome}</div>
                <div class="product-code">${produto.codigo || ''}</div>
              </div>
              <span class="stock-badge ${statusEstoque}">${textoEstoque}</span>
            </div>
            <div class="product-price">R$ ${produto.preco.toFixed(2)}</div>
            <div class="product-stock">${produto.marca || ''}</div>
          </div>
        `;
      }).join('');
    }

    function filtrarProdutos() {
      const termo = document.getElementById('buscarProduto').value.toLowerCase();
      const cards = document.querySelectorAll('.product-card');
      cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(termo) ? 'flex' : 'none';
      });
    }

    // ============================
    // CLIENTES (REAIS) - somente cliente cadastrado
    // ============================
    function carregarClientesSelect() {
      const select = document.getElementById('clienteSelect');
      const clientes = lsReadJSON(LS.clientes, []) || [];

      const options = [
        `<option value="">Selecionar cliente...</option>`,
        ...clientes
          .filter(c => c && c.status === 'ativo')
          .sort((a,b) => (a.nome || '').localeCompare(b.nome || ''))
          .map(c => `<option value="${c.id}">${c.nome}</option>`)
      ];

      select.innerHTML = options.join('');
    }

    // ============================
    // CARRINHO
    // ============================
    function persistCarrinho() {
      lsWriteJSON(LS.carrinhoVendas, carrinho);
    }

    function adicionarAoCarrinho(produtoId) {
      const produto = produtosDisponiveis.find(p => p.id === produtoId);
      if (!produto) return;

      if (produto.estoque === 0) {
        mostrarNotificacao('❌ Produto esgotado!', 'danger');
        return;
      }

      const itemExistente = carrinho.find(item => item.id === produtoId);

      if (itemExistente) {
        if (itemExistente.quantidade >= produto.estoque) {
          mostrarNotificacao('❌ Estoque insuficiente!', 'danger');
          return;
        }
        itemExistente.quantidade++;
      } else {
        carrinho.push({
          id: produto.id,
          nome: produto.nome,
          codigo: produto.codigo,
          preco: produto.preco,
          quantidade: 1
        });
      }

      persistCarrinho();
      atualizarCarrinho();
      mostrarNotificacao(`✅ ${produto.nome} adicionado ao carrinho!`, 'success');
    }

    function removerDoCarrinho(produtoId) {
      carrinho = carrinho.filter(item => item.id !== produtoId);
      persistCarrinho();
      atualizarCarrinho();
      mostrarNotificacao('🗑️ Item removido do carrinho', 'warning');
    }

    function atualizarQuantidade(produtoId, delta) {
      const item = carrinho.find(item => item.id === produtoId);
      if (!item) return;

      const produto = produtosDisponiveis.find(p => p.id === produtoId);
      const novaQuantidade = item.quantidade + delta;

      if (novaQuantidade < 1) {
        removerDoCarrinho(produtoId);
        return;
      }

      if (produto && novaQuantidade > produto.estoque) {
        mostrarNotificacao('❌ Estoque insuficiente!', 'danger');
        return;
      }

      item.quantidade = novaQuantidade;
      persistCarrinho();
      atualizarCarrinho();
    }

    function atualizarCarrinho() {
      const cartItems = document.getElementById('cart-items');
      const cartCount = document.getElementById('cart-count');

      const subtotalElement = document.getElementById('subtotal');
      const totalElement = document.getElementById('total');

      const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
      cartCount.textContent = `${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`;

      const subtotal = carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
      const total = Math.max(0, subtotal - descontoAplicado);

      subtotalElement.textContent = `R$ ${subtotal.toFixed(2)}`;
      document.getElementById('desconto').textContent = `R$ ${descontoAplicado.toFixed(2)}`;
      totalElement.textContent = `R$ ${total.toFixed(2)}`;

      document.getElementById('resumo-itens').textContent = totalItens;
      document.getElementById('resumo-subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
      document.getElementById('resumo-desconto').textContent = `R$ ${descontoAplicado.toFixed(2)}`;
      document.getElementById('resumo-total').textContent = `R$ ${total.toFixed(2)}`;

      if (carrinho.length === 0) {
        cartItems.innerHTML = `
          <div class="empty-state" style="padding: var(--space-8);">
            <div style="font-size: 2rem; margin-bottom: var(--space-2);">🛒</div>
            <p style="color: var(--text-tertiary);">Adicione produtos ao carrinho</p>
          </div>
        `;
        return;
      }

      cartItems.innerHTML = carrinho.map(item => `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.nome}</div>
            <div class="cart-item-price">R$ ${item.preco.toFixed(2)}</div>
          </div>
          <div class="cart-item-actions">
            <div class="quantity-control">
              <button class="quantity-btn" onclick="atualizarQuantidade(${item.id}, -1)">−</button>
              <span class="quantity-value">${item.quantidade}</span>
              <button class="quantity-btn" onclick="atualizarQuantidade(${item.id}, 1)">+</button>
            </div>
            <div class="remove-btn" onclick="removerDoCarrinho(${item.id})">🗑️</div>
          </div>
        </div>
      `).join('');
    }

    function limparCarrinho() {
      if (carrinho.length === 0) {
        mostrarNotificacao('🛒 Carrinho já está vazio', 'info');
        return;
      }
      carrinho = [];
      persistCarrinho();
      descontoAplicado = 0;
      atualizarCarrinho();
      mostrarNotificacao('🗑️ Carrinho limpo com sucesso!', 'warning');
    }

    function aplicarDesconto() {
      const subtotal = carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);

      if (subtotal === 0) {
        mostrarNotificacao('🛒 Adicione produtos ao carrinho primeiro', 'info');
        return;
      }

      const desconto = prompt(`Aplicar desconto (máximo R$ ${subtotal.toFixed(2)}):`, "0.00");
      if (desconto === null) return;

      const valorDesconto = parseFloat(desconto);

      if (isNaN(valorDesconto) || valorDesconto < 0) {
        mostrarNotificacao('❌ Valor de desconto inválido', 'danger');
        return;
      }

      if (valorDesconto > subtotal) {
        mostrarNotificacao('❌ Desconto não pode ser maior que o subtotal', 'danger');
        return;
      }

      descontoAplicado = valorDesconto;
      atualizarCarrinho();
      mostrarNotificacao(`🎁 Desconto de R$ ${valorDesconto.toFixed(2)} aplicado!`, 'success');
    }

    // ============================
    // PAGAMENTO
    // ============================
    function selecionarPagamento(element, forma) {
      document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
      element.classList.add('selected');
      formaPagamentoSelecionada = forma;

      const paymentFields = document.getElementById('paymentFields');
      paymentFields.style.display = 'grid';

      const trocoField = document.getElementById('trocoField');
      trocoField.style.display = forma === 'dinheiro' ? 'block' : 'none';

      // NOVO: mostrar opção pagar agora / gerar cobrança
      const fulfillmentWrap = document.getElementById('fulfillmentWrap');
      if (fulfillmentWrap) fulfillmentWrap.style.display = 'block';

      if (forma === 'dinheiro') calcularTroco();
    }

    function calcularTroco() {
      if (formaPagamentoSelecionada !== 'dinheiro') return;

      const valorRecebido = parseFloat(document.getElementById('valorRecebido').value) || 0;
      const subtotal = carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
      const total = Math.max(0, subtotal - descontoAplicado);

      const troco = valorRecebido - total;
      document.getElementById('troco').value = troco > 0 ? `R$ ${troco.toFixed(2)}` : 'R$ 0,00';
    }

    function getFulfillmentChoice() {
      const checked = document.querySelector('input[name="fulfillment"]:checked');
      return checked ? checked.value : 'pay_now';
    }

    // ============================
    // COBRANÇAS (padronizado)
    // ============================
    function getCobrancas() {
      const list = lsReadJSON(LS.cobrancas, []);
      return Array.isArray(list) ? list : [];
    }

    function setCobrancas(list) {
      lsWriteJSON(LS.cobrancas, Array.isArray(list) ? list : []);
    }

    function createCobrancaFromVenda(venda) {
      // Modelo simples e padronizado
      const cobranca = {
        id: Date.now(),
        vendaId: venda.id,
        numeroVenda: venda.numero,
        clienteId: venda.clienteId,
        clienteNome: venda.clienteNome,
        valor: Number(venda.total || 0),
        formaPagamentoSugerida: venda.formaPagamento || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        dueDate: '',     // opcional (pode ser preenchido em cobranca.html)
        paidAt: ''
      };

      const cobrancas = getCobrancas();
      cobrancas.unshift(cobranca);
      setCobrancas(cobrancas);

      return cobranca;
    }

    // ============================
    // FINALIZAR VENDA
    // Regras (1A):
    // - Pagar agora: status completed + baixa estoque
    // - Gerar cobrança: status pending + NÃO baixa estoque + cria osflow:cobrancas
    // ============================
    function finalizarVenda() {
      if (carrinho.length === 0) {
        mostrarNotificacao('🛒 Adicione produtos ao carrinho primeiro', 'danger');
        return;
      }

      // Exigir cliente cadastrado
      const clienteId = document.getElementById('clienteSelect').value || '';
      if (!clienteId) {
        mostrarNotificacao('👥 Selecione um cliente cadastrado para finalizar', 'danger');
        return;
      }

      if (!formaPagamentoSelecionada) {
        mostrarNotificacao('💳 Selecione uma forma de pagamento', 'danger');
        return;
      }

      const fulfillment = getFulfillmentChoice(); // pay_now | charge

      const subtotal = carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
      const total = Math.max(0, subtotal - descontoAplicado);

      // Se pagar agora e for dinheiro, validar valor recebido
      if (fulfillment === 'pay_now' && formaPagamentoSelecionada === 'dinheiro') {
        const valorRecebido = parseFloat(document.getElementById('valorRecebido').value) || 0;
        if (valorRecebido < total) {
          mostrarNotificacao('💵 Valor recebido insuficiente', 'danger');
          return;
        }
      }

      // Revalida estoque com base nos produtos reais (sempre valida antes de vender/gerar cobrança)
      const produtosAtuais = lsReadJSON(LS.produtos, []) || [];
      for (const item of carrinho) {
        const p = produtosAtuais.find(pp => pp.id === item.id);
        const estoqueAtual = Number(p?.estoque_atual || 0);
        if (!p) {
          mostrarNotificacao(`❌ Produto não encontrado no cadastro: ${item.nome}`, 'danger');
          return;
        }
        if (estoqueAtual < item.quantidade) {
          mostrarNotificacao(`❌ Estoque insuficiente para: ${item.nome}`, 'danger');
          return;
        }
      }

      const clienteNome = document.getElementById('clienteSelect')
        .options[document.getElementById('clienteSelect').selectedIndex].text;

      const vendaId = Date.now();

      const novaVenda = {
        id: vendaId,
        numero: 'V' + String(vendaId).slice(-6),
        clienteId,
        clienteNome,
        data: new Date().toISOString(),
        itens: [...carrinho],
        subtotal,
        desconto: descontoAplicado,
        total,
        formaPagamento: formaPagamentoSelecionada,

        // status final depende do fulfillment
        status: (fulfillment === 'pay_now') ? 'completed' : 'pending',

        // link opcional para cobrança
        cobrancaId: null
      };

      if (fulfillment === 'pay_now') {
        // Baixa estoque REAL + recalcula status do produto
        for (const item of carrinho) {
          const idx = produtosAtuais.findIndex(p => p.id === item.id);
          const p = produtosAtuais[idx];

          const novoEstoque = Math.max(0, Number(p.estoque_atual || 0) - item.quantidade);
          p.estoque_atual = novoEstoque;

          if (p.status !== 'inativo') {
            if (novoEstoque === 0) p.status = 'esgotado';
            else p.status = 'ativo';
          }

          produtosAtuais[idx] = p;
        }
        lsWriteJSON(LS.produtos, produtosAtuais);
      }

      // Se gerar cobrança: cria cobrança e vincula
      if (fulfillment === 'charge') {
        const cobranca = createCobrancaFromVenda(novaVenda);
        novaVenda.cobrancaId = cobranca.id;
      }

      // Salva venda em osflow:vendas
      vendas = [novaVenda, ...vendas];
      lsWriteJSON(LS.vendas, vendas);

      // Comprovante / feedback
      if (fulfillment === 'pay_now') {
        gerarComprovante(novaVenda);
        mostrarNotificacao('✅ Venda realizada com sucesso!', 'success');
      } else {
        mostrarNotificacao('📄 Cobrança gerada! Venda aguardando pagamento.', 'warning');
      }

      // Limpa estado
      carrinho = [];
      persistCarrinho();
      descontoAplicado = 0;
      formaPagamentoSelecionada = null;

      // Atualiza UI
      carregarProdutosDoStorage();
      carregarProdutosGrid();
      atualizarCarrinho();
      carregarVendas();
      atualizarEstatisticas();

      // Reset formulário lateral
      document.getElementById('clienteSelect').value = '';
      document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
      document.getElementById('paymentFields').style.display = 'none';
      document.getElementById('valorRecebido').value = '';
      document.getElementById('troco').value = '';
      const fulfillmentWrap = document.getElementById('fulfillmentWrap');
      if (fulfillmentWrap) fulfillmentWrap.style.display = 'none';
      document.getElementById('optPayNow').checked = true;
    }

    // ============================
    // COMPROVANTE / TABELA VENDAS
    // ============================
    function gerarComprovante(venda) {
      const comprovante = document.getElementById('modalComprovanteCorpo');

      const dataFormatada = new Date(venda.data).toLocaleString('pt-BR');
      const itensHTML = venda.itens.map(item => `
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2); font-size: 0.875rem;">
          <div>${item.nome} (${item.quantidade}x)</div>
          <div>R$ ${(item.preco * item.quantidade).toFixed(2)}</div>
        </div>
      `).join('');

      comprovante.innerHTML = `
        <div style="text-align: center; margin-bottom: var(--space-4);">
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary-600);">OS FLOW</div>
          <div style="font-size: 0.75rem; color: var(--text-tertiary);">Sistema de Gestão</div>
        </div>

        <div style="margin-bottom: var(--space-4);">
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">
            <span style="font-weight: 600;">Venda:</span>
            <span>${venda.numero}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">
            <span style="font-weight: 600;">Data:</span>
            <span>${dataFormatada}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-4);">
            <span style="font-weight: 600;">Cliente:</span>
            <span>${venda.clienteNome}</span>
          </div>
        </div>

        <div style="border-top: 2px dashed var(--border-light); border-bottom: 2px dashed var(--border-light); padding: var(--space-4) 0; margin-bottom: var(--space-4);">
          ${itensHTML}
        </div>

        <div style="margin-bottom: var(--space-4);">
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">
            <span>Subtotal:</span>
            <span>R$ ${Number(venda.subtotal || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">
            <span>Desconto:</span>
            <span>R$ ${Number(venda.desconto || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.125rem; font-weight: 700; padding-top: var(--space-2); border-top: 2px solid var(--border-light);">
            <span>TOTAL:</span>
            <span>R$ ${Number(venda.total || 0).toFixed(2)}</span>
          </div>
        </div>

        <div style="text-align: center; padding: var(--space-4); background: var(--gray-50); border-radius: var(--radius-lg);">
          <div style="font-size: 0.875rem; font-weight: 600; margin-bottom: var(--space-1);">Forma de Pagamento</div>
          <div style="font-size: 1rem; color: var(--primary-600); font-weight: 700;">${formatarPagamento(venda.formaPagamento)}</div>
        </div>

        <div style="text-align: center; margin-top: var(--space-6); font-size: 0.75rem; color: var(--text-tertiary);">
          Obrigado pela preferência!<br>Volte sempre!
        </div>
      `;

      abrirModalComprovante();
    }

    function formatarPagamento(forma) {
      const formas = {
        dinheiro: '💵 Dinheiro',
        cartao: '💳 Cartão',
        pix: '🧾 PIX',
        boleto: '📄 Boleto'
      };
      return formas[forma] || forma;
    }

    function statusLabel(status) {
      if (status === 'completed') return { cls: 'status-completed', text: 'Concluída' };
      if (status === 'pending') return { cls: 'status-pending', text: 'Aguardando' };
      if (status === 'cancelled') return { cls: 'status-cancelled', text: 'Cancelada' };
      return { cls: 'status-pending', text: status || '—' };
    }

    function carregarVendas() {
      // sempre recarrega do storage
      vendas = lsReadJSON(LS.vendas, []) || [];

      const tbody = document.getElementById('vendasLista');
      const emptyState = document.getElementById('semVendas');

      if (!Array.isArray(vendas) || vendas.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';

      const vendasOrdenadas = [...vendas].sort((a, b) => new Date(b.data) - new Date(a.data));

      tbody.innerHTML = vendasOrdenadas.slice(0, 10).map(venda => {
        const data = new Date(venda.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
        const totalItens = (venda.itens || []).reduce((total, item) => total + (item.quantidade || 0), 0);
        const st = statusLabel(venda.status);

        return `
          <tr>
            <td><strong>${venda.numero}</strong></td>
            <td>${venda.clienteNome}</td>
            <td>
              <div>${dataFormatada}</div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">${horaFormatada}</div>
            </td>
            <td>${totalItens} itens</td>
            <td><strong>R$ ${Number(venda.total || 0).toFixed(2)}</strong></td>
            <td>
              <span class="sale-status ${st.cls}">${st.text}</span>
            </td>
            <td>
              <div class="table-actions">
                <button class="btn btn-icon btn-view" onclick="verDetalhesVenda(${venda.id})"><span>👁️</span></button>
                <button class="btn btn-icon btn-print" onclick="imprimirVenda(${venda.id})"><span>🖨️</span></button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    function verDetalhesVenda(vendaId) {
      const venda = (lsReadJSON(LS.vendas, []) || []).find(v => v.id === vendaId);
      if (!venda) return;

      if (venda.status === 'pending' && venda.cobrancaId) {
        mostrarNotificacao(`📄 Venda aguardando pagamento (Cobrança #${venda.cobrancaId})`, 'warning');
        return;
      }

      mostrarNotificacao('📋 Abrindo detalhes da venda...', 'info');
    }

    function imprimirVenda(vendaId) {
      const venda = (lsReadJSON(LS.vendas, []) || []).find(v => v.id === vendaId);
      if (!venda) return;

      if (venda.status !== 'completed') {
        mostrarNotificacao('ℹ️ Somente vendas concluídas geram comprovante.', 'info');
        return;
      }

      gerarComprovante(venda);
    }

    function imprimirComprovante() { window.print(); }

    // ============================
    // ESTATÍSTICAS (REAIS a partir de osflow:vendas)
    // - conta somente vendas concluídas
    // ============================
    function atualizarEstatisticas() {
      const list = lsReadJSON(LS.vendas, []) || [];
      const vendasConcluidas = list.filter(v => v && v.status === 'completed');

      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();

      const vendasMes = vendasConcluidas.filter(v => {
        const dataVenda = new Date(v.data);
        return dataVenda.getMonth() === mesAtual && dataVenda.getFullYear() === anoAtual;
      });

      const totalVendasMes = vendasMes.reduce((total, v) => total + Number(v.total || 0), 0);
      const totalProdutosVendidos = vendasMes.reduce((total, v) => {
        return total + (v.itens || []).reduce((sum, item) => sum + Number(item.quantidade || 0), 0);
      }, 0);

      const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
      const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

      const vendasMesAnterior = vendasConcluidas.filter(v => {
        const dataVenda = new Date(v.data);
        return dataVenda.getMonth() === mesAnterior && dataVenda.getFullYear() === anoAnterior;
      });

      const totalVendasMesAnterior = vendasMesAnterior.reduce((total, v) => total + Number(v.total || 0), 0);
      const crescimento = totalVendasMesAnterior > 0
        ? ((totalVendasMes - totalVendasMesAnterior) / totalVendasMesAnterior * 100).toFixed(0)
        : (totalVendasMes > 0 ? '100' : '0');

      const clientesMes = new Set(vendasMes.map(v => v.clienteId).filter(Boolean));

      document.getElementById('total-vendas-mes').textContent = `R$ ${(totalVendasMes / 1000).toFixed(1)}k`;
      document.getElementById('crescimento').textContent = `${Number(crescimento) >= 0 ? '+' : ''}${crescimento}%`;
      document.getElementById('produtos-vendidos').textContent = String(totalProdutosVendidos);
      document.getElementById('clientes-mes').textContent = String(clientesMes.size);

      const hojeStr = new Date().toDateString();
      const vendasHoje = vendasConcluidas.filter(v => new Date(v.data).toDateString() === hojeStr);
      const valorHoje = vendasHoje.reduce((total, v) => total + Number(v.total || 0), 0);

      document.getElementById('vendas-hoje').textContent = String(vendasHoje.length);
      document.getElementById('valor-hoje').textContent = `R$ ${valorHoje.toFixed(0)}`;
    }

    // ============================
    // AÇÕES AUX
    // ============================
    function abrirCaixa() {
      mostrarNotificacao('💵 Abrindo caixa...', 'info');
      setTimeout(() => mostrarNotificacao('✅ Caixa aberto com sucesso!', 'success'), 1000);
    }

    function gerarRelatorio() {
      mostrarNotificacao('📊 Gerando relatório de vendas...', 'info');
      setTimeout(() => mostrarNotificacao('✅ Relatório gerado e salvo!', 'success'), 1500);
    }

    function novaVenda() {
      limparCarrinho();
      mostrarNotificacao('🆕 Nova venda iniciada!', 'info');
    }

    function cadastrarCliente() {
      window.open('cadastrar-clientes.html', '_blank');
    }

    function verTodasVendas() {
      mostrarNotificacao('📋 Carregando todas as vendas...', 'info');
    }

    // ============================
    // MODAIS
    // ============================
    function abrirModal() { document.getElementById('modalConfirmacao').style.display = 'flex'; }

    function fecharModal() {
      const modal = document.getElementById('modalConfirmacao');
      modal.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => { modal.style.display = 'none'; modal.style.animation = ''; }, 300);
    }

    function abrirModalComprovante() { document.getElementById('modalComprovante').style.display = 'flex'; }

    function fecharModalComprovante() {
      const modal = document.getElementById('modalComprovante');
      modal.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => { modal.style.display = 'none'; modal.style.animation = ''; }, 300);
    }

    function confirmarAcao() { fecharModal(); }

    // ============================
    // NOTIFICAÇÕES
    // ============================
    function mostrarNotificacao(mensagem, tipo = 'info') {
      const cores = {
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--primary-500)'
      };

      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${cores[tipo] || cores.info};
        color: white;
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        font-size: 0.875rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: var(--space-2);
        animation: slideUp 0.3s ease-out;
      `;
      notification.innerHTML = mensagem;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }

    // ============================
    // ATALHOS
    // ============================
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); novaVenda(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); toggleSidebar(); }
      if (e.key === 'F2') { e.preventDefault(); abrirCaixa(); }
      if (e.key === 'F5') { e.preventDefault(); finalizarVenda(); }
      if (e.key === 'Escape') { e.preventDefault(); limparCarrinho(); }
    });

    // Atualiza produtos/clientes/vendas/cobranças ao mudar storage em outra aba
    window.addEventListener('storage', (e) => {
      if (e.key === LS.produtos) {
        carregarProdutosDoStorage();
        carregarProdutosGrid();
      }
      if (e.key === LS.clientes) {
        carregarClientesSelect();
      }
      if (e.key === LS.sidebarCollapsed) {
        restoreSidebarState();
      }
      if (e.key === LS.vendas) {
        vendas = lsReadJSON(LS.vendas, []) || [];
        carregarVendas();
        atualizarEstatisticas();
      }
      // Se cobrança mudar e sua tela quiser refletir (ex: venda virou completed), o cobranca.html deve atualizar osflow:vendas
      if (e.key === LS.cobrancas) {
        // opcional: apenas recarrega vendas, caso o cobranca.html tenha atualizado vendas também
        vendas = lsReadJSON(LS.vendas, []) || [];
        carregarVendas();
        atualizarEstatisticas();
      }
    });