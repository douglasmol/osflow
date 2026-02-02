// ============================
    // LOCALSTORAGE PADRONIZADO (OS Flow)
    // ============================
    const LS = Object.freeze({
      clientes: 'osflow:clientes',
      atividadesClientes: 'osflow:atividades:clientes',
      produtos: 'osflow:produtos',
      sidebarCollapsed: 'osflow:ui:sidebarCollapsed',

      // legado (migração)
      legacyClientes: 'clientesOSFlow',
      legacyAtividadesClientes: 'atividadesClientes',
      legacyProdutos: 'produtosOSFlow',
      legacySidebarCollapsed: 'sidebarCollapsed'
    });

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

    function migrateLocalStorageKeys() {
      if (!localStorage.getItem(LS.clientes) && localStorage.getItem(LS.legacyClientes)) {
        localStorage.setItem(LS.clientes, localStorage.getItem(LS.legacyClientes));
      }
      if (!localStorage.getItem(LS.atividadesClientes) && localStorage.getItem(LS.legacyAtividadesClientes)) {
        localStorage.setItem(LS.atividadesClientes, localStorage.getItem(LS.legacyAtividadesClientes));
      }
      if (!localStorage.getItem(LS.produtos) && localStorage.getItem(LS.legacyProdutos)) {
        localStorage.setItem(LS.produtos, localStorage.getItem(LS.legacyProdutos));
      }
      if (!localStorage.getItem(LS.sidebarCollapsed) && localStorage.getItem(LS.legacySidebarCollapsed)) {
        localStorage.setItem(LS.sidebarCollapsed, localStorage.getItem(LS.legacySidebarCollapsed));
      }
    }

    migrateLocalStorageKeys();

    // ============================
    // DADOS
    // ============================
    // OBS: você pediu para iniciar vazio (sem seed). Mantive o array apenas como referência,
    // mas ele não é mais aplicado automaticamente.
    const produtosDefault = [
      {
        id: 1,
        nome: 'iPhone 14 Pro 256GB',
        codigo: 'APP-IP14P-256',
        categoria: 'smartphone',
        marca: 'Apple',
        preco_custo: 4500.00,
        preco_venda: 6999.00,
        estoque_atual: 8,
        estoque_minimo: 5,
        fornecedor: 'Apple Brasil',
        tags: ['smartphone', 'apple', 'premium', 'novo'],
        descricao: 'iPhone 14 Pro 256GB Space Black, tela Super Retina XDR, câmera tripla 48MP',
        status: 'ativo',
        localizacao: 'Prateleira A1',
        dataCadastro: '2024-01-15'
      }
    ];

    // ====== ALTERADO: inicia vazio se não houver nada no storage ======
    let produtos = lsReadJSON(LS.produtos, null);
    if (!Array.isArray(produtos)) produtos = [];
    // garante persistência no padrão SEM sobrescrever quando já existe
    if (!localStorage.getItem(LS.produtos)) lsWriteJSON(LS.produtos, produtos);

    let produtoEditando = null;
    let acaoConfirmar = null;
    let dadosConfirmacao = null;
    let tagsSelecionadas = new Set();

    // ============================
    // INIT
    // ============================
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('ano-atual').textContent = new Date().getFullYear();

      // Restaurar estado do sidebar
      const isCollapsed = localStorage.getItem(LS.sidebarCollapsed) === 'true';
      const layout = document.getElementById('mainLayout');
      if (isCollapsed) layout.classList.add('collapsed');

      // Inicializar tags selecionadas
      document.querySelectorAll('.category-tag').forEach(tag => {
        if (tag.classList.contains('active')) tagsSelecionadas.add(tag.textContent);
      });

      // ====== ALTERADO: sempre recarrega do storage como fonte da verdade ======
      produtos = lsReadJSON(LS.produtos, []) || [];

      carregarProdutos();
      atualizarEstatisticas();
      renderAlertas();
      renderCategoriasPopulares();
    });

    // TOGGLE SIDEBAR
    function toggleSidebar() {
      const layout = document.getElementById('mainLayout');
      layout.classList.toggle('collapsed');
      const isCollapsed = layout.classList.contains('collapsed');
      localStorage.setItem(LS.sidebarCollapsed, isCollapsed);
    }

    // TOGGLE TAGS
    function toggleTag(element) {
      element.classList.toggle('active');
      const tagText = element.textContent;

      if (element.classList.contains('active')) tagsSelecionadas.add(tagText);
      else tagsSelecionadas.delete(tagText);
    }

    // ============================
    // HELPERS
    // ============================
    function formatarCategoria(categoria) {
      const categorias = {
        'smartphone': 'Smartphone',
        'notebook': 'Notebook',
        'tablet': 'Tablet',
        'acessorios': 'Acessórios',
        'pecas': 'Peças',
        'perifericos': 'Periféricos'
      };
      return categorias[categoria] || (categoria || '-');
    }

    function formatBRL(value) {
      const n = Number(value || 0);
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function calcProdutosMetrics(list) {
      const total = list.length;

      const ativos = list.filter(p => p.status === 'ativo').length;

      const esgotados = list.filter(p => (p.status === 'esgotado') || (Number(p.estoque_atual) === 0)).length;

      const baixos = list.filter(p => {
        const estoqueAtual = Number(p.estoque_atual || 0);
        const estoqueMin = Number(p.estoque_minimo || 0);
        const isAtivo = p.status === 'ativo';
        return isAtivo && estoqueAtual > 0 && estoqueMin > 0 && estoqueAtual <= estoqueMin;
      }).length;

      const valorEstoque = list.reduce((acc, p) => {
        const qtd = Number(p.estoque_atual || 0);
        const custo = Number(p.preco_custo || 0);
        return acc + (qtd * custo);
      }, 0);

      const lucroMedio = list.length > 0
        ? list.reduce((acc, p) => {
            const custo = Number(p.preco_custo || 0);
            const venda = Number(p.preco_venda || 0);
            if (custo <= 0) return acc;
            return acc + ((venda - custo) / custo) * 100;
          }, 0) / list.length
        : 0;

      const categorias = {};
      list.forEach(p => {
        if (!p.categoria) return;
        categorias[p.categoria] = (categorias[p.categoria] || 0) + 1;
      });
      const topCategoria = Object.entries(categorias).sort((a,b) => b[1]-a[1])[0]?.[0] || '';

      const d30 = new Date();
      d30.setDate(d30.getDate() - 30);
      d30.setHours(0,0,0,0);
      const novos30 = list.filter(p => {
        if (!p.dataCadastro) return false;
        const d = new Date(p.dataCadastro);
        return !isNaN(d) && d >= d30;
      }).length;

      const estoqueOkCount = Math.max(0, total - baixos - esgotados);
      const percentOk = total > 0 ? Math.round((estoqueOkCount / total) * 100) : 0;
      const percentBaixo = total > 0 ? Math.round((baixos / total) * 100) : 0;
      const percentEsgotado = total > 0 ? Math.round((esgotados / total) * 100) : 0;

      return {
        total,
        ativos,
        baixos,
        esgotados,
        valorEstoque,
        lucroMedio,
        topCategoria,
        novos30,
        percentOk,
        percentBaixo,
        percentEsgotado,
        estoqueOkCount
      };
    }

    function persistProdutos() {
      lsWriteJSON(LS.produtos, produtos);
    }

    // ============================
    // CRUD
    // ============================
    function salvarProduto(event) {
      event.preventDefault();

      const estoqueAtual = parseInt(document.getElementById('estoque_atual').value, 10);
      const estoqueMinimo = parseInt(document.getElementById('estoque_minimo').value, 10) || 0;

      let status = document.getElementById('status').value;
      if (status !== 'inativo') {
        if (estoqueAtual === 0) status = 'esgotado';
        else status = 'ativo';
      }

      const produto = {
        id: produtoEditando ? produtoEditando.id : Date.now(),
        nome: document.getElementById('nome').value,
        codigo: document.getElementById('codigo').value,
        categoria: document.getElementById('categoria').value,
        marca: document.getElementById('marca').value,
        preco_custo: parseFloat(document.getElementById('preco_custo').value),
        preco_venda: parseFloat(document.getElementById('preco_venda').value),
        estoque_atual: estoqueAtual,
        estoque_minimo: estoqueMinimo,
        fornecedor: document.getElementById('fornecedor').value,
        tags: Array.from(tagsSelecionadas),
        descricao: document.getElementById('descricao').value,
        status,
        localizacao: document.getElementById('localizacao').value,
        dataCadastro: produtoEditando ? produtoEditando.dataCadastro : new Date().toISOString().split('T')[0]
      };

      if (produtoEditando) {
        const index = produtos.findIndex(p => p.id === produtoEditando.id);
        produtos[index] = produto;
        mostrarNotificacao('✅ Produto atualizado com sucesso!', 'success');
      } else {
        produtos.push(produto);
        mostrarNotificacao('✨ Produto cadastrado com sucesso!', 'success');
      }

      persistProdutos();

      carregarProdutos();
      atualizarEstatisticas();
      renderAlertas();
      renderCategoriasPopulares();
      limparFormulario();
      produtoEditando = null;
    }

    function carregarProdutos() {
      const tbody = document.getElementById('produtosLista');
      const emptyState = document.getElementById('semProdutos');

      if (produtos.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';
      const produtosOrdenados = [...produtos].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      tbody.innerHTML = produtosOrdenados.map(produto => {
        let statusClass = '';
        let statusText =
          produto.status === 'ativo' ? 'Ativo' :
          produto.status === 'inativo' ? 'Inativo' :
          'Esgotado';

        const estoqueAtual = Number(produto.estoque_atual || 0);
        const estoqueMin = Number(produto.estoque_minimo || 0);

        if (produto.status === 'ativo') {
          if (estoqueAtual === 0) {
            statusClass = 'status-out';
            statusText = 'Esgotado';
          } else if (estoqueMin > 0 && estoqueAtual <= estoqueMin) {
            statusClass = 'status-low';
            statusText = 'Estoque Baixo';
          } else {
            statusClass = 'status-active';
          }
        } else if (produto.status === 'inativo') {
          statusClass = 'status-inactive';
        } else if (produto.status === 'esgotado') {
          statusClass = 'status-out';
          statusText = 'Esgotado';
        }

        const custo = Number(produto.preco_custo || 0);
        const venda = Number(produto.preco_venda || 0);
        const margem = (custo > 0) ? (((venda - custo) / custo) * 100).toFixed(1) : '0.0';

        return `
          <tr data-id="${produto.id}">
            <td>
              <strong>${produto.nome}</strong>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">${produto.marca || ''}</div>
            </td>
            <td><code>${produto.codigo || ''}</code></td>
            <td>${formatarCategoria(produto.categoria)}</td>
            <td>
              <strong>${estoqueAtual}</strong>
              ${estoqueMin ? `<div style="font-size: 0.6875rem; color: var(--text-muted);">Mín: ${estoqueMin}</div>` : ''}
            </td>
            <td>
              <strong>${formatBRL(venda)}</strong>
              <div style="font-size: 0.6875rem; color: var(--success); font-weight: 600;">+${margem}%</div>
            </td>
            <td>
              <span class="product-status ${statusClass}">
                ${statusText}
              </span>
            </td>
            <td>
              <div class="table-actions">
                <button class="btn btn-icon btn-view" onclick="verDetalhesProduto(${produto.id})">
                  <span>👁️</span>
                </button>
                <button class="btn btn-icon btn-edit" onclick="editarProduto(${produto.id})">
                  <span>✏️</span>
                </button>
                <button class="btn btn-icon btn-delete" onclick="confirmarExclusao(${produto.id})">
                  <span>🗑️</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    function editarProduto(id) {
      produtoEditando = produtos.find(p => p.id === id);
      if (!produtoEditando) return;

      document.getElementById('nome').value = produtoEditando.nome || '';
      document.getElementById('codigo').value = produtoEditando.codigo || '';
      document.getElementById('categoria').value = produtoEditando.categoria || '';
      document.getElementById('marca').value = produtoEditando.marca || '';
      document.getElementById('preco_custo').value = Number(produtoEditando.preco_custo || 0);
      document.getElementById('preco_venda').value = Number(produtoEditando.preco_venda || 0);
      document.getElementById('estoque_atual').value = Number(produtoEditando.estoque_atual || 0);
      document.getElementById('estoque_minimo').value = Number(produtoEditando.estoque_minimo || 0);
      document.getElementById('fornecedor').value = produtoEditando.fornecedor || '';
      document.getElementById('descricao').value = produtoEditando.descricao || '';
      document.getElementById('status').value = produtoEditando.status || 'ativo';
      document.getElementById('localizacao').value = produtoEditando.localizacao || '';

      tagsSelecionadas.clear();
      document.querySelectorAll('.category-tag').forEach(tag => {
        tag.classList.remove('active');
        if (produtoEditando.tags && produtoEditando.tags.includes(tag.textContent)) {
          tag.classList.add('active');
          tagsSelecionadas.add(tag.textContent);
        }
      });

      document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
      mostrarNotificacao('📝 Editando produto: ' + (produtoEditando.nome || ''), 'info');
    }

    function verDetalhesProduto(id) {
      const produto = produtos.find(p => p.id === id);
      if (!produto) return;

      const custo = Number(produto.preco_custo || 0);
      const venda = Number(produto.preco_venda || 0);

      const margem = (custo > 0) ? (((venda - custo) / custo) * 100).toFixed(1) : '0.0';
      const lucroUnitario = (venda - custo).toFixed(2);
      const valorTotalEstoque = (Number(produto.estoque_atual || 0) * custo).toFixed(2);

      document.getElementById('modalDetalhesTitulo').textContent = `Detalhes: ${produto.nome}`;
      document.getElementById('modalDetalhesCorpo').innerHTML = `
        <div style="display: grid; gap: var(--space-4);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-1);">Código</div>
              <div style="font-weight: 600;">${produto.codigo || '-'}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-1);">Categoria</div>
              <div style="font-weight: 600;">${formatarCategoria(produto.categoria)}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-1);">Marca</div>
              <div style="font-weight: 600;">${produto.marca || '-'}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-1);">Fornecedor</div>
              <div style="font-weight: 600;">${produto.fornecedor || '-'}</div>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border-light); padding-top: var(--space-4);">
            <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-2);">Informações Financeiras</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3);">
              <div style="text-align: center;">
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Custo</div>
                <div style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary);">${formatBRL(custo)}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Venda</div>
                <div style="font-size: 1.125rem; font-weight: 700; color: var(--primary-600);">${formatBRL(venda)}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Margem</div>
                <div style="font-size: 1.125rem; font-weight: 700; color: var(--success);">${margem}%</div>
              </div>
            </div>
            <div style="margin-top: var(--space-3); display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
              <div style="background: var(--gray-50); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: var(--space-3);">
                <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-1);">Lucro unitário</div>
                <div style="font-weight: 700; color: var(--success);">${formatBRL(lucroUnitario)}</div>
              </div>
              <div style="background: var(--gray-50); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: var(--space-3);">
                <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-1);">Valor total em estoque (custo)</div>
                <div style="font-weight: 700;">${formatBRL(valorTotalEstoque)}</div>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-1);">Estoque Atual</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: ${Number(produto.estoque_atual || 0) > 0 ? 'var(--success)' : 'var(--danger)'};">
                ${Number(produto.estoque_atual || 0)}
              </div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-1);">Estoque Mínimo</div>
              <div style="font-size: 1.5rem; font-weight: 800; color: var(--warning);">
                ${Number(produto.estoque_minimo || 0)}
              </div>
            </div>
          </div>

          ${produto.tags && produto.tags.length > 0 ? `
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-2);">Tags</div>
              <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
                ${produto.tags.map(tag => `<span style="background: var(--primary-100); color: var(--primary-700); padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); font-size: 0.75rem;">${tag}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${produto.descricao ? `
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-2);">Descrição</div>
              <div style="font-size: 0.875rem; line-height: 1.5; color: var(--text-secondary); background: var(--gray-50); padding: var(--space-3); border-radius: var(--radius-lg);">
                ${produto.descricao}
              </div>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-1);">Localização</div>
              <div style="font-weight: 600;">${produto.localizacao || '-'}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: var(--space-1);">Cadastrado em</div>
              <div style="font-weight: 600;">${produto.dataCadastro ? new Date(produto.dataCadastro).toLocaleDateString('pt-BR') : '-'}</div>
            </div>
          </div>
        </div>
      `;

      abrirModalDetalhes();
    }

    function confirmarExclusao(id) {
      const produto = produtos.find(p => p.id === id);
      if (!produto) return;

      acaoConfirmar = 'excluirProduto';
      dadosConfirmacao = { id, nome: produto.nome };

      document.getElementById('modalTitulo').textContent = 'Confirmar Exclusão';
      document.getElementById('modalCorpo').innerHTML = `
        <p>Tem certeza que deseja excluir o produto <strong>${produto.nome}</strong>?</p>
        <p style="color: var(--danger); font-size: 0.875rem; margin-top: var(--space-2);">
          ⚠️ Esta ação não pode ser desfeita.
        </p>
      `;

      abrirModal();
    }

    function excluirProduto(id) {
      produtos = produtos.filter(p => p.id !== id);
      persistProdutos();
      carregarProdutos();
      atualizarEstatisticas();
      renderAlertas();
      renderCategoriasPopulares();
      mostrarNotificacao('🗑️ Produto excluído com sucesso!', 'warning');
    }

    function limparFormulario() {
      document.getElementById('produtoForm').reset();
      produtoEditando = null;

      tagsSelecionadas.clear();
      document.querySelectorAll('.category-tag').forEach(tag => tag.classList.remove('active'));

      mostrarNotificacao('🆕 Formulário limpo. Pronto para novo cadastro.', 'info');
    }

    function filtrarProdutos() {
      const termo = document.getElementById('buscarProduto').value.toLowerCase();
      const linhas = document.querySelectorAll('#produtosLista tr');

      let encontrados = 0;
      linhas.forEach(linha => {
        const texto = linha.textContent.toLowerCase();
        const deveMostrar = texto.includes(termo);
        linha.style.display = deveMostrar ? '' : 'none';
        if (deveMostrar) encontrados++;
      });

      const emptyState = document.getElementById('semProdutos');
      if (encontrados === 0 && termo !== '') {
        emptyState.innerHTML = `
          <div class="empty-state-icon">🔍</div>
          <h3>Nenhum produto encontrado</h3>
          <p>Nenhum produto corresponde à busca: "${termo}"</p>
        `;
        emptyState.style.display = 'block';
      } else {
        emptyState.style.display = 'none';
      }
    }

    // ============================
    // MÉTRICAS (REAIS)
    // ============================
    function atualizarEstatisticas() {
      // ====== ALTERADO: sempre recarrega do storage antes de calcular ======
      produtos = lsReadJSON(LS.produtos, produtos) || [];

      const m = calcProdutosMetrics(produtos);

      document.getElementById('totalProdutos').textContent = m.total;
      document.getElementById('produtosAtivos').textContent = m.ativos;
      document.getElementById('produtosBaixos').textContent = m.baixos;

      const valor = m.valorEstoque;
      const valorEl = document.getElementById('valorEstoque');
      if (valor >= 1000) valorEl.textContent = `R$ ${(valor / 1000).toFixed(1)}k`;
      else valorEl.textContent = formatBRL(valor);

      document.getElementById('percentEstoqueOk').textContent = m.percentOk + '%';
      document.getElementById('lucroMedio').textContent = (isFinite(m.lucroMedio) ? m.lucroMedio : 0).toFixed(0) + '%';

      document.getElementById('giroEstoque').textContent = '-';

      document.getElementById('topCategoria').textContent = m.topCategoria ? formatarCategoria(m.topCategoria) : '-';
      document.getElementById('novosProdutos').textContent = m.novos30;

      document.getElementById('barEstoqueOkValue').textContent = m.estoqueOkCount;
      document.getElementById('barEstoqueBaixoValue').textContent = m.baixos;
      document.getElementById('barEsgotadoValue').textContent = m.esgotados;

      setTimeout(() => {
        document.getElementById('barEstoqueOk').style.width = m.percentOk + '%';
        document.getElementById('barEstoqueBaixo').style.width = m.percentBaixo + '%';
        document.getElementById('barEsgotado').style.width = m.percentEsgotado + '%';
      }, 100);
    }

    function renderAlertas() {
      const container = document.getElementById('alertsList');
      if (!container) return;

      const alertas = produtos
        .map(p => {
          const estoqueAtual = Number(p.estoque_atual || 0);
          const estoqueMin = Number(p.estoque_minimo || 0);

          if (estoqueAtual === 0) {
            return { tipo: 'danger', texto: `${p.nome} - Esgotado`, produtoId: p.id };
          }
          if (p.status === 'ativo' && estoqueMin > 0 && estoqueAtual <= estoqueMin) {
            return { tipo: 'warning', texto: `${p.nome} - Estoque baixo (${estoqueAtual} un.)`, produtoId: p.id };
          }
          return null;
        })
        .filter(Boolean)
        .sort((a,b) => (a.tipo === 'danger' ? -1 : 1))
        .slice(0, 3);

      if (alertas.length === 0) {
        container.innerHTML = `
          <div class="alert-item info">
            <div class="alert-text">✅ Nenhum alerta no momento</div>
            <span class="alert-action" onclick="verTodosAlertas()">Ok</span>
          </div>
        `;
        return;
      }

      container.innerHTML = alertas.map(a => {
        const cls = a.tipo === 'warning' ? 'warning' : a.tipo === 'info' ? 'info' : '';
        return `
          <div class="alert-item ${cls}">
            <div class="alert-text">${a.texto}</div>
            <span class="alert-action" onclick="reporEstoque(${a.produtoId})">Repor</span>
          </div>
        `;
      }).join('');
    }

    function renderCategoriasPopulares() {
      const container = document.getElementById('categoriesList');
      if (!container) return;

      const counts = {};
      produtos.forEach(p => {
        const cat = p.categoria || '';
        if (!cat) return;
        counts[cat] = (counts[cat] || 0) + 1;
      });

      const top = Object.entries(counts)
        .sort((a,b) => b[1]-a[1])
        .slice(0, 4);

      if (top.length === 0) {
        container.innerHTML = `
          <div class="category-item">
            <span class="category-name">-</span>
            <span class="category-count">0</span>
          </div>
        `;
        return;
      }

      container.innerHTML = top.map(([cat, n]) => `
        <div class="category-item">
          <span class="category-name">${formatarCategoria(cat)}</span>
          <span class="category-count">${n}</span>
        </div>
      `).join('');
    }

    // ============================
    // AÇÕES AUXILIARES
    // ============================
    function reporEstoque(produtoId) {
      const produto = produtos.find(p => p.id === produtoId);
      const nome = produto ? produto.nome : 'produto';
      mostrarNotificacao(`📦 Solicitando reposição: ${nome}...`, 'info');
      setTimeout(() => {
        mostrarNotificacao('✅ Reposição solicitada com sucesso!', 'success');
      }, 900);
    }

    function verTodosAlertas() {
      mostrarNotificacao('📋 Exibindo alertas (resumo)', 'info');
    }

    function exportarProdutos() {
      if (produtos.length === 0) {
        mostrarNotificacao('ℹ️ Nenhum produto para exportar.', 'info');
        return;
      }
      mostrarNotificacao('📤 Exportando produtos...', 'info');
      setTimeout(() => mostrarNotificacao('✅ Produtos exportados com sucesso!', 'success'), 1200);
    }

    function gerarRelatorioEstoque() {
      mostrarNotificacao('📊 Gerando relatório de estoque...', 'info');
      setTimeout(() => mostrarNotificacao('✅ Relatório gerado e salvo!', 'success'), 1500);
    }

    // ============================
    // MODAIS
    // ============================
    function abrirModal() {
      document.getElementById('modalConfirmacao').style.display = 'flex';
    }

    function fecharModal() {
      const modal = document.getElementById('modalConfirmacao');
      modal.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        modal.style.display = 'none';
        modal.style.animation = '';
      }, 300);
    }

    function abrirModalDetalhes() {
      document.getElementById('modalDetalhes').style.display = 'flex';
    }

    function fecharModalDetalhes() {
      const modal = document.getElementById('modalDetalhes');
      modal.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        modal.style.display = 'none';
        modal.style.animation = '';
      }, 300);
    }

    function confirmarAcao() {
      if (acaoConfirmar === 'excluirProduto') excluirProduto(dadosConfirmacao.id);
      fecharModal();
      acaoConfirmar = null;
      dadosConfirmacao = null;
    }

    // NOTIFICAÇÕES
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

    // ATALHOS DE TECLADO
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.querySelector('.btn-success').click();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.key === 'Escape') {
        limparFormulario();
      }
    });

    // ====== ADICIONADO: sincroniza com Dashboard e outras abas ======
    window.addEventListener('storage', (e) => {
      if (e.key === LS.produtos) {
        produtos = lsReadJSON(LS.produtos, []) || [];
        carregarProdutos();
        atualizarEstatisticas();
        renderAlertas();
        renderCategoriasPopulares();
      }
      if (e.key === LS.sidebarCollapsed) {
        const isCollapsed = localStorage.getItem(LS.sidebarCollapsed) === 'true';
        const layout = document.getElementById('mainLayout');
        if (isCollapsed) layout.classList.add('collapsed');
        else layout.classList.remove('collapsed');
      }
    });