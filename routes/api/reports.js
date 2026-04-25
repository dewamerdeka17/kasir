const express = require('express');
const { dbGet, dbAll } = require('../../database/init');
const { requireRole } = require('../../middleware/auth');
const router = express.Router();

router.get('/', requireRole('admin', 'owner'), (req, res) => {
  try {
    const { period, date_from, date_to } = req.query;
    let startDate, endDate;
    const today = new Date();

    if (date_from && date_to) { startDate = date_from; endDate = date_to; }
    else {
      switch (period) {
        case 'weekly':
          const ws = new Date(today); ws.setDate(today.getDate() - today.getDay());
          startDate = ws.toISOString().split('T')[0]; endDate = today.toISOString().split('T')[0]; break;
        case 'monthly':
          startDate = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-01`; endDate = today.toISOString().split('T')[0]; break;
        case 'yearly':
          startDate = `${today.getFullYear()}-01-01`; endDate = today.toISOString().split('T')[0]; break;
        default: startDate = today.toISOString().split('T')[0]; endDate = startDate;
      }
    }

    const summary = dbGet(`SELECT COUNT(*) as total_transactions, COALESCE(SUM(total), 0) as total_revenue, COALESCE(SUM(subtotal), 0) as total_subtotal, COALESCE(SUM(discount_amount), 0) as total_discount FROM transactions WHERE DATE(created_at) BETWEEN ? AND ? AND status IN ('paid','completed')`, [startDate, endDate]);
    const itemsSold = dbGet(`SELECT COALESCE(SUM(ti.quantity), 0) as total_items FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id WHERE DATE(t.created_at) BETWEEN ? AND ? AND t.status IN ('paid','completed')`, [startDate, endDate]);
    const paymentBreakdown = dbGet(`SELECT COALESCE(SUM(CASE WHEN p.method = 'tunai' THEN p.amount_paid ELSE 0 END), 0) as total_tunai, COALESCE(SUM(CASE WHEN p.method = 'qris' THEN p.amount_paid ELSE 0 END), 0) as total_qris, COALESCE(SUM(CASE WHEN p.method = 'tunai' THEN 1 ELSE 0 END), 0) as count_tunai, COALESCE(SUM(CASE WHEN p.method = 'qris' THEN 1 ELSE 0 END), 0) as count_qris FROM payments p JOIN transactions t ON t.id = p.transaction_id WHERE DATE(t.created_at) BETWEEN ? AND ? AND t.status IN ('paid','completed')`, [startDate, endDate]);
    const expenseSummary = dbGet(`SELECT COALESCE(SUM(CASE WHEN status = 'pengeluaran' THEN amount ELSE 0 END), 0) as total_expense, COALESCE(SUM(CASE WHEN status = 'kasbon' THEN amount ELSE 0 END), 0) as total_kasbon FROM expenses WHERE date BETWEEN ? AND ?`, [startDate, endDate]);
    const topMenus = dbAll(`SELECT ti.menu_name, ti.menu_type, SUM(ti.quantity) as total_sold, SUM(ti.subtotal - ti.discount_amount) as total_revenue FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id WHERE DATE(t.created_at) BETWEEN ? AND ? AND t.status IN ('paid','completed') GROUP BY ti.menu_id ORDER BY total_sold DESC LIMIT 10`, [startDate, endDate]);
    const topCategories = dbAll(`SELECT c.name as category_name, c.type, SUM(ti.quantity) as total_sold, SUM(ti.subtotal - ti.discount_amount) as total_revenue FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id JOIN menus m ON m.id = ti.menu_id JOIN categories c ON c.id = m.category_id WHERE DATE(t.created_at) BETWEEN ? AND ? AND t.status IN ('paid','completed') GROUP BY c.id ORDER BY total_sold DESC`, [startDate, endDate]);
    const peakHours = dbAll(`SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count, SUM(total) as revenue FROM transactions WHERE DATE(created_at) BETWEEN ? AND ? AND status IN ('paid','completed') GROUP BY hour ORDER BY count DESC`, [startDate, endDate]);
    const transactions = dbAll(`SELECT t.*, u.full_name as cashier_name, p.method as payment_method FROM transactions t LEFT JOIN users u ON u.id = t.user_id LEFT JOIN payments p ON p.transaction_id = t.id WHERE DATE(t.created_at) BETWEEN ? AND ? ORDER BY t.created_at DESC`, [startDate, endDate]);
    const cancelledTx = dbAll(`SELECT t.*, u.full_name as cashier_name FROM transactions t LEFT JOIN users u ON u.id = t.user_id WHERE DATE(t.created_at) BETWEEN ? AND ? AND t.status = 'cancelled' ORDER BY t.created_at DESC`, [startDate, endDate]);
    const discountHistory = dbAll(`SELECT t.invoice_number, t.discount_type, t.discount_value, t.discount_amount, du.full_name as discount_by_name, t.created_at FROM transactions t LEFT JOIN users du ON du.id = t.discount_by WHERE DATE(t.created_at) BETWEEN ? AND ? AND t.discount_amount > 0 AND t.status IN ('paid','completed') ORDER BY t.created_at DESC`, [startDate, endDate]);
    const itemDiscountHistory = dbAll(`SELECT t.invoice_number, ti.menu_name, ti.discount_type, ti.discount_value, ti.discount_amount, du.full_name as discount_by_name, t.created_at FROM transaction_items ti JOIN transactions t ON t.id = ti.transaction_id LEFT JOIN users du ON du.id = ti.discount_by WHERE DATE(t.created_at) BETWEEN ? AND ? AND ti.discount_amount > 0 AND t.status IN ('paid','completed') ORDER BY t.created_at DESC`, [startDate, endDate]);
    const expenseList = dbAll(`SELECT e.*, u.full_name as created_by_name FROM expenses e LEFT JOIN users u ON u.id = e.created_by WHERE e.date BETWEEN ? AND ? ORDER BY e.created_at DESC`, [startDate, endDate]);
    const stockOutSummary = dbAll(`SELECT sm.reference_id, CASE WHEN sm.type = 'menu' THEN m.name ELSE i.name END as item_name, sm.type, SUM(sm.quantity) as total_out FROM stock_movements sm LEFT JOIN menus m ON sm.type = 'menu' AND m.id = sm.reference_id LEFT JOIN ingredients i ON sm.type = 'ingredient' AND i.id = sm.reference_id WHERE sm.movement_type = 'out' AND DATE(sm.created_at) BETWEEN ? AND ? GROUP BY sm.type, sm.reference_id ORDER BY total_out DESC`, [startDate, endDate]);
    const lowStockMenus = dbAll(`SELECT m.name, COALESCE(ms.quantity, 0) as current_stock, COALESCE(ms.min_stock, 5) as min_stock FROM menus m LEFT JOIN menu_stocks ms ON ms.menu_id = m.id WHERE COALESCE(ms.quantity, 0) <= COALESCE(ms.min_stock, 5) AND m.is_active = 1`);
    const lowStockIngredients = dbAll(`SELECT i.name, i.unit, COALESCE(s.quantity, 0) as current_stock, i.min_stock FROM ingredients i LEFT JOIN ingredient_stocks s ON s.ingredient_id = i.id WHERE COALESCE(s.quantity, 0) <= i.min_stock`);

    res.json({
      period: { start: startDate, end: endDate },
      summary: { ...summary, total_items: itemsSold?.total_items || 0, ...(paymentBreakdown || {}), ...(expenseSummary || {}), gross_profit: (summary?.total_revenue || 0) - (expenseSummary?.total_expense || 0) - (expenseSummary?.total_kasbon || 0) },
      topMenus, topCategories, peakHours, transactions, cancelledTx,
      discountHistory: [...discountHistory, ...itemDiscountHistory],
      expenseList, stockOutSummary, lowStockMenus, lowStockIngredients
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
