import { Transaction, Category } from '../types';
import { formatRupiah, formatDateIndo } from '../data';

/**
 * Exporter to format CSV for Excel & Sheets
 */
export function exportToCSV(transactions: Transaction[]): void {
  const headers = ['ID Transaksi', 'Tanggal', 'Jenis', 'Kategori', 'Jumlah (IDR)', 'Catatan', 'Metode Pembayaran (Bank)'];
  
  const rows = transactions.map(tx => [
    tx.id,
    tx.date,
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    tx.category,
    tx.amount,
    `"${(tx.note || '').replace(/"/g, '""')}"`,
    tx.bankName || 'Dompet Manual'
  ]);
  
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' // BOM for Indonesian Excel support
    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `CatatSaku_Laporan_Keuangan_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link); // Required for FF
  
  link.click();
  document.body.removeChild(link);
}

/**
 * Creates an elegant printable HTML invoice-style report inside a temporary iframe,
 * prompting the system print dialogue. This lets the user choose 'Save as PDF' directly,
 * generating a polished PDF archive with summary widgets, category blocks, and transaction lists!
 */
export function exportToPDF(transactions: Transaction[], categories: Category[]): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Mohon izinkan pop-up untuk mengekspor laporan PDF.');
    return;
  }

  // Calculate stats
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const remainingBalance = totalIncome - totalExpense;

  // Expenses by Category
  const expenseByCategory = categories
    .filter(c => c.type === 'expense')
    .map(c => {
      const amount = transactions
        .filter(t => t.type === 'expense' && t.category === c.name)
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: c.name, amount };
    })
    .filter(c => c.amount > 0);

  const tableRows = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(tx => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px; color: #64748b;">${formatDateIndo(tx.date)}</td>
        <td style="padding: 8px;">
          <span style="font-weight: 500; font-size: 11px; ${tx.type === 'income' ? 'color: #059669;' : 'color: #dc2626;'}">
            ${tx.type === 'income' ? '● Pemasukan' : '▼ Pengeluaran'}
          </span>
        </td>
        <td style="padding: 8px; font-weight: 500;">${tx.category}</td>
        <td style="padding: 8px; color: #334155;">${tx.note || '-'}</td>
        <td style="padding: 8px; color: #64748b; font-size: 10px;">${tx.bankName || 'Dompet Manual'}</td>
        <td style="padding: 8px; text-align: right; font-weight: 600; font-family: monospace; ${tx.type === 'income' ? 'color: #059669;' : 'color: #dc2626;'}">
          ${tx.type === 'income' ? '+' : '-'}${formatRupiah(tx.amount)}
        </td>
      </tr>
    `).join('');

  const catRows = expenseByCategory.map(cat => `
    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px;">
      <span style="font-weight: 500; color: #334155;">${cat.name}</span>
      <span style="font-weight: 600; font-family: monospace;">${formatRupiah(cat.amount)}</span>
    </div>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CatatSaku - Laporan Arsip Keuangan</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 40px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .title {
          font-size: 24px;
          font-weight: 800;
          color: #4f46e5;
          margin: 0;
        }
        .subtitle {
          font-size: 12px;
          color: #64748b;
          margin: 4px 0 0 0;
        }
        .meta-box {
          text-align: right;
          font-size: 11px;
          color: #64748b;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }
        .stat-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          background-color: #f8fafc;
        }
        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 700;
          font-family: monospace;
        }
        .income { color: #059669; }
        .expense { color: #dc2626; }
        .balance { color: #0f172a; }
        
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
          border-left: 3px solid #4f46e5;
          padding-left: 8px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }
        .table th {
          background-color: #f1f5f9;
          text-align: left;
          padding: 8px;
          font-size: 10px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
        }
        .footer {
          margin-top: 60px;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">CATATSAKU</h1>
          <p class="subtitle">Laporan Arsip Keuangan Pribadi & Sinkronisasi Spreadsheet</p>
        </div>
        <div class="meta-box">
          <p style="margin: 0; font-weight: bold;">Dokumen Arsip Rahasia</p>
          <p style="margin: 4px 0 0 0;">Dibuat: ${new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
          <p style="margin: 2px 0 0 0;">Total Transaksi: ${transactions.length} Item</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Pemasukan</div>
          <div class="stat-value income">+${formatRupiah(totalIncome)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Pengeluaran</div>
          <div class="stat-value expense">-${formatRupiah(totalExpense)}</div>
        </div>
        <div class="stat-card" style="background-color: #eef2ff; border-color: #c7d2fe;">
          <div class="stat-label">Saldo Bersih Sisa</div>
          <div class="stat-value balance" style="color: #4f46e5;">${formatRupiah(remainingBalance)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; margin-bottom: 30px;">
        <div>
          <div class="section-title">Riwayat Transaksi Terbaru</div>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 15%;">Tanggal</th>
                <th style="width: 15%;">Aliran</th>
                <th style="width: 25%;">Kategori</th>
                <th style="width: 25%;">Catatan</th>
                <th style="width: 15%;">Sumber</th>
                <th style="width: 15%; text-align: right;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        
        <div>
          <div class="section-title">Rincian Pengeluaran Kategori</div>
          <div style="background-color: #fafafa; border: 1px solid #f1f5f9; border-radius: 8px; padding: 16px;">
            ${catRows || '<p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 20px 0;">Tidak ada catatan pengeluaran.</p>'}
          </div>
          
          <div style="margin-top: 30px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; font-size: 11px; color: #1e3a8a;">
            <strong>Catatan Audit:</strong> Laporan ini disinkronisasikan secara otomatis ke Cloud Spreadsheet akun Google Anda. Seluruh nilai di atas dicadangkan pada cloud storage Google Drive pribadi Anda untuk keamanan finansial jangka panjang.
          </div>
        </div>
      </div>

      <div class="footer">
        Laporan Keuangan Otomatis CatatSaku • Ekspor PDF Kepatuhan Pajak & Arsip Mandiri • Keuangan Lebih Terstruktur
      </div>

      <script>
        // Automatic trigger print options on view build and auto close tab when printing completes
        window.onload = function() {
          window.print();
          // Optional: close window after print done, uncomment if desired:
          // setTimeout(function(){ window.close(); }, 500);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
