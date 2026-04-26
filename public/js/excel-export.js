// ============================================================
//  EXCEL EXPORT — Kedai Pulo POS (Safe Revision)
//  Requires: ExcelJS (loaded via CDN in index.html)
// ============================================================

async function exportReportExcel(data) {
  if (typeof ExcelJS === 'undefined') {
    showToast('Library Excel belum siap, coba lagi sebentar', 'warning');
    return;
  }

  const d     = data;
  const s     = d.summary;
  const now   = new Date();
  const brand = BRAND.name;

  // ── helpers ──────────────────────────────────────────────
  function rp(val) {
    const n = Number(val) || 0;
    return 'Rp ' + n.toLocaleString('id-ID');
  }
  function fmtDate(str) {
    if (!str) return '-';
    const dt = new Date(str);
    return dt.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' });
  }
  function fmtTime(str) {
    if (!str) return '-';
    const dt = new Date(str);
    return dt.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
  }
  function fmtDateTime(str) {
    if (!str) return '-';
    return fmtDate(str) + ' ' + fmtTime(str);
  }

  // ── styles ───────────────────────────────────────────────
  const HEADER_FILL = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF4F4FBF' } }; // indigo
  const HEADER_FONT = { bold:true, color:{ argb:'FFFFFFFF' }, size:11 };
  const TITLE_FONT  = { bold:true, size:14, color:{ argb:'FF4F4FBF' } };
  const BOLD        = { bold:true };
  const BORDER_THIN = {
    top:{ style:'thin', color:{ argb:'FFD0D0D0' } },
    left:{ style:'thin', color:{ argb:'FFD0D0D0' } },
    bottom:{ style:'thin', color:{ argb:'FFD0D0D0' } },
    right:{ style:'thin', color:{ argb:'FFD0D0D0' } }
  };
  const SUMMARY_FILL = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF0F0FF' } };

  function styleHeaderRow(row) {
    row.eachCell(cell => {
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      cell.border = BORDER_THIN;
      cell.alignment = { vertical:'middle', horizontal:'center', wrapText:true };
    });
    row.height = 22;
  }

  function styleDataRow(row, cols) {
    row.eachCell({ includeEmpty:true }, (cell, colNum) => {
      cell.border = BORDER_THIN;
      const cfg = cols[colNum - 1];
      if (cfg) cell.alignment = { horizontal: cfg.align || 'left', vertical:'middle' };
    });
  }

  function autoWidth(sheet, cols) {
    cols.forEach((cfg, i) => {
      sheet.getColumn(i + 1).width = cfg.width || 18;
    });
  }

  function addSheetTitle(sheet, title, colCount) {
    const exportStr = 'Diekspor: ' + fmtDateTime(now.toISOString());
    const periodeStr = 'Periode: ' + fmtDate(d.period.start) + ' s/d ' + fmtDate(d.period.end);

    const r1 = sheet.addRow([brand + ' — ' + title]);
    r1.getCell(1).font = TITLE_FONT;
    sheet.mergeCells(r1.number, 1, r1.number, colCount);

    const r2 = sheet.addRow([periodeStr]);
    r2.getCell(1).font = { italic:true, color:{ argb:'FF666688' } };
    sheet.mergeCells(r2.number, 1, r2.number, colCount);

    const r3 = sheet.addRow([exportStr]);
    r3.getCell(1).font = { italic:true, color:{ argb:'FF999999' } };
    sheet.mergeCells(r3.number, 1, r3.number, colCount);

    sheet.addRow([]);
  }

  function emptyState(sheet, msg, colCount) {
    const r = sheet.addRow([msg || 'Belum ada data pada periode ini.']);
    r.getCell(1).font = { italic:true, color:{ argb:'FF999999' } };
    sheet.mergeCells(r.number, 1, r.number, colCount);
  }

  // ── workbook ─────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator  = brand;
  wb.created  = now;
  wb.modified = now;

  // ════════════════════════════════════════════════════════
  //  SHEET 1: RINGKASAN
  // ════════════════════════════════════════════════════════
  const shRing = wb.addWorksheet('Ringkasan', { tabColor:{ argb:'FF6366F1' } });
  shRing.getColumn(1).width = 28;
  shRing.getColumn(2).width = 24;

  // Title block
  const rt1 = shRing.addRow([brand]);
  rt1.getCell(1).font = { bold:true, size:16, color:{ argb:'FF4F4FBF' } };
  shRing.mergeCells(rt1.number, 1, rt1.number, 2);

  const rt2 = shRing.addRow(['LAPORAN PENJUALAN']);
  rt2.getCell(1).font = { bold:true, size:13 };
  shRing.mergeCells(rt2.number, 1, rt2.number, 2);

  shRing.addRow(['Periode', fmtDate(d.period.start) + ' s/d ' + fmtDate(d.period.end)]);
  shRing.addRow(['Diekspor', fmtDateTime(now.toISOString())]);
  const userName = (window._currentUser && (window._currentUser.full_name || window._currentUser.username)) || 'Admin';
  shRing.addRow(['Oleh', userName]);
  shRing.addRow([]);

  // Summary section
  const ringHeaders = shRing.addRow(['RINGKASAN KEUANGAN', '']);
  ringHeaders.getCell(1).font = { bold:true, size:12, color:{ argb:'FFFFFFFF' } };
  ringHeaders.getCell(1).fill = HEADER_FILL;
  ringHeaders.getCell(2).fill = HEADER_FILL;
  shRing.mergeCells(ringHeaders.number, 1, ringHeaders.number, 2);

  const summaryRows = [
    ['Total Omzet',        rp(s.total_revenue)],
    ['Total Transaksi',    String(s.total_transactions) + ' transaksi'],
    ['Total Item Terjual', String(s.total_items) + ' item'],
    ['Tunai',              rp(s.total_tunai)],
    ['QRIS',               rp(s.total_qris)],
    ['Diskon',             rp(s.total_discount)],
    ['Pengeluaran',        rp(s.total_expense)],
    ['Kasbon',             rp(s.total_kasbon || 0)],
    ['Laba Kotor',         rp(s.gross_profit)],
  ];

  summaryRows.forEach((rowData, idx) => {
    const r = shRing.addRow(rowData);
    r.getCell(1).font = BOLD;
    r.getCell(2).alignment = { horizontal:'right' };
    if (idx === summaryRows.length - 1) {
      r.eachCell(c => { c.fill = SUMMARY_FILL; c.font = { bold:true }; });
    }
    r.eachCell(c => { c.border = BORDER_THIN; });
  });

  shRing.addRow([]);

  // Menu terlaris
  const mhRow = shRing.addRow(['MENU TERLARIS', '', '', '']);
  mhRow.getCell(1).font = HEADER_FONT;
  mhRow.getCell(1).fill = HEADER_FILL;
  [1,2,3,4].forEach(i => { shRing.getRow(mhRow.number).getCell(i).fill = HEADER_FILL; });
  shRing.mergeCells(mhRow.number, 1, mhRow.number, 4);
  shRing.getColumn(3).width = 14;
  shRing.getColumn(4).width = 20;

  const mh2 = shRing.addRow(['No', 'Nama Menu', 'Terjual', 'Pendapatan']);
  styleHeaderRow(mh2);

  if (d.topMenus.length > 0) {
    d.topMenus.slice(0, 10).forEach((m, i) => {
      const r = shRing.addRow([i + 1, m.menu_name, m.total_sold + 'x', rp(m.total_revenue)]);
      styleDataRow(r, [
        { align:'center' }, { align:'left' }, { align:'center' }, { align:'right' }
      ]);
    });
  } else {
    emptyState(shRing, 'Belum ada data menu terlaris.', 4);
  }

  shRing.addRow([]);

  // Kategori terlaris
  const kh = shRing.addRow(['KATEGORI TERLARIS', '']);
  kh.getCell(1).font = HEADER_FONT;
  [1,2,3].forEach(i => shRing.getRow(kh.number).getCell(i).fill = HEADER_FILL);
  shRing.mergeCells(kh.number, 1, kh.number, 3);
  const kh2 = shRing.addRow(['No', 'Kategori', 'Terjual']);
  styleHeaderRow(kh2);
  if (d.topCategories.length > 0) {
    d.topCategories.slice(0, 5).forEach((c, i) => {
      const r = shRing.addRow([i + 1, c.category_name, c.total_sold + 'x']);
      styleDataRow(r, [{ align:'center' }, { align:'left' }, { align:'center' }]);
    });
  } else {
    emptyState(shRing, 'Belum ada data kategori.', 3);
  }

  shRing.addRow([]);

  // Jam ramai
  const jamH = shRing.addRow(['JAM RAMAI', '']);
  jamH.getCell(1).font = HEADER_FONT;
  [1,2,3].forEach(i => shRing.getRow(jamH.number).getCell(i).fill = HEADER_FILL);
  shRing.mergeCells(jamH.number, 1, jamH.number, 3);
  const jamH2 = shRing.addRow(['Jam', 'Transaksi', 'Omzet']);
  styleHeaderRow(jamH2);
  if (d.peakHours && d.peakHours.length > 0) {
    const sorted = [...d.peakHours].sort((a, b) => b.count - a.count).slice(0, 8);
    sorted.forEach(h => {
      const label = String(h.hour).padStart(2,'0') + ':00 - ' + String(h.hour + 1).padStart(2,'0') + ':00';
      const r = shRing.addRow([label, h.count, rp(h.revenue || 0)]);
      styleDataRow(r, [{ align:'center' }, { align:'center' }, { align:'right' }]);
    });
  } else {
    emptyState(shRing, 'Belum ada data jam ramai.', 3);
  }

  shRing.views = [{ state:'frozen', ySplit:6 }];

  // ════════════════════════════════════════════════════════
  //  SHEET 2: TRANSAKSI
  // ════════════════════════════════════════════════════════
  const shTx = wb.addWorksheet('Transaksi', { tabColor:{ argb:'FF22C55E' } });
  const txCols = [
    { header:'No',       width:6,  align:'center' },
    { header:'Invoice',  width:20, align:'left'   },
    { header:'Tanggal',  width:14, align:'center' },
    { header:'Jam',      width:10, align:'center' },
    { header:'Kasir',    width:18, align:'left'   },
    { header:'Meja',     width:10, align:'center' },
    { header:'Metode',   width:12, align:'center' },
    { header:'Subtotal', width:18, align:'right'  },
    { header:'Diskon',   width:16, align:'right'  },
    { header:'Total',    width:18, align:'right'  },
    { header:'Status',   width:14, align:'center' },
  ];
  addSheetTitle(shTx, 'Daftar Transaksi', txCols.length);
  const txH = shTx.addRow(txCols.map(c => c.header));
  styleHeaderRow(txH);
  txCols.forEach((c, i) => { shTx.getColumn(i+1).width = c.width; });

  if (d.transactions && d.transactions.length > 0) {
    d.transactions.forEach((t, i) => {
      const r = shTx.addRow([
        i + 1, t.invoice_number, fmtDate(t.created_at), fmtTime(t.created_at),
        t.cashier_name || '-', t.table_number || '-', t.payment_method || '-',
        rp(t.subtotal), rp(t.discount_amount), rp(t.total), t.status || '-'
      ]);
      styleDataRow(r, txCols);
    });
    shTx.autoFilter = { from: { row: txH.number, column: 1 }, to: { row: txH.number, column: txCols.length } };
  } else {
    emptyState(shTx, 'Belum ada transaksi pada periode ini.', txCols.length);
  }
  shTx.views = [{ state:'frozen', ySplit: txH.number }];

  // ════════════════════════════════════════════════════════
  //  SHEET 3: PENGELUARAN
  // ════════════════════════════════════════════════════════
  const shExp = wb.addWorksheet('Pengeluaran', { tabColor:{ argb:'FFF59E0B' } });
  const expCols = [
    { header:'No',        width:6,  align:'center' },
    { header:'Tanggal',   width:14, align:'center' },
    { header:'Jam',       width:10, align:'center' },
    { header:'Nomor',     width:20, align:'left'   },
    { header:'Nama',      width:24, align:'left'   },
    { header:'Kategori',  width:18, align:'left'   },
    { header:'Nominal',   width:18, align:'right'  },
    { header:'Status',    width:14, align:'center' },
    { header:'Dibuat Oleh', width:18, align:'left' },
  ];
  addSheetTitle(shExp, 'Pengeluaran', expCols.length);
  const expH = shExp.addRow(expCols.map(c => c.header));
  styleHeaderRow(expH);
  expCols.forEach((c, i) => { shExp.getColumn(i+1).width = c.width; });

  if (d.expenseList && d.expenseList.length > 0) {
    d.expenseList.forEach((e, i) => {
      const r = shExp.addRow([
        i+1, fmtDate(e.date), fmtTime(e.date || e.created_at),
        e.expense_number, e.name, e.category,
        rp(e.amount), e.status || '-', e.created_by_name || '-'
      ]);
      styleDataRow(r, expCols);
    });
    shExp.autoFilter = { from:{ row:expH.number, column:1 }, to:{ row:expH.number, column:expCols.length } };
  } else {
    emptyState(shExp, 'Belum ada pengeluaran pada periode ini.', expCols.length);
  }
  shExp.views = [{ state:'frozen', ySplit:expH.number }];

  // ════════════════════════════════════════════════════════
  //  SHEET 4: DISKON
  // ════════════════════════════════════════════════════════
  const shDis = wb.addWorksheet('Diskon', { tabColor:{ argb:'FFE879F9' } });
  const disCols = [
    { header:'No',          width:6,  align:'center' },
    { header:'Invoice',     width:20, align:'left'   },
    { header:'Menu',        width:22, align:'left'   },
    { header:'Tipe Diskon', width:14, align:'center' },
    { header:'Nilai',       width:14, align:'right'  },
    { header:'Potongan',    width:16, align:'right'  },
    { header:'Oleh',        width:18, align:'left'   },
    { header:'Waktu',       width:18, align:'center' },
  ];
  addSheetTitle(shDis, 'Riwayat Diskon', disCols.length);
  const disH = shDis.addRow(disCols.map(c => c.header));
  styleHeaderRow(disH);
  disCols.forEach((c, i) => { shDis.getColumn(i+1).width = c.width; });

  if (d.discountHistory && d.discountHistory.length > 0) {
    d.discountHistory.forEach((dh, i) => {
      const nilai = dh.discount_type === 'percentage'
        ? dh.discount_value + '%'
        : rp(dh.discount_value);
      const r = shDis.addRow([
        i+1, dh.invoice_number, dh.menu_name || 'Transaksi',
        dh.discount_type, nilai, rp(dh.discount_amount),
        dh.discount_by_name || '-', fmtDateTime(dh.created_at)
      ]);
      styleDataRow(r, disCols);
    });
    shDis.autoFilter = { from:{ row:disH.number, column:1 }, to:{ row:disH.number, column:disCols.length } };
  } else {
    emptyState(shDis, 'Belum ada diskon pada periode ini.', disCols.length);
  }
  shDis.views = [{ state:'frozen', ySplit:disH.number }];

  // ════════════════════════════════════════════════════════
  //  SHEET 5: MENU TERLARIS (detail)
  // ════════════════════════════════════════════════════════
  const shMenu = wb.addWorksheet('Penjualan Menu', { tabColor:{ argb:'FF38BDF8' } });
  const menuCols = [
    { header:'No',         width:6,  align:'center' },
    { header:'Nama Menu',  width:26, align:'left'   },
    { header:'Tipe',       width:14, align:'center' },
    { header:'Qty Terjual',width:14, align:'center' },
    { header:'Pendapatan', width:20, align:'right'  },
  ];
  addSheetTitle(shMenu, 'Penjualan per Menu', menuCols.length);
  const menuH = shMenu.addRow(menuCols.map(c => c.header));
  styleHeaderRow(menuH);
  menuCols.forEach((c, i) => { shMenu.getColumn(i+1).width = c.width; });

  if (d.topMenus && d.topMenus.length > 0) {
    d.topMenus.forEach((m, i) => {
      const r = shMenu.addRow([i+1, m.menu_name, m.menu_type || '-', m.total_sold, rp(m.total_revenue)]);
      styleDataRow(r, menuCols);
    });
    shMenu.autoFilter = { from:{ row:menuH.number, column:1 }, to:{ row:menuH.number, column:menuCols.length } };
  } else {
    emptyState(shMenu, 'Belum ada data penjualan menu.', menuCols.length);
  }
  shMenu.views = [{ state:'frozen', ySplit:menuH.number }];

  // ════════════════════════════════════════════════════════
  //  SHEET 6: STOK
  // ════════════════════════════════════════════════════════
  const shStok = wb.addWorksheet('Stok', { tabColor:{ argb:'FF84CC16' } });
  const stokCols = [
    { header:'No',         width:6,  align:'center' },
    { header:'Nama Item',  width:26, align:'left'   },
    { header:'Tipe',       width:14, align:'center' },
    { header:'Total Keluar',width:14, align:'center'},
  ];
  addSheetTitle(shStok, 'Ringkasan Stok Keluar', stokCols.length);
  const stokH = shStok.addRow(stokCols.map(c => c.header));
  styleHeaderRow(stokH);
  stokCols.forEach((c, i) => { shStok.getColumn(i+1).width = c.width; });

  if (d.stockOutSummary && d.stockOutSummary.length > 0) {
    d.stockOutSummary.forEach((st, i) => {
      const r = shStok.addRow([i+1, st.item_name, st.type || '-', st.total_out]);
      styleDataRow(r, stokCols);
    });
    shStok.autoFilter = { from:{ row:stokH.number, column:1 }, to:{ row:stokH.number, column:stokCols.length } };
  } else {
    emptyState(shStok, 'Belum ada data stok keluar.', stokCols.length);
  }
  shStok.views = [{ state:'frozen', ySplit:stokH.number }];

  // ════════════════════════════════════════════════════════
  //  SHEET 7: PEMBATALAN
  // ════════════════════════════════════════════════════════
  const shBatal = wb.addWorksheet('Pembatalan', { tabColor:{ argb:'FFEF4444' } });
  const batalCols = [
    { header:'No',       width:6,  align:'center' },
    { header:'Invoice',  width:20, align:'left'   },
    { header:'Tanggal',  width:14, align:'center' },
    { header:'Jam',      width:10, align:'center' },
    { header:'Kasir',    width:18, align:'left'   },
    { header:'Total',    width:18, align:'right'  },
    { header:'Status',   width:14, align:'center' },
  ];
  addSheetTitle(shBatal, 'Transaksi Dibatalkan', batalCols.length);
  const batalH = shBatal.addRow(batalCols.map(c => c.header));
  styleHeaderRow(batalH);
  batalCols.forEach((c, i) => { shBatal.getColumn(i+1).width = c.width; });

  if (d.cancelledTx && d.cancelledTx.length > 0) {
    d.cancelledTx.forEach((t, i) => {
      const r = shBatal.addRow([
        i+1, t.invoice_number, fmtDate(t.created_at), fmtTime(t.created_at),
        t.cashier_name || '-', rp(t.total), t.status || '-'
      ]);
      styleDataRow(r, batalCols);
    });
    shBatal.autoFilter = { from:{ row:batalH.number, column:1 }, to:{ row:batalH.number, column:batalCols.length } };
  } else {
    emptyState(shBatal, 'Tidak ada transaksi dibatalkan.', batalCols.length);
  }
  shBatal.views = [{ state:'frozen', ySplit:batalH.number }];

  // ── Generate & Download ───────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const from = d.period.start;
  const to   = d.period.end;
  a.href     = url;
  a.download = `laporan_kedai_pulo_${from}_sampai_${to}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Export Excel berhasil! File .xlsx siap diunduh 📊', 'success');
}
