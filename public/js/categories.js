// Categories Management Page
function renderCategoriesPage() {
  const content = document.getElementById('page-content');
  API.get('/api/categories').then(cats => {
    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left"><h3 style="font-size:1rem">Daftar Kategori Menu</h3></div>
        <div class="toolbar-right">
          <button class="btn btn-primary" onclick="openCategoryForm()">+ Tambah Kategori</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Nama</th><th>Tipe</th><th>Deskripsi</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${cats.map(c => `<tr>
                <td><strong>${c.name}</strong></td>
                <td><span class="badge ${c.type === 'makanan' ? 'badge-warning' : 'badge-info'}">${c.type}</span></td>
                <td>${c.description || '-'}</td>
                <td>${c.is_active ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-muted">Nonaktif</span>'}</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-ghost btn-sm" onclick='openCategoryForm(${JSON.stringify(c)})'>Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCategory(${c.id})">Hapus</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  });
}

function openCategoryForm(cat) {
  showModal(`
    <div class="modal-header">
      <h3>${cat ? 'Edit' : 'Tambah'} Kategori</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Nama</label><input type="text" id="cat-name" value="${cat?.name || ''}"></div>
      <div class="form-group"><label>Tipe</label>
        <select id="cat-type"><option value="makanan" ${cat?.type==='makanan'?'selected':''}>Makanan</option><option value="minuman" ${cat?.type==='minuman'?'selected':''}>Minuman</option></select>
      </div>
      <div class="form-group"><label>Deskripsi</label><input type="text" id="cat-desc" value="${cat?.description || ''}"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveCategory(${cat?.id || 'null'})">Simpan</button>
    </div>`);
}

async function saveCategory(id) {
  const data = { name: document.getElementById('cat-name').value, type: document.getElementById('cat-type').value, description: document.getElementById('cat-desc').value, is_active: 1 };
  try {
    if (id) await API.put(`/api/categories/${id}`, data);
    else await API.post('/api/categories', data);
    closeModal(); showToast('Kategori disimpan', 'success'); renderCategoriesPage();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteCategory(id) {
  confirm('Hapus kategori ini?', async () => {
    try { await API.del(`/api/categories/${id}`); showToast('Kategori dihapus', 'success'); renderCategoriesPage(); }
    catch(e) { showToast(e.message, 'error'); }
  });
}
