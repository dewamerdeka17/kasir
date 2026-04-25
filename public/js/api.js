// API Client Helper
const API = {
  async request(url, options = {}) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      throw err;
    }
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  del(url) { return this.request(url, { method: 'DELETE' }); }
};

// Utility Functions
function formatRupiah(num) {
  if (num == null || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
         d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showModal(html, className = '') {
  const backdrop = document.getElementById('modal-backdrop');
  const content = document.getElementById('modal-content');
  content.className = 'modal-content ' + className;
  content.innerHTML = html;
  backdrop.style.display = 'flex';

  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeModal();
  };
}

function closeModal() {
  document.getElementById('modal-backdrop').style.display = 'none';
}

function confirm(message, onConfirm) {
  showModal(`
    <div class="modal-header">
      <h3>Konfirmasi</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body"><p>${message}</p></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="confirm-yes-btn">Ya, Lanjutkan</button>
    </div>
  `);
  document.getElementById('confirm-yes-btn').onclick = () => { closeModal(); onConfirm(); };
}

function getStatusBadge(status) {
  const map = {
    draft: 'badge-warning',
    paid: 'badge-info',
    completed: 'badge-success',
    cancelled: 'badge-danger',
    pengeluaran: 'badge-warning',
    kasbon: 'badge-danger'
  };
  return `<span class="badge ${map[status] || 'badge-muted'}">${status}</span>`;
}

function getMenuEmoji(type, categoryName) {
  if (type === 'minuman') {
    if (categoryName?.includes('Kopi')) return '☕';
    if (categoryName?.includes('Jus') || categoryName?.includes('Smoothie')) return '🥤';
    return '🧊';
  }
  if (categoryName?.includes('Nasi') || categoryName?.includes('Rice')) return '🍚';
  if (categoryName?.includes('Mie') || categoryName?.includes('Pasta')) return '🍝';
  if (categoryName?.includes('Snack') || categoryName?.includes('App')) return '🍟';
  return '🍽️';
}
