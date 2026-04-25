const express = require('express');
const { dbGet, dbAll, dbRun, dbInsert } = require('../../database/init');
const { requireAuth, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  try {
    const { status, date_from, date_to, limit: lim } = req.query;
    let sql = `SELECT e.*, u.full_name as created_by_name FROM expenses e LEFT JOIN users u ON u.id = e.created_by WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND e.status = ?'; params.push(status); }
    if (date_from) { sql += ' AND e.date >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND e.date <= ?'; params.push(date_to); }
    sql += ' ORDER BY e.created_at DESC LIMIT ?';
    params.push(parseInt(lim) || 100);
    res.json(dbAll(sql, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin', 'kasir'), (req, res) => {
  try {
    const { name, category, amount, description, payment_method, date } = req.body;
    if (!name || !amount) return res.status(400).json({ error: 'Nama dan nominal wajib diisi' });
    const expDate = date || new Date().toISOString().split('T')[0];
    const count = dbGet(`SELECT COUNT(*) as c FROM expenses WHERE date = ?`, [expDate]);
    const expNumber = `EXP-${expDate.replace(/-/g, '')}-${((count?.c || 0) + 1).toString().padStart(3, '0')}`;
    // Status selalu 'pengeluaran' — kasbon dihapus
    const id = dbInsert(`INSERT INTO expenses (date, expense_number, name, category, amount, description, created_by, status, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, 'pengeluaran', ?)`,
      [expDate, expNumber, name, category || 'umum', amount, description || '', req.session.user.id, payment_method || 'tunai']);
    res.json({ id, expense_number: expNumber, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const { name, category, amount, description, status, payment_method } = req.body;
    dbRun(`UPDATE expenses SET name=?, category=?, amount=?, description=?, status=?, payment_method=?, updated_at=datetime('now','localtime') WHERE id=?`, [name, category, amount, description, status, payment_method, parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  try { dbRun('DELETE FROM expenses WHERE id = ?', [parseInt(req.params.id)]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
