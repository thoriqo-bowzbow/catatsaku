import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, Landmark, Plus, Trash2, ArrowUpRight, ArrowDownRight,
  Filter, Search, RefreshCw, Moon, Sun, Lock, ShieldAlert,
  ChevronRight, Calendar, Settings, Activity, Sparkles, FileText, Download,
  CheckCircle2, Bell, AlertTriangle, Fingerprint, RefreshCcw, HelpCircle,
  Landmark as BankIcon, CircleCheck, Info, Sparkle, PlusCircle, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Custom imports
import { Transaction, Category, NotificationLog, BankAccount, SyncConfig, SecurityConfig } from './types';
import {
  INITIAL_TRANSACTIONS,
  DEFAULT_CATEGORIES,
  INITIAL_BANK_ACCOUNTS,
  formatRupiah,
  formatDateIndo,
  getMonthNameIndo
} from './data';
import { exportToCSV, exportToPDF } from './utils/exportHelpers';

// Subcomponents
import { TransactionForm } from './components/TransactionForm';
import { DashboardCharts } from './components/DashboardCharts';
import { BudgetOverview } from './components/BudgetOverview';
import { SpreadsheetSyncCard } from './components/SpreadsheetSyncCard';
import { BankSyncManager } from './components/BankSyncManager';
import { BiometricVerify } from './components/BiometricVerify';

export default function App() {
  // --- Dark Mode State ---
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('catatsaku_dark_mode') === 'true';
  });

  // --- Core Domain Data State ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const local = localStorage.getItem('catatsaku_transactions');
    return local ? JSON.parse(local) : INITIAL_TRANSACTIONS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const local = localStorage.getItem('catatsaku_categories');
    return local ? JSON.parse(local) : DEFAULT_CATEGORIES;
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const local = localStorage.getItem('catatsaku_bank_accounts');
    return local ? JSON.parse(local) : INITIAL_BANK_ACCOUNTS;
  });

  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    spreadsheetId: '',
    spreadsheetName: 'CatatSaku: Keuangan Spreadsheet',
    isConnected: false,
    isAutoSync: true,
    lastSynced: null
  });

  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    const local = localStorage.getItem('catatsaku_notifications');
    if (local) return JSON.parse(local);
    
    // Initial friendly system greetings
    return [
      {
        id: 'notif-1',
        title: 'Buku Kas Rilis',
        message: 'Aplikasi CatatSaku siap digunakan. Sambungkan ke Google Sheets di tab Sinkronisasi!',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        type: 'info',
        read: false
      }
    ];
  });

  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(() => {
    const local = localStorage.getItem('catatsaku_security_config');
    return local ? JSON.parse(local) : { isBiometricEnabled: true, isLocked: true, passcode: '1234' };
  });

  // --- View Tab States ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'budgets' | 'sheets' | 'banking' | 'settings'>('dashboard');

  // --- Filtering & Searching Transactions State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // --- Settings Custom Category Form State ---
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [newCatColor, setNewCatColor] = useState('#6366F1');
  const [newCatBudget, setNewCatBudget] = useState('');

  // --- Dynamic local storage persistence handlers ---
  useEffect(() => {
    localStorage.setItem('catatsaku_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('catatsaku_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('catatsaku_bank_accounts', JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  useEffect(() => {
    localStorage.setItem('catatsaku_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('catatsaku_security_config', JSON.stringify(securityConfig));
  }, [securityConfig]);

  // Dark Mode class toggling
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('catatsaku_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('catatsaku_dark_mode', 'false');
    }
  }, [darkMode]);

  // --- Custom notification alert generator helper ---
  const addNotification = (title: string, message: string, type: 'info' | 'warning' | 'success') => {
    const newNotif: NotificationLog = {
      id: `notif-${Date.now()}`,
      title,
      message,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // --- Main Financial Math Computations ---
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    // Calculate for current active month Juni 2026 for real-time overview
    transactions.forEach(tx => {
      if (tx.date.startsWith('2026-06')) {
        if (tx.type === 'income') {
          income += tx.amount;
        } else {
          expense += tx.amount;
        }
      }
    });

    const netBalance = income - expense;
    return { income, expense, netBalance };
  }, [transactions]);

  // Total funds available overall (All bank balances + manual cash computed residue)
  const totalFundsAvailable = useMemo(() => {
    const bankBalanceSum = bankAccounts
      .filter(acc => acc.isConnected)
      .reduce((sum, acc) => sum + acc.balance, 0);

    // Sum manual transactions (non-bank connected)
    let manualIncome = 0;
    let manualExpense = 0;
    transactions.forEach(tx => {
      if (!tx.bankName) {
        if (tx.type === 'income') manualIncome += tx.amount;
        else manualExpense += tx.amount;
      }
    });

    return bankBalanceSum + (manualIncome - manualExpense);
  }, [transactions, bankAccounts]);

  // --- Transactions mutate routines ---
  const handleAddTransaction = (txData: {
    type: 'income' | 'expense';
    category: string;
    amount: number;
    note: string;
    date: string;
    bankName?: string;
  }) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      ...txData,
      synced: false
    };

    setTransactions(prev => [newTx, ...prev]);

    // Update specific Bank account balance if connected method was chosen
    if (txData.bankName) {
      setBankAccounts(prev => prev.map(acc => {
        if (acc.bankName === txData.bankName && acc.isConnected) {
          const delta = txData.type === 'income' ? txData.amount : -txData.amount;
          return {
            ...acc,
            balance: Math.max(0, acc.balance + delta)
          };
        }
        return acc;
      }));
    }

    addNotification(
      txData.type === 'income' ? 'Pemasukan Dicatat' : 'Pengeluaran Dicatat',
      `Berhasil mencatat ${txData.category} senilai ${formatRupiah(txData.amount)}`,
      txData.type === 'income' ? 'success' : 'info'
    );

    // Dynamic warning alert for Category Limit Exceeded !!
    if (txData.type === 'expense') {
      const matchCat = categories.find(c => c.name === txData.category);
      if (matchCat && matchCat.budget) {
        // Calculate total including this new entry
        const spentThisMonth = transactions
          .filter(t => t.type === 'expense' && t.category === txData.category && t.date.startsWith('2026-06'))
          .reduce((sum, t) => sum + t.amount, 0) + txData.amount;

        if (spentThisMonth > matchCat.budget) {
          addNotification(
            'Hati-hati! Anggaran Jebol',
            `Pengeluaran kategori "${txData.category}" mencapai ${formatRupiah(spentThisMonth)}, melampaui limit target ${formatRupiah(matchCat.budget)}!`,
            'warning'
          );
        } else if (spentThisMonth >= matchCat.budget * 0.85) {
          addNotification(
            'Mendekati Kuota Anggaran',
            `Pengeluaran kategory "${txData.category}" mendekati 85% dari batas kuota limit bulanan Anda.`,
            'warning'
          );
        }
      }
    }
  };

  const handleDeleteTransaction = (id: string, noteStr: string, amt: number, type: 'income' | 'expense', bankRef?: string) => {
    const isConfirm = window.confirm(`Apakah Anda yakin ingin menghapus pencatatan "${noteStr || 'Transaksi'}"?`);
    if (!isConfirm) return;

    setTransactions(prev => prev.filter(t => t.id !== id));

    // Reverse account balance adjustment
    if (bankRef) {
      setBankAccounts(prev => prev.map(acc => {
        if (acc.bankName === bankRef && acc.isConnected) {
          const delta = type === 'income' ? -amt : amt;
          return {
            ...acc,
            balance: Math.max(0, acc.balance + delta)
          };
        }
        return acc;
      }));
    }

    addNotification(
      'Transaksi Dihapus',
      `Berhasil membatalkan catatan senilai ${formatRupiah(amt)}.`,
      'info'
    );
  };

  // --- Bank Feed Bulk Importer callback ---
  const handleImportBankStatement = (imported: Array<{ date: string; type: 'income' | 'expense'; amount: number; note: string; category: string; bankName: string }>) => {
    const txToAppend = imported.map(item => ({
      id: `tx-imported-${Math.random().toString(36).substr(2, 9)}`,
      ...item,
      synced: false
    }));

    setTransactions(prev => [...txToAppend, ...prev]);

    // Settle balance changes
    imported.forEach(tx => {
      setBankAccounts(prev => prev.map(acc => {
        if (acc.bankName === tx.bankName && acc.isConnected) {
          const delta = tx.type === 'income' ? tx.amount : -tx.amount;
          return {
            ...acc,
            balance: Math.max(0, acc.balance + delta)
          };
        }
        return acc;
      }));
    });
  };

  const handleSpreadsheetSyncComplete = (syncedCount: number) => {
    // Flag all current transactions as synced
    setTransactions(prev => prev.map(t => ({ ...t, synced: true })));
  };

  // --- Create custom Category form setting handler ---
  const handleRegisterCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const parsedBudget = parseFloat(newCatBudget.replace(/[^0-9]/g, ''));
    
    const newCategory: Category = {
      id: `cat-custom-${Date.now()}`,
      name: newCatName.trim(),
      type: newCatType,
      color: newCatColor,
      icon: 'Tag', // generic fallback icon,
      budget: parsedBudget > 0 ? parsedBudget : null
    };

    setCategories(prev => [...prev, newCategory]);
    addNotification('Kategori Rilis', `Kategori baru "${newCatName}" telah dicatatkan ke sistem.`, 'success');
    
    setNewCatName('');
    setNewCatBudget('');
  };

  // --- Reset Sandbox values to factory defaults ---
  const handleResetSandbox = () => {
    const confirmReset = window.confirm('Kembalikan semua transaksi, kategori, anggaran, dan simulasi perbankan ke setelan awal pabrikan?');
    if (!confirmReset) return;

    setTransactions(INITIAL_TRANSACTIONS);
    setCategories(DEFAULT_CATEGORIES);
    setBankAccounts(INITIAL_BANK_ACCOUNTS);
    setNotifications([
      {
        id: 'notif-1',
        title: 'Buku Kas Rilis',
        message: 'Buku kas reset ke setelan pabrik. Silakan hubungkan Spreadsheet Anda.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        type: 'info',
        read: false
      }
    ]);
    
    localStorage.removeItem('catatsaku_transactions');
    localStorage.removeItem('catatsaku_categories');
    localStorage.removeItem('catatsaku_bank_accounts');
    localStorage.removeItem('catatsaku_notifications');

    addNotification('Sistem Direset', 'Seluruh konfigurasi internal dan sandbox data dibulatkan kembali.', 'info');
  };

  // Lock Applet manually
  const triggerManualLock = () => {
    setSecurityConfig(prev => ({ ...prev, isLocked: true }));
  };

  // --- Filter Transactions log rendering calculations ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchSearch = (tx.note || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchType = filterType === 'all' ? true : tx.type === filterType;
      const matchCat = filterCategory === 'all' ? true : tx.category === filterCategory;

      return matchSearch && matchType && matchCat;
    });
  }, [transactions, searchQuery, filterType, filterCategory]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-[#0a0a0a] dark:text-white flex flex-col font-sans transition-colors duration-300 selection:bg-emerald-500 selection:text-black">
      
      {/* Biometric Guard Barrier overlay screen */}
      <AnimatePresence>
        {securityConfig.isBiometricEnabled && securityConfig.isLocked && (
          <BiometricVerify
            passcode={securityConfig.passcode}
            onSuccess={() => setSecurityConfig(prev => ({ ...prev, isLocked: false }))}
          />
        )}
      </AnimatePresence>

      {/* --- Aesthetic Header Bar --- */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-md border-b border-gray-150/40 dark:border-white/10 flex justify-between items-center py-3.5 px-4 md:px-8 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-black uppercase tracking-tighter">
            F
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tighter font-display text-gray-950 dark:text-white leading-none uppercase">CatatSaku PRO</h1>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-widest">Spreadsheet Sync Engine</span>
          </div>
        </div>

        {/* Action Panel Utilities */}
        <div className="flex items-center gap-2">
          {securityConfig.isBiometricEnabled && (
            <button
              onClick={triggerManualLock}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200/80 dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/5 text-gray-500 dark:text-white/60 transition-all cursor-pointer"
              title="Kunci Aplikasi"
            >
              <Lock className="w-4.5 h-4.5" />
            </button>
          )}

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200/80 dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/5 text-gray-500 dark:text-white/60 transition-all cursor-pointer"
            title="Toggle Tema"
          >
            {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-emerald-400" />}
          </button>
          
          <div className="hidden sm:flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>IDR • Active</span>
          </div>
        </div>
      </header>

      {/* --- Main Contents wrap --- */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* --- Top Metrics Summary Banner (Rupiah balances) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Liquid Assets overall */}
          <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-150/40 dark:border-white/10 p-6 shadow-sm transition-all flex justify-between items-center group">
            <div>
              <p className="text-gray-400 dark:text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">Aset Lancar Terpantau</p>
              <h3 className="text-3xl font-black text-gray-950 dark:text-white mt-2 leading-none font-display tracking-tighter group-hover:scale-[1.01] transition-transform">{formatRupiah(totalFundsAvailable)}</h3>
              <p className="text-[10px] text-gray-400 dark:text-white/45 mt-2 flex items-center gap-1 font-semibold">
                <span>E-Banking + Dana Manual</span>
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Pemasukan (Current active month Juni) */}
          <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-150/40 dark:border-white/10 p-6 shadow-sm transition-all flex justify-between items-center group">
            <div>
              <p className="text-gray-400 dark:text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">Inflow Juni 2026</p>
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 leading-none font-display tracking-tighter group-hover:scale-[1.01] transition-transform">+{formatRupiah(totals.income)}</h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-0.5 font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Pemasukan Tergabung</span>
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Pengeluaran (Current active month Juni) */}
          <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-150/40 dark:border-white/10 p-6 shadow-sm transition-all flex justify-between items-center group">
            <div>
              <p className="text-gray-400 dark:text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">Outflow Juni 2026</p>
              <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 leading-none font-display tracking-tighter group-hover:scale-[1.01] transition-transform">-{formatRupiah(totals.expense)}</h3>
              <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-2 flex items-center gap-0.5 font-bold">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Pengeluaran Kategori</span>
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Net Balance / Tabungan */}
          <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-150/40 dark:border-white/10 p-6 shadow-sm transition-all flex justify-between items-center group">
            <div>
              <p className="text-gray-400 dark:text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">Arsip Kas Bersih</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-2 leading-none font-display tracking-tighter group-hover:scale-[1.01] transition-transform">{formatRupiah(totals.netBalance)}</h3>
              <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-2 flex items-center gap-1 font-bold">
                <Sparkles className="w-3.5 h-3.5 inline animate-spin text-teal-500" style={{ animationDuration: '3s' }} />
                <span>Surplus Bersih Bulan Ini</span>
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-550/10 text-teal-500">
              <Activity className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* --- Navigation Tabs Switcher Bar --- */}
        <div className="flex border-b border-gray-200 dark:border-white/10 overflow-x-auto scroller-none py-1 gap-2">
          {[
            { id: 'dashboard', name: 'Dashboard' },
            { id: 'budgets', name: 'Anggaran & Alert' },
            { id: 'sheets', name: 'Spreadsheet Sync' },
            { id: 'banking', name: 'API Perbankan' },
            { id: 'settings', name: 'Setelan & Custom' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-4 font-black text-xs tracking-[0.1em] uppercase transition-all border-b-2 cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* --- Primary Tabs Content blocks --- */}
        <div className="space-y-6">
          
          {/* Tab 1: Dashboard and Mutasi Ledger */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Interactive Charts Wrapper */}
              <DashboardCharts transactions={transactions} categories={categories} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side: Add Transaction Form */}
                <div className="flex flex-col gap-6">
                  <TransactionForm
                    categories={categories}
                    bankAccounts={bankAccounts}
                    onSubmit={handleAddTransaction}
                  />

                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-3xl text-xs text-gray-600 dark:text-gray-400 space-y-2 shrink-0">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      <span>Arsip Pajak & Ekspor Mudah</span>
                    </h4>
                    <p className="leading-relaxed text-[11px]">
                      Gunakan tombol ekspor laporan di bagian kanan mutasi untuk langsung mengunduh spreadsheet mentah (CSV) atau dokumen audit (PDF) untuk Arsip Pribadi Anda secara instan.
                    </p>
                  </div>
                </div>

                {/* Right side: Filter & Mutasi Ledger Table */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 p-6 shadow-sm transition-all flex flex-col justify-between">
                  <div>
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-750">
                      <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span>Buku Mutasi Keuangan</span>
                          <span className="text-[10px] font-normal px-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">{filteredTransactions.length} baris</span>
                        </h2>
                        <p className="text-gray-405 dark:text-gray-400 text-xs mt-0.5">Saring transaksi yang tercatat lokal.</p>
                      </div>

                      {/* Export buttons */}
                      <div className="flex gap-2 self-start sm:self-center">
                        <button
                          onClick={() => exportToCSV(transactions)}
                          className="flex items-center gap-1 text-[11px] font-bold border border-gray-150 rounded-xl px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-650 dark:text-gray-300 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-gray-400" />
                          <span>CSV</span>
                        </button>
                        
                        <button
                          onClick={() => exportToPDF(transactions, categories)}
                          className="flex items-center gap-1 text-[11px] font-bold border border-gray-150 rounded-xl px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-650 dark:text-gray-300 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-400" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter controllers banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                      {/* Search */}
                      <div className="relative flex items-center">
                        <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari transaksi..."
                          className="w-full text-xs pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl focus:outline-none"
                        />
                      </div>

                      {/* Filter Type */}
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="p-2.5 text-xs bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl focus:outline-none text-gray-800 dark:text-gray-200"
                      >
                        <option value="all">Semua Tipe Aliran</option>
                        <option value="income">Pemasukan (In)</option>
                        <option value="expense">Pengeluaran (Out)</option>
                      </select>

                      {/* Filter Category */}
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="p-2.5 text-xs bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl focus:outline-none text-gray-800 dark:text-gray-200"
                      >
                        <option value="all">Semua Pos Kategori</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Mutasi Ledger list wrapper */}
                    <div className="space-y-2.5 max-h-[385px] overflow-y-auto pr-1">
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((tx) => (
                          <div
                            key={tx.id}
                            className={`p-3.5 rounded-2xl border transition-all hover:border-gray-250 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 flex items-center justify-between gap-4 ${
                              tx.synced
                                ? 'bg-transparent border-gray-100 dark:border-gray-80s0/80'
                                : 'bg-amber-50/10 border-amber-200/20 dark:bg-amber-955/5 dark:border-amber-950/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Flow type icon container */}
                              <div className={`p-2.5 rounded-xl shrink-0 ${
                                tx.type === 'income'
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                                  : 'bg-rose-50 text-rose-600 dark:bg-rose-955/20 dark:text-rose-400'
                              }`}>
                                {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                              </div>

                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tx.category}</span>
                                <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate mt-0.5 max-w-[160px] sm:max-w-[240px]" title={tx.note}>
                                  {tx.note || '(Tanpa Catatan)'}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[9px] font-mono text-gray-400">{formatDateIndo(tx.date)}</span>
                                  <span className="text-gray-300 dark:text-gray-700 text-[10px]">•</span>
                                  <span className="text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-550 dark:text-gray-400 px-1.5 py-0.5 rounded-md font-mono">{tx.bankName || 'Dompet Manual'}</span>
                                  {tx.synced ? (
                                    <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 font-bold uppercase tracking-wide">
                                      <Check className="w-2.5 h-2.5" /> Sheet synced
                                    </span>
                                  ) : (
                                    <span className="text-[9px] bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 font-bold uppercase tracking-wide">
                                      Pending Sync
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`font-mono text-xs font-bold shrink-0 ${
                                tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                              </span>

                              <button
                                onClick={() => handleDeleteTransaction(tx.id, tx.note, tx.amount, tx.type, tx.bankName)}
                                className="p-1 px-2.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-605 transition-colors cursor-pointer"
                                title="Hapus Mutasi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-20 text-center text-xs text-gray-400 flex flex-col items-center justify-center bg-gray-50/20 rounded-3xl border border-dashed border-gray-150">
                          <PlusCircle className="w-8 h-8 text-gray-200 dark:text-gray-700 animate-bounce mb-2" />
                          <p>Belum ada catatan mutasi.</p>
                          <p className="text-[10px] mt-1 text-gray-400">Silakan tambahkan data melalui pencatatan baru, impor bank, atau sinkronkan mutasi sandbox.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 2: Budgets Center allocations and target warnings */}
          {activeTab === 'budgets' && (
            <BudgetOverview
              categories={categories}
              setCategories={setCategories}
              transactions={transactions}
              notifications={notifications}
              setNotifications={setNotifications}
              addNotification={addNotification}
            />
          )}

          {/* Tab 3: Sheets Synchronization & Backups Dashboard */}
          {activeTab === 'sheets' && (
            <SpreadsheetSyncCard
              syncConfig={syncConfig}
              setSyncConfig={setSyncConfig}
              transactions={transactions}
              categories={categories}
              bankAccounts={bankAccounts}
              addNotification={addNotification}
              onSyncCompleted={handleSpreadsheetSyncComplete}
            />
          )}

          {/* Tab 4: Banking API synchronizations */}
          {activeTab === 'banking' && (
            <BankSyncManager
              accounts={bankAccounts}
              setAccounts={setBankAccounts}
              onImportTransactions={handleImportBankStatement}
              addNotification={addNotification}
            />
          )}

          {/* Tab 5: Settings Panel configs */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left side: Custom Category form */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 p-6 shadow-sm transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Tambah Kategori custom</h2>
                  </div>
                  <p className="text-gray-400 text-xs mb-4">Tambahkan segmen pos pengeluaran atau pemasukan baru agar struktur laporan finansial di spreadsheet teratur.</p>

                  <form onSubmit={handleRegisterCategory} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Nama Kategori</label>
                        <input
                          type="text"
                          required
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                          placeholder="e.g. Kos Kosan, Pulsa"
                          className="w-full p-3 text-xs bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Tipe Aliran</label>
                        <select
                          value={newCatType}
                          onChange={(e) => setNewCatType(e.target.value as any)}
                          className="w-full p-3 text-xs bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-850 rounded-xl focus:outline-none"
                        >
                          <option value="expense">Pengeluaran (Out)</option>
                          <option value="income">Pemasukan (In)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Limit Budget Anggaran Bulanan (Opsional)</label>
                        <input
                          type="text"
                          value={newCatBudget}
                          onChange={(e) => setNewCatBudget(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="e.g. 500000"
                          className="w-full p-3 text-xs bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Pilih Label Warna Kategori</label>
                        <div className="flex gap-2 items-center h-10 mt-1">
                          {['#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6'].map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setNewCatColor(col)}
                              className={`w-6.5 h-6.5 rounded-full relative cursor-pointer border ${
                                newCatColor === col ? 'border-gray-850 scale-110 shadow-sm' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: col }}
                            >
                              {newCatColor === col && (
                                <Check className="absolute inset-0 m-auto text-white w-3.5 h-3.5" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-bold p-3 rounded-2xl text-xs cursor-pointer shadow-md shadow-indigo-505/10"
                    >
                      Daftarkan Kategori Baru
                    </button>
                  </form>
                </div>
              </div>

              {/* Right side Settings: pin block, config parameters, resets */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 p-6 shadow-sm transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Pengaturan Keamanan & System</h2>
                  </div>
                  <p className="text-gray-405 text-xs mb-4">Ubah sandi pelindung (biometrik fallback) dan kontrol backup sandbox.</p>

                  <div className="space-y-4">
                    {/* Toggle biometrics protection */}
                    <div className="p-3.5 bg-gray-50/65 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between gap-4 text-xs font-semibold">
                      <div>
                        <h4>Proteksi Biometrik Sidik Jari</h4>
                        <p className="text-gray-400 text-[10px] font-normal leading-relaxed">Kunci paksa aplikasi saat dibuka pertama kali.</p>
                      </div>
                      <button
                        onClick={() => {
                          setSecurityConfig(prev => {
                            const updated = { ...prev, isBiometricEnabled: !prev.isBiometricEnabled };
                            addNotification(
                              'Keamanan Diperbarui',
                              updated.isBiometricEnabled ? 'Proteksi biometrik diaktifkan.' : 'Proteksi biometrik dinonaktifkan.',
                              'info'
                            );
                            return updated;
                          });
                        }}
                        className={`w-11 h-6 rounded-full p-0.5 transition-all outline-none cursor-pointer ${
                          securityConfig.isBiometricEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-all transform ${
                          securityConfig.isBiometricEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Change Pin passcode */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Ubah Pin Passcode Fallback (4-Digit)</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={securityConfig.passcode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setSecurityConfig(prev => ({ ...prev, passcode: val }));
                          if (val.length === 4) {
                            addNotification('Pin Keamanan Disimpan', 'PIN otentikasi baru berhasil disimpan secara lokal.', 'success');
                          }
                        }}
                        placeholder="e.g. 1234"
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-850 rounded-xl focus:outline-none text-xs font-mono text-center tracking-widest text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-750 space-y-2">
                      <button
                        onClick={handleResetSandbox}
                        className="w-full bg-rose-50 dark:bg-rose-955/10 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/20 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Reset Data Keuangan & Sandbox
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* --- Footer Signature --- */}
      <footer className="py-6 border-t border-gray-150/40 dark:border-gray-800 text-center text-[10px] text-gray-400 dark:text-gray-500">
        Arsip Keuangan CatatSaku PRO • Sinkronisasi Spreadsheet Google Cloud Run • Sandbox Keamanan Biometrik Aktif
      </footer>

    </div>
  );
}
export { App };
