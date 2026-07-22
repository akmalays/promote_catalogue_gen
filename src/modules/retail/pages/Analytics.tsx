import React, { useMemo, useState, useEffect } from 'react';
import { TrendingUp, ArrowUpRight, CreditCard, DollarSign, Package, Calendar, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import LoadingScreen from '../../../components/LoadingScreen';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { UserProfile } from '../../../types';

export default function Analytics({ userProfile }: { userProfile: UserProfile }) {
  const [sales, setSales] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { setIsLoading(true); try { setSales(await api.getSales(userProfile.company_id!) || []); } catch {} finally { setIsLoading(false); } };

  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    const now = new Date();
    sales.forEach(sale => {
      const d = new Date(sale.created_at);
      let key = '';
      if (timeRange === 'daily') { if (d.toDateString() === now.toDateString()) { key = `${d.getHours()}:00`; grouped[key] = (grouped[key] || 0) + sale.total_amount; } }
      else if (timeRange === 'weekly') { key = d.toLocaleDateString('id-ID', { weekday: 'short' }); grouped[key] = (grouped[key] || 0) + sale.total_amount; }
      else if (timeRange === 'monthly') { key = d.getDate().toString(); grouped[key] = (grouped[key] || 0) + sale.total_amount; }
      else { key = d.toLocaleDateString('id-ID', { month: 'short' }); grouped[key] = (grouped[key] || 0) + sale.total_amount; }
    });
    return Object.entries(grouped).map(([name, total]) => ({ name, total }));
  }, [sales, timeRange]);

  const stats = useMemo(() => {
    const total = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const count = sales.length;
    let totalCost = 0;
    const prevMonthTotal = total * 0.85;
    const growth = prevMonthTotal > 0 ? ((total - prevMonthTotal) / prevMonthTotal) * 100 : 0;
    const items: Record<string, { qty: number, revenue: number }> = {};
    sales.forEach(s => {
      const saleItems = Array.isArray(s.items) ? s.items : (typeof s.items === 'string' ? JSON.parse(s.items) : []);
      saleItems.forEach((it: any) => {
        if (it.is_metadata) return;
        const qty = Number(it.qty || it.quantity || 0);
        const price = Number(it.price || 0);
        const cost = Number(it.cost_price || 0);
        totalCost += (qty * cost);
        const name = it.name || it.product_name || 'Produk';
        if (!items[name]) items[name] = { qty: 0, revenue: 0 };
        items[name].qty += qty;
        items[name].revenue += (qty * price);
      });
    });
    const bestsellers = Object.entries(items).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.qty - a.qty).slice(0, 5);
    return { total, totalProfit: total - totalCost, count, growth, bestsellers };
  }, [sales]);

  if (isLoading) return <LoadingScreen page="analytics" />;

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-stone-50 dark:bg-stone-950">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Revenue</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Laporan dan analisis omzet.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(r => (
              <button key={r} onClick={() => setTimeRange(r)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", timeRange === r ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200")}>
                {r === 'daily' ? 'Hari' : r === 'weekly' ? 'Minggu' : r === 'monthly' ? 'Bulan' : 'Tahun'}
              </button>
            ))}
          </div>
          <button className="p-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-4 h-4 text-stone-400 dark:text-stone-500" />
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />{stats.growth.toFixed(1)}%
            </div>
          </div>
          <p className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums">Rp {stats.total.toLocaleString()}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Total penjualan</p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <CreditCard className="w-4 h-4 text-stone-400 dark:text-stone-500" />
            <span className="text-xs text-stone-500 dark:text-stone-400">{stats.total > 0 ? ((stats.totalProfit / stats.total) * 100).toFixed(1) : 0}% margin</span>
          </div>
          <p className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums">Rp {stats.totalProfit.toLocaleString()}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Estimasi laba kotor</p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-4 h-4 text-stone-400 dark:text-stone-500" />
            <span className="text-xs text-stone-500 dark:text-stone-400">{stats.count} transaksi</span>
          </div>
          <p className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums">Rp {stats.count > 0 ? Math.round(stats.total / stats.count).toLocaleString() : 0}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Rata-rata per transaksi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">Tren Pendapatan</h3>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#57534e" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#57534e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-stone-100 dark:text-stone-800" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a8a29e' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a8a29e' }} tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} width={50} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', padding: '8px 12px', fontSize: '12px' }} formatter={(v: any) => [`Rp ${v.toLocaleString()}`, 'Omzet']} />
                <Area type="monotone" dataKey="total" stroke="#57534e" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bestsellers */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-1">Produk Terlaris</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">Top 5 item terjual</p>
          <div className="space-y-4">
            {stats.bestsellers.map((product, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-stone-100 dark:bg-stone-800 rounded-md flex items-center justify-center text-xs font-medium text-stone-500 dark:text-stone-400">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">{product.name}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{product.qty} unit · Rp {product.revenue.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {stats.bestsellers.length === 0 && <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">Belum ada data</p>}
          </div>
        </div>
      </div>

      {/* Distribution & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-6">Distribusi Pembayaran</h3>
          <div className="flex items-center gap-6">
            <div className="w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: 'Tunai', value: 65 }, { name: 'Digital', value: 35 }]} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={4} dataKey="value">
                    <Cell fill="#292524" /><Cell fill="#d6d3d1" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {[{ label: 'Tunai', val: '65%', color: 'bg-stone-900 dark:bg-stone-100' }, { label: 'Digital', val: '35%', color: 'bg-stone-300 dark:bg-stone-600' }].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", item.color)} />
                    <span className="text-sm text-stone-700 dark:text-stone-300">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-6">Metrik Operasional</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Waktu Puncak', val: '14:00–16:00', icon: Calendar },
              { label: 'Rerata Transaksi', val: `Rp ${stats.count > 0 ? Math.round(stats.total / stats.count).toLocaleString() : '0'}`, icon: CreditCard },
              { label: 'Pertumbuhan', val: `${stats.growth > 0 ? '+' : ''}${stats.growth.toFixed(1)}%`, icon: TrendingUp },
              { label: 'Total Produk', val: `${stats.bestsellers.length}+ item`, icon: Package }
            ].map((m, i) => (
              <div key={i} className="p-3 bg-stone-50 dark:bg-stone-800 rounded-lg">
                <m.icon className="w-4 h-4 text-stone-400 dark:text-stone-500 mb-2" />
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{m.val}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
