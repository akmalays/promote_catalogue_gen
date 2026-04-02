import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, TrendingUp, ShoppingBag, CreditCard, 
  Banknote, Search, ArrowRight, Printer, Download,
  Filter, ChevronRight, Package, Clock, DollarSign, X, Receipt, CheckCircle2, FileText
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
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [posSettings, setPosSettings] = useState({
    storeName: 'LILY MART',
    slogan: 'Layanan Terbaik dari Kami',
    address: 'GROGOL, KEDIRI - JAWA TIMUR',
    phone: '0812-3456-7890'
  });

  useEffect(() => {
    const saved = localStorage.getItem('pos_branding_settings');
    if (saved) setPosSettings(JSON.parse(saved));
    fetchSales();
  }, []);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, searchQuery, filterMethod]);

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

  const DAILY_TARGET = 5000000;
  const ITEM_TARGET = 50;

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total_amount, 0);
    const totalTransactions = filteredSales.length;
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    const cashRevenue = filteredSales.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + s.total_amount, 0);
    const digitalRevenue = totalRevenue - cashRevenue;
    const targetProgress = Math.min((totalRevenue / DAILY_TARGET) * 100, 100);

    // Calculate Focus Item Progress
    const itemSales: Record<string, number> = {};
    filteredSales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const name = item.name || 'Produk';
        itemSales[name] = (itemSales[name] || 0) + (item.qty || item.quantity || 0);
      });
    });

    const focusItems = [
      { name: 'Aqua 600ml (Isi 24)', sold: itemSales['Aqua 600ml (Isi 24)'] || 0 },
      { name: 'Minyak Kita 1L', sold: itemSales['Minyak Kita 1L'] || 0 },
      { name: 'Beras Premium 5kg', sold: itemSales['Beras Premium 5kg'] || 0 }
    ].map(item => ({
      ...item,
      progress: Math.min((item.sold / ITEM_TARGET) * 100, 100)
    }));

    return { totalRevenue, totalTransactions, avgTransaction, cashRevenue, digitalRevenue, targetProgress, focusItems };
  }, [filteredSales]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage]);

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-50 overflow-hidden relative">
      {/* Daily Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsReportModalOpen(false)}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm no-print"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
               {/* Modal Header */}
               <div className="p-8 border-b border-slate-50 flex items-center justify-between no-print">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                        <FileText className="w-6 h-6" />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Rekap Harian</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(selectedDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setIsReportModalOpen(false)}
                    className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400"
                  >
                     <X className="w-6 h-6" />
                  </button>
               </div>

               {/* Report Area for Printing */}
               <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white ReportPrintArea">
                  <div className="max-w-full mx-auto">
                     {/* Print-only Branding */}
                     <div className="hidden print-block text-center mb-10 pb-8 border-b-2 border-slate-900">
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-1">{posSettings.storeName}</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">LAPORAN PENJUALAN HARIAN - {new Date(selectedDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                     </div>

                     {/* Payment Breakdown */}
                     <div className="grid grid-cols-3 gap-6 mb-12">
                        {[
                           { label: 'Total Tunai', value: stats.cashRevenue, color: 'text-slate-900', bg: 'bg-white border-2 border-slate-900/5' },
                           { label: 'Total QRIS/Debit', value: stats.digitalRevenue, color: 'text-slate-900', bg: 'bg-white border-2 border-slate-900/5' },
                           { label: 'TOTAL OMZET', value: stats.totalRevenue, color: 'text-slate-900', bg: 'bg-slate-900' }
                        ].map((p, i) => (
                           <div key={i} className={cn("p-6 rounded-[32px]", p.bg)}>
                              <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", i === 2 ? "text-slate-300" : "text-slate-400")}>{p.label}</p>
                              <p className={cn("text-xl font-black tracking-tight", i === 2 ? "text-white" : "text-slate-900")}>Rp {p.value.toLocaleString()}</p>
                           </div>
                        ))}
                     </div>

                     {/* Itemized List */}
                     <div className="mb-12">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-[#8b7365]" /> Rincian Item Terjual
                        </h3>
                        <table className="w-full border-collapse">
                           <thead>
                              <tr className="border-b-2 border-slate-100">
                                 <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Nama Produk</th>
                                 <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                                 <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Harga Avg</th>
                                 <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Subtotal</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {/* Group sales by item name */}
                              {Object.entries(
                                 filteredSales.reduce((acc: any, sale: any) => {
                                    sale.items?.forEach((item: any) => {
                                       const name = item.name || 'Produk';
                                       if (!acc[name]) acc[name] = { qty: 0, price: item.price || 0 };
                                       acc[name].qty += (item.qty || item.quantity || 0);
                                    });
                                    return acc;
                                 }, {})
                              ).map(([name, data]: [string, any], i) => (
                                 <tr key={i}>
                                    <td className="py-4 text-sm font-black text-slate-700">{name}</td>
                                    <td className="py-4 text-sm font-bold text-slate-600 text-right">{data.qty}</td>
                                    <td className="py-4 text-sm font-bold text-slate-400 text-right">Rp {data.price.toLocaleString()}</td>
                                    <td className="py-4 text-sm font-black text-slate-900 text-right">Rp {(data.qty * data.price).toLocaleString()}</td>
                                 </tr>
                              ))}
                           </tbody>
                           <tfoot>
                              <tr className="border-t-2 border-slate-900">
                                 <td colSpan={3} className="py-6 text-sm font-black text-slate-900 uppercase">Total Keseluruhan</td>
                                 <td className="py-6 text-xl font-black text-slate-900 text-right">Rp {stats.totalRevenue.toLocaleString()}</td>
                              </tr>
                           </tfoot>
                        </table>
                     </div>

                     {/* Footer Disclaimer */}
                     <div className="text-center pt-12 opacity-30 italic">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dicetak otomatis oleh {posSettings.storeName} POS System</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Waktu Cetak: {new Date().toLocaleString('id-ID')}</p>
                     </div>
                  </div>
               </div>

               {/* Modal Footer */}
               <div className="p-8 border-t border-slate-50 flex gap-4 bg-slate-50/20 no-print">
                  <button 
                    onClick={() => {
                       const originalTitle = document.title;
                       document.title = `Laporan_Penjualan_${selectedDate}`;
                       window.print();
                       setTimeout(() => { document.title = originalTitle; }, 100);
                    }}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3"
                  >
                     <Printer className="w-5 h-5" /> Download PDF / Cetak
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
         @media print {
            body > * { visibility: hidden !important; }
            #receipt-root-portal, #receipt-root-portal *, 
            .ReportPrintArea, .ReportPrintArea * { visibility: visible !important; }
            
            .ReportPrintArea { 
               position: fixed !important; 
               left: 0 !important; 
               top: 0 !important; 
               width: 100% !important; 
               height: auto !important;
               padding: 40px !important;
               background: white !important;
               z-index: 10000 !important;
            }
            .no-print { display: none !important; }
            .print-block { display: block !important; }
            .shadow-sm, .shadow-2xl, .shadow-xl { box-shadow: none !important; }
            .rounded-[40px], .rounded-[32px], .rounded-3xl { border-radius: 0 !important; }
         }
      `}</style>

      {/* Header */}
      <div className="px-8 py-6 bg-transparent flex items-center justify-between z-10 no-print">
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
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#8b7365] text-white rounded-xl font-bold text-xs uppercase transition-all shadow-lg shadow-[#8b7365]/20 hover:bg-[#7a6458]"
          >
             <FileText className="w-4 h-4" /> Rekap Harian
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar no-print">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
           {[
             { label: 'Total Omzet', value: `Rp ${stats.totalRevenue.toLocaleString()}`, sub: 'Hari Ini', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', isTarget: true },
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
                <div className="flex justify-between items-start mb-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                   {stat.isTarget && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                         {stats.targetProgress.toFixed(1)}% Target
                      </span>
                   )}
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
                
                {stat.isTarget ? (
                   <div className="mt-3">
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${stats.targetProgress}%` }}
                           transition={{ duration: 1, ease: "easeOut" }}
                           className="h-full bg-emerald-500 rounded-full"
                         />
                      </div>
                      <p className="text-[9px] font-bold text-slate-300 mt-1.5 uppercase tracking-tighter">
                         Goal: Rp {DAILY_TARGET.toLocaleString()}
                      </p>
                   </div>
                ) : (
                   <p className="text-[10px] font-bold text-slate-400 mt-1">{stat.sub}</p>
                )}

                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                   <stat.icon className="w-24 h-24 -mr-8 -mt-8" />
                </div>
             </motion.div>
           ))}
        </div>

        {/* Focus Item Targets */}
        <div className="mb-12">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#8b7365]/10 rounded-xl flex items-center justify-center text-[#8b7365]">
                 <Package className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Target Penjualan Item Fokus</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.focusItems.map((item, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.4 + (i * 0.1) }}
                   className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden relative"
                 >
                    <div className="flex justify-between items-start mb-4">
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Item Fokus</p>
                          <h4 className="text-sm font-black text-slate-800 leading-tight">{item.name}</h4>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-black text-[#8b7365]">{item.sold} <span className="text-[10px] text-slate-400">/ {ITEM_TARGET}</span></p>
                          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter mt-0.5">TERJUAL</p>
                       </div>
                    </div>

                    <div className="relative pt-4">
                       <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${item.progress}%` }}
                             transition={{ duration: 1.5, ease: "circOut" }}
                             className="h-full bg-[#8b7365] rounded-full"
                          />
                       </div>
                       <div className="flex justify-between items-center mt-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                          <span className="text-[10px] font-black text-[#8b7365]">{item.progress.toFixed(0)}%</span>
                       </div>
                    </div>
                 </motion.div>
              ))}
           </div>
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
                      paginatedSales.map((sale) => (
                        <tr 
                          key={sale.id} 
                          onClick={() => setSelectedSale(sale)}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        >
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
              <div className="flex items-center gap-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Menampilkan {Math.min(filteredSales.length, itemsPerPage)} dari {filteredSales.length} Transaksi
                 </p>
                 {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                         disabled={currentPage === 1}
                         className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                       >
                          <ChevronRight className="w-4 h-4 rotate-180" />
                       </button>
                       <div className="flex items-center gap-1">
                          {[...Array(totalPages)].map((_, i) => (
                             <button
                               key={i}
                               onClick={() => setCurrentPage(i + 1)}
                               className={cn(
                                  "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                                  currentPage === i + 1 ? "bg-[#8b7365] text-white" : "bg-white border border-slate-200 text-slate-400 hover:bg-slate-50"
                               )}
                             >
                                {i + 1}
                             </button>
                          ))}
                       </div>
                       <button 
                         onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                         disabled={currentPage === totalPages}
                         className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
                       >
                          <ChevronRight className="w-4 h-4" />
                       </button>
                    </div>
                 )}
              </div>
              <div className="flex items-center gap-2">
                 <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Sale Detail Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div id="receipt-root-portal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedSale(null)}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm no-print"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
               {/* Modal Header (Floating Close) */}
               <div className="absolute top-4 right-4 z-20 no-print">
                  <button 
                    onClick={() => setSelectedSale(null)}
                    className="p-2 bg-white/80 backdrop-blur-md hover:bg-white rounded-xl transition-all shadow-lg shadow-black/5 text-slate-300 hover:text-slate-600 border border-slate-50"
                  >
                     <X className="w-5 h-5" />
                  </button>
               </div>

               {/* Modal Content - Compact Receipt Style */}
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white ReceiptArea">
                  <div className="max-w-full">
                     {/* Header */}
                     <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4 border-2 border-white shadow-lg shadow-emerald-500/5 no-print-visible">
                           <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-1 tracking-tighter uppercase">{posSettings.storeName}</h2>
                        <p className="text-[9px] font-bold text-slate-400 leading-tight uppercase tracking-widest">{posSettings.address}</p>
                        <p className="text-[9px] font-bold text-slate-400 leading-tight uppercase tracking-widest">TELP: {posSettings.phone}</p>
                     </div>

                     <div className="border-t border-slate-50 border-dashed my-5" />

                     {/* Transaction Info Area */}
                     <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
                           <span>No. Transaksi</span>
                           <span className="text-slate-400">#{selectedSale.id.toString().toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
                           <span>Waktu</span>
                           <span className="text-slate-400">{new Date(selectedSale.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })}, {new Date(selectedSale.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}</span>
                        </div>
                     </div>

                     <div className="border-t border-slate-50 border-dashed my-5" />

                     {/* Items List */}
                     <div className="space-y-4 mb-6">
                        {selectedSale.items?.map((item: any, idx: number) => (
                           <div key={idx} className="flex justify-between items-start group">
                              <div className="flex-1 pr-4">
                                 <p className="text-xs font-black text-slate-800 leading-tight mb-0.5">{item.name || 'Produk'}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.qty || item.quantity} X {(item.price || 0).toLocaleString()}</p>
                              </div>
                              <span className="text-xs font-black text-slate-800">{( (item.qty || item.quantity || 0) * (item.price || 0) ).toLocaleString()}</span>
                           </div>
                        ))}
                     </div>

                     <div className="border-t border-slate-50 border-dashed my-6" />

                     {/* Totals Section */}
                     <div className="space-y-2 mb-6">
                        <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <span>SUBTOTAL</span>
                           <span className="text-slate-500">{selectedSale.total_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-lg font-black text-slate-900 tracking-tighter uppercase">TOTAL</span>
                           <span className="text-2xl font-black text-slate-900 tracking-tighter">{selectedSale.total_amount.toLocaleString()}</span>
                        </div>
                     </div>

                     {/* Payment Footer */}
                     <div className="space-y-2 pt-5 border-t border-slate-50 mb-8">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                           <span>{selectedSale.payment_method === 'cash' ? 'TUNAI' : (selectedSale.payment_method || 'LAINNYA').toUpperCase()}</span>
                           <span className="text-slate-700">RP {(selectedSale.payment_amount || selectedSale.total_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                           <span>KEMBALI</span>
                           <span className="text-slate-700">RP {(selectedSale.change_amount || 0).toLocaleString()}</span>
                        </div>
                     </div>

                     {/* Footer Note */}
                     <div className="text-center pt-6 border-t border-dashed border-slate-50 opacity-50">
                        <p className="text-[9px] font-black text-slate-800 tracking-[0.15em] uppercase mb-1">{posSettings.slogan}</p>
                        <p className="text-[8px] font-bold text-slate-400 italic">Terima kasih atas kunjungan Anda</p>
                     </div>
                  </div>
               </div>

               {/* Modal Action Buttons */}
               <div className="p-6 border-t border-slate-50 flex gap-3 bg-slate-50/50 no-print">
                  <button 
                    onClick={() => window.print()}
                    className="flex-1 py-3 bg-white border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase text-slate-500 hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                     <Printer className="w-4 h-4" /> Cetak
                  </button>
                  <button 
                    onClick={() => setSelectedSale(null)}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                  >
                     Tutup
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
