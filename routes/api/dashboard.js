const express = require('express');
const { dbGet, dbAll, dbRun, dbInsert } = require('../../database/init');
const { requireAuth } = require('../../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const revenue = dbGet(`SELECT COALESCE(SUM(total), 0) as total_revenue FROM transactions WHERE DATE(created_at) = ? AND status IN ('paid','completed')`, [today]);
    const txCount = dbGet(`SELECT COUNT(*) as count FROM transactions WHERE DATE(created_at) = ? AND status IN ('paid','completed')`, [today]);
    const expenses = dbGet(`SELECT COALESCE(SUM(CASE WHEN status = 'pengeluaran' THEN amount ELSE 0 END), 0) as total_expense, COALESCE(SUM(CASE WHEN status = 'kasbon' THEN amount ELSE 0 END), 0) as total_kasbon FROM expenses WHERE date = ?`, [today]);
    const topMenus = dbAll(`SELECT ti.menu_name, SUM(ti.quantity) as total_sold, SUM(ti.subtotal - ti.discount_amount) as total_revenue FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id WHERE DATE(t.created_at) = ? AND t.status IN ('paid','completed') GROUP BY ti.menu_id ORDER BY total_sold DESC LIMIT 5`, [today]);
    const lowStockIngredients = dbAll(`SELECT i.name, i.unit, i.min_stock, COALESCE(s.quantity, 0) as current_stock FROM ingredients i LEFT JOIN ingredient_stocks s ON s.ingredient_id = i.id WHERE COALESCE(s.quantity, 0) <= i.min_stock ORDER BY COALESCE(s.quantity, 0) ASC LIMIT 10`);
    const lowStockMenus = dbAll(`SELECT m.name, COALESCE(ms.quantity, 0) as current_stock, COALESCE(ms.min_stock, 5) as min_stock FROM menus m LEFT JOIN menu_stocks ms ON ms.menu_id = m.id WHERE COALESCE(ms.quantity, 0) <= COALESCE(ms.min_stock, 5) AND m.is_active = 1 ORDER BY COALESCE(ms.quantity, 0) ASC LIMIT 10`);
    const paymentSummary = dbGet(`SELECT COALESCE(SUM(CASE WHEN p.method = 'tunai' THEN p.amount_paid ELSE 0 END), 0) as tunai, COALESCE(SUM(CASE WHEN p.method = 'qris' THEN p.amount_paid ELSE 0 END), 0) as qris FROM payments p JOIN transactions t ON t.id = p.transaction_id WHERE DATE(t.created_at) = ? AND t.status IN ('paid','completed')`, [today]);
    const salesChart = dbAll(`SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as revenue, COUNT(*) as count FROM transactions WHERE DATE(created_at) >= DATE('now', '-6 days', 'localtime') AND status IN ('paid','completed') GROUP BY DATE(created_at) ORDER BY date ASC`);
    const discountTotal = dbGet(`SELECT COALESCE(SUM(discount_amount), 0) as total FROM transactions WHERE DATE(created_at) = ? AND status IN ('paid','completed')`, [today]);

    res.json({
      today: {
        revenue: revenue.total_revenue, transactions: txCount.count,
        expenses: expenses.total_expense, kasbon: expenses.total_kasbon,
        discount: discountTotal.total,
        gross_profit: revenue.total_revenue - expenses.total_expense - expenses.total_kasbon
      },
      topMenus, lowStockIngredients, lowStockMenus,
      paymentSummary: paymentSummary || { tunai: 0, qris: 0 },
      salesChart
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
