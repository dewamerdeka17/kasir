// Users Management Page
function renderUsersPage() {
  const content = document.getElementById('page-content');
  API.get('/api/users').then(users => {
    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left"><h3 style="font-size:1rem">Manajemen Pengguna</h3></div>
        <div class="toolbar-right"><button class="btn btn-primary" onclick="openUserForm()">+ Tambah User</button></div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Username</th><th>Nama Lengkap</th><th>Role</th><th>Status</th><th>Tgl Dibuat</th><th>Aksi</th></tr></thead>
            <tbody>
              ${users.length === 0 ? '<tr><td colspan="6"><div class="empty-state" style="padding:2rem"><p>Belum ada user terdaftar</p></div></td></tr>' :
                users.map(u => `<tr>
                <td><code>${u.username}</code></td>
                <td><strong>${u.full_name}</strong></td>
                <td><span class="badge ${u.role==='admin'?'badge-accent':u.role==='owner'?'badge-success':'badge-info'}">${u.role}</span></td>
                <td>${u.is_active ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-muted">Nonaktif</span>'}</td>
                <td>${formatDate(u.created_at)}</td>
                <td><div class="btn-group">
                  <button class="btn btn-ghost btn-sm" onclick='openUserForm(${JSON.stringify(u)})'>Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deactivateUser(${u.id})">Nonaktifkan</button>
                  <button class="btn btn-sm" style="background:var(--danger);color:#fff;opacity:0.8" onclick="permanentDeleteUser(${u.id},'${u.username}')">🗑 Hapus</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }).catch(err => {
    content.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Gagal memuat data: ${err.message}</p></div>`;
  });
}

// Simpan data user yang sedang diedit
let _editingUserId = null;
let _editingUserRole = null;

function openUserForm(user) {
  _editingUserId = user ? user.id : null;
  _editingUserRole = user ? user.role : 'kasir'; // default role untuk user baru

  const isEdit = !!user;
  const roleOptions = ['kasir', 'admin', 'owner'];
  const activeRole = user?.role || 'kasir';
  const activeStatus = user?.is_active !== 0 ? '1' : '0';

  // Build role options HTML
  const roleOptionsHtml = roleOptions.map(r =>
    `<option value="${r}"${r === activeRole ? ' selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`
  ).join('\n            ');

  const modalHtml = `
    <div class="modal-header">
      <h3>${isEdit ? 'Edit' : 'Tambah'} Pengguna</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      ${!isEdit ? '<div class="form-group"><label>Username</label><input type="text" id="user-username" placeholder="username" autocomplete="off"></div>' : ''}
      <div class="form-group"><label>Nama Lengkap</label><input type="text" id="user-fullname" value="${user?.full_name || ''}" autocomplete="off"></div>
      <div class="form-group"><label>${isEdit ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password (min. 6 karakter)'}</label><input type="password" id="user-password" placeholder="••••••" autocomplete="new-password"></div>
      <div class="form-row">
        <div class="form-group"><label>Role</label>
          <select id="user-role">
            ${roleOptionsHtml}
          </select>
        </div>
        <div class="form-group"><label>Status</label>
          <select id="user-active">
            <option value="1"${activeStatus === '1' ? ' selected' : ''}>Aktif</option>
            <option value="0"${activeStatus === '0' ? ' selected' : ''}>Nonaktif</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="btn-save-user" onclick="saveUser()">Simpan</button>
    </div>`;

  showModal(modalHtml);

  // Auto-focus first input after modal renders
  setTimeout(() => {
    const firstInput = document.getElementById('user-username') || document.getElementById('user-fullname');
    if (firstInput) firstInput.focus();
  }, 100);
}

async function saveUser() {
  const id = _editingUserId; // null untuk buat baru, numeric ID untuk edit
  const fullName = document.getElementById('user-fullname')?.value?.trim() || '';
  const pass = document.getElementById('user-password')?.value || '';
  const usernameEl = document.getElementById('user-username');
  const username = usernameEl ? usernameEl.value.trim() : '';

  // Role: ambil dari select, fallback ke _editingUserRole, fallback ke 'kasir'
  const roleEl = document.getElementById('user-role');
  const role = (roleEl && roleEl.value) ? roleEl.value : (_editingUserRole || 'kasir');

  // Status: ambil dari select, fallback ke 1
  const activeEl = document.getElementById('user-active');
  const isActive = (activeEl && activeEl.value) ? parseInt(activeEl.value) : 1;

  // Validasi frontend
  if (!fullName) return showToast('Nama lengkap wajib diisi', 'error');
  if (!id && !username) return showToast('Username wajib diisi', 'error');
  if (!id && !pass) return showToast('Password wajib diisi untuk user baru', 'error');
  if (pass && pass.length < 6) return showToast('Password minimal 6 karakter', 'error');

  // Disable tombol simpan untuk mencegah double-click
  const btn = document.getElementById('btn-save-user');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  const data = {
    full_name: fullName,
    role: role,
    is_active: isActive
  };
  if (pass) data.password = pass;
  if (!id) {
    data.username = username;
  }

  try {
    if (id) {
      await API.put(`/api/users/${id}`, data);
    } else {
      await API.post('/api/users', data);
    }
    closeModal();
    _editingUserId = null;
    _editingUserRole = null;
    showToast(id ? 'User berhasil diperbarui ✓' : `User "${username}" berhasil dibuat ✓`, 'success');
    renderUsersPage();
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan'; }
    showToast(e.message || 'Gagal menyimpan user', 'error');
  }
}

async function deactivateUser(id) {
  confirm('Nonaktifkan user ini?', async () => {
    try { await API.del(`/api/users/${id}`); showToast('User dinonaktifkan ✓', 'success'); renderUsersPage(); }
    catch(e) { showToast(e.message, 'error'); }
  });
}

async function permanentDeleteUser(id, username) {
  confirm(`⚠️ HAPUS PERMANEN user "${username}"?\n\nData akan dihapus dari database dan tidak bisa dikembalikan.\nJika user memiliki riwayat transaksi, penghapusan akan ditolak.`, async () => {
    try {
      const result = await API.del(`/api/users/${id}/permanent`);
      showToast(result.message || `User "${username}" berhasil dihapus ✓`, 'success');
      renderUsersPage();
    } catch(e) {
      showToast(e.message || 'Gagal menghapus user', 'error');
    }
  });
}
