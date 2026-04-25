// Dashboard Page
function renderDashboard() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading" style="text-align:center;padding:3rem">Memuat dashboard...</div>';

  API.get('/api/dashboard').then(data => {
    const t = data.today;
    const tunaiPct = (t.revenue > 0) ? Math.round((data.paymentSummary.tunai / (data.paymentSummary.tunai + data.paymentSummary.qris)) * 100) || 0 : 0;
    const qrisPct = 100 - tunaiPct;

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card accent">
          <div class="stat-label">Omzet Hari Ini</div>
          <div class="stat-value">${formatRupiah(t.revenue)}</div>
          <div class="stat-sub">${t.transactions} transaksi</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">Laba Kotor</div>
          <div class="stat-value">${formatRupiah(t.gross_profit)}</div>
          <div class="stat-sub">Omzet - Pengeluaran</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">Pengeluaran</div>
          <div class="stat-value">${formatRupiah(t.expenses)}</div>
          <div class="stat-sub">Hari ini</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-label">Kasbon</div>
          <div class="stat-value">${formatRupiah(t.kasbon)}</div>
          <div class="stat-sub">Hari ini</div>
        </div>
        <div class="stat-card info">
          <div class="stat-label">Total Diskon</div>
          <div class="stat-value">${formatRupiah(t.discount)}</div>
          <div class="stat-sub">Hari ini</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <!-- Sales Chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Penjualan 7 Hari Terakhir</h3>
          </div>
          <div class="chart-container" id="sales-chart"></div>
        </div>

        <!-- Payment Summary -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">💳 Metode Pembayaran</h3>
          </div>
          <div class="payment-dist">
            <div class="payment-bar-wrapper">
              <div class="payment-bar">
                <div class="payment-bar-tunai" style="width:${tunaiPct}%"></div>
                <div class="payment-bar-qris" style="width:${qrisPct}%"></div>
              </div>
              <div class="payment-legend">
                <div class="payment-legend-item">
                  <div class="payment-legend-dot tunai"></div>
                  <span>Tunai: ${formatRupiah(data.paymentSummary.tunai)}</span>
                </div>
                <div class="payment-legend-item">
                  <div class="payment-legend-dot qris"></div>
                  <span>QRIS: ${formatRupiah(data.paymentSummary.qris)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Menus -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">🔥 Menu Terlaris Hari Ini</h3>
          </div>
          ${data.topMenus.length > 0 ? data.topMenus.map((m, i) => `
            <div class="list-item">
              <div class="list-item-info">
                <div class="list-item-rank">${i + 1}</div>
                <div>
                  <div class="list-item-name">${m.menu_name}</div>
                  <div class="list-item-sub">${formatRupiah(m.total_revenue)}</div>
                </div>
              </div>
              <div>
                <div class="list-item-value">${m.total_sold}x</div>
                <div class="list-item-value-sub">terjual</div>
              </div>
            </div>
          `).join('') : '<div class="empty-state"><p>Belum ada penjualan hari ini</p></div>'}
        </div>

        <!-- Low Stock -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">⚠️ Stok Menipis</h3>
          </div>
          ${data.lowStockIngredients.length > 0 ? data.lowStockIngredients.map(s => `
            <div class="alert-item">
              <span class="alert-icon">📦</span>
              <span class="alert-item-name">${s.name}</span>
              <span class="alert-item-stock">${s.current_stock} ${s.unit}</span>
            </div>
          `).join('') : ''}
          ${data.lowStockMenus.length > 0 ? data.lowStockMenus.map(s => `
            <div class="alert-item">
              <span class="alert-icon">🍽️</span>
              <span class="alert-item-name">${s.name}</span>
              <span class="alert-item-stock">${s.current_stock} porsi</span>
            </div>
          `).join('') : ''}
          ${data.lowStockIngredients.length === 0 && data.lowStockMenus.length === 0 ?
            '<div class="empty-state"><p>Semua stok aman 👍</p></div>' : ''}
        </div>
      </div>
    `;

    // Render sales chart
    renderSalesChart(data.salesChart);
  }).catch(err => {
    content.innerHTML = `<div class="empty-state"><h3>Gagal memuat dashboard</h3><p>${err.message}</p></div>`;
  });
}

function renderSalesChart(data) {
  const container = document.getElementById('sales-chart');
  if (!container || data.length === 0) {
    if (container) container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">Belum ada data</div>';
    return;
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue));

  // Fill 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const found = data.find(x => x.date === dateStr);
    days.push({
      date: d.toLocaleDateString('id-ID', { weekday: 'short' }),
      revenue: found ? found.revenue : 0,
      count: found ? found.count : 0
    });
  }

  container.innerHTML = days.map(d => {
    const height = maxRevenue > 0 ? Math.max(4, (d.revenue / maxRevenue) * 160) : 4;
    return `<div class="chart-bar" style="height:${height}px" title="${formatRupiah(d.revenue)}">
      <span class="chart-bar-value">${d.revenue > 0 ? formatRupiah(d.revenue) : ''}</span>
      <span class="chart-bar-label">${d.date}</span>
    </div>`;
  }).join('');
}
