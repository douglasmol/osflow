// ============================
  // LocalStorage padronizado + migração (padrão OS Flow)
  // ============================
  const LS = Object.freeze({
    clientes: 'osflow:clientes',
    produtos: 'osflow:produtos',
    servicos: 'osflow:servicos',
    os: 'osflow:os',
    config: 'osflow:config',
    sidebarCollapsed: 'osflow:ui:sidebarCollapsed',

    // legado (migração)
    legacyClientes: 'clientesOSFlow',
    legacyProdutos: 'produtosOSFlow',
    legacyServicos: 'servicosOSFlow',
    legacyOs: 'osflow_os',
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

  function migrateLocalStorageKeys() {
    if (!localStorage.getItem(LS.clientes) && localStorage.getItem(LS.legacyClientes)) {
      localStorage.setItem(LS.clientes, localStorage.getItem(LS.legacyClientes));
    }
    if (!localStorage.getItem(LS.produtos) && localStorage.getItem(LS.legacyProdutos)) {
      localStorage.setItem(LS.produtos, localStorage.getItem(LS.legacyProdutos));
    }
    if (!localStorage.getItem(LS.servicos) && localStorage.getItem(LS.legacyServicos)) {
      localStorage.setItem(LS.servicos, localStorage.getItem(LS.legacyServicos));
    }
    if (!localStorage.getItem(LS.os) && localStorage.getItem(LS.legacyOs)) {
      localStorage.setItem(LS.os, localStorage.getItem(LS.legacyOs));
    }
    if (!localStorage.getItem(LS.config) && localStorage.getItem(LS.legacyConfig)) {
      localStorage.setItem(LS.config, localStorage.getItem(LS.legacyConfig));
    }
    if (!localStorage.getItem(LS.sidebarCollapsed) && localStorage.getItem(LS.legacySidebarCollapsed)) {
      localStorage.setItem(LS.sidebarCollapsed, localStorage.getItem(LS.legacySidebarCollapsed));
    }
  }

  migrateLocalStorageKeys();

  // ============================
  // Helpers
  // ============================
  function getConfig() {
    return lsReadJSON(LS.config, { usuario: { nome: 'Usuário' } }) || { usuario: { nome: 'Usuário' } };
  }

  function updateTopUserFromConfig() {
    const cfg = getConfig();
    const name = (cfg?.usuario?.nome || 'Usuário').trim() || 'Usuário';
    const initial = (name[0] || 'U').toUpperCase();

    const elName = document.getElementById('topUserName');
    const elAvatar = document.getElementById('topUserAvatar');
    if (elName) elName.textContent = name;
    if (elAvatar) elAvatar.textContent = initial;
  }

  // ============================
  // Dados de OS (agora real via LS.os; fallback para mock)
  // ============================
  const ordersMock = [
    { id: 101, customerName: 'João Silva',  deviceType: 'iPhone 14 Pro', status: 'Recebido', createdAt: '2024-01-02T09:15:00Z' },
    { id: 102, customerName: 'Maria Souza', deviceType: 'MacBook Pro M2', status: 'Em reparo', createdAt: '2024-01-08T14:20:00Z' },
    { id: 103, customerName: 'Carlos Lima', deviceType: 'Samsung OLED 65"', status: 'Aguardando aprovação', createdAt: '2024-01-14T11:05:00Z' },
    { id: 104, customerName: 'Ana Paula',   deviceType: 'iPad Pro 12.9"', status: 'Pronto', createdAt: '2024-01-20T10:00:00Z' },
    { id: 105, customerName: 'Pedro Rocha', deviceType: 'Dell XPS 15', status: 'Entregue', createdAt: '2024-01-25T08:40:00Z' },
    { id: 106, customerName: 'Lucas Melo',  deviceType: 'Galaxy S23 Ultra', status: 'Em reparo', createdAt: '2024-01-27T11:30:00Z' },
    { id: 107, customerName: 'Fernanda Costa', deviceType: 'PlayStation 5', status: 'Recebido', createdAt: '2024-01-28T14:15:00Z' },
    { id: 108, customerName: 'Roberto Alves', deviceType: 'Notebook Lenovo', status: 'Pronto', createdAt: '2024-01-29T10:30:00Z' }
  ];

  function getBadgeClass(status) {
    switch (status) {
      case 'Em reparo':            return 'badge badge-status-andamento';
      case 'Aguardando aprovação': return 'badge badge-status-aprovacao';
      case 'Pronto':               return 'badge badge-status-pronto';
      case 'Entregue':             return 'badge badge-status-entregue';
      case 'Recebido':
      default:                     return 'badge badge-status-recebido';
    }
  }

  function formatData(iso) { return new Date(iso).toLocaleDateString('pt-BR'); }
  function formatHora(iso) { return new Date(iso).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}); }

  function mapOsToDashboardOrders(osList) {
    // converte o schema da ordem-servico.html para o schema do dashboard
    return (osList || []).map(o => {
      const statusMap = {
        recebido: 'Recebido',
        diagnostico: 'Em reparo',
        reparo: 'Em reparo',
        aguardando_buscar: 'Aguardando aprovação',
        pronto: 'Pronto',
        finalizada: 'Entregue'
      };
      const device = (o?.detalhes?.equipamento?.marcaModelo || '').trim() || (o?.detalhes?.equipamento?.tipo || '').trim() || 'Equipamento';
      return {
        id: o.numero || o.id || '',
        customerName: o?.cliente?.nome || 'Cliente',
        deviceType: device,
        status: statusMap[o.status] || 'Recebido',
        createdAt: o.createdAt || new Date().toISOString()
      };
    });
  }

  function getOrdersForDashboard() {
    const osList = lsReadJSON(LS.os, null);
    if (Array.isArray(osList) && osList.length > 0) return mapOsToDashboardOrders(osList);
    return ordersMock;
  }

  function renderUltimasOrdens(orders) {
    const container = document.getElementById('ultimas-ordens-list');
    container.innerHTML = '';

    [...orders]
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0,6)
      .forEach(order => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        orderItem.innerHTML = `
          <div class="order-item-header">
            <div>
              <div class="order-number">#${order.id}</div>
              <div class="order-customer">${order.customerName}</div>
            </div>
            <span class="${getBadgeClass(order.status)}">${order.status}</span>
          </div>
          <div class="order-details">
            <div class="order-equipment">${order.deviceType}</div>
            <div class="order-date">${formatData(order.createdAt)}</div>
          </div>
        `;
        container.appendChild(orderItem);
      });
  }

  // ============================
  // Métricas reais (clientes + produtos + serviços + OS)
  // ============================
  function renderClientesCount() {
    const clientes = lsReadJSON(LS.clientes, []) || [];
    document.getElementById('stat-clientes').textContent = String(clientes.length);
  }

  function renderProdutosCount() {
    const produtos = lsReadJSON(LS.produtos, []) || [];
    document.getElementById('stat-produtos').textContent = String(produtos.length);
  }

  function renderServicosCount() {
    const servicos = lsReadJSON(LS.servicos, []) || [];
    document.getElementById('stat-servicos').textContent = String(servicos.length);
  }

  function renderOSCount() {
    const os = lsReadJSON(LS.os, []) || [];
    document.getElementById('stat-os').textContent = String(os.length);
  }

  function renderStats(orders) {
    renderClientesCount();
    renderProdutosCount();
    renderServicosCount();
    renderOSCount();

    // Mantém placeholders até integrar financeiro real
    document.getElementById('stat-receita-dia').textContent = 'R$ 2.845';
    document.getElementById('stat-despesa-dia').textContent = 'R$ 890';

    // Total do mês (com base nas ordens exibidas)
    const mesAtual = new Date().getMonth();
    const osMesAtual = orders.filter(o => new Date(o.createdAt).getMonth() === mesAtual);
    document.getElementById('total-os-mes').textContent = osMesAtual.length;
  }

  // ============================
  // RELÓGIO
  // ============================
  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    const ss = String(now.getSeconds()).padStart(2,'0');

    const clockElement = document.getElementById('clock-time');
    clockElement.textContent = `${hh}:${mm}`;

    if (ss === '00') {
      clockElement.classList.add('pulse');
      setTimeout(() => clockElement.classList.remove('pulse'), 500);
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ============================
  // CALENDÁRIO
  // ============================
  let currentCalendarYear;
  let currentCalendarMonth;

  function initCalendar() {
    const now = new Date();
    currentCalendarYear  = now.getFullYear();
    currentCalendarMonth = now.getMonth();
    renderCalendar();

    setTimeout(() => { initCharts(); }, 120);
  }

  function changeMonth(delta) {
    currentCalendarMonth += delta;
    if (currentCalendarMonth < 0) { currentCalendarMonth = 11; currentCalendarYear--; }
    else if (currentCalendarMonth > 11) { currentCalendarMonth = 0; currentCalendarYear++; }
    renderCalendar();
  }

  function goToToday() {
    const now = new Date();
    currentCalendarYear  = now.getFullYear();
    currentCalendarMonth = now.getMonth();
    renderCalendar();
  }

  function renderCalendar() {
    const tbody = document.getElementById('calendar-body');
    tbody.innerHTML = '';

    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    document.getElementById('month-label').textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;

    const firstOfMonth = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const firstWeekDay = firstOfMonth.getDay();
    const startDate = new Date(currentCalendarYear, currentCalendarMonth, 1 - firstWeekDay);
    const todayStr = new Date().toISOString().slice(0,10);

    const orders = getOrdersForDashboard();

    let current = new Date(startDate);
    for (let week = 0; week < 6; week++) {
      const tr = document.createElement('tr');
      for (let dow = 0; dow < 7; dow++) {
        const td = document.createElement('td');
        const isoDate = current.toISOString().slice(0,10);
        const inCurrentMonth = current.getMonth() === currentCalendarMonth;

        if (!inCurrentMonth) td.classList.add('calendar-empty', 'calendar-day-outside');

        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day-number';
        dayDiv.textContent = current.getDate();
        td.appendChild(dayDiv);

        if (isoDate === todayStr) td.classList.add('calendar-day-today');

        const osDoDia = orders.filter(o => String(o.createdAt).slice(0,10) === isoDate);
        if (osDoDia.length > 0) {
          td.classList.add('calendar-day-has-os');
          const badge = document.createElement('div');
          badge.className = 'calendar-os-count';
          badge.textContent = osDoDia.length + ' OS';
          td.appendChild(badge);
        }

        td.addEventListener('click', () => abrirModalOsDia(isoDate, osDoDia));
        tr.appendChild(td);
        current.setDate(current.getDate() + 1);
      }
      tbody.appendChild(tr);
    }
  }

  // ============================
  // MODAL OS DO DIA
  // ============================
  function abrirModalOsDia(dateStr, osDoDia) {
    const modal = document.getElementById('modal-os-dia');
    const titulo = document.getElementById('modal-os-dia-titulo');
    const body = document.getElementById('modal-os-dia-body');

    const dataFormatada = new Date(dateStr).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    titulo.innerHTML = `📅 Ordens de <strong>${dataFormatada}</strong>`;
    body.innerHTML = '';

    if (!osDoDia || osDoDia.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'os-day-item';
      emptyState.innerHTML = `
        <div style="text-align: center; padding: var(--space-8);">
          <div style="font-size: 3rem; margin-bottom: var(--space-4);">📭</div>
          <h4 style="margin-bottom: var(--space-2);">Nenhuma ordem neste dia</h4>
          <p style="color: var(--text-tertiary); margin-bottom: var(--space-4);">
            Não há ordens de serviço agendadas para esta data.
          </p>
          <button class="btn btn-primary" onclick="novaOS()">Criar Nova Ordem</button>
        </div>
      `;
      body.appendChild(emptyState);
    } else {
      osDoDia
        .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
        .forEach(o => {
          const div = document.createElement('div');
          div.className = 'os-day-item';
          div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-2);">
              <div>
                <strong style="color: var(--primary-600);">#${o.id}</strong>
                <span style="color: var(--text-secondary);"> • ${o.customerName}</span>
              </div>
              <span class="${getBadgeClass(o.status)}">${o.status}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>${o.deviceType}</span>
              <span style="color: var(--text-tertiary); font-size: 0.75rem;">
                ⏰ ${formatHora(o.createdAt)}
              </span>
            </div>
          `;
          body.appendChild(div);
        });
    }

    modal.style.display = 'flex';
  }

  function fecharModalOsDia() {
    const modal = document.getElementById('modal-os-dia');
    modal.style.animation = 'fadeOut 0.3s ease-out forwards';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.style.animation = '';
    }, 300);
  }

  function novaOS(e) {
    // comportamento padrão: abre página de OS
    // (mantém animação/feedback e redireciona)
    const btn = (e && (e.target || e.currentTarget)) ? (e.currentTarget || e.target) : null;

    if (btn) {
      const originalText = btn.innerHTML || 'Nova OS';
      btn.innerHTML = '✨ Abrindo...';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        window.location.href = 'ordem-servico.html';
      }, 500);
      return;
    }

    window.location.href = 'ordem-servico.html';
  }

  // ============================
  // SIDEBAR
  // ============================
  function toggleSidebar() {
    const layout = document.getElementById('mainLayout');
    layout.classList.toggle('collapsed');

    const isCollapsed = layout.classList.contains('collapsed');
    localStorage.setItem(LS.sidebarCollapsed, isCollapsed);

    setTimeout(() => { initCharts(); }, 320);
  }

  function restoreSidebarState() {
    const isCollapsed = localStorage.getItem(LS.sidebarCollapsed) === 'true';
    const layout = document.getElementById('mainLayout');
    if (isCollapsed) layout.classList.add('collapsed');
  }

  // ============================
  // GRÁFICOS (placeholders)
  // ============================
  function setupHiDPICanvas(canvas) {
    const ratio = window.devicePixelRatio || 1;
    const clientWidth = Math.max(1, Math.floor(canvas.clientWidth));
    const clientHeight = Math.max(1, Math.floor(canvas.clientHeight));
    canvas.style.width = clientWidth + 'px';
    canvas.style.height = clientHeight + 'px';
    canvas.width = Math.floor(clientWidth * ratio);
    canvas.height = Math.floor(clientHeight * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width: clientWidth, height: clientHeight };
  }

  function renderChartOs7Dias() {
    const canvas = document.getElementById('chart-os-7dias');
    if (!canvas) return;
    const { ctx, width, height } = setupHiDPICanvas(canvas);
    ctx.clearRect(0, 0, width, height);
  }

  function renderChartOsStatus() {
    const canvas = document.getElementById('chart-os-status');
    if (!canvas) return;
    const { ctx, width, height } = setupHiDPICanvas(canvas);
    ctx.clearRect(0, 0, width, height);
  }

  function renderChartEntradaSaida() {
    const canvas = document.getElementById('chart-entrada-saida');
    if (!canvas) return;
    const { ctx, width, height } = setupHiDPICanvas(canvas);
    ctx.clearRect(0, 0, width, height);
  }

  function initCharts() {
    renderChartOs7Dias();
    renderChartOsStatus();
    renderChartEntradaSaida();
  }

  // ============================
  // INICIALIZAÇÃO
  // ============================
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ano-atual').textContent = new Date().getFullYear();

    restoreSidebarState();
    updateTopUserFromConfig();

    const orders = getOrdersForDashboard();
    renderUltimasOrdens(orders);
    renderStats(orders);
    initCalendar();

    // Atualizar métricas ao mudar storage (quando salvar em outra aba)
    window.addEventListener('storage', (e) => {
      if (
        e.key === LS.clientes || e.key === LS.legacyClientes ||
        e.key === LS.produtos || e.key === LS.legacyProdutos ||
        e.key === LS.servicos || e.key === LS.legacyServicos ||
        e.key === LS.os || e.key === LS.legacyOs
      ) {
        const orders2 = getOrdersForDashboard();
        renderUltimasOrdens(orders2);
        renderStats(orders2);
        renderCalendar();
      }

      if (e.key === LS.config || e.key === LS.legacyConfig) {
        updateTopUserFromConfig();
      }

      if (e.key === LS.sidebarCollapsed || e.key === LS.legacySidebarCollapsed) {
        restoreSidebarState();
      }
    });

    // Redimensionar gráficos quando a janela for redimensionada
    window.addEventListener('resize', () => {
      clearTimeout(window.__chartResizeTimer);
      window.__chartResizeTimer = setTimeout(() => { initCharts(); }, 180);
    });

    // Atalho Ctrl+B
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    });

    // Animação de entrada
    window.addEventListener('load', () => {
      document.querySelectorAll('.top-card, .panel, .stat-card, .order-item, .chart-container').forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        setTimeout(() => {
          el.style.transition = 'all 0.4s ease-out';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, i * 100);
      });
    });
  });