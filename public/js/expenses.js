// Expense Page — Pengeluaran (tanpa Kasbon)
function renderExpensesPage() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Memuat data pengeluaran...</p></div>';

  API.get('/api/expenses').then(expenses => {
    // Hanya tampilkan pengeluaran (bukan kasbon)
    const pengeluaranList = expenses.filter(e => e.status === 'pengeluaran');
    const totalExp = pengeluaranList.reduce((s, e) => s + e.amount, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayExp = pengeluaranList.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card warning">
          <div class="stat-label">Total Pengeluaran</div>
          <div class="stat-value">${formatRupiah(totalExp)}</div>
          <div class="stat-sub">${pengeluaranList.length} transaksi pengeluaran</div>
        </div>
        <div class="stat-card info">
          <div class="stat-label">Pengeluaran Hari Ini</div>
          <div class="stat-value">${formatRupiah(todayExp)}</div>
          <div class="stat-sub">Per ${new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-label">Jumlah Transaksi</div>
          <div class="stat-value">${pengeluaranList.length}</div>
          <div class="stat-sub">Semua waktu</div>
        </div>
      </div>
      <div class="toolbar">
        <div class="toolbar-left">
          <input type="date" id="exp-filter-date" style="width:auto" onchange="filterExpenses()" title="Filter tanggal">
          <select id="exp-filter-cat" onchange="filterExpenses()" style="width:auto">
            <option value="">Semua Kategori</option>
            <option value="umum">Umum</option>
            <option value="bahan_baku">Bahan Baku</option>
            <option value="operasional">Operasional</option>
            <option value="gaji">Gaji</option>
            <option value="lainnya">Lainnya</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" onclick="openExpenseForm()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Pengeluaran
          </button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tanggal & Waktu</th>
                <th>No</th>
                <th>Nama Pengeluaran</th>
                <th>Kategori</th>
                <th>Nominal</th>
                <th>Metode</th>
                <th>Oleh</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="expenses-table">
              ${pengeluaranList.length === 0 ? `
                <tr><td colspan="8">
                  <div class="empty-state" style="padding:2rem">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="opacity:0.3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p style="margin-top:0.75rem;color:var(--text-muted)">Belum ada pengeluaran</p>
                  </div>
                </td></tr>` :
                pengeluaranList.map(e => `<tr data-date="${e.date}" data-cat="${e.category}">
                  <td>
                    <div style="font-weight:600;font-size:0.85rem">${formatDate(e.date)}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">${formatTime(e.created_at)}</div>
                  </td>
                  <td><code style="font-size:0.75rem">${e.expense_number}</code></td>
                  <td>
                    <strong>${e.name}</strong>
                    ${e.description ? `<br><small style="color:var(--text-muted)">${e.description}</small>` : ''}
                  </td>
                  <td><span class="badge badge-muted">${e.category}</span></td>
                  <td><strong style="color:var(--warning)">${formatRupiah(e.amount)}</strong></td>
                  <td>${e.payment_method}</td>
                  <td style="font-size:0.82rem">${e.created_by_name || '-'}</td>
                  <td>
                    <div class="btn-group">
                      <button class="btn btn-ghost btn-sm" onclick='openExpenseForm(${JSON.stringify(e).replace(/'/g,"&#39;")})'>Edit</button>
                      <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})">Hapus</button>
                    </div>
                  </td>
                </tr>`).join('')
              }
            </tbody>
          </table>
        </div>
      </div>`;
  }).catch(err => {
    content.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Gagal memuat: ${err.message}</p></div>`;
  });
}

function filterExpenses() {
  const date = document.getElementById('exp-filter-date')?.value || '';
  const cat = document.getElementById('exp-filter-cat')?.value || '';
  document.querySelectorAll('#expenses-table tr[data-date]').forEach(row => {
    const dateMatch = !date || row.dataset.date === date;
    const catMatch = !cat || row.dataset.cat === cat;
    row.style.display = dateMatch && catMatch ? '' : 'none';
  });
}

function openExpenseForm(exp) {
  // Otomatis isi tanggal & jam saat ini untuk pengeluaran baru
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  showModal(`
    <div class="modal-header">
      <h3>${exp ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label>Tanggal</label>
          <input type="date" id="exp-date" value="${exp?.date || today}">
        </div>
        <div class="form-group">
          <label>Waktu Input</label>
          <input type="text" id="exp-time" value="${exp ? formatTime(exp.created_at) : currentTime}" readonly
            style="background:var(--bg-secondary);color:var(--text-muted);cursor:not-allowed">
        </div>
      </div>
      <div class="form-group">
        <label>Nama Pengeluaran <span style="color:var(--danger)">*</span></label>
        <input type="text" id="exp-name" value="${exp?.name || ''}" placeholder="Contoh: Beli bahan baku, bayar listrik..." autofocus>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Kategori</label>
          <select id="exp-category">
            <option value="umum" ${exp?.category==='umum'||!exp?'selected':''}>Umum</option>
            <option value="bahan_baku" ${exp?.category==='bahan_baku'?'selected':''}>Bahan Baku</option>
            <option value="operasional" ${exp?.category==='operasional'?'selected':''}>Operasional</option>
            <option value="gaji" ${exp?.category==='gaji'?'selected':''}>Gaji</option>
            <option value="lainnya" ${exp?.category==='lainnya'?'selected':''}>Lainnya</option>
          </select>
        </div>
        <div class="form-group">
          <label>Nominal (Rp) <span style="color:var(--danger)">*</span></label>
          <input type="number" id="exp-amount" value="${exp?.amount || ''}" min="0" placeholder="0">
        </div>
      </div>
      <div class="form-group">
        <label>Metode Pembayaran</label>
        <select id="exp-method">
          <option value="tunai" ${!exp||exp?.payment_method==='tunai'?'selected':''}>Tunai</option>
          <option value="transfer" ${exp?.payment_method==='transfer'?'selected':''}>Transfer</option>
          <option value="qris" ${exp?.payment_method==='qris'?'selected':''}>QRIS</option>
        </select>
      </div>
      <div class="form-group">
        <label>Keterangan</label>
        <textarea id="exp-desc" rows="2" placeholder="Keterangan tambahan (opsional)">${exp?.description || ''}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveExpense(${exp?.id || 'null'})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
        Simpan
      </button>
    </div>
  `);
}

async function saveExpense(id) {
  const name = document.getElementById('exp-name').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
  if (!name) return showToast('Nama pengeluaran wajib diisi', 'error');
  if (amount <= 0) return showToast('Nominal harus lebih dari 0', 'error');

  const data = {
    date: document.getElementById('exp-date').value,
    name,
    category: document.getElementById('exp-category').value,
    amount,
    status: 'pengeluaran', // selalu pengeluaran
    payment_method: document.getElementById('exp-method').value,
    description: document.getElementById('exp-desc').value
  };

  try {
    if (id) await API.put(`/api/expenses/${id}`, data);
    else await API.post('/api/expenses', data);
    closeModal();
    showToast(id ? 'Pengeluaran diperbarui' : 'Pengeluaran disimpan ✓', 'success');
    renderExpensesPage();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteExpense(id) {
  confirm('Hapus pengeluaran ini?', async () => {
    try {
      await API.del(`/api/expenses/${id}`);
      showToast('Pengeluaran dihapus', 'success');
      renderExpensesPage();
    } catch(e) { showToast(e.message, 'error'); }
  });
}
