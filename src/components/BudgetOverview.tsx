import React, { useState } from 'react';
import { Target, AlertTriangle, AlertCircle, Pencil, Check, X, Bell, BellOff, Info } from 'lucide-react';
import { Category, Transaction, NotificationLog } from '../types';
import { formatRupiah } from '../data';

interface BudgetOverviewProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  transactions: Transaction[];
  notifications: NotificationLog[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationLog[]>>;
  addNotification: (title: string, message: string, type: 'info' | 'warning' | 'success') => void;
}

export default function BudgetOverview({
  categories,
  setCategories,
  transactions,
  notifications,
  setNotifications,
  addNotification
}: BudgetOverviewProps) {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingBudgetVal, setEditingBudgetVal] = useState<string>('');

  // Calculate actual current month (Juni 2026) spending per category
  const getCategorySpending = (catName: string) => {
    return transactions
      .filter(t => t.type === 'expense' && t.category === catName && t.date.startsWith('2026-06'))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleEditBudgetClick = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingBudgetVal(cat.budget ? cat.budget.toString() : '');
  };

  const handleSaveBudget = (catId: string) => {
    const val = parseInt(editingBudgetVal.replace(/[^0-9]/g, ''));
    if (isNaN(val) || val < 0) {
      alert('Harap masukkan batas anggaran yang valid.');
      return;
    }

    setCategories(prev => prev.map(c => {
      if (c.id === catId) {
        const updatedCat = { ...c, budget: val === 0 ? null : val };
        addNotification(
          'Batas Anggaran Diperbarui',
          `Target anggaran untuk kategori ${c.name} kini dipatok pada ${formatRupiah(val)}.`,
          'info'
        );
        return updatedCat;
      }
      return c;
    }));

    setEditingCatId(null);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 selection:bg-emerald-500 selection:text-black">
      
      {/* 1. Category Budget Progress Limit bars */}
      <div className="lg:col-span-2 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-black uppercase text-gray-950 dark:text-white tracking-[0.2em]">Alokasi Anggaran Pengeluaran</h2>
          </div>
          <p className="text-gray-400 text-xs mb-4">Disiplin anggaran bulanan. Pantau sisa dana berjalan untuk mengendalikan defisit keuangan.</p>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {categories.filter(c => c.type === 'expense').map(cat => {
              const spent = getCategorySpending(cat.name);
              const budget = cat.budget || 0;
              const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
              
              const isOver = budget > 0 && spent > budget;
              const isWarning = budget > 0 && !isOver && percent >= 80;

              return (
                <div key={cat.id} className="p-3.5 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-extrabold text-gray-950 dark:text-white text-xs uppercase tracking-dark">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingCatId === cat.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingBudgetVal}
                            onChange={(e) => setEditingBudgetVal(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Rp Limit"
                            className="w-20 p-1 text-xs text-right bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-white/10 outline-none rounded-md text-gray-950 dark:text-white"
                          />
                          <button onClick={() => handleSaveBudget(cat.id)} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded cursor-pointer">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCatId(null)} className="p-1 text-gray-405 hover:bg-gray-100 dark:hover:bg-white/5 rounded cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="font-bold text-gray-700 dark:text-white">
                            {formatRupiah(spent)} / {budget > 0 ? formatRupiah(budget) : 'Unset'}
                          </span>
                          <button
                            onClick={() => handleEditBudgetClick(cat)}
                            className="p-1 text-gray-400 hover:text-emerald-500 rounded transition-colors cursor-pointer"
                            title="Atur Budget"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Budget warning badge alerts */}
                  {budget > 0 && (
                    <div className="space-y-1.5">
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span>Pemakaian: {percent}%</span>
                        {isOver ? (
                          <span className="text-rose-500 font-semibold flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" /> Anggaran Overlimit!
                          </span>
                        ) : isWarning ? (
                          <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Mendekati batas!
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-semibold">Garis Aman</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Notification Center Log panel */}
      <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              <h2 className="text-sm font-black uppercase text-gray-950 dark:text-white tracking-[0.15em]">Pusat Notifikasi Real-time</h2>
            </div>
            {notifications.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer"
                >
                  Semua Dibaca
                </button>
                <span className="text-gray-200">|</span>
                <button
                  onClick={handleClearNotifications}
                  className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                >
                  Bersihkan
                </button>
              </div>
            )}
          </div>
          
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-2xl border transition-all text-xs relative ${
                    n.read
                      ? 'bg-transparent border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-400'
                      : 'bg-emerald-500/5 dark:bg-emerald-500/5 border-emerald-500/10 text-gray-900 dark:text-white font-extrabold'
                  }`}
                >
                  {/* Unread circle mark */}
                  {!n.read && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-emerald-500" />
                  )}

                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0">
                      {n.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-rose-500" /> :
                       n.type === 'success' ? <Check className="w-4 h-4 text-emerald-500" /> :
                       <Info className="w-4 h-4 text-emerald-500" />}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wide">{n.title}</h4>
                      <p className="text-gray-400 text-[10px] mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[9px] text-gray-300 dark:text-gray-500 block mt-1.5 font-mono">{n.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-14 text-center text-xs text-gray-400 flex flex-col items-center justify-center">
                <BellOff className="w-8 h-8 text-gray-200 dark:text-gray-700 animate-pulse mb-2" />
                <p>Kotak masuk Anda kosong.</p>
                <p className="text-[10px] mt-1 text-gray-350">Alert harian dan anggaran akan muncul di sini.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl text-[10px] leading-relaxed text-gray-500 dark:text-white/40 mt-4 border dark:border-white/5">
          💡 <strong>Tip Peringatan:</strong> Sistem akan mengirim pemberitahuan instan jika rasio pengeluaran melampaui 85% dari kuota limit bulanan Anda.
        </div>
      </div>

    </div>
  );
}
export { BudgetOverview };
