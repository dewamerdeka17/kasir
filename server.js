const express = require('express');
const path = require('path');
const session = require('express-session');
const { initializeDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(session({
  secret: 'kedaipulo-pos-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Static files — disable caching for JS/CSS during development
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/api/dashboard'));
app.use('/api/categories', require('./routes/api/categories'));
app.use('/api/menus', require('./routes/api/menus'));
app.use('/api/ingredients', require('./routes/api/ingredients'));
app.use('/api/transactions', require('./routes/api/transactions'));
app.use('/api/expenses', require('./routes/api/expenses'));
app.use('/api/discounts', require('./routes/api/discounts'));
app.use('/api/stocks', require('./routes/api/stocks'));
app.use('/api/reports', require('./routes/api/reports'));
app.use('/api/users', require('./routes/api/users'));
app.use('/api/printers', require('./routes/api/printers'));
app.use('/api/settings', require('./routes/api/settings'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB then start server
async function start() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║        🚀 KEDAI PULO POS SYSTEM 🚀              ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Server: http://localhost:${PORT}                    ║`);
    console.log('║                                                  ║');
    console.log('║  Akun Default:                                   ║');
    console.log('║  ├─ Admin : admin / admin123                     ║');
    console.log('║  ├─ Kasir : kasir1 / kasir123                    ║');
    console.log('║  └─ Owner : owner / owner123                     ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
