const LS = Object.freeze({
      clientes: 'osflow:clientes',
      os: 'osflow:os',
      config: 'osflow:config',
      produtos: 'osflow:produtos',
      servicos: 'osflow:servicos',
      cobrancas: 'osflow:cobrancas',
      sidebarCollapsed: 'osflow:ui:sidebarCollapsed',

      legacyClientes: 'clientesOSFlow',
      legacyOs: 'osflow_os',
      legacyConfig: 'osflow_config',
      legacySidebarCollapsed: 'sidebarCollapsed',
      legacyProdutos: 'produtosOSFlow',
      legacyServicos: 'servicosOSFlow'
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
      if (!localStorage.getItem(LS.clientes) && localStorage.getItem(LS.legacyClientes)) localStorage.setItem(LS.clientes, localStorage.getItem(LS.legacyClientes));
      if (!localStorage.getItem(LS.os) && localStorage.getItem(LS.legacyOs)) localStorage.setItem(LS.os, localStorage.getItem(LS.legacyOs));
      if (!localStorage.getItem(LS.config) && localStorage.getItem(LS.legacyConfig)) localStorage.setItem(LS.config, localStorage.getItem(LS.legacyConfig));
      if (!localStorage.getItem(LS.sidebarCollapsed) && localStorage.getItem(LS.legacySidebarCollapsed)) localStorage.setItem(LS.sidebarCollapsed, localStorage.getItem(LS.legacySidebarCollapsed));
      if (!localStorage.getItem(LS.produtos) && localStorage.getItem(LS.legacyProdutos)) localStorage.setItem(LS.produtos, localStorage.getItem(LS.legacyProdutos));
      if (!localStorage.getItem(LS.servicos) && localStorage.getItem(LS.legacyServicos)) localStorage.setItem(LS.servicos, localStorage.getItem(LS.legacyServicos));
    }
    migrateLocalStorageKeys();

    const OS_KEY = LS.os;
    const PRODUTOS_KEY = LS.produtos;
    const SERVICOS_KEY = LS.servicos;

    let osEditandoId = null;

    function getOSList() { return lsReadJSON(OS_KEY, []); }
    function setOSList(list) { lsWriteJSON(OS_KEY, list); }
    function getProdutos() { return lsReadJSON(PRODUTOS_KEY, []); }
    function setProdutos(list) { lsWriteJSON(PRODUTOS_KEY, list); }
    function getServicos() { return lsReadJSON(SERVICOS_KEY, []); }
    function getClientes() { return lsReadJSON(LS.clientes, []); }

    function getCobrancas() {
      const list = lsReadJSON(LS.cobrancas, []);
      return Array.isArray(list) ? list : [];
    }
    function setCobrancas(list) { lsWriteJSON(LS.cobrancas, Array.isArray(list) ? list : []); }

    function getConfig() {
      const cfg = lsReadJSON(LS.config, null);
      if (!cfg) return { templates: { equipamentoTipos: [], equipamentoCamposByTipo: {}, checklistByTipo: {} }, usuario: { nome: '' } };
      return cfg;
    }
    function getTemplatesFromConfig() {
      const cfg = getConfig() || {};
      const t = cfg.templates || {};
      return {
        equipamentoTipos: Array.isArray(t.equipamentoTipos) ? t.equipamentoTipos : [],
        equipamentoCamposByTipo: t.equipamentoCamposByTipo || {},
        checklistByTipo: t.checklistByTipo || {}
      };
    }

    function renderTopUser() {
      const cfg = getConfig();
      const name = (cfg?.usuario?.nome || 'Usuário').trim() || 'Usuário';
      const initial = (name[0] || 'U').toUpperCase();
      const elName = document.getElementById('topUserName');
      const elAv = document.getElementById('topUserAvatar');
      if (elName) elName.textContent = name;
      if (elAv) elAv.textContent = initial;
    }

    function toggleSidebar() {
      const layout = document.getElementById('mainLayout');
      layout.classList.toggle('collapsed');
      localStorage.setItem(LS.sidebarCollapsed, layout.classList.contains('collapsed'));
    }

    function toast(message, type = 'info') {
      const colors = { info:'var(--primary-500)', success:'var(--success)', warning:'var(--warning)', danger:'var(--danger)' };
      const el = document.createElement('div');
      el.className = 'toast';
      el.style.background = colors[type] || colors.info;
      el.textContent = message;
      document.body.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity .25s ease';
        setTimeout(() => el.remove(), 250);
      }, 2500);
    }

    function formatDateTime(iso) { try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso || '-'; } }
    function gerarNumeroOS() { return 'OS-' + String(Date.now()).slice(-6); }
    function formatBRL(n) { return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

    function statusTag(status) {
      const map = {
        recebido: ['Recebido', 'draft'],
        diagnostico: ['Diagnóstico', 'bill'],
        reparo: ['Em reparo', 'bill'],
        aguardando_buscar: ['Aguardando buscar', 'bill'],
        pronto: ['Pronto', 'done'],
        finalizada: ['Finalizada', 'draft']
      };
      const item = map[status] || map.recebido;
      return `<span class="tag ${item[1]}">${item[0]}</span>`;
    }

    function faturamentoTag(fin) {
      // fin.statusFaturamento: 'nao_faturada' | 'pending' | 'faturada'
      const st = fin?.statusFaturamento || 'nao_faturada';
      if (st === 'faturada') return `<span class="tag bill">Faturada</span>`;
      if (st === 'pending') return `<span class="tag draft">Aguardando</span>`;
      return `<span class="tag draft">Não faturada</span>`;
    }

    function escapeHTML(s) {
      return String(s ?? '')
        .replaceAll('&','&amp;')
        .replaceAll('<','&lt;')
        .replaceAll('>','&gt;')
        .replaceAll('"','&quot;')
        .replaceAll("'",'&#039;');
    }
    function escapeHTMLAttr(s) { return String(s ?? '').replaceAll('"','').replaceAll("'",'').replaceAll(' ', '_'); }
    function escapeJS(s) { return String(s ?? '').replaceAll('\\','\\\\').replaceAll("'","\\'"); }

    // Clientes
    function preencherSelectClientes() {
      const select = document.getElementById('clienteSelect');
      if (!select) return;
      const clientes = getClientes().sort((a,b) => (a.nome||'').localeCompare(b.nome||''));
      select.innerHTML = `<option value="">Selecionar...</option>` + clientes.map(c => `
        <option value="${escapeHTMLAttr(String(c.id))}">${escapeHTML(c.nome)}</option>
      `).join('');
    }

    function onClienteSelecionado() {
      const id = document.getElementById('clienteSelect').value;
      if (!id) return;
      const c = getClientes().find(x => String(x.id) === String(id));
      if (!c) return;
      document.getElementById('clienteNome').value = c.nome || '';
      document.getElementById('clienteTelefone').value = c.telefone || '';
      document.getElementById('clienteEmail').value = c.email || '';
    }

    function resetCriacao() {
      document.getElementById('osCreateForm').reset();
      document.getElementById('clienteSelect').value = '';
    }

    function syncOSIntoCalendarIndexStorage(os) {
      const KEY = 'osflow:calendar:orders';
      const list = lsReadJSON(KEY, []) || [];
      const item = {
        id: os.id,
        customerName: os?.cliente?.nome || 'Cliente',
        deviceType: os?.detalhes?.equipamento?.marcaModelo || (os?.detalhes?.equipamento?.tipo ? `Tipo: ${os.detalhes.equipamento.tipo}` : 'Equipamento'),
        status: statusTag(os.status).replaceAll(/<[^>]*>/g, ''),
        createdAt: os.createdAt
      };
      const idx = list.findIndex(x => String(x.id) === String(item.id));
      if (idx >= 0) list[idx] = item;
      else list.unshift(item);
      lsWriteJSON(KEY, list);
    }

    function criarOSBasica(event) {
      event.preventDefault();

      const clienteNome = (document.getElementById('clienteNome').value || '').trim();
      if (!clienteNome) return;

      const now = new Date().toISOString();

      const os = {
        id: String(Date.now()),
        numero: gerarNumeroOS(),
        status: 'recebido',
        createdAt: now,
        updatedAt: now,

        cliente: {
          clienteId: document.getElementById('clienteSelect').value || '',
          nome: clienteNome,
          telefone: (document.getElementById('clienteTelefone').value || '').trim(),
          email: (document.getElementById('clienteEmail').value || '').trim()
        },

        detalhes: {
          equipamento: { tipo:'', marcaModelo:'', serial:'', senha:'', acessorios:'', estadoFisico:'' },
          dinamicos: {},
          checklist: { templateId: null, answers: {} },
          anexos: { groupKey: '', ids: [] },

          defeitoRelatado: '',
          diagnostico: '',

          termo: { tipo: '30', observacao: '' },
          observacoesGerais: '',

          itensVenda: [],
          servicosAplicados: [],

          financeiro: {
            desconto: 0,
            total: 0,
            subtotalProdutos: 0,
            subtotalServicos: 0,
            statusFaturamento: 'nao_faturada', // <- agora inclui pending
            faturadoEm: '',
            formaPagamento: '',
            cobrancaId: null
          }
        }
      };

      os.detalhes.anexos.groupKey = `osflow:files:os|${os.id}`;

      const list = getOSList();
      list.unshift(os);
      setOSList(list);

      syncOSIntoCalendarIndexStorage(os);

      resetCriacao();
      renderListaOS();
      toast('OS criada (Recebido). Clique em Editar para completar.', 'success');
    }

    function calcularTotaisOS(os) {
      const itens = os.detalhes?.itensVenda || [];
      const servs = os.detalhes?.servicosAplicados || [];
      const desconto = Number(os.detalhes?.financeiro?.desconto || 0);

      const subtotalProdutos = itens.reduce((acc, it) => acc + (Number(it.preco || 0) * Number(it.qtd || 0)), 0);
      const subtotalServicos = servs.reduce((acc, s) => acc + (Number(s.valor || 0)), 0);
      const total = Math.max(0, subtotalProdutos + subtotalServicos - desconto);

      return { subtotalProdutos, subtotalServicos, desconto, total };
    }

    function renderListaOS() {
      const tbody = document.getElementById('osList');
      const empty = document.getElementById('emptyOS');
      if (!tbody || !empty) return;

      const term = (document.getElementById('buscarOS')?.value || '').toLowerCase().trim();
      const filtroStatus = (document.getElementById('filtroStatus')?.value || '').trim();

      let list = getOSList();
      if (filtroStatus) list = list.filter(o => o.status === filtroStatus);
      if (term) {
        list = list.filter(o => {
          const hay = `${o.numero} ${o.cliente?.nome}`.toLowerCase();
          return hay.includes(term);
        });
      }

      if (!list.length) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
      }
      empty.style.display = 'none';

      tbody.innerHTML = list.map(o => {
        const totals = calcularTotaisOS(o);
        const fin = o.detalhes?.financeiro || {};
        return `
          <tr>
            <td><strong>${escapeHTML(o.numero)}</strong></td>
            <td>
              <div style="font-weight:900;">${escapeHTML(o.cliente?.nome || '-')}</div>
              <div class="hint">${escapeHTML(o.cliente?.telefone || '')}</div>
            </td>
            <td>${statusTag(o.status)}</td>
            <td>${faturamentoTag(fin)}</td>
            <td style="text-align:right;"><span class="money">${formatBRL(totals.total)}</span></td>
            <td>${formatDateTime(o.createdAt)}</td>
            <td>
              <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
                <button class="btn" type="button" onclick="abrirModalEditar('${escapeJS(o.id)}')">✏️ Editar</button>
                <button class="btn btn-warning" type="button" onclick="abrirModalFaturar('${escapeJS(o.id)}')">🧾 Faturar</button>
                <button class="btn btn-danger" type="button" onclick="excluirOS('${escapeJS(o.id)}')">🗑️ Excluir</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    function excluirOS(id) {
      const os = getOSList().find(x => x.id === id);
      if (!os) return;
      if (!confirm(`Excluir ${os.numero}?`)) return;

      setOSList(getOSList().filter(x => x.id !== id));

      const KEY = 'osflow:calendar:orders';
      const list = lsReadJSON(KEY, []) || [];
      lsWriteJSON(KEY, list.filter(x => String(x.id) !== String(id)));

      renderListaOS();
      toast('OS excluída.', 'warning');
    }

    // Modal / Tabs
    function selectTab(paneId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      const pane = document.getElementById(paneId);
      if (!pane) return;
      pane.classList.add('active');

      const btnId = 'btn-' + paneId;
      const btn = document.getElementById(btnId);
      if (btn) btn.classList.add('active');

      if (paneId === 'tab-faturamento') updateFinanceKPIs();
      if (paneId === 'tab-produtos') { renderProdutosBusca(); renderOSProdutos(); }
      if (paneId === 'tab-servicos') { renderServicosBusca(); renderOSServicos(); }
      if (paneId === 'tab-anexos') { renderAnexosLinkInfo(); }
      if (paneId === 'tab-dinamicos') { renderDinamicosSlot(); applyDynamicValuesToUI(getOsById(osEditandoId)); }
      if (paneId === 'tab-checklist') { renderChecklistSlot(); }
    }

    function getOsById(id) { return getOSList().find(x => x.id === id) || null; }
    function setOsById(os) {
      const list = getOSList();
      const idx = list.findIndex(x => x.id === os.id);
      if (idx >= 0) list[idx] = os;
      setOSList(list);
      syncOSIntoCalendarIndexStorage(os);
    }

    function abrirModalEditar(id) {
      const os = getOsById(id);
      if (!os) return;
      osEditandoId = id;

      if (!os.detalhes?.anexos) os.detalhes.anexos = { groupKey: `osflow:files:os|${os.id}`, ids: [] };
      if (!os.detalhes.anexos.groupKey) os.detalhes.anexos.groupKey = `osflow:files:os|${os.id}`;

      if (!os.detalhes.financeiro) {
        os.detalhes.financeiro = {
          desconto: 0, total: 0, subtotalProdutos: 0, subtotalServicos: 0,
          statusFaturamento: 'nao_faturada', faturadoEm: '', formaPagamento: '', cobrancaId: null
        };
      }
      if (!('statusFaturamento' in os.detalhes.financeiro)) os.detalhes.financeiro.statusFaturamento = 'nao_faturada';
      if (!('cobrancaId' in os.detalhes.financeiro)) os.detalhes.financeiro.cobrancaId = null;

      document.getElementById('modalEditarTitulo').textContent = `Editar OS • ${os.numero}`;
      document.getElementById('editNumeroOS').value = os.numero;
      document.getElementById('editStatus').value = os.status || 'recebido';

      fillTiposEquipamentoSelect(os.detalhes?.equipamento?.tipo || '');
      document.getElementById('editMarcaModelo').value = os.detalhes?.equipamento?.marcaModelo || '';
      document.getElementById('editSerial').value = os.detalhes?.equipamento?.serial || '';
      document.getElementById('editSenha').value = os.detalhes?.equipamento?.senha || '';
      document.getElementById('editAcessorios').value = os.detalhes?.equipamento?.acessorios || '';
      document.getElementById('editEstadoFisico').value = os.detalhes?.equipamento?.estadoFisico || '';

      document.getElementById('editDefeitoRelatado').value = os.detalhes?.defeitoRelatado || '';
      document.getElementById('editDiagnostico').value = os.detalhes?.diagnostico || '';
      document.getElementById('editObsGeral').value = os.detalhes?.observacoesGerais || '';

      document.getElementById('editTermo').value = os.detalhes?.termo?.tipo || '30';
      document.getElementById('editTermoObs').value = os.detalhes?.termo?.observacao || '';
      renderPreviewTermo();

      document.getElementById('editAnexosGroupKey').value = os.detalhes?.anexos?.groupKey || `osflow:files:os|${os.id}`;
      document.getElementById('editAnexosIds').value = (os.detalhes?.anexos?.ids || []).join(',');

      document.getElementById('editDesconto').value = String(Number(os.detalhes?.financeiro?.desconto || 0));
      document.getElementById('editFormaPagamento').value = os.detalhes?.financeiro?.formaPagamento || 'dinheiro';

      onModalTipoEquipamentoChange(false);

      renderProdutosBusca();
      renderServicosBusca();
      renderOSProdutos();
      renderOSServicos();
      updateFinanceKPIs();

      selectTab('tab-geral');
      document.getElementById('modalEditarOS').style.display = 'flex';
    }

    function abrirModalFaturar(id) {
      abrirModalEditar(id);
      selectTab('tab-faturamento');
    }

    function fecharModalEditar() {
      document.getElementById('modalEditarOS').style.display = 'none';
      osEditandoId = null;
    }

    function salvarDetalhesOS(event) {
      event.preventDefault();
      if (!osEditandoId) return;

      const os = getOsById(osEditandoId);
      if (!os) return;

      os.status = document.getElementById('editStatus').value || os.status;
      os.updatedAt = new Date().toISOString();

      const tipo = document.getElementById('editTipoEquipamento').value || '';

      os.detalhes.equipamento = {
        tipo,
        marcaModelo: (document.getElementById('editMarcaModelo').value || '').trim(),
        serial: (document.getElementById('editSerial').value || '').trim(),
        senha: (document.getElementById('editSenha').value || '').trim(),
        acessorios: (document.getElementById('editAcessorios').value || '').trim(),
        estadoFisico: (document.getElementById('editEstadoFisico').value || '').trim()
      };

      os.detalhes.defeitoRelatado = (document.getElementById('editDefeitoRelatado').value || '').trim();
      os.detalhes.diagnostico = (document.getElementById('editDiagnostico').value || '').trim();
      os.detalhes.observacoesGerais = (document.getElementById('editObsGeral').value || '').trim();

      os.detalhes.termo = {
        tipo: document.getElementById('editTermo').value || '30',
        observacao: (document.getElementById('editTermoObs').value || '').trim()
      };

      if (!os.detalhes.anexos) os.detalhes.anexos = { groupKey: `osflow:files:os|${os.id}`, ids: [] };
      if (!os.detalhes.anexos.groupKey) os.detalhes.anexos.groupKey = `osflow:files:os|${os.id}`;

      saveDynamicFieldsFromUI(os);
      saveChecklistFromUI(os);

      os.detalhes.financeiro.desconto = Number(document.getElementById('editDesconto').value || 0);
      os.detalhes.financeiro.formaPagamento = document.getElementById('editFormaPagamento').value || '';

      const totals = calcularTotaisOS(os);
      os.detalhes.financeiro.subtotalProdutos = totals.subtotalProdutos;
      os.detalhes.financeiro.subtotalServicos = totals.subtotalServicos;
      os.detalhes.financeiro.total = totals.total;

      setOsById(os);
      renderListaOS();
      updateFinanceKPIs();
      renderAnexosLinkInfo();
      toast('Detalhes salvos.', 'success');
    }

    // Tipos / Config
    function fillTiposEquipamentoSelect(selectedId = '') {
      const select = document.getElementById('editTipoEquipamento');
      if (!select) return;

      const templates = getTemplatesFromConfig();
      const tipos = templates.equipamentoTipos || [];

      select.innerHTML = `<option value="">Selecionar...</option>` + tipos
        .slice()
        .sort((a,b) => (a.label||'').localeCompare(b.label||''))
        .map(t => `<option value="${escapeHTMLAttr(String(t.id))}">${escapeHTML(t.label || t.id)}</option>`)
        .join('');

      if (selectedId) select.value = selectedId;
    }

    function onModalTipoEquipamentoChange(resetValues = true) {
      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      const tipo = document.getElementById('editTipoEquipamento')?.value || '';

      os.detalhes.checklist.templateId = tipo || null;

      if (resetValues) {
        os.detalhes.dinamicos = {};
        os.detalhes.checklist.answers = {};
        setOsById(os);
      } else {
        os.detalhes.dinamicos = os.detalhes.dinamicos || {};
        os.detalhes.checklist = os.detalhes.checklist || { templateId: null, answers: {} };
        os.detalhes.checklist.answers = os.detalhes.checklist.answers || {};
      }

      renderDinamicosSlot();
      applyDynamicValuesToUI(os);
      renderChecklistSlot();
    }

    function renderDinamicosSlot() {
      const dinamicosSlot = document.getElementById('dinamicosSlot');
      if (!dinamicosSlot) return;

      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      const tipo = document.getElementById('editTipoEquipamento')?.value || '';
      if (!tipo) {
        dinamicosSlot.className = 'empty';
        dinamicosSlot.textContent = 'Selecione o tipo do equipamento.';
        return;
      }

      const templates = getTemplatesFromConfig();
      const fields = templates.equipamentoCamposByTipo?.[tipo] || [];
      os.detalhes.dinamicos = os.detalhes.dinamicos || {};

      if (!fields.length) {
        dinamicosSlot.className = 'empty';
        dinamicosSlot.innerHTML = `Nenhum campo dinâmico configurado para este tipo. Vá em <strong>Configurações</strong> e adicione campos.`;
        return;
      }

      dinamicosSlot.className = '';
      dinamicosSlot.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
          ${fields.map(f => renderDynamicFieldControl(f, os.detalhes.dinamicos[f.id])).join('')}
        </div>
      `;
    }

    function renderDynamicFieldControl(field, value) {
      const id = String(field.id || '');
      const label = field.label || id;
      const kind = field.kind || 'text';
      const options = Array.isArray(field.options) ? field.options : [];
      const inputId = `dyn_${escapeHTMLAttr(id)}`;

      if (kind === 'textarea') {
        return `
          <div class="field">
            <label for="${inputId}">${escapeHTML(label)}</label>
            <textarea id="${inputId}" data-dyn-id="${escapeHTMLAttr(id)}"></textarea>
          </div>
        `;
      }

      if (kind === 'select') {
        const opts = ['<option value="">Selecionar...</option>']
          .concat(options.map(o => `<option value="${escapeHTMLAttr(String(o))}">${escapeHTML(String(o))}</option>`))
          .join('');
        return `
          <div class="field">
            <label for="${inputId}">${escapeHTML(label)}</label>
            <select id="${inputId}" data-dyn-id="${escapeHTMLAttr(id)}">${opts}</select>
          </div>
        `;
      }

      const inputType = kind === 'number' ? 'number' : 'text';
      return `
        <div class="field">
          <label for="${inputId}">${escapeHTML(label)}</label>
          <input id="${inputId}" data-dyn-id="${escapeHTMLAttr(id)}" type="${inputType}" />
        </div>
      `;
    }

    function applyDynamicValuesToUI(os) {
      const wrap = document.getElementById('dinamicosSlot');
      if (!wrap || !os) return;
      const values = os?.detalhes?.dinamicos || {};
      wrap.querySelectorAll('[data-dyn-id]').forEach(el => {
        const id = el.getAttribute('data-dyn-id');
        const v = values[id];
        if (v === undefined || v === null) return;
        el.value = String(v);
      });
    }

    function saveDynamicFieldsFromUI(os) {
      const wrap = document.getElementById('dinamicosSlot');
      if (!wrap) return;

      const next = {};
      wrap.querySelectorAll('[data-dyn-id]').forEach(el => {
        const id = el.getAttribute('data-dyn-id');
        if (!id) return;
        next[id] = el.value;
      });

      os.detalhes.dinamicos = next;
    }

    function renderChecklistSlot() {
      const checklistSlot = document.getElementById('checklistSlot');
      if (!checklistSlot) return;

      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      const tipo = document.getElementById('editTipoEquipamento')?.value || '';
      if (!tipo) {
        checklistSlot.className = 'empty';
        checklistSlot.textContent = 'Selecione o tipo do equipamento.';
        return;
      }

      const templates = getTemplatesFromConfig();
      const items = templates.checklistByTipo?.[tipo] || [];
      os.detalhes.checklist = os.detalhes.checklist || { templateId: null, answers: {} };
      os.detalhes.checklist.answers = os.detalhes.checklist.answers || {};

      if (!items.length) {
        checklistSlot.className = 'empty';
        checklistSlot.innerHTML = `Nenhum checklist configurado para este tipo. Vá em <strong>Configurações</strong> e adicione itens.`;
        return;
      }

      checklistSlot.className = '';
      checklistSlot.innerHTML = `
        <div style="display:grid; gap: .5rem;">
          ${items.map(it => {
            const cid = String(it.id || '');
            const checked = !!os.detalhes.checklist.answers[cid];
            return `
              <label style="display:flex; align-items:center; gap:.6rem; padding:.6rem .75rem; border:1px solid var(--border-light); border-radius: var(--radius-lg); background: var(--gray-50); font-weight:800;">
                <input type="checkbox" data-check-id="${escapeHTMLAttr(cid)}" ${checked ? 'checked' : ''} />
                ${escapeHTML(it.label || cid)}
              </label>
            `;
          }).join('')}
        </div>
      `;
    }

    function saveChecklistFromUI(os) {
      const wrap = document.getElementById('checklistSlot');
      if (!wrap) return;

      const answers = {};
      wrap.querySelectorAll('[data-check-id]').forEach(el => {
        const id = el.getAttribute('data-check-id');
        answers[id] = !!el.checked;
      });

      os.detalhes.checklist.answers = answers;
      os.detalhes.checklist.templateId = document.getElementById('editTipoEquipamento')?.value || null;
    }

    function renderAnexosLinkInfo() {
      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      if (!os.detalhes?.anexos) os.detalhes.anexos = { groupKey: `osflow:files:os|${os.id}`, ids: [] };
      if (!os.detalhes.anexos.groupKey) os.detalhes.anexos.groupKey = `osflow:files:os|${os.id}`;
      setOsById(os);

      document.getElementById('editAnexosGroupKey').value = os.detalhes.anexos.groupKey;
      document.getElementById('editAnexosIds').value = (os.detalhes.anexos.ids || []).join(',');
    }

    function renderPreviewTermo() {
      const value = document.getElementById('editTermo')?.value || '30';
      const obs = (document.getElementById('editTermoObs')?.value || '').trim();
      const el = document.getElementById('previewTermo');
      if (!el) return;

      const label = value === '0' ? 'Sem garantia' : `${value} dias`;
      el.innerHTML = `
        <div style="font-weight:900; margin-bottom:.5rem;">Termo: ${escapeHTML(label)}</div>
        <div style="color: var(--text-tertiary); font-weight:700;">Observações: ${obs ? escapeHTML(obs) : '<em>(nenhuma)</em>'}</div>
      `;
    }

    // Produtos / Serviços (mesmo que você já tinha)
    function limparBuscaProduto() { document.getElementById('buscarProduto').value = ''; renderProdutosBusca(); }
    function normalizeProdutoEstoque(p) { return Number(p?.estoque_atual ?? p?.estoque ?? p?.quantidade ?? p?.qtd ?? 0); }
    function normalizeProdutoPreco(p) { return Number(p?.preco_venda ?? p?.precoVenda ?? p?.preco ?? p?.valor ?? 0); }

    function renderProdutosBusca() {
      const tbody = document.getElementById('produtoBuscaTbody');
      if (!tbody) return;

      const term = (document.getElementById('buscarProduto')?.value || '').toLowerCase().trim();
      const produtos = getProdutos();

      let list = produtos;
      if (term) list = produtos.filter(p => `${p.nome||''} ${p.codigo||''} ${p.sku||''}`.toLowerCase().includes(term));
      list = list.slice(0, 20);

      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty" style="padding:1.25rem;">Nenhum produto encontrado.</div></td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(p => {
        const estoque = normalizeProdutoEstoque(p);
        const preco = normalizeProdutoPreco(p);
        const disabled = estoque <= 0 ? 'disabled' : '';
        return `
          <tr>
            <td>
              <div style="font-weight:900;">${escapeHTML(p.nome || 'Produto')}</div>
              <div class="hint">${escapeHTML(p.codigo || p.sku || '')}</div>
            </td>
            <td>${estoque}</td>
            <td style="text-align:right;"><span class="money">${formatBRL(preco)}</span></td>
            <td><input type="number" min="1" step="1" value="1" id="qtdProd_${escapeHTMLAttr(String(p.id))}" ${disabled} /></td>
            <td><button class="btn btn-primary" type="button" ${disabled} onclick="adicionarProdutoOS('${escapeJS(String(p.id))}')">+ Adicionar</button></td>
          </tr>
        `;
      }).join('');
    }

    function adicionarProdutoOS(produtoId) {
      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      const produtos = getProdutos();
      const p = produtos.find(x => String(x.id) === String(produtoId));
      if (!p) return toast('Produto não encontrado.', 'danger');

      const estoque = normalizeProdutoEstoque(p);
      const preco = normalizeProdutoPreco(p);

      const qtdInput = document.getElementById(`qtdProd_${String(p.id)}`);
      const qtd = Math.max(1, Number(qtdInput?.value || 1));

      if (qtd > estoque) return toast(`Estoque insuficiente. Disponível: ${estoque}`, 'warning');

      const existing = os.detalhes.itensVenda.find(it => String(it.produtoId) === String(produtoId));
      if (existing) {
        const novaQtd = existing.qtd + qtd;
        if (novaQtd > estoque) return toast(`Estoque insuficiente para somar. Disponível: ${estoque}`, 'warning');
        existing.qtd = novaQtd;
      } else {
        os.detalhes.itensVenda.push({ produtoId: String(p.id), nome: p.nome || 'Produto', preco, qtd });
      }

      setOsById(os);
      renderOSProdutos();
      updateFinanceKPIs();
      renderListaOS();
      toast('Produto adicionado.', 'success');
    }

    function renderOSProdutos() {
      const tbody = document.getElementById('osProdutosTbody');
      const empty = document.getElementById('osProdutosEmpty');
      if (!tbody || !empty) return;

      const os = osEditandoId ? getOsById(osEditandoId) : null;
      const itens = os?.detalhes?.itensVenda || [];

      if (!itens.length) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
      }
      empty.style.display = 'none';

      tbody.innerHTML = itens.map((it, idx) => {
        const subtotal = Number(it.preco || 0) * Number(it.qtd || 0);
        return `
          <tr>
            <td><div style="font-weight:900;">${escapeHTML(it.nome)}</div></td>
            <td style="text-align:right;"><span class="money">${formatBRL(it.preco)}</span></td>
            <td style="text-align:center;">
              <div style="display:flex; gap:.35rem; justify-content:center; align-items:center;">
                <button class="btn btn-icon" type="button" onclick="alterarQtdProduto(${idx}, -1)">−</button>
                <span class="pill">${it.qtd}</span>
                <button class="btn btn-icon" type="button" onclick="alterarQtdProduto(${idx}, 1)">+</button>
              </div>
            </td>
            <td style="text-align:right;"><span class="money">${formatBRL(subtotal)}</span></td>
            <td><button class="btn btn-danger" type="button" onclick="removerProdutoOS(${idx})">Remover</button></td>
          </tr>
        `;
      }).join('');
    }

    function alterarQtdProduto(index, delta) {
      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      const it = os.detalhes.itensVenda[index];
      if (!it) return;

      const produtos = getProdutos();
      const p = produtos.find(x => String(x.id) === String(it.produtoId));
      const estoque = normalizeProdutoEstoque(p);

      const novaQtd = Math.max(1, Number(it.qtd || 1) + delta);
      if (novaQtd > estoque) return toast(`Estoque insuficiente. Disponível: ${estoque}`, 'warning');

      it.qtd = novaQtd;
      setOsById(os);
      renderOSProdutos();
      updateFinanceKPIs();
      renderListaOS();
    }

    function removerProdutoOS(index) {
      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      os.detalhes.itensVenda = os.detalhes.itensVenda.filter((_, i) => i !== index);
      setOsById(os);
      renderOSProdutos();
      updateFinanceKPIs();
      renderListaOS();
      toast('Produto removido.', 'warning');
    }

    // Serviços
    function limparBuscaServico() { document.getElementById('buscarServico').value = ''; renderServicosBusca(); }
    function normalizeServicoValor(s) { return Number(s?.valor ?? s?.preco ?? 0); }

    function renderServicosBusca() {
      const tbody = document.getElementById('servicoBuscaTbody');
      if (!tbody) return;

      const term = (document.getElementById('buscarServico')?.value || '').toLowerCase().trim();
      const servicos = getServicos();

      let list = servicos;
      if (term) list = servicos.filter(s => `${s.nome||''} ${s.codigo||''}`.toLowerCase().includes(term));
      list = list.slice(0, 20);

      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="3"><div class="empty" style="padding:1.25rem;">Nenhum serviço encontrado.</div></td></tr>`;
        return;
      }

      tbody.innerHTML = list.map(s => {
        const valor = normalizeServicoValor(s);
        return `
          <tr>
            <td>
              <div style="font-weight:900;">${escapeHTML(s.nome || 'Serviço')}</div>
              <div class="hint">${escapeHTML(s.codigo || '')}</div>
            </td>
            <td style="text-align:right;"><span class="money">${formatBRL(valor)}</span></td>
            <td><button class="btn btn-primary" type="button" onclick="adicionarServicoOS('${escapeJS(String(s.id))}')">+ Anexar</button></td>
          </tr>
        `;
      }).join('');
    }

    function adicionarServicoOS(servicoId) {
      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      const s = getServicos().find(x => String(x.id) === String(servicoId));
      if (!s) return toast('Serviço não encontrado.', 'danger');

      const valor = normalizeServicoValor(s);
      const exists = os.detalhes.servicosAplicados.some(x => String(x.servicoId) === String(servicoId));
      if (exists) return toast('Serviço já anexado.', 'warning');

      os.detalhes.servicosAplicados.push({ servicoId: String(s.id), nome: s.nome || 'Serviço', valor });
      setOsById(os);

      renderOSServicos();
      updateFinanceKPIs();
      renderListaOS();
      toast('Serviço anexado.', 'success');
    }

    function renderOSServicos() {
      const tbody = document.getElementById('osServicosTbody');
      const empty = document.getElementById('osServicosEmpty');
      if (!tbody || !empty) return;

      const os = osEditandoId ? getOsById(osEditandoId) : null;
      const list = os?.detalhes?.servicosAplicados || [];

      if (!list.length) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
      }
      empty.style.display = 'none';

      tbody.innerHTML = list.map((s, idx) => `
        <tr>
          <td><div style="font-weight:900;">${escapeHTML(s.nome)}</div></td>
          <td style="text-align:right;"><span class="money">${formatBRL(s.valor)}</span></td>
          <td><button class="btn btn-danger" type="button" onclick="removerServicoOS(${idx})">Remover</button></td>
        </tr>
      `).join('');
    }

    function removerServicoOS(index) {
      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      os.detalhes.servicosAplicados = os.detalhes.servicosAplicados.filter((_, i) => i !== index);
      setOsById(os);

      renderOSServicos();
      updateFinanceKPIs();
      renderListaOS();
      toast('Serviço removido.', 'warning');
    }

    // Financeiro
    function updateFinanceKPIs() {
      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      os.detalhes.financeiro.desconto = Number(document.getElementById('editDesconto')?.value || os.detalhes.financeiro.desconto || 0);
      os.detalhes.financeiro.formaPagamento = document.getElementById('editFormaPagamento')?.value || os.detalhes.financeiro.formaPagamento || 'dinheiro';

      const totals = calcularTotaisOS(os);

      document.getElementById('kpiSubProdutos').textContent = formatBRL(totals.subtotalProdutos);
      document.getElementById('kpiSubServicos').textContent = formatBRL(totals.subtotalServicos);
      document.getElementById('kpiDesconto').textContent = formatBRL(totals.desconto);
      document.getElementById('kpiTotal').textContent = formatBRL(totals.total);

      const st = os.detalhes.financeiro.statusFaturamento || 'nao_faturada';
      if (st === 'faturada') {
        document.getElementById('pillFaturamento').textContent = 'Faturada';
        document.getElementById('hintFaturamento').textContent =
          `Faturada em ${formatDateTime(os.detalhes.financeiro.faturadoEm)} • ${os.detalhes.financeiro.formaPagamento || ''}`;
      } else if (st === 'pending') {
        document.getElementById('pillFaturamento').textContent = 'Aguardando pagamento';
        document.getElementById('hintFaturamento').textContent =
          os.detalhes.financeiro.cobrancaId ? `Cobrança #${os.detalhes.financeiro.cobrancaId} criada.` : '';
      } else {
        document.getElementById('pillFaturamento').textContent = 'Não faturada';
        document.getElementById('hintFaturamento').textContent = '';
      }

      os.detalhes.financeiro.subtotalProdutos = totals.subtotalProdutos;
      os.detalhes.financeiro.subtotalServicos = totals.subtotalServicos;
      os.detalhes.financeiro.total = totals.total;
    }

    function validarEstoqueParaOS(os) {
      const produtos = getProdutos();
      for (const it of os.detalhes.itensVenda) {
        const p = produtos.find(x => String(x.id) === String(it.produtoId));
        if (!p) return { ok:false, msg:`Produto não encontrado no estoque: ${it.nome}` };
        const estoque = normalizeProdutoEstoque(p);
        if (Number(it.qtd || 0) > estoque) return { ok:false, msg:`Estoque insuficiente: ${p.nome}. Necessário ${it.qtd}, disponível ${estoque}.` };
      }
      return { ok:true, msg:'' };
    }

    function baixarEstoqueOS(os) {
      const produtos = getProdutos();
      for (const it of os.detalhes.itensVenda) {
        const idx = produtos.findIndex(x => String(x.id) === String(it.produtoId));
        if (idx < 0) continue;
        const p = produtos[idx];
        const estoqueAtual = normalizeProdutoEstoque(p);
        const novo = Math.max(0, estoqueAtual - Number(it.qtd || 0));
        p.estoque_atual = novo;

        if (p.status !== 'inativo') {
          if (novo === 0) p.status = 'esgotado';
          else p.status = 'ativo';
        }

        produtos[idx] = p;
      }
      setProdutos(produtos);
    }

    // NOVO: Modal faturamento
    function abrirModalFaturamento() {
      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      const totals = calcularTotaisOS(os);
      const resumo = `
        <div><strong>${escapeHTML(os.numero)}</strong> • Cliente: <strong>${escapeHTML(os.cliente?.nome || '-')}</strong></div>
        <div style="margin-top:.25rem;">Total: <strong>${formatBRL(totals.total)}</strong> (Produtos: ${formatBRL(totals.subtotalProdutos)} • Serviços: ${formatBRL(totals.subtotalServicos)} • Desc.: ${formatBRL(totals.desconto)})</div>
      `;
      document.getElementById('faturamentoResumo').innerHTML = resumo;

      document.getElementById('osOptPayNow').checked = true;
      document.getElementById('modalFaturamento').style.display = 'flex';
    }

    function fecharModalFaturamento() {
      const m = document.getElementById('modalFaturamento');
      m.style.animation = 'fadeOut .25s ease-out forwards';
      setTimeout(() => { m.style.display = 'none'; m.style.animation = ''; }, 250);
    }

    function getOSFulfillmentChoice() {
      const checked = document.querySelector('input[name="osFulfillment"]:checked');
      return checked ? checked.value : 'pay_now';
    }

    // Criar cobrança padronizada para OS (Opção 1)
    function createCobrancaFromOS(os) {
      const totals = calcularTotaisOS(os);

      const cobranca = {
        id: Date.now(),
        status: 'pending',
        paidAt: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        origem: {
          tipo: 'os',
          refId: String(os.id),
          refNumero: String(os.numero)
        },

        cliente: {
          clienteId: String(os.cliente?.clienteId || ''),
          nome: String(os.cliente?.nome || '')
        },

        descricao: `Cobrança OS ${os.numero}`,
        valorTotal: Number(totals.total.toFixed(2)),
        datas: {
          emissao: new Date().toISOString(),
          vencimento: new Date().toISOString().split('T')[0] // hoje (você pode ajustar depois)
        },

        parcelamento: { modo: 'avista', parcelas: 1 },
        parcelasDetalhe: [
          { numero: 1, vencimento: new Date().toISOString().split('T')[0], valor: Number(totals.total.toFixed(2)), status: 'aberta', pagamentos: [] }
        ],

        pagamentos: [],

        integracoes: {
          mercadopago: { preferenceId:'', paymentId:'', status:'', statusDetail:'', qrCode:'', ticketUrl:'' },
          whatsapp: { messageId:'', status:'', sentAt:'', deliveredAt:'' }
        }
      };

      const list = getCobrancas();
      list.unshift(cobranca);
      setCobrancas(list);

      return cobranca;
    }

    function confirmarFaturamento() {
      if (!osEditandoId) return;
      const os = getOsById(osEditandoId);
      if (!os) return;

      if (os.detalhes.financeiro.statusFaturamento === 'faturada') {
        toast('Esta OS já está faturada.', 'warning');
        return;
      }

      // Recalcula totais
      os.detalhes.financeiro.desconto = Number(document.getElementById('editDesconto')?.value || 0);
      os.detalhes.financeiro.formaPagamento = document.getElementById('editFormaPagamento')?.value || 'dinheiro';
      const totals = calcularTotaisOS(os);

      if (totals.total <= 0) {
        toast('Total zerado. Adicione produtos/serviços antes.', 'warning');
        return;
      }

      const fulfillment = getOSFulfillmentChoice(); // pay_now | charge

      if (fulfillment === 'pay_now') {
        const estoqueOk = validarEstoqueParaOS(os);
        if (!estoqueOk.ok) { toast(estoqueOk.msg, 'danger'); return; }
        if (!confirm(`Pagar agora e faturar ${os.numero} no valor de ${formatBRL(totals.total)}? Isso dará baixa no estoque.`)) return;

        baixarEstoqueOS(os);

        os.detalhes.financeiro.statusFaturamento = 'faturada';
        os.detalhes.financeiro.faturadoEm = new Date().toISOString();
        os.detalhes.financeiro.subtotalProdutos = totals.subtotalProdutos;
        os.detalhes.financeiro.subtotalServicos = totals.subtotalServicos;
        os.detalhes.financeiro.total = totals.total;
        os.detalhes.financeiro.cobrancaId = null;

        setOsById(os);
        fecharModalFaturamento();
        renderListaOS();
        updateFinanceKPIs();
        toast('OS faturada e estoque atualizado!', 'success');
        return;
      }

      // charge: cria cobrança e marca OS como pending
      if (!confirm(`Gerar cobrança de ${formatBRL(totals.total)} para ${os.numero}? Não dará baixa no estoque agora.`)) return;

      const cobranca = createCobrancaFromOS(os);

      os.detalhes.financeiro.statusFaturamento = 'pending';
      os.detalhes.financeiro.faturadoEm = '';
      os.detalhes.financeiro.subtotalProdutos = totals.subtotalProdutos;
      os.detalhes.financeiro.subtotalServicos = totals.subtotalServicos;
      os.detalhes.financeiro.total = totals.total;
      os.detalhes.financeiro.cobrancaId = cobranca.id;

      setOsById(os);

      fecharModalFaturamento();
      renderListaOS();
      updateFinanceKPIs();

      toast(`Cobrança criada (#${cobranca.id}). Vá em Cobrança para receber.`, 'warning');

      // opcional: abrir cobrança já filtrando por id
      // window.open(`cobranca.html?id=${cobranca.id}`, '_blank');
    }

    // Init
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('ano-atual').textContent = new Date().getFullYear();

      const isCollapsed = localStorage.getItem(LS.sidebarCollapsed) === 'true';
      if (isCollapsed) document.getElementById('mainLayout').classList.add('collapsed');

      renderTopUser();
      preencherSelectClientes();
      renderListaOS();

      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar(); }
        if (e.key === 'Escape') { fecharModalFaturamento(); fecharModalEditar(); }
      });

      window.addEventListener('storage', (e) => {
        if (e.key === LS.clientes || e.key === LS.legacyClientes) preencherSelectClientes();
        if (e.key === LS.os || e.key === LS.legacyOs) renderListaOS();
        if (e.key === LS.config || e.key === LS.legacyConfig) {
          renderTopUser();
          if (osEditandoId) {
            const os = getOsById(osEditandoId);
            fillTiposEquipamentoSelect(os?.detalhes?.equipamento?.tipo || '');
            renderDinamicosSlot();
            applyDynamicValuesToUI(os);
            renderChecklistSlot();
          }
        }
        if (e.key === LS.produtos || e.key === LS.servicos) {
          if (osEditandoId) {
            const activePane = document.querySelector('.tab-pane.active')?.id;
            if (activePane === 'tab-produtos') renderProdutosBusca();
            if (activePane === 'tab-servicos') renderServicosBusca();
          }
        }
        if (e.key === LS.sidebarCollapsed) {
          const isCollapsed2 = localStorage.getItem(LS.sidebarCollapsed) === 'true';
          const layout2 = document.getElementById('mainLayout');
          if (!layout2) return;
          if (isCollapsed2) layout2.classList.add('collapsed');
          else layout2.classList.remove('collapsed');
        }
      });
    });

    // expor
    window.toggleSidebar = toggleSidebar;
    window.onClienteSelecionado = onClienteSelecionado;
    window.resetCriacao = resetCriacao;
    window.criarOSBasica = criarOSBasica;
    window.renderListaOS = renderListaOS;
    window.excluirOS = excluirOS;

    window.selectTab = selectTab;
    window.abrirModalEditar = abrirModalEditar;
    window.abrirModalFaturar = abrirModalFaturar;
    window.fecharModalEditar = fecharModalEditar;
    window.salvarDetalhesOS = salvarDetalhesOS;

    window.onModalTipoEquipamentoChange = onModalTipoEquipamentoChange;
    window.renderPreviewTermo = renderPreviewTermo;

    window.renderProdutosBusca = renderProdutosBusca;
    window.limparBuscaProduto = limparBuscaProduto;
    window.adicionarProdutoOS = adicionarProdutoOS;
    window.alterarQtdProduto = alterarQtdProduto;
    window.removerProdutoOS = removerProdutoOS;

    window.renderServicosBusca = renderServicosBusca;
    window.limparBuscaServico = limparBuscaServico;
    window.adicionarServicoOS = adicionarServicoOS;
    window.removerServicoOS = removerServicoOS;

    window.updateFinanceKPIs = updateFinanceKPIs;

    window.abrirModalFaturamento = abrirModalFaturamento;
    window.fecharModalFaturamento = fecharModalFaturamento;
    window.confirmarFaturamento = confirmarFaturamento;