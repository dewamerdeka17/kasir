const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'kasir.db');

let db = null;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Auto-save every 5 seconds
setInterval(() => { if (db) saveDb(); }, 5000);

// Helper: run & save
function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function dbAll(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function dbInsert(sql, params = []) {
  db.run(sql, params);
  const result = db.exec("SELECT last_insert_rowid() as id");
  saveDb();
  return result[0]?.values[0]?.[0] || 0;
}

async function initializeDatabase() {
  const database = await getDb();

  // ========== USERS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','kasir','owner')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== CATEGORIES ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('makanan','minuman')),
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== MENUS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('makanan','minuman')),
      price REAL NOT NULL DEFAULT 0,
      photo_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // ========== INGREDIENTS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pcs',
      min_stock REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== INGREDIENT STOCKS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS ingredient_stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER UNIQUE NOT NULL,
      quantity REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    )
  `);

  // ========== MENU STOCKS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS menu_stocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER UNIQUE NOT NULL,
      quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (menu_id) REFERENCES menus(id)
    )
  `);

  // ========== MENU RECIPES ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS menu_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity_needed REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (menu_id) REFERENCES menus(id),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
      UNIQUE(menu_id, ingredient_id)
    )
  `);

  // ========== TRANSACTIONS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      order_number INTEGER,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','paid','completed','cancelled')),
      subtotal REAL DEFAULT 0,
      discount_type TEXT,
      discount_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      discount_by INTEGER,
      total REAL DEFAULT 0,
      table_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ========== TRANSACTION ITEMS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      menu_id INTEGER NOT NULL,
      menu_name TEXT NOT NULL,
      menu_type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_type TEXT,
      discount_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      discount_by INTEGER,
      notes TEXT,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (menu_id) REFERENCES menus(id)
    )
  `);

  // ========== PAYMENTS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('tunai','qris')),
      amount_paid REAL DEFAULT 0,
      change_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'paid' CHECK(status IN ('pending','paid','refunded')),
      paid_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    )
  `);

  // ========== DISCOUNTS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('nominal','percentage')),
      value REAL NOT NULL DEFAULT 0,
      scope TEXT NOT NULL CHECK(scope IN ('item','transaction')),
      is_active INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // ========== EXPENSES ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      expense_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'umum',
      amount REAL NOT NULL DEFAULT 0,
      description TEXT,
      created_by INTEGER NOT NULL,
      status TEXT DEFAULT 'pengeluaran' CHECK(status IN ('pengeluaran','kasbon')),
      payment_method TEXT DEFAULT 'tunai',
      attachment_url TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // ========== PRINTERS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS printers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('bar','dapur')),
      connection_type TEXT DEFAULT 'network',
      address TEXT,
      is_active INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      is_online INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== PRINT LOGS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS print_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      printer_id INTEGER,
      print_type TEXT NOT NULL CHECK(print_type IN ('receipt','kitchen','bar','test')),
      status TEXT DEFAULT 'queued' CHECK(status IN ('queued','printed','failed','test')),
      content TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      printed_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    )
  `);

  // ========== STOCK MOVEMENTS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('ingredient','menu')),
      reference_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('in','out','adjustment')),
      quantity REAL NOT NULL,
      previous_stock REAL DEFAULT 0,
      new_stock REAL DEFAULT 0,
      reason TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // ========== SETTINGS ==========
  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== SAFE MIGRATIONS (kolom baru, aman untuk DB lama) ==========
  const migrations = [
    `ALTER TABLE printers ADD COLUMN is_default INTEGER DEFAULT 0`,
    `ALTER TABLE printers ADD COLUMN is_online INTEGER DEFAULT 0`,
    `ALTER TABLE print_logs ADD COLUMN error_message TEXT`,
    `ALTER TABLE print_logs ADD COLUMN retry_count INTEGER DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN table_number TEXT`,
    // === Revisi 2026-04 — field printer baru (aman, semua punya default) ===
    `ALTER TABLE printers ADD COLUMN port INTEGER DEFAULT 9100`,
    `ALTER TABLE printers ADD COLUMN device_id TEXT`,
    `ALTER TABLE printers ADD COLUMN notes TEXT`
  ];
  migrations.forEach(sql => {
    try { database.run(sql); } catch(e) { /* kolom sudah ada, abaikan */ }
  });

  // === Revisi 2026-04 — mapping kasir -> bar (aman, idempoten) ===
  // Printer lama bertipe 'kasir' dipindahkan ke 'bar'
  try {
    database.run(`UPDATE printers SET type = 'bar' WHERE type = 'kasir'`);
  } catch(e) { /* abaikan jika tidak ada */ }

  // ========== SEED DATA ==========
  seedData();

  saveDb();
  console.log('✅ Database initialized successfully');
}

function seedData() {
  const adminExists = dbGet('SELECT id FROM users WHERE username = ?', ['admin']);
  if (adminExists) return;

  console.log('🌱 Seeding initial data...');

  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const kasirPassword = bcrypt.hashSync('kasir123', 10);
  const ownerPassword = bcrypt.hashSync('owner123', 10);

  dbRun('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)', ['admin', hashedPassword, 'Administrator', 'admin']);
  dbRun('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)', ['kasir1', kasirPassword, 'Kasir Utama', 'kasir']);
  dbRun('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)', ['owner', ownerPassword, 'Owner Kedai Pulo', 'owner']);

  const cats = [
    ['Nasi & Rice Bowl', 'makanan', 'Menu nasi dan rice bowl'],
    ['Snack & Appetizer', 'makanan', 'Camilan dan makanan pembuka'],
    ['Mie & Pasta', 'makanan', 'Menu mie dan pasta'],
    ['Kopi', 'minuman', 'Berbagai jenis kopi'],
    ['Non-Kopi', 'minuman', 'Minuman non-kopi'],
    ['Jus & Smoothie', 'minuman', 'Jus buah dan smoothie'],
  ];
  cats.forEach(c => dbRun('INSERT INTO categories (name, type, description) VALUES (?, ?, ?)', c));

  const menus = [
    ['Nasi Goreng Spesial', 1, 'makanan', 25000],
    ['Rice Bowl Chicken Katsu', 1, 'makanan', 28000],
    ['Rice Bowl Beef Teriyaki', 1, 'makanan', 32000],
    ['French Fries', 2, 'makanan', 18000],
    ['Chicken Wings (6pcs)', 2, 'makanan', 25000],
    ['Mie Goreng Jawa', 3, 'makanan', 22000],
    ['Spaghetti Bolognese', 3, 'makanan', 30000],
    ['Es Kopi Susu', 4, 'minuman', 18000],
    ['Americano', 4, 'minuman', 15000],
    ['Cappuccino', 4, 'minuman', 20000],
    ['Latte', 4, 'minuman', 22000],
    ['Matcha Latte', 5, 'minuman', 22000],
    ['Coklat Hangat', 5, 'minuman', 18000],
    ['Thai Tea', 5, 'minuman', 15000],
    ['Jus Jeruk', 6, 'minuman', 15000],
    ['Jus Mangga', 6, 'minuman', 15000],
    ['Berry Smoothie', 6, 'minuman', 25000],
  ];
  menus.forEach(m => dbRun('INSERT INTO menus (name, category_id, type, price) VALUES (?, ?, ?, ?)', m));

  for (let i = 1; i <= menus.length; i++) {
    dbRun('INSERT INTO menu_stocks (menu_id, quantity, min_stock) VALUES (?, ?, ?)', [i, 50, 5]);
  }

  const ingredients = [
    ['Beras', 'kg', 5], ['Mie', 'pcs', 20], ['Ayam', 'kg', 3],
    ['Daging Sapi', 'kg', 2], ['Kopi Arabica', 'kg', 1], ['Susu Segar', 'liter', 5],
    ['Gula', 'kg', 3], ['Es Batu', 'kg', 10], ['Tepung Terigu', 'kg', 3],
    ['Minyak Goreng', 'liter', 5], ['Coklat Bubuk', 'kg', 1], ['Matcha Powder', 'kg', 0.5],
    ['Jeruk', 'kg', 3], ['Mangga', 'kg', 3], ['Spaghetti', 'pcs', 20],
  ];
  ingredients.forEach(ing => dbRun('INSERT INTO ingredients (name, unit, min_stock) VALUES (?, ?, ?)', ing));
  ingredients.forEach((_, i) => dbRun('INSERT INTO ingredient_stocks (ingredient_id, quantity) VALUES (?, ?)', [i + 1, 20]));

  dbRun('INSERT INTO printers (name, type, connection_type, address) VALUES (?, ?, ?, ?)', ['Printer Bar', 'bar', 'network', '192.168.1.101']);
  dbRun('INSERT INTO printers (name, type, connection_type, address) VALUES (?, ?, ?, ?)', ['Printer Dapur', 'dapur', 'network', '192.168.1.100']);

  dbRun('INSERT INTO discounts (name, type, value, scope, created_by) VALUES (?, ?, ?, ?, ?)', ['Diskon 10%', 'percentage', 10, 'transaction', 1]);
  dbRun('INSERT INTO discounts (name, type, value, scope, created_by) VALUES (?, ?, ?, ?, ?)', ['Diskon 20%', 'percentage', 20, 'transaction', 1]);
  dbRun('INSERT INTO discounts (name, type, value, scope, created_by) VALUES (?, ?, ?, ?, ?)', ['Potongan Rp 5.000', 'nominal', 5000, 'item', 1]);
  dbRun('INSERT INTO discounts (name, type, value, scope, created_by) VALUES (?, ?, ?, ?, ?)', ['Potongan Rp 10.000', 'nominal', 10000, 'transaction', 1]);

  console.log('✅ Seed data created');
  console.log('   Admin: admin / admin123');
  console.log('   Kasir: kasir1 / kasir123');
  console.log('   Owner: owner / owner123');
}

module.exports = { getDb, initializeDatabase, dbRun, dbGet, dbAll, dbInsert, saveDb };
