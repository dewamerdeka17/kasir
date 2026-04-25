// App Router & Init
(function() {
  let currentUser = null;
  let currentPage = 'dashboard';

  const pageTitles = {
    dashboard: 'Dashboard',
    pos: 'Kasir / POS',
    menu: 'Manajemen Menu',
    categories: 'Kategori Menu',
    ingredients: 'Bahan Baku',
    stocks: 'Manajemen Stok',
    expenses: 'Pengeluaran',
    discounts: 'Manajemen Diskon',
    reports: 'Laporan',
    users: 'Manajemen Pengguna',
    printers: 'Printer & Pengaturan'
  };

  const pageRenderers = {
    dashboard: renderDashboard,
    pos: renderPos,
    menu: renderMenuPage,
    categories: renderCategoriesPage,
    ingredients: renderIngredientsPage,
    stocks: renderStocksPage,
    expenses: renderExpensesPage,
    discounts: renderDiscountsPage,
    reports: renderReportsPage,
    users: renderUsersPage,
    printers: renderPrintersPage
  };

  // Role-based page access
  const pageAccess = {
    dashboard: ['admin', 'kasir', 'owner'],
    pos: ['admin', 'kasir'],
    menu: ['admin', 'kasir'],
    categories: ['admin'],
    ingredients: ['admin'],
    stocks: ['admin', 'kasir', 'owner'],
    expenses: ['admin', 'kasir', 'owner'],
    discounts: ['admin', 'owner'],
    reports: ['admin', 'owner'],
    users: ['admin'],
    printers: ['admin']
  };

  // Check auth on load
  async function checkAuth() {
    try {
      const data = await API.get('/auth/me');
      currentUser = data.user;
      showMainApp();
    } catch {
      showLogin();
    }
  }

  function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
  }

  function showMainApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';

    // Update user info
    document.getElementById('user-name').textContent = currentUser.full_name;
    document.getElementById('user-role').textContent = currentUser.role;
    document.getElementById('user-avatar').textContent = currentUser.full_name.charAt(0).toUpperCase();

    // Hide nav items based on role
    document.querySelectorAll('.nav-item[data-roles]').forEach(item => {
      const roles = item.dataset.roles.split(',');
      item.style.display = roles.includes(currentUser.role) ? '' : 'none';
    });

    // Navigate to default page
    const defaultPage = currentUser.role === 'kasir' ? 'pos' : 'dashboard';
    navigateTo(defaultPage);
    startClock();
    checkLowStockNotifications();
  }

  function navigateTo(page) {
    if (!pageAccess[page]?.includes(currentUser.role)) {
      showToast('Akses ditolak', 'error');
      return;
    }

    currentPage = page;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Update title
    document.getElementById('page-title').textContent = pageTitles[page] || page;

    // Render page
    const renderer = pageRenderers[page];
    if (renderer) renderer();
    else document.getElementById('page-content').innerHTML = '<div class="empty-state"><h3>Halaman belum tersedia</h3></div>';

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
  }

  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await API.post('/auth/login', { username, password });
      currentUser = data.user;
      showMainApp();
      showToast(`Selamat datang, ${currentUser.full_name}! 👋`, 'success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  });

  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) navigateTo(page);
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await API.post('/auth/logout');
    currentUser = null;
    showLogin();
    showToast('Berhasil logout', 'info');
  });

  // Sidebar toggle
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (window.innerWidth <= 1024 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });

  // Clock
  function startClock() {
    function updateClock() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
      const el = document.getElementById('current-time');
      if (el) el.textContent = `${dateStr} • ${timeStr}`;
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  // Low stock notifications
  async function checkLowStockNotifications() {
    try {
      const data = await API.get('/api/dashboard');
      const totalLow = (data.lowStockIngredients?.length || 0) + (data.lowStockMenus?.length || 0);
      const badge = document.getElementById('notif-badge');
      if (totalLow > 0) {
        badge.style.display = 'inline';
        badge.textContent = totalLow;
      } else {
        badge.style.display = 'none';
      }
    } catch {}
  }

  // Notification bell click
  document.getElementById('notification-bell').addEventListener('click', () => {
    navigateTo('stocks');
  });

  // Initialize
  checkAuth();
})();
