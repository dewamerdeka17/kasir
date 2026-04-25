// Printer Management Page — Full Featured (Revisi 2026-04)
let printersData = [];

async function renderPrintersPage() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Memuat pengaturan printer...</p></div>';

  try {
    const [printers, settings] = await Promise.all([
      API.get('/api/printers'),
      API.get('/api/settings').catch(() => ({}))
    ]);
    printersData = printers;

    content.innerHTML = `
      <!-- Tab Navigation -->
      <div class="printer-tabs">
        <button class="printer-tab active" data-tab="printers" onclick="switchPrinterTab(this,'tab-printers')">🖨️ Printer</button>
        <button class="printer-tab" data-tab="logs" onclick="switchPrinterTab(this,'tab-logs')">📋 Log Print</button>
        <button class="printer-tab" data-tab="qris" onclick="switchPrinterTab(this,'tab-qris')">📱 QRIS</button>
        <button class="printer-tab" data-tab="settings" onclick="switchPrinterTab(this,'tab-settings')">⚙️ Mode Print</button>
        <button class="printer-tab" data-tab="guide" onclick="switchPrinterTab(this,'tab-guide')">🔌 Panduan</button>
        <button class="printer-tab" data-tab="template" onclick="switchPrinterTab(this,'tab-template')">📝 Template Nota</button>
      </div>

      <!-- Tab: Printer -->
      <div id="tab-printers" class="printer-tab-content">
        <!-- Status Cards -->
        <div class="stats-grid" style="grid-template-columns:repeat(2,1fr)">
          ${['bar','dapur'].map(type => {
            const p = printers.find(pr => pr.type === type);
            const icon = type === 'dapur' ? '🍳' : '🧊';
            const isOnline = p?.is_online;
            const isActive = p?.is_active;
            const connBadge = p ? `<span style="font-size:0.72rem;color:var(--text-muted)">${p.connection_type === 'bluetooth' ? '📶 BT' : p.connection_type === 'network' ? '🌐 LAN' : '🔌 USB'}</span>` : '';
            return `<div class="stat-card ${isOnline ? 'success' : isActive ? 'warning' : 'danger'}">
              <div class="stat-label">${icon} Printer ${type.charAt(0).toUpperCase()+type.slice(1)}</div>
              <div class="stat-value" style="font-size:1rem;margin:0.25rem 0">${p ? p.name : 'Belum diset'}</div>
              <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.4rem">
                <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
                <span style="font-size:0.78rem;color:var(--text-secondary)">${isOnline ? 'Online' : isActive ? 'Offline' : 'Nonaktif'}</span>
                ${p ? `<span class="badge ${p.is_default?'badge-accent':'badge-muted'}" style="margin-left:auto">${p.is_default?'Default':''}</span>` : ''}
              </div>
              <div class="stat-sub">${p ? `${connBadge} ${p.address || '-'}${p.port && p.connection_type==='network' ? ':'+p.port : ''}` : 'Tambahkan printer'}</div>
            </div>`;
          }).join('')}
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left"><h3 style="font-size:1rem;font-weight:700">Daftar Printer</h3></div>
          <div class="toolbar-right">
            <button class="btn btn-ghost" onclick="showReceiptPreview()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview Struk
            </button>
            <button class="btn btn-primary" onclick="openPrinterForm()">+ Tambah Printer</button>
          </div>
        </div>

        <div class="card" style="padding:0">
          <div class="table-wrapper">
            <table>
              <thead><tr>
                <th>Nama</th><th>Tipe</th><th>Koneksi</th><th>Alamat / Info</th>
                <th>Status</th><th>Online</th><th>Default</th><th>Aksi</th>
              </tr></thead>
              <tbody>
                ${printers.length === 0 ? `<tr><td colspan="8"><div class="empty-state" style="padding:2rem"><p>Belum ada printer terdaftar</p></div></td></tr>` :
                  printers.map(p => {
                    const connInfo = p.connection_type === 'bluetooth'
                      ? `📶 BT${p.device_id ? ' · '+p.device_id : ''}`
                      : p.connection_type === 'network'
                      ? `🌐 ${p.address || '-'}:${p.port || 9100}`
                      : `🔌 ${p.address || '-'}`;
                    return `<tr>
                    <td><strong>${p.name}</strong>${p.notes ? `<br><span style="font-size:0.75rem;color:var(--text-muted)">${p.notes}</span>` : ''}</td>
                    <td><span class="badge ${p.type==='dapur'?'badge-warning':'badge-info'}">${p.type}</span></td>
                    <td>${p.connection_type}</td>
                    <td><code style="font-size:0.78rem">${connInfo}</code></td>
                    <td>${p.is_active ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-muted">Nonaktif</span>'}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:0.5rem">
                        <span class="status-dot ${p.is_online?'online':'offline'}"></span>
                        <span style="font-size:0.82rem">${p.is_online ? 'Online' : 'Offline'}</span>
                        <button class="btn btn-ghost btn-sm" style="padding:0.2rem 0.5rem;font-size:0.72rem" onclick="togglePrinterOnline(${p.id})">
                          ${p.is_online ? 'Set Offline' : 'Set Online'}
                        </button>
                      </div>
                    </td>
                    <td>${p.is_default ? '<span class="badge badge-accent">✓ Default</span>' : '<span style="color:var(--text-muted);font-size:0.8rem">-</span>'}</td>
                    <td>
                      <div class="btn-group">
                        <button class="btn btn-ghost btn-sm" onclick="testPrint(${p.id})" title="Test Print">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                          Test
                        </button>
                        <button class="btn btn-ghost btn-sm" onclick='openPrinterForm(${JSON.stringify(p)})'>Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deletePrinter(${p.id})">Hapus</button>
                      </div>
                    </td>
                  </tr>`;
                  }).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab: Logs -->
      <div id="tab-logs" class="printer-tab-content" style="display:none">
        <div class="toolbar">
          <div class="toolbar-left"><h3 style="font-size:1rem;font-weight:700">Log Print</h3></div>
          <div class="toolbar-right">
            <button class="btn btn-ghost" onclick="loadPrintLogs()">🔄 Refresh</button>
          </div>
        </div>
        <div id="print-logs-container">
          <div class="loading-state"><div class="spinner"></div><p>Memuat log...</p></div>
        </div>
      </div>

      <!-- Tab: QRIS -->
      <div id="tab-qris" class="printer-tab-content" style="display:none">
        ${renderQrisTab(settings)}
      </div>

      <!-- Tab: Mode Print -->
      <div id="tab-settings" class="printer-tab-content" style="display:none">
        ${renderPrintSettingsTab(settings)}
      </div>

      <!-- Tab: Panduan Koneksi -->
      <div id="tab-guide" class="printer-tab-content" style="display:none">
        ${renderPrinterGuideTab()}
      </div>

      <!-- Tab: Template Nota -->
      <div id="tab-template" class="printer-tab-content" style="display:none">
        ${renderTemplateEditorTab(settings)}
      </div>
    `;

    // Load logs jika tab logs sudah aktif
  } catch(err) {
    content.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Error: ${err.message}</p></div>`;
  }
}

// =============================================
// QRIS Tab
// =============================================
function renderQrisTab(settings) {
  const qrisPath = settings?.qris_image || null;
  return `
    <div class="card" style="max-width:600px">
      <div class="card-header">
        <h3 class="card-title">📱 Pengaturan QRIS</h3>
      </div>
      <div style="text-align:center;margin-bottom:1.5rem">
        ${qrisPath
          ? `<div class="qris-preview-box" id="qris-preview-box">
               <img src="${qrisPath}?t=${Date.now()}" alt="QRIS" style="max-width:260px;max-height:260px;border-radius:var(--radius-md)">
               <div style="margin-top:0.75rem">
                 <span class="badge badge-success">✓ QRIS sudah diatur</span>
               </div>
             </div>`
          : `<div class="qris-preview-box empty" id="qris-preview-box">
               <div style="font-size:3rem;opacity:0.4">📱</div>
               <p style="color:var(--text-muted);margin-top:0.5rem;font-size:0.88rem">Belum ada gambar QRIS</p>
               <span class="badge badge-warning" style="margin-top:0.5rem">Perlu diatur</span>
             </div>`
        }
      </div>
      <div class="form-group">
        <label>Upload Gambar QRIS</label>
        <div class="qris-upload-area" id="qris-upload-area" onclick="document.getElementById('qris-file-input').click()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" style="opacity:0.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p style="margin-top:0.5rem;color:var(--text-muted);font-size:0.88rem">Klik untuk pilih gambar QRIS</p>
          <p style="font-size:0.75rem;color:var(--text-muted)">Format: JPG, PNG, WEBP — Maks 5MB</p>
        </div>
        <input type="file" id="qris-file-input" accept="image/*" style="display:none" onchange="uploadQris(this)">
      </div>
      ${qrisPath ? `
        <div style="display:flex;gap:0.75rem;margin-top:0.5rem">
          <button class="btn btn-ghost btn-sm" onclick="deleteQris()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            Hapus QRIS
          </button>
        </div>` : ''}
      <div class="info-box" style="margin-top:1.25rem">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p>Gambar QRIS ini akan ditampilkan saat kasir memilih metode pembayaran QRIS. Gunakan gambar beresolusi tinggi agar mudah di-scan pelanggan.</p>
      </div>
    </div>`;
}

// =============================================
// Print Settings Tab
// =============================================
function renderPrintSettingsTab(settings) {
  const printMode = settings?.print_mode || 'manual';
  const autoPrintReceipt = settings?.auto_print_receipt === 'true';
  const autoPrintKitchen = settings?.auto_print_kitchen === 'true';
  return `
    <div class="card" style="max-width:600px">
      <div class="card-header">
        <h3 class="card-title">⚙️ Mode & Pengaturan Print</h3>
      </div>
      <div class="form-group">
        <label style="font-size:0.95rem;font-weight:600;color:var(--text-primary);margin-bottom:0.75rem;display:block">Mode Print</label>
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          <label class="radio-option ${printMode==='otomatis'?'active':''}">
            <input type="radio" name="print-mode" value="otomatis" ${printMode==='otomatis'?'checked':''} onchange="savePrintMode(this.value)">
            <div>
              <div style="font-weight:600">🚀 Otomatis</div>
              <div style="font-size:0.82rem;color:var(--text-muted)">Print langsung setelah transaksi berhasil, tanpa konfirmasi</div>
            </div>
          </label>
          <label class="radio-option ${printMode==='manual'?'active':''}">
            <input type="radio" name="print-mode" value="manual" ${printMode==='manual'?'checked':''} onchange="savePrintMode(this.value)">
            <div>
              <div style="font-weight:600">🖱️ Manual</div>
              <div style="font-size:0.82rem;color:var(--text-muted)">Hanya print saat tombol Cetak Struk ditekan</div>
            </div>
          </label>
        </div>
      </div>
      <div style="border-top:1px solid var(--border-light);padding-top:1.25rem;margin-top:1.25rem">
        <label style="font-size:0.95rem;font-weight:600;color:var(--text-primary);display:block;margin-bottom:0.75rem">Pilihan Auto Print</label>
        <div class="toggle-option">
          <div>
            <div style="font-weight:500">Auto Print Struk Kasir</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Cetak struk kasir otomatis setelah bayar</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" ${autoPrintReceipt?'checked':''} onchange="saveToggleSetting('auto_print_receipt', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="toggle-option">
          <div>
            <div style="font-weight:500">Auto Print Nota Dapur/Bar</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Kirim pesanan ke dapur/bar otomatis</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" ${autoPrintKitchen?'checked':''} onchange="saveToggleSetting('auto_print_kitchen', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>`;
}

// =============================================
// Panduan Koneksi Printer Tab (BARU)
// =============================================
function renderPrinterGuideTab() {
  return `
    <div style="max-width:720px">
      <div class="card" style="margin-bottom:1rem">
        <div class="card-header">
          <h3 class="card-title">🔌 Panduan Menyambungkan Printer</h3>
        </div>
        <p style="color:var(--text-secondary);font-size:0.9rem">Pilih jenis koneksi printer untuk melihat langkah-langkah penyambungan.</p>
      </div>

      <!-- Accordion: Bluetooth -->
      <div class="guide-accordion" id="acc-bluetooth">
        <button class="guide-acc-header" onclick="toggleAccordion('acc-bluetooth-body', this)">
          <span>📶 Printer Bluetooth</span>
          <svg class="acc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div id="acc-bluetooth-body" class="guide-acc-body" style="display:none">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="guide-step-num">1</div>
              <div><strong>Hidupkan printer Bluetooth</strong><br>Pastikan printer dalam kondisi menyala dan Bluetooth aktif (biasanya ditandai lampu biru berkedip).</div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">2</div>
              <div><strong>Aktifkan Bluetooth di perangkat kasir</strong><br>Buka pengaturan HP/tablet, aktifkan Bluetooth.</div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">3</div>
              <div><strong>Pair printer ke perangkat</strong><br>Cari nama printer di daftar Bluetooth, lalu tap untuk pair. Masukkan PIN jika diminta (biasanya: <code>0000</code> atau <code>1234</code>).</div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">4</div>
              <div><strong>Tambahkan printer di sistem</strong><br>Di halaman Printer → klik <strong>+ Tambah Printer</strong>, pilih koneksi <strong>Bluetooth</strong>, isi nama device / MAC address printer.</div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">5</div>
              <div><strong>Lakukan Test Print</strong><br>Klik tombol <strong>Test</strong> di baris printer. Jika berhasil, status akan berubah menjadi Online.</div>
            </div>
          </div>
          <div class="guide-tips">
            <strong>💡 Tips Troubleshooting Bluetooth:</strong>
            <ul>
              <li>Jika printer tidak terdeteksi, matikan dan hidupkan ulang Bluetooth di perangkat</li>
              <li>Pastikan printer tidak sedang terhubung ke perangkat lain</li>
              <li>Browser web memiliki keterbatasan akses Bluetooth langsung — untuk print via web, gunakan helper app atau pastikan printer sudah di-pair di level sistem operasi</li>
              <li>Jarak optimalr Bluetooth: dalam 5–10 meter, tanpa penghalang</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Accordion: RJ45/LAN -->
      <div class="guide-accordion" id="acc-network">
        <button class="guide-acc-header" onclick="toggleAccordion('acc-network-body', this)">
          <span>🌐 Printer RJ45 / LAN / Network</span>
          <svg class="acc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div id="acc-network-body" class="guide-acc-body" style="display:none">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="guide-step-num">1</div>
              <div><strong>Hubungkan printer ke jaringan</strong><br>Sambungkan kabel RJ45 dari printer ke router/switch yang sama dengan perangkat kasir.</div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">2</div>
              <div><strong>Cek IP Address printer</strong><br>Cetak halaman konfigurasi dari printer (tekan dan tahan tombol Feed saat menyalakan), atau cek di panel LCD printer. Contoh IP: <code>192.168.1.100</code></div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">3</div>
              <div><strong>Isi konfigurasi di sistem</strong><br>Di halaman Printer → <strong>+ Tambah Printer</strong>, pilih koneksi <strong>Network / IP</strong>, isi IP Address dan Port (default: <code>9100</code>).</div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">4</div>
              <div><strong>Simpan dan Set Online</strong><br>Simpan printer, lalu klik <strong>Set Online</strong> di baris printer, atau lakukan Test Print.</div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">5</div>
              <div><strong>Lakukan Test Print</strong><br>Klik tombol <strong>Test</strong>. Jika berhasil terhubung, status berubah Online.</div>
            </div>
          </div>
          <div class="guide-tips">
            <strong>💡 Tips Troubleshooting RJ45/LAN:</strong>
            <ul>
              <li>Pastikan IP printer tidak konflik — gunakan IP statis atau DHCP reservation di router</li>
              <li>Port default ESC/POS printer thermal: <code>9100</code></li>
              <li>Periksa firewall jika koneksi gagal — pastikan port 9100 tidak diblokir</li>
              <li>Printer kasir, dapur, dan bar harus berada di jaringan (subnet) yang sama</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Accordion: USB -->
      <div class="guide-accordion" id="acc-usb">
        <button class="guide-acc-header" onclick="toggleAccordion('acc-usb-body', this)">
          <span>🔌 Printer USB</span>
          <svg class="acc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div id="acc-usb-body" class="guide-acc-body" style="display:none">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="guide-step-num">1</div>
              <div><strong>Sambungkan kabel USB printer ke komputer/server kasir</strong></div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">2</div>
              <div><strong>Install driver printer</strong><br>Jika diperlukan, install driver dari CD bawaan printer atau unduh dari website produsen.</div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">3</div>
              <div><strong>Tambahkan printer di sistem</strong><br>Pilih koneksi <strong>USB</strong> dan isi identifier perangkat (contoh: <code>USB001</code> atau nama printer di OS).</div>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">4</div>
              <div><strong>Test Print</strong><br>Klik tombol Test Print untuk verifikasi koneksi.</div>
            </div>
          </div>
          <div class="guide-tips">
            <strong>💡 Catatan USB:</strong>
            <ul>
              <li>Printer USB diakses langsung oleh server kasir (backend Node.js)</li>
              <li>Untuk sistem berbasis browser murni, USB print memerlukan server helper atau driver sistem</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Accordion: Troubleshooting umum -->
      <div class="guide-accordion" id="acc-trouble">
        <button class="guide-acc-header" onclick="toggleAccordion('acc-trouble-body', this)">
          <span>🛠️ Troubleshooting Umum</span>
          <svg class="acc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div id="acc-trouble-body" class="guide-acc-body" style="display:none">
          <div class="guide-tips" style="margin-top:0">
            <ul>
              <li><strong>Print gagal tapi printer terdeteksi:</strong> Cek kertas, pastikan tidak habis atau macet.</li>
              <li><strong>Status selalu Offline:</strong> Klik Set Online secara manual, atau lakukan Test Print.</li>
              <li><strong>Struk terpotong:</strong> Pastikan lebar kertas di printer sesuai (biasanya 58mm atau 80mm).</li>
              <li><strong>Karakter aneh / kotak-kotak:</strong> Pastikan encoding printer mendukung UTF-8 atau gunakan karakter ASCII saja.</li>
              <li><strong>Print lambat:</strong> Untuk network printer, periksa kecepatan jaringan dan jarak ke router.</li>
              <li><strong>Log gagal menumpuk:</strong> Buka tab Log Print, klik Retry pada log yang gagal.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>`;
}

// =============================================
// Template Editor Tab (BARU)
// =============================================
function renderTemplateEditorTab(settings) {
  // Parse template bar dari settings (fallback ke kasir lama jika bar belum ada)
  let tplBar = {};
  try {
    const barRaw = settings?.receipt_template_bar || settings?.receipt_template_kasir || '{}';
    tplBar = JSON.parse(barRaw);
  } catch(e) {}

  const def = {
    show_store_name: true,
    show_address: true,
    show_contact: true,
    show_header: true,
    show_footer: true,
    show_thank_you: true,
    show_table: true,
    show_date: true,
    show_time: true,
    show_payment_method: true,
    show_cashier: true,
    show_item_notes: true,
    header_text: '',
    footer_text: '',
    thank_you_text: 'Terima kasih atas kunjungan Anda!'
  };
  const tpl = Object.assign({}, def, tplBar);

  const toggleRow = (key, label, desc='') => `
    <div class="toggle-option">
      <div>
        <div style="font-weight:500">${label}</div>
        ${desc ? `<div style="font-size:0.79rem;color:var(--text-muted)">${desc}</div>` : ''}
      </div>
      <label class="toggle-switch">
        <input type="checkbox" id="tpl-${key}" ${tpl[key] ? 'checked' : ''} onchange="updateReceiptPreview()">
        <span class="toggle-slider"></span>
      </label>
    </div>`;

  return `
    <div class="receipt-template-editor">
      <!-- Sub-tab untuk tipe template -->
      <div style="display:flex;gap:0.5rem;margin-bottom:1.25rem;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm tpl-subtab active" data-tpltype="bar" onclick="switchTemplateSubTab(this,'bar')">🧊 Bar</button>
        <button class="btn btn-ghost btn-sm tpl-subtab" data-tpltype="dapur" onclick="switchTemplateSubTab(this,'dapur')">🍳 Dapur</button>
      </div>
      <input type="hidden" id="current-tpl-type" value="bar">

      <div style="display:grid;grid-template-columns:1fr 320px;gap:1.5rem;align-items:start">
        <!-- Form Editor -->
        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
            <h3 class="card-title">⚙️ Pengaturan Template</h3>
            <div style="display:flex;gap:0.5rem">
              <button class="btn btn-ghost btn-sm" onclick="resetReceiptTemplate()">🔄 Reset Default</button>
              <button class="btn btn-primary btn-sm" onclick="saveReceiptTemplate()">💾 Simpan</button>
            </div>
          </div>

          <!-- Elemen yang ditampilkan -->
          <div style="margin-bottom:1rem">
            <p style="font-size:0.82rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem">Tampilkan Elemen</p>
            ${toggleRow('show_store_name', 'Nama Toko', 'Tampilkan nama toko di header struk')}
            ${toggleRow('show_address', 'Alamat Toko', 'Tampilkan alamat di bawah nama toko')}
            ${toggleRow('show_contact', 'Nomor Kontak', 'Tampilkan nomor kontak / telepon')}
            ${toggleRow('show_header', 'Teks Header', 'Teks tambahan di atas daftar item')}
            ${toggleRow('show_table', 'Nomor Meja', 'Tampilkan nomor meja di struk')}
            ${toggleRow('show_date', 'Tanggal Transaksi', 'Tampilkan tanggal di struk')}
            ${toggleRow('show_time', 'Jam Transaksi', 'Tampilkan waktu di struk')}
            ${toggleRow('show_cashier', 'Nama Kasir', 'Tampilkan nama kasir di struk')}
            ${toggleRow('show_payment_method', 'Metode Pembayaran', 'Tampilkan TUNAI/QRIS di bawah total')}
            ${toggleRow('show_item_notes', 'Catatan Item', 'Tampilkan catatan pesanan per item')}
            ${toggleRow('show_footer', 'Teks Footer', 'Teks tambahan di bawah struk')}
            ${toggleRow('show_thank_you', 'Ucapan Terima Kasih', 'Tampilkan pesan terima kasih')}
          </div>

          <!-- Teks yang bisa diedit -->
          <div style="border-top:1px solid var(--border-light);padding-top:1rem;margin-top:0.5rem">
            <p style="font-size:0.82rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.75rem">Teks Kustom</p>
            <div class="form-group">
              <label>Teks Header Tambahan <span style="color:var(--text-muted);font-size:0.78rem">(opsional)</span></label>
              <input type="text" id="tpl-header_text" value="${tpl.header_text || ''}" placeholder="Contoh: Selamat Makan!" oninput="updateReceiptPreview()">
            </div>
            <div class="form-group">
              <label>Ucapan Terima Kasih</label>
              <input type="text" id="tpl-thank_you_text" value="${tpl.thank_you_text || 'Terima kasih atas kunjungan Anda!'}" oninput="updateReceiptPreview()">
            </div>
            <div class="form-group">
              <label>Teks Footer Tambahan <span style="color:var(--text-muted);font-size:0.78rem">(opsional)</span></label>
              <input type="text" id="tpl-footer_text" value="${tpl.footer_text || ''}" placeholder="Contoh: Follow IG @kedaipulo" oninput="updateReceiptPreview()">
            </div>
          </div>
        </div>

        <!-- Live Preview -->
        <div>
          <div class="card" style="position:sticky;top:1rem">
            <div class="card-header">
              <h3 class="card-title" style="font-size:0.9rem">👁️ Live Preview Struk</h3>
            </div>
            <div style="background:white;color:#000;border-radius:var(--radius-md);padding:0.75rem;margin-top:0.5rem" id="tpl-preview-wrapper">
              <style>
                .rt-prev { font-family:'Courier New',monospace;font-size:11px;line-height:1.5;width:240px;max-width:100% }
                .rt-prev h2 { text-align:center;font-size:14px;margin:0 0 2px }
                .rt-prev .rp { margin:0;text-align:center;font-size:10px }
                .rt-prev .ri { display:flex;justify-content:space-between;margin-bottom:2px;font-size:11px }
                .rt-prev .rn { font-size:9px;color:#888;padding-left:8px;font-style:italic }
                .rt-prev .div { border-top:1px dashed #000;margin:3px 0 }
                .rt-prev .ft { text-align:center;border-top:1px dashed #000;padding-top:4px;margin-top:3px;font-size:9px }
              </style>
              <div class="rt-prev" id="tpl-live-preview"></div>
            </div>
            <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:0.75rem" onclick="showReceiptPreview()">
              🔍 Preview Penuh
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

// =============================================
// Tab switching
// =============================================
function switchPrinterTab(btn, tabId) {
  document.querySelectorAll('.printer-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.printer-tab-content').forEach(t => t.style.display = 'none');
  btn.classList.add('active');
  document.getElementById(tabId).style.display = 'block';

  if (tabId === 'tab-logs') loadPrintLogs();
  if (tabId === 'tab-template') setTimeout(updateReceiptPreview, 100);
}

// =============================================
// Template sub-tab
// =============================================
async function switchTemplateSubTab(btn, type) {
  document.querySelectorAll('.tpl-subtab').forEach(b => {
    b.classList.remove('btn-primary');
    b.classList.add('btn-ghost');
  });
  btn.classList.remove('btn-ghost');
  btn.classList.add('btn-primary');
  document.getElementById('current-tpl-type').value = type;

  // Load template untuk tipe ini
  try {
    const settings = await API.get('/api/settings').catch(() => ({}));
    const key = `receipt_template_${type}`;
    let tpl = {};
    try { tpl = JSON.parse(settings[key] || '{}'); } catch(e) {}
    const def = {
      show_store_name:true, show_address:true, show_contact:true, show_header:true,
      show_footer:true, show_thank_you:true, show_table:true, show_date:true,
      show_time:true, show_payment_method:true, show_cashier:true, show_item_notes:true,
      header_text:'', footer_text:'', thank_you_text:'Terima kasih atas kunjungan Anda!'
    };
    const merged = Object.assign({}, def, tpl);
    // Update form values
    Object.keys(def).forEach(k => {
      const el = document.getElementById(`tpl-${k}`);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!merged[k];
      else el.value = merged[k] || '';
    });
    updateReceiptPreview();
  } catch(e) {}
}

// =============================================
// Live Preview Update
// =============================================
function updateReceiptPreview() {
  const el = document.getElementById('tpl-live-preview');
  if (!el) return;
  const tpl = getTemplateCurrent();
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
  const brandName = (typeof BRAND !== 'undefined') ? BRAND.receiptHeader : 'Kedai Pulo';
  const brandTagline = (typeof BRAND !== 'undefined') ? BRAND.receiptTagline : 'Jl. Pulo No. 1';

  let html = '<div class="rt-prev">';
  if (tpl.show_store_name) html += `<h2>${brandName}</h2>`;
  if (tpl.show_address) html += `<p class="rp">${brandTagline}</p>`;
  if (tpl.show_contact) html += `<p class="rp">Telp: 08xx-xxxx-xxxx</p>`;
  if (tpl.show_header && tpl.header_text) html += `<p class="rp">${tpl.header_text}</p>`;
  html += '<div class="div"></div>';
  html += '<p class="rp">No: KP-20260414-001</p>';
  html += '<p class="rp">Order #7</p>';
  if (tpl.show_table) html += '<p class="rp">Meja: 5</p>';
  if (tpl.show_date) html += `<p class="rp">Tgl: ${dateStr}</p>`;
  if (tpl.show_time) html += `<p class="rp">Jam: ${timeStr}</p>`;
  if (tpl.show_cashier) html += '<p class="rp">Kasir: admin</p>';
  html += '<div class="div"></div>';
  html += '<div class="ri"><span>2x Es Kopi Susu</span><span>Rp 36.000</span></div>';
  if (tpl.show_item_notes) html += '<div class="rn">&nbsp;&nbsp;→ Less Sugar</div>';
  html += '<div class="ri"><span>1x Nasi Goreng</span><span>Rp 25.000</span></div>';
  html += '<div class="div"></div>';
  html += '<div class="ri"><span>Subtotal</span><span>Rp 61.000</span></div>';
  html += '<div class="ri" style="font-weight:bold;font-size:12px"><span>TOTAL</span><span>Rp 61.000</span></div>';
  if (tpl.show_payment_method) html += '<div class="ri"><span>TUNAI</span><span>Rp 100.000</span></div>';
  if (tpl.show_payment_method) html += '<div class="ri"><span>Kembalian</span><span>Rp 39.000</span></div>';
  html += '<div class="ft">';
  if (tpl.show_thank_you) html += `<p>${tpl.thank_you_text || 'Terima kasih!'}</p>`;
  if (tpl.show_footer && tpl.footer_text) html += `<p>${tpl.footer_text}</p>`;
  html += `<p>${brandName}</p>`;
  html += '</div>';
  html += '</div>';
  el.innerHTML = html;
}

function getTemplateCurrent() {
  const keys = [
    'show_store_name','show_address','show_contact','show_header','show_footer',
    'show_thank_you','show_table','show_date','show_time','show_payment_method',
    'show_cashier','show_item_notes','header_text','footer_text','thank_you_text'
  ];
  const tpl = {};
  keys.forEach(k => {
    const el = document.getElementById(`tpl-${k}`);
    if (!el) return;
    tpl[k] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return tpl;
}

async function saveReceiptTemplate() {
  const type = document.getElementById('current-tpl-type')?.value || 'bar';
  const tpl = getTemplateCurrent();
  const key = `receipt_template_${type}`;
  try {
    await API.put(`/api/settings/${key}`, { value: JSON.stringify(tpl) });
    // Update global template cache untuk print
    if (window._receiptTemplates) window._receiptTemplates[type] = tpl;
    showToast(`Template ${type} disimpan ✓`, 'success');
  } catch(err) { showToast('Gagal simpan: ' + err.message, 'error'); }
}

function resetReceiptTemplate() {
  const defaults = {
    show_store_name:true, show_address:true, show_contact:true, show_header:true,
    show_footer:true, show_thank_you:true, show_table:true, show_date:true,
    show_time:true, show_payment_method:true, show_cashier:true, show_item_notes:true,
    header_text:'', footer_text:'', thank_you_text:'Terima kasih atas kunjungan Anda!'
  };
  Object.keys(defaults).forEach(k => {
    const el = document.getElementById(`tpl-${k}`);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = defaults[k];
    else el.value = defaults[k];
  });
  updateReceiptPreview();
  showToast('Template direset ke default', 'info');
}

// =============================================
// Accordion toggle
// =============================================
function toggleAccordion(bodyId, btn) {
  const body = document.getElementById(bodyId);
  const arrow = btn.querySelector('.acc-arrow');
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

// =============================================
// Print Logs
// =============================================
async function loadPrintLogs() {
  const container = document.getElementById('print-logs-container');
  if (!container) return;
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Memuat log...</p></div>';

  try {
    const logs = await API.get('/api/printers/logs');
    if (logs.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding:3rem 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="opacity:0.3"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p style="margin-top:1rem;color:var(--text-muted)">Belum ada log print</p>
      </div>`;
      return;
    }

    const failed = logs.filter(l => l.status === 'failed');
    container.innerHTML = `
      ${failed.length > 0 ? `<div class="alert-box danger" style="margin-bottom:1rem">
        ⚠️ <strong>${failed.length} print gagal</strong> — gunakan tombol Retry untuk mengirim ulang
      </div>` : ''}
      <div class="card" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Waktu</th><th>Transaksi</th><th>Printer</th><th>Tipe</th><th>Status</th><th>Error</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              ${logs.map(l => `<tr>
                <td style="font-size:0.8rem;color:var(--text-muted)">${formatDateTime(l.printed_at)}</td>
                <td><code style="font-size:0.78rem">${l.invoice_number || (l.transaction_id === 0 ? 'TEST' : '#'+l.transaction_id)}</code></td>
                <td>${l.printer_name || '-'}</td>
                <td><span class="badge ${l.print_type==='receipt'?'badge-accent':l.print_type==='test'?'badge-info':'badge-warning'}">${l.print_type}</span></td>
                <td>
                  ${l.status === 'printed' ? '<span class="badge badge-success">✓ Berhasil</span>' :
                    l.status === 'failed' ? '<span class="badge badge-danger">✗ Gagal</span>' :
                    l.status === 'test' ? '<span class="badge badge-info">Test</span>' :
                    '<span class="badge badge-muted">Antrian</span>'}
                </td>
                <td style="font-size:0.78rem;color:var(--danger);max-width:200px;word-break:break-word">
                  ${l.error_message ? `<span title="${l.error_message}">${l.error_message.substring(0,50)}${l.error_message.length>50?'...':''}</span>` : '-'}
                </td>
                <td>
                  ${l.status === 'failed' ? `<button class="btn btn-warning btn-sm" onclick="retryPrint(${l.id})">
                    🔄 Retry${l.retry_count > 0 ? ` (${l.retry_count})` : ''}
                  </button>` : '-'}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(err) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Gagal: ${err.message}</p></div>`;
  }
}

// =============================================
// Test / Toggle / Retry
// =============================================
async function testPrint(printerId) {
  try {
    const btn = event.target.closest('button');
    btn.disabled = true;
    btn.textContent = '⏳ Testing...';
    const result = await API.post(`/api/printers/${printerId}/test`);
    showToast(result.message || 'Test print dikirim', result.success ? 'success' : 'error');
    renderPrintersPage();
  } catch(err) {
    showToast('Gagal test print: ' + err.message, 'error');
  }
}

async function togglePrinterOnline(printerId) {
  try {
    await API.post(`/api/printers/${printerId}/toggle-online`);
    renderPrintersPage();
  } catch(err) { showToast(err.message, 'error'); }
}

async function retryPrint(logId) {
  try {
    const result = await API.post(`/api/printers/logs/${logId}/retry`);
    showToast(result.message || 'Print ulang berhasil', 'success');
    loadPrintLogs();
  } catch(err) { showToast('Gagal retry: ' + err.message, 'error'); }
}

// =============================================
// QRIS Upload / Delete
// =============================================
async function uploadQris(input) {
  if (!input.files[0]) return;
  const formData = new FormData();
  formData.append('qris_image', input.files[0]);

  try {
    const res = await fetch('/api/settings/upload-qris', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Gambar QRIS berhasil diupload ✓', 'success');
    renderPrintersPage();
    setTimeout(() => {
      const qrisTab = document.querySelector('[data-tab="qris"]');
      if (qrisTab) qrisTab.click();
    }, 100);
  } catch(err) { showToast('Gagal upload: ' + err.message, 'error'); }
}

async function deleteQris() {
  confirm('Hapus gambar QRIS?', async () => {
    try {
      await API.del('/api/settings/qris-image');
      showToast('Gambar QRIS dihapus', 'success');
      renderPrintersPage();
    } catch(err) { showToast(err.message, 'error'); }
  });
}

// =============================================
// Settings (print mode, toggles)
// =============================================
async function savePrintMode(value) {
  try {
    await API.put('/api/settings/print_mode', { value });
    document.querySelectorAll('.radio-option').forEach(el => {
      el.classList.toggle('active', el.querySelector('input').value === value);
    });
    showToast(`Mode print diatur ke: ${value}`, 'success');
  } catch(err) { showToast(err.message, 'error'); }
}

async function saveToggleSetting(key, value) {
  try {
    await API.put(`/api/settings/${key}`, { value: String(value) });
    showToast('Pengaturan disimpan', 'success');
  } catch(err) { showToast(err.message, 'error'); }
}

// =============================================
// Receipt Preview Modal
// =============================================
function showReceiptPreview() {
  showModal(`
    <div class="modal-header">
      <h3>👁️ Preview Template Struk</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body" style="text-align:center">
      <div style="background:white;color:#000;display:inline-block;border-radius:var(--radius-md);padding:1rem;text-align:left;min-width:260px">
        <style>
          .preview-receipt { font-family:'Courier New',monospace;font-size:12px;line-height:1.5;width:260px }
          .preview-receipt h2 { text-align:center;font-size:16px;margin:0 0 2px }
          .preview-receipt p { margin:0;text-align:center;font-size:11px }
          .preview-receipt .ri { display:flex;justify-content:space-between;margin-bottom:2px;font-size:12px }
          .preview-receipt .rn { font-size:10px;color:#666;padding-left:10px;font-style:italic }
          .preview-receipt .divider { border-top:1px dashed #000;margin:4px 0 }
          .preview-receipt .footer { text-align:center;border-top:1px dashed #000;padding-top:6px;margin-top:4px;font-size:10px }
        </style>
        <div class="preview-receipt">
          ${PrintUtil.generatePreview('5').replace(/class="print-receipt"/g, 'class="preview-receipt"')}
        </div>
      </div>
      <p style="font-size:0.8rem;color:var(--text-muted);margin-top:1rem">Ini adalah preview tampilan struk pelanggan</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal()">Tutup</button>
    </div>
  `, 'modal-sm');
}

// =============================================
// Printer Form (CRUD) — diperluas dengan field baru
// =============================================
function openPrinterForm(printer) {
  const connType = printer?.connection_type || 'network';
  showModal(`
    <div class="modal-header">
      <h3>${printer ? 'Edit' : 'Tambah'} Printer</h3>
      <button class="btn-icon" onclick="closeModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Nama Printer</label><input type="text" id="pr-name" value="${printer?.name || ''}" placeholder="Contoh: Printer Kasir Utama" autofocus></div>
      <div class="form-row">
        <div class="form-group"><label>Tipe</label>
          <select id="pr-type">
            <option value="bar" ${printer?.type==='bar'?'selected':''}>🧊 Bar / Kasir</option>
            <option value="dapur" ${printer?.type==='dapur'?'selected':''}>🍳 Dapur</option>
          </select>
        </div>
        <div class="form-group"><label>Koneksi</label>
          <select id="pr-conn" onchange="onPrinterConnChange(this.value)">
            <option value="network" ${connType==='network'?'selected':''}>🌐 Network / IP</option>
            <option value="bluetooth" ${connType==='bluetooth'?'selected':''}>📶 Bluetooth</option>
            <option value="usb" ${connType==='usb'?'selected':''}>🔌 USB</option>
          </select>
        </div>
      </div>

      <!-- Field: Network -->
      <div id="pr-field-network" class="form-row" style="display:${connType==='network'?'flex':'none'}">
        <div class="form-group"><label>IP Address</label><input type="text" id="pr-addr" value="${printer?.address || ''}" placeholder="192.168.1.100"></div>
        <div class="form-group" style="max-width:120px"><label>Port</label><input type="number" id="pr-port" value="${printer?.port || 9100}" placeholder="9100"></div>
      </div>

      <!-- Field: Bluetooth -->
      <div id="pr-field-bluetooth" style="display:${connType==='bluetooth'?'block':'none'}">
        <div class="form-group"><label>Nama Device / MAC Address</label><input type="text" id="pr-device-id" value="${printer?.device_id || ''}" placeholder="Contoh: BT-Printer-01 atau AA:BB:CC:DD:EE:FF"></div>
        <div class="info-box" style="margin-bottom:0.75rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <p style="font-size:0.78rem">Pastikan printer sudah di-pair ke perangkat melalui pengaturan Bluetooth sistem. Lihat tab Panduan untuk langkah lengkap.</p>
        </div>
      </div>

      <!-- Field: USB -->
      <div id="pr-field-usb" style="display:${connType==='usb'?'block':'none'}">
        <div class="form-group"><label>Identifier USB</label><input type="text" id="pr-addr-usb" value="${connType==='usb'?printer?.address||'':''}" placeholder="Contoh: USB001 atau nama printer di OS"></div>
      </div>

      <div class="form-group"><label>Catatan <span style="color:var(--text-muted);font-size:0.78rem">(opsional)</span></label><input type="text" id="pr-notes" value="${printer?.notes || ''}" placeholder="Contoh: Lantai 1 dekat bar"></div>

      <div style="display:flex;flex-direction:column;gap:0.75rem;margin-top:0.5rem">
        <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer">
          <input type="checkbox" id="pr-active" ${printer?.is_active !== 0 ? 'checked' : ''} style="width:auto">
          <span>Printer Aktif</span>
        </label>
        <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer">
          <input type="checkbox" id="pr-default" ${printer?.is_default ? 'checked' : ''} style="width:auto">
          <span>Set sebagai Printer Default (untuk tipe ini)</span>
        </label>
        <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer">
          <input type="checkbox" id="pr-online" ${printer?.is_online ? 'checked' : ''} style="width:auto">
          <span>Tandai sebagai Online</span>
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="savePrinter(${printer?.id || 'null'})">Simpan</button>
    </div>`);
}

function onPrinterConnChange(val) {
  document.getElementById('pr-field-network').style.display = val === 'network' ? 'flex' : 'none';
  document.getElementById('pr-field-bluetooth').style.display = val === 'bluetooth' ? 'block' : 'none';
  document.getElementById('pr-field-usb').style.display = val === 'usb' ? 'block' : 'none';
}

async function savePrinter(id) {
  const conn = document.getElementById('pr-conn').value;
  const addr = conn === 'bluetooth'
    ? '' // Bluetooth tidak pakai IP address
    : conn === 'usb'
    ? document.getElementById('pr-addr-usb')?.value || ''
    : document.getElementById('pr-addr')?.value || '';

  const data = {
    name: document.getElementById('pr-name').value,
    type: document.getElementById('pr-type').value,
    connection_type: conn,
    address: addr,
    port: conn === 'network' ? parseInt(document.getElementById('pr-port')?.value || 9100) : 9100,
    device_id: document.getElementById('pr-device-id')?.value || '',
    notes: document.getElementById('pr-notes')?.value || '',
    is_active: document.getElementById('pr-active').checked ? 1 : 0,
    is_default: document.getElementById('pr-default').checked ? 1 : 0,
    is_online: document.getElementById('pr-online').checked ? 1 : 0
  };
  if (!data.name) return showToast('Nama printer wajib diisi', 'error');
  try {
    if (id) await API.put(`/api/printers/${id}`, data);
    else await API.post('/api/printers', data);
    closeModal();
    showToast('Printer disimpan ✓', 'success');
    renderPrintersPage();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deletePrinter(id) {
  confirm('Hapus printer ini?', async () => {
    try {
      await API.del(`/api/printers/${id}`);
      showToast('Printer dihapus', 'success');
      renderPrintersPage();
    } catch(e) { showToast(e.message, 'error'); }
  });
}
