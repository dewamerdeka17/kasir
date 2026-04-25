const express = require('express');
const path = require('path');
const fs = require('fs');
const { dbGet, dbAll, dbRun } = require('../../database/init');
const { requireAuth, requireRole } = require('../../middleware/auth');
const router = express.Router();

// Multer setup untuk upload QRIS
let upload;
try {
  const multer = require('multer');
  const uploadDir = path.join(__dirname, '../../public/uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `qris${ext}`);
    }
  });
  upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error('Hanya file gambar yang diizinkan (JPG, PNG, WEBP)'));
    }
  });
} catch (e) {
  // multer belum diinstall, upload fitur tidak tersedia
  upload = null;
}

// GET /api/settings — ambil semua settings
router.get('/', requireAuth, (req, res) => {
  try {
    const rows = dbAll('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/settings/:key — ambil satu setting
router.get('/:key', requireAuth, (req, res) => {
  try {
    const row = dbGet('SELECT value FROM settings WHERE key = ?', [req.params.key]);
    res.json({ key: req.params.key, value: row?.value || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/settings/:key — update atau insert setting
router.put('/:key', requireRole('admin'), (req, res) => {
  try {
    const { value } = req.body;
    dbRun(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))
           ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
      [req.params.key, value]);
    res.json({ success: true, key: req.params.key, value });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/settings/upload-qris — upload foto QRIS
router.post('/upload-qris', requireRole('admin'), (req, res) => {
  if (!upload) {
    return res.status(501).json({ error: 'Fitur upload belum tersedia. Install multer terlebih dahulu.' });
  }

  upload.single('qris_image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah' });

    const qrisPath = `/uploads/${req.file.filename}`;

    // Simpan path ke settings
    try {
      dbRun(`INSERT INTO settings (key, value, updated_at) VALUES ('qris_image', ?, datetime('now','localtime'))
             ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
        [qrisPath]);
      res.json({ success: true, path: qrisPath });
    } catch (dbErr) {
      res.status(500).json({ error: dbErr.message });
    }
  });
});

// DELETE /api/settings/qris-image — hapus foto QRIS
router.delete('/qris-image', requireRole('admin'), (req, res) => {
  try {
    const row = dbGet("SELECT value FROM settings WHERE key = 'qris_image'");
    if (row?.value) {
      const filePath = path.join(__dirname, '../../public', row.value);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    dbRun("DELETE FROM settings WHERE key = 'qris_image'");
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
