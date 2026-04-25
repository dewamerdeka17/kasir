const express = require('express');
const bcrypt = require('bcryptjs');
const { dbGet, dbAll, dbRun, dbInsert } = require('../../database/init');
const { requireRole } = require('../../middleware/auth');
const router = express.Router();

router.get('/', requireRole('admin'), (req, res) => {
  try { res.json(dbAll('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin'), (req, res) => {
  try {
    const { username, password, full_name, role, is_active } = req.body;
    if (!username || !password || !full_name || !role)
      return res.status(400).json({ error: 'Data user tidak lengkap (username, password, nama, role wajib diisi)' });
    // Validasi role
    const validRoles = ['admin', 'kasir', 'owner'];
    if (!validRoles.includes(role))
      return res.status(400).json({ error: `Role tidak valid. Pilih: ${validRoles.join(', ')}` });
    // Cek duplikat username
    const existing = dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(400).json({ error: `Username "${username}" sudah digunakan` });
    // Validasi panjang password
    if (password.length < 6)
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    const hash = bcrypt.hashSync(password, 10);
    const id = dbInsert(
      'INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [username, hash, full_name, role, is_active !== undefined ? parseInt(is_active) : 1]
    );
    res.json({ id, success: true, message: `User "${username}" berhasil dibuat` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const { full_name, role, is_active, password } = req.body;
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      dbRun('UPDATE users SET full_name=?, role=?, is_active=?, password_hash=? WHERE id=?', [full_name, role, is_active ?? 1, hash, parseInt(req.params.id)]);
    } else {
      dbRun('UPDATE users SET full_name=?, role=?, is_active=? WHERE id=?', [full_name, role, is_active ?? 1, parseInt(req.params.id)]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    if (parseInt(req.params.id) === req.session.user.id) return res.status(400).json({ error: 'Tidak bisa hapus akun sendiri' });
    dbRun('UPDATE users SET is_active = 0 WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Hapus permanen user (hard delete)
router.delete('/:id/permanent', requireRole('admin'), (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.session.user.id)
      return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });

    // Cek apakah user ada
    const user = dbGet('SELECT id, username FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Cek apakah user punya transaksi (jangan hapus jika masih ada data terkait)
    const txCount = dbGet('SELECT COUNT(*) as cnt FROM transactions WHERE user_id = ?', [userId]);
    if (txCount && txCount.cnt > 0) {
      return res.status(400).json({
        error: `User "${user.username}" memiliki ${txCount.cnt} transaksi. Nonaktifkan saja untuk menjaga integritas data.`
      });
    }

    dbRun('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true, message: `User "${user.username}" berhasil dihapus permanen` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
