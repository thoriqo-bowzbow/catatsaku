import React, { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Transaction, Category } from '../types';
import { formatRupiah, getMonthNameIndo } from '../data';
import { TrendingUp, PieChart as PieIcon, BarChart3, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface DashboardChartsProps {
  transactions: Transaction[];
  categories: Category[];
}

export default function DashboardCharts({ transactions, categories }: DashboardChartsProps) {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  
  // 1. Group transactions by month for trend analysis
  const getMonthlyTrendData = () => {
    const monthlyMap: { [key: string]: { monthName: string; income: number; expense: number; keySort: string } } = {};
    
    // Default current/recent months to guarantee they show even if no transactions exist
    const defaultMonths = ['2026-05', '2026-06'];
    defaultMonths.forEach(mKey => {
      const parts = mKey.split('-');
      const monthIndex = parseInt(parts[1]) - 1;
      monthlyMap[mKey] = {
        monthName: `${getMonthNameIndo(monthIndex)} ${parts[0]}`,
        income: 0,
        expense: 0,
        keySort: mKey
      };
    });

    transactions.forEach(tx => {
      if (!tx.date) return;
      const mKey = tx.date.slice(0, 7); // "YYYY-MM"
      const parts = mKey.split('-');
      if (parts.length < 2) return;
      const monthIndex = parseInt(parts[1]) - 1;
      
      if (!monthlyMap[mKey]) {
        monthlyMap[mKey] = {
          monthName: `${getMonthNameIndo(monthIndex)} ${parts[0]}`,
          income: 0,
          expense: 0,
          keySort: mKey
        };
      }
      
      const amt = tx.amount;
      if (tx.type === 'income') {
        monthlyMap[mKey].income += amt;
      } else {
        monthlyMap[mKey].expense += amt;
      }
    });

    return Object.values(monthlyMap).sort((a, b) => a.keySort.localeCompare(b.keySort));
  };

  // 2. Group expenses by category for current month (Juni 2026 by default or overall if empty)
  const getCategoryShareData = () => {
    const currentMonthKey = '2026-06';
    const expenseTx = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthKey));
    
    // If no transactions in June, fallback to any expense
    const targetTx = expenseTx.length > 0 ? expenseTx : transactions.filter(t => t.type === 'expense');

    const catMap: { [key: string]: number } = {};
    targetTx.forEach(tx => {
      catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
    });

    return Object.keys(catMap).map(catName => {
      const matchCat = categories.find(c => c.name === catName);
      return {
        name: catName,
        value: catMap[catName],
        color: matchCat?.color || '#3B82F6'
      };
    }).sort((a, b) => b.value - a.value);
  };

  const monthlyTrendData = getMonthlyTrendData();
  const categoryShareData = getCategoryShareData();

  // Stats for the current active month (Juni 2026)
  const activeJuneTx = transactions.filter(t => t.date.startsWith('2026-06'));
  const juneIncome = activeJuneTx.filter(t => t.type === 'income').reduce((sum, x) => sum + x.amount, 0);
  const juneExpense = activeJuneTx.filter(t => t.type === 'expense').reduce((sum, x) => sum + x.amount, 0);
  const savingRate = juneIncome > 0 ? Math.round(((juneIncome - juneExpense) / juneIncome) * 100) : 0;

  // Custom tooltips
  const CustomTooltipTrend = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-[#0a0a0a]/95 border border-gray-150 dark:border-white/10 p-4 rounded-2xl shadow-xl backdrop-blur-sm text-xs space-y-1.5 selection:bg-emerald-500/30">
          <p className="font-black text-gray-950 dark:text-white mb-1 uppercase tracking-wider">{payload[0].payload.monthName}</p>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Pemasukan: <strong className="font-mono font-bold">{formatRupiah(payload[0].value)}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-rose-650 dark:text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Pengeluaran: <strong className="font-mono font-bold">{formatRupiah(payload[1].value)}</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipPie = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-[#0a0a0a]/95 border border-gray-150 dark:border-white/10 p-3.5 rounded-2xl shadow-xl backdrop-blur-md text-xs">
          <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: payload[0].payload.color }} />
            <span>{payload[0].name}</span>
          </p>
          <p className="font-semibold text-gray-600 dark:text-gray-400 mt-1.5">
            Total Pengeluaran: <strong className="font-mono text-gray-900 dark:text-white">{formatRupiah(payload[0].value)}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      
      {/* 1. Monthly flow trend (Pemasukan vs Pengeluaran) */}
      <div className="lg:col-span-2 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm transition-all flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                <h2 className="text-sm font-black uppercase text-gray-950 dark:text-white tracking-[0.2em]">Tren Ringkasan Bulanan</h2>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">Analisis arus uang masuk (pemasukan) dan uang keluar (pengeluaran) berjalan.</p>
            </div>

            {/* Chart Type Controller */}
            <div className="flex bg-gray-50 dark:bg-white/5 p-1 rounded-xl text-[10px] font-extrabold uppercase tracking-widest self-start border dark:border-white/5">
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartType === 'area' ? 'bg-white dark:bg-white/10 border dark:border-white/5 text-emerald-600 dark:text-emerald-400 shadow-xs font-black' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Garis Area
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  chartType === 'bar' ? 'bg-white dark:bg-white/10 border dark:border-white/5 text-emerald-600 dark:text-emerald-400 shadow-xs font-black' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                Batang (Bar)
              </button>
            </div>
          </div>
        </div>

        <div className="w-full h-[230px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" strokeOpacity={0.15} />
                <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip content={<CustomTooltipTrend />} />
                <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            ) : (
              <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" strokeOpacity={0.15} />
                <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip content={<CustomTooltipTrend />} />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                <Bar dataKey="income" name="Pemasukan" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={30} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Expenses Categorization Share */}
      <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 p-6 shadow-sm transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PieIcon className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-black uppercase text-gray-950 dark:text-white tracking-[0.2em]">Persentase Pengeluaran</h2>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Distribusi pemakaian dana bulan <strong>Juni 2026</strong> berdasarkan pos pengeluaran terdaftar.
          </p>
        </div>

        {categoryShareData.length > 0 ? (
          <div className="flex flex-col items-center justify-center">
            <div className="w-full h-[160px] relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltipPie />} />
                  <Pie
                    data={categoryShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute text-center">
                <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-widest">Rasio Hemat</span>
                <span className={`text-xl font-extrabold ${savingRate >= 20 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {savingRate}%
                </span>
              </div>
            </div>

            {/* Custom Small Legend */}
            <div className="w-full mt-3 grid grid-cols-2 gap-x-3 gap-y-2 max-h-[90px] overflow-y-auto pr-1">
              {categoryShareData.slice(0, 4).map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px] truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600 dark:text-gray-400 truncate flex-grow text-left">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center flex-grow text-xs text-gray-400">
            <CircleIndicator />
            <p className="mt-2">Belum ada mutasi keluar bulan ini untuk dianalisa grafik.</p>
          </div>
        )}
      </div>

    </div>
  );
}

function CircleIndicator() {
  return (
    <div className="w-12 h-12 rounded-full border-4 border-dashed border-gray-150 dark:border-gray-700 animate-spin" />
  );
}
export { DashboardCharts };
