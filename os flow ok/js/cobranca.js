const LS = Object.freeze({
      config: 'osflow:config',
      clientes: 'osflow:clientes',
      produtos: 'osflow:produtos',
      cobrancas: 'osflow:cobrancas',
      vendas: 'osflow:vendas',
      os: 'osflow:os',
      sidebarCollapsed: 'osflow:ui:sidebarCollapsed',

      // undo/ctrl+z
      undoCobrancas: 'osflow:undo:cobrancas'
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

    function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }

    function toast(message, type = 'info', actionLabel = '', actionFn = null) {
      const colors = {
        info: 'var(--primary-500)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)'
      };
      const el = document.createElement('div');
      el.className = 'toast';
      el.style.background = colors[type] || colors.info;

      const left = document.createElement('div');
      left.textContent = message;

      el.appendChild(left);

      if (actionLabel && typeof actionFn === 'function') {
        const btn = document.createElement('button');
        btn.className = 'btn-mini btn-mini-primary';
        btn.type = 'button';
        btn.textContent = actionLabel;
        btn.onclick = () => {
          try { actionFn(); } finally { el.remove(); }
        };
        el.appendChild(btn);
      }

      document.body.appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity .25s ease';
        setTimeout(() => el.remove(), 250);
      }, 3500);
    }

    function toggleSidebar() {
      const layout = document.getElementById('mainLayout');
      if (!layout) return;
      layout.classList.toggle('collapsed');
      localStorage.setItem(LS.sidebarCollapsed, layout.classList.contains('collapsed'));
    }

    function getConfig() {
      const cfg = lsReadJSON(LS.config, {});
      return cfg && typeof cfg === 'object' ? cfg : {};
    }

    function atualizarTopUser() {
      const cfg = getConfig();
      const name = cfg?.usuario?.nome || 'Usuário';
      const initial = (name.trim()[0] || 'U').toUpperCase();
      document.getElementById('topUserName').textContent = name;
      document.getElementById('topUserAvatar').textContent = initial;

      const mp = cfg?.integracoes?.mercadopago || {};
      const wa = cfg?.integracoes?.whatsapp || {};

      document.getElementById('mpHint').textContent =
        mp.accessToken ? 'Token configurado (accessToken)' : 'Token não configurado';

      document.getElementById('waHint').textContent =
        wa.token ? 'Token configurado (WhatsApp)' : 'Token não configurado';
    }

    // -------------------------
    // Undo (Ctrl+Z)
    // -------------------------
    function getUndoStack() {
      const stack = lsReadJSON(LS.undoCobrancas, []);
      return Array.isArray(stack) ? stack : [];
    }
    function pushUndo(entry) {
      const stack = getUndoStack();
      stack.unshift(entry);
      if (stack.length > 20) stack.length = 20;
      lsWriteJSON(LS.undoCobrancas, stack);
    }
    function popUndo() {
      const stack = getUndoStack();
      const entry = stack.shift();
      lsWriteJSON(LS.undoCobrancas, stack);
      return entry || null;
    }

    function desfazerUltimaAcaoCobranca() {
      const entry = popUndo();
      if (!entry) return toast('Nada para desfazer.', 'info');

      if (entry.type === 'remove-cobranca') {
        const list = getCobrancas();
        if (!list.some(c => c && c.id === entry.payload.id)) {
          list.unshift(entry.payload);
          setCobrancas(list);
          toast('Desfeito: cobrança restaurada.', 'success');
          render();
          renderLembretes();
        } else {
          toast('Nada a fazer: cobrança já existe.', 'info');
        }
        return;
      }

      toast('Ação de desfazer desconhecida.', 'warning');
    }

    // -------------------------
    // Helpers: vendas/cobranças
    // -------------------------
    function normalizeStatus(c) {
      if (!c) return 'rascunho';

      // padrão do vendas.html (A):
      // pending | paid | cancelled
      if (c.status === 'paid') return 'paga';
      if (c.status === 'cancelled') return 'cancelada';
      if (c.status === 'pending') {
        const venc = c?.datas?.vencimento || c?.dueDate || '';
        if (venc) {
          const d = new Date(venc + 'T00:00:00');
          const hoje = new Date();
          hoje.setHours(0,0,0,0);
          if (!isNaN(d) && d < hoje) return 'atrasada';
        }
        return 'aberta';
      }

      // legado antigo desta página:
      if (c.status === 'cancelada') return 'cancelada';
      if (c.status === 'paga') return 'paga';
      if (c.status === 'parcial') return 'parcial';
      if (c.status === 'rascunho') return 'rascunho';

      const venc = c?.datas?.vencimento || c?.dueDate || '';
      const total = Number(c.valorTotal || c.valor || 0);

      const pagos = (c.pagamentos || []).reduce((acc,p) => acc + Number(p.valor || 0), 0);
      if (pagos >= total && total > 0) return 'paga';
      if (pagos > 0 && pagos < total) return 'parcial';

      if (venc) {
        const d = new Date(venc + 'T00:00:00');
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        if (!isNaN(d) && d < hoje) return 'atrasada';
      }
      return 'aberta';
    }

    function statusPill(status) {
      const map = {
        aberta: { cls:'info', label:'ABERTA' },
        atrasada: { cls:'danger', label:'ATRASADA' },
        parcial: { cls:'warning', label:'PARCIAL' },
        paga: { cls:'success', label:'PAGA' },
        cancelada: { cls:'danger', label:'CANCELADA' },
        rascunho: { cls:'warning', label:'RASCUNHO' }
      };
      const it = map[status] || map.rascunho;
      return `<span class="pill ${it.cls}">${it.label}</span>`;
    }

    function formatBRL(n) {
      return Number(n || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    }

    function qs() {
      const p = new URLSearchParams(window.location.search);
      return Object.fromEntries(p.entries());
    }

    function getCobrancas() {
      const list = lsReadJSON(LS.cobrancas, []);
      return Array.isArray(list) ? list : [];
    }
    function setCobrancas(list) { lsWriteJSON(LS.cobrancas, list); }

    function getVendas() {
      const list = lsReadJSON(LS.vendas, []);
      return Array.isArray(list) ? list : [];
    }
    function setVendas(list) { lsWriteJSON(LS.vendas, list); }

    function getClientesAtivos() {
      const list = lsReadJSON(LS.clientes, []);
      return (Array.isArray(list) ? list : []).filter(c => c && c.status === 'ativo');
    }

    function refresh() {
      atualizarTopUser();
      render();
      renderLembretes();
    }

    // -------------------------
    // Render
    // -------------------------
    function render() {
      const tbody = document.getElementById('cobrancasTbody');
      const empty = document.getElementById('cobrancasEmpty');

      const statusFilter = document.getElementById('filtroStatus').value || '';
      const busca = (document.getElementById('filtroBusca').value || '').trim().toLowerCase();

      let list = getCobrancas().map(c => {
        const next = deepClone(c);
        next.statusNormalized = normalizeStatus(next);
        return next;
      });

      if (statusFilter) list = list.filter(c => c.statusNormalized === statusFilter);

      if (busca) {
        list = list.filter(c => {
          const s = [
            c?.cliente?.nome,
            c?.clienteNome,
            c?.origem?.tipo,
            c?.origem?.refNumero,
            c?.descricao,
            c?.numeroVenda,
            c?.vendaNumero,
            c?.vendaId
          ].join(' ').toLowerCase();
          return s.includes(busca);
        });
      }

      if (!list.length) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
      }
      empty.style.display = 'none';

      tbody.innerHTML = list.map(c => {
        const status = c.statusNormalized;

        const valor = Number(
          c.valorTotal ??
          c.valor ??
          0
        );

        const origemTipo =
          c?.origem?.tipo ||
          (c?.vendaId ? 'venda' : 'manual');

        const origemRef =
          c?.origem?.refNumero ||
          c?.numeroVenda ||
          c?.vendaNumero ||
          '';

        const venc =
          c?.datas?.vencimento ||
          c?.dueDate ||
          '-';

        const podePagar = status !== 'paga' && status !== 'cancelada';
        const podeCancelar = status !== 'paga';

        const clienteNome =
          c?.cliente?.nome ||
          c?.clienteNome ||
          '-';

        const clienteIdLabel =
          c?.cliente?.clienteId ? `id: ${c.cliente.clienteId}` :
          (c?.clienteId ? `id: ${c.clienteId}` : '');

        return `
          <tr>
            <td>
              <div style="font-weight:900;">${escapeHTML(clienteNome)}</div>
              <div class="hint">${escapeHTML(clienteIdLabel)}</div>
            </td>
            <td>
              <div style="font-weight:800;">${escapeHTML(String(origemTipo).toUpperCase())}</div>
              <div class="hint">${escapeHTML(origemRef)}</div>
            </td>
            <td>${escapeHTML(venc)}</td>
            <td><strong>${formatBRL(valor)}</strong></td>
            <td>${statusPill(status)}</td>
            <td>
              <div class="row-actions">
                <button class="btn-mini btn-mini-primary" type="button" onclick="abrirDetalhe(${c.id})">Detalhes</button>
                <button class="btn-mini btn-mini-primary" type="button" onclick="marcarComoPaga(${c.id})" ${podePagar ? '' : 'disabled'}>✅ Marcar paga</button>
                <button class="btn-mini btn-mini-danger" type="button" onclick="cancelar(${c.id})" ${podeCancelar ? '' : 'disabled'}>Cancelar</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      const q = qs();
      if (q.id) {
        const id = Number(q.id);
        if (!isNaN(id)) {
          const exists = list.find(x => x.id === id);
          if (exists) abrirDetalhe(id);
          history.replaceState({}, document.title, 'cobranca.html');
        }
      }
    }

    function renderLembretes() {
      const box = document.getElementById('lembretesBox');
      const list = getCobrancas().map(c => ({...c, statusNormalized: normalizeStatus(c)}));

      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      const y = hoje.getFullYear();
      const m = String(hoje.getMonth()+1).padStart(2,'0');
      const d = String(hoje.getDate()).padStart(2,'0');
      const hojeStr = `${y}-${m}-${d}`;

      const atrasadas = list.filter(c => c.statusNormalized === 'atrasada').slice(0, 5);
      const venceHoje = list.filter(c => {
        const venc = c?.datas?.vencimento || c?.dueDate || '';
        return (venc === hojeStr) && (c.statusNormalized === 'aberta' || c.statusNormalized === 'parcial');
      }).slice(0, 5);

      if (!atrasadas.length && !venceHoje.length) {
        box.className = 'empty';
        box.innerHTML = 'Nenhum lembrete no momento.';
        return;
      }

      const lines = [];
      if (venceHoje.length) {
        lines.push(`<div style="font-weight:900; margin-bottom: .5rem;">Vence hoje</div>`);
        lines.push(...venceHoje.map(c => `<div class="hint">• ${escapeHTML(c.cliente?.nome || c.clienteNome || '-')} — ${formatBRL(Number(c.valorTotal ?? c.valor ?? 0))}</div>`));
        lines.push('<div class="divider" style="margin: 1rem 0;"></div>');
      }
      if (atrasadas.length) {
        lines.push(`<div style="font-weight:900; margin-bottom: .5rem;">Atrasadas</div>`);
        lines.push(...atrasadas.map(c => {
          const venc = c?.datas?.vencimento || c?.dueDate || '-';
          return `<div class="hint">• ${escapeHTML(c.cliente?.nome || c.clienteNome || '-')} — venc. ${escapeHTML(venc)}</div>`;
        }));
      }

      box.className = '';
      box.style.border = '1px solid var(--border-light)';
      box.style.borderRadius = 'var(--radius-xl)';
      box.style.background = 'var(--bg-surface)';
      box.style.padding = 'var(--space-4)';
      box.innerHTML = lines.join('');
    }

    // -------------------------
    // Modal: nova cobrança
    // -------------------------
    function abrirModalNovaCobranca() {
      document.getElementById('modalNovaCobranca').style.display = 'flex';

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth()+1).padStart(2,'0');
      const dd = String(today.getDate()).padStart(2,'0');
      document.getElementById('mcVencimento').value = `${yyyy}-${mm}-${dd}`;

      carregarClientesNoModal();
      toggleOrigemRef();
    }

    function fecharModalNovaCobranca() {
      const m = document.getElementById('modalNovaCobranca');
      m.style.animation = 'fadeOut .2s ease-out forwards';
      setTimeout(() => { m.style.display = 'none'; m.style.animation = ''; }, 200);
    }

    function toggleOrigemRef() {}

    function carregarClientesNoModal() {
      const select = document.getElementById('mcClienteSelect');
      const clientes = getClientesAtivos().sort((a,b) => (a.nome||'').localeCompare(b.nome||''));

      const options = [
        `<option value="">Selecionar cliente...</option>`,
        ...clientes.map(c => `<option value="${c.id}">${escapeHTML(c.nome || '-')}</option>`)
      ];
      select.innerHTML = options.join('');

      document.getElementById('mcClienteId').value = '';
      document.getElementById('mcClienteNome').value = '';

      select.onchange = () => {
        const id = select.value;
        const cliente = clientes.find(c => String(c.id) === String(id));
        document.getElementById('mcClienteId').value = cliente ? String(cliente.id) : '';
        document.getElementById('mcClienteNome').value = cliente ? (cliente.nome || '') : '';
      };
    }

    function criarCobrancaManual() {
      const origemTipo = document.getElementById('mcOrigemTipo').value || 'manual';

      const clienteId = (document.getElementById('mcClienteId').value || '').trim();
      const clienteNome = (document.getElementById('mcClienteNome').value || '').trim();

      const valorTotal = Number(document.getElementById('mcValor').value || 0);
      const vencimento = document.getElementById('mcVencimento').value || '';
      const parcelas = Math.max(1, Math.min(36, parseInt(document.getElementById('mcParcelas').value || '1', 10)));
      const descricao = (document.getElementById('mcDescricao').value || '').trim();

      if (!clienteId) return toast('Selecione um cliente cadastrado.', 'warning');
      if (!clienteNome) return toast('Cliente inválido.', 'warning');
      if (!vencimento) return toast('Informe o vencimento.', 'warning');
      if (!isFinite(valorTotal) || valorTotal <= 0) return toast('Informe um valor válido.', 'warning');

      const clientesAtivos = getClientesAtivos();
      const exists = clientesAtivos.find(c => String(c.id) === String(clienteId));
      if (!exists) return toast('Cliente não encontrado/ativo. Atualize a lista.', 'warning');

      const now = Date.now();
      const valorParcela = valorTotal / parcelas;

      const parcelasDetalhe = Array.from({ length: parcelas }).map((_, idx) => {
        const n = idx + 1;
        const d = new Date(vencimento + 'T00:00:00');
        d.setMonth(d.getMonth() + idx);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return {
          numero: n,
          vencimento: `${y}-${m}-${day}`,
          valor: Number(valorParcela.toFixed(2)),
          status: 'aberta',
          pagamentos: []
        };
      });

      const cobranca = {
        id: now,
        vendaId: '',
        numeroVenda: '',
        status: 'pending',
        paidAt: '',
        origem: { tipo: origemTipo, refId: '', refNumero: '' },
        cliente: { clienteId: String(clienteId), nome: clienteNome },
        descricao: descricao || 'Cobrança manual',
        valorTotal: Number(valorTotal.toFixed(2)),
        datas: { emissao: new Date().toISOString(), vencimento },
        parcelamento: { modo: parcelas > 1 ? 'parcelado' : 'avista', parcelas },
        parcelasDetalhe,
        pagamentos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        integracoes: {
          mercadopago: { preferenceId:'', paymentId:'', status:'', statusDetail:'', qrCode:'', ticketUrl:'' },
          whatsapp: { messageId:'', status:'', sentAt:'', deliveredAt:'' }
        }
      };

      const list = getCobrancas();
      list.unshift(cobranca);
      setCobrancas(list);

      fecharModalNovaCobranca();
      toast('Cobrança criada!', 'success');
      render();
      renderLembretes();
    }

    // -------------------------
    // Detalhes
    // -------------------------
    function abrirDetalhe(id) {
      const c = getCobrancas().find(x => x.id === id);
      if (!c) return;

      const status = normalizeStatus(c);
      const valor = Number(c.valorTotal ?? c.valor ?? 0);

      document.getElementById('detalheTitulo').textContent =
        `Cobrança • ${c?.cliente?.nome || c?.clienteNome || '-'} • ${formatBRL(valor)}`;

      const pagos = (c.pagamentos || []).reduce((acc,p) => acc + Number(p.valor || 0), 0);
      const aberto = Math.max(0, valor - pagos);

      const parcelas = (c.parcelasDetalhe || []).map(p => `
        <tr>
          <td>${p.numero}</td>
          <td>${escapeHTML(p.vencimento || '-')}</td>
          <td>${formatBRL(p.valor)}</td>
          <td>${statusPill(p.status === 'paga' ? 'paga' : 'aberta')}</td>
        </tr>
      `).join('');

      const vendaRef = c?.vendaId ? `<div class="hint">Venda vinculada: <strong>${escapeHTML(String(c.vendaId))}</strong></div>` : '';

      const origemTipo = c?.origem?.tipo || (c?.vendaId ? 'venda' : 'manual');
      const origemRef = c?.origem?.refNumero || c?.numeroVenda || c?.vendaNumero || '';

      const venc = c?.datas?.vencimento || c?.dueDate || '';

      const html = `
        <div class="panel" style="box-shadow:none; margin-bottom:0;">
          <div class="form-row">
            <div class="field">
              <label>Origem</label>
              <input value="${escapeHTML((origemTipo + ' ' + origemRef).trim())}" readonly />
              ${vendaRef}
            </div>
            <div class="field">
              <label>Status</label>
              <input value="${escapeHTML(status)}" readonly />
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Vencimento</label>
              <input value="${escapeHTML(venc)}" readonly />
            </div>
            <div class="field">
              <label>Descrição</label>
              <input value="${escapeHTML(c?.descricao || '')}" readonly />
            </div>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Pago (manual / histórico)</label>
              <input value="${formatBRL(pagos)}" readonly />
              <div class="hint">Você disse que o faturamento é manual. Então este campo é só informativo.</div>
            </div>
            <div class="field">
              <label>Em aberto</label>
              <input value="${formatBRL(aberto)}" readonly />
            </div>
          </div>

          <div class="divider"></div>

          <div class="panel-title" style="margin-top:0;">
            <span>Parcelas</span>
            <small>${(c?.parcelamento?.parcelas || 1)}x</small>
          </div>

          <div style="overflow:auto;">
            <table class="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${parcelas || `<tr><td colspan="4" class="hint">Sem parcelas detalhadas.</td></tr>`}
              </tbody>
            </table>
          </div>

          <div class="divider"></div>

          <div class="row-actions">
            <button class="btn btn-success" type="button" onclick="marcarComoPaga(${c.id})">✅ Marcar como paga</button>
            <button class="btn btn-danger" type="button" onclick="cancelar(${c.id})">Cancelar</button>
          </div>

          <div class="divider"></div>

          <div class="panel-title" style="margin-top:0;">
            <span>Reservas de Integração</span>
            <small>não funcional</small>
          </div>

          <div class="form-row">
            <div class="field">
              <label>Mercado Pago</label>
              <textarea readonly>${escapeHTML(JSON.stringify(c.integracoes?.mercadopago || {}, null, 2))}</textarea>
            </div>
            <div class="field">
              <label>WhatsApp</label>
              <textarea readonly>${escapeHTML(JSON.stringify(c.integracoes?.whatsapp || {}, null, 2))}</textarea>
            </div>
          </div>

          <div class="row-actions">
            <button class="btn btn-primary" type="button" onclick="abrirEnviarWhatsApp(${c.id})">📲 Reservar envio (WhatsApp)</button>
            <button class="btn btn-primary" type="button" onclick="abrirGerarMercadoPago(${c.id})">💳 Reservar MP</button>
          </div>
        </div>
      `;

      document.getElementById('detalheCorpo').innerHTML = html;
      document.getElementById('modalDetalhe').style.display = 'flex';
    }

    function fecharModalDetalhe() {
      const m = document.getElementById('modalDetalhe');
      m.style.animation = 'fadeOut .2s ease-out forwards';
      setTimeout(() => { m.style.display = 'none'; m.style.animation = ''; }, 200);
    }

    // -------------------------
    // Ação principal: pagar
    // -------------------------
    function marcarComoPaga(id) {
      const list = getCobrancas();
      const idx = list.findIndex(x => x.id === id);
      if (idx < 0) return;

      const c = list[idx];
      const status = normalizeStatus(c);
      if (status === 'cancelada') return toast('Cobrança cancelada. Não é possível marcar como paga.', 'warning');
      if (status === 'paga') return toast('Cobrança já está paga.', 'info');

      if (!confirm('Confirmar: marcar cobrança como paga?')) return;

      const nowIso = new Date().toISOString();

      // Padrão compatível com vendas.html (A)
      c.status = 'paid';
      c.paidAt = nowIso;

      if (Array.isArray(c.parcelasDetalhe)) {
        c.parcelasDetalhe = c.parcelasDetalhe.map(p => ({ ...p, status: 'paga' }));
      }

      // registra pagamento "manual"
      c.pagamentos = Array.isArray(c.pagamentos) ? c.pagamentos : [];
      if (!c.pagamentos.some(p => p && p.meta === 'auto-paid')) {
        const valor = Number(c.valorTotal ?? c.valor ?? 0);
        c.pagamentos.push({
          id: Date.now(),
          data: nowIso,
          valor: Number(valor.toFixed(2)),
          formaPagamento: 'auto',
          obs: 'Marcada como paga (manual/operador)',
          meta: 'auto-paid'
        });
      }

      c.updatedAt = nowIso;
      list[idx] = c;
      setCobrancas(list);

      // Integração com vendas (A):
      // se a cobrança veio de uma venda pendente, concluir e dar baixa no estoque aqui
      const vendaId = c.vendaId || c.vendaId === 0 ? c.vendaId : (c.vendaId || null);
      if (vendaId) finalizarVendaPorCobranca(vendaId);

      toast('Cobrança marcada como paga!', 'success');
      render();
      renderLembretes();
    }

    function finalizarVendaPorCobranca(vendaId) {
      const vendas = getVendas();
      const vIdx = vendas.findIndex(v => String(v.id) === String(vendaId));
      if (vIdx < 0) {
        toast('Aviso: venda vinculada não encontrada para atualizar.', 'warning');
        return;
      }

      const venda = vendas[vIdx];
      venda.status = 'completed';
      venda.updatedAt = new Date().toISOString();

      // garante baixa somente uma vez
      if (!venda.stockDeductedAt) {
        const produtos = lsReadJSON(LS.produtos, []) || [];

        // valida estoque antes
        for (const item of (venda.itens || [])) {
          const p = produtos.find(pp => pp && pp.id === item.id);
          const estoqueAtual = Number(p?.estoque_atual || 0);
          if (!p) {
            toast(`Produto não encontrado no cadastro: ${item.nome}`, 'warning');
            return;
          }
          if (estoqueAtual < Number(item.quantidade || 0)) {
            toast(`Estoque insuficiente para: ${item.nome}`, 'danger');
            return;
          }
        }

        // baixa estoque
        for (const item of (venda.itens || [])) {
          const pIdx = produtos.findIndex(pp => pp && pp.id === item.id);
          const p = produtos[pIdx];

          const novoEstoque = Math.max(0, Number(p.estoque_atual || 0) - Number(item.quantidade || 0));
          p.estoque_atual = novoEstoque;

          if (p.status !== 'inativo') {
            if (novoEstoque === 0) p.status = 'esgotado';
            else p.status = 'ativo';
          }

          produtos[pIdx] = p;
        }

        lsWriteJSON(LS.produtos, produtos);
        venda.stockDeductedAt = new Date().toISOString();
      }

      vendas[vIdx] = venda;
      setVendas(vendas);
    }

    // -------------------------
    // Cancelar (CTRL+Z real)
    // - remove do storage e oferece desfazer
    // -------------------------
    function cancelar(id) {
      const list = getCobrancas();
      const idx = list.findIndex(x => x.id === id);
      if (idx < 0) return;

      const c = list[idx];
      const status = normalizeStatus(c);
      if (status === 'paga') return toast('Cobrança paga não pode ser cancelada aqui.', 'warning');

      if (!confirm('Cancelar esta cobrança? Ela será removida da lista e você poderá desfazer (Ctrl+Z).')) return;

      pushUndo({ type: 'remove-cobranca', payload: deepClone(c), at: new Date().toISOString() });

      const next = list.filter(x => x.id !== id);
      setCobrancas(next);

      fecharModalDetalhe();

      toast('Cobrança removida. Você pode desfazer (Ctrl+Z).', 'warning', 'Desfazer', () => {
        desfazerUltimaAcaoCobranca();
      });

      render();
      renderLembretes();
    }

    function abrirEnviarWhatsApp(id) { toast('Reserva: aqui você vai chamar a API do WhatsApp para enviar a cobrança.', 'info'); }
    function abrirGerarMercadoPago(id) { toast('Reserva: aqui você vai chamar o Mercado Pago para gerar o link/PIX e salvar ids/status.', 'info'); }

    function escapeHTML(s) {
      return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('ano-atual').textContent = new Date().getFullYear();

      const isCollapsed = localStorage.getItem(LS.sidebarCollapsed) === 'true';
      const layout = document.getElementById('mainLayout');
      if (layout && isCollapsed) layout.classList.add('collapsed');

      atualizarTopUser();

      render();
      renderLembretes();

      window.addEventListener('storage', (e) => {
        if (e.key === LS.cobrancas || e.key === LS.config || e.key === LS.vendas || e.key === LS.undoCobrancas) refresh();
        if (e.key === LS.sidebarCollapsed) {
          const isCollapsed2 = localStorage.getItem(LS.sidebarCollapsed) === 'true';
          const layout2 = document.getElementById('mainLayout');
          if (!layout2) return;
          if (isCollapsed2) layout2.classList.add('collapsed');
          else layout2.classList.remove('collapsed');
        }
      });

      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar(); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          desfazerUltimaAcaoCobranca();
        }
        if (e.key === 'Escape') { fecharModalNovaCobranca(); fecharModalDetalhe(); }
      });
    });

    window.toggleSidebar = toggleSidebar;
    window.refresh = refresh;
    window.render = render;

    window.abrirModalNovaCobranca = abrirModalNovaCobranca;
    window.fecharModalNovaCobranca = fecharModalNovaCobranca;
    window.criarCobrancaManual = criarCobrancaManual;

    window.abrirDetalhe = abrirDetalhe;
    window.fecharModalDetalhe = fecharModalDetalhe;

    window.marcarComoPaga = marcarComoPaga;
    window.cancelar = cancelar;
    window.desfazerUltimaAcaoCobranca = desfazerUltimaAcaoCobranca;

    window.abrirEnviarWhatsApp = abrirEnviarWhatsApp;
    window.abrirGerarMercadoPago = abrirGerarMercadoPago;