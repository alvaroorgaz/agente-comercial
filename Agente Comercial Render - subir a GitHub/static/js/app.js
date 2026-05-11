let historialChat = [];

// Filtros período A (principal) y B (comparativa)
let factA = { year: '', month: '' };
let factB = { year: '', month: '' };
let pipeA = { year: '', month: '' };
let pipeB = { year: '', month: '' };
let factCompareActive = false;
let pipeCompareActive = false;

// Años disponibles en los datos (se rellenan al cargar)
let factAllYears = [];
let factAllMonths = [];
let pipeAllYears = [];
let pipeAllMonths = [];

const MESES = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun',
                '07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };

const fmt  = v => new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(v);
const fmtK = v => Math.abs(v) >= 1000000
  ? (v/1000000).toFixed(2).replace('.',',') + 'M €'
  : Math.abs(v) >= 1000
  ? Math.round(v/1000) + 'k €'
  : fmt(v);

function periodoLabel(f) {
  if (!f.year && !f.month) return 'Total período';
  if (f.year && f.month)   return `${MESES[f.month] || f.month} ${f.year}`;
  if (f.year)              return f.year;
  return `Mes ${f.month}`;
}

// ── Navegación ────────────────────────────────────────────────────────────────
function showSection(nombre) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + nombre).classList.add('active');
  document.getElementById('nav-' + nombre).classList.add('active');
  if (nombre === 'presupuesto')  calcularPresupuesto();
  if (nombre === 'kpis')         cargarKPIs();
  if (nombre === 'facturacion')  cargarFacturacion();
  if (nombre === 'pipeline')     cargarPipeline();
  if (nombre === 'clientes')     cargarClientes();
}

// ── Toggle comparativa ────────────────────────────────────────────────────────
function toggleComparativa(seccion) {
  if (seccion === 'fact') {
    factCompareActive = !factCompareActive;
    document.getElementById('fact-compare-panel').style.display = factCompareActive ? 'block' : 'none';
    const btn = document.getElementById('btn-fact-compare');
    btn.textContent = factCompareActive ? 'Cerrar comparativa' : 'Comparar períodos';
    btn.className   = factCompareActive ? 'btn-primary' : 'btn-secondary';
    if (!factCompareActive) factB = { year: '', month: '' };
    cargarFacturacion();
  } else {
    pipeCompareActive = !pipeCompareActive;
    document.getElementById('pipe-compare-panel').style.display = pipeCompareActive ? 'block' : 'none';
    const btn = document.getElementById('btn-pipe-compare');
    btn.textContent = pipeCompareActive ? 'Cerrar comparativa' : 'Comparar períodos';
    btn.className   = pipeCompareActive ? 'btn-primary' : 'btn-secondary';
    if (!pipeCompareActive) pipeB = { year: '', month: '' };
    cargarPipeline();
  }
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
function renderFilterBar(containerId, allYears, allMonths, filtros, onChange) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const mesesDelAnyo = allMonths
    .filter(m => !filtros.year || m.startsWith(filtros.year))
    .map(m => m.split('-')[1])
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  el.innerHTML = '';

  // Grupo años
  const grpA = document.createElement('div');
  grpA.className = 'filter-group';

  const btnTodos = document.createElement('button');
  btnTodos.className = 'filter-btn' + (!filtros.year && !filtros.month ? ' active' : '');
  btnTodos.textContent = 'Todos';
  btnTodos.onclick = () => onChange({ year: '', month: '' });
  grpA.appendChild(btnTodos);

  allYears.forEach(y => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (filtros.year === y && !filtros.month ? ' active' : '');
    btn.textContent = y;
    btn.onclick = () => onChange({ year: filtros.year === y ? '' : y, month: '' });
    grpA.appendChild(btn);
  });
  el.appendChild(grpA);

  if (mesesDelAnyo.length) {
    const sep = document.createElement('div');
    sep.className = 'filter-sep';
    el.appendChild(sep);

    const grpM = document.createElement('div');
    grpM.className = 'filter-group';
    mesesDelAnyo.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (filtros.month === m ? ' active' : '');
      btn.textContent = MESES[m] || m;
      btn.onclick = () => onChange({ ...filtros, month: filtros.month === m ? '' : m });
      grpM.appendChild(btn);
    });
    el.appendChild(grpM);
  }
}

// ── Tarjeta comparativa ───────────────────────────────────────────────────────
function cmpCard(label, vA, vB, labelA, labelB, invertirDelta) {
  const diff = vA - vB;
  const pct  = vB !== 0 ? ((diff / Math.abs(vB)) * 100).toFixed(1) : null;

  let cls = 'flat';
  if (pct !== null) cls = (invertirDelta ? diff < 0 : diff > 0) ? 'up' : diff < 0 ? 'down' : 'flat';
  const arrow = cls === 'up' ? '▲' : cls === 'down' ? '▼' : '=';
  const sign  = diff > 0 ? '+' : '';

  // Color de cada importe: verde el mayor, rojo el menor
  const clsA = vA > vB ? 'amount-win' : vA < vB ? 'amount-lose' : 'amount-tie';
  const clsB = vB > vA ? 'amount-win' : vB < vA ? 'amount-lose' : 'amount-tie';

  return `
  <div class="cmp-card">
    <div class="cmp-card-label">${label}</div>
    <div class="cmp-row">
      <span class="cmp-period a">${labelA}</span>
      <span class="cmp-amount ${clsA}">${fmtK(vA)}</span>
    </div>
    <div class="cmp-divider"></div>
    <div class="cmp-row">
      <span class="cmp-period b">${labelB}</span>
      <span class="cmp-amount ${clsB}">${fmtK(vB)}</span>
    </div>
    <div class="cmp-delta-row">
      <span class="cmp-delta-label">Diferencia</span>
      <span>
        <span class="cmp-delta-value ${cls}">${sign}${fmtK(diff)}</span>
        ${pct !== null ? `<span class="cmp-delta-pct ${cls}">${arrow} ${sign}${pct}%</span>` : ''}
      </span>
    </div>
  </div>`;
}

// ── Facturación ───────────────────────────────────────────────────────────────
async function fetchFact(filtros) {
  const p = new URLSearchParams();
  if (filtros.year)  p.set('year',  filtros.year);
  if (filtros.month) p.set('month', filtros.month);
  const r = await fetch('/api/facturacion?' + p);
  return r.json();
}

async function cargarFacturacion() {
  const dataA = await fetchFact(factA);
  factAllYears  = dataA.years;
  factAllMonths = dataA.months_available;

  renderFilterBar('fact-filters-a', factAllYears, factAllMonths, factA, f => { factA = f; cargarFacturacion(); });

  let dataB = null;
  if (factCompareActive) {
    renderFilterBar('fact-filters-b', factAllYears, factAllMonths, factB, f => { factB = f; cargarFacturacion(); });
    if (factB.year || factB.month) dataB = await fetchFact(factB);
  }

  renderFacturacion(dataA, dataB);
}

function yearRefBar(yearTotals) {
  const v25 = yearTotals['2025'] || 0;
  const v26 = yearTotals['2026'] || 0;
  if (!v25 || !v26) return '';
  const diff = v26 - v25;
  const pct  = ((diff / v25) * 100).toFixed(1);
  const sign = diff >= 0 ? '+' : '';
  const cls  = diff >= 0 ? 'ref-up' : 'ref-down';
  const arrow= diff >= 0 ? '▲' : '▼';
  return `<div class="year-ref-bar ${cls}">
    <span class="ref-label">Referencia anual</span>
    <span class="ref-block"><span class="ref-year">2025</span><strong>${fmtK(v25)}</strong></span>
    <span class="ref-arrow">→</span>
    <span class="ref-block"><span class="ref-year">2026</span><strong class="ref-val-${cls}">${fmtK(v26)}</strong></span>
    <span class="ref-diff ${cls}">${arrow} ${sign}${fmtK(diff)} (${sign}${pct}%)</span>
    ${diff < 0 ? '<span class="ref-alert">⚠ 2026 por debajo de 2025</span>' : '<span class="ref-ok">✓ 2026 supera 2025</span>'}
  </div>`;
}

function renderFacturacion(dataA, dataB) {
  const rA = dataA.resumen;
  const rB = dataB?.resumen;
  const lA = periodoLabel(factA);
  const lB = periodoLabel(factB);
  const refBar = yearRefBar(dataA.year_totals || {});

  if (dataB && rB) {
    document.getElementById('fact-resumen').innerHTML = refBar + `
      <div class="kpi-summary-row" style="border:none;background:none;gap:1px;display:grid;grid-template-columns:repeat(4,1fr)">
        ${cmpCard('Total facturado', rA.total,     rB.total,     lA, lB, false)}
        ${cmpCard('Cobrado',         rA.cobrado,   rB.cobrado,   lA, lB, false)}
        ${cmpCard('Pendiente',       rA.pendiente, rB.pendiente, lA, lB, true)}
        ${cmpCard('Vencido',         rA.vencido,   rB.vencido,   lA, lB, true)}
      </div>`;
  } else {
    document.getElementById('fact-resumen').innerHTML = refBar + `
      <div class="summary-card">
        <div class="summary-label">Total facturado</div>
        <div class="summary-value">${fmtK(rA.total)}</div>
        <div class="summary-sub">${lA}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Cobrado</div>
        <div class="summary-value">${fmtK(rA.cobrado)}</div>
        <div class="summary-sub">${rA.pct_cobrado}% del total</div>
      </div>
      <div class="summary-card orange">
        <div class="summary-label">Pendiente</div>
        <div class="summary-value">${fmtK(rA.pendiente)}</div>
        <div class="summary-sub">Por cobrar</div>
      </div>
      <div class="summary-card red">
        <div class="summary-label">Vencido</div>
        <div class="summary-value">${fmtK(rA.vencido)}</div>
        <div class="summary-sub">Atención urgente</div>
      </div>`;
  }

  // Gráfico mensual
  const meses = dataA.por_mes;
  const maxMes = Math.max(...Object.values(meses), 1);
  document.getElementById('chart-meses').innerHTML = Object.entries(meses).map(([k, v]) => {
    const pct = Math.max(3, (v / maxMes) * 100);
    const [anyo, mes] = k.split('-');
    const label = (MESES[mes] || mes) + ' ' + anyo.slice(2);
    return `<div class="bar-col">
      <div class="bar-fill" style="height:${pct}%">
        <div class="tooltip">${label}: ${fmt(v)}</div>
      </div>
      <span class="bar-label">${label}</span>
    </div>`;
  }).join('');

  // Sector
  const sectores = dataA.por_sector;
  const totalSec = Object.values(sectores).reduce((a, b) => a + b, 0);
  const secEntries = Object.entries(sectores).filter(([, v]) => v > 0);
  const secColors = ['#000', '#555', '#999', '#bbb', '#ddd'];
  document.getElementById('chart-sector').innerHTML = `
    <div class="donut-bar-row">
      ${secEntries.map(([k, v], i) => {
        const p = (v / totalSec * 100).toFixed(1);
        return `<div class="donut-seg" style="flex:${p};background:${secColors[i]}" title="${k}: ${fmt(v)}">
          ${p > 8 ? `<span>${p}%</span>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="donut-legend">
      ${secEntries.map(([k, v], i) => {
        const p = (v / totalSec * 100).toFixed(1);
        return `<div class="legend-item">
          <div class="legend-dot" style="background:${secColors[i]}"></div>
          <span class="legend-name">${k}</span>
          <span class="legend-val">${fmtK(v)}</span>
          <span class="legend-pct">${p}%</span>
        </div>`;
      }).join('')}
    </div>`;

  // Top clientes
  const clientes = dataA.top_clientes;
  const maxC = clientes[0]?.importe || 1;
  document.getElementById('chart-clientes').innerHTML = clientes.map(c => {
    const pct = (c.importe / maxC * 100).toFixed(1);
    return `<div class="hbar-row">
      <div class="hbar-label" title="${c.cliente}">${c.cliente}</div>
      <div class="hbar-track">
        <div class="hbar-fill" style="width:${pct}%">
          <span class="hbar-val">${fmtK(c.importe)}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  // Por tipo
  const tipos = dataA.por_tipo;
  const totalTipo = Object.values(tipos).reduce((a, b) => a + b, 0);
  document.getElementById('chart-tipo').innerHTML = Object.entries(tipos).slice(0, 7).map(([k, v]) => {
    const pct = (v / totalTipo * 100).toFixed(0);
    return `<div class="list-bar-row">
      <div class="list-bar-header">
        <span class="list-bar-name">${k}</span>
        <span class="list-bar-val">${fmtK(v)}</span>
      </div>
      <div class="list-bar-track">
        <div class="list-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
  }).join('');
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
async function fetchPipe(filtros) {
  const p = new URLSearchParams();
  if (filtros.year)  p.set('year',  filtros.year);
  if (filtros.month) p.set('month', filtros.month);
  const r = await fetch('/api/pipeline?' + p);
  return r.json();
}

async function cargarPipeline() {
  const dataA = await fetchPipe(pipeA);
  pipeAllYears  = dataA.years;
  pipeAllMonths = dataA.months_available;

  renderFilterBar('pipe-filters-a', pipeAllYears, pipeAllMonths, pipeA, f => { pipeA = f; cargarPipeline(); });

  let dataB = null;
  if (pipeCompareActive) {
    renderFilterBar('pipe-filters-b', pipeAllYears, pipeAllMonths, pipeB, f => { pipeB = f; cargarPipeline(); });
    if (pipeB.year || pipeB.month) dataB = await fetchPipe(pipeB);
  }

  renderPipeline(dataA, dataB);
}

function renderPipeline(dataA, dataB) {
  const lA = periodoLabel(pipeA);
  const lB = periodoLabel(pipeB);

  if (dataB) {
    document.getElementById('pipe-resumen').innerHTML = `
      <div class="kpi-summary-row" style="border:none;background:none;gap:1px;display:grid;grid-template-columns:repeat(4,1fr)">
        ${cmpCard('Win Rate',       dataA.win_rate_global, dataB.win_rate_global, lA, lB, false)}
        ${cmpCard('Importe ganado', dataA.total_ganado,    dataB.total_ganado,    lA, lB, false)}
        ${cmpCard('Importe perdido',dataA.total_perdido,   dataB.total_perdido,   lA, lB, true)}
        ${cmpCard('En curso',       dataA.en_curso,        dataB.en_curso,        lA, lB, false)}
      </div>`;
  } else {
    document.getElementById('pipe-resumen').innerHTML = `
      <div class="summary-card">
        <div class="summary-label">Win Rate global</div>
        <div class="summary-value">${dataA.win_rate_global}%</div>
        <div class="summary-sub">${lA}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Importe ganado</div>
        <div class="summary-value">${fmtK(dataA.total_ganado)}</div>
        <div class="summary-sub">Pedidos creados</div>
      </div>
      <div class="summary-card red">
        <div class="summary-label">Importe perdido</div>
        <div class="summary-value">${fmtK(dataA.total_perdido)}</div>
        <div class="summary-sub">Rechazados</div>
      </div>
      <div class="summary-card orange">
        <div class="summary-label">En curso</div>
        <div class="summary-value">${fmtK(dataA.en_curso)}</div>
        <div class="summary-sub">Borrador + Evaluación</div>
      </div>`;
  }

  // Tabla comerciales
  document.getElementById('chart-comerciales').innerHTML = `
    <table class="com-table">
      <thead><tr>
        <th>Comercial</th>
        <th>Ganados</th><th>Perdidos</th><th>Pend.</th>
        <th>Win Rate</th><th>Imp. ganado</th>
      </tr></thead>
      <tbody>
        ${dataA.por_comercial.map(c => {
          const cls = c.win_rate >= 65 ? 'wr-high' : c.win_rate >= 50 ? 'wr-mid' : 'wr-low';
          return `<tr>
            <td><strong>${c.nombre}</strong></td>
            <td style="color:#1a7a1a;font-weight:700">${c.ganados}</td>
            <td style="color:#c00000">${c.perdidos}</td>
            <td style="color:#999">${c.pendientes}</td>
            <td><span class="wr-badge ${cls}">${c.win_rate}%</span></td>
            <td style="font-weight:700">${fmtK(c.importe_ganado)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  // Estados
  const estadoMap = {
    'Cerrado - Pedido creado': { label: 'Ganados',       color: '#000' },
    'Cerrado - Rechazado':     { label: 'Rechazados',    color: '#999' },
    'Bajo evaluación':         { label: 'En evaluación', color: '#555' },
    'Borrador':                { label: 'Borrador',      color: '#ccc' }
  };
  const estados = dataA.por_estado;
  const totalCount = Object.values(estados).reduce((a, b) => a + b.count, 0);
  const estEntries = Object.entries(estados).sort((a, b) => b[1].count - a[1].count);

  document.getElementById('chart-estados').innerHTML = `
    <div class="donut-bar-row">
      ${estEntries.map(([k, v]) => {
        const m = estadoMap[k] || { label: k, color: '#eee' };
        const p = (v.count / totalCount * 100).toFixed(1);
        return `<div class="donut-seg" style="flex:${p};background:${m.color}" title="${m.label}: ${v.count}">
          ${p > 8 ? `<span>${p}%</span>` : ''}
        </div>`;
      }).join('')}
    </div>
    <div class="donut-legend">
      ${estEntries.map(([k, v]) => {
        const m = estadoMap[k] || { label: k, color: '#eee' };
        const p = (v.count / totalCount * 100).toFixed(1);
        return `<div class="legend-item">
          <div class="legend-dot" style="background:${m.color};border:1px solid #ccc"></div>
          <span class="legend-name">${m.label}</span>
          <span class="legend-val">${v.count}</span>
          <span class="legend-pct">${p}%</span>
        </div>`;
      }).join('')}
    </div>`;

  // Por campaña
  const camp  = dataA.por_campanya;
  const maxC2 = camp[0]?.importe || 1;
  document.getElementById('chart-campanya').innerHTML = camp.map(c => {
    const pct = (c.importe / maxC2 * 100).toFixed(1);
    return `<div class="hbar-row">
      <div class="hbar-label" title="${c.campanya}">${c.campanya}</div>
      <div class="hbar-track">
        <div class="hbar-fill" style="width:${pct}%">
          <span class="hbar-val">${fmtK(c.importe)}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
async function cargarKPIs() {
  const equipo = document.getElementById('filtro-equipo').value;
  const resp   = await fetch('/api/kpis?equipo=' + encodeURIComponent(equipo));
  const data   = await resp.json();
  renderKPIs(data.kpis);
}

function renderKPIs(kpis) {
  const grid = document.getElementById('kpi-grid');
  if (!kpis.length) {
    grid.innerHTML = '<p style="color:#999;padding:20px;font-size:12px">No hay KPIs en esta categoría.</p>';
    return;
  }
  grid.innerHTML = kpis.map(k => {
    const badgeClass = 'badge-' + k.equipo.toLowerCase();
    return `<div class="kpi-card equipo-${k.equipo}">
      <div class="kpi-card-header">
        <div class="kpi-nombre">${k.nombre}</div>
        <div class="kpi-actions">
          <button class="btn-icon" onclick="abrirModalEditar(${k.id})">✏</button>
          <button class="btn-icon" onclick="confirmarEliminar(${k.id})">✕</button>
        </div>
      </div>
      <span class="badge ${badgeClass}">${k.equipo}</span>
      <div class="kpi-desc">${k.descripcion || ''}</div>
      <div class="kpi-metas">
        <div class="meta-item"><div class="meta-label">Mínimo</div><div class="meta-value min">${formatVal(k.minimo, k.unidad)}</div></div>
        <div class="meta-item"><div class="meta-label">Objetivo</div><div class="meta-value obj">${formatVal(k.objetivo, k.unidad)}</div></div>
        <div class="meta-item"><div class="meta-label">Excelente</div><div class="meta-value exc">${formatVal(k.excelente, k.unidad)}</div></div>
      </div>
      <div class="kpi-footer">
        <span>${k.frecuencia}</span>
        <span class="peso-badge">Peso: ${k.peso}%</span>
      </div>
    </div>`;
  }).join('');
}

function formatVal(val, unidad) {
  if (val === undefined || val === null) return '—';
  if (unidad === '€') return fmt(val);
  if (unidad === '%') return val + '%';
  return val + (unidad ? ' ' + unidad : '');
}

// ── Modal KPI ─────────────────────────────────────────────────────────────────
function abrirModalNuevo() {
  document.getElementById('modal-title').textContent = 'Nuevo KPI';
  document.getElementById('kpi-form').reset();
  document.getElementById('kpi-id').value = '';
  document.getElementById('modal-kpi').style.display = 'flex';
}

async function abrirModalEditar(id) {
  const data = await (await fetch('/api/kpis')).json();
  const kpi  = data.kpis.find(k => k.id === id);
  if (!kpi) return;
  document.getElementById('modal-title').textContent = 'Editar KPI';
  document.getElementById('kpi-id').value        = kpi.id;
  document.getElementById('kpi-nombre').value    = kpi.nombre;
  document.getElementById('kpi-equipo').value    = kpi.equipo;
  document.getElementById('kpi-descripcion').value = kpi.descripcion || '';
  document.getElementById('kpi-formula').value   = kpi.formula || '';
  document.getElementById('kpi-unidad').value    = kpi.unidad || '';
  document.getElementById('kpi-frecuencia').value = kpi.frecuencia || 'Mensual';
  document.getElementById('kpi-peso').value      = kpi.peso || 10;
  document.getElementById('kpi-objetivo').value  = kpi.objetivo ?? '';
  document.getElementById('kpi-minimo').value    = kpi.minimo ?? '';
  document.getElementById('kpi-excelente').value = kpi.excelente ?? '';
  document.getElementById('modal-kpi').style.display = 'flex';
}

function cerrarModal() { document.getElementById('modal-kpi').style.display = 'none'; }

async function guardarKPI(e) {
  e.preventDefault();
  const id = document.getElementById('kpi-id').value;
  const payload = {
    nombre:      document.getElementById('kpi-nombre').value,
    equipo:      document.getElementById('kpi-equipo').value,
    descripcion: document.getElementById('kpi-descripcion').value,
    formula:     document.getElementById('kpi-formula').value,
    unidad:      document.getElementById('kpi-unidad').value,
    frecuencia:  document.getElementById('kpi-frecuencia').value,
    peso:        parseFloat(document.getElementById('kpi-peso').value) || 0,
    objetivo:    parseFloat(document.getElementById('kpi-objetivo').value) || null,
    minimo:      parseFloat(document.getElementById('kpi-minimo').value) || null,
    excelente:   parseFloat(document.getElementById('kpi-excelente').value) || null,
  };
  await fetch(id ? `/api/kpis/${id}` : '/api/kpis', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  cerrarModal();
  cargarKPIs();
}

function confirmarEliminar(id) {
  const modal = document.getElementById('modal-confirm');
  modal.style.display = 'flex';
  document.getElementById('btn-confirm-delete').onclick = async () => {
    await fetch(`/api/kpis/${id}`, { method: 'DELETE' });
    modal.style.display = 'none';
    cargarKPIs();
  };
}

// ── Presupuesto salarial ──────────────────────────────────────────────────────
async function calcularPresupuesto() {
  const payload = {
    presupuesto:      parseFloat(document.getElementById('p-presupuesto').value) || 0,
    num_kam:          parseInt(document.getElementById('p-num-kam').value) || 0,
    kam_fijo:         parseFloat(document.getElementById('p-kam-fijo').value) || 0,
    kam_variable_pct: parseFloat(document.getElementById('p-kam-var').value) || 0,
    num_pm:           parseInt(document.getElementById('p-num-pm').value) || 0,
    pm_fijo:          parseFloat(document.getElementById('p-pm-fijo').value) || 0,
    pm_variable_pct:  parseFloat(document.getElementById('p-pm-var').value) || 0,
  };
  const r = await (await fetch('/api/presupuesto', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })).json();
  const pct = r.pct_usado;
  document.getElementById('presupuesto-resultado').innerHTML = `
    <div class="result-block">
      <h3>Equipo KAM (${r.kam.num} personas)</h3>
      <div class="result-row"><span>Fijo por persona</span><span>${fmt(r.kam.fijo)}</span></div>
      <div class="result-row"><span>Variable por persona</span><span>${fmt(r.kam.variable)}</span></div>
      <div class="result-row total"><span>Coste equipo KAM</span><span>${fmt(r.kam.coste_equipo)}</span></div>
    </div>
    <div class="result-block">
      <h3>Equipo PM (${r.pm.num} personas)</h3>
      <div class="result-row"><span>Fijo por persona</span><span>${fmt(r.pm.fijo)}</span></div>
      <div class="result-row"><span>Variable por persona</span><span>${fmt(r.pm.variable)}</span></div>
      <div class="result-row total"><span>Coste equipo PM</span><span>${fmt(r.pm.coste_equipo)}</span></div>
    </div>
    <div class="result-block">
      <div class="result-row total"><span>Coste salarial total</span><span>${fmt(r.coste_total)}</span></div>
    </div>
    <div class="remanente-block ${r.remanente >= 0 ? 'positivo' : 'negativo'}">
      <h3>${r.remanente >= 0 ? '✓ Remanente disponible' : '! Presupuesto excedido'}</h3>
      <div class="remanente-importe">${fmt(Math.abs(r.remanente))}</div>
    </div>
    <div class="progress-bar-wrap">
      <label>Presupuesto utilizado: <strong>${pct}%</strong></label>
      <div class="progress-bar">
        <div class="progress-bar-fill ${pct > 100 ? 'over' : ''}" style="width:${Math.min(pct,100)}%"></div>
      </div>
    </div>`;
}

// ── Chat ──────────────────────────────────────────────────────────────────────
async function enviarMensaje() {
  const input = document.getElementById('chat-input');
  const texto = input.value.trim();
  if (!texto) return;
  input.value = '';
  document.getElementById('chat-error').style.display = 'none';
  agregarMensaje('user', texto);
  historialChat.push({ role: 'user', content: texto });
  const loadingEl = agregarMensaje('loading', '...');
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: texto, historial: historialChat.slice(-10) })
    });
    const data = await resp.json();
    loadingEl.remove();
    if (data.error) {
      document.getElementById('chat-error').textContent = data.error;
      document.getElementById('chat-error').style.display = 'block';
    } else {
      agregarMensaje('assistant', data.respuesta);
      historialChat.push({ role: 'assistant', content: data.respuesta });
    }
  } catch {
    loadingEl.remove();
    document.getElementById('chat-error').textContent = 'Error de conexión con el servidor.';
    document.getElementById('chat-error').style.display = 'block';
  }
}

function agregarMensaje(role, texto) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'message ' + role;
  div.innerHTML = `<div class="message-bubble">${texto}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function preguntaRapida(texto) {
  document.getElementById('chat-input').value = texto;
  enviarMensaje();
}

// ── Clientes ──────────────────────────────────────────────────────────────────
let todosClientes = [];
let comparativaClientesData = [];

function switchCliTab(tab) {
  document.getElementById('tab-individual').classList.toggle('active', tab === 'individual');
  document.getElementById('tab-comparativa').classList.toggle('active', tab === 'comparativa');
  document.getElementById('cli-view-individual').style.display   = tab === 'individual'  ? 'block' : 'none';
  document.getElementById('cli-view-comparativa').style.display  = tab === 'comparativa' ? 'block' : 'none';
  if (tab === 'comparativa' && !comparativaClientesData.length) cargarComparativaClientes();
}

async function cargarComparativaClientes() {
  document.getElementById('cmp-global-tabla').innerHTML = '<p style="padding:20px;color:#999;font-size:12px">Cargando datos...</p>';
  const data = await (await fetch('/api/comparativa_clientes')).json();
  comparativaClientesData = data;
  renderComparativaClientes(data);
}

function ordenarComparativa(criterio) {
  const sorted = [...comparativaClientesData].sort((a, b) => {
    if (criterio === 'fac_total') return -((a.fac_2025 + a.fac_2026) - (b.fac_2025 + b.fac_2026));
    if (criterio === 'fac_2026') return -(a.fac_2026 - b.fac_2026);
    if (criterio === 'fac_var')  return -(a.fac_var  - b.fac_var);
    if (criterio === 'fac_pct')  return -((a.fac_pct ?? -9999) - (b.fac_pct ?? -9999));
    if (criterio === 'pipe_2026')return -(a.pipe_2026 - b.pipe_2026);
    return 0;
  });
  renderComparativaClientes(sorted);
}

function renderComparativaClientes(data) {
  const el = document.getElementById('cmp-global-tabla');
  const total25 = data.reduce((s, c) => s + c.fac_2025, 0);
  const total26 = data.reduce((s, c) => s + c.fac_2026, 0);
  const totalVar = total26 - total25;
  const totalPct = total25 ? ((totalVar / total25) * 100).toFixed(1) : 0;
  const headerCls = totalVar >= 0 ? 'ref-up' : 'ref-down';

  el.innerHTML = `
    <div class="year-ref-bar ${headerCls}" style="margin-bottom:1px">
      <span class="ref-label">Total cartera</span>
      <span class="ref-block"><span class="ref-year">2025</span><strong>${fmtK(total25)}</strong></span>
      <span class="ref-arrow">→</span>
      <span class="ref-block"><span class="ref-year">2026</span><strong class="ref-val-${headerCls}">${fmtK(total26)}</strong></span>
      <span class="ref-diff ${headerCls}">${totalVar >= 0 ? '▲ +' : '▼ '}${fmtK(totalVar)} (${totalVar >= 0 ? '+' : ''}${totalPct}%)</span>
    </div>
    <div class="cmp-table-wrap">
    <table class="cmp-table">
      <thead>
        <tr>
          <th rowspan="2">#</th>
          <th rowspan="2">Cliente</th>
          <th colspan="4" class="cmp-th-group">Facturación</th>
          <th colspan="3" class="cmp-th-group">Pipeline ganado</th>
        </tr>
        <tr class="cmp-subhead">
          <th>2025</th><th>2026</th><th>Var €</th><th>Var %</th>
          <th>2025</th><th>2026</th><th>Var €</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((c, i) => {
          const f26Cls  = c.fac_2026 < c.fac_2025 && c.fac_2025 > 0 ? 'cmp-red' : c.fac_2026 > c.fac_2025 ? 'cmp-green' : '';
          const varCls  = c.fac_var > 0 ? 'cmp-green' : c.fac_var < 0 ? 'cmp-red' : '';
          const pctTxt  = c.fac_pct !== null ? (c.fac_pct > 0 ? '+' : '') + c.fac_pct + '%' : '—';
          const pCls    = c.pipe_2026 > c.pipe_2025 ? 'cmp-green' : c.pipe_2026 < c.pipe_2025 && c.pipe_2025 > 0 ? 'cmp-red' : '';
          const pVar    = c.pipe_var;
          const pVarCls = pVar > 0 ? 'cmp-green' : pVar < 0 ? 'cmp-red' : '';
          return `<tr>
            <td class="cmp-rank">${i+1}</td>
            <td class="cmp-nombre">${c.nombre}</td>
            <td class="cmp-num">${c.fac_2025 ? fmtK(c.fac_2025) : '—'}</td>
            <td class="cmp-num ${f26Cls}"><strong>${c.fac_2026 ? fmtK(c.fac_2026) : '—'}</strong></td>
            <td class="cmp-num ${varCls}">${c.fac_var !== 0 ? (c.fac_var > 0 ? '+' : '') + fmtK(c.fac_var) : '—'}</td>
            <td class="cmp-num ${varCls}">${pctTxt}</td>
            <td class="cmp-num">${c.pipe_2025 ? fmtK(c.pipe_2025) : '—'}</td>
            <td class="cmp-num ${pCls}">${c.pipe_2026 ? fmtK(c.pipe_2026) : '—'}</td>
            <td class="cmp-num ${pVarCls}">${pVar !== 0 ? (pVar > 0 ? '+' : '') + fmtK(pVar) : '—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot>
        <tr class="cmp-total">
          <td colspan="2">TOTAL</td>
          <td class="cmp-num">${fmtK(total25)}</td>
          <td class="cmp-num ${totalVar >= 0 ? 'cmp-green' : 'cmp-red'}"><strong>${fmtK(total26)}</strong></td>
          <td class="cmp-num ${totalVar >= 0 ? 'cmp-green' : 'cmp-red'}">${totalVar >= 0 ? '+' : ''}${fmtK(totalVar)}</td>
          <td class="cmp-num ${totalVar >= 0 ? 'cmp-green' : 'cmp-red'}">${totalVar >= 0 ? '+' : ''}${totalPct}%</td>
          <td colspan="3"></td>
        </tr>
      </tfoot>
    </table>
    </div>`;
}

async function cargarClientes() {
  const data = await (await fetch('/api/clientes')).json();
  todosClientes = data;

  const dl = document.getElementById('clientes-datalist');
  dl.innerHTML = data.map(c => `<option value="${c.nombre}">`).join('');

  const chips = document.getElementById('clientes-chips');
  chips.innerHTML = data.slice(0, 12).map(c =>
    `<button class="cliente-chip" onclick="seleccionarCliente('${c.nombre.replace(/'/g,"\\'")}')">
      ${c.nombre} <span class="chip-val">${fmtK(c.importe)}</span>
    </button>`
  ).join('');
}

function seleccionarCliente(nombre) {
  document.getElementById('cliente-input').value = nombre;
  analizarCliente();
}

async function analizarCliente() {
  const nombre = document.getElementById('cliente-input').value.trim();
  if (!nombre) return;

  document.getElementById('cliente-placeholder').style.display = 'none';
  document.getElementById('cliente-panel').style.display = 'none';
  document.getElementById('cli-nombre').textContent = '⏳ Cargando...';
  document.getElementById('cliente-panel').style.display = 'block';

  const resp = await fetch('/api/cliente?nombre=' + encodeURIComponent(nombre));
  if (!resp.ok) return;
  const data = await resp.json();
  renderCliente(data);
}

function renderCliente(d) {
  const f = d.facturacion;
  const p = d.pipeline;

  document.getElementById('cli-nombre').textContent = d.nombre;
  document.getElementById('cli-sub').textContent =
    `${f.facturas.length} facturas · ${f.pct_cobrado}% cobrado`;

  // KPI row superior
  const hayVencido = f.vencido > 0;
  document.getElementById('cli-kpi-row').innerHTML = `
    <div class="cli-kpi ${f.total > 0 ? '' : 'empty'}">
      <div class="cli-kpi-label">Total facturado</div>
      <div class="cli-kpi-val">${fmtK(f.total)}</div>
    </div>
    <div class="cli-kpi">
      <div class="cli-kpi-label">Cobrado</div>
      <div class="cli-kpi-val green">${fmtK(f.cobrado)}</div>
    </div>
    <div class="cli-kpi">
      <div class="cli-kpi-label">Pendiente</div>
      <div class="cli-kpi-val ${f.pendiente > 0 ? 'orange' : ''}">${fmtK(f.pendiente)}</div>
    </div>
    <div class="cli-kpi">
      <div class="cli-kpi-label">Vencido</div>
      <div class="cli-kpi-val ${hayVencido ? 'red' : ''}">${fmtK(f.vencido)}</div>
    </div>`;

  // Gráfico mensual
  const meses = f.por_mes;
  const maxM = Math.max(...Object.values(meses), 1);
  document.getElementById('cli-chart-meses').innerHTML = Object.entries(meses).map(([k, v]) => {
    const pct = Math.max(4, v / maxM * 100);
    const [anyo, mes] = k.split('-');
    const label = (MESES[mes] || mes) + ' ' + anyo.slice(2);
    return `<div class="bar-col">
      <div class="bar-fill" style="height:${pct}%"><div class="tooltip">${label}: ${fmt(v)}</div></div>
      <span class="bar-label">${label}</span>
    </div>`;
  }).join('') || '<p class="cli-empty">Sin datos</p>';

  // Sector + tipo combinados
  const secEntries = Object.entries(f.por_sector);
  const tipEntries = Object.entries(f.por_tipo);
  const totalSec = secEntries.reduce((a, [, v]) => a + v, 0);
  const totalTip = tipEntries.reduce((a, [, v]) => a + v, 0);
  document.getElementById('cli-chart-sector').innerHTML =
    `<div class="cli-section-label">Por sector</div>` +
    secEntries.map(([k, v]) => {
      const pct = Math.round(v / totalSec * 100);
      return `<div class="list-bar-row">
        <div class="list-bar-header"><span class="list-bar-name">${k}</span><span class="list-bar-val">${fmtK(v)}</span></div>
        <div class="list-bar-track"><div class="list-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('') +
    `<div class="cli-section-label" style="margin-top:14px">Por tipo</div>` +
    tipEntries.map(([k, v]) => {
      const pct = Math.round(v / totalTip * 100);
      return `<div class="list-bar-row">
        <div class="list-bar-header"><span class="list-bar-name">${k}</span><span class="list-bar-val">${fmtK(v)}</span></div>
        <div class="list-bar-track"><div class="list-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');

  // Pipeline
  const tieneP = p.count_ganados + p.count_perdidos + p.count_curso > 0;
  if (tieneP) {
    const clsWR = p.win_rate >= 65 ? 'wr-high' : p.win_rate >= 50 ? 'wr-mid' : 'wr-low';
    document.getElementById('cli-pipeline').innerHTML = `
      <div class="cli-pipe-kpis">
        <div class="cli-kpi">
          <div class="cli-kpi-label">Win Rate</div>
          <div class="cli-kpi-val"><span class="wr-badge ${clsWR}">${p.win_rate}%</span></div>
        </div>
        <div class="cli-kpi">
          <div class="cli-kpi-label">Ganado (${p.count_ganados})</div>
          <div class="cli-kpi-val green">${fmtK(p.ganado)}</div>
        </div>
        <div class="cli-kpi">
          <div class="cli-kpi-label">Perdido (${p.count_perdidos})</div>
          <div class="cli-kpi-val red">${fmtK(p.perdido)}</div>
        </div>
        <div class="cli-kpi">
          <div class="cli-kpi-label">En curso (${p.count_curso})</div>
          <div class="cli-kpi-val orange">${fmtK(p.en_curso)}</div>
        </div>
      </div>
      <table class="cli-table" style="margin-top:12px">
        <thead><tr><th>Fecha</th><th>Nº</th><th>Importe</th><th>Estado</th></tr></thead>
        <tbody>${p.presupuestos.map(r => {
          const clsE = r.estado === 'Cerrado - Pedido creado' ? 'estado-ganado'
                     : r.estado === 'Cerrado - Rechazado'     ? 'estado-perdido' : 'estado-curso';
          const lbl  = r.estado === 'Cerrado - Pedido creado' ? 'Ganado'
                     : r.estado === 'Cerrado - Rechazado'     ? 'Rechazado' : 'En curso';
          return `<tr>
            <td>${r.fecha}</td><td>${r.numero || '—'}</td>
            <td style="font-weight:600">${fmt(r.importe)}</td>
            <td><span class="estado-badge ${clsE}">${lbl}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  } else {
    document.getElementById('cli-pipeline').innerHTML =
      '<p class="cli-empty">Sin presupuestos registrados para este cliente.</p>';
  }

  // Facturas
  document.getElementById('cli-facturas').innerHTML = f.facturas.length
    ? `<table class="cli-table">
        <thead><tr><th>Fecha</th><th>Nº</th><th>Importe</th><th>Cobrado</th><th>Pendiente</th></tr></thead>
        <tbody>${f.facturas.map(r => `<tr>
          <td>${r.fecha}</td><td>${r.numero || '—'}</td>
          <td style="font-weight:600">${fmt(r.importe)}</td>
          <td style="color:#1a7a1a">${fmt(r.cobrado)}</td>
          <td style="color:${r.pendiente > 0 ? '#c00000' : '#999'}">${fmt(r.pendiente)}</td>
        </tr>`).join('')}</tbody>
      </table>`
    : '<p class="cli-empty">Sin facturas registradas.</p>';
}

// ── Informe ───────────────────────────────────────────────────────────────────
async function descargarInforme() {
  const btn    = document.querySelector('.btn-download');
  const status = document.getElementById('informe-status');
  const texto  = document.getElementById('btn-download-text');

  btn.disabled = true;
  texto.textContent = '⏳  Generando informe...';
  status.style.display = 'block';
  status.textContent   = 'Procesando datos de facturación, pipeline y KPIs...';

  try {
    const resp = await fetch('/api/informe');
    if (!resp.ok) throw new Error('Error al generar el informe');

    const blob     = await resp.blob();
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const filename = resp.headers.get('Content-Disposition')
      ?.match(/filename=(.+)/)?.[1] || 'INSTORE_Informe_Consejo.xlsx';

    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    texto.textContent      = '✓  Informe descargado correctamente';
    status.textContent     = 'El archivo Excel se ha guardado en tu carpeta de descargas.';
    status.style.background = '#f0faf0';
    status.style.color      = '#1a7a1a';
    status.style.borderColor = '#1a7a1a';

    setTimeout(() => {
      btn.disabled          = false;
      texto.textContent     = '↓   Descargar informe Excel';
      status.style.display  = 'none';
      status.style.background = '';
      status.style.color      = '';
      status.style.borderColor = '';
    }, 4000);

  } catch (e) {
    texto.textContent      = '↓   Descargar informe Excel';
    status.textContent     = '⚠ Error al generar el informe. Inténtalo de nuevo.';
    status.style.background = '#fdf0f0';
    status.style.color      = '#c00000';
    btn.disabled            = false;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
cargarKPIs();
