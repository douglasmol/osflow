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

    // Banco de dados local (clientes) - mantém seu mock inicial como fallback
    let clientes = lsReadJSON(LS.clientes, null);
    if (!Array.isArray(clientes) || clientes.length === 0) {
      clientes = [
        {
          id: 1,
          nome: 'João Silva',
          cpf_cnpj: '123.456.789-00',
          email: 'joao@email.com',
          telefone: '(11) 99999-9999',
          endereco: 'Rua das Flores, 123',
          cidade: 'São Paulo',
          estado: 'SP',
          tipo: 'PF',
          status: 'ativo',
          observacoes: 'Cliente preferencial',
          dataCadastro: '2024-01-15'
        },
        {
          id: 2,
          nome: 'Tech Solutions Ltda',
          cpf_cnpj: '12.345.678/0001-99',
          email: 'contato@techsolutions.com',
          telefone: '(11) 88888-8888',
          endereco: 'Av. Paulista, 1000',
          cidade: 'São Paulo',
          estado: 'SP',
          tipo: 'PJ',
          status: 'ativo',
          observacoes: 'Empresa corporativa',
          dataCadastro: '2024-01-20'
        },
        {
          id: 3,
          nome: 'Maria Santos',
          cpf_cnpj: '987.654.321-00',
          email: 'maria@email.com',
          telefone: '(21) 77777-7777',
          endereco: 'Rua do Comércio, 456',
          cidade: 'Rio de Janeiro',
          estado: 'RJ',
          tipo: 'PF',
          status: 'ativo',
          observacoes: '',
          dataCadastro: '2024-02-01'
        },
        {
          id: 4,
          nome: 'Inova Tech',
          cpf_cnpj: '23.456.789/0001-00',
          email: 'vendas@inovatech.com.br',
          telefone: '(31) 66666-6666',
          endereco: 'Av. Afonso Pena, 2000',
          cidade: 'Belo Horizonte',
          estado: 'MG',
          tipo: 'PJ',
          status: 'inativo',
          observacoes: 'Cliente inativo desde 2023',
          dataCadastro: '2023-11-10'
        },
        {
          id: 5,
          nome: 'Carlos Mendes',
          cpf_cnpj: '456.789.123-00',
          email: 'carlos@email.com',
          telefone: '(41) 55555-5555',
          endereco: 'Rua XV de Novembro, 789',
          cidade: 'Curitiba',
          estado: 'PR',
          tipo: 'PF',
          status: 'ativo',
          observacoes: '',
          dataCadastro: '2024-02-05'
        },
        {
          id: 6,
          nome: 'Digital Store',
          cpf_cnpj: '34.567.890/0001-11',
          email: 'contato@digitalstore.com',
          telefone: '(51) 44444-4444',
          endereco: 'Av. Borges de Medeiros, 1500',
          cidade: 'Porto Alegre',
          estado: 'RS',
          tipo: 'PJ',
          status: 'ativo',
          observacoes: 'Loja online',
          dataCadastro: '2024-01-25'
        }
      ];
      lsWriteJSON(LS.clientes, clientes);
    }

    let clienteEditando = null;
    let acaoConfirmar = null;
    let dadosConfirmacao = null;

    // Inicialização
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('ano-atual').textContent = new Date().getFullYear();
      carregarClientes();
      atualizarEstatisticas();
      carregarAtividades();

      // Restaurar estado do sidebar
      restoreSidebarState();
    });

    // TOGGLE SIDEBAR
    function toggleSidebar() {
      const layout = document.getElementById('mainLayout');
      layout.classList.toggle('collapsed');
      const isCollapsed = layout.classList.contains('collapsed');
      localStorage.setItem(LS.sidebarCollapsed, isCollapsed);
    }

    function restoreSidebarState() {
      const isCollapsed = localStorage.getItem(LS.sidebarCollapsed) === 'true';
      const layout = document.getElementById('mainLayout');
      if (isCollapsed) layout.classList.add('collapsed');
    }

    // FORMATAÇÃO DE INPUTS
    document.getElementById('cpf_cnpj').addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      } else {
        value = value.replace(/^(\d{2})(\d)/, '$1.$2');
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
      }
      e.target.value = value;
    });

    document.getElementById('telefone').addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length <= 10) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{4})(\d)/, '$1-$2');
      } else {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
      }
      e.target.value = value;
    });

    // SALVAR CLIENTE
    function salvarCliente(event) {
      event.preventDefault();

      const cliente = {
        id: clienteEditando ? clienteEditando.id : Date.now(),
        nome: document.getElementById('nome').value,
        cpf_cnpj: document.getElementById('cpf_cnpj').value,
        email: document.getElementById('email').value,
        telefone: document.getElementById('telefone').value,
        endereco: document.getElementById('endereco').value,
        cidade: document.getElementById('cidade').value,
        estado: document.getElementById('estado').value,
        tipo: document.getElementById('tipo').value,
        status: document.getElementById('status').value,
        observacoes: document.getElementById('observacoes').value,
        dataCadastro: clienteEditando ? clienteEditando.dataCadastro : new Date().toISOString().split('T')[0]
      };

      if (clienteEditando) {
        const index = clientes.findIndex(c => c.id === clienteEditando.id);
        clientes[index] = cliente;
        registrarAtividade(`Cliente "${cliente.nome}" atualizado`, 'edicao');
        mostrarNotificacao('✅ Cliente atualizado com sucesso!', 'success');
      } else {
        clientes.push(cliente);
        registrarAtividade(`Novo cliente cadastrado: ${cliente.nome}`, 'cadastro');
        mostrarNotificacao('✨ Cliente cadastrado com sucesso!', 'success');
      }

      lsWriteJSON(LS.clientes, clientes);
      lsWriteJSON(LS.atividadesClientes, obterAtividades());

      carregarClientes();
      atualizarEstatisticas();
      carregarAtividades();
      limparFormulario();
      clienteEditando = null;
    }

    // CARREGAR CLIENTES NA TABELA
    function carregarClientes() {
      const tbody = document.getElementById('clientesLista');
      const emptyState = document.getElementById('semClientes');

      if (clientes.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';

      const clientesOrdenados = [...clientes].sort((a, b) => a.nome.localeCompare(b.nome));

      tbody.innerHTML = clientesOrdenados.map(cliente => `
        <tr data-id="${cliente.id}">
          <td><strong>${cliente.nome}</strong></td>
          <td>${cliente.cpf_cnpj}</td>
          <td>${cliente.email}</td>
          <td>${cliente.telefone}</td>
          <td>${cliente.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</td>
          <td>
            <span class="client-status ${cliente.status === 'ativo' ? 'status-active' : 'status-inactive'}">
              ${cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-icon btn-edit" onclick="editarCliente(${cliente.id})">
                <span>✏️</span>
              </button>
              <button class="btn btn-icon btn-delete" onclick="confirmarExclusao(${cliente.id})">
                <span>🗑️</span>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // EDITAR CLIENTE
    function editarCliente(id) {
      clienteEditando = clientes.find(c => c.id === id);
      if (!clienteEditando) return;

      document.getElementById('nome').value = clienteEditando.nome;
      document.getElementById('cpf_cnpj').value = clienteEditando.cpf_cnpj;
      document.getElementById('email').value = clienteEditando.email;
      document.getElementById('telefone').value = clienteEditando.telefone;
      document.getElementById('endereco').value = clienteEditando.endereco;
      document.getElementById('cidade').value = clienteEditando.cidade;
      document.getElementById('estado').value = clienteEditando.estado;
      document.getElementById('tipo').value = clienteEditando.tipo;
      document.getElementById('status').value = clienteEditando.status;
      document.getElementById('observacoes').value = clienteEditando.observacoes;

      document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
      mostrarNotificacao('📝 Editando cliente: ' + clienteEditando.nome, 'info');
    }

    // CONFIRMAR EXCLUSÃO
    function confirmarExclusao(id) {
      const cliente = clientes.find(c => c.id === id);
      if (!cliente) return;

      acaoConfirmar = 'excluirCliente';
      dadosConfirmacao = { id, nome: cliente.nome };

      document.getElementById('modalTitulo').textContent = 'Confirmar Exclusão';
      document.getElementById('modalCorpo').innerHTML = `
        <p>Tem certeza que deseja excluir o cliente <strong>${cliente.nome}</strong>?</p>
        <p style="color: var(--danger); font-size: 0.875rem; margin-top: var(--space-2);">
          ⚠️ Esta ação não pode ser desfeita.
        </p>
      `;
      abrirModal();
    }

    // EXCLUIR CLIENTE
    function excluirCliente(id) {
      const cliente = clientes.find(c => c.id === id);
      clientes = clientes.filter(c => c.id !== id);

      lsWriteJSON(LS.clientes, clientes);

      registrarAtividade(`Cliente "${cliente ? cliente.nome : 'removido'}" excluído`, 'exclusao');
      lsWriteJSON(LS.atividadesClientes, obterAtividades());

      carregarClientes();
      atualizarEstatisticas();
      carregarAtividades();
      mostrarNotificacao('🗑️ Cliente excluído com sucesso!', 'warning');
    }

    // LIMPAR FORMULÁRIO
    function limparFormulario() {
      document.getElementById('clienteForm').reset();
      clienteEditando = null;
      mostrarNotificacao('🆕 Formulário limpo. Pronto para novo cadastro.', 'info');
    }

    // FILTRAR CLIENTES
    function filtrarClientes() {
      const termo = document.getElementById('buscarCliente').value.toLowerCase();
      const linhas = document.querySelectorAll('#clientesLista tr');

      let encontrados = 0;

      linhas.forEach(linha => {
        const texto = linha.textContent.toLowerCase();
        const deveMostrar = texto.includes(termo);
        linha.style.display = deveMostrar ? '' : 'none';
        if (deveMostrar) encontrados++;
      });

      const emptyState = document.getElementById('semClientes');
      if (encontrados === 0 && termo !== '') {
        emptyState.innerHTML = `
          <div class="empty-state-icon">🔍</div>
          <h3>Nenhum cliente encontrado</h3>
          <p>Nenhum cliente corresponde à busca: "${termo}"</p>
        `;
        emptyState.style.display = 'block';
      } else {
        emptyState.style.display = 'none';
      }
    }

    // ============================
    // MÉTRICAS (clientes + referência produtos)
    // ============================
    function atualizarEstatisticas() {
      // Recarregar clientes do storage para refletir mudanças em outras abas
      clientes = lsReadJSON(LS.clientes, clientes) || [];

      const total = clientes.length;
      const ativos = clientes.filter(c => c.status === 'ativo').length;
      const inativos = clientes.filter(c => c.status === 'inativo').length;
      const pf = clientes.filter(c => c.tipo === 'PF').length;
      const pj = clientes.filter(c => c.tipo === 'PJ').length;

      const percentAtivos = total > 0 ? Math.round((ativos / total) * 100) : 0;
      const percentInativos = total > 0 ? Math.round((inativos / total) * 100) : 0;

      // Média mensal (simples) -> usa meses desde o primeiro cadastro (mínimo 1)
      const datas = clientes
        .map(c => new Date(c.dataCadastro))
        .filter(d => !Number.isNaN(d.getTime()))
        .sort((a,b) => a - b);

      let meses = 1;
      if (datas.length > 0) {
        const first = datas[0];
        const now = new Date();
        meses = Math.max(1, (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth()) + 1);
      }
      const mediaMensal = total > 0 ? Math.round(total / meses) : 0;

      // Novos últimos 30 dias
      const umMesAtras = new Date();
      umMesAtras.setDate(umMesAtras.getDate() - 30);
      const novosUltimoMes = clientes.filter(c => new Date(c.dataCadastro) >= umMesAtras).length;

      // Estado mais comum
      const estados = {};
      clientes.forEach(c => { if (c.estado) estados[c.estado] = (estados[c.estado] || 0) + 1; });
      const estadoMaisComum = Object.entries(estados).sort((a, b) => b[1] - a[1])[0];

      // Referência produtos (dados reais do produtos.html via storage)
      const produtos = lsReadJSON(LS.produtos, []) || [];
      const totalProdutos = produtos.length;
      const produtosAtivos = produtos.filter(p => p.status === 'ativo').length;

      document.getElementById('totalClientes').textContent = total;
      document.getElementById('clientesAtivos').textContent = ativos;
      document.getElementById('clientesPF').textContent = pf;

      // substitui o antigo card de PJ por "produtos ref"
      document.getElementById('totalProdutosRef').textContent = totalProdutos;
      document.getElementById('produtosAtivosRef').textContent = produtosAtivos;

      document.getElementById('percentAtivos').textContent = percentAtivos + '%';
      document.getElementById('mediaMensal').textContent = `+${mediaMensal}`;
      document.getElementById('novosUltimoMes').textContent = novosUltimoMes;
      document.getElementById('cidadeMais').textContent = estadoMaisComum ? estadoMaisComum[0] : '-';

      // Ajusta barras
      document.getElementById('barAtivosValue').textContent = ativos;
      document.getElementById('barInativosValue').textContent = inativos;

      setTimeout(() => {
        document.getElementById('barAtivos').style.width = percentAtivos + '%';
        document.getElementById('barInativos').style.width = percentInativos + '%';
      }, 80);
    }

    // ============================
    // ATIVIDADES
    // ============================
    function obterAtividades() {
      return lsReadJSON(LS.atividadesClientes, null) || [
        { texto: 'Cliente "João Silva" atualizado', tempo: 'há 2 horas', tipo: 'edicao' },
        { texto: 'Novo cliente "Digital Store" cadastrado', tempo: 'há 1 dia', tipo: 'cadastro' },
        { texto: 'Cliente "Carlos Mendes" marcado como ativo', tempo: 'há 3 dias', tipo: 'status' },
        { texto: 'Exportação de clientes concluída', tempo: 'há 1 semana', tipo: 'exportacao' }
      ];
    }

    function registrarAtividade(texto, tipo) {
      const atividades = obterAtividades();
      const novaAtividade = { texto, tempo: 'agora mesmo', tipo };
      atividades.unshift(novaAtividade);
      if (atividades.length > 4) atividades.pop();
      lsWriteJSON(LS.atividadesClientes, atividades);
    }

    function carregarAtividades() {
      const atividadesLista = document.getElementById('atividadesLista');
      const atividades = obterAtividades();
      atividadesLista.innerHTML = atividades.map(() => '').join(''); // reset

      atividadesLista.innerHTML = atividades.map((atividade) => `
        <div class="activity-item">
          <div class="activity-text">${atividade.texto}</div>
          <div class="activity-time">${atividade.tempo}</div>
        </div>
      `).join('');
    }

    // EXPORTAR CLIENTES
    function exportarClientes() {
      if (clientes.length === 0) {
        mostrarNotificacao('ℹ️ Nenhum cliente para exportar.', 'info');
        return;
      }

      registrarAtividade('Exportação de clientes concluída', 'exportacao');
      carregarAtividades();

      mostrarNotificacao('📤 Exportando clientes...', 'info');
      setTimeout(() => { mostrarNotificacao('✅ Clientes exportados com sucesso!', 'success'); }, 1500);
    }

    // MODAL FUNCTIONS
    function abrirModal() { document.getElementById('modalConfirmacao').style.display = 'flex'; }

    function fecharModal() {
      const modal = document.getElementById('modalConfirmacao');
      modal.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => { modal.style.display = 'none'; modal.style.animation = ''; }, 300);
    }

    function confirmarAcao() {
      if (acaoConfirmar === 'excluirCliente') excluirCliente(dadosConfirmacao.id);
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

    // Atualizar números se produtos/clientes mudarem em outra aba
    window.addEventListener('storage', (e) => {
      if (e.key === LS.produtos || e.key === LS.clientes) {
        atualizarEstatisticas();
      }
      if (e.key === LS.sidebarCollapsed) restoreSidebarState();
    });