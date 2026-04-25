const express = require('express');
const { dbGet, dbAll, dbRun, dbInsert } = require('../../database/init');
const { requireAuth, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.get('/menu', requireAuth, (req, res) => {
  try { res.json(dbAll(`SELECT m.id, m.name, m.type, c.name as category_name, COALESCE(ms.quantity, 0) as current_stock, COALESCE(ms.min_stock, 5) as min_stock, ms.updated_at FROM menus m LEFT JOIN menu_stocks ms ON ms.menu_id = m.id LEFT JOIN categories c ON c.id = m.category_id WHERE m.is_active = 1 ORDER BY m.name`)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/ingredients', requireAuth, (req, res) => {
  try { res.json(dbAll(`SELECT i.id, i.name, i.unit, i.min_stock, COALESCE(s.quantity, 0) as current_stock, s.updated_at FROM ingredients i LEFT JOIN ingredient_stocks s ON s.ingredient_id = i.id ORDER BY i.name`)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/menu/adjust', requireRole('admin', 'kasir'), (req, res) => {
  try {
    const { menu_id, quantity, movement_type, reason } = req.body;
    if (!menu_id || quantity == null) return res.status(400).json({ error: 'Data tidak lengkap' });
    const stock = dbGet('SELECT * FROM menu_stocks WHERE menu_id = ?', [menu_id]);
    const prevStock = stock ? stock.quantity : 0;
    let newStock = prevStock;
    if (movement_type === 'in') newStock = prevStock + quantity;
    else if (movement_type === 'out') newStock = Math.max(0, prevStock - quantity);
    else if (movement_type === 'adjustment') newStock = quantity;
    if (stock) dbRun("UPDATE menu_stocks SET quantity = ?, updated_at = datetime('now','localtime') WHERE menu_id = ?", [newStock, menu_id]);
    else dbRun('INSERT INTO menu_stocks (menu_id, quantity) VALUES (?, ?)', [menu_id, newStock]);
    dbRun(`INSERT INTO stock_movements (type, reference_id, movement_type, quantity, previous_stock, new_stock, reason, created_by) VALUES ('menu', ?, ?, ?, ?, ?, ?, ?)`, [menu_id, movement_type, quantity, prevStock, newStock, reason || '', req.session.user.id]);
    res.json({ success: true, previous: prevStock, current: newStock });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ingredients/adjust', requireRole('admin', 'kasir'), (req, res) => {
  try {
    const { ingredient_id, quantity, movement_type, reason } = req.body;
    if (!ingredient_id || quantity == null) return res.status(400).json({ error: 'Data tidak lengkap' });
    const stock = dbGet('SELECT * FROM ingredient_stocks WHERE ingredient_id = ?', [ingredient_id]);
    const prevStock = stock ? stock.quantity : 0;
    let newStock = prevStock;
    if (movement_type === 'in') newStock = prevStock + quantity;
    else if (movement_type === 'out') newStock = Math.max(0, prevStock - quantity);
    else if (movement_type === 'adjustment') newStock = quantity;
    if (stock) dbRun("UPDATE ingredient_stocks SET quantity = ?, updated_at = datetime('now','localtime') WHERE ingredient_id = ?", [newStock, ingredient_id]);
    else dbRun('INSERT INTO ingredient_stocks (ingredient_id, quantity) VALUES (?, ?)', [ingredient_id, newStock]);
    dbRun(`INSERT INTO stock_movements (type, reference_id, movement_type, quantity, previous_stock, new_stock, reason, created_by) VALUES ('ingredient', ?, ?, ?, ?, ?, ?, ?)`, [ingredient_id, movement_type, quantity, prevStock, newStock, reason || '', req.session.user.id]);
    res.json({ success: true, previous: prevStock, current: newStock });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/movements', requireAuth, (req, res) => {
  try {
    const { type, limit } = req.query;
    let sql = `SELECT sm.*, CASE WHEN sm.type = 'menu' THEN m.name ELSE i.name END as item_name, u.full_name as created_by_name FROM stock_movements sm LEFT JOIN menus m ON sm.type = 'menu' AND m.id = sm.reference_id LEFT JOIN ingredients i ON sm.type = 'ingredient' AND i.id = sm.reference_id LEFT JOIN users u ON u.id = sm.created_by WHERE 1=1`;
    const params = [];
    if (type) { sql += ' AND sm.type = ?'; params.push(type); }
    sql += ' ORDER BY sm.created_at DESC LIMIT ?';
    params.push(parseInt(limit) || 100);
    res.json(dbAll(sql, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
