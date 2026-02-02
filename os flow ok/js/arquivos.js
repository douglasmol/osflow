// ============================
    // LocalStorage padronizado + migração
    // ============================
    const LS = Object.freeze({
      clientes: 'osflow:clientes',
      os: 'osflow:os',
      sidebarCollapsed: 'osflow:ui:sidebarCollapsed',

      // legado
      legacyClientes: 'clientesOSFlow',
      legacyOs: 'osflow_os',
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

    function migrateLocalStorageKeys() {
      if (!localStorage.getItem(LS.clientes) && localStorage.getItem(LS.legacyClientes)) {
        localStorage.setItem(LS.clientes, localStorage.getItem(LS.legacyClientes));
      }
      if (!localStorage.getItem(LS.os) && localStorage.getItem(LS.legacyOs)) {
        localStorage.setItem(LS.os, localStorage.getItem(LS.legacyOs));
      }
      if (!localStorage.getItem(LS.sidebarCollapsed) && localStorage.getItem(LS.legacySidebarCollapsed)) {
        localStorage.setItem(LS.sidebarCollapsed, localStorage.getItem(LS.legacySidebarCollapsed));
      }
    }

    migrateLocalStorageKeys();

    // ============================
    // Notificação
    // ============================
    function mostrarNotificacao(mensagem, tipo = 'info') {
      const cores = {
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
        info:    '#0ea5e9'
      };

      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${cores[tipo] || cores.info};
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.12);
        z-index: 10000;
        font-size: 0.875rem;
        font-weight: 700;
        max-width: 380px;
      `;
      notification.innerHTML = mensagem;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }, 2800);
    }

    // ---------- Helpers ----------
    function escapeHTML(s) {
      return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function formatBytes(bytes) {
      const b = Number(bytes || 0);
      const mb = b / (1024 * 1024);
      if (mb < 1024) return mb.toFixed(1) + ' MB';
      return (mb / 1024).toFixed(2) + ' GB';
    }

    function categoriaLabel(c) {
      const map = {
        antes: '📷 Antes',
        depois: '✅ Depois',
        diagnostico: '🧪 Diagnóstico',
        documento: '📄 Documento',
        outros: '📁 Outros'
      };
      return map[c] || c || '-';
    }

    // ---------- Sidebar ----------
    function toggleSidebar() {
      const layout = document.getElementById('mainLayout');
      if (!layout) return;

      layout.classList.toggle('collapsed');
      localStorage.setItem(LS.sidebarCollapsed, layout.classList.contains('collapsed'));
    }

    // ============================
    // IndexedDB
    // ============================
    const DB_NAME = 'OSFlowFilesDB';
    const DB_VERSION = 2; // nova versão para índices novos
    const STORE = 'attachments';
    let db = null;

    function dbInit() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const _db = request.result;

          if (!_db.objectStoreNames.contains(STORE)) {
            const store = _db.createObjectStore(STORE, { keyPath: 'id' });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            store.createIndex('clienteId', 'clienteId', { unique: false });
            store.createIndex('clienteNome', 'clienteNome', { unique: false });
            store.createIndex('osId', 'osId', { unique: false });
            store.createIndex('osNumero', 'osNumero', { unique: false });
            store.createIndex('categoria', 'categoria', { unique: false });
          } else {
            const store = request.transaction.objectStore(STORE);
            // tenta criar índices se não existirem (upgrade)
            try { store.createIndex('clienteId', 'clienteId', { unique: false }); } catch {}
            try { store.createIndex('clienteNome', 'clienteNome', { unique: false }); } catch {}
            try { store.createIndex('osId', 'osId', { unique: false }); } catch {}
            try { store.createIndex('osNumero', 'osNumero', { unique: false }); } catch {}
          }
        };

        request.onsuccess = () => {
          db = request.result;
          resolve();
        };

        request.onerror = () => reject(request.error);
      });
    }

    function dbTx(mode = 'readonly') {
      const tx = db.transaction(STORE, mode);
      return tx.objectStore(STORE);
    }

    function dbPut(record) {
      return new Promise((resolve, reject) => {
        const store = dbTx('readwrite');
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

    function dbDelete(id) {
      return new Promise((resolve, reject) => {
        const store = dbTx('readwrite');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }

    function dbGet(id) {
      return new Promise((resolve, reject) => {
        const store = dbTx('readonly');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    }

    function dbGetAll() {
      return new Promise((resolve, reject) => {
        const store = dbTx('readonly');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    }

    // ============================
    // Dados: clientes + OS
    // ============================
    function getClientes() {
      return lsReadJSON(LS.clientes, []);
    }

    function getOSList() {
      return lsReadJSON(LS.os, []);
    }

    function getValidOSForCliente(clienteId) {
      const clientes = getClientes();
      const clienteExists = clientes.some(c => String(c.id) === String(clienteId));
      if (!clienteExists) return [];

      const all = getOSList();
      return all.filter(os => {
        const osClienteId = os?.cliente?.clienteId || '';
        const device = (os?.detalhes?.equipamento?.marcaModelo || '').trim();
        return String(osClienteId) === String(clienteId) && !!device;
      });
    }

    function getOSById(id) {
      return getOSList().find(o => String(o.id) === String(id)) || null;
    }

    function osFolderLabel(os) {
      const numero = os?.numero || 'OS';
      const device = (os?.detalhes?.equipamento?.marcaModelo || '').trim();
      return `${numero} • ${device || 'Equipamento não definido'}`;
    }

    // ============================
    // Estado de UI do browser
    // ============================
    const NAV = {
      level: 'clientes', // clientes | os | categorias | arquivos
      clienteId: '',
      osId: '',
      categoria: ''
    };

    let selectedFiles = [];
    let cacheRecords = []; // anexos
    let cacheClientes = [];
    let cacheOS = [];

    // ============================
    // Upload handlers
    // ============================
    function bindUploadHandlers() {
      const input = document.getElementById('fileInput');
      const dropzone = document.getElementById('dropzone');

      if (!input || !dropzone) return;

      input.addEventListener('change', () => {
        selectedFiles = Array.from(input.files || []);
        updateSelectedFilesInfo();
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files || []);
        selectedFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
        input.value = '';
        updateSelectedFilesInfo();
      });
    }

    function updateSelectedFilesInfo() {
      const el = document.getElementById('selectedFilesInfo');
      if (!el) return;

      if (!selectedFiles.length) {
        el.textContent = 'Nenhum arquivo selecionado.';
        return;
      }
      const totalBytes = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
      el.innerHTML = `<strong>${selectedFiles.length}</strong> arquivo(s) selecionado(s) • ${escapeHTML(formatBytes(totalBytes))}`;
    }

    function resetUploadWizard() {
      const form = document.getElementById('arquivoForm');
      if (form) form.reset();

      selectedFiles = [];
      const input = document.getElementById('fileInput');
      if (input) input.value = '';

      document.getElementById('osSelect').innerHTML = `<option value="">Selecione um cliente primeiro...</option>`;
      document.getElementById('osHint').textContent = 'Somente OS desse cliente.';
      updateSelectedFilesInfo();
      mostrarNotificacao('🆕 Formulário limpo.', 'info');
    }

    function fillClienteSelect() {
      const select = document.getElementById('clienteSelect');
      if (!select) return;

      const clientes = [...cacheClientes].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      select.innerHTML = `<option value="">Selecione...</option>` + clientes.map(c => `
        <option value="${escapeHTML(String(c.id))}">${escapeHTML(c.nome || 'Cliente')}</option>
      `).join('');
    }

    function onClienteChange() {
      const clienteId = document.getElementById('clienteSelect').value;
      const osSelect = document.getElementById('osSelect');
      const osHint = document.getElementById('osHint');

      if (!clienteId) {
        osSelect.innerHTML = `<option value="">Selecione um cliente primeiro...</option>`;
        osHint.textContent = 'Somente OS desse cliente.';
        return;
      }

      const osList = getValidOSForCliente(clienteId);
      if (!osList.length) {
        osSelect.innerHTML = `<option value="">Nenhuma OS válida para este cliente</option>`;
        osHint.textContent = 'Para anexar, a OS deve existir e ter Marca/Modelo preenchido.';
        return;
      }

      osHint.textContent = `Encontradas ${osList.length} OS com equipamento definido.`;
      osSelect.innerHTML = `<option value="">Selecione...</option>` + osList
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(o => `<option value="${escapeHTML(String(o.id))}">${escapeHTML(osFolderLabel(o))}</option>`)
        .join('');
    }

    function onOSChange() {
      // no-op hoje: só guardamos seleção no submit
    }

    async function salvarAnexos(event) {
      event.preventDefault();

      const clienteId = document.getElementById('clienteSelect')?.value || '';
      const osId = document.getElementById('osSelect')?.value || '';
      const categoria = document.getElementById('categoria')?.value || '';
      const observacao = (document.getElementById('observacao')?.value || '').trim();

      if (!clienteId || !osId || !categoria) {
        mostrarNotificacao('⚠️ Selecione Cliente, OS e Categoria.', 'danger');
        return;
      }
      if (!selectedFiles.length) {
        mostrarNotificacao('📎 Selecione pelo menos 1 arquivo.', 'danger');
        return;
      }

      // valida cliente e OS
      const cliente = cacheClientes.find(c => String(c.id) === String(clienteId));
      if (!cliente) {
        mostrarNotificacao('❌ Cliente inválido (não encontrado).', 'danger');
        return;
      }

      const os = getOSById(osId);
      if (!os) {
        mostrarNotificacao('❌ OS inválida (não encontrada).', 'danger');
        return;
      }
      if (String(os?.cliente?.clienteId || '') !== String(clienteId)) {
        mostrarNotificacao('❌ Esta OS não pertence ao cliente selecionado.', 'danger');
        return;
      }

      const equipamento = (os?.detalhes?.equipamento?.marcaModelo || '').trim();
      if (!equipamento) {
        mostrarNotificacao('❌ A OS selecionada não possui equipamento definido (Marca/Modelo).', 'danger');
        return;
      }

      // groupKey por OS padronizado
      const groupKey = `osflow:files:os|${String(os.id)}`;

      try {
        for (const file of selectedFiles) {
          const id = crypto?.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()) + '-' + Math.random().toString(16).slice(2);

          const record = {
            id,
            groupKey,

            clienteId: String(cliente.id),
            clienteNome: cliente.nome || os?.cliente?.nome || '',
            osId: String(os.id),
            osNumero: os.numero || '',
            equipamento: equipamento,

            categoria,
            observacao,

            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            createdAt: new Date().toISOString(),

            blob: file
          };

          await dbPut(record);
        }

        mostrarNotificacao('✅ Arquivo(s) anexado(s) com sucesso!', 'success');
        resetUploadWizard();

        await refreshAll();

        // posiciona o browser na árvore do item salvo
        NAV.level = 'categorias';
        NAV.clienteId = String(cliente.id);
        NAV.osId = String(os.id);
        NAV.categoria = '';
        renderBrowser();
      } catch (err) {
        console.error(err);
        mostrarNotificacao('❌ Falha ao salvar arquivos (limite do navegador?).', 'danger');
      }
    }

    // ============================
    // Browser (Cliente → OS → Categoria → Arquivos)
    // ============================
    function setNav(level, next = {}) {
      NAV.level = level;
      if ('clienteId' in next) NAV.clienteId = next.clienteId;
      if ('osId' in next) NAV.osId = next.osId;
      if ('categoria' in next) NAV.categoria = next.categoria;
      renderBrowser();
    }

    function buildPathbar() {
      const el = document.getElementById('pathbar');
      if (!el) return;

      const crumbs = [];
      crumbs.push({ label: '🏠 Clientes', level: 'clientes', active: NAV.level === 'clientes' });

      if (NAV.clienteId) {
        const c = cacheClientes.find(x => String(x.id) === String(NAV.clienteId));
        crumbs.push({ label: `👥 ${c ? c.nome : 'Cliente'}`, level: 'os', active: NAV.level === 'os' });
      }

      if (NAV.osId) {
        const os = cacheOS.find(x => String(x.id) === String(NAV.osId));
        crumbs.push({ label: `📋 ${os ? osFolderLabel(os) : 'OS'}`, level: 'categorias', active: NAV.level === 'categorias' });
      }

      if (NAV.categoria) {
        crumbs.push({ label: `${categoriaLabel(NAV.categoria)}`, level: 'arquivos', active: NAV.level === 'arquivos' });
      }

      el.innerHTML = crumbs.map((c, i) => `
        <div class="crumb ${c.active ? 'active' : ''}" onclick="${c.active ? '' : `onCrumbClick(${i})`}">
          ${escapeHTML(c.label)}
        </div>
      `).join('');

      window.__crumbs = crumbs;
    }

    function onCrumbClick(index) {
      const crumbs = window.__crumbs || [];
      const target = crumbs[index];
      if (!target) return;

      if (target.level === 'clientes') {
        setNav('clientes', { clienteId: '', osId: '', categoria: '' });
        return;
      }
      if (target.level === 'os') {
        setNav('os', { osId: '', categoria: '' });
        return;
      }
      if (target.level === 'categorias') {
        setNav('categorias', { categoria: '' });
        return;
      }
    }

    function getSearchTerm() {
      return (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    }

    function getFilesForOS(osId) {
      const groupKey = `osflow:files:os|${String(osId)}`;
      return cacheRecords.filter(r => r.groupKey === groupKey || String(r.osId) === String(osId));
    }

    function summarizeFiles(records) {
      const total = records.length;
      const imagens = records.filter(r => (r.mimeType || '').startsWith('image/')).length;
      const videos = records.filter(r => (r.mimeType || '').startsWith('video/')).length;
      const bytes = records.reduce((acc, r) => acc + (r.size || 0), 0);
      return { total, imagens, videos, bytes };
    }

    function renderClientesLevel() {
      const grid = document.getElementById('browserGrid');
      const empty = document.getElementById('emptyState');
      if (!grid || !empty) return;

      const term = getSearchTerm();

      // Mostrar todos clientes cadastrados, mas destacando se possuem OS válida
      const clientes = [...cacheClientes].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      const cards = clientes
        .map(cliente => {
          const osValidas = getValidOSForCliente(cliente.id);
          const match = !term || `${cliente.nome}`.toLowerCase().includes(term);
          if (!match) return null;

          const stats = summarizeFiles(cacheRecords.filter(r => String(r.clienteId) === String(cliente.id)));
          const label = cliente.nome || 'Cliente';

          return `
            <div class="card">
              <div class="thumb">
                <span class="thumb-badge">${osValidas.length} OS</span>
                <div style="font-size:2.25rem;">👥</div>
              </div>
              <div class="card-body">
                <div class="card-title">${escapeHTML(label)}</div>
                <div class="card-meta">
                  <div class="pill">Arquivos: ${stats.total}</div>
                  <div>Imagens: ${stats.imagens} • Vídeos: ${stats.videos}</div>
                  <div>Tamanho: ${escapeHTML(formatBytes(stats.bytes))}</div>
                </div>
              </div>
              <div class="card-actions">
                <button class="btn btn-primary" type="button" onclick="setNav('os', {clienteId: '${escapeHTML(String(cliente.id))}', osId:'', categoria:''})">
                  📂 Abrir
                </button>
              </div>
            </div>
          `;
        })
        .filter(Boolean);

      if (!cards.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
      }

      empty.style.display = 'none';
      grid.innerHTML = cards.join('');
    }

    function renderOSLevel() {
      const grid = document.getElementById('browserGrid');
      const empty = document.getElementById('emptyState');
      if (!grid || !empty) return;

      const term = getSearchTerm();
      const clienteId = NAV.clienteId;

      if (!clienteId) {
        setNav('clientes', { clienteId:'', osId:'', categoria:'' });
        return;
      }

      const osList = getValidOSForCliente(clienteId)
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

      const cards = osList
        .map(os => {
          const label = osFolderLabel(os);
          const files = getFilesForOS(os.id);
          const stats = summarizeFiles(files);

          const match = !term || `${label} ${os?.cliente?.nome || ''} ${os?.detalhes?.equipamento?.marcaModelo || ''}`.toLowerCase().includes(term);
          if (!match) return null;

          return `
            <div class="card">
              <div class="thumb">
                <span class="thumb-badge">${stats.total} arquivo(s)</span>
                <div style="font-size:2.25rem;">📋</div>
              </div>
              <div class="card-body">
                <div class="card-title">${escapeHTML(label)}</div>
                <div class="card-meta">
                  <div class="pill">${escapeHTML(os.status || 'status')}</div>
                  <div>Imagens: ${stats.imagens} • Vídeos: ${stats.videos}</div>
                  <div>Tamanho: ${escapeHTML(formatBytes(stats.bytes))}</div>
                </div>
              </div>
              <div class="card-actions">
                <button class="btn" type="button" onclick="window.open('ordem-servico.html','_blank')">↗️ OS</button>
                <button class="btn btn-primary" type="button" onclick="setNav('categorias', {osId: '${escapeHTML(String(os.id))}', categoria:''})">
                  🗂️ Categorias
                </button>
              </div>
            </div>
          `;
        })
        .filter(Boolean);

      if (!cards.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        empty.innerHTML = `
          <div class="empty-state-icon">📋</div>
          <h3>Nenhuma OS válida</h3>
          <p>Para aparecer aqui, a OS deve ter <strong>Marca/Modelo</strong> preenchido e estar vinculada ao cliente.</p>
        `;
        return;
      }

      empty.style.display = 'none';
      empty.innerHTML = `
        <div class="empty-state-icon">📭</div>
        <h3>Nenhum item para mostrar</h3>
        <p>Cadastre clientes/OS e envie arquivos vinculados à OS.</p>
      `;
      grid.innerHTML = cards.join('');
    }

    function renderCategoriasLevel() {
      const grid = document.getElementById('browserGrid');
      const empty = document.getElementById('emptyState');
      if (!grid || !empty) return;

      const osId = NAV.osId;
      if (!osId) {
        setNav('os', { osId:'', categoria:'' });
        return;
      }

      const os = cacheOS.find(x => String(x.id) === String(osId)) || getOSById(osId);
      if (!os) {
        setNav('os', { osId:'', categoria:'' });
        return;
      }

      const categories = ['antes','depois','diagnostico','documento','outros'];
      const filesAll = getFilesForOS(osId);

      const cards = categories.map(cat => {
        const files = filesAll.filter(f => f.categoria === cat);
        const stats = summarizeFiles(files);

        return `
          <div class="card">
            <div class="thumb">
              <span class="thumb-badge">${stats.total} arquivo(s)</span>
              <div style="font-size:2.25rem;">🗂️</div>
            </div>
            <div class="card-body">
              <div class="card-title">${escapeHTML(categoriaLabel(cat))}</div>
              <div class="card-meta">
                <div>Imagens: ${stats.imagens} • Vídeos: ${stats.videos}</div>
                <div>Tamanho: ${escapeHTML(formatBytes(stats.bytes))}</div>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn btn-primary" type="button" onclick="setNav('arquivos', {categoria: '${cat}'})">
                📂 Abrir
              </button>
            </div>
          </div>
        `;
      });

      empty.style.display = 'none';
      grid.innerHTML = cards.join('');
    }

    function renderArquivosLevel() {
      const grid = document.getElementById('browserGrid');
      const empty = document.getElementById('emptyState');
      if (!grid || !empty) return;

      const osId = NAV.osId;
      const categoria = NAV.categoria;

      if (!osId || !categoria) {
        setNav('categorias', { categoria:'' });
        return;
      }

      const term = getSearchTerm();
      const files = getFilesForOS(osId).filter(f => f.categoria === categoria);

      const filtered = files.filter(r => {
        if (!term) return true;
        const hay = `${r.fileName} ${r.clienteNome} ${r.osNumero} ${r.equipamento} ${r.categoria} ${r.observacao}`.toLowerCase();
        return hay.includes(term);
      });

      if (!filtered.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        empty.innerHTML = `
          <div class="empty-state-icon">📭</div>
          <h3>Nenhum arquivo nesta categoria</h3>
          <p>Envie arquivos pelo formulário acima, selecionando esta OS e esta categoria.</p>
        `;
        return;
      }

      empty.style.display = 'none';
      empty.innerHTML = `
        <div class="empty-state-icon">📭</div>
        <h3>Nenhum item para mostrar</h3>
        <p>Cadastre clientes/OS e envie arquivos vinculados à OS.</p>
      `;

      grid.innerHTML = filtered
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(r => {
          const isImage = (r.mimeType || '').startsWith('image/');
          const isVideo = (r.mimeType || '').startsWith('video/');

          const url = URL.createObjectURL(r.blob);
          const thumb = isImage
            ? `<img src="${url}" alt="${escapeHTML(r.fileName)}" onload="URL.revokeObjectURL(this.src)">`
            : isVideo
              ? `<video src="${url}" muted playsinline preload="metadata" onloadeddata="URL.revokeObjectURL(this.src)"></video>`
              : `<div style="font-size:2rem;">📄</div>`;

          const date = new Date(r.createdAt).toLocaleString('pt-BR');

          return `
            <div class="card">
              <div class="thumb">
                <span class="thumb-badge">${escapeHTML(categoriaLabel(r.categoria))}</span>
                ${thumb}
              </div>
              <div class="card-body">
                <div class="card-title">${escapeHTML(r.fileName)}</div>
                <div class="card-meta">
                  <div><strong>OS:</strong> ${escapeHTML(r.osNumero || '')}</div>
                  <div><strong>Equipamento:</strong> ${escapeHTML(r.equipamento || '')}</div>
                  <div><strong>Tamanho:</strong> ${escapeHTML(formatBytes(r.size || 0))}</div>
                  <div><strong>Data:</strong> ${escapeHTML(date)}</div>
                  ${r.observacao ? `<div><strong>Obs:</strong> ${escapeHTML(r.observacao)}</div>` : ''}
                </div>
              </div>
              <div class="card-actions">
                <button class="btn btn-icon btn-view" title="Ver" onclick="abrirDetalhesArquivo('${escapeHTML(String(r.id))}')">👁️</button>
                <button class="btn btn-icon btn-download" title="Baixar" onclick="baixarArquivo('${escapeHTML(String(r.id))}')">⬇️</button>
                <button class="btn btn-icon btn-delete" title="Excluir" onclick="confirmarExclusaoItem('${escapeHTML(String(r.id))}')">🗑️</button>
              </div>
            </div>
          `;
        }).join('');
    }

    function renderBrowser() {
      buildPathbar();

      switch (NAV.level) {
        case 'clientes':
          renderClientesLevel();
          break;
        case 'os':
          renderOSLevel();
          break;
        case 'categorias':
          renderCategoriasLevel();
          break;
        case 'arquivos':
          renderArquivosLevel();
          break;
        default:
          setNav('clientes', { clienteId:'', osId:'', categoria:'' });
      }
    }

    // ============================
    // Stats
    // ============================
    function renderStatsGlobal(records) {
      const total = records.length;
      const imagens = records.filter(r => (r.mimeType || '').startsWith('image/')).length;
      const videos = records.filter(r => (r.mimeType || '').startsWith('video/')).length;
      const totalBytes = records.reduce((acc, r) => acc + (r.size || 0), 0);

      document.getElementById('statTotal').textContent = String(total);
      document.getElementById('statImagens').textContent = String(imagens);
      document.getElementById('statVideos').textContent = String(videos);
      document.getElementById('statSize').textContent = formatBytes(totalBytes);
    }

    // ============================
    // Modal Preview / Download / Delete
    // ============================
    function abrirModalDetalhes() {
      const modal = document.getElementById('modalDetalhes');
      if (modal) modal.style.display = 'flex';
    }
    function fecharModalDetalhes() {
      const modal = document.getElementById('modalDetalhes');
      const corpo = document.getElementById('modalCorpo');
      if (modal) modal.style.display = 'none';
      if (corpo) corpo.innerHTML = '';
    }

    async function abrirDetalhesArquivo(id) {
      const r = await dbGet(id);
      if (!r) return;

      const titulo = document.getElementById('modalTitulo');
      const corpo = document.getElementById('modalCorpo');
      if (!titulo || !corpo) return;

      const isImage = (r.mimeType || '').startsWith('image/');
      const isVideo = (r.mimeType || '').startsWith('video/');
      const url = URL.createObjectURL(r.blob);

      const media = isImage
        ? `<img src="${url}" style="width:100%; max-height:420px; object-fit:contain; background:#000;" onload="URL.revokeObjectURL(this.src)">`
        : isVideo
          ? `<video src="${url}" controls style="width:100%; max-height:420px; object-fit:contain; background:#000;"></video>`
          : `<div style="padding:2rem; text-align:center;">Arquivo sem preview</div>`;

      titulo.textContent = `Preview: ${r.fileName}`;

      corpo.innerHTML = `
        <div style="border:1px solid #e5e7eb; border-radius:1rem; overflow:hidden; margin-bottom:1rem;">
          ${media}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0.75rem;">
            <div style="font-size:0.75rem; color:#6b7280; font-weight:900; text-transform:uppercase;">Cliente</div>
            <div style="font-weight:900; color:#111827;">${escapeHTML(r.clienteNome)}</div>
          </div>
          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0.75rem;">
            <div style="font-size:0.75rem; color:#6b7280; font-weight:900; text-transform:uppercase;">OS</div>
            <div style="font-weight:900; color:#111827;">${escapeHTML(r.osNumero)}</div>
          </div>
          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0.75rem;">
            <div style="font-size:0.75rem; color:#6b7280; font-weight:900; text-transform:uppercase;">Categoria</div>
            <div style="font-weight:900; color:#111827;">${escapeHTML(categoriaLabel(r.categoria))}</div>
          </div>
          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0.75rem;">
            <div style="font-size:0.75rem; color:#6b7280; font-weight:900; text-transform:uppercase;">Tamanho</div>
            <div style="font-weight:900; color:#111827;">${escapeHTML(formatBytes(r.size || 0))}</div>
          </div>
          <div style="grid-column:1/-1; background:#f9fafb; border:1px solid #e5e7eb; border-radius:0.75rem; padding:0.75rem;">
            <div style="font-size:0.75rem; color:#6b7280; font-weight:900; text-transform:uppercase;">Observação</div>
            <div style="font-weight:700; color:#374151;">${escapeHTML(r.observacao || '-')}</div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
          <button class="btn btn-success" onclick="baixarArquivo('${escapeHTML(String(r.id))}')">⬇️ Baixar</button>
        </div>
      `;

      abrirModalDetalhes();
    }

    async function baixarArquivo(id) {
      const r = await dbGet(id);
      if (!r) return;

      const url = URL.createObjectURL(r.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.fileName || 'arquivo';
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 600);
    }

    function abrirModalConfirmacao() {
      const modal = document.getElementById('modalConfirmacao');
      if (modal) modal.style.display = 'flex';
    }
    function fecharModalConfirmacao() {
      const modal = document.getElementById('modalConfirmacao');
      const corpo = document.getElementById('modalConfCorpo');
      const btn = document.getElementById('btnConfirmarExcluir');

      if (modal) modal.style.display = 'none';
      if (corpo) corpo.innerHTML = '';
      if (btn) btn.onclick = null;
    }

    function confirmarExclusaoItem(id) {
      const r = cacheRecords.find(x => String(x.id) === String(id));
      const nome = r ? r.fileName : 'arquivo';

      const corpo = document.getElementById('modalConfCorpo');
      const btn = document.getElementById('btnConfirmarExcluir');

      if (!corpo || !btn) return;

      corpo.innerHTML = `
        <p>Excluir o arquivo <strong>${escapeHTML(nome)}</strong>?</p>
        <p style="margin-top:0.75rem; color:#ef4444; font-size:0.875rem;">
          ⚠️ Esta ação não pode ser desfeita.
        </p>
      `;

      btn.onclick = async () => {
        await dbDelete(id);
        fecharModalConfirmacao();
        mostrarNotificacao('🗑️ Arquivo excluído!', 'warning');
        await refreshAll();
      };

      abrirModalConfirmacao();
    }

    // ============================
    // Refresh
    // ============================
    async function refreshAll() {
      cacheClientes = getClientes();
      cacheOS = getOSList();

      cacheRecords = await dbGetAll();
      cacheRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      fillClienteSelect();
      renderStatsGlobal(cacheRecords);
      renderBrowser();
    }

    // ============================
    // Expor pro HTML
    // ============================
    window.toggleSidebar = toggleSidebar;
    window.salvarAnexos = salvarAnexos;
    window.resetUploadWizard = resetUploadWizard;
    window.refreshAll = refreshAll;
    window.onClienteChange = onClienteChange;
    window.onOSChange = onOSChange;

    window.setNav = setNav;
    window.onCrumbClick = onCrumbClick;

    window.abrirDetalhesArquivo = abrirDetalhesArquivo;
    window.fecharModalDetalhes = fecharModalDetalhes;

    window.baixarArquivo = baixarArquivo;

    window.confirmarExclusaoItem = confirmarExclusaoItem;
    window.fecharModalConfirmacao = fecharModalConfirmacao;

    // ============================
    // Init
    // ============================
    document.addEventListener('DOMContentLoaded', async () => {
      const anoEl = document.getElementById('ano-atual');
      if (anoEl) anoEl.textContent = new Date().getFullYear();

      const isCollapsed = localStorage.getItem(LS.sidebarCollapsed) === 'true';
      const layout = document.getElementById('mainLayout');
      if (layout && isCollapsed) layout.classList.add('collapsed');

      // bind submit
      const form = document.getElementById('arquivoForm');
      if (form && !form.__boundSubmit) {
        form.addEventListener('submit', salvarAnexos);
        form.__boundSubmit = true;
      }

      bindUploadHandlers();
      updateSelectedFilesInfo();

      await dbInit();
      await refreshAll();

      // atalhos
      document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + B
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
          e.preventDefault();
          toggleSidebar();
        }

        // ESC fecha modais
        if (e.key === 'Escape') {
          fecharModalConfirmacao();
          fecharModalDetalhes();
        }

        // Ctrl/Cmd + S salva (se possível)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          const btnSave = document.querySelector('#btnSalvarAnexo');
          if (btnSave) {
            e.preventDefault();
            btnSave.click();
          }
        }
      });

      // atualiza se mudar clientes/OS em outra aba
      window.addEventListener('storage', (e) => {
        if (e.key === LS.clientes || e.key === LS.os || e.key === LS.legacyClientes || e.key === LS.legacyOs) {
          refreshAll();
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