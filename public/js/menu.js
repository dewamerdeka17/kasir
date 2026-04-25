// Menu Management Page
function renderMenuPage() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading" style="text-align:center;padding:2rem">Memuat...</div>';

  Promise.all([API.get('/api/menus'), API.get('/api/categories')]).then(([menus, cats]) => {
    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <input type="text" id="menu-search" placeholder="🔍 Cari menu..." oninput="filterMenuTable()" style="max-width:300px">
          <select id="menu-filter-type" onchange="filterMenuTable()" style="max-width:150px">
            <option value="">Semua Jenis</option>
            <option value="makanan">Makanan</option>
            <option value="minuman">Minuman</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" onclick="openMenuForm(null, ${JSON.stringify(cats).replace(/"/g, '&quot;')})">+ Tambah Menu</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Nama</th><th>Kategori</th><th>Jenis</th><th>Harga</th><th>Stok</th><th>Status</th><th>Aksi</th>
            </tr></thead>
            <tbody id="menu-table-body">
              ${menus.map(m => `<tr data-name="${m.name.toLowerCase()}" data-type="${m.type}">
                <td><strong>${m.name}</strong></td>
                <td>${m.category_name || '-'}</td>
                <td><span class="badge ${m.type === 'makanan' ? 'badge-warning' : 'badge-info'}">${m.type}</span></td>
                <td>${formatRupiah(m.price)}</td>
                <td>${m.stock}</td>
                <td>${m.is_active ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-muted">Nonaktif</span>'}</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-ghost btn-sm" onclick='openMenuForm(${JSON.stringify(m).replace(/'/g, "\\&#39;")}, ${JSON.stringify(cats).replace(/"/g, "&quot;")})'>Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteMenu(${m.id})">Hapus</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });
}

function filterMenuTable() {
  const search = document.getElementById('menu-search').value.toLowerCase();
  const type = document.getElementById('menu-filter-type').value;
  document.querySelectorAll('#menu-table-body tr').forEach(row => {
    const matchName = row.dataset.name.includes(search);
    const matchType = !type || row.dataset.type === type;
    row.style.display = matchName && matchType ? '' : 'none';
  });
}

function openMenuForm(menu, categories) {
  const isEdit = !!menu;
  showModal(`
    <div class="modal-header">
      <h3>${isEdit ? 'Edit' : 'Tambah'} Menu</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Nama Menu</label>
        <input type="text" id="menu-name" value="${menu?.name || ''}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Kategori</label>
          <select id="menu-category">
            ${categories.map(c => `<option value="${c.id}" ${menu?.category_id == c.id ? 'selected' : ''}>${c.name} (${c.type})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Jenis</label>
          <select id="menu-type">
            <option value="makanan" ${menu?.type === 'makanan' ? 'selected' : ''}>Makanan</option>
            <option value="minuman" ${menu?.type === 'minuman' ? 'selected' : ''}>Minuman</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Harga Jual (Rp)</label>
          <input type="number" id="menu-price" value="${menu?.price || ''}" min="0" required>
        </div>
        ${!isEdit ? `<div class="form-group">
          <label>Stok Awal</label>
          <input type="number" id="menu-stock" value="50" min="0">
        </div>` : ''}
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="menu-active">
          <option value="1" ${menu?.is_active !== 0 ? 'selected' : ''}>Aktif</option>
          <option value="0" ${menu?.is_active === 0 ? 'selected' : ''}>Nonaktif</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveMenu(${menu?.id || 'null'})">${isEdit ? 'Update' : 'Simpan'}</button>
    </div>
  `);
}

async function saveMenu(id) {
  const data = {
    name: document.getElementById('menu-name').value,
    category_id: parseInt(document.getElementById('menu-category').value),
    type: document.getElementById('menu-type').value,
    price: parseFloat(document.getElementById('menu-price').value),
    is_active: parseInt(document.getElementById('menu-active').value),
    initial_stock: document.getElementById('menu-stock')?.value ? parseInt(document.getElementById('menu-stock').value) : undefined
  };

  try {
    if (id) await API.put(`/api/menus/${id}`, data);
    else await API.post('/api/menus', data);
    closeModal();
    showToast(id ? 'Menu diperbarui' : 'Menu ditambahkan', 'success');
    renderMenuPage();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteMenu(id) {
  confirm('Nonaktifkan menu ini?', async () => {
    try {
      await API.del(`/api/menus/${id}`);
      showToast('Menu dinonaktifkan', 'success');
      renderMenuPage();
    } catch (err) { showToast(err.message, 'error'); }
  });
}
