// =========================
    // LocalStorage padronizado + migração
    // =========================
    const LS = Object.freeze({
      config: 'osflow:config',
      sidebarCollapsed: 'osflow:ui:sidebarCollapsed',

      // legado
      legacyConfig: 'osflow_config',
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
      if (!localStorage.getItem(LS.config) && localStorage.getItem(LS.legacyConfig)) {
        localStorage.setItem(LS.config, localStorage.getItem(LS.legacyConfig));
      }
      if (!localStorage.getItem(LS.sidebarCollapsed) && localStorage.getItem(LS.legacySidebarCollapsed)) {
        localStorage.setItem(LS.sidebarCollapsed, localStorage.getItem(LS.legacySidebarCollapsed));
      }
    }

    migrateLocalStorageKeys();

    // =========================
    // Constantes e Defaults
    // =========================
    const DEFAULT_CONFIG = {
      version: 2,
      updatedAt: '',
      usuario: { nome:'', email:'', telefone:'', cargo:'', assinatura:'' },
      empresa: { nomeFantasia:'', razaoSocial:'', cnpj:'', ie:'', telefone:'', email:'', endereco:'', website:'', logoDataUrl:'' },
      templates: {
        equipamentoTipos: [],
        equipamentoCamposByTipo: {},
        checklistByTipo: {}
      },
      integracoes: {
        mercadopago: { accessToken:'', publicKey:'', webhookSecret:'' },
        whatsapp: { token:'', phoneId:'', fromName:'' }
      }
    };

    // =========================
    // Estado do modal
    // =========================
    let tipoEditandoId = null;

    // =========================
    // Sidebar (padronizado)
    // =========================
    function toggleSidebar() {
      const layout = document.getElementById('mainLayout');
      if (!layout) return;
      layout.classList.toggle('collapsed');
      localStorage.setItem(LS.sidebarCollapsed, layout.classList.contains('collapsed'));
    }

    // =========================
    // Toast
    // =========================
    function toast(message, type = 'info') {
      const colors = {
        info: 'var(--primary-500)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)'
      };

      const el = document.createElement('div');
      el.className = 'toast';
      el.style.background = colors[type] || colors.info;
      el.textContent = message;
      document.body.appendChild(el);

      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity .25s ease';
        setTimeout(() => el.remove(), 250);
      }, 2200);
    }

    // =========================
    // Config helpers
    // =========================
    function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

    function mergeDefaults(base, incoming) {
      for (const k of Object.keys(incoming || {})) {
        const v = incoming[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) base[k] = mergeDefaults(base[k] || {}, v);
        else base[k] = v;
      }
      return base;
    }

    function getConfig() {
      const parsed = lsReadJSON(LS.config, null);
      if (!parsed) return deepClone(DEFAULT_CONFIG);
      return mergeDefaults(deepClone(DEFAULT_CONFIG), parsed);
    }

    function setConfig(cfg) {
      const next = deepClone(cfg);
      next.updatedAt = new Date().toISOString();
      lsWriteJSON(LS.config, next);
    }

    function getTemplates() {
      const cfg = getConfig();
      cfg.templates = cfg.templates || {};
      cfg.templates.equipamentoTipos = cfg.templates.equipamentoTipos || [];
      cfg.templates.equipamentoCamposByTipo = cfg.templates.equipamentoCamposByTipo || {};
      cfg.templates.checklistByTipo = cfg.templates.checklistByTipo || {};
      return cfg.templates;
    }

    function setTemplates(templates) {
      const cfg = getConfig();
      cfg.templates = templates;
      setConfig(cfg);
    }

    // =========================
    // UI: carregar/salvar
    // =========================
    function carregarTela() {
      const cfg = getConfig();

      document.getElementById('userNome').value = cfg.usuario.nome || '';
      document.getElementById('userEmail').value = cfg.usuario.email || '';
      document.getElementById('userTelefone').value = cfg.usuario.telefone || '';
      document.getElementById('userCargo').value = cfg.usuario.cargo || '';
      document.getElementById('userAssinatura').value = cfg.usuario.assinatura || '';

      document.getElementById('empNome').value = cfg.empresa.nomeFantasia || '';
      document.getElementById('empRazao').value = cfg.empresa.razaoSocial || '';
      document.getElementById('empCnpj').value = cfg.empresa.cnpj || '';
      document.getElementById('empIe').value = cfg.empresa.ie || '';
      document.getElementById('empTelefone').value = cfg.empresa.telefone || '';
      document.getElementById('empEmail').value = cfg.empresa.email || '';
      document.getElementById('empEndereco').value = cfg.empresa.endereco || '';
      document.getElementById('empWebsite').value = cfg.empresa.website || '';
      document.getElementById('empLogoDataUrl').value = cfg.empresa.logoDataUrl || '';

      // integrações
      const mp = cfg.integracoes?.mercadopago || {};
      const wa = cfg.integracoes?.whatsapp || {};

      document.getElementById('mpAccessToken').value = mp.accessToken || '';
      document.getElementById('mpPublicKey').value = mp.publicKey || '';
      document.getElementById('mpWebhookSecret').value = mp.webhookSecret || '';

      document.getElementById('waToken').value = wa.token || '';
      document.getElementById('waPhoneId').value = wa.phoneId || '';
      document.getElementById('waFromName').value = wa.fromName || '';

      atualizarTopUser(cfg);
      renderListaTipos();
    }

    function coletarTela() {
      const cfg = getConfig();

      cfg.usuario = {
        nome: (document.getElementById('userNome').value || '').trim(),
        email: (document.getElementById('userEmail').value || '').trim(),
        telefone: (document.getElementById('userTelefone').value || '').trim(),
        cargo: (document.getElementById('userCargo').value || '').trim(),
        assinatura: (document.getElementById('userAssinatura').value || '').trim()
      };

      cfg.empresa = {
        nomeFantasia: (document.getElementById('empNome').value || '').trim(),
        razaoSocial: (document.getElementById('empRazao').value || '').trim(),
        cnpj: (document.getElementById('empCnpj').value || '').trim(),
        ie: (document.getElementById('empIe').value || '').trim(),
        telefone: (document.getElementById('empTelefone').value || '').trim(),
        email: (document.getElementById('empEmail').value || '').trim(),
        endereco: (document.getElementById('empEndereco').value || '').trim(),
        website: (document.getElementById('empWebsite').value || '').trim(),
        logoDataUrl: (document.getElementById('empLogoDataUrl').value || '').trim()
      };

      cfg.integracoes = cfg.integracoes || {};
      cfg.integracoes.mercadopago = {
        accessToken: (document.getElementById('mpAccessToken').value || '').trim(),
        publicKey: (document.getElementById('mpPublicKey').value || '').trim(),
        webhookSecret: (document.getElementById('mpWebhookSecret').value || '').trim()
      };
      cfg.integracoes.whatsapp = {
        token: (document.getElementById('waToken').value || '').trim(),
        phoneId: (document.getElementById('waPhoneId').value || '').trim(),
        fromName: (document.getElementById('waFromName').value || '').trim()
      };

      return cfg;
    }

    function atualizarTopUser(cfg) {
      const name = cfg.usuario.nome || 'Usuário';
      const initial = (name.trim()[0] || 'U').toUpperCase();
      document.getElementById('topUserName').textContent = name;
      document.getElementById('topUserAvatar').textContent = initial;
    }

    function salvarTudo() {
      const cfg = coletarTela();
      setConfig(cfg);
      atualizarTopUser(cfg);
      toast('Configurações salvas!', 'success');
    }

    function resetarParaPadrao() {
      if (!confirm('Restaurar configurações para o padrão?')) return;
      setConfig(deepClone(DEFAULT_CONFIG));
      carregarTela();
      toast('Restaurado para o padrão.', 'warning');
    }

    function preencherUsuarioMock() {
      document.getElementById('userNome').value = 'Victor Gomes';
      document.getElementById('userEmail').value = 'victor@osflow.com';
      document.getElementById('userTelefone').value = '(11) 99999-9999';
      document.getElementById('userCargo').value = 'Administrador';
      document.getElementById('userAssinatura').value = 'Assinatura do responsável (exemplo).';
      toast('Exemplo preenchido (usuário).', 'info');
    }

    function preencherEmpresaMock() {
      document.getElementById('empNome').value = 'Assistência XYZ';
      document.getElementById('empRazao').value = 'XYZ Tecnologia LTDA';
      document.getElementById('empCnpj').value = '00.000.000/0001-00';
      document.getElementById('empIe').value = '';
      document.getElementById('empTelefone').value = '(11) 3333-3333';
      document.getElementById('empEmail').value = 'contato@assistenciaxyz.com';
      document.getElementById('empEndereco').value = 'Rua Exemplo, 123\nCentro\nSão Paulo/SP\n00000-000';
      document.getElementById('empWebsite').value = 'https://assistenciaxyz.com';
      document.getElementById('empLogoDataUrl').value = '';
      toast('Exemplo preenchido (empresa).', 'info');
    }

    function toggleSecret(inputId) {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.type = el.type === 'password' ? 'text' : 'password';
    }

    // =========================
    // Tipos de equipamento
    // =========================
    function slugify(s) {
      return String(s || '')
        .trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    function limparCriacaoTipo() {
      document.getElementById('novoTipoLabel').value = '';
      document.getElementById('novoTipoId').value = '';
    }

    function criarTipoEquipamento() {
      const label = (document.getElementById('novoTipoLabel').value || '').trim();
      let id = (document.getElementById('novoTipoId').value || '').trim();

      if (!label) return toast('Digite o nome do tipo (ex.: TV).', 'warning');
      id = slugify(id || label);
      if (!id) return toast('Código inválido.', 'warning');

      const templates = getTemplates();
      const exists = templates.equipamentoTipos.some(t => t.id === id);
      if (exists) return toast('Já existe um tipo com esse código.', 'warning');

      const now = new Date().toISOString();
      templates.equipamentoTipos.unshift({ id, label, createdAt: now, updatedAt: now });
      templates.equipamentoCamposByTipo[id] = [];
      templates.checklistByTipo[id] = [];

      setTemplates(templates);
      limparCriacaoTipo();
      renderListaTipos();
      toast('Tipo criado! Clique em Editar para adicionar campos/checklist.', 'success');
    }

    function renderListaTipos() {
      const tbody = document.getElementById('tiposTbody');
      const empty = document.getElementById('tiposEmpty');
      if (!tbody || !empty) return;

      const templates = getTemplates();
      const tipos = templates.equipamentoTipos || [];

      if (!tipos.length) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
      }

      empty.style.display = 'none';

      tbody.innerHTML = tipos.map(t => {
        const campos = templates.equipamentoCamposByTipo[t.id] || [];
        const checks = templates.checklistByTipo[t.id] || [];
        return `
          <tr>
            <td>
              <div style="font-weight:900;">${escapeHTML(t.label)}</div>
              <div class="hint"><span class="mono">${escapeHTML(t.id)}</span></div>
            </td>
            <td><span class="pill">${campos.length}</span></td>
            <td><span class="pill">${checks.length}</span></td>
            <td>
              <div class="row-actions">
                <button class="btn btn-mini btn-mini-primary" type="button" onclick="abrirModalTipo('${escapeJS(t.id)}')">✏️ Editar</button>
                <button class="btn btn-mini btn-mini-danger" type="button" onclick="removerTipo('${escapeJS(t.id)}')">🗑️ Excluir</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    function removerTipo(tipoId) {
      const templates = getTemplates();
      const tipo = templates.equipamentoTipos.find(t => t.id === tipoId);
      if (!tipo) return;

      if (!confirm(`Excluir o tipo "${tipo.label}"? Isso apaga campos e checklist desse tipo.`)) return;

      templates.equipamentoTipos = templates.equipamentoTipos.filter(t => t.id !== tipoId);
      delete templates.equipamentoCamposByTipo[tipoId];
      delete templates.checklistByTipo[tipoId];

      setTemplates(templates);
      renderListaTipos();
      toast('Tipo excluído.', 'warning');
    }

    // =========================
    // Modal
    // =========================
    function abrirModalTipo(tipoId) {
      const templates = getTemplates();
      const tipo = templates.equipamentoTipos.find(t => t.id === tipoId);
      if (!tipo) return;

      tipoEditandoId = tipoId;

      document.getElementById('modalEditarTipoTitulo').textContent = `Editar Tipo • ${tipo.label}`;
      document.getElementById('modalEditarTipo').style.display = 'flex';

      selectTab('tab-campos');

      document.getElementById('campoLabel').value = '';
      document.getElementById('campoKind').value = 'text';
      document.getElementById('campoOptions').value = '';
      updateCampoOptionsVisibility();

      document.getElementById('checkLabel').value = '';

      renderModalTipo();
    }

    function fecharModalTipo() {
      document.getElementById('modalEditarTipo').style.display = 'none';
      tipoEditandoId = null;
    }

    function selectTab(paneId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      document.getElementById(paneId).classList.add('active');
      document.getElementById('btn-' + paneId).classList.add('active');
    }

    function renderModalTipo() {
      const templates = getTemplates();
      const camposTbody = document.getElementById('modalCamposTbody');
      const camposEmpty = document.getElementById('modalCamposEmpty');
      const checksTbody = document.getElementById('modalChecklistTbody');
      const checksEmpty = document.getElementById('modalChecklistEmpty');

      if (!tipoEditandoId) return;

      const fields = templates.equipamentoCamposByTipo[tipoEditandoId] || [];
      const items = templates.checklistByTipo[tipoEditandoId] || [];

      if (!fields.length) {
        camposTbody.innerHTML = '';
        camposEmpty.style.display = 'block';
      } else {
        camposEmpty.style.display = 'none';
        camposTbody.innerHTML = fields.map((f, idx) => `
          <tr>
            <td>
              <div style="font-weight:900;">${escapeHTML(f.label)}</div>
              <div class="hint"><span class="mono">${escapeHTML(f.id)}</span></div>
            </td>
            <td><span class="pill">${escapeHTML(f.kind)}</span></td>
            <td>${f.kind === 'select' ? `<span class="hint">${escapeHTML((f.options || []).join(', '))}</span>` : `<span class="hint">—</span>`}</td>
            <td><button class="btn btn-mini btn-mini-danger" type="button" onclick="removerCampoNoTipo(${idx})">Remover</button></td>
          </tr>
        `).join('');
      }

      if (!items.length) {
        checksTbody.innerHTML = '';
        checksEmpty.style.display = 'block';
      } else {
        checksEmpty.style.display = 'none';
        checksTbody.innerHTML = items.map((it, idx) => `
          <tr>
            <td>
              <div style="font-weight:900;">${escapeHTML(it.label)}</div>
              <div class="hint"><span class="mono">${escapeHTML(it.id)}</span></div>
            </td>
            <td><span class="pill">checkbox</span></td>
            <td><button class="btn btn-mini btn-mini-danger" type="button" onclick="removerChecklistNoTipo(${idx})">Remover</button></td>
          </tr>
        `).join('');
      }
    }

    function toIdFromLabel(label) {
      return String(label || '')
        .trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    function updateCampoOptionsVisibility() {
      const kind = document.getElementById('campoKind').value;
      document.getElementById('campoOptionsWrap').style.display = kind === 'select' ? 'block' : 'none';
    }

    function adicionarCampoNoTipo() {
      if (!tipoEditandoId) return;

      const label = (document.getElementById('campoLabel').value || '').trim();
      const kind = document.getElementById('campoKind').value;

      if (!label) return toast('Digite o nome do campo.', 'warning');

      const id = toIdFromLabel(label);
      if (!id) return toast('Nome inválido.', 'warning');

      const optionsRaw = (document.getElementById('campoOptions').value || '').trim();
      const options = kind === 'select'
        ? optionsRaw.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (kind === 'select' && !options.length) return toast('Informe opções para o select.', 'warning');

      const templates = getTemplates();
      const fields = templates.equipamentoCamposByTipo[tipoEditandoId] || [];

      if (fields.some(f => f.id === id)) return toast('Já existe um campo com esse nome (id).', 'warning');

      fields.push({ id, label, kind, options });
      templates.equipamentoCamposByTipo[tipoEditandoId] = fields;

      const tipo = templates.equipamentoTipos.find(t => t.id === tipoEditandoId);
      if (tipo) tipo.updatedAt = new Date().toISOString();

      setTemplates(templates);

      document.getElementById('campoLabel').value = '';
      document.getElementById('campoKind').value = 'text';
      document.getElementById('campoOptions').value = '';
      updateCampoOptionsVisibility();

      renderModalTipo();
      renderListaTipos();
      toast('Campo adicionado!', 'success');
    }

    function removerCampoNoTipo(index) {
      if (!tipoEditandoId) return;

      const templates = getTemplates();
      const fields = templates.equipamentoCamposByTipo[tipoEditandoId] || [];
      const f = fields[index];
      if (!f) return;

      if (!confirm(`Remover o campo "${f.label}"?`)) return;

      fields.splice(index, 1);
      templates.equipamentoCamposByTipo[tipoEditandoId] = fields;

      const tipo = templates.equipamentoTipos.find(t => t.id === tipoEditandoId);
      if (tipo) tipo.updatedAt = new Date().toISOString();

      setTemplates(templates);

      renderModalTipo();
      renderListaTipos();
      toast('Campo removido.', 'warning');
    }

    function adicionarChecklistNoTipo() {
      if (!tipoEditandoId) return;

      const label = (document.getElementById('checkLabel').value || '').trim();
      if (!label) return toast('Digite o item do checklist.', 'warning');

      const id = toIdFromLabel(label);
      if (!id) return toast('Nome inválido.', 'warning');

      const templates = getTemplates();
      const items = templates.checklistByTipo[tipoEditandoId] || [];

      if (items.some(x => x.id === id)) return toast('Já existe um item com esse nome (id).', 'warning');

      items.push({ id, label });
      templates.checklistByTipo[tipoEditandoId] = items;

      const tipo = templates.equipamentoTipos.find(t => t.id === tipoEditandoId);
      if (tipo) tipo.updatedAt = new Date().toISOString();

      setTemplates(templates);

      document.getElementById('checkLabel').value = '';
      renderModalTipo();
      renderListaTipos();
      toast('Checklist adicionado!', 'success');
    }

    function removerChecklistNoTipo(index) {
      if (!tipoEditandoId) return;

      const templates = getTemplates();
      const items = templates.checklistByTipo[tipoEditandoId] || [];
      const it = items[index];
      if (!it) return;

      if (!confirm(`Remover o item "${it.label}"?`)) return;

      items.splice(index, 1);
      templates.checklistByTipo[tipoEditandoId] = items;

      const tipo = templates.equipamentoTipos.find(t => t.id === tipoEditandoId);
      if (tipo) tipo.updatedAt = new Date().toISOString();

      setTemplates(templates);

      renderModalTipo();
      renderListaTipos();
      toast('Item removido.', 'warning');
    }

    // =========================
    // Utils
    // =========================
    function escapeHTML(s) {
      return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }
    function escapeJS(s) {
      return String(s ?? '').replaceAll('\\','\\\\').replaceAll("'","\\'");
    }

    // =========================
    // Init
    // =========================
    document.addEventListener('DOMContentLoaded', () => {
      const anoEl = document.getElementById('ano-atual');
      if (anoEl) anoEl.textContent = new Date().getFullYear();

      const isCollapsed = localStorage.getItem(LS.sidebarCollapsed) === 'true';
      const layout = document.getElementById('mainLayout');
      if (layout && isCollapsed) layout.classList.add('collapsed');

      document.getElementById('campoKind').addEventListener('change', updateCampoOptionsVisibility);

      carregarTela();

      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar(); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); salvarTudo(); }
        if (e.key === 'Escape') fecharModalTipo();
      });

      // Sync: se outra aba alterar templates/config, atualiza
      window.addEventListener('storage', (e) => {
        if (e.key === LS.config || e.key === LS.legacyConfig) {
          carregarTela();
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

    // expor pro HTML
    window.toggleSidebar = toggleSidebar;
    window.resetarParaPadrao = resetarParaPadrao;
    window.salvarTudo = salvarTudo;
    window.preencherUsuarioMock = preencherUsuarioMock;
    window.preencherEmpresaMock = preencherEmpresaMock;
    window.toggleSecret = toggleSecret;

    window.criarTipoEquipamento = criarTipoEquipamento;
    window.limparCriacaoTipo = limparCriacaoTipo;
    window.abrirModalTipo = abrirModalTipo;
    window.fecharModalTipo = fecharModalTipo;
    window.selectTab = selectTab;

    window.adicionarCampoNoTipo = adicionarCampoNoTipo;
    window.removerCampoNoTipo = removerCampoNoTipo;
    window.adicionarChecklistNoTipo = adicionarChecklistNoTipo;
    window.removerChecklistNoTipo = removerChecklistNoTipo;

    window.removerTipo = removerTipo;