import React, { useState } from 'react';
import { PlusCircle, Utensils, Car, ShoppingBag, Gamepad2, Receipt, HeartPulse, Briefcase, TrendingUp, Laptop, Gift, Landmark, Calendar, Banknote } from 'lucide-react';
import { Category, Transaction } from '../types';
import { DEFAULT_CATEGORIES } from '../data';

interface TransactionFormProps {
  categories: Category[];
  bankAccounts: Array<{ id: string; bankName: string; isConnected: boolean }>;
  onSubmit: (txData: {
    type: 'income' | 'expense';
    category: string;
    amount: number;
    note: string;
    date: string;
    bankName?: string;
  }) => void;
}

export default function TransactionForm({ categories, bankAccounts, onSubmit }: TransactionFormProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankName, setBankName] = useState<string>('');

  // Filter categories by type
  const filteredCategories = categories.filter(cat => cat.type === type);

  // Auto-set the first category of this type when type shifts
  React.useEffect(() => {
    if (filteredCategories.length > 0) {
      setCategory(filteredCategories[0].name);
    }
  }, [type, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Mohon masukkan nilai transaksi yang valid.');
      return;
    }
    if (!category) {
      alert('Pilih kategori transaksi.');
      return;
    }

    onSubmit({
      type,
      category,
      amount: parsedAmount,
      note: note.trim(),
      date,
      bankName: bankName || undefined
    });

    // Reset some form values
    setAmount('');
    setNote('');
    setBankName('');
  };

  // Human-formatted currency entry helper
  const handleAmountChange = (val: string) => {
    const cleanNumbers = val.replace(/[^0-9]/g, '');
    if (cleanNumbers) {
      setAmount(new Intl.NumberFormat('id-ID').format(parseInt(cleanNumbers)));
    } else {
      setAmount('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm transition-all selection:bg-emerald-500/30">
      <h2 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-emerald-500" />
        <span>Pencatatan Baru</span>
      </h2>

      {/* Expense/Income Toggle Switches */}
      <div className="grid grid-cols-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl mb-4 font-bold text-xs text-center border dark:border-white/5">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`py-2.5 rounded-xl transition-all cursor-pointer ${
            type === 'expense'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Pengeluaran (Out)
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`py-2.5 rounded-xl transition-all cursor-pointer ${
            type === 'income'
              ? 'bg-emerald-500 text-black font-black shadow-md shadow-emerald-500/25'
              : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Pemasukan (In)
        </button>
      </div>

      <div className="space-y-3.5">
        {/* Money Amount Entry */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 dark:text-white/45 uppercase tracking-[0.15em] block mb-1">Jumlah Uang (Rupiah)</label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-xs font-bold text-gray-405">Rp</span>
            <input
              type="text"
              required
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="e.g. 50.000"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#0a0a0a]/60 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-extrabold text-sm tracking-wide text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Category Chooser */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 dark:text-white/45 uppercase tracking-[0.15em] block mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0a]/60 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-gray-850 dark:text-gray-200"
            >
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 dark:text-white/45 uppercase tracking-[0.15em] block mb-1">Tanggal</label>
            <div className="relative flex items-center">
              <Calendar className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-gray-50 dark:bg-[#0a0a0a]/60 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-gray-850 dark:text-gray-200"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Description note */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 dark:text-white/45 uppercase tracking-[0.15em] block mb-1">Catatan / Keterangan</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Beli Makan siang ayam bakar"
              className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0a]/60 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-gray-850 dark:text-gray-200"
            />
          </div>

          {/* Banking / Method selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 dark:text-white/45 uppercase tracking-[0.15em] block mb-1">Metode / Rekening Sumber</label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0a]/60 border border-gray-100 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-gray-850 dark:text-gray-200"
            >
              <option value="">Dompet Tunai (Manual)</option>
              {bankAccounts.filter(b => b.isConnected).map(b => (
                <option key={b.id} value={b.bankName}>
                  Bank {b.bankName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className={`w-full font-black uppercase text-xs tracking-widest p-3.5 rounded-2xl text-white shadow-lg active:scale-98 transition-all cursor-pointer ${
            type === 'expense'
              ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/15'
              : 'bg-emerald-505 bg-emerald-500 hover:bg-emerald-600 text-black shadow-emerald-500/15'
          }`}
        >
          Simpan Transaksi {type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
        </button>
      </div>
    </form>
  );
}
export { TransactionForm };
