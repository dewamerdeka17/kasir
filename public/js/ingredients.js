// Ingredients Management Page
function renderIngredientsPage() {
  const content = document.getElementById('page-content');
  API.get('/api/ingredients').then(items => {
    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left"><h3 style="font-size:1rem">Daftar Bahan Baku</h3></div>
        <div class="toolbar-right"><button class="btn btn-primary" onclick="openIngredientForm()">+ Tambah Bahan</button></div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Nama</th><th>Satuan</th><th>Stok Saat Ini</th><th>Min. Stok</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              ${items.map(i => {
                const isLow = i.current_stock <= i.min_stock;
                return `<tr>
                  <td><strong>${i.name}</strong></td>
                  <td>${i.unit}</td>
                  <td>${i.current_stock}</td>
                  <td>${i.min_stock}</td>
                  <td>${isLow ? '<span class="badge badge-danger">Menipis</span>' : '<span class="badge badge-success">Aman</span>'}</td>
                  <td><div class="btn-group">
                    <button class="btn btn-ghost btn-sm" onclick='openIngredientForm(${JSON.stringify(i)})'>Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteIngredient(${i.id})">Hapus</button>
                  </div></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  });
}

function openIngredientForm(ing) {
  showModal(`
    <div class="modal-header">
      <h3>${ing ? 'Edit' : 'Tambah'} Bahan Baku</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Nama Bahan</label><input type="text" id="ing-name" value="${ing?.name || ''}"></div>
      <div class="form-row">
        <div class="form-group"><label>Satuan</label>
          <select id="ing-unit"><option ${ing?.unit==='kg'?'selected':''}>kg</option><option ${ing?.unit==='gram'?'selected':''}>gram</option><option ${ing?.unit==='liter'?'selected':''}>liter</option><option ${ing?.unit==='ml'?'selected':''}>ml</option><option ${ing?.unit==='pcs'?'selected':''}>pcs</option></select>
        </div>
        <div class="form-group"><label>Min. Stok</label><input type="number" id="ing-min" value="${ing?.min_stock || 0}" min="0"></div>
      </div>
      ${!ing ? '<div class="form-group"><label>Stok Awal</label><input type="number" id="ing-initial" value="0" min="0"></div>' : ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveIngredient(${ing?.id || 'null'})">Simpan</button>
    </div>`);
}

async function saveIngredient(id) {
  const data = { name: document.getElementById('ing-name').value, unit: document.getElementById('ing-unit').value, min_stock: parseFloat(document.getElementById('ing-min').value) || 0, initial_stock: document.getElementById('ing-initial')?.value ? parseFloat(document.getElementById('ing-initial').value) : undefined };
  try {
    if (id) await API.put(`/api/ingredients/${id}`, data);
    else await API.post('/api/ingredients', data);
    closeModal(); showToast('Bahan disimpan', 'success'); renderIngredientsPage();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteIngredient(id) {
  confirm('Hapus bahan ini?', async () => {
    try { await API.del(`/api/ingredients/${id}`); showToast('Bahan dihapus', 'success'); renderIngredientsPage(); }
    catch(e) { showToast(e.message, 'error'); }
  });
}
