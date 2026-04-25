// Print Utilities — Revisi 2026-04 (template dari settings, backward compatible)

// Cache template yang sudah dimuat dari settings
window._receiptTemplates = window._receiptTemplates || {};

// Helper: ambil template dari cache atau load dari settings
async function loadReceiptTemplates() {
  try {
    const settings = await API.get('/api/settings').catch(() => ({}));
    ['bar','dapur'].forEach(type => {
      try {
        let raw = settings[`receipt_template_${type}`];
        // Fallback: jika bar belum ada tapi kasir ada (migrasi dari data lama)
        if (!raw && type === 'bar' && settings['receipt_template_kasir']) {
          raw = settings['receipt_template_kasir'];
        }
        window._receiptTemplates[type] = raw ? JSON.parse(raw) : null;
      } catch(e) { window._receiptTemplates[type] = null; }
    });
  } catch(e) {}
}

// Ambil opsi template (fallback ke semua-tampil jika belum ada)
function getTplOption(type, key, defaultVal = true) {
  const tpl = window._receiptTemplates?.[type];
  if (!tpl || tpl[key] === undefined) return defaultVal;
  return tpl[key];
}
function getTplText(type, key, defaultVal = '') {
  const tpl = window._receiptTemplates?.[type];
  if (!tpl || !tpl[key]) return defaultVal;
  return tpl[key];
}

const PrintUtil = {
  generateReceipt(transaction, items, payment, tplType = 'bar') {
    const now = new Date(transaction.created_at || new Date());
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const t = tplType; // alias pendek

    // Custom store info dari template (override BRAND defaults)
    const storeName = getTplText(t, 'custom_store_name', '') || BRAND.receiptHeader;
    const storeAddr = getTplText(t, 'custom_store_address', '') || BRAND.receiptTagline;
    const storeContact = getTplText(t, 'custom_store_contact', '');

    let html = `
      <div class="print-receipt">
        <div class="receipt-header">`;

    if (getTplOption(t, 'show_store_name', true)) {
      html += `<h2>${storeName}</h2>`;
    }
    if (getTplOption(t, 'show_address', true)) {
      html += `<p>${storeAddr}</p>`;
    }
    if (getTplOption(t, 'show_contact', true) && storeContact) {
      html += `<p>${storeContact}</p>`;
    }
    const headerExtra = getTplText(t, 'header_text', '');
    if (getTplOption(t, 'show_header', true) && headerExtra) {
      html += `<p>${headerExtra}</p>`;
    }

    html += `
          <p style="font-size:11px;margin-top:4px">================================</p>
          <p>No: ${transaction.invoice_number}</p>
          <p>Order #${transaction.order_number || '-'}</p>`;

    if (getTplOption(t, 'show_table', true) && transaction.table_number) {
      html += `<p>Meja: ${transaction.table_number}</p>`;
    }
    if (getTplOption(t, 'show_date', true)) {
      html += `<p>Tgl: ${dateStr}</p>`;
    }
    if (getTplOption(t, 'show_time', true)) {
      html += `<p>Jam: ${timeStr}</p>`;
    }
    if (getTplOption(t, 'show_cashier', true)) {
      html += `<p>Kasir: ${transaction.cashier_name || '-'}</p>`;
    }

    html += `
        </div>
        <div class="receipt-items">`;

    items.forEach(item => {
      const lineTotal = item.subtotal - (item.discount_amount || 0);
      html += `
          <div class="receipt-item">
            <span>${item.quantity}x ${item.menu_name}</span>
            <span>${formatRupiah(lineTotal)}</span>
          </div>`;
      if (getTplOption(t, 'show_item_notes', true) && item.notes) {
        html += `<div class="receipt-item-note">  → ${item.notes}</div>`;
      }
      if (item.discount_amount > 0) {
        html += `<div class="receipt-item-note" style="color:#059669">  Disc: -${formatRupiah(item.discount_amount)}</div>`;
      }
    });

    html += `
        </div>
        <div class="receipt-total">
          <div class="receipt-item"><span>Subtotal</span><span>${formatRupiah(transaction.subtotal)}</span></div>`;

    const totalItemDiscount = items.reduce((s, i) => s + (i.discount_amount || 0), 0);
    if (totalItemDiscount > 0) {
      html += `<div class="receipt-item"><span>Disc Item</span><span>-${formatRupiah(totalItemDiscount)}</span></div>`;
    }
    if (transaction.discount_amount > 0) {
      html += `<div class="receipt-item"><span>Disc Transaksi</span><span>-${formatRupiah(transaction.discount_amount)}</span></div>`;
    }

    html += `
          <p style="border-top:1px dashed #000;margin:4px 0"></p>
          <div class="receipt-item" style="font-weight:bold;font-size:14px">
            <span>TOTAL</span><span>${formatRupiah(transaction.total)}</span>
          </div>`;

    if (payment && getTplOption(t, 'show_payment_method', true)) {
      html += `
          <div class="receipt-item"><span>${payment.method.toUpperCase()}</span><span>${formatRupiah(payment.amount_paid)}</span></div>`;
      if (payment.method === 'tunai' && payment.change_amount > 0) {
        html += `<div class="receipt-item"><span>Kembalian</span><span>${formatRupiah(payment.change_amount)}</span></div>`;
      }
    }

    html += `
        </div>
        <div class="receipt-footer">`;

    const thankYou = getTplText(t, 'thank_you_text', '');
    if (getTplOption(t, 'show_thank_you', true)) {
      html += `<p>${thankYou || BRAND.receiptFooter}</p>`;
    }
    const footerExtra = getTplText(t, 'footer_text', '');
    if (getTplOption(t, 'show_footer', true) && footerExtra) {
      html += `<p>${footerExtra}</p>`;
    }
    html += `
          <p>${BRAND.receiptBrand}</p>
        </div>
      </div>`;

    return html;
  },

  generateKitchenOrder(transaction, items, type) {
    const label = type === 'makanan' ? 'PESANAN DAPUR' : 'PESANAN BAR';
    const icon = type === 'makanan' ? '🍳' : '🧊';
    const tplType = type === 'makanan' ? 'dapur' : 'bar';
    const now = new Date(transaction.created_at || new Date());
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const t = tplType;

    let html = `
      <div class="print-receipt">
        <div class="receipt-header">
          <h2>${icon} ${label}</h2>
          <p style="font-size:11px">================================</p>
          <p><strong>Order #${transaction.order_number || '-'}</strong></p>`;

    if (getTplOption(t, 'show_table', true) && transaction.table_number) {
      html += `<p><strong>Meja: ${transaction.table_number}</strong></p>`;
    }
    if (getTplOption(t, 'show_date', true) || getTplOption(t, 'show_time', true)) {
      html += `<p>`;
      if (getTplOption(t, 'show_date', true)) html += `Tgl: ${dateStr}`;
      if (getTplOption(t, 'show_date', true) && getTplOption(t, 'show_time', true)) html += ' | ';
      if (getTplOption(t, 'show_time', true)) html += `Jam: ${timeStr}`;
      html += `</p>`;
    }
    if (getTplOption(t, 'show_cashier', true)) {
      html += `<p>Kasir: ${transaction.cashier_name || '-'}</p>`;
    }

    html += `
        </div>
        <div class="receipt-items" style="font-size:14px">`;

    items.forEach((item, idx) => {
      html += `<div class="receipt-item" style="font-weight:bold;margin-bottom:2px">
        <span>${item.quantity}x ${item.menu_name}</span>
      </div>`;
      if (getTplOption(t, 'show_item_notes', true) && item.notes) {
        html += `<div class="receipt-item-note" style="font-size:12px;font-weight:bold;color:#c00">  ⚠ ${item.notes}</div>`;
      }
      if (idx < items.length - 1) {
        html += `<div style="border-bottom:1px dotted #ccc;margin:4px 0"></div>`;
      }
    });

    html += `
        </div>
        <div class="receipt-footer">
          <p style="font-size:14px;font-weight:bold">${items.length} item</p>
        </div>
      </div>`;

    return html;
  },

  // Preview template struk (untuk halaman admin printer) — gunakan template kasir jika ada
  generatePreview(tableNumber = '5') {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const t = 'bar';

    // Custom store info dari template
    const storeName = getTplText(t, 'custom_store_name', '') || BRAND.receiptHeader;
    const storeAddr = getTplText(t, 'custom_store_address', '') || BRAND.receiptTagline;
    const storeContact = getTplText(t, 'custom_store_contact', '');

    let html = `<div class="print-receipt"><div class="receipt-header">`;

    if (getTplOption(t, 'show_store_name', true)) html += `<h2>${storeName}</h2>`;
    if (getTplOption(t, 'show_address', true)) html += `<p>${storeAddr}</p>`;
    if (getTplOption(t, 'show_contact', true) && storeContact) html += `<p>${storeContact}</p>`;

    const headerExtra = getTplText(t, 'header_text', '');
    if (getTplOption(t, 'show_header', true) && headerExtra) html += `<p>${headerExtra}</p>`;

    html += `<p style="font-size:11px">================================</p>
      <p>No: KP-${now.toISOString().split('T')[0].replace(/-/g,'')}-001</p>
      <p>Order #7</p>`;

    if (getTplOption(t, 'show_table', true)) html += `<p>Meja: ${tableNumber}</p>`;
    if (getTplOption(t, 'show_date', true)) html += `<p>Tgl: ${dateStr}</p>`;
    if (getTplOption(t, 'show_time', true)) html += `<p>Jam: ${timeStr}</p>`;
    if (getTplOption(t, 'show_cashier', true)) html += `<p>Kasir: admin</p>`;

    html += `</div><div class="receipt-items">
      <div class="receipt-item"><span>2x Es Kopi Susu</span><span>Rp 36.000</span></div>
      <div class="receipt-item"><span>1x Nasi Goreng Spesial</span><span>Rp 25.000</span></div>`;

    if (getTplOption(t, 'show_item_notes', true)) {
      html += `<div class="receipt-item-note">  → Extra Pedas</div>`;
    }

    html += `</div><div class="receipt-total">
      <div class="receipt-item"><span>Subtotal</span><span>Rp 61.000</span></div>
      <p style="border-top:1px dashed #000;margin:4px 0"></p>
      <div class="receipt-item" style="font-weight:bold;font-size:14px"><span>TOTAL</span><span>Rp 61.000</span></div>`;

    if (getTplOption(t, 'show_payment_method', true)) {
      html += `<div class="receipt-item"><span>TUNAI</span><span>Rp 100.000</span></div>
        <div class="receipt-item"><span>Kembalian</span><span>Rp 39.000</span></div>`;
    }

    html += `</div><div class="receipt-footer">`;
    const thankYou = getTplText(t, 'thank_you_text', '');
    if (getTplOption(t, 'show_thank_you', true)) {
      html += `<p>${thankYou || BRAND.receiptFooter}</p>`;
    }
    const footerExtra = getTplText(t, 'footer_text', '');
    if (getTplOption(t, 'show_footer', true) && footerExtra) html += `<p>${footerExtra}</p>`;
    html += `<p>${BRAND.receiptBrand}</p></div></div>`;

    return html;
  },

  printHtml(html) {
    const printFrame = document.getElementById('print-frame');
    const doc = printFrame.contentWindow || printFrame.contentDocument;
    const printDoc = doc.document || doc;

    printDoc.open();
    printDoc.write(`
      <html><head>
        <style>
          body { margin: 0; padding: 0; }
          .print-receipt {
            font-family: 'Courier New', monospace;
            width: 280px;
            padding: 10px;
            font-size: 12px;
            line-height: 1.4;
          }
          .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .receipt-header h2 { font-size: 16px; margin: 0 0 4px 0; }
          .receipt-header p { margin: 0; }
          .receipt-items { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
          .receipt-item { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .receipt-item-note { font-size: 11px; color: #666; padding-left: 10px; font-style: italic; margin-bottom: 2px; }
          .receipt-total { }
          .receipt-footer { text-align: center; border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; font-size: 11px; }
          .receipt-footer p { margin: 2px 0; }
        </style>
      </head><body>${html}</body></html>
    `);
    printDoc.close();

    setTimeout(() => {
      printFrame.contentWindow.print();
    }, 300);
  },

  async printTransaction(txId) {
    try {
      await loadReceiptTemplates();
      const tx = await API.get(`/api/transactions/${txId}`);
      const receiptHtml = this.generateReceipt(tx, tx.items, tx.payment, 'bar');
      this.printHtml(receiptHtml);
      await API.post('/api/printers/print-order', { transaction_id: txId });
    } catch (err) {
      showToast('Gagal mencetak: ' + err.message, 'error');
    }
  },

  async printSplit(txId) {
    try {
      await loadReceiptTemplates();
      const tx = await API.get(`/api/transactions/${txId}`);
      const makananItems = tx.items.filter(i => i.menu_type === 'makanan');
      const minumanItems = tx.items.filter(i => i.menu_type === 'minuman');

      let allHtml = '';

      if (makananItems.length > 0) {
        allHtml += this.generateKitchenOrder(tx, makananItems, 'makanan');
        allHtml += '<div style="page-break-after: always;"></div>';
      }
      if (minumanItems.length > 0) {
        allHtml += this.generateKitchenOrder(tx, minumanItems, 'minuman');
        allHtml += '<div style="page-break-after: always;"></div>';
      }

      allHtml += this.generateReceipt(tx, tx.items, tx.payment, 'bar');
      this.printHtml(allHtml);

      await API.post('/api/printers/print-order', { transaction_id: txId });
      showToast('Cetak pesanan berhasil', 'success');
    } catch (err) {
      showToast('Gagal mencetak: ' + err.message, 'error');
    }
  }
};
