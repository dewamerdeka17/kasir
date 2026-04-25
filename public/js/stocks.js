// Stock Management Page
function renderStocksPage() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="tabs">
      <button class="tab active" onclick="switchStockTab('menu', this)">📦 Stok Menu</button>
      <button class="tab" onclick="switchStockTab('ingredients', this)">🧪 Stok Bahan</button>
      <button class="tab" onclick="switchStockTab('history', this)">📋 Riwayat</button>
    </div>
    <div id="stock-tab-content"></div>
  `;
  loadStockMenuTab();
}

function switchStockTab(tab, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  if (tab === 'menu') loadStockMenuTab();
  else if (tab === 'ingredients') loadStockIngredientsTab();
  else loadStockHistoryTab();
}

function loadStockMenuTab() {
  const cont = document.getElementById('stock-tab-content');
  API.get('/api/stocks/menu').then(stocks => {
    cont.innerHTML = `
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Menu</th><th>Jenis</th><th>Kategori</th><th>Stok</th><th>Min</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${stocks.map(s => {
                const isLow = s.current_stock <= s.min_stock;
                return `<tr>
                  <td><strong>${s.name}</strong></td>
                  <td><span class="badge ${s.type==='makanan'?'badge-warning':'badge-info'}">${s.type}</span></td>
                  <td>${s.category_name}</td>
                  <td><strong>${s.current_stock}</strong></td>
                  <td>${s.min_stock}</td>
                  <td>${isLow ? '<span class="badge badge-danger">Menipis</span>' : '<span class="badge badge-success">Aman</span>'}</td>
                  <td><button class="btn btn-ghost btn-sm" onclick="openStockAdjust('menu', ${s.id}, '${s.name}', ${s.current_stock})">Adjust</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  });
}

function loadStockIngredientsTab() {
  const cont = document.getElementById('stock-tab-content');
  API.get('/api/stocks/ingredients').then(stocks => {
    cont.innerHTML = `
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Bahan</th><th>Satuan</th><th>Stok</th><th>Min</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${stocks.map(s => {
                const isLow = s.current_stock <= s.min_stock;
                return `<tr>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.unit}</td>
                  <td><strong>${s.current_stock}</strong></td>
                  <td>${s.min_stock}</td>
                  <td>${isLow ? '<span class="badge badge-danger">Menipis</span>' : '<span class="badge badge-success">Aman</span>'}</td>
                  <td><button class="btn btn-ghost btn-sm" onclick="openStockAdjust('ingredients', ${s.id}, '${s.name}', ${s.current_stock})">Adjust</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  });
}

function loadStockHistoryTab() {
  const cont = document.getElementById('stock-tab-content');
  API.get('/api/stocks/movements?limit=100').then(movements => {
    cont.innerHTML = `
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Waktu</th><th>Tipe</th><th>Item</th><th>Pergerakan</th><th>Qty</th><th>Stok Lama → Baru</th><th>Alasan</th><th>Oleh</th></tr></thead>
            <tbody>
              ${movements.map(m => `<tr>
                <td>${formatDateTime(m.created_at)}</td>
                <td><span class="badge badge-muted">${m.type}</span></td>
                <td>${m.item_name || '-'}</td>
                <td><span class="badge ${m.movement_type==='in'?'badge-success':m.movement_type==='out'?'badge-danger':'badge-warning'}">${m.movement_type}</span></td>
                <td>${m.quantity}</td>
                <td>${m.previous_stock} → ${m.new_stock}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${m.reason || '-'}</td>
                <td>${m.created_by_name || '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  });
}

function openStockAdjust(type, refId, name, currentStock) {
  const endpoint = type === 'menu' ? '/api/stocks/menu/adjust' : '/api/stocks/ingredients/adjust';
  const idField = type === 'menu' ? 'menu_id' : 'ingredient_id';

  showModal(`
    <div class="modal-header">
      <h3>Penyesuaian Stok: ${name}</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:1rem">Stok saat ini: <strong>${currentStock}</strong></p>
      <div class="form-group">
        <label>Tipe</label>
        <select id="adj-type">
          <option value="in">Stok Masuk (+)</option>
          <option value="out">Stok Keluar (-)</option>
          <option value="adjustment">Set Manual</option>
        </select>
      </div>
      <div class="form-group"><label>Jumlah</label><input type="number" id="adj-qty" min="0" step="0.01" placeholder="Jumlah"></div>
      <div class="form-group"><label>Alasan</label><input type="text" id="adj-reason" placeholder="Restok, rusak, dll"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveStockAdjust('${endpoint}', '${idField}', ${refId})">Simpan</button>
    </div>
  `);
}

async function saveStockAdjust(endpoint, idField, refId) {
  const data = {
    [idField]: refId,
    movement_type: document.getElementById('adj-type').value,
    quantity: parseFloat(document.getElementById('adj-qty').value) || 0,
    reason: document.getElementById('adj-reason').value
  };
  try {
    await API.post(endpoint, data);
    closeModal(); showToast('Stok disesuaikan', 'success'); renderStocksPage();
  } catch(e) { showToast(e.message, 'error'); }
}
