import React, { useState, useEffect } from 'react';
import { AlertTriangle, Users, TrendingUp, Send, ShoppingCart, ArrowUpRight } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import LoadingScreen from '../../../components/LoadingScreen';
import { UserProfile } from '../../../types';

interface DashboardProps {
  onNavigate: (page: any) => void;
  userProfile: UserProfile;
}

export default function Dashboard({ onNavigate, userProfile }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const stats = await api.getDashboardStats(userProfile.company_id!);
      setData(stats);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Math.floor((new Date().getTime() - d.getTime()) / 60000);
    if (diff < 1) return 'Baru saja';
    if (diff < 60) return `${diff} mnt lalu`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  if (isLoading || !data) {
    return (
      <LoadingScreen 
        page="dashboard"
        message={`Halo, ${userProfile.nickname || 'User'}`}
      />
    );
  }

  const { metrics, charts, recentSales } = data;

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Halo, {userProfile.nickname || 'User'}
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Ringkasan performa bisnis hari ini.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Omzet Hari Ini', value: `Rp ${metrics.todayRevenue.toLocaleString()}`, sub: 'Total penjualan', icon: <TrendingUp className="w-4 h-4" />, page: 'revenue' },
          { label: 'Total Pelanggan', value: metrics.totalCustomers, sub: 'Kontak tersimpan', icon: <Users className="w-4 h-4" />, page: 'promotions' },
          { label: 'Stok Menipis', value: `${metrics.lowStockCount} item`, sub: `${metrics.outOfStockCount} habis`, icon: <AlertTriangle className="w-4 h-4" />, page: 'products' },
          { label: 'Jangkauan Promo', value: metrics.totalReach.toLocaleString(), sub: 'Pesan terkirim', icon: <Send className="w-4 h-4" />, page: 'promotions' },
        ].map((m, i) => (
          <button
            key={i}
            onClick={() => onNavigate(m.page)}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 text-left hover:border-stone-300 dark:hover:border-stone-700 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-stone-400 dark:text-stone-500">{m.icon}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-semibold text-stone-900 dark:text-stone-100 mb-1">{m.value}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">{m.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">Tren Omzet 7 Hari</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Perkembangan omzet harian</p>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.revenueTrend}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-stone-100 dark:text-stone-800" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#a8a29e' }}
                  dy={8}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#a8a29e' }}
                  tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val}
                  width={50}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e7e5e4', 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    padding: '8px 12px',
                    fontSize: '12px'
                  }}
                  formatter={(val: number) => [`Rp ${val.toLocaleString()}`, 'Omzet']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#revenueGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
          <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-1">Produk Terlaris</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">Top 5 item terjual</p>

          <div className="space-y-4">
            {charts.topProducts.map((p: any, i: number) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-stone-700 dark:text-stone-300 truncate pr-3">{p.name}</p>
                  <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums shrink-0">{p.count}</span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-stone-900 dark:bg-stone-100 rounded-full transition-all duration-500"
                    style={{ width: `${(p.count / (charts.topProducts[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {charts.topProducts.length === 0 && (
              <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">Belum ada data penjualan</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">Transaksi Terkini</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Penjualan POS terakhir</p>
          </div>
          <button 
            onClick={() => onNavigate('revenue')} 
            className="text-xs font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors"
          >
            Lihat semua →
          </button>
        </div>

        {recentSales.length > 0 ? (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {recentSales.map((sale: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-500 dark:text-stone-400 shrink-0">
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-800 dark:text-stone-200 truncate">{sale.title}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">{sale.payment} · {getTimeAgo(sale.time)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-10">Belum ada transaksi hari ini</p>
        )}
      </div>
    </div>
  );
}
