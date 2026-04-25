const express = require('express');
const { dbGet, dbAll, dbRun, dbInsert } = require('../../database/init');
const { requireAuth, requireRole } = require('../../middleware/auth');
const router = express.Router();

// GET /api/printers — semua printer
router.get('/', requireAuth, (req, res) => {
  try { res.json(dbAll('SELECT * FROM printers ORDER BY type, name')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/printers/logs — print logs
router.get('/logs', requireAuth, (req, res) => {
  try {
    const logs = dbAll(`
      SELECT pl.*, p.name as printer_name, t.invoice_number
      FROM print_logs pl
      LEFT JOIN printers p ON p.id = pl.printer_id
      LEFT JOIN transactions t ON t.id = pl.transaction_id
      ORDER BY pl.printed_at DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/printers — tambah printer
router.post('/', requireRole('admin'), (req, res) => {
  try {
    const { name, type, connection_type, address, port, device_id, notes, is_default } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Nama dan tipe printer wajib' });
    // Jika set default, reset default type yang sama dulu
    if (is_default) {
      dbRun('UPDATE printers SET is_default = 0 WHERE type = ?', [type]);
    }
    const id = dbInsert(
      'INSERT INTO printers (name, type, connection_type, address, port, device_id, notes, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, type, connection_type || 'network', address || '', port || 9100, device_id || '', notes || '', is_default ? 1 : 0]
    );
    res.json({ id, success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/printers/:id — update printer
router.put('/:id', requireRole('admin'), (req, res) => {
  try {
    const { name, type, connection_type, address, port, device_id, notes, is_active, is_default, is_online } = req.body;
    if (is_default) {
      dbRun('UPDATE printers SET is_default = 0 WHERE type = ?', [type]);
    }
    dbRun(
      'UPDATE printers SET name=?, type=?, connection_type=?, address=?, port=?, device_id=?, notes=?, is_active=?, is_default=?, is_online=? WHERE id=?',
      [name, type, connection_type, address, port || 9100, device_id || '', notes || '', is_active ?? 1, is_default ? 1 : 0, is_online ? 1 : 0, parseInt(req.params.id)]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/printers/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  try { dbRun('DELETE FROM printers WHERE id = ?', [parseInt(req.params.id)]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/printers/:id/test — test print
router.post('/:id/test', requireRole('admin'), (req, res) => {
  try {
    const printerId = parseInt(req.params.id);
    const printer = dbGet('SELECT * FROM printers WHERE id = ?', [printerId]);
    if (!printer) return res.status(404).json({ error: 'Printer tidak ditemukan' });

    // Simulasi test print: selalu berhasil jika printer aktif
    const status = printer.is_active ? 'test' : 'failed';
    const errorMsg = printer.is_active ? null : 'Printer tidak aktif';

    dbRun(`INSERT INTO print_logs (transaction_id, printer_id, print_type, status, content, error_message)
           VALUES (0, ?, 'test', ?, 'Test Print Log', ?)`,
      [printerId, status, errorMsg]);

    // Update is_online sesuai hasil test
    dbRun('UPDATE printers SET is_online = ? WHERE id = ?', [printer.is_active ? 1 : 0, printerId]);

    res.json({
      success: printer.is_active,
      printer: printer.name,
      status,
      message: printer.is_active ? `Test print ke "${printer.name}" berhasil` : `Printer "${printer.name}" tidak aktif`
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/printers/:id/toggle-online — toggle status online/offline
router.post('/:id/toggle-online', requireRole('admin'), (req, res) => {
  try {
    const printerId = parseInt(req.params.id);
    const printer = dbGet('SELECT * FROM printers WHERE id = ?', [printerId]);
    if (!printer) return res.status(404).json({ error: 'Printer tidak ditemukan' });
    const newStatus = printer.is_online ? 0 : 1;
    dbRun('UPDATE printers SET is_online = ? WHERE id = ?', [newStatus, printerId]);
    res.json({ success: true, is_online: newStatus });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/printers/logs/:id/retry — retry print yang gagal
router.post('/logs/:id/retry', requireRole('admin', 'kasir'), (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    const log = dbGet('SELECT * FROM print_logs WHERE id = ?', [logId]);
    if (!log) return res.status(404).json({ error: 'Log tidak ditemukan' });

    // Update retry count dan status
    dbRun(`UPDATE print_logs SET status='printed', retry_count = retry_count + 1,
           error_message = NULL, printed_at = datetime('now','localtime') WHERE id = ?`, [logId]);

    res.json({ success: true, message: 'Print ulang berhasil dikirim' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/printers/print-order — cetak order (tetap sama)
router.post('/print-order', requireRole('admin', 'kasir'), (req, res) => {
  try {
    const { transaction_id } = req.body;
    const tx = dbGet('SELECT * FROM transactions WHERE id = ?', [transaction_id]);
    if (!tx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    const items = dbAll('SELECT * FROM transaction_items WHERE transaction_id = ?', [transaction_id]);
    const makananItems = items.filter(i => i.menu_type === 'makanan');
    const minumanItems = items.filter(i => i.menu_type === 'minuman');
    const results = [];

    if (makananItems.length > 0) {
      const printer = dbGet("SELECT * FROM printers WHERE type = 'dapur' AND is_active = 1");
      const status = printer?.is_online ? 'printed' : 'failed';
      const errMsg = printer?.is_online ? null : (printer ? 'Printer dapur offline' : 'Printer dapur tidak ditemukan');
      dbRun(`INSERT INTO print_logs (transaction_id, printer_id, print_type, status, content, error_message) VALUES (?, ?, 'kitchen', ?, ?, ?)`,
        [transaction_id, printer?.id || null, status, JSON.stringify(makananItems), errMsg]);
      results.push({ type: 'kitchen', items: makananItems, printer: printer?.name || 'No printer', status });
    }
    if (minumanItems.length > 0) {
      const printer = dbGet("SELECT * FROM printers WHERE type = 'bar' AND is_active = 1");
      const status = printer?.is_online ? 'printed' : 'failed';
      const errMsg = printer?.is_online ? null : (printer ? 'Printer bar offline' : 'Printer bar tidak ditemukan');
      dbRun(`INSERT INTO print_logs (transaction_id, printer_id, print_type, status, content, error_message) VALUES (?, ?, 'bar', ?, ?, ?)`,
        [transaction_id, printer?.id || null, status, JSON.stringify(minumanItems), errMsg]);
      results.push({ type: 'bar', items: minumanItems, printer: printer?.name || 'No printer', status });
    }
    const rPrinter = dbGet("SELECT * FROM printers WHERE type = 'bar' AND is_active = 1");
    const rStatus = rPrinter?.is_online ? 'printed' : 'failed';
    const rErrMsg = rPrinter?.is_online ? null : (rPrinter ? 'Printer bar offline' : 'Printer bar tidak ditemukan');
    dbRun(`INSERT INTO print_logs (transaction_id, printer_id, print_type, status, content, error_message) VALUES (?, ?, 'receipt', ?, ?, ?)`,
      [transaction_id, rPrinter?.id || null, rStatus, JSON.stringify(items), rErrMsg]);
    results.push({ type: 'receipt', items, printer: rPrinter?.name || 'No printer', status: rStatus });

    res.json({ success: true, prints: results, transaction: tx });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
