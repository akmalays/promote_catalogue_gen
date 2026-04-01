import React, { useState, useEffect } from 'react';
import { BookOpen, Megaphone, ArrowRight, Book, Activity, AlertTriangle, Users, TrendingUp, Layout, Send, UserPlus, Package } from 'lucide-react';
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
  const [contactsData, setContactsData] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  
  const [metrics, setMetrics] = useState({
    totalCatalogues: 0,
    totalReach: 0,
    totalProducts: 0,
    totalCustomers: 0,
    monthlyGrowth: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [visitors, logs, catalogues] = await Promise.all([
        api.getVisitors(),
        api.getBlastLogs(),
        api.getCatalogues()
      ]);

      // Process Metrics
      const reach = logs.reduce((acc: number, curr: any) => acc + (curr.recipient_count || 0), 0);
      let products = 0;
      catalogues.forEach((c: any) => {
        try {
          const data = typeof c.catalog_data === 'string' ? JSON.parse(c.catalog_data) : c.catalog_data;
          // Support both new row-based format and any potential old format
          const fromRows = data?.rows?.flatMap((r: any) => r.items || []).length || 0;
          const fromTop = data?.items?.length || 0;
          products += fromRows || fromTop;
        } catch(e) {}
      });

      const now = new Date();
      const thisMonthGrowth = visitors.filter((v: any) => {
        const d = new Date(v.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      setMetrics({
        totalCatalogues: catalogues.length,
        totalReach: reach,
        totalProducts: products,
        totalCustomers: visitors.length,
        monthlyGrowth: thisMonthGrowth
      });

      // Combine Recent Activities (Last 4 items)
      const combined = [
        ...catalogues.slice(0, 3).map(c => ({ type: 'catalogue', title: c.name, time: c.created_at, icon: <BookOpen className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-50' })),
        ...logs.slice(0, 3).map(l => ({ type: 'blast', title: l.promo_name, time: l.created_at, icon: <Send className="w-4 h-4 text-emerald-600" />, bg: 'bg-emerald-50' })),
        ...visitors.slice(0, 3).map(v => ({ type: 'customer', title: `Pelanggan: ${v.name}`, time: v.created_at, icon: <UserPlus className="w-4 h-4 text-amber-600" />, bg: 'bg-amber-50' }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 4);
      
      setRecentActivities(combined);

      // Process Weekly Contacts Addition (Last 7 Days)
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: d.toLocaleDateString('id-ID', { weekday: 'short' }),
          dateFull: d.toISOString().split('T')[0],
          count: 0
        };
      });

      visitors.forEach((v: any) => {
        const vDate = new Date(v.created_at).toISOString().split('T')[0];
        const dayMatch = last7Days.find(d => d.dateFull === vDate);
        if (dayMatch) dayMatch.count++;
      });
      setContactsData(last7Days);

      // Process Weekly Activity (Last 4 Weeks)
      const weeks = [...Array(4)].map((_, i) => ({
         name: `W${4 - i}`,
         count: 0
      }));

      const nowTime = now.getTime();
      logs.forEach((log: any) => {
        const logTime = new Date(log.created_at).getTime();
        const diffWeeks = Math.floor((nowTime - logTime) / (1000 * 60 * 60 * 24 * 7));
        if (diffWeeks >= 0 && diffWeeks < 4) {
          weeks[3 - diffWeeks].count++;
        }
      });
      setActivityData(weeks);

    } catch (e) {
      console.error('Gagal memuat dashboard:', e);
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

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      {/* Greeting */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Hi, {userProfile.nickname || 'User'}!</h1>
          <p className="text-slate-500 text-sm max-w-lg leading-relaxed font-medium">
            Control center MyStore Studio siap digunakan. Pantau performa bisnis Anda hari ini.
          </p>
        </div>
        <div className="hidden md:block text-right">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Sistem</p>
           <div className="flex items-center gap-2 justify-end">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-xs font-bold text-slate-600">Terhubung ke Cloud</span>
           </div>
        </div>
      </div>

      {/* Point 2: Quick Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
         {[
           { id: 'history', label: 'Total Galeri', value: metrics.totalCatalogues, sub: 'Katalog tersimpan', icon: <Layout className="w-4 h-4" />, color: 'bg-blue-600' },
           { id: 'activity', label: 'Jangkauan Promo', value: metrics.totalReach.toLocaleString(), sub: 'Pesan terkirim', icon: <Send className="w-4 h-4" />, color: 'bg-emerald-600' },
           { id: 'promotions', label: 'Pelanggan', value: metrics.totalCustomers, sub: 'Kontak aktif', icon: <Users className="w-4 h-4" />, color: 'bg-amber-600' },
           { id: 'products', label: 'Produk Terlibat', value: metrics.totalProducts, sub: 'Item unik', icon: <Package className="w-4 h-4" />, color: 'bg-slate-800' },
         ].map((m, i) => (
           <motion.div 
             key={i}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             onClick={() => onNavigate(m.id as any)}
             className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-[#8b7365]/30 transition-all cursor-pointer group"
           >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-110", m.color)}>
                 {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 group-hover:text-[#8b7365] transition-colors">{m.label}</p>
                 <div className="flex items-baseline gap-1.5">
                    <p className="text-xl font-black text-slate-800">{m.value}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{m.sub}</p>
                 </div>
              </div>
           </motion.div>
         ))}
      </div>

      {/* Main Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Catalogue Generator Card */}
        <div className="group relative rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all h-[200px] flex flex-col justify-end p-6 border border-slate-200">
          <div className="absolute inset-0 bg-[#e8e4db]">
            <div className="absolute right-0 bottom-0 top-0 w-2/3 opacity-30 bg-gradient-to-l from-black/20 to-transparent mix-blend-overlay"></div>
          </div>
          <div className="relative z-10 w-full md:w-4/5 text-slate-800">
            <span className="inline-block px-2 py-0.5 bg-black/5 rounded text-[10px] font-bold uppercase tracking-widest mb-2">Produksi Konten</span>
            <h2 className="text-2xl font-bold mb-1">Editor Katalog</h2>
            <p className="text-xs font-medium text-slate-600 mb-4 leading-relaxed">
              Ubah daftar produk menjadi brosur digital menawan.
            </p>
            <button
              onClick={() => onNavigate('catalogue')}
              className="bg-[#8b7365] text-white px-5 py-2.5 rounded-xl hover:bg-[#725e52] transition-colors text-sm flex items-center gap-2 font-bold shadow-lg shadow-[#8b7365]/20"
            >
              Buka Editor
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Promotions/Banner Card */}
        <div className="group relative rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all h-[200px] flex flex-col justify-end p-6 border border-slate-200">
          <div className="absolute inset-0 bg-[#d9c5ba]">
            <div className="absolute right-0 bottom-0 top-0 w-2/3 opacity-30 bg-gradient-to-l from-black/20 to-transparent mix-blend-overlay"></div>
          </div>
          <div className="relative z-10 w-full md:w-4/5 text-slate-800">
            <span className="inline-block px-2 py-0.5 bg-black/5 rounded text-[10px] font-bold uppercase tracking-widest mb-2">Distribusi Promo</span>
            <h2 className="text-2xl font-bold mb-1">WhatsApp Blast</h2>
            <p className="text-xs font-medium text-slate-700 mb-4 leading-relaxed">
              Siarkan promosi pintar secara massal ke pelanggan.
            </p>
            <button
              onClick={() => onNavigate('promotions')}
              className="bg-[#8b7365] text-white px-5 py-2.5 rounded-xl hover:bg-[#725e52] transition-colors text-sm flex items-center gap-2 font-bold shadow-lg shadow-[#8b7365]/20 w-fit"
            >
              Mulai Blast
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Charts column */}
        <div className="lg:col-span-8 flex flex-col gap-8">
           {/* Contact Acquisition Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                  <h3 className="font-black text-slate-800 text-lg">Pertumbuhan Pelanggan</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">7 Hari Terakhir</p>
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Bulan Ini</p>
                    <p className="text-lg font-black text-slate-800">+{metrics.monthlyGrowth}</p>
                 </div>
                 <div className="bg-emerald-50 p-3 rounded-2xl">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                 </div>
              </div>
            </div>
            
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={contactsData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    name="Kontak Baru"
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Log Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                  <h3 className="font-black text-slate-800 text-lg">Aktivitas Blast</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Intensitas Mingguan</p>
              </div>
              <div className="bg-[#f0ece9] p-3 rounded-2xl">
                  <Activity className="w-5 h-5 text-[#8b7365]" />
              </div>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" name="Sesi Blast" radius={[6, 6, 0, 0]}>
                    {activityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === activityData.length - 1 ? '#8b7365' : '#d9c5ba'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Point 3: Mini Activity Feed */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                 <h3 className="font-black text-slate-800">Aktivitas Terbaru</h3>
                 <button onClick={() => onNavigate('history')} className="text-[10px] font-black text-[#8b7365] tracking-widest uppercase hover:underline">Semua</button>
              </div>

              <div className="flex-1 divide-y divide-slate-50">
                 {recentActivities.length === 0 ? (
                   <div className="p-12 text-center">
                      <p className="text-xs text-slate-400 font-medium">Belum ada aktivitas.</p>
                   </div>
                 ) : (
                   recentActivities.map((act, i) => (
                     <div key={i} className="p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors cursor-default group">
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform", act.bg)}>
                           {act.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                             {act.type === 'catalogue' ? 'Katalog Baru' : act.type === 'blast' ? 'Blast Terkirim' : 'Pelanggan Baru'}
                           </p>
                           <p className="text-sm font-bold text-slate-800 truncate mb-1">{act.title}</p>
                           <p className="text-[10px] font-medium text-slate-400">{getTimeAgo(act.time)}</p>
                        </div>
                     </div>
                   ))
                 )}
              </div>

              <div className="p-6 bg-slate-50/50 mt-auto">
                 <div className="bg-white rounded-2xl p-4 border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Insight Cepat</p>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                       Kamu memiliki <span className="text-emerald-600 font-bold">{metrics.monthlyGrowth} pelanggan baru</span> bulan ini. Luar biasa!
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
