import { Category, Transaction, BankAccount } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Pengeluaran (Expenses)
  { id: 'cat-makanan', name: 'Makanan & Minuman', type: 'expense', color: '#EF4444', icon: 'Utensils', budget: 1500000 },
  { id: 'cat-transport', name: 'Transportasi', type: 'expense', color: '#3B82F6', icon: 'Car', budget: 500000 },
  { id: 'cat-belanja', name: 'Belanja Bulanan', type: 'expense', color: '#10B981', icon: 'ShoppingBag', budget: 1000000 },
  { id: 'cat-hiburan', name: 'Hiburan', type: 'expense', color: '#8B5CF6', icon: 'Gamepad2', budget: 400000 },
  { id: 'cat-tagihan', name: 'Listrik & Tagihan', type: 'expense', color: '#F59E0B', icon: 'Receipt', budget: 800000 },
  { id: 'cat-kesehatan', name: 'Kesehatan', type: 'expense', color: '#EC4899', icon: 'HeartPulse', budget: 300000 },
  
  // Pemasukan (Income)
  { id: 'cat-gaji', name: 'Gaji Bulanan', type: 'income', color: '#059669', icon: 'Briefcase', budget: null },
  { id: 'cat-investasi', name: 'Investasi', type: 'income', color: '#2563EB', icon: 'TrendingUp', budget: null },
  { id: 'cat-sampingan', name: 'Freelance & Sampingan', type: 'income', color: '#7C3AED', icon: 'Laptop', budget: null },
  { id: 'cat-bonus', name: 'Bonus & Hadiah', type: 'income', color: '#D97706', icon: 'Gift', budget: null }
];

export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'bank-bca', bankName: 'BCA', accountNo: '1283-992-10', accountName: 'Thoriq S', balance: 5420000, isConnected: false, lastSynced: null },
  { id: 'bank-mandiri', bankName: 'Mandiri', accountNo: '133-00-24128-9', accountName: 'Thoriq Salaf', balance: 2890000, isConnected: false, lastSynced: null },
  { id: 'bank-bni', bankName: 'BNI', accountNo: '0821-4452-192', accountName: 'Thoriq S', balance: 1200000, isConnected: false, lastSynced: null }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx-16', date: '2026-06-19', type: 'expense', category: 'Makanan & Minuman', amount: 45000, note: 'Makan malam Bakso Mas Tato', bankName: 'BCA', synced: true },
  { id: 'tx-15', date: '2026-06-18', type: 'expense', category: 'Transportasi', amount: 120000, note: 'Isi Pertamax Mobil', bankName: 'BCA', synced: true },
  { id: 'tx-14', date: '2026-06-17', type: 'expense', category: 'Belanja Bulanan', amount: 350000, note: 'Beli sembako & deterjen indomaret', bankName: 'BCA', synced: true },
  { id: 'tx-13', date: '2026-06-15', type: 'income', category: 'Gaji Bulanan', amount: 8500000, note: 'Gaji Pokok Juni 2026', synced: true },
  { id: 'tx-12', date: '2026-06-14', type: 'expense', category: 'Listrik & Tagihan', amount: 485000, note: 'Tagihan Token PLN Rumah', bankName: 'Mandiri', synced: true },
  { id: 'tx-11', date: '2026-06-12', type: 'expense', category: 'Hiburan', amount: 150000, note: 'Nonton Bioskop + Popcorn', synced: true },
  { id: 'tx-10', date: '2026-06-10', type: 'income', category: 'Freelance & Sampingan', amount: 1750000, note: 'Desain Landing Page Client', synced: true },
  { id: 'tx-09', date: '2026-06-08', type: 'expense', category: 'Kesehatan', amount: 85000, note: 'Beli Vitamin C & Suplemen di Kimia Farma', bankName: 'Mandiri', synced: true },
  { id: 'tx-08', date: '2026-06-05', type: 'expense', category: 'Makanan & Minuman', amount: 65000, note: 'Kopi Susu & Croissant Senja', synced: true },
  { id: 'tx-07', date: '2026-06-02', type: 'expense', category: 'Transportasi', amount: 50000, note: 'E-Toll Flash Mandiri', bankName: 'Mandiri', synced: false },
  
  // May 2026 Historical
  { id: 'tx-06', date: '2026-05-25', type: 'expense', category: 'Listrik & Tagihan', amount: 520000, note: 'Tagihan Wifi IndiHome', synced: true },
  { id: 'tx-05', date: '2026-05-20', type: 'expense', category: 'Makanan & Minuman', amount: 180000, note: 'Makan Bareng Keluarga', synced: true },
  { id: 'tx-04', date: '2026-05-15', type: 'income', category: 'Gaji Bulanan', amount: 8500000, note: 'Gaji Pokok Mei 2026', synced: true },
  { id: 'tx-03', date: '2026-05-10', type: 'income', category: 'Investasi', amount: 450000, note: 'Dividen Reksa Dana', synced: true },
  { id: 'tx-02', date: '2026-05-08', type: 'expense', category: 'Belanja Bulanan', amount: 650000, note: 'Belanja Supermarket Bulanan', synced: true },
  { id: 'tx-01', date: '2026-05-03', type: 'expense', category: 'Hiburan', amount: 220000, note: 'Pembelian Game Steam', synced: true }
];

export const MOCK_BANK_FEED: { [key: string]: Array<{ date: string; type: 'income' | 'expense'; amount: number; note: string; category: string }> } = {
  BCA: [
    { date: '2026-06-20', type: 'expense', amount: 35000, note: 'TRANSFER GO-PAY TOPUP', category: 'Transportasi' },
    { date: '2026-06-20', type: 'expense', amount: 95000, note: 'DEBIT CARD MARUGAME UDON', category: 'Makanan & Minuman' },
    { date: '2026-06-20', type: 'income', amount: 100000, note: 'TRSF SAKUKU CASHBACK', category: 'Bonus & Hadiah' }
  ],
  Mandiri: [
    { date: '2026-06-20', type: 'expense', amount: 150000, note: 'DANA TOP UP QRIS', category: 'Belanja Bulanan' },
    { date: '2026-06-19', type: 'expense', amount: 250000, note: 'TOKOPEDIA PEMBAYARAN BARANG', category: 'Belanja Bulanan' }
  ],
  BNI: [
    { date: '2026-06-20', type: 'expense', amount: 45000, note: 'ADMIN BULANAN TABUNGAN', category: 'Listrik & Tagihan' }
  ]
};

export const formatRupiah = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
};

export const formatDateIndo = (dateStr: string): string => {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString('id-ID', options);
};

export const getMonthNameIndo = (monthNum: number): string => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthNum];
};
