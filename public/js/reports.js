// Reports Page
let currentReportData = null;

function renderReportsPage() {
  const content = document.getElementById('page-content');
  const today = new Date().toISOString().split('T')[0];

  content.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="report-period-selector">
          <button class="period-btn active" onclick="loadReport('daily', this)">Harian</button>
          <button class="period-btn" onclick="loadReport('weekly', this)">Mingguan</button>
          <button class="period-btn" onclick="loadReport('monthly', this)">Bulanan</button>
          <button class="period-btn" onclick="loadReport('yearly', this)">Tahunan</button>
        </div>
      </div>
      <div class="toolbar-right">
        <input type="date" id="report-from" value="${today}" style="max-width:150px">
        <input type="date" id="report-to" value="${today}" style="max-width:150px">
        <button class="btn btn-ghost btn-sm" onclick="loadReportCustomRange()">Filter</button>
        <div class="report-export-bar">
          <button class="btn btn-ghost btn-sm" onclick="exportReportPrint()">🖨️ Print</button>
          <button class="btn btn-ghost btn-sm" onclick="exportReportCSV()">📊 Excel (.xlsx)</button>
        </div>
      </div>
    </div>
    <div id="report-content"><div class="loading" style="text-align:center;padding:2rem">Memuat laporan...</div></div>
  `;

  loadReport('daily');
}

function loadReport(period, btn) {
  if (btn) {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  API.get(`/api/reports?period=${period}`).then(data => {
    currentReportData = data;
    renderReportContent(data);
  }).catch(err => {
    document.getElementById('report-content').innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  });
}

function loadReportCustomRange() {
  const from = document.getElementById('report-from').value;
  const to = document.getElementById('report-to').value;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));

  API.get(`/api/reports?date_from=${from}&date_to=${to}`).then(data => {
    currentReportData = data;
    renderReportContent(data);
  });
}

function renderReportContent(data) {
  const s = data.summary;
  const rc = document.getElementById('report-content');

  rc.innerHTML = `
    <p style="color:var(--text-muted);margin-bottom:1rem;font-size:0.85rem">Periode: ${formatDate(data.period.start)} — ${formatDate(data.period.end)}</p>

    <!-- Summary Cards -->
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fit, minmax(170px, 1fr))">
      <div class="stat-card accent"><div class="stat-label">Total Omzet</div><div class="stat-value">${formatRupiah(s.total_revenue)}</div></div>
      <div class="stat-card info"><div class="stat-label">Transaksi</div><div class="stat-value">${s.total_transactions}</div><div class="stat-sub">${s.total_items} item terjual</div></div>
      <div class="stat-card success"><div class="stat-label">Tunai</div><div class="stat-value">${formatRupiah(s.total_tunai)}</div><div class="stat-sub">${s.count_tunai} tx</div></div>
      <div class="stat-card info"><div class="stat-label">QRIS</div><div class="stat-value">${formatRupiah(s.total_qris)}</div><div class="stat-sub">${s.count_qris} tx</div></div>
      <div class="stat-card warning"><div class="stat-label">Diskon</div><div class="stat-value">${formatRupiah(s.total_discount)}</div></div>
      <div class="stat-card warning"><div class="stat-label">Pengeluaran</div><div class="stat-value">${formatRupiah(s.total_expense)}</div></div>
      <div class="stat-card danger"><div class="stat-label">Kasbon</div><div class="stat-value">${formatRupiah(s.total_kasbon)}</div></div>
      <div class="stat-card success"><div class="stat-label">Laba Kotor</div><div class="stat-value">${formatRupiah(s.gross_profit)}</div></div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab active" onclick="showReportTab('penjualan', this)">Penjualan</button>
      <button class="tab" onclick="showReportTab('transaksi', this)">Transaksi</button>
      <button class="tab" onclick="showReportTab('pengeluaran', this)">Pengeluaran</button>
      <button class="tab" onclick="showReportTab('diskon', this)">Diskon</button>
      <button class="tab" onclick="showReportTab('stok', this)">Stok</button>
      <button class="tab" onclick="showReportTab('batal', this)">Pembatalan</button>
    </div>
    <div id="report-tab-content"></div>
  `;

  showReportTab('penjualan');
}

function showReportTab(tab, btn) {
  if (btn) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
  }

  const d = currentReportData;
  const tc = document.getElementById('report-tab-content');

  if (tab === 'penjualan') {
    tc.innerHTML = `
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header"><h3 class="card-title">🔥 Menu Terlaris</h3></div>
          ${d.topMenus.map((m, i) => `
            <div class="list-item">
              <div class="list-item-info">
                <div class="list-item-rank">${i+1}</div>
                <div><div class="list-item-name">${m.menu_name}</div><div class="list-item-sub">${m.menu_type}</div></div>
              </div>
              <div><div class="list-item-value">${m.total_sold}x</div><div class="list-item-value-sub">${formatRupiah(m.total_revenue)}</div></div>
            </div>
          `).join('')}
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">📂 Kategori Terlaris</h3></div>
          ${d.topCategories.map((c, i) => `
            <div class="list-item">
              <div class="list-item-info">
                <div class="list-item-rank">${i+1}</div>
                <div><div class="list-item-name">${c.category_name}</div><div class="list-item-sub">${c.type}</div></div>
              </div>
              <div><div class="list-item-value">${c.total_sold}x</div><div class="list-item-value-sub">${formatRupiah(c.total_revenue)}</div></div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card" style="margin-top:1rem">
        <div class="card-header"><h3 class="card-title">⏰ Jam Ramai</h3></div>
        <div class="chart-container" style="height:150px;padding-bottom:30px">
          ${d.peakHours.length > 0 ? (() => {
            const maxCount = Math.max(...d.peakHours.map(h => h.count));
            const allHours = Array.from({length:24}, (_, i) => {
              const found = d.peakHours.find(h => h.hour === i);
              return { hour: i, count: found?.count || 0, revenue: found?.revenue || 0 };
            });
            return allHours.map(h => {
              const height = maxCount > 0 ? Math.max(2, (h.count / maxCount) * 120) : 2;
              return `<div class="chart-bar" style="height:${height}px" title="${h.count} tx | ${formatRupiah(h.revenue)}">
                <span class="chart-bar-label">${h.hour.toString().padStart(2,'0')}</span>
              </div>`;
            }).join('');
          })() : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">Belum ada data</div>'}
        </div>
      </div>
    `;
  } else if (tab === 'transaksi') {
    tc.innerHTML = `<div class="card"><div class="table-wrapper"><table>
      <thead><tr><th>Invoice</th><th>Waktu</th><th>Kasir</th><th>Total</th><th>Bayar</th><th>Status</th></tr></thead>
      <tbody>
        ${d.transactions.map(t => `<tr>
          <td><code>${t.invoice_number}</code></td>
          <td>${formatDateTime(t.created_at)}</td>
          <td>${t.cashier_name || '-'}</td>
          <td><strong>${formatRupiah(t.total)}</strong></td>
          <td>${t.payment_method || '-'}</td>
          <td>${getStatusBadge(t.status)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>`;
  } else if (tab === 'pengeluaran') {
    tc.innerHTML = `<div class="card"><div class="table-wrapper"><table>
      <thead><tr><th>Tanggal</th><th>No</th><th>Nama</th><th>Kategori</th><th>Nominal</th><th>Status</th><th>Oleh</th></tr></thead>
      <tbody>
        ${d.expenseList.map(e => `<tr>
          <td>${formatDate(e.date)}</td>
          <td><code>${e.expense_number}</code></td>
          <td>${e.name}</td>
          <td>${e.category}</td>
          <td><strong>${formatRupiah(e.amount)}</strong></td>
          <td>${getStatusBadge(e.status)}</td>
          <td>${e.created_by_name || '-'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>`;
  } else if (tab === 'diskon') {
    tc.innerHTML = `<div class="card"><div class="table-wrapper"><table>
      <thead><tr><th>Invoice</th><th>Menu</th><th>Tipe</th><th>Nilai</th><th>Potongan</th><th>Oleh</th><th>Waktu</th></tr></thead>
      <tbody>
        ${d.discountHistory.map(dh => `<tr>
          <td><code>${dh.invoice_number}</code></td>
          <td>${dh.menu_name || 'Transaksi'}</td>
          <td><span class="badge badge-accent">${dh.discount_type}</span></td>
          <td>${dh.discount_type === 'percentage' ? dh.discount_value + '%' : formatRupiah(dh.discount_value)}</td>
          <td><strong>${formatRupiah(dh.discount_amount)}</strong></td>
          <td>${dh.discount_by_name || '-'}</td>
          <td>${formatDateTime(dh.created_at)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>`;
  } else if (tab === 'stok') {
    tc.innerHTML = `
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header"><h3 class="card-title">📤 Ringkasan Stok Keluar</h3></div>
          <div class="table-wrapper"><table>
            <thead><tr><th>Item</th><th>Tipe</th><th>Total Keluar</th></tr></thead>
            <tbody>
              ${d.stockOutSummary.map(s => `<tr>
                <td><strong>${s.item_name}</strong></td>
                <td><span class="badge badge-muted">${s.type}</span></td>
                <td>${s.total_out}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">⚠️ Stok Menipis</h3></div>
          ${[...d.lowStockMenus.map(s => `<div class="alert-item"><span class="alert-icon">🍽️</span><span class="alert-item-name">${s.name}</span><span class="alert-item-stock">${s.current_stock}/${s.min_stock}</span></div>`),
            ...d.lowStockIngredients.map(s => `<div class="alert-item"><span class="alert-icon">📦</span><span class="alert-item-name">${s.name}</span><span class="alert-item-stock">${s.current_stock} ${s.unit}</span></div>`)
          ].join('') || '<div class="empty-state"><p>Semua stok aman 👍</p></div>'}
        </div>
      </div>`;
  } else if (tab === 'batal') {
    tc.innerHTML = `<div class="card"><div class="table-wrapper"><table>
      <thead><tr><th>Invoice</th><th>Waktu</th><th>Kasir</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>
        ${d.cancelledTx.length > 0 ? d.cancelledTx.map(t => `<tr>
          <td><code>${t.invoice_number}</code></td>
          <td>${formatDateTime(t.created_at)}</td>
          <td>${t.cashier_name || '-'}</td>
          <td>${formatRupiah(t.total)}</td>
          <td>${getStatusBadge(t.status)}</td>
        </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Tidak ada pembatalan</td></tr>'}
      </tbody>
    </table></div></div>`;
  }
}

// ============================================================
//  PRINT THERMAL LAPORAN — Safe Revision
// ============================================================

function exportReportPrint() {
  if (!currentReportData) {
    showToast('Muat laporan terlebih dahulu', 'warning');
    return;
  }
  openReportPrintPreview();
}

/** Build the thermal-formatted report HTML string */
function generateReportPrintTemplate(data, paperWidth) {
  const s  = data.summary;
  const pw = paperWidth === '58mm' ? 32 : 42; // char width per line
  const hr = '-'.repeat(pw);
  const now = new Date();
  const printedAt = now.toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const userName = window._currentUser ? (window._currentUser.full_name || window._currentUser.username) : 'Admin';

  // Right-align helper: pad label + value to line width
  function row(label, value) {
    const maxLabel = pw - value.length - 1;
    const lbl = label.length > maxLabel ? label.substring(0, maxLabel) : label;
    const spaces = pw - lbl.length - value.length;
    return lbl + ' '.repeat(Math.max(1, spaces)) + value;
  }

  // Menu terlaris rows
  const topMenuRows = data.topMenus.length > 0
    ? data.topMenus.slice(0, 10).map((m, i) =>
        `${(i+1).toString().padStart(2)}. ${m.menu_name.substring(0, pw - 14).padEnd(pw - 14)} ${String(m.total_sold).padStart(4)}x`)
      .join('\n')
    : 'Belum ada data';

  // Kategori terlaris rows
  const topCatRows = data.topCategories.length > 0
    ? data.topCategories.slice(0, 5).map((c, i) =>
        `${(i+1).toString().padStart(2)}. ${c.category_name.substring(0, pw - 14).padEnd(pw - 14)} ${String(c.total_sold).padStart(4)}x`)
      .join('\n')
    : 'Belum ada data';

  // Jam ramai
  let peakHoursText = 'Belum ada data';
  if (data.peakHours && data.peakHours.length > 0) {
    const sorted = [...data.peakHours].sort((a, b) => b.count - a.count).slice(0, 5);
    peakHoursText = sorted.map(h =>
      row(`  ${String(h.hour).padStart(2, '0')}:00 - ${String(h.hour + 1).padStart(2, '0')}:00`, `${h.count} tx`)
    ).join('\n');
  }

  // Format tanggal: pendek untuk 58mm, normal untuk 80mm
  function fmtD(dateStr) {
    const d = new Date(dateStr);
    if (paperWidth === '58mm') {
      return d.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'2-digit' });
    }
    return formatDate(dateStr);
  }

  const periodeLines = paperWidth === '58mm'
    ? [`Dari    : ${fmtD(data.period.start)}`, `Sampai  : ${fmtD(data.period.end)}`]
    : [`Periode : ${fmtD(data.period.start)} - ${fmtD(data.period.end)}`];

  const headerMeta = [
    ...periodeLines,
    `Cetak   : ${printedAt}`,
    `Oleh    : ${userName.substring(0, pw - 10)}`,
  ];

  const lines = [
    BRAND.receiptHeader.padStart(Math.floor((pw + BRAND.receiptHeader.length) / 2)),
    'LAPORAN PENJUALAN'.padStart(Math.floor((pw + 18) / 2)),
    hr,
    ...headerMeta,
    hr,
    'RINGKASAN',
    hr,
    row('Total Omzet', formatRupiah(s.total_revenue)),
    row('Transaksi', String(s.total_transactions)),
    row('Item Terjual', String(s.total_items)),
    row('Tunai', formatRupiah(s.total_tunai)),
    row('QRIS', formatRupiah(s.total_qris)),
    row('Diskon', formatRupiah(s.total_discount)),
    row('Pengeluaran', formatRupiah(s.total_expense)),
    row('Kasbon', formatRupiah(s.total_kasbon || 0)),
    row('Laba Kotor', formatRupiah(s.gross_profit)),
    hr,
    'MENU TERLARIS',
    hr,
    topMenuRows,
    hr,
    'KATEGORI TERLARIS',
    hr,
    topCatRows,
    hr,
    'JAM RAMAI',
    hr,
    peakHoursText,
    hr,
    BRAND.receiptFooter.padStart(Math.floor((pw + BRAND.receiptFooter.length) / 2)),
    BRAND.shortName.padStart(Math.floor((pw + BRAND.shortName.length) / 2)),
  ].join('\n');

  return lines;
}

/** Open the print preview modal */
function openReportPrintPreview(defaultSize = '80mm') {
  const d = currentReportData;
  const modal = document.createElement('div');
  modal.id = 'report-print-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.7);
    display:flex;align-items:center;justify-content:center;
    padding:1rem;
  `;

  modal.innerHTML = `
    <div style="
      background:#1a1d2e;border:1px solid rgba(255,255,255,0.1);
      border-radius:12px;width:100%;max-width:540px;
      max-height:90vh;display:flex;flex-direction:column;
      box-shadow:0 20px 60px rgba(0,0,0,0.6);
    ">
      <!-- Header -->
      <div style="padding:1rem 1.25rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <h3 style="margin:0;font-size:1rem;font-weight:700;color:#fff">🖨️ Preview Cetak Laporan</h3>
        <button onclick="document.getElementById('report-print-modal').remove()" style="background:none;border:none;color:#888;font-size:1.25rem;cursor:pointer;padding:0.25rem;line-height:1">✕</button>
      </div>

      <!-- Controls -->
      <div style="padding:0.85rem 1.25rem;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:0.75rem;flex-shrink:0;flex-wrap:wrap">
        <span style="color:#aaa;font-size:0.82rem;white-space:nowrap">Ukuran Kertas:</span>
        <div style="display:flex;gap:0.4rem">
          <button id="size-58" onclick="switchPrintSize('58mm')" style="padding:0.35rem 0.75rem;border-radius:6px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#ccc;cursor:pointer;font-size:0.8rem;font-family:inherit">58mm</button>
          <button id="size-80" onclick="switchPrintSize('80mm')" style="padding:0.35rem 0.75rem;border-radius:6px;border:1px solid #6366f1;background:#6366f1;color:#fff;cursor:pointer;font-size:0.8rem;font-family:inherit">80mm</button>
        </div>
        <div style="margin-left:auto;display:flex;gap:0.5rem">
          <button onclick="printThermalReport()" style="padding:0.45rem 1rem;border-radius:8px;border:none;background:#6366f1;color:#fff;cursor:pointer;font-size:0.82rem;font-weight:600;font-family:inherit">🖨️ Cetak Sekarang</button>
          <button onclick="document.getElementById('report-print-modal').remove()" style="padding:0.45rem 0.85rem;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#ccc;cursor:pointer;font-size:0.82rem;font-family:inherit">Batal</button>
        </div>
      </div>

      <!-- Preview area -->
      <div style="flex:1;overflow-y:auto;padding:1.25rem;display:flex;justify-content:center;background:#2a2d3e">
        <div id="thermal-preview-wrapper" style="background:#fff;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,0.3)">
          <pre id="thermal-preview-text" style="
            font-family:'Courier New',Courier,monospace;
            font-size:12px;line-height:1.45;
            color:#000;background:#fff;
            margin:0;padding:10px 8px;
            white-space:pre-wrap;word-break:break-word;
          "></pre>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  // Close on backdrop click
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // Set initial size
  window._reportPrintSize = defaultSize;
  switchPrintSize(defaultSize);
}

/** Switch paper size and refresh preview */
function switchPrintSize(size) {
  window._reportPrintSize = size;
  const btn58 = document.getElementById('size-58');
  const btn80 = document.getElementById('size-80');
  if (!btn58 || !btn80) return;

  const activeStyle = 'border:1px solid #6366f1;background:#6366f1;color:#fff';
  const inactiveStyle = 'border:1px solid rgba(255,255,255,0.2);background:transparent;color:#ccc';

  btn58.style.cssText = `padding:0.35rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.8rem;font-family:inherit;${size === '58mm' ? activeStyle : inactiveStyle}`;
  btn80.style.cssText = `padding:0.35rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.8rem;font-family:inherit;${size === '80mm' ? activeStyle : inactiveStyle}`;

  const wrapper = document.getElementById('thermal-preview-wrapper');
  const preview = document.getElementById('thermal-preview-text');
  if (!wrapper || !preview) return;

  // Set preview width to match paper
  const pxWidth = size === '58mm' ? 220 : 302;
  wrapper.style.width = pxWidth + 'px';
  preview.style.fontSize = size === '58mm' ? '10px' : '12px';

  // Regenerate content
  preview.textContent = generateReportPrintTemplate(currentReportData, size);
}

/** Trigger actual browser print — only print area visible */
function printThermalReport() {
  if (!currentReportData) return;
  const size   = window._reportPrintSize || '80mm';
  const content = generateReportPrintTemplate(currentReportData, size);

  // Build isolated print window
  const pw = window.open('', '_blank', 'width=400,height=600');
  pw.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan ${BRAND.shortName}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body {
      background: #fff;
      color: #000;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${size === '58mm' ? '10' : '12'}px;
      line-height: 1.45;
      width: ${size};
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      padding: 4px 6px;
      width: 100%;
    }
    @page {
      size: ${size} auto;
      margin: 4mm 3mm;
    }
    @media print {
      html, body { width: ${size}; }
    }
  </style>
</head>
<body>
<pre>${content}</pre>
</body>
</html>`);
  pw.document.close();
  pw.focus();
  setTimeout(() => { pw.print(); pw.close(); }, 350);
  showToast('Mencetak laporan thermal...', 'success');
}


function exportReportCSV() {
  if (!currentReportData) {
    showToast('Muat laporan terlebih dahulu', 'warning');
    return;
  }
  exportReportExcel(currentReportData);
}

