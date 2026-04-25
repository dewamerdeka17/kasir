const express = require('express');
const { dbGet, dbAll, dbRun, dbInsert } = require('../../database/init');
const { requireAuth, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  try {
    const { category_id, type, active_only } = req.query;
    let sql = `SELECT m.*, c.name as category_name, COALESCE(ms.quantity, 0) as stock FROM menus m LEFT JOIN categories c ON c.id = m.category_id LEFT JOIN menu_stocks ms ON ms.menu_id = m.id WHERE 1=1`;
    const params = [];
    if (category_id) { sql += ' AND m.category_id = ?'; params.push(parseInt(category_id)); }
    if (type) { sql += ' AND m.type = ?'; params.push(type); }
    if (active_only === '1') { sql += ' AND m.is_active = 1'; }
    sql += ' ORDER BY m.type, c.name, m.name';
    res.json(dbAll(sql, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const menu = dbGet(`SELECT m.*, c.name as category_name, COALESCE(ms.quantity, 0) as stock FROM menus m LEFT JOIN categories c ON c.id = m.category_id LEFT JOIN menu_stocks ms ON ms.menu_id = m.id WHERE m.id = ?`, [parseInt(req.params.id)]);
    if (!menu) return res.status(404).json({ error: 'Menu tidak ditemukan' });
    const recipes = dbAll(`SELECT mr.*, i.name as ingredient_name, i.unit FROM menu_recipes mr JOIN ingredients i ON i.id = mr.ingredient_id WHERE mr.menu_id = ?`, [parseInt(req.params.id)]);
    res.json({ ...menu, recipes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin'), (req, res) => {
  try {
    const { name, category_id, type, price, photo_url, is_active, recipes, initial_stock } = req.body;
    if (!name || !category_id || !type || price == null) return res.status(400).json({ error: 'Data menu tidak lengkap' });
    const menuId = dbInsert('INSERT INTO menus (name, category_id, type, price, photo_url, is_active) VALUES (?, ?, ?, ?, ?, ?)', [name, category_id, type, price, photo_url || null, is_active ?? 1]);
    dbRun('INSERT INTO menu_stocks (menu_id, quantity, min_stock) VALUES (?, ?, ?)', [menuId, initial_stock || 0, 5]);
    if (recipes && Array.isArray(recipes)) {
      recipes.forEach(r => dbRun('INSERT INTO menu_recipes (menu_id, ingredient_id, quantity_needed) VALUES (?, ?, ?)', [menuId, r.ingredient_id, r.quantity_needed]));
    }
    res.json({ id: menuId, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const { name, category_id, type, price, photo_url, is_active, recipes } = req.body;
    dbRun(`UPDATE menus SET name=?, category_id=?, type=?, price=?, photo_url=?, is_active=?, updated_at=datetime('now','localtime') WHERE id=?`, [name, category_id, type, price, photo_url || null, is_active ?? 1, parseInt(req.params.id)]);
    if (recipes && Array.isArray(recipes)) {
      dbRun('DELETE FROM menu_recipes WHERE menu_id = ?', [parseInt(req.params.id)]);
      recipes.forEach(r => dbRun('INSERT INTO menu_recipes (menu_id, ingredient_id, quantity_needed) VALUES (?, ?, ?)', [parseInt(req.params.id), r.ingredient_id, r.quantity_needed]));
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  try { dbRun('UPDATE menus SET is_active = 0 WHERE id = ?', [parseInt(req.params.id)]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
