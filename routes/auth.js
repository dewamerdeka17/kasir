const express = require('express');
const bcrypt = require('bcryptjs');
const { dbGet } = require('../database/init');

const router = express.Router();

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password wajib diisi' });

    const user = dbGet('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    if (!user) return res.status(401).json({ error: 'Username atau password salah' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Username atau password salah' });

    req.session.user = { id: user.id, username: user.username, full_name: user.full_name, role: user.role };
    res.json({ success: true, user: req.session.user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: req.session.user });
});

module.exports = router;
