const express = require('express');
const { dbGet, dbAll, dbRun, dbInsert } = require('../../database/init');
const { requireAuth, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  try { res.json(dbAll('SELECT * FROM categories ORDER BY type, name')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin'), (req, res) => {
  try {
    const { name, type, description } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Nama dan tipe wajib diisi' });
    const id = dbInsert('INSERT INTO categories (name, type, description) VALUES (?, ?, ?)', [name, type, description || '']);
    res.json({ id, name, type, description });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const { name, type, description, is_active } = req.body;
    dbRun('UPDATE categories SET name=?, type=?, description=?, is_active=? WHERE id=?', [name, type, description, is_active ?? 1, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const hasMenus = dbGet('SELECT COUNT(*) as c FROM menus WHERE category_id=?', [req.params.id]);
    if (hasMenus.c > 0) return res.status(400).json({ error: 'Kategori masih memiliki menu' });
    dbRun('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
