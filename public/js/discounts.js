// Discounts Page
function renderDiscountsPage() {
  const content = document.getElementById('page-content');
  API.get('/api/discounts').then(discs => {
    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left"><h3 style="font-size:1rem">Manajemen Diskon</h3></div>
        <div class="toolbar-right"><button class="btn btn-primary" onclick="openDiscountForm()">+ Tambah Diskon</button></div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Nama</th><th>Tipe</th><th>Nilai</th><th>Lingkup</th><th>Status</th><th>Dibuat Oleh</th><th>Aksi</th></tr></thead>
            <tbody>
              ${discs.map(d => `<tr>
                <td><strong>${d.name}</strong></td>
                <td><span class="badge badge-accent">${d.type}</span></td>
                <td><strong>${d.type === 'percentage' ? d.value + '%' : formatRupiah(d.value)}</strong></td>
                <td>${d.scope === 'item' ? '📍 Per Item' : '🧾 Per Transaksi'}</td>
                <td>${d.is_active ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-muted">Nonaktif</span>'}</td>
                <td>${d.created_by_name || '-'}</td>
                <td><div class="btn-group">
                  <button class="btn btn-ghost btn-sm" onclick='openDiscountForm(${JSON.stringify(d)})'>Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteDiscount(${d.id})">Hapus</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  });
}

function openDiscountForm(disc) {
  showModal(`
    <div class="modal-header">
      <h3>${disc ? 'Edit' : 'Tambah'} Diskon</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Nama Diskon</label><input type="text" id="disc-name" value="${disc?.name || ''}" placeholder="Contoh: Diskon Member 10%"></div>
      <div class="form-row">
        <div class="form-group"><label>Tipe</label>
          <select id="disc-type"><option value="percentage" ${disc?.type==='percentage'?'selected':''}>Persentase (%)</option><option value="nominal" ${disc?.type==='nominal'?'selected':''}>Nominal (Rp)</option></select>
        </div>
        <div class="form-group"><label>Nilai</label><input type="number" id="disc-value" value="${disc?.value || ''}" min="0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Lingkup</label>
          <select id="disc-scope"><option value="item" ${disc?.scope==='item'?'selected':''}>Per Item</option><option value="transaction" ${disc?.scope==='transaction'?'selected':''}>Per Transaksi</option></select>
        </div>
        <div class="form-group"><label>Status</label>
          <select id="disc-active"><option value="1" ${disc?.is_active!==0?'selected':''}>Aktif</option><option value="0" ${disc?.is_active===0?'selected':''}>Nonaktif</option></select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveDiscount(${disc?.id || 'null'})">Simpan</button>
    </div>`);
}

async function saveDiscount(id) {
  const data = { name: document.getElementById('disc-name').value, type: document.getElementById('disc-type').value, value: parseFloat(document.getElementById('disc-value').value), scope: document.getElementById('disc-scope').value, is_active: parseInt(document.getElementById('disc-active').value) };
  try {
    if (id) await API.put(`/api/discounts/${id}`, data);
    else await API.post('/api/discounts', data);
    closeModal(); showToast('Diskon disimpan', 'success'); renderDiscountsPage();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteDiscount(id) {
  confirm('Hapus diskon ini?', async () => {
    try { await API.del(`/api/discounts/${id}`); showToast('Dihapus', 'success'); renderDiscountsPage(); }
    catch(e) { showToast(e.message, 'error'); }
  });
}
