// POS / Kasir Page
let posCart = [];
let posMenus = [];
let posCategories = [];
let posDiscounts = [];
let posTxDiscount = null;
let posTableNumber = '';

function renderPos() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Memuat POS...</p></div>';

  Promise.all([
    API.get('/api/menus?active_only=1'),
    API.get('/api/categories'),
    API.get('/api/discounts?active_only=1')
  ]).then(([menus, cats, discs]) => {
    posMenus = menus;
    posCategories = cats.filter(c => c.is_active);
    posDiscounts = discs;

    content.innerHTML = `
      <div class="pos-layout">
        <!-- Menu Panel -->
        <div class="pos-menu-panel">
          <div class="pos-search-bar">
            <input type="text" id="pos-search" placeholder="🔍 Cari menu..." oninput="filterPosMenus()">
            <select id="pos-type-filter" onchange="filterPosMenus()">
              <option value="">Semua Jenis</option>
              <option value="makanan">🍽️ Makanan</option>
              <option value="minuman">🧊 Minuman</option>
            </select>
          </div>
          <div class="pos-category-filter" id="pos-category-filter">
            <button class="category-chip active" data-cat="" onclick="filterByCategory(this)">Semua</button>
            ${posCategories.map(c => `
              <button class="category-chip" data-cat="${c.id}" onclick="filterByCategory(this)">
                ${c.type === 'makanan' ? '🍽️' : '🧊'} ${c.name}
              </button>
            `).join('')}
          </div>
          <div class="pos-menu-grid" id="pos-menu-grid"></div>
        </div>

        <!-- Cart -->
        <div class="pos-cart">
          <div class="cart-header">
            <h3>🛒 Keranjang</h3>
            <span class="cart-order-number" id="cart-item-count">0 item</span>
          </div>
          <!-- Nomor Meja -->
          <div class="cart-table-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="flex-shrink:0;opacity:0.6"><rect x="3" y="11" width="18" height="11" rx="1"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <input type="text" id="pos-table-number" placeholder="Nomor Meja (opsional)" 
              style="flex:1;background:transparent;border:none;border-bottom:1px solid var(--border);border-radius:0;padding:0.3rem 0.5rem;font-size:0.85rem"
              oninput="posTableNumber=this.value">
          </div>
          <div class="cart-items" id="cart-items">
            <div class="cart-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="64" height="64"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              <p>Keranjang kosong</p>
              <p style="font-size:0.8rem">Pilih menu untuk memulai</p>
            </div>
          </div>
          <div class="cart-summary" id="cart-summary" style="display:none">
            <div class="cart-summary-row">
              <span>Subtotal</span>
              <span id="cart-subtotal">Rp 0</span>
            </div>
            <div class="cart-summary-row discount-line" id="cart-discount-row" style="display:none">
              <span id="cart-discount-label">Diskon</span>
              <span id="cart-discount-value">-Rp 0</span>
            </div>
            <div class="cart-summary-row total">
              <span>Total</span>
              <span id="cart-total">Rp 0</span>
            </div>
          </div>
          <div class="cart-actions" id="cart-actions" style="display:none">
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-ghost btn-sm" style="flex:1" onclick="addTransactionDiscount()">🏷️ Diskon</button>
              <button class="btn btn-ghost btn-sm" onclick="clearCart()">🗑️</button>
            </div>
            <div class="cart-pay-buttons">
              <button class="btn btn-success" onclick="openPayment('tunai')">💵 Tunai</button>
              <button class="btn btn-primary" onclick="openPayment('qris')">📱 QRIS</button>
            </div>
          </div>
        </div>
      </div>
    `;

    renderPosMenuGrid();
  }).catch(err => {
    content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  });
}

function filterPosMenus() {
  renderPosMenuGrid();
}

function filterByCategory(btn) {
  document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderPosMenuGrid();
}

function renderPosMenuGrid() {
  const grid = document.getElementById('pos-menu-grid');
  if (!grid) return;

  const search = document.getElementById('pos-search')?.value?.toLowerCase() || '';
  const typeFilter = document.getElementById('pos-type-filter')?.value || '';
  const catFilter = document.querySelector('.category-chip.active')?.dataset.cat || '';

  let filtered = posMenus.filter(m => {
    if (search && !m.name.toLowerCase().includes(search)) return false;
    if (typeFilter && m.type !== typeFilter) return false;
    if (catFilter && m.category_id != catFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>Menu tidak ditemukan</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(m => {
    const emoji = getMenuEmoji(m.type, m.category_name);
    const outOfStock = m.stock <= 0;
    return `
      <div class="menu-card ${outOfStock ? 'out-of-stock' : ''}" onclick="addToCart(${m.id})">
        <div class="menu-card-type ${m.type}"></div>
        <span class="menu-card-emoji">${emoji}</span>
        <div class="menu-card-name">${m.name}</div>
        <div class="menu-card-price">${formatRupiah(m.price)}</div>
        <div class="menu-card-stock">${outOfStock ? 'Habis' : `Stok: ${m.stock}`}</div>
      </div>
    `;
  }).join('');
}

function addToCart(menuId) {
  const menu = posMenus.find(m => m.id === menuId);
  if (!menu || menu.stock <= 0) return;

  const existing = posCart.find(c => c.menu_id === menuId);
  if (existing) {
    existing.quantity++;
  } else {
    posCart.push({
      menu_id: menu.id,
      name: menu.name,
      type: menu.type,
      price: menu.price,
      quantity: 1,
      notes: '',
      discount_type: null,
      discount_value: 0,
      category_name: menu.category_name
    });
  }

  updateCartUI();
}

function updateCartUI() {
  const itemsContainer = document.getElementById('cart-items');
  const summary = document.getElementById('cart-summary');
  const actions = document.getElementById('cart-actions');
  const countEl = document.getElementById('cart-item-count');

  if (posCart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="64" height="64"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        <p>Keranjang kosong</p>
        <p style="font-size:0.8rem">Pilih menu untuk memulai</p>
      </div>`;
    summary.style.display = 'none';
    actions.style.display = 'none';
    countEl.textContent = '0 item';
    return;
  }

  const totalItems = posCart.reduce((s, c) => s + c.quantity, 0);
  countEl.textContent = `${totalItems} item`;

  itemsContainer.innerHTML = posCart.map((item, idx) => {
    const lineTotal = item.price * item.quantity;
    let discountAmt = 0;
    if (item.discount_type === 'percentage') discountAmt = lineTotal * (item.discount_value / 100);
    else if (item.discount_type === 'nominal') discountAmt = Math.min(item.discount_value, lineTotal);

    return `
      <div class="cart-item">
        <div class="cart-item-header">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-price">${formatRupiah(lineTotal - discountAmt)}</span>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
          <span style="flex:1;font-size:0.8rem;color:var(--text-muted)">@ ${formatRupiah(item.price)}</span>
          <div class="cart-item-actions">
            <button class="btn-icon" title="Catatan" onclick="editItemNote(${idx})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon" title="Diskon" onclick="editItemDiscount(${idx})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="9" cy="9" r="2"/><circle cx="15" cy="15" r="2"/><line x1="5" y1="19" x2="19" y2="5"/></svg>
            </button>
            <button class="btn-icon" title="Hapus" onclick="removeFromCart(${idx})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
        ${item.notes ? `<div class="cart-item-note">📝 ${item.notes}</div>` : ''}
        ${discountAmt > 0 ? `<div class="cart-item-discount-info">🏷️ Diskon: -${formatRupiah(discountAmt)}</div>` : ''}
      </div>
    `;
  }).join('');

  // Calculate totals
  let subtotal = 0;
  let totalItemDiscount = 0;

  posCart.forEach(item => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;
    if (item.discount_type === 'percentage') totalItemDiscount += lineTotal * (item.discount_value / 100);
    else if (item.discount_type === 'nominal') totalItemDiscount += Math.min(item.discount_value, lineTotal);
  });

  let txDiscountAmt = 0;
  if (posTxDiscount) {
    if (posTxDiscount.type === 'percentage') txDiscountAmt = subtotal * (posTxDiscount.value / 100);
    else txDiscountAmt = Math.min(posTxDiscount.value, subtotal);
  }

  const total = subtotal - totalItemDiscount - txDiscountAmt;

  document.getElementById('cart-subtotal').textContent = formatRupiah(subtotal);
  document.getElementById('cart-total').textContent = formatRupiah(total);

  const discRow = document.getElementById('cart-discount-row');
  if (totalItemDiscount + txDiscountAmt > 0) {
    discRow.style.display = 'flex';
    document.getElementById('cart-discount-label').textContent = 'Diskon';
    document.getElementById('cart-discount-value').textContent = `-${formatRupiah(totalItemDiscount + txDiscountAmt)}`;
  } else {
    discRow.style.display = 'none';
  }

  summary.style.display = 'block';
  actions.style.display = 'flex';
}

function changeQty(idx, delta) {
  posCart[idx].quantity += delta;
  if (posCart[idx].quantity <= 0) posCart.splice(idx, 1);
  updateCartUI();
}

function removeFromCart(idx) {
  posCart.splice(idx, 1);
  updateCartUI();
}

function clearCart() {
  if (posCart.length === 0) return;
  confirm('Hapus semua item dari keranjang?', () => {
    posCart = [];
    posTxDiscount = null;
    posTableNumber = '';
    const tableInput = document.getElementById('pos-table-number');
    if (tableInput) tableInput.value = '';
    updateCartUI();
  });
}

function editItemNote(idx) {
  const item = posCart[idx];
  showModal(`
    <div class="modal-header">
      <h3>Catatan: ${item.name}</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Catatan khusus (pedas, tanpa es, less sugar, dll)</label>
        <input type="text" id="item-note-input" value="${item.notes}" placeholder="Masukkan catatan...">
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('item-note-input').value+=' Pedas'">🌶️ Pedas</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('item-note-input').value+=' Tanpa Es'">🧊 Tanpa Es</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('item-note-input').value+=' Less Sugar'">🍯 Less Sugar</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('item-note-input').value+=' Extra Shot'">☕ Extra Shot</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveItemNote(${idx})">Simpan</button>
    </div>
  `);
  setTimeout(() => document.getElementById('item-note-input')?.focus(), 100);
}

function saveItemNote(idx) {
  posCart[idx].notes = document.getElementById('item-note-input').value.trim();
  closeModal();
  updateCartUI();
}

function editItemDiscount(idx) {
  const item = posCart[idx];
  const disc = posDiscounts.filter(d => d.scope === 'item');

  showModal(`
    <div class="modal-header">
      <h3>Diskon: ${item.name}</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      ${disc.length > 0 ? `
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.75rem">Pilih diskon:</p>
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem">
          ${disc.map(d => `
            <button class="btn btn-ghost" style="justify-content:space-between" onclick="applyItemDiscount(${idx}, '${d.type}', ${d.value})">
              <span>${d.name}</span>
              <span class="badge badge-accent">${d.type === 'percentage' ? d.value + '%' : formatRupiah(d.value)}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.5rem">Atau input manual:</p>
      <div class="form-row">
        <div class="form-group">
          <label>Tipe</label>
          <select id="item-disc-type">
            <option value="nominal" ${item.discount_type === 'nominal' ? 'selected' : ''}>Nominal (Rp)</option>
            <option value="percentage" ${item.discount_type === 'percentage' ? 'selected' : ''}>Persentase (%)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Nilai</label>
          <input type="number" id="item-disc-value" value="${item.discount_value || ''}" min="0" placeholder="0">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="removeItemDiscount(${idx})">Hapus Diskon</button>
      <button class="btn btn-primary" onclick="saveItemDiscount(${idx})">Terapkan</button>
    </div>
  `);
}

function applyItemDiscount(idx, type, value) {
  posCart[idx].discount_type = type;
  posCart[idx].discount_value = value;
  closeModal();
  updateCartUI();
  showToast('Diskon diterapkan', 'success');
}

function saveItemDiscount(idx) {
  posCart[idx].discount_type = document.getElementById('item-disc-type').value;
  posCart[idx].discount_value = parseFloat(document.getElementById('item-disc-value').value) || 0;
  closeModal();
  updateCartUI();
}

function removeItemDiscount(idx) {
  posCart[idx].discount_type = null;
  posCart[idx].discount_value = 0;
  closeModal();
  updateCartUI();
}

function addTransactionDiscount() {
  const disc = posDiscounts.filter(d => d.scope === 'transaction');

  showModal(`
    <div class="modal-header">
      <h3>Diskon Transaksi</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      ${disc.length > 0 ? `
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem">
          ${disc.map(d => `
            <button class="btn btn-ghost" style="justify-content:space-between" onclick="applyTxDiscount('${d.type}', ${d.value})">
              <span>${d.name}</span>
              <span class="badge badge-accent">${d.type === 'percentage' ? d.value + '%' : formatRupiah(d.value)}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.5rem">Input manual:</p>
      <div class="form-row">
        <div class="form-group">
          <label>Tipe</label>
          <select id="tx-disc-type">
            <option value="nominal">Nominal (Rp)</option>
            <option value="percentage">Persentase (%)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Nilai</label>
          <input type="number" id="tx-disc-value" min="0" placeholder="0">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="removeTxDiscount()">Hapus</button>
      <button class="btn btn-primary" onclick="saveTxDiscount()">Terapkan</button>
    </div>
  `);
}

function applyTxDiscount(type, value) {
  posTxDiscount = { type, value };
  closeModal();
  updateCartUI();
  showToast('Diskon transaksi diterapkan', 'success');
}

function saveTxDiscount() {
  const type = document.getElementById('tx-disc-type').value;
  const value = parseFloat(document.getElementById('tx-disc-value').value) || 0;
  if (value > 0) posTxDiscount = { type, value };
  closeModal();
  updateCartUI();
}

function removeTxDiscount() {
  posTxDiscount = null;
  closeModal();
  updateCartUI();
}

function openPayment(method) {
  if (posCart.length === 0) return;

  // Calculate total
  let subtotal = 0, totalItemDiscount = 0;
  posCart.forEach(item => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;
    if (item.discount_type === 'percentage') totalItemDiscount += lineTotal * (item.discount_value / 100);
    else if (item.discount_type === 'nominal') totalItemDiscount += Math.min(item.discount_value, lineTotal);
  });

  let txDiscountAmt = 0;
  if (posTxDiscount) {
    if (posTxDiscount.type === 'percentage') txDiscountAmt = subtotal * (posTxDiscount.value / 100);
    else txDiscountAmt = Math.min(posTxDiscount.value, subtotal);
  }
  const total = subtotal - totalItemDiscount - txDiscountAmt;

  if (method === 'tunai') {
    showModal(`
      <div class="modal-header">
        <h3>💵 Pembayaran Tunai</h3>
        <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="payment-total-display">${formatRupiah(total)}</div>
        <div class="form-group">
          <label>Uang Diterima</label>
          <input type="number" id="pay-amount" min="${total}" step="1000" placeholder="Masukkan nominal..." oninput="calcChange(${total})" autofocus style="font-size:1.2rem;font-weight:700;text-align:center">
        </div>
        <div id="change-display" class="change-display" style="display:none">
          <div class="change-label">Kembalian</div>
          <div class="change-value" id="change-value">Rp 0</div>
        </div>
        <div class="numpad">
          <button class="numpad-btn quick-amount" onclick="setPayAmount(${total})">Uang Pas</button>
          <button class="numpad-btn quick-amount" onclick="setPayAmount(${Math.ceil(total / 5000) * 5000})">~${formatRupiah(Math.ceil(total / 5000) * 5000)}</button>
          <button class="numpad-btn quick-amount" onclick="setPayAmount(${Math.ceil(total / 10000) * 10000})">~${formatRupiah(Math.ceil(total / 10000) * 10000)}</button>
          <button class="numpad-btn quick-amount" onclick="setPayAmount(50000)">50rb</button>
          <button class="numpad-btn quick-amount" onclick="setPayAmount(100000)">100rb</button>
          <button class="numpad-btn quick-amount" onclick="setPayAmount(200000)">200rb</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
        <button class="btn btn-success btn-full" id="pay-confirm-btn" onclick="processPayment('tunai', ${total})" disabled>Bayar</button>
      </div>
    `, 'modal-lg');
    setTimeout(() => document.getElementById('pay-amount')?.focus(), 100);
  } else {
    // Load QRIS image from settings
    API.get('/api/settings').then(settings => {
      const qrisImg = settings?.qris_image;
      const qrisSrc = qrisImg ? `${qrisImg}?t=${Date.now()}` : null;

      const qrisContent = qrisSrc
        ? `<div class="qris-payment-wrapper">
             <div class="qris-img-container" onclick="openQrisFullscreen('${qrisSrc}')" title="Klik untuk perbesar">
               <img src="${qrisSrc}" alt="QRIS" class="qris-payment-img">
               <div class="qris-zoom-hint">🔍 Klik untuk perbesar</div>
             </div>
             <p class="qris-scan-label">Scan QR Code untuk membayar</p>
             <button class="btn btn-ghost btn-sm qris-fullscreen-btn" onclick="openQrisFullscreen('${qrisSrc}')">
               ⛶ Perbesar QRIS
             </button>
           </div>`
        : `<div style="padding:2rem;background:var(--bg-secondary);border-radius:var(--radius-lg);display:inline-block;margin:1rem auto;border:2px dashed var(--border)">
             <div style="font-size:4rem;opacity:0.4">📱</div>
             <p style="color:var(--text-muted);font-size:0.85rem;margin-top:0.5rem">QRIS belum diatur</p>
             <p style="color:var(--text-muted);font-size:0.78rem">Atur di menu Printer &amp; Pengaturan</p>
           </div>`;

      showModal(`
        <div class="modal-header">
          <h3>📱 Pembayaran QRIS</h3>
          <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="modal-body" style="text-align:center">
          <div class="payment-total-display">${formatRupiah(total)}</div>
          ${qrisContent}
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
          <button class="btn btn-primary btn-full" onclick="processPayment('qris', ${total})">✅ Konfirmasi Pembayaran QRIS</button>
        </div>
      `);
    }).catch(() => {
      showModal(`
        <div class="modal-header">
          <h3>📱 Pembayaran QRIS</h3>
          <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="modal-body" style="text-align:center">
          <div class="payment-total-display">${formatRupiah(total)}</div>
          <div style="font-size:5rem;margin:1rem 0">📱</div>
          <p style="color:var(--text-secondary)">Scan QR Code untuk membayar</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
          <button class="btn btn-primary btn-full" onclick="processPayment('qris', ${total})">✅ Konfirmasi Pembayaran</button>
        </div>
      `);
    });
  }
}

function setPayAmount(amount) {
  const input = document.getElementById('pay-amount');
  input.value = amount;
  const total = parseFloat(input.min);
  calcChange(total);
}

function calcChange(total) {
  const paid = parseFloat(document.getElementById('pay-amount').value) || 0;
  const change = paid - total;
  const changeDisplay = document.getElementById('change-display');
  const btn = document.getElementById('pay-confirm-btn');

  if (paid >= total) {
    changeDisplay.style.display = 'block';
    document.getElementById('change-value').textContent = formatRupiah(change);
    btn.disabled = false;
  } else {
    changeDisplay.style.display = 'none';
    btn.disabled = true;
  }
}

async function processPayment(method, total) {
  try {
    // 1. Create transaction
    const txData = {
      items: posCart.map(item => ({
        menu_id: item.menu_id,
        quantity: item.quantity,
        notes: item.notes,
        discount_type: item.discount_type,
        discount_value: item.discount_value
      })),
      discount_type: posTxDiscount?.type || null,
      discount_value: posTxDiscount?.value || 0,
      table_number: posTableNumber || null
    };

    const tx = await API.post('/api/transactions', txData);

    // 2. Process payment
    const payData = {
      method,
      amount_paid: method === 'tunai' ? parseFloat(document.getElementById('pay-amount')?.value || total) : total
    };

    const payResult = await API.post(`/api/transactions/${tx.id}/pay`, payData);

    closeModal();

    // 3. Show success & print
    const changeText = method === 'tunai' && payResult.payment.change > 0
      ? `<div class="change-display" style="margin-top:1rem"><div class="change-label">Kembalian</div><div class="change-value">${formatRupiah(payResult.payment.change)}</div></div>`
      : '';

    showModal(`
      <div class="modal-body" style="text-align:center;padding:2.5rem">
        <div style="font-size:4rem;margin-bottom:1rem">✅</div>
        <h2 style="margin-bottom:0.5rem">Pembayaran Berhasil!</h2>
        <p style="color:var(--text-secondary)">${tx.invoice_number}</p>
        <div class="payment-total-display">${formatRupiah(total)}</div>
        <p><span class="badge badge-info">${method.toUpperCase()}</span></p>
        ${changeText}
        <div style="display:flex;gap:0.75rem;margin-top:1.5rem;justify-content:center">
          <button class="btn btn-ghost" onclick="closeModal()">Tutup</button>
          <button class="btn btn-primary" onclick="PrintUtil.printSplit(${tx.id}); closeModal()">🖨️ Cetak Struk</button>
        </div>
      </div>
    `);

    // Clear cart
    posCart = [];
    posTxDiscount = null;
    updateCartUI();

    // Refresh menus to update stock
    API.get('/api/menus?active_only=1').then(menus => {
      posMenus = menus;
      renderPosMenuGrid();
    });

    showToast('Transaksi berhasil! 🎉', 'success');
  } catch (err) {
    showToast('Gagal memproses pembayaran: ' + err.message, 'error');
  }
}

// =============================================
// QRIS Fullscreen Overlay
// =============================================
function openQrisFullscreen(src) {
  // Hapus overlay lama jika ada
  const existing = document.getElementById('qris-fullscreen-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'qris-fullscreen-overlay';
  overlay.className = 'qris-fullscreen-overlay';
  overlay.innerHTML = `
    <div class="qris-fullscreen-inner" onclick="event.stopPropagation()">
      <div class="qris-fullscreen-header">
        <span style="font-weight:600;font-size:1rem">📱 QRIS — Scan untuk Membayar</span>
        <button class="btn-icon" id="qris-fs-close" onclick="closeQrisFullscreen()" style="color:#fff">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="qris-fullscreen-img-wrap">
        <img src="${src}" alt="QRIS" class="qris-fullscreen-img">
      </div>
      <p class="qris-fullscreen-hint">Arahkan kamera ke QR Code di atas</p>
    </div>
  `;
  // Klik area gelap untuk tutup
  overlay.addEventListener('click', closeQrisFullscreen);
  document.body.appendChild(overlay);
  // Animasi masuk
  requestAnimationFrame(() => overlay.classList.add('qris-fs-visible'));
  // ESC untuk tutup
  document.addEventListener('keydown', _qrisEscHandler);
}

function closeQrisFullscreen() {
  const overlay = document.getElementById('qris-fullscreen-overlay');
  if (!overlay) return;
  overlay.classList.remove('qris-fs-visible');
  setTimeout(() => overlay.remove(), 220);
  document.removeEventListener('keydown', _qrisEscHandler);
}

function _qrisEscHandler(e) {
  if (e.key === 'Escape') closeQrisFullscreen();
}
