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
              ${users.map(u => `<tr>
                <td><code>${u.username}</code></td>
                <td><strong>${u.full_name}</strong></td>
                <td><span class="badge ${u.role==='admin'?'badge-accent':u.role==='owner'?'badge-success':'badge-info'}">${u.role}</span></td>
                <td>${u.is_active ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-muted">Nonaktif</span>'}</td>
                <td>${formatDate(u.created_at)}</td>
                <td><div class="btn-group">
                  <button class="btn btn-ghost btn-sm" onclick='openUserForm(${JSON.stringify(u)})'>Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">Nonaktifkan</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  });
}

function openUserForm(user) {
  showModal(`
    <div class="modal-header">
      <h3>${user ? 'Edit' : 'Tambah'} Pengguna</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      ${!user ? '<div class="form-group"><label>Username</label><input type="text" id="user-username" placeholder="username"></div>' : ''}
      <div class="form-group"><label>Nama Lengkap</label><input type="text" id="user-fullname" value="${user?.full_name || ''}"></div>
      <div class="form-group"><label>${user ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'}</label><input type="password" id="user-password" placeholder="••••••"></div>
      <div class="form-row">
        <div class="form-group"><label>Role</label>
          <select id="user-role"><option value="kasir" ${user?.role==='kasir'?'selected':''}>Kasir</option><option value="admin" ${user?.role==='admin'?'selected':''}>Admin</option><option value="owner" ${user?.role==='owner'?'selected':''}>Owner</option></select>
        </div>
        <div class="form-group"><label>Status</label>
          <select id="user-active"><option value="1" ${user?.is_active!==0?'selected':''}>Aktif</option><option value="0" ${user?.is_active===0?'selected':''}>Nonaktif</option></select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveUser(${user?.id || 'null'})">Simpan</button>
    </div>`);
}

async function saveUser(id) {
  const fullName = document.getElementById('user-fullname').value.trim();
  const role = document.getElementById('user-role').value;
  const isActive = parseInt(document.getElementById('user-active').value);
  const pass = document.getElementById('user-password').value;

  // Validasi frontend
  if (!fullName) return showToast('Nama lengkap wajib diisi', 'error');
  if (!id && !document.getElementById('user-username')?.value.trim())
    return showToast('Username wajib diisi', 'error');
  if (!id && !pass) return showToast('Password wajib diisi untuk user baru', 'error');
  if (pass && pass.length < 6) return showToast('Password minimal 6 karakter', 'error');

  const data = {
    full_name: fullName,
    role,
    is_active: isActive
  };
  if (pass) data.password = pass;
  if (!id) {
    data.username = document.getElementById('user-username').value.trim();
    // is_active selalu disertakan saat create
    data.is_active = isActive;
  }

  try {
    if (id) await API.put(`/api/users/${id}`, data);
    else await API.post('/api/users', data);
    closeModal();
    showToast(id ? 'User berhasil diperbarui ✓' : 'User baru berhasil dibuat ✓', 'success');
    renderUsersPage();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteUser(id) {
  confirm('Nonaktifkan user ini?', async () => {
    try { await API.del(`/api/users/${id}`); showToast('User dinonaktifkan', 'success'); renderUsersPage(); }
    catch(e) { showToast(e.message, 'error'); }
  });
}
