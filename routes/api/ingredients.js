const express = require('express');
const { dbGet, dbAll, dbRun, dbInsert } = require('../../database/init');
const { requireAuth, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  try { res.json(dbAll(`SELECT i.*, COALESCE(s.quantity, 0) as current_stock FROM ingredients i LEFT JOIN ingredient_stocks s ON s.ingredient_id = i.id ORDER BY i.name`)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin'), (req, res) => {
  try {
    const { name, unit, min_stock, initial_stock } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama bahan wajib diisi' });
    const id = dbInsert('INSERT INTO ingredients (name, unit, min_stock) VALUES (?, ?, ?)', [name, unit || 'pcs', min_stock || 0]);
    dbRun('INSERT INTO ingredient_stocks (ingredient_id, quantity) VALUES (?, ?)', [id, initial_stock || 0]);
    res.json({ id, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const { name, unit, min_stock } = req.body;
    dbRun('UPDATE ingredients SET name=?, unit=?, min_stock=? WHERE id=?', [name, unit, min_stock, parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const used = dbGet('SELECT COUNT(*) as c FROM menu_recipes WHERE ingredient_id=?', [parseInt(req.params.id)]);
    if (used.c > 0) return res.status(400).json({ error: 'Bahan masih digunakan dalam resep' });
    dbRun('DELETE FROM ingredient_stocks WHERE ingredient_id=?', [parseInt(req.params.id)]);
    dbRun('DELETE FROM ingredients WHERE id=?', [parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
