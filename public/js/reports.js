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
          <button class="btn btn-ghost btn-sm" onclick="exportReportCSV()">📊 Excel</button>
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

function exportReportPrint() {
  window.print();
}

function exportReportCSV() {
  if (!currentReportData) return;
  const d = currentReportData;

  let csv = BRAND.reportHeader + '\n';
  csv += `Periode,${d.period.start},${d.period.end}\n\n`;
  csv += 'RINGKASAN\n';
  csv += `Total Omzet,${d.summary.total_revenue}\n`;
  csv += `Total Transaksi,${d.summary.total_transactions}\n`;
  csv += `Total Item Terjual,${d.summary.total_items}\n`;
  csv += `Total Diskon,${d.summary.total_discount}\n`;
  csv += `Tunai,${d.summary.total_tunai}\n`;
  csv += `QRIS,${d.summary.total_qris}\n`;
  csv += `Pengeluaran,${d.summary.total_expense}\n`;
  csv += `Kasbon,${d.summary.total_kasbon}\n`;
  csv += `Laba Kotor,${d.summary.gross_profit}\n\n`;

  csv += 'DAFTAR TRANSAKSI\n';
  csv += 'Invoice,Waktu,Kasir,Subtotal,Diskon,Total,Metode Bayar,Status\n';
  d.transactions.forEach(t => {
    csv += `${t.invoice_number},${t.created_at},${t.cashier_name || ''},${t.subtotal},${t.discount_amount},${t.total},${t.payment_method||''},${t.status}\n`;
  });

  csv += '\nMENU TERLARIS\n';
  csv += 'Menu,Tipe,Terjual,Pendapatan\n';
  d.topMenus.forEach(m => {
    csv += `${m.menu_name},${m.menu_type},${m.total_sold},${m.total_revenue}\n`;
  });

  csv += '\nPENGELUARAN\n';
  csv += 'Tanggal,No,Nama,Kategori,Nominal,Status,Oleh\n';
  d.expenseList.forEach(e => {
    csv += `${e.date},${e.expense_number},${e.name},${e.category},${e.amount},${e.status},${e.created_by_name||''}\n`;
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${BRAND.reportFilePrefix}_${d.period.start}_${d.period.end}.csv`;
  link.click();

  showToast('Laporan diexport ke CSV', 'success');
}
