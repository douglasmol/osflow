// ============================
    // LOCALSTORAGE PADRONIZADO (OS Flow)
    // ============================
    const LS = Object.freeze({
      garantias: 'osflow:garantias',
      atividadesGarantias: 'osflow:atividades:garantias',
      sidebarCollapsed: 'osflow:ui:sidebarCollapsed',

      // legado (migração)
      legacyGarantias: 'garantiasOSFlow',
      legacyAtividadesGarantias: 'atividadesGarantias',
      legacySidebarCollapsed: 'sidebarCollapsed'
    });

    function migrateLocalStorageKeys() {
      if (!localStorage.getItem(LS.garantias) && localStorage.getItem(LS.legacyGarantias)) {
        localStorage.setItem(LS.garantias, localStorage.getItem(LS.legacyGarantias));
      }
      if (!localStorage.getItem(LS.atividadesGarantias) && localStorage.getItem(LS.legacyAtividadesGarantias)) {
        localStorage.setItem(LS.atividadesGarantias, localStorage.getItem(LS.legacyAtividadesGarantias));
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
    // Dados (garantias)
    // ============================
    const garantiasDefault = [
      {
        id: 1,
        nome: 'Garantia Padrão - Celular (90 dias)',
        dispositivo: 'celular',
        prazoDias: 90,
        cobertura: 'Cobertura para defeitos de serviço e peças substituídas, mediante uso adequado.',
        exclusoes: 'Não cobre mau uso, oxidação, quedas, trincas e danos estéticos.',
        condicoes: 'Necessário apresentar OS. Lacres intactos quando aplicável.',
        status: 'ativo',
        dataCadastro: '2024-02-10'
      },
      {
        id: 2,
        nome: 'Garantia TV - Placa / Fonte (180 dias)',
        dispositivo: 'tv',
        prazoDias: 180,
        cobertura: 'Cobertura para reparo de placa/fonte substituída e mão de obra.',
        exclusoes: 'Não cobre descargas elétricas, infiltração, oxidação e mau uso.',
        condicoes: 'Análise técnica obrigatória. Garantia válida somente para o componente reparado.',
        status: 'ativo',
        dataCadastro: '2024-02-15'
      },
      {
        id: 3,
        nome: 'Garantia Básica - Notebook (30 dias)',
        dispositivo: 'notebook',
        prazoDias: 30,
        cobertura: 'Cobertura de mão de obra do serviço executado.',
        exclusoes: 'Não cobre novo problema não relacionado ao serviço anterior.',
        condicoes: 'Prazo contado a partir da data de entrega.',
        status: 'inativo',
        dataCadastro: '2024-01-22'
      }
    ];

    let garantias = lsReadJSON(LS.garantias, null);
    if (!Array.isArray(garantias) || garantias.length === 0) {
      garantias = garantiasDefault;
      lsWriteJSON(LS.garantias, garantias);
    }

    let garantiaEditando = null;
    let acaoConfirmar = null;
    let dadosConfirmacao = null;

    // ============================
    // Init
    // ============================
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('ano-atual').textContent = new Date().getFullYear();

      restoreSidebarState();

      carregarGarantias();
      atualizarEstatisticas();
      carregarAtividades();
    });

    function toggleSidebar() {
      const layout = document.getElementById('mainLayout');
      layout.classList.toggle('collapsed');
      localStorage.setItem(LS.sidebarCollapsed, layout.classList.contains('collapsed'));
    }

    function restoreSidebarState() {
      const isCollapsed = localStorage.getItem(LS.sidebarCollapsed) === 'true';
      const layout = document.getElementById('mainLayout');
      if (isCollapsed) layout.classList.add('collapsed');
    }

    // ============================
    // Helpers
    // ============================
    function deviceLabel(value) {
      const map = {
        celular: '📱 Celular',
        tablet: '📲 Tablet',
        notebook: '💻 Notebook',
        pc: '🖥️ Computador',
        tv: '📺 TV',
        videogame: '🎮 Videogame',
        som: '🔊 Som/Áudio',
        outros: '🧩 Outros'
      };
      return map[value] || value;
    }

    function escapeHTML(s) {
      return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function formatDateBR(dateStr) {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('pt-BR');
    }

    // ============================
    // Atividades (LS padronizado)
    // ============================
    function obterAtividades() {
      return lsReadJSON(LS.atividadesGarantias, null) || [
        { texto: 'Modelo "Garantia Padrão - Celular (90 dias)" atualizado', tempo: 'há 2 dias', tipo: 'edicao' },
        { texto: 'Novo modelo "Garantia TV - Placa / Fonte" cadastrado', tempo: 'há 1 semana', tipo: 'cadastro' },
        { texto: 'Modelo "Garantia Básica - Notebook" marcado como inativo', tempo: 'há 2 semanas', tipo: 'status' },
        { texto: 'Exportação de modelos concluída', tempo: 'há 1 mês', tipo: 'exportacao' }
      ];
    }

    function registrarAtividade(texto, tipo) {
      const atividades = obterAtividades();
      atividades.unshift({ texto, tempo: 'agora mesmo', tipo });
      if (atividades.length > 4) atividades.pop();
      lsWriteJSON(LS.atividadesGarantias, atividades);
    }

    function carregarAtividades() {
      const el = document.getElementById('atividadesLista');
      const atividades = obterAtividades();
      el.innerHTML = atividades.map(a => `
        <div class="activity-item">
          <div class="activity-text">${escapeHTML(a.texto)}</div>
          <div class="activity-time">${escapeHTML(a.tempo)}</div>
        </div>
      `).join('');
    }

    // ============================
    // CRUD
    // ============================
    function salvarGarantia(event) {
      event.preventDefault();

      const garantia = {
        id: garantiaEditando ? garantiaEditando.id : Date.now(),
        nome: document.getElementById('nome').value.trim(),
        dispositivo: document.getElementById('dispositivo').value,
        prazoDias: parseInt(document.getElementById('prazoDias').value, 10) || 0,
        cobertura: document.getElementById('cobertura').value.trim(),
        exclusoes: document.getElementById('exclusoes').value.trim(),
        condicoes: document.getElementById('condicoes').value.trim(),
        status: document.getElementById('status').value,
        dataCadastro: garantiaEditando ? garantiaEditando.dataCadastro : new Date().toISOString().split('T')[0]
      };

      if (garantiaEditando) {
        const index = garantias.findIndex(g => g.id === garantiaEditando.id);
        if (index >= 0) garantias[index] = garantia;

        registrarAtividade(`Modelo "${garantia.nome}" atualizado`, 'edicao');
        mostrarNotificacao('✅ Modelo de garantia atualizado!', 'success');
      } else {
        garantias.push(garantia);

        registrarAtividade(`Novo modelo criado: ${garantia.nome}`, 'cadastro');
        mostrarNotificacao('✨ Modelo de garantia cadastrado!', 'success');
      }

      lsWriteJSON(LS.garantias, garantias);

      carregarGarantias();
      atualizarEstatisticas();
      carregarAtividades();
      limparFormulario();

      garantiaEditando = null;
    }

    function carregarGarantias() {
      garantias = lsReadJSON(LS.garantias, garantias) || [];

      const tbody = document.getElementById('garantiasLista');
      const emptyState = document.getElementById('semGarantias');

      if (garantias.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }
      emptyState.style.display = 'none';

      const ordenadas = [...garantias].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      tbody.innerHTML = ordenadas.map(g => {
        const cobertura = g.cobertura || '';
        const resumo = cobertura.slice(0, 80) + (cobertura.length > 80 ? '…' : '');

        return `
          <tr data-id="${g.id}">
            <td><strong>${escapeHTML(g.nome)}</strong></td>
            <td><span class="device-pill">${escapeHTML(deviceLabel(g.dispositivo))}</span></td>
            <td><strong>${g.prazoDias}</strong> dias</td>
            <td>
              <span class="model-status ${g.status === 'ativo' ? 'status-active' : 'status-inactive'}">
                ${g.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </td>
            <td style="color: var(--text-tertiary); font-size: 0.8125rem;">
              ${escapeHTML(resumo)}
            </td>
            <td>
              <div class="table-actions">
                <button class="btn btn-icon btn-view" title="Ver detalhes" onclick="verDetalhes(${g.id})"><span>👁️</span></button>
                <button class="btn btn-icon btn-edit" title="Editar" onclick="editarGarantia(${g.id})"><span>✏️</span></button>
                <button class="btn btn-icon btn-delete" title="Excluir" onclick="confirmarExclusao(${g.id})"><span>🗑️</span></button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    function editarGarantia(id) {
      garantiaEditando = garantias.find(g => g.id === id);
      if (!garantiaEditando) return;

      document.getElementById('nome').value = garantiaEditando.nome || '';
      document.getElementById('dispositivo').value = garantiaEditando.dispositivo || '';
      document.getElementById('prazoDias').value = garantiaEditando.prazoDias ?? 0;
      document.getElementById('cobertura').value = garantiaEditando.cobertura || '';
      document.getElementById('exclusoes').value = garantiaEditando.exclusoes || '';
      document.getElementById('condicoes').value = garantiaEditando.condicoes || '';
      document.getElementById('status').value = garantiaEditando.status || 'ativo';

      document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
      mostrarNotificacao('📝 Editando: ' + garantiaEditando.nome, 'info');
    }

    function limparFormulario() {
      document.getElementById('garantiaForm').reset();
      garantiaEditando = null;
      mostrarNotificacao('🆕 Formulário limpo. Pronto para novo cadastro.', 'info');
    }

    function verDetalhes(id) {
      const g = garantias.find(x => x.id === id);
      if (!g) return;

      document.getElementById('modalDetalhesTitulo').textContent = `Detalhes: ${g.nome || ''}`;

      document.getElementById('modalDetalhesCorpo').innerHTML = `
        <div style="display:grid; gap: var(--space-4);">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div>
              <div style="font-size:0.75rem;color:var(--text-tertiary);margin-bottom:var(--space-1);">Dispositivo</div>
              <div style="font-weight:700;">${escapeHTML(deviceLabel(g.dispositivo))}</div>
            </div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-tertiary);margin-bottom:var(--space-1);">Prazo</div>
              <div style="font-weight:700;">${g.prazoDias} dias</div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
            <div>
              <div style="font-size:0.75rem;color:var(--text-tertiary);margin-bottom:var(--space-1);">Status</div>
              <div style="font-weight:700; color: ${g.status === 'ativo' ? 'var(--success)' : 'var(--danger)'};">
                ${g.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </div>
            </div>
            <div>
              <div style="font-size:0.75rem;color:var(--text-tertiary);margin-bottom:var(--space-1);">Cadastrado em</div>
              <div style="font-weight:700;">${escapeHTML(formatDateBR(g.dataCadastro))}</div>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border-light); padding-top: var(--space-4);">
            <div style="font-size:0.75rem;color:var(--text-tertiary);margin-bottom:var(--space-2);">Cobertura</div>
            <div style="background: var(--gray-50); border: 1px solid var(--border-light); padding: var(--space-3); border-radius: var(--radius-lg); color: var(--text-secondary);">
              ${escapeHTML(g.cobertura || '-')}
            </div>
          </div>

          <div>
            <div style="font-size:0.75rem;color:var(--text-tertiary);margin-bottom:var(--space-2);">Exclusões</div>
            <div style="background: var(--gray-50); border: 1px solid var(--border-light); padding: var(--space-3); border-radius: var(--radius-lg); color: var(--text-secondary);">
              ${escapeHTML(g.exclusoes || '-')}
            </div>
          </div>

          <div>
            <div style="font-size:0.75rem;color:var(--text-tertiary);margin-bottom:var(--space-2);">Condições / Procedimento</div>
            <div style="background: var(--gray-50); border: 1px solid var(--border-light); padding: var(--space-3); border-radius: var(--radius-lg); color: var(--text-secondary);">
              ${escapeHTML(g.condicoes || '-')}
            </div>
          </div>
        </div>
      `;

      abrirModalDetalhes();
    }

    function confirmarExclusao(id) {
      const g = garantias.find(x => x.id === id);
      if (!g) return;

      acaoConfirmar = 'excluirGarantia';
      dadosConfirmacao = { id, nome: g.nome };

      document.getElementById('modalTitulo').textContent = 'Confirmar Exclusão';
      document.getElementById('modalCorpo').innerHTML = `
        <p>Tem certeza que deseja excluir o modelo <strong>${escapeHTML(g.nome)}</strong>?</p>
        <p style="color: var(--danger); font-size: 0.875rem; margin-top: var(--space-2);">
          ⚠️ Esta ação não pode ser desfeita.
        </p>
      `;
      abrirModal();
    }

    function excluirGarantia(id) {
      const g = garantias.find(x => x.id === id);
      garantias = garantias.filter(x => x.id !== id);

      lsWriteJSON(LS.garantias, garantias);

      registrarAtividade(`Modelo "${g ? g.nome : 'removido'}" excluído`, 'exclusao');

      carregarGarantias();
      atualizarEstatisticas();
      carregarAtividades();

      mostrarNotificacao('🗑️ Modelo excluído com sucesso!', 'warning');
    }

    // ============================
    // Filtro
    // ============================
    function filtrarGarantias() {
      const termo = document.getElementById('buscarGarantia').value.toLowerCase();
      const linhas = document.querySelectorAll('#garantiasLista tr');
      let encontrados = 0;

      linhas.forEach(linha => {
        const texto = linha.textContent.toLowerCase();
        const ok = texto.includes(termo);
        linha.style.display = ok ? '' : 'none';
        if (ok) encontrados++;
      });

      const emptyState = document.getElementById('semGarantias');
      if (encontrados === 0 && termo !== '') {
        emptyState.innerHTML = `
          <div class="empty-state-icon">🔍</div>
          <h3>Nenhum modelo encontrado</h3>
          <p>Nenhuma garantia corresponde à busca: "${escapeHTML(termo)}"</p>
        `;
        emptyState.style.display = 'block';
      } else {
        emptyState.style.display = 'none';
      }
    }

    // ============================
    // Estatísticas (dados reais)
    // ============================
    function atualizarEstatisticas() {
      garantias = lsReadJSON(LS.garantias, garantias) || [];

      const total = garantias.length;
      const ativas = garantias.filter(g => g.status === 'ativo').length;
      const inativas = garantias.filter(g => g.status === 'inativo').length;

      const prazoMedio = total > 0
        ? Math.round(garantias.reduce((acc, g) => acc + (Number(g.prazoDias) || 0), 0) / total)
        : 0;

      // Tipo mais comum
      const countTipo = {};
      garantias.forEach(g => {
        if (!g.dispositivo) return;
        countTipo[g.dispositivo] = (countTipo[g.dispositivo] || 0) + 1;
      });
      const tipoMais = Object.entries(countTipo).sort((a,b) => b[1] - a[1])[0];
      const tipoMaisComum = tipoMais ? deviceLabel(tipoMais[0]) : '-';

      const percentAtivas = total > 0 ? Math.round((ativas / total) * 100) : 0;
      const percentInativas = total > 0 ? Math.round((inativas / total) * 100) : 0;

      document.getElementById('totalGarantias').textContent = String(total);
      document.getElementById('garantiasAtivas').textContent = String(ativas);
      document.getElementById('prazoMedio').textContent = String(prazoMedio);
      document.getElementById('tipoMaisComum').textContent = tipoMaisComum;

      document.getElementById('percentAtivas').textContent = percentAtivas + '%';
      document.getElementById('valAtivas').textContent = String(ativas);
      document.getElementById('valInativas').textContent = String(inativas);

      setTimeout(() => {
        document.getElementById('barAtivas').style.width = percentAtivas + '%';
        document.getElementById('barInativas').style.width = percentInativas + '%';
      }, 80);
    }

    // ============================
    // Exportar (simples)
    // ============================
    function exportarGarantias() {
      if (!garantias || garantias.length === 0) {
        mostrarNotificacao('ℹ️ Nenhum modelo para exportar.', 'info');
        return;
      }

      registrarAtividade('Exportação de modelos concluída', 'exportacao');
      carregarAtividades();

      mostrarNotificacao('📤 Exportando modelos...', 'info');
      setTimeout(() => { mostrarNotificacao('✅ Exportado com sucesso!', 'success'); }, 1200);
    }

    // ============================
    // Modal
    // ============================
    function abrirModal() { document.getElementById('modalConfirmacao').style.display = 'flex'; }

    function fecharModal() {
      const modal = document.getElementById('modalConfirmacao');
      modal.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => { modal.style.display = 'none'; modal.style.animation = ''; }, 300);
    }

    function confirmarAcao() {
      if (acaoConfirmar === 'excluirGarantia') excluirGarantia(dadosConfirmacao.id);
      fecharModal();
      acaoConfirmar = null;
      dadosConfirmacao = null;
    }

    function abrirModalDetalhes() { document.getElementById('modalDetalhes').style.display = 'flex'; }

    function fecharModalDetalhes() {
      const modal = document.getElementById('modalDetalhes');
      modal.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => { modal.style.display = 'none'; modal.style.animation = ''; }, 300);
    }

    // ============================
    // Notificações
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
    // Sync (outra aba)
    // ============================
    window.addEventListener('storage', (e) => {
      if (e.key === LS.garantias) {
        carregarGarantias();
        atualizarEstatisticas();
      }
      if (e.key === LS.atividadesGarantias) carregarAtividades();
      if (e.key === LS.sidebarCollapsed) restoreSidebarState();
    });