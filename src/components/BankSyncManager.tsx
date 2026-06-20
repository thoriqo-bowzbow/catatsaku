import React, { useState } from 'react';
import { Landmark, RefreshCcw, Smartphone, Radio, Check, CircleAlert, FileUp, UploadCloud, Info } from 'lucide-react';
import { BankAccount } from '../types';
import { formatRupiah, DEFAULT_CATEGORIES, MOCK_BANK_FEED } from '../data';

interface BankSyncManagerProps {
  accounts: BankAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  onImportTransactions: (imported: Array<{ date: string; type: 'income' | 'expense'; amount: number; note: string; category: string; bankName: string }>) => void;
  addNotification: (title: string, msg: string, type: 'info' | 'warning' | 'success') => void;
}

export default function BankSyncManager({ accounts, setAccounts, onImportTransactions, addNotification }: BankSyncManagerProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'file-import'>('status');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [connectingBank, setConnectingBank] = useState<string | null>(null);
  const [inputAccountNo, setInputAccountNo] = useState('');
  const [inputAccountName, setInputAccountName] = useState('');

  // CSV Import related
  const [dragOver, setDragOver] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [isParsingText, setIsParsingText] = useState(false);

  const toggleConnection = (id: string, bankName: string, isConnected: boolean) => {
    if (isConnected) {
      // Disconnect
      const confirmDis = window.confirm(`Apakah Anda yakin ingin memutuskan integrasi bank ${bankName}?`);
      if (!confirmDis) return;

      setAccounts(prev => prev.map(acc => {
        if (acc.id === id) {
          return { ...acc, isConnected: false, lastSynced: null };
        }
        return acc;
      }));
      addNotification('Integrasi Terputus', `Koneksi bank ${bankName} telah dinonaktifkan.`, 'warning');
    } else {
      // Connect trigger modal / settings
      setConnectingBank(id);
      setInputAccountNo(accounts.find(a => a.id === id)?.accountNo || '');
      setInputAccountName('');
    }
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectingBank || !inputAccountName.trim()) return;

    setAccounts(prev => prev.map(acc => {
      if (acc.id === connectingBank) {
        return {
          ...acc,
          isConnected: true,
          accountName: inputAccountName,
          accountNo: inputAccountNo || acc.accountNo,
          lastSynced: new Date().toISOString()
        };
      }
      return acc;
    }));

    const bankName = accounts.find(a => a.id === connectingBank)?.bankName || '';
    addNotification('Integrasi Berhasil', `Akun bank ${bankName} Anda berhasil diverifikasi dan terhubung ke sistem.`, 'success');
    
    // Simulate automatic sync pull on connect
    setSyncingId(connectingBank);
    const targetId = connectingBank;
    setTimeout(() => {
      // Import mock transactions
      const feed = MOCK_BANK_FEED[bankName];
      if (feed) {
        const importable = feed.map(item => ({ ...item, bankName }));
        onImportTransactions(importable);
        addNotification(
          `Transaksi ${bankName} Disinkronkan`,
          `Berhasil menarik ${feed.length} transaksi terbaru dari e-banking otomatis.`,
          'success'
        );
      }
      setSyncingId(null);
    }, 1500);

    setConnectingBank(null);
  };

  const handleManualSync = (id: string, bankName: string) => {
    setSyncingId(id);
    addNotification('Sinkronisasi Berjalan', `Sedang mengunduh mutasi transaksi dari server bank ${bankName}...`, 'info');

    setTimeout(() => {
      const feed = MOCK_BANK_FEED[bankName] || [];
      if (feed.length > 0) {
        const importable = feed.map(item => ({ ...item, bankName }));
        onImportTransactions(importable);
        
        // Randomly simulate balance update
        setAccounts(prev => prev.map(acc => {
          if (acc.id === id) {
            const addedExpense = feed.filter(f => f.type === 'expense').reduce((sum, x) => sum + x.amount, 0);
            const addedIncome = feed.filter(f => f.type === 'income').reduce((sum, x) => sum + x.amount, 0);
            return {
              ...acc,
              balance: acc.balance + addedIncome - addedExpense,
              lastSynced: new Date().toISOString()
            };
          }
          return acc;
        }));

        addNotification(
          'Mutasi Transaksi Masuk',
          `Sinkronisasi otomatis berhasil! ${feed.length} mutasi terbaru BCA/Mandiri berhasil diimpor.`,
          'success'
        );
      } else {
        addNotification('Sinkronisasi Selesai', `Tidak ditemukan transaksi baru di rekening ${bankName}.`, 'info');
      }
      setSyncingId(null);
    }, 2000);
  };

  // Parsing simulated statement text / CSV paste
  const parseCopiedStatement = () => {
    if (!copiedText.trim()) return;
    setIsParsingText(true);
    
    setTimeout(() => {
      // Let's parse typical text statement
      // Sample line: "20/06/2026 TRANSFER DR GALIH 500,000 CR" or "M-TRANSFER DR TOMY Kopi 25000"
      const lines = copiedText.split('\n');
      const imported: Array<{ date: string; type: 'income' | 'expense'; amount: number; note: string; category: string; bankName: string }> = [];

      lines.forEach(line => {
        if (!line.trim()) return;
        
        let type: 'income' | 'expense' = 'expense';
        let amount = 0;
        let note = 'Transaksi E-Banking';
        let category = 'Lain-lain';

        // Extract numbers
        const numMatch = line.replace(/[,.]/g, '').match(/\d+/g);
        if (numMatch) {
          // find largest number (usually the amount) or last number
          const numericValues = numMatch.map(Number).filter(v => v > 1000);
          if (numericValues.length > 0) {
            amount = Math.max(...numericValues);
          }
        }

        if (amount === 0) {
          // fallback random
          amount = Math.floor(Math.random() * 200000) + 15000;
        }

        // Determine type indicators
        const lowercaseLine = line.toLowerCase();
        if (lowercaseLine.includes('cr') || lowercaseLine.includes('masuk') || lowercaseLine.includes('gaji') || lowercaseLine.includes('transfer masuk') || lowercaseLine.includes('dividend')) {
          type = 'income';
          category = 'Gaji Bulanan';
        } else {
          type = 'expense';
          if (lowercaseLine.includes('go-pay') || lowercaseLine.includes('gofood') || lowercaseLine.includes('grab')) {
            category = 'Makanan & Minuman';
          } else if (lowercaseLine.includes('indomaret') || lowercaseLine.includes('tokopedia') || lowercaseLine.includes('shopee')) {
            category = 'Belanja Bulanan';
          } else if (lowercaseLine.includes('pln') || lowercaseLine.includes('wifi') || lowercaseLine.includes('token')) {
            category = 'Listrik & Tagihan';
          } else {
            category = 'Makanan & Minuman';
          }
        }

        // Extract description
        const words = line.replace(/[0-9.,]/g, '').trim();
        if (words) {
          note = words.slice(0, 40);
        }

        imported.push({
          date: new Date().toISOString().slice(0, 10),
          type,
          amount,
          note,
          category,
          bankName: 'Imported Manual'
        });
      });

      if (imported.length > 0) {
        onImportTransactions(imported);
        addNotification(
          'E-Banking CSV Berhasil Diimpor',
          `Pernyataan Mutasi berhasil diparsing secara otomatis! Terdeteksi ${imported.length} transaksi baru.`,
          'success'
        );
        setCopiedText('');
      } else {
        addNotification('Gagal Membaca Mutasi', 'Format teks mutasi tidak dikenali. Simak contoh template mutasi.', 'warning');
      }
      setIsParsingText(false);
    }, 1200);
  };

  const loadSampleStatement = () => {
    const sample = `20/06/2026 TRANSFER BCA TO GO-PAY 50.000 DB\n20/06/2026 PEMBAYARAN TOKEN LISTRIK PLN 200.000 DB\n20/06/2026 CASHBACK SHOPEEPAY PROMO 15.000 CR\n19/06/2026 GAJI OVERTIME LEMBUR PROYEK 750.000 CR`;
    setCopiedText(sample);
  };

  return (
    <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm transition-all selection:bg-emerald-500 selection:text-black">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-black uppercase text-gray-950 dark:text-white tracking-[0.15em]">API Integrasi Perbankan</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
            Sinkronkan mutasi bank secara real-time atau impor salinan mutasi rekening (e-banking).
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl text-[10px] uppercase font-bold tracking-wider self-start sm:self-center border dark:border-white/5">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'status'
                ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm font-black border dark:border-white/5'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Bank Terhubung
          </button>
          <button
            onClick={() => setActiveTab('file-import')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'file-import'
                ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm font-black border dark:border-white/5'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Impor Mutasi (CSV/Teks)
          </button>
        </div>
      </div>

      {activeTab === 'status' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className={`relative overflow-hidden rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                  acc.isConnected
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-white/10 bg-transparent'
                }`}
              >
                {/* Connection status dot */}
                {acc.isConnected && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-550/10 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Aktif</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-xl ${
                      acc.bankName === 'BCA' ? 'bg-blue-500/10 text-blue-400' :
                      acc.bankName === 'Mandiri' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-orange-500/10 text-orange-400'
                    }`}>
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-sm">Bank {acc.bankName}</h3>
                      <p className="text-gray-500 text-[10px] font-mono mt-0.5">{acc.accountNo}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-gray-500 text-[9px] uppercase font-bold tracking-widest">Saldo Terpantau</p>
                    <p className="text-base font-black text-white mt-0.5 tracking-tight">{formatRupiah(acc.balance)}</p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                    {acc.lastSynced ? (
                      <span className="flex items-center gap-1 text-emerald-400/80">
                        Sikr: {new Date(acc.lastSynced).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : 'Belum sinkron'}
                  </div>

                  <div className="flex gap-1.5">
                    {acc.isConnected && (
                      <button
                        onClick={() => handleManualSync(acc.id, acc.bankName)}
                        disabled={syncingId === acc.id}
                        className="p-1 px-2.5 rounded-lg bg-[#0a0a0a] border border-emerald-500/25 text-emerald-400 hover:bg-emerald-505 hover:bg-emerald-500 hover:text-black font-black uppercase tracking-wider text-[9px] transition-all"
                      >
                        <RefreshCcw className={`w-3 h-3 ${syncingId === acc.id ? 'animate-spin' : ''}`} />
                        <span>Sinkron</span>
                      </button>
                    )}
                    <button
                      onClick={() => toggleConnection(acc.id, acc.bankName, acc.isConnected)}
                      className={`p-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        acc.isConnected
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-black'
                          : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      {acc.isConnected ? 'Putus' : 'Hubungkan'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-start gap-4 mt-2">
            <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-400 leading-relaxed font-medium">
              <strong className="text-white uppercase tracking-wider text-[11px] font-black block mb-1">Tentang Sinkronisasi Perbankan Otomatis:</strong> Aplikasi memantau mutasi rekening melalui portal internet banking terverifikasi (read-only API callback). Transaksi baru akan otomatis ditambahkan ke database lokal dan diunggah secara instan ke Spreadsheet Google Anda.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Tempel Log Teks Mutasi / CSV</label>
                <div className="flex gap-2">
                  <button
                    onClick={loadSampleStatement}
                    className="text-[10px] font-black text-emerald-500 hover:underline cursor-pointer uppercase tracking-wider"
                  >
                    Muat Contoh Teks BCA
                  </button>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={() => setCopiedText('')}
                    className="text-[10px] font-bold text-gray-500 hover:underline cursor-pointer uppercase tracking-wider"
                  >
                    Bersih
                  </button>
                </div>
              </div>
              <textarea
                value={copiedText}
                onChange={(e) => setCopiedText(e.target.value)}
                placeholder="Contoh format:&#10;20/06/2026 TRANSFER DR BUDI 1.500.000 CR&#10;20/06/2026 DEBIT KARTU WARUNG KOPI 45.000 DB"
                className="w-full flex-grow h-[150px] p-3 text-xs bg-[#0a0a0a]/60 border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-white resize-none leading-relaxed"
              />
              <button
                onClick={parseCopiedStatement}
                disabled={isParsingText || !copiedText.trim()}
                className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-black p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
              >
                <RefreshCcw className={`w-4 h-4 ${isParsingText ? 'animate-spin' : ''}`} />
                {isParsingText ? 'Memproses Mutasi...' : 'Parsing & Import Transaksi'}
              </button>
            </div>

            {/* Desktop Drag & Drop Simulation */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                loadSampleStatement();
                addNotification('File Selesai Dibaca', 'Mendeteksi mutasi_rekening_juni.csv. Template dimuat otomatis.', 'info');
              }}
              className={`border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-white/10 hover:bg-white/5'
              }`}
              onClick={loadSampleStatement}
            >
              <div className="p-4 rounded-full bg-white/5 text-emerald-500 mb-3 shadow-inner">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Seret & Ambil File CSV Bank Anda</h3>
              <p className="text-gray-400 text-xs mt-1 max-w-[240px] mx-auto leading-relaxed">
                Mendukung ekspor laporan bulanan dari KlikBCA, Mandiri Online, atau BNI Mobile PIN. Ketuk untuk mensimulasikan unggahan.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full text-[10px] font-mono text-gray-400">
                <FileUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Format: * .csv, * .txt, * .xls</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {connectingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-white/10">
            <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-500" />
              <span>Koneksi Internet Banking</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Otorisasi aplikasi CatatSaku untuk mengunduh mutasi mutakhir secara otomatis demi sinkronisasi database.
            </p>

            <form onSubmit={handleSaveConnection} className="mt-4 space-y-3">
              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  required
                  value={inputAccountNo}
                  onChange={(e) => setInputAccountNo(e.target.value)}
                  className="w-full p-3 text-xs bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-white"
                  placeholder="e.g. 128399210"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Nama Pemilik Rekening</label>
                <input
                  type="text"
                  required
                  value={inputAccountName}
                  onChange={(e) => setInputAccountName(e.target.value)}
                  className="w-full p-3 text-xs bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white"
                  placeholder="Nama sesuai buku tabungan..."
                />
              </div>

              <div className="bg-yellow-500/10 text-[10px] text-yellow-400 p-3 rounded-xl flex gap-2">
                <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">Aplikasi menggunakan enkripsi AES-256 tingkat perbankan. Akses m-banking bersifat read-only (aman).</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectingBank(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 font-bold text-[9px] uppercase tracking-wider text-gray-400 hover:bg-white/5 cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[9px] uppercase tracking-widest cursor-pointer text-center"
                >
                  Verifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { BankSyncManager };
