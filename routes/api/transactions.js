const express = require('express');
const { dbGet, dbAll, dbRun, dbInsert } = require('../../database/init');
const { requireAuth, requireRole } = require('../../middleware/auth');
const router = express.Router();

function generateInvoice() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `KP-${dateStr}-${timeStr.substring(0,4)}${rand}`;
}

function getNextOrderNumber() {
  const today = new Date().toISOString().split('T')[0];
  const result = dbGet(`SELECT MAX(order_number) as max_order FROM transactions WHERE DATE(created_at) = ?`, [today]);
  return (result?.max_order || 0) + 1;
}

router.get('/', requireAuth, (req, res) => {
  try {
    const { status, date, limit: lim } = req.query;
    let sql = `SELECT t.*, u.full_name as cashier_name, p.method as payment_method, p.amount_paid, p.change_amount FROM transactions t LEFT JOIN users u ON u.id = t.user_id LEFT JOIN payments p ON p.transaction_id = t.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (date) { sql += ' AND DATE(t.created_at) = ?'; params.push(date); }
    sql += ' ORDER BY t.created_at DESC LIMIT ?';
    params.push(parseInt(lim) || 50);
    res.json(dbAll(sql, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/today', requireAuth, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    res.json(dbAll(`SELECT t.*, u.full_name as cashier_name, p.method as payment_method, p.amount_paid, p.change_amount FROM transactions t LEFT JOIN users u ON u.id = t.user_id LEFT JOIN payments p ON p.transaction_id = t.id WHERE DATE(t.created_at) = ? ORDER BY t.created_at DESC`, [today]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const txId = parseInt(req.params.id);
    const transaction = dbGet(`SELECT t.*, u.full_name as cashier_name, du.full_name as discount_by_name FROM transactions t LEFT JOIN users u ON u.id = t.user_id LEFT JOIN users du ON du.id = t.discount_by WHERE t.id = ?`, [txId]);
    if (!transaction) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    const items = dbAll(`SELECT ti.*, du.full_name as discount_by_name FROM transaction_items ti LEFT JOIN users du ON du.id = ti.discount_by WHERE ti.transaction_id = ?`, [txId]);
    const payment = dbGet('SELECT * FROM payments WHERE transaction_id = ?', [txId]);
    res.json({ ...transaction, items, payment });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin', 'kasir'), (req, res) => {
  try {
    const { items, discount_type, discount_value, notes, table_number } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Minimal 1 item diperlukan' });

    const invoice = generateInvoice();
    const orderNumber = getNextOrderNumber();
    let subtotal = 0;

    const processedItems = items.map(item => {
      const menu = dbGet('SELECT * FROM menus WHERE id = ? AND is_active = 1', [item.menu_id]);
      if (!menu) throw new Error(`Menu ID ${item.menu_id} tidak ditemukan`);
      const itemSubtotal = menu.price * item.quantity;
      let itemDiscountAmount = 0;
      if (item.discount_type && item.discount_value) {
        itemDiscountAmount = item.discount_type === 'percentage' ? itemSubtotal * (item.discount_value / 100) : Math.min(item.discount_value, itemSubtotal);
      }
      subtotal += itemSubtotal;
      return { menu_id: menu.id, menu_name: menu.name, menu_type: menu.type, quantity: item.quantity, unit_price: menu.price, subtotal: itemSubtotal, discount_type: item.discount_type || null, discount_value: item.discount_value || 0, discount_amount: itemDiscountAmount, discount_by: item.discount_type ? req.session.user.id : null, notes: item.notes || '' };
    });

    let txDiscountAmount = 0;
    if (discount_type && discount_value) {
      txDiscountAmount = discount_type === 'percentage' ? subtotal * (discount_value / 100) : Math.min(discount_value, subtotal);
    }
    const totalItemDiscount = processedItems.reduce((sum, i) => sum + i.discount_amount, 0);
    const total = subtotal - totalItemDiscount - txDiscountAmount;

    const txId = dbInsert(`INSERT INTO transactions (invoice_number, order_number, user_id, status, subtotal, discount_type, discount_value, discount_amount, discount_by, total, table_number, notes) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice, orderNumber, req.session.user.id, subtotal, discount_type || null, discount_value || 0, txDiscountAmount, discount_type ? req.session.user.id : null, total, table_number || null, notes || '']);

    processedItems.forEach(item => {
      dbRun(`INSERT INTO transaction_items (transaction_id, menu_id, menu_name, menu_type, quantity, unit_price, subtotal, discount_type, discount_value, discount_amount, discount_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [txId, item.menu_id, item.menu_name, item.menu_type, item.quantity, item.unit_price, item.subtotal, item.discount_type, item.discount_value, item.discount_amount, item.discount_by, item.notes]);
    });

    res.json({ id: txId, invoice_number: invoice, order_number: orderNumber, subtotal, discount_amount: txDiscountAmount + totalItemDiscount, total, table_number: table_number || null, status: 'draft' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/pay', requireRole('admin', 'kasir'), (req, res) => {
  try {
    const { method, amount_paid } = req.body;
    const txId = parseInt(req.params.id);
    const tx = dbGet('SELECT * FROM transactions WHERE id = ?', [txId]);
    if (!tx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    if (tx.status !== 'draft') return res.status(400).json({ error: 'Transaksi sudah diproses' });
    if (!method) return res.status(400).json({ error: 'Metode pembayaran wajib diisi' });

    let changeAmount = 0, paid = tx.total;
    if (method === 'tunai') {
      if (!amount_paid || amount_paid < tx.total) return res.status(400).json({ error: 'Uang bayar kurang' });
      paid = amount_paid; changeAmount = amount_paid - tx.total;
    }

    dbRun(`INSERT INTO payments (transaction_id, method, amount_paid, change_amount, status) VALUES (?, ?, ?, ?, 'paid')`, [txId, method, paid, changeAmount]);
    dbRun("UPDATE transactions SET status = 'paid', updated_at = datetime('now','localtime') WHERE id = ?", [txId]);

    const items = dbAll('SELECT * FROM transaction_items WHERE transaction_id = ?', [txId]);
    items.forEach(item => {
      const stock = dbGet('SELECT * FROM menu_stocks WHERE menu_id = ?', [item.menu_id]);
      if (stock) {
        const newQty = Math.max(0, stock.quantity - item.quantity);
        dbRun("UPDATE menu_stocks SET quantity = ?, updated_at = datetime('now','localtime') WHERE menu_id = ?", [newQty, item.menu_id]);
        dbRun(`INSERT INTO stock_movements (type, reference_id, movement_type, quantity, previous_stock, new_stock, reason, created_by) VALUES ('menu', ?, 'out', ?, ?, ?, ?, ?)`, [item.menu_id, item.quantity, stock.quantity, newQty, `Penjualan ${tx.invoice_number}`, req.session.user.id]);
      }
      const recipes = dbAll('SELECT * FROM menu_recipes WHERE menu_id = ?', [item.menu_id]);
      recipes.forEach(recipe => {
        const ingStock = dbGet('SELECT * FROM ingredient_stocks WHERE ingredient_id = ?', [recipe.ingredient_id]);
        if (ingStock) {
          const needed = recipe.quantity_needed * item.quantity;
          const newQty = Math.max(0, ingStock.quantity - needed);
          dbRun("UPDATE ingredient_stocks SET quantity = ?, updated_at = datetime('now','localtime') WHERE ingredient_id = ?", [newQty, recipe.ingredient_id]);
          dbRun(`INSERT INTO stock_movements (type, reference_id, movement_type, quantity, previous_stock, new_stock, reason, created_by) VALUES ('ingredient', ?, 'out', ?, ?, ?, ?, ?)`, [recipe.ingredient_id, needed, ingStock.quantity, newQty, `Penjualan ${tx.invoice_number}`, req.session.user.id]);
        }
      });
    });

    res.json({ success: true, payment: { method, amount_paid: paid, change: changeAmount }, status: 'paid' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/complete', requireRole('admin', 'kasir'), (req, res) => {
  try { dbRun("UPDATE transactions SET status = 'completed', updated_at = datetime('now','localtime') WHERE id = ? AND status = 'paid'", [parseInt(req.params.id)]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/cancel', requireRole('admin'), (req, res) => {
  try {
    const txId = parseInt(req.params.id);
    const tx = dbGet('SELECT * FROM transactions WHERE id = ?', [txId]);
    if (!tx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    if (tx.status === 'paid' || tx.status === 'completed') {
      const items = dbAll('SELECT * FROM transaction_items WHERE transaction_id = ?', [txId]);
      items.forEach(item => {
        const stock = dbGet('SELECT * FROM menu_stocks WHERE menu_id = ?', [item.menu_id]);
        if (stock) {
          const newQty = stock.quantity + item.quantity;
          dbRun("UPDATE menu_stocks SET quantity = ?, updated_at = datetime('now','localtime') WHERE menu_id = ?", [newQty, item.menu_id]);
          dbRun(`INSERT INTO stock_movements (type, reference_id, movement_type, quantity, previous_stock, new_stock, reason, created_by) VALUES ('menu', ?, 'in', ?, ?, ?, ?, ?)`, [item.menu_id, item.quantity, stock.quantity, newQty, `Batal ${tx.invoice_number}`, req.session.user.id]);
        }
      });
      dbRun("UPDATE payments SET status = 'refunded' WHERE transaction_id = ?", [txId]);
    }
    dbRun("UPDATE transactions SET status = 'cancelled', updated_at = datetime('now','localtime') WHERE id = ?", [txId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
