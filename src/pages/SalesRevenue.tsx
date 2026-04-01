import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, TrendingUp, ShoppingBag, CreditCard, 
  Banknote, Search, ArrowRight, Printer, Download,
  Filter, ChevronRight, Package, Clock, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface SaleItem {
  product_id: string;
  name: string;
  qty: number;
  price: number;
}

interface Sale {
  id: string | number;
  items: any[];
  total_amount: number;
  payment_amount: number;
  change_amount: number;
  payment_method: 'cash' | 'debit' | 'qris';
  payment_ref?: string;
  created_at: string;
}

export default function SalesRevenue() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'debit' | 'qris'>('all');

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSales();
      setSales(data);
    } catch (e) {
      toast.error('Gagal memuat data penjualan');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = new Date(s.created_at).toISOString().split('T')[0];
      const matchesDate = saleDate === selectedDate;
      const matchesSearch = s.id.toString().toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMethod = filterMethod === 'all' || s.payment_method === filterMethod;
      return matchesDate && matchesSearch && matchesMethod;
    });
  }, [sales, selectedDate, searchQuery, filterMethod]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total_amount, 0);
    const totalTransactions = filteredSales.length;
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    const cashRevenue = filteredSales.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + s.total_amount, 0);
    const digitalRevenue = totalRevenue - cashRevenue;

    return { totalRevenue, totalTransactions, avgTransaction, cashRevenue, digitalRevenue };
  }, [filteredSales]);

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-transparent flex items-center justify-between z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-[#8b7365]" />
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Sales Report</h1>
          </div>
          <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none">Pantau Performa Bisnis Real-time</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
             <input 
               type="date" 
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="bg-transparent border-none text-xs font-black text-slate-600 px-3 py-1.5 focus:ring-0 outline-none"
             />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#8b7365] text-white rounded-xl font-bold text-xs uppercase transition-all shadow-lg shadow-[#8b7365]/20 hover:bg-[#7a6458]">
             <Printer className="w-4 h-4" /> Cetak Laporan
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           {[
             { label: 'Total Omzet', value: `Rp ${stats.totalRevenue.toLocaleString()}`, sub: 'Hari Ini', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
             { label: 'Transaksi', value: stats.totalTransactions, sub: 'Pembelian Berhasil', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
             { label: 'Tunai / Cash', value: `Rp ${stats.cashRevenue.toLocaleString()}`, sub: 'Uang Fisik', icon: Banknote, color: 'text-amber-600', bg: 'bg-amber-50' },
             { label: 'QRIS / Debit', value: `Rp ${stats.digitalRevenue.toLocaleString()}`, sub: 'Uang Digital', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' }
           ].map((stat, i) => (
             <motion.div 
               key={i}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden group"
             >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", stat.bg)}>
                   <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{stat.sub}</p>
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                   <stat.icon className="w-24 h-24 -mr-8 -mt-8" />
                </div>
             </motion.div>
           ))}
        </div>

        {/* Filters & Table Section */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-8 border-b border-slate-50 flex flex-wrap items-center justify-between gap-6">
              <div className="relative w-full max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                 <input 
                   type="text" 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder="Cari ID Transaksi..."
                   className="w-full pl-11 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-300 focus:ring-2 focus:ring-[#8b7365]/10 transition-all"
                 />
              </div>

              <div className="flex items-center gap-3">
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                   {['all', 'cash', 'debit', 'qris'].map((m) => (
                     <button
                       key={m}
                       onClick={() => setFilterMethod(m as any)}
                       className={cn(
                         "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                         filterMethod === m ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                       )}
                     >
                       {m === 'all' ? 'Semua' : m}
                     </button>
                   ))}
                 </div>
                 <button className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all border border-slate-100">
                    <Filter className="w-4 h-4" />
                 </button>
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50/50">
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">ID Transaksi</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Waktu</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Metode</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 px-8 text-right">Total Item</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Total Transaksi</th>
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {[...Array(6)].map((_, j) => (
                            <td key={j} className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                          ))}
                        </tr>
                      ))
                    ) : filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center">
                           <div className="flex flex-col items-center justify-center opacity-20">
                              <ShoppingBag className="w-16 h-16 mb-4" />
                              <p className="text-sm font-black uppercase tracking-widest">Tidak ada penjualan di tanggal ini</p>
                           </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-8 py-6">
                              <span className="font-mono text-xs font-black text-slate-800">#{sale.id.toString().slice(-8).toUpperCase()}</span>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                 <Clock className="w-3 h-3 text-slate-300" />
                                 <span className="text-xs font-bold text-slate-600">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                 {sale.payment_method === 'cash' ? (
                                   <div className="w-6 h-6 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 border border-amber-100"><Banknote className="w-3.5 h-3.5" /></div>
                                 ) : (
                                   <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100">{sale.payment_method === 'qris' ? <QrCode className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}</div>
                                 )}
                                 <span className="text-[10px] font-black uppercase text-slate-700">{sale.payment_method === 'cash' ? 'Tunai' : sale.payment_method === 'qris' ? 'QRIS' : 'Debit'}</span>
                                 {sale.payment_ref && <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Ref: {sale.payment_ref}</span>}
                              </div>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <span className="text-xs font-black text-slate-600">{sale.items?.reduce((acc: number, item: any) => acc + (item.qty || item.quantity || 0), 0) || 0} unit</span>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <span className="text-sm font-black text-[#8b7365]">Rp {sale.total_amount.toLocaleString()}</span>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <button className="p-2 text-slate-400 hover:text-[#8b7365] hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                 <ChevronRight className="w-5 h-5" />
                              </button>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
           </div>

           <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Menampilkan {filteredSales.length} Transaksi</p>
              <div className="flex items-center gap-2">
                 <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function QrCode({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      <line x1="7" y1="7" x2="7" y2="7" /><line x1="17" y1="7" x2="17" y2="7" />
      <line x1="7" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="17" y2="17" />
    </svg>
  );
}
