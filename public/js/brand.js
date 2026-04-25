// Brand Configuration — Centralized Branding
// All UI, receipts, reports, and display elements reference this config
// To rebrand: change values here ONLY

const BRAND = {
  // Core Identity
  name: 'Kedai Pulo',
  shortName: 'Kedai Pulo',
  initial: 'KP',

  // POS System
  appName: 'Kedai Pulo POS System',
  appTitle: 'Kedai Pulo POS',
  appDescription: 'Kedai Pulo POS System - Sistem Kasir Modern untuk F&B',

  // Business Info
  tagline: 'F&B • Coffee & Eatery',
  description: 'Kedai Pulo adalah usaha F&B yang menyediakan makanan dan minuman dengan sistem kasir modern, cepat, dan efisien.',

  // Receipt / Print
  receiptHeader: 'KEDAI PULO',
  receiptTagline: 'F&B • Coffee & Eatery',
  receiptFooter: 'Terima kasih sudah berkunjung!',
  receiptBrand: 'Kedai Pulo ☕',

  // Reports
  reportHeader: 'LAPORAN KEDAI PULO POS',
  reportFilePrefix: 'laporan_kedaipulo',

  // Invoice Prefix (Keep short, 2-3 chars, uppercase)
  invoicePrefix: 'KP',
};

// Export for Node.js (backend) — will be ignored in browser context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BRAND;
}
