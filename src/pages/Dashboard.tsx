import React, { useState, useEffect } from 'react';
import { BookOpen, Megaphone, ArrowRight, Book, Activity, AlertTriangle, Users, TrendingUp, Layout, Send, UserPlus, Package, LayoutDashboard, ShoppingCart, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

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
      const stats = await api.getDashboardStats();
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
    const hours = Math.floor(diff/60);
    if (hours < 24) return `${hours} jam lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  if (isLoading || !data) {
    return (
      <div className="flex-1 min-h-[80vh] bg-slate-50 flex items-center justify-center p-12">
         <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="flex flex-col items-center gap-5 text-center"
         >
            <div className="relative">
               <div className="w-16 h-16 border-4 border-[#8b7365]/10 border-t-[#8b7365] rounded-full animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-[#8b7365] rounded-full animate-pulse" />
               </div>
            </div>
            <div className="space-y-1">
               <p className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">SINKRONISASI DATA</p>
               <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">MOHON TUNGGU SEBENTAR...</p>
            </div>
         </motion.div>
      </div>
    );
  }

  const { metrics, charts, recentSales } = data;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      {/* Greeting & System Status */}
      <div className="mb-10 flex items-center justify-between px-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] shadow-sm">
               <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
               <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Dashboard</h1>
               <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none">Pantau performa bisnis hari ini</p>
            </div>
          </div>
        </div>
        <div className="hidden lg:block text-right">
           <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="text-right">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Server</p>
                 <p className="text-xs font-bold text-slate-700">Terhubung & Aman</p>
              </div>
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
           </div>
        </div>
      </div>

      {/* Greeting User */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-8 px-2"
      >
        <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Halo, {userProfile.nickname || 'User'}!</h2>
      </motion.div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
         {[
           { label: 'Omzet Hari Ini', value: `Rp ${metrics.todayRevenue.toLocaleString()}`, sub: 'Total penjualan hari ini', icon: <TrendingUp className="w-5 h-5" />, color: 'bg-[#8b7365]', shadow: 'shadow-[#8b7365]/20', id: 'sales' },
           { label: 'Total Pelanggan', value: metrics.totalCustomers, sub: 'Kontak tersimpan', icon: <Users className="w-5 h-5" />, color: 'bg-amber-500', shadow: 'shadow-amber-500/20', id: 'customers' },
           { label: 'Stok Menipis', value: `${metrics.lowStockCount} Item`, sub: `${metrics.outOfStockCount} Stok Habis`, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-rose-500', shadow: 'shadow-rose-500/20', id: 'products' },
           { label: 'Jangkauan Promo', value: metrics.totalReach.toLocaleString(), sub: 'Pesan sukses terkirim', icon: <Send className="w-5 h-5" />, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20', id: 'promotions' },
         ].map((m, i) => (
           <motion.div 
             key={i}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             onClick={() => onNavigate(m.id as any)}
             className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
           >
              <div className={cn("inline-flex w-12 h-12 rounded-2xl items-center justify-center text-white mb-6 shadow-lg", m.color, m.shadow)}>
                 {m.icon}
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-[#8b7365] transition-colors">{m.label}</p>
                 <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-2">{m.value}</h3>
                 <p className="text-[10px] font-bold text-slate-400">{m.sub}</p>
              </div>
           </motion.div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-8">
           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-full">
              <div className="flex items-center justify-between mb-10">
                 <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-2">Tren Omzet 7 Hari</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PERKEMBANGAN OMZET HARIAN TOKO</p>
                 </div>
                 <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                 </div>
              </div>

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.revenueTrend}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                      tickFormatter={(val) => `Rp${val/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        padding: '12px 16px'
                      }}
                      formatter={(val: number) => [`Rp ${val.toLocaleString()}`, 'Omzet']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#revenueGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Top Products */}
        <div className="lg:col-span-4">
           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-full">
              <div className="flex items-center justify-between mb-10">
                 <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-2">Paling Laris</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOP 5 ITEM TERBANYAK TERJUAL</p>
                 </div>
                 <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                    <Package className="w-5 h-5" />
                 </div>
              </div>

              <div className="space-y-6">
                 {charts.topProducts.map((p: any, i: number) => (
                    <div key={i} className="flex flex-col gap-2">
                       <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-700 truncate pr-4">{p.name}</p>
                          <p className="text-[10px] font-black text-[#8b7365] bg-[#8b7365]/10 px-2 py-0.5 rounded-md font-mono">{p.count} Pcs</p>
                       </div>
                       <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(p.count / charts.topProducts[0].count) * 100}%` }}
                            className="h-full bg-slate-800 rounded-full"
                          />
                       </div>
                    </div>
                 ))}
                 {charts.topProducts.length === 0 && (
                    <div className="py-20 text-center text-slate-300 italic text-xs">Belum ada data penjualan</div>
                 )}
              </div>

              <div className="mt-10 p-5 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Insight Bisnis</p>
                 <p className="text-[11px] text-slate-600 leading-relaxed font-bold">
                    Item di atas memberikan kontribusi volume terbesar. Fokuskan promo pada item ini untuk menjaga momentum!
                 </p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Recent Sales Feed */}
         <div className="lg:col-span-12">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Transaksi Terkini</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">LOG PENJUALAN POS TERAKHIR</p>
                  </div>
                  <button onClick={() => onNavigate('history')} className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#8b7365] transition-all border border-slate-100">
                     Lihat Selengkapnya
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentSales.map((sale: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-5 bg-white border border-slate-50 hover:border-[#8b7365]/30 hover:shadow-md rounded-3xl transition-all group">
                       <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[#8b7365] group-hover:bg-[#8b7365] group-hover:text-white transition-all shadow-inner">
                          <ShoppingCart className="w-5 h-5" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 tracking-tight truncate">{sale.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <p className="text-[10px] font-black text-[#8b7365] uppercase">{sale.payment}</p>
                             <div className="w-1 h-1 rounded-full bg-slate-200" />
                             <p className="text-[9px] font-bold text-slate-400">{getTimeAgo(sale.time)}</p>
                          </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  ))}
                  {recentSales.length === 0 && (
                     <div className="col-span-full py-20 text-center text-slate-300 border-2 border-dashed rounded-[32px]">
                        <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest">Belum ada transaksi hari ini</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
