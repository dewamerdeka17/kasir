const express = require('express');
const { dbGet, dbAll, dbRun, dbInsert } = require('../../database/init');
const { requireAuth, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  try {
    const { active_only } = req.query;
    let sql = `SELECT d.*, u.full_name as created_by_name FROM discounts d LEFT JOIN users u ON u.id = d.created_by`;
    if (active_only === '1') sql += ' WHERE d.is_active = 1';
    sql += ' ORDER BY d.created_at DESC';
    res.json(dbAll(sql));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin', 'owner'), (req, res) => {
  try {
    const { name, type, value, scope } = req.body;
    if (!name || !type || !value || !scope) return res.status(400).json({ error: 'Data diskon tidak lengkap' });
    const id = dbInsert('INSERT INTO discounts (name, type, value, scope, created_by) VALUES (?, ?, ?, ?, ?)', [name, type, value, scope, req.session.user.id]);
    res.json({ id, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireRole('admin', 'owner'), (req, res) => {
  try {
    const { name, type, value, scope, is_active } = req.body;
    dbRun('UPDATE discounts SET name=?, type=?, value=?, scope=?, is_active=? WHERE id=?', [name, type, value, scope, is_active ?? 1, parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  try { dbRun('DELETE FROM discounts WHERE id = ?', [parseInt(req.params.id)]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
