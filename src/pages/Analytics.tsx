import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Calendar, BarChart3, 
  PieChart as PieIcon, ArrowUpRight, ArrowDownRight, 
  ChevronRight, Filter, Download, Activity, Target,
  CreditCard, DollarSign, Package
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, 
  PieChart, Pie
} from 'recharts';
import { motion } from 'motion/react';
import LoadingScreen from '../components/LoadingScreen';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

export default function Analytics() {
  const [sales, setSales] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSales();
      setSales(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = useMemo(() => {
    // Basic logic mapping sales to chart data based on range
    const grouped: Record<string, number> = {};
    const now = new Date();
    
    sales.forEach(sale => {
      const d = new Date(sale.created_at);
      let key = '';
      
      if (timeRange === 'daily') {
         // Show hours for today
         if (d.toDateString() === now.toDateString()) {
            key = `${d.getHours()}:00`;
            grouped[key] = (grouped[key] || 0) + sale.total_amount;
         }
      } else if (timeRange === 'weekly') {
         // Last 7 days
         key = d.toLocaleDateString('id-ID', { weekday: 'short' });
         grouped[key] = (grouped[key] || 0) + sale.total_amount;
      } else if (timeRange === 'monthly') {
         // This month by date
         key = d.getDate().toString();
         grouped[key] = (grouped[key] || 0) + sale.total_amount;
      } else {
         // Yearly by month
         key = d.toLocaleDateString('id-ID', { month: 'short' });
         grouped[key] = (grouped[key] || 0) + sale.total_amount;
      }
    });

    return Object.entries(grouped).map(([name, total]) => ({ name, total }));
  }, [sales, timeRange]);

  const stats = useMemo(() => {
    const total = sales.reduce((acc, s) => acc + s.total_amount, 0);
    const count = sales.length;
    
    // Comparison (Mocked logic for demo, real would compare prev periods)
    const prevMonthTotal = total * 0.85; // Mock
    const growth = ((total - prevMonthTotal) / prevMonthTotal) * 100;

    // Top Products (Aggregated)
    const items: Record<string, { qty: number, revenue: number }> = {};
    sales.forEach(s => {
      s.items?.forEach((it: any) => {
        const name = it.name || 'Produk';
        if (!items[name]) items[name] = { qty: 0, revenue: 0 };
        items[name].qty += (it.qty || it.quantity || 0);
        items[name].revenue += ((it.qty || it.quantity || 0) * (it.price || 0));
      });
    });

    const bestsellers = Object.entries(items)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return { total, count, growth, bestsellers };
  }, [sales]);

  const COLORS = ['#8b7365', '#a38b7d', '#bdab9f', '#d7ccc4', '#f1edea'];

  if (isLoading) return (
    <LoadingScreen 
      message="Menganalisis Laporan Omzet..."
      subMessage="Kami sedang menghitung statistik penjualan dan pertumbuhan bisnis Anda."
    />
  );

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-50 overflow-hidden relative">
      <div className="px-8 py-6 bg-transparent flex items-center justify-between z-10 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] shadow-sm shadow-[#8b7365]/10">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Revenue</h1>
            <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none">Laporan & Analisis Omzet</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm flex items-center">
             {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[12px] font-black transition-all",
                    timeRange === r ? "bg-[#8b7365] text-white shadow-lg shadow-[#8b7365]/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                   {r === 'daily' ? 'Hari' : r === 'weekly' ? 'Minggu' : r === 'monthly' ? 'Bulan' : 'Tahun'}
                </button>
             ))}
          </div>
          <button className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors shadow-sm">
             <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
         {/* Top KPI Grid */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group"
            >
               <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6" />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Penjualan</p>
               <div className="flex items-end gap-3 mb-2">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Rp {stats.total.toLocaleString()}</h3>
                  <div className="flex items-center gap-1 mb-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
                     <ArrowUpRight className="w-3 h-3" />
                     {stats.growth.toFixed(1)}%
                  </div>
               </div>
               <p className="text-[11px] font-bold text-slate-400 leading-none">Bulan ini dibanding bulan lalu</p>
               <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                  <DollarSign className="w-32 h-32 -mr-12 -mt-12" />
               </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.1 }}
               className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group"
            >
               <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                  <Activity className="w-6 h-6" />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume Transaksi</p>
               <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-2">{stats.count} <span className="text-lg text-slate-300">Order</span></h3>
               <p className="text-[11px] font-bold text-slate-400 leading-none">Total pesanan hari ini</p>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.2 }}
               className="bg-[#8b7365] p-8 rounded-[40px] shadow-lg shadow-[#8b7365]/10 relative overflow-hidden group"
            >
               <div className="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                  <Target className="w-6 h-6" />
               </div>
               <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Pencapaian Target</p>
               <h3 className="text-3xl font-black text-white tracking-tighter mb-2">92% <span className="text-lg text-white/40">Target</span></h3>
               <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-white rounded-full w-[92%]" />
               </div>
            </motion.div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Revenue Trend Chart */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col min-h-[400px]"
            >
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Tren Pendapatan</h3>
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-[#8b7365]" />
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue</span>
                  </div>
               </div>
               <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                        <defs>
                           <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b7365" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#8b7365" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                          dy={10} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                          tickFormatter={(v) => `Rp ${v/1000}k`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                          formatter={(v) => [`Rp ${v.toLocaleString()}`, 'Omzet']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#8b7365" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorTotal)" 
                        />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </motion.div>

            {/* Bestsellers Section (Produk Terlaris) */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col"
            >
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Produk Terlaris</h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Paling Banyak Dicari</p>
               </div>
               
               <div className="flex-1 space-y-6">
                  {stats.bestsellers.map((product, idx) => (
                     <div key={idx} className="flex items-center gap-4 group">
                        <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-[11px] font-black text-slate-300 group-hover:bg-[#8b7365] group-hover:text-white transition-colors">
                           #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-black text-slate-800 truncate">{product.name}</p>
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.qty} Unit Terjual</span>
                              <div className="h-1 w-1 rounded-full bg-slate-200" />
                              <span className="text-[10px] font-bold text-emerald-600">Rp {product.revenue.toLocaleString()}</span>
                           </div>
                        </div>
                        <div className="flex items-center justify-end text-right">
                           <div className="flex items-center gap-1 text-emerald-500">
                              <TrendingUp className="w-3 h-3" />
                              <span className="text-[10px] font-bold tracking-tight">Active</span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
               
               <button className="mt-8 py-4 w-full bg-slate-50 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                  Lihat Selengkapnya
               </button>
            </motion.div>
         </div>

         {/* Distribution Section */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5 }}
               className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100"
            >
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] mb-8">Distribusi Pembayaran</h3>
               <div className="flex items-center gap-8">
                  <div className="w-48 h-48">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                             data={[
                               { name: 'Tunai', value: 65 },
                               { name: 'Digital', value: 35 }
                             ]}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                           >
                             <Cell fill="#8b7365" />
                             <Cell fill="#f1f5f9" />
                           </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-4">
                     {[
                        { label: 'Uang Tunai', val: '65%', color: 'bg-[#8b7365]' },
                        { label: 'Digital (QRIS/Debit)', val: '35%', color: 'bg-slate-100' }
                     ].map((item, i) => (
                        <div key={i} className="flex flex-col gap-1">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <div className={cn("w-2 h-2 rounded-full", item.color)} />
                                 <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{item.label}</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{item.val}</span>
                           </div>
                           <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                              <div className={cn("h-full", item.color)} style={{ width: item.val }} />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.6 }}
               className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100"
            >
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] mb-8">Metrik Operasional</h3>
               <div className="grid grid-cols-2 gap-4">
                  {[
                     { label: 'Waktu Puncak', val: '14:00 - 16:00', icon: Calendar },
                     { label: 'Rerata Transaksi', val: 'Rp 145.000', icon: CreditCard },
                     { label: 'Loyalti Customer', val: '+12%', icon: TrendingUp },
                     { label: 'Efisiensi Stok', val: '88%', icon: Package }
                  ].map((m, i) => (
                     <div key={i} className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                        <p className="text-xs font-black text-slate-800 tracking-tight">{m.val}</p>
                     </div>
                  ))}
               </div>
            </motion.div>
         </div>
      </div>
    </div>
  );
}
