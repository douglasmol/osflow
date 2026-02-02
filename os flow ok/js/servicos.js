// ============================
    // LOCALSTORAGE PADRONIZADO (OS Flow)
    // ============================
    const LS = Object.freeze({
      clientes: 'osflow:clientes',
      atividadesClientes: 'osflow:atividades:clientes',
      produtos: 'osflow:produtos',
      servicos: 'osflow:servicos',
      atividadesServicos: 'osflow:atividades:servicos',
      sidebarCollapsed: 'osflow:ui:sidebarCollapsed',

      // legado (migração)
      legacyClientes: 'clientesOSFlow',
      legacyAtividadesClientes: 'atividadesClientes',
      legacyProdutos: 'produtosOSFlow',
      legacyServicos: 'servicosOSFlow',
      legacyAtividadesServicos: 'atividadesServicos',
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
      if (!localStorage.getItem(LS.servicos) && localStorage.getItem(LS.legacyServicos)) {
        localStorage.setItem(LS.servicos, localStorage.getItem(LS.legacyServicos));
      }
      if (!localStorage.getItem(LS.atividadesServicos) && localStorage.getItem(LS.legacyAtividadesServicos)) {
        localStorage.setItem(LS.atividadesServicos, localStorage.getItem(LS.legacyAtividadesServicos));
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
    // DADOS (inicia vazio)
    // ============================
    let servicos = lsReadJSON(LS.servicos, null);
    if (!Array.isArray(servicos)) servicos = [];
    if (!localStorage.getItem(LS.servicos)) lsWriteJSON(LS.servicos, servicos);

    let servicoEditando = null;
    let acaoConfirmar = null;
    let dadosConfirmacao = null;

    // Inicialização
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('ano-atual').textContent = new Date().getFullYear();

      carregarServicos();
      atualizarEstatisticas();
      carregarAtividades();

      // Restaurar estado do sidebar
      restoreSidebarState();

      // Formatar valor monetário
      document.getElementById('valor').addEventListener('blur', formatarValorMonetario);
      document.getElementById('custo').addEventListener('blur', formatarValorMonetario);
    });

    // SIDEBAR
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
      else layout.classList.remove('collapsed');
    }

    // FORMATAR VALOR MONETÁRIO
    function formatarValorMonetario(event) {
      const input = event.target;
      let valor = parseFloat(input.value);

      if (!isNaN(valor)) input.value = valor.toFixed(2);
    }

    function persistServicos() {
      lsWriteJSON(LS.servicos, servicos);
    }

    // SALVAR SERVIÇO
    function salvarServico(event) {
      event.preventDefault();

      const servico = {
        id: servicoEditando ? servicoEditando.id : Date.now(),
        codigo: document.getElementById('codigo').value.toUpperCase(),
        nome: document.getElementById('nome').value,
        categoria: document.getElementById('categoria').value,
        tipo: document.getElementById('tipo').value,
        tempo_estimado: document.getElementById('tempo_estimado').value,
        garantia: parseInt(document.getElementById('garantia').value, 10),
        valor: parseFloat(document.getElementById('valor').value),
        custo: parseFloat(document.getElementById('custo').value),
        descricao: document.getElementById('descricao').value,
        observacoes: document.getElementById('observacoes').value,
        dificuldade: document.getElementById('dificuldade').value,
        status: document.getElementById('status').value,
        dataCadastro: servicoEditando ? servicoEditando.dataCadastro : new Date().toISOString().split('T')[0]
      };

      if (servicoEditando) {
        const index = servicos.findIndex(s => s.id === servicoEditando.id);
        servicos[index] = servico;

        registrarAtividade(`Serviço "${servico.nome}" atualizado`, 'edicao');
        mostrarNotificacao('✅ Serviço atualizado com sucesso!', 'success');
      } else {
        servicos.push(servico);

        registrarAtividade(`Novo serviço cadastrado: ${servico.nome}`, 'cadastro');
        mostrarNotificacao('✨ Serviço cadastrado com sucesso!', 'success');
      }

      persistServicos();

      carregarServicos();
      atualizarEstatisticas();
      carregarAtividades();
      limparFormulario();
      servicoEditando = null;
    }

    // CARREGAR SERVIÇOS NA TABELA
    function carregarServicos() {
      // Sempre recarrega do storage (fonte da verdade)
      servicos = lsReadJSON(LS.servicos, servicos) || [];

      const tbody = document.getElementById('servicosLista');
      const emptyState = document.getElementById('semServicos');

      if (servicos.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';

      const servicosOrdenados = [...servicos].sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));

      tbody.innerHTML = servicosOrdenados.map(servico => {
        const categoriaText = {
          conserto: 'Conserto',
          manutencao: 'Manutenção',
          instalacao: 'Instalação',
          configuracao: 'Configuração',
          limpeza: 'Limpeza',
          diagnostico: 'Diagnóstico',
          outro: 'Outro'
        }[servico.categoria] || servico.categoria || '-';

        const valor = Number(servico.valor || 0);
        const custo = Number(servico.custo || 0);
        const margem = valor > 0 ? (((valor - custo) / valor) * 100).toFixed(0) : '0';

        return `
          <tr data-id="${servico.id}">
            <td><strong>${servico.codigo || ''}</strong></td>
            <td><strong>${servico.nome || ''}</strong></td>
            <td>${categoriaText}</td>
            <td>${servico.tempo_estimado || '-'}</td>
            <td>
              <div class="price-tag">R$ ${valor.toFixed(2)}</div>
              <div style="font-size: 0.625rem; color: var(--text-muted);">${margem}% margem</div>
            </td>
            <td>
              <span class="service-status ${servico.status === 'ativo' ? 'status-active' : 'status-inactive'}">
                ${servico.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </td>
            <td>
              <div class="table-actions">
                <button class="btn btn-icon btn-edit" onclick="editarServico(${servico.id})">
                  <span>✏️</span>
                </button>
                <button class="btn btn-icon btn-delete" onclick="confirmarExclusao(${servico.id})">
                  <span>🗑️</span>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // EDITAR SERVIÇO
    function editarServico(id) {
      servicoEditando = servicos.find(s => s.id === id);
      if (!servicoEditando) return;

      document.getElementById('codigo').value = servicoEditando.codigo || '';
      document.getElementById('nome').value = servicoEditando.nome || '';
      document.getElementById('categoria').value = servicoEditando.categoria || '';
      document.getElementById('tipo').value = servicoEditando.tipo || '';
      document.getElementById('tempo_estimado').value = servicoEditando.tempo_estimado || '';
      document.getElementById('garantia').value = Number(servicoEditando.garantia || 0);
      document.getElementById('valor').value = Number(servicoEditando.valor || 0).toFixed(2);
      document.getElementById('custo').value = Number(servicoEditando.custo || 0).toFixed(2);
      document.getElementById('descricao').value = servicoEditando.descricao || '';
      document.getElementById('observacoes').value = servicoEditando.observacoes || '';
      document.getElementById('dificuldade').value = servicoEditando.dificuldade || '';
      document.getElementById('status').value = servicoEditando.status || 'ativo';

      document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
      mostrarNotificacao('📝 Editando serviço: ' + (servicoEditando.nome || ''), 'info');
    }

    // CONFIRMAR EXCLUSÃO
    function confirmarExclusao(id) {
      const servico = servicos.find(s => s.id === id);
      if (!servico) return;

      acaoConfirmar = 'excluirServico';
      dadosConfirmacao = { id, nome: servico.nome };

      document.getElementById('modalTitulo').textContent = 'Confirmar Exclusão';
      document.getElementById('modalCorpo').innerHTML = `
        <p>Tem certeza que deseja excluir o serviço <strong>${servico.nome}</strong>?</p>
        <p style="color: var(--danger); font-size: 0.875rem; margin-top: var(--space-2);">
          ⚠️ Esta ação não pode ser desfeita.
        </p>
      `;

      abrirModal();
    }

    // EXCLUIR SERVIÇO
    function excluirServico(id) {
      const servico = servicos.find(s => s.id === id);
      servicos = servicos.filter(s => s.id !== id);

      persistServicos();

      registrarAtividade(`Serviço "${servico ? servico.nome : 'removido'}" excluído`, 'exclusao');

      carregarServicos();
      atualizarEstatisticas();
      carregarAtividades();
      mostrarNotificacao('🗑️ Serviço excluído com sucesso!', 'warning');
    }

    // LIMPAR FORMULÁRIO
    function limparFormulario() {
      document.getElementById('servicoForm').reset();
      servicoEditando = null;
      mostrarNotificacao('🆕 Formulário limpo. Pronto para novo cadastro.', 'info');
    }

    // FILTRAR SERVIÇOS
    function filtrarServicos() {
      const termo = document.getElementById('buscarServico').value.toLowerCase();
      const linhas = document.querySelectorAll('#servicosLista tr');

      let encontrados = 0;

      linhas.forEach(linha => {
        const texto = linha.textContent.toLowerCase();
        const deveMostrar = texto.includes(termo);
        linha.style.display = deveMostrar ? '' : 'none';
        if (deveMostrar) encontrados++;
      });

      const emptyState = document.getElementById('semServicos');
      if (encontrados === 0 && termo !== '') {
        emptyState.innerHTML = `
          <div class="empty-state-icon">🔍</div>
          <h3>Nenhum serviço encontrado</h3>
          <p>Nenhum serviço corresponde à busca: "${termo}"</p>
        `;
        emptyState.style.display = 'block';
      } else {
        emptyState.style.display = 'none';
      }
    }

    // ============================
    // MÉTRICAS (REAIS)
    // ============================
    function parseTempoHoras(texto) {
      if (!texto) return 0;

      const s = String(texto).toLowerCase();
      const matchHoras = s.match(/(\d+)\s*h/);
      if (matchHoras) return parseInt(matchHoras[1], 10);

      const matchHoraPalavra = s.match(/(\d+)\s*hora/);
      if (matchHoraPalavra) return parseInt(matchHoraPalavra[1], 10);

      const matchMin = s.match(/(\d+)\s*min/);
      if (matchMin) return Math.max(1, Math.round(parseInt(matchMin[1], 10) / 60));

      return 1; // fallback conservador
    }

    function atualizarEstatisticas() {
      servicos = lsReadJSON(LS.servicos, servicos) || [];

      const total = servicos.length;
      const ativos = servicos.filter(s => s.status === 'ativo').length;

      // Categorias
      const categorias = {
        conserto: servicos.filter(s => s.categoria === 'conserto').length,
        manutencao: servicos.filter(s => s.categoria === 'manutencao').length,
        outros: servicos.filter(s => s.categoria !== 'conserto' && s.categoria !== 'manutencao').length
      };

      // Financeiro
      const somaValor = servicos.reduce((acc, s) => acc + Number(s.valor || 0), 0);
      const somaCusto = servicos.reduce((acc, s) => acc + Number(s.custo || 0), 0);

      const faturamentoMedio = total > 0 ? somaValor / total : 0;

      const lucroMedioPct = somaValor > 0
        ? Math.round(((somaValor - somaCusto) / somaValor) * 100)
        : 0;

      // Tempo médio (horas)
      const temposHoras = servicos.map(s => parseTempoHoras(s.tempo_estimado)).filter(n => Number.isFinite(n));
      const tempoMedio = temposHoras.length > 0 ? Math.round(temposHoras.reduce((a,b) => a + b, 0) / temposHoras.length) : 0;

      // Garantia média (dias)
      const garantias = servicos.map(s => Number(s.garantia || 0)).filter(n => Number.isFinite(n));
      const garantiaMedia = garantias.length > 0 ? Math.round(garantias.reduce((a,b) => a + b, 0) / garantias.length) : 0;

      // Serviços/Mês (meses desde primeiro cadastro, mínimo 1) - igual padrão do clientes.html
      const datas = servicos
        .map(s => new Date(s.dataCadastro))
        .filter(d => !Number.isNaN(d.getTime()))
        .sort((a,b) => a - b);

      let meses = 1;
      if (datas.length > 0) {
        const first = datas[0];
        const now = new Date();
        meses = Math.max(1, (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth()) + 1);
      }
      const servicosMes = total > 0 ? Math.round(total / meses) : 0;

      // Popularidade (mantive simples e “realista” baseado em % de ativos)
      const popularidade = total > 0 ? Math.round((ativos / total) * 100) : 0;

      // Percentuais do gráfico
      const percentConserto = total > 0 ? Math.round((categorias.conserto / total) * 100) : 0;
      const percentManutencao = total > 0 ? Math.round((categorias.manutencao / total) * 100) : 0;
      const percentOutros = Math.max(0, 100 - percentConserto - percentManutencao);

      // Atualizar UI
      document.getElementById('totalServicos').textContent = total;
      document.getElementById('servicosAtivos').textContent = ativos;
      document.getElementById('faturamentoMedio').textContent = 'R$ ' + Math.round(faturamentoMedio);
      document.getElementById('tempoMedio').textContent = tempoMedio + 'h';

      document.getElementById('lucroMedio').textContent = lucroMedioPct + '%';
      document.getElementById('servicosMes').textContent = servicosMes;
      document.getElementById('garantiaMedia').textContent = garantiaMedia;
      document.getElementById('popularidade').textContent = popularidade + '%';

      document.getElementById('percentConserto').textContent = percentConserto + '%';

      document.getElementById('barConsertoValue').textContent = categorias.conserto;
      document.getElementById('barManutencaoValue').textContent = categorias.manutencao;
      document.getElementById('barOutrosValue').textContent = categorias.outros;

      setTimeout(() => {
        document.getElementById('barConserto').style.width = percentConserto + '%';
        document.getElementById('barManutencao').style.width = percentManutencao + '%';
        document.getElementById('barOutros').style.width = percentOutros + '%';
      }, 100);
    }

    // ============================
    // ATIVIDADES (padronizado)
    // ============================
    function obterAtividades() {
      const fromLs = lsReadJSON(LS.atividadesServicos, null);
      if (Array.isArray(fromLs)) return fromLs;

      // fallback (somente se não existir nada)
      return [
        { texto: 'Bem-vindo ao cadastro de serviços', tempo: 'agora mesmo', tipo: 'info' }
      ];
    }

    function registrarAtividade(texto, tipo) {
      const atividades = obterAtividades();
      const novaAtividade = { texto, tempo: 'agora mesmo', tipo };
      atividades.unshift(novaAtividade);
      if (atividades.length > 4) atividades.pop();
      lsWriteJSON(LS.atividadesServicos, atividades);
    }

    function carregarAtividades() {
      const atividadesLista = document.getElementById('atividadesLista');
      const atividades = obterAtividades();

      atividadesLista.innerHTML = atividades.map(() => '').join('');

      atividadesLista.innerHTML = atividades.map((atividade) => `
        <div class="activity-item">
          <div class="activity-text">${atividade.texto}</div>
          <div class="activity-time">${atividade.tempo}</div>
        </div>
      `).join('');
    }

    // EXPORTAR SERVIÇOS
    function exportarServicos() {
      if (servicos.length === 0) {
        mostrarNotificacao('ℹ️ Nenhum serviço para exportar.', 'info');
        return;
      }

      registrarAtividade('Exportação de serviços concluída', 'exportacao');
      carregarAtividades();

      mostrarNotificacao('📤 Exportando serviços...', 'info');

      setTimeout(() => {
        mostrarNotificacao('✅ Serviços exportados com sucesso!', 'success');
      }, 1500);
    }

    // MODAL
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

    function confirmarAcao() {
      if (acaoConfirmar === 'excluirServico') excluirServico(dadosConfirmacao.id);

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

    // Sincronizar com outras abas (Dashboard etc.)
    window.addEventListener('storage', (e) => {
      if (e.key === LS.servicos) {
        servicos = lsReadJSON(LS.servicos, []) || [];
        carregarServicos();
        atualizarEstatisticas();
      }
      if (e.key === LS.atividadesServicos) {
        carregarAtividades();
      }
      if (e.key === LS.sidebarCollapsed) {
        restoreSidebarState();
      }
    });