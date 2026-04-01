import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Search, Plus, User, Calendar, Package, ArrowRight, History, CheckCircle2, AlertCircle, X, Trash2, Camera, Building2, FileText, ShoppingCart, ChevronDown, ChevronRight, Filter, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  plu: string;
  name: string;
  brand: string;
  stock: number;
  unit: string;
  image_url: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface SupplyLog {
  id: string;
  product_id: string;
  product_name: string;
  brand: string;
  plu: string;
  quantity: number;
  salesman: string;
  supplier: string;
  invoice_image?: string;
  created_at: string;
  unit: string;
}

export default function Supply() {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<SupplyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transaction State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplier, setSupplier] = useState('');
  const [salesman, setSalesman] = useState('');
  const [invoiceImage, setInvoiceImage] = useState<string | null>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // History UI State
  const [expandedSuppliers, setExpandedSuppliers] = useState<string[]>([]);
  const [isFullHistoryOpen, setIsFullHistoryOpen] = useState(false);
  const [fullHistoryFilter, setFullHistoryFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [fullHistorySearch, setFullHistorySearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [viewingInvoice, setViewingInvoice] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [prodData, histData] = await Promise.all([
        api.getProducts(),
        api.getSupplyHistory()
      ]);
      setProducts(prodData);
      setHistory(histData);
    } catch (e) {
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  // --- CART LOGIC ---
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.plu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const addToCart = (p: Product) => {
    if (cart.find(item => item.product.id === p.id)) {
      toast.error('Produk sudah ada di daftar.');
      return;
    }
    setCart([...cart, { product: p, quantity: 1 }]);
    setSearchTerm('');
    setIsSearching(false);
  };

  const updateCartQuantity = (id: string, qty: number) => {
    setCart(cart.map(item => item.product.id === id ? { ...item, quantity: Math.max(1, qty) } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.product.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setInvoiceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (cart.length === 0 || !supplier || !salesman) {
      toast.error('Lengkapi Supplier, Salesman, dan pilih minimal 1 produk');
      return;
    }

    setIsSubmitting(true);
    try {
      for (const item of cart) {
        const newStock = (item.product.stock || 0) + item.quantity;
        await api.updateProduct(item.product.id, { stock: newStock });
        await api.addSupplyHistory({
          product_id: item.product.id,
          product_name: item.product.name,
          brand: item.product.brand,
          plu: item.product.plu,
          quantity: item.quantity,
          salesman: salesman,
          supplier: supplier,
          invoice_image: invoiceImage,
          unit: item.product.unit
        });
      }
      toast.success('Supply berhasil diproses!');
      setCart([]); setSupplier(''); setSalesman(''); setInvoiceImage(null);
      fetchInitialData();
    } catch (e) {
      toast.error('Gagal memproses supply');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HISTORY LOGIC ---
  const groupedHistory = useMemo(() => {
    const groups: Record<string, SupplyLog[]> = {};
    history.forEach(log => {
      const groupName = log.supplier || 'Tanpa Supplier';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(log);
    });
    return groups;
  }, [history]);

  const toggleSupplierExpand = (name: string) => {
    setExpandedSuppliers(prev => 
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  // Full History Filtering & Search & Pagination
  const filteredFullHistory = useMemo(() => {
    const now = new Date();
    return history.filter(log => {
      // Time Filter
      const logDate = new Date(log.created_at);
      let timeMatch = true;
      if (fullHistoryFilter === 'today') timeMatch = logDate.toDateString() === now.toDateString();
      else if (fullHistoryFilter === 'week') timeMatch = logDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (fullHistoryFilter === 'month') timeMatch = logDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Search Filter
      const s = fullHistorySearch.toLowerCase();
      const searchMatch = !fullHistorySearch || 
        log.supplier?.toLowerCase().includes(s) ||
        log.salesman?.toLowerCase().includes(s) ||
        log.product_name?.toLowerCase().includes(s) ||
        log.plu?.toLowerCase().includes(s) ||
        log.brand?.toLowerCase().includes(s);

      return timeMatch && searchMatch;
    });
  }, [history, fullHistoryFilter, fullHistorySearch]);

  const totalPages = Math.ceil(filteredFullHistory.length / itemsPerPage);
  const paginatedHistory = filteredFullHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Supply Inbound</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium ml-1">Manajemen logistik dan kedatangan stok produk.</p>
        </div>
        <div className="flex items-center gap-3">
           {cart.length > 0 && (
             <div className="px-4 py-2 bg-[#8b7365]/10 rounded-full border border-[#8b7365]/20 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#8b7365]" />
                <span className="text-xs font-black text-[#8b7365] uppercase">{cart.length} Item Di Antrean</span>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Side: Input & Cart */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Supplier / PT</label>
                  <div className="relative"><Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Contoh: PT. Sumber Makmur" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"/></div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Salesman</label>
                  <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={salesman} onChange={e => setSalesman(e.target.value)} placeholder="Nama pembawa barang..." className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"/></div>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm h-full max-h-[600px] flex flex-col">
             <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-slate-800 text-lg">Pilih Item Inbound</h3>
                <div className="relative flex-1 max-w-xs ml-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setIsSearching(true); }} placeholder="Nama / PLU..." className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"/>
                  {isSearching && searchTerm.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-2xl z-30 overflow-hidden divide-y">
                      {filteredProducts.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="w-full text-left p-3 hover:bg-slate-50 flex items-center gap-3"><div className="w-8 h-8 rounded-lg overflow-hidden border"><img src={p.image_url} alt="" className="w-full h-full object-cover"/></div><div><p className="text-[9px] font-black text-rose-500">{p.plu}</p><p className="text-xs font-bold leading-none">{p.name}</p></div></button>
                      ))}
                    </div>
                  )}
                </div>
             </div>
             <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
               {cart.length === 0 ? (<div className="py-20 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed rounded-3xl"><Package className="w-12 h-12 mb-3 opacity-20"/><p className="text-xs font-black uppercase tracking-widest">Daftar Item Kosong</p></div>) : (
                 cart.map(item => (
                   <div key={item.product.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group"><div className="flex items-center gap-4 flex-1"><div className="w-11 h-11 bg-white rounded-lg border flex items-center justify-center p-1"><img src={item.product.image_url} alt="" className="max-h-full max-w-full"/></div><div className="min-w-0"><p className="text-[9px] font-black text-[#8b7365] mb-0.5">{item.product.brand}</p><p className="text-xs font-bold text-slate-800 truncate">{item.product.name}</p></div></div><div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border"><button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="p-1 hover:bg-slate-100 rounded text-slate-400"><X className="w-3 h-3 rotate-45"/></button><span className="text-sm font-black w-8 text-center">{item.quantity}</span><button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="p-1 hover:bg-slate-100 rounded text-[#8b7365]"><Plus className="w-3 h-3"/></button><span className="text-[9px] font-black text-slate-400 uppercase">{item.product.unit}</span></div><button onClick={() => removeFromCart(item.product.id)} className="ml-4 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button></div>
                 ))
               )}
             </div>
             <div className="mt-8 pt-6 border-t flex flex-col md:flex-row items-end gap-6"><div className="flex-1 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Bukti Faktur (Foto)</label><div className={cn("h-16 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 relative cursor-pointer overflow-hidden transition-all", invoiceImage ? "border-emerald-500 bg-emerald-50" : "bg-slate-50/50 hover:bg-slate-100")}>{invoiceImage ? (<><CheckCircle2 className="w-4 h-4 text-emerald-600"/><span className="text-[10px] font-black text-emerald-700">Faktur Terunggah</span></>) : (<><Camera className="w-4 h-4 text-slate-300"/><span className="text-[10px] font-black text-slate-400">Pilih Foto Nota</span></>)}<input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload}/></div></div><button onClick={handleSubmit} disabled={isSubmitting || cart.length === 0} className={cn("w-full md:w-64 py-4 rounded-2xl font-black text-white text-sm shadow-xl transition-all", isSubmitting || cart.length === 0 ? "bg-slate-300" : "bg-[#8b7365] hover:bg-[#7a6458]")}>SIMPAN SUPPLY SEKARANG</button></div>
          </div>
        </div>

        {/* Right Side: Grouped History Sidebar */}
        <div className="xl:col-span-4 space-y-6">
           <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col h-full min-h-[600px]"><div className="flex items-center justify-between mb-8"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#8b7365] border"><History className="w-5 h-5"/></div><h3 className="font-black text-slate-800">History Supply</h3></div><button onClick={() => setIsFullHistoryOpen(true)} className="text-[9px] font-black uppercase text-[#8b7365] hover:underline">Lihat Semua</button></div><div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">{Object.entries(groupedHistory).length === 0 ? (<div className="py-20 text-center text-slate-300">Belum ada riwayat</div>) : (Object.entries(groupedHistory).slice(0, 5).map(([supplier, logs]) => (<div key={supplier} className="border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-right-2"><button onClick={() => toggleSupplierExpand(supplier)} className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"><div className="flex items-center gap-3 min-w-0"><div className="w-8 h-8 bg-white border rounded-lg flex items-center justify-center text-slate-400 shrink-0"><Building2 className="w-4 h-4"/></div><div className="text-left min-w-0"><p className="text-xs font-black text-slate-800 truncate">{supplier}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{logs.length} Produk Masuk</p></div></div>{expandedSuppliers.includes(supplier) ? <ChevronDown className="w-4 h-4 text-slate-400"/> : <ChevronRight className="w-4 h-4 text-slate-400"/>}</button><AnimatePresence>{expandedSuppliers.includes(supplier) && (<motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white px-4 pb-4"><div className="border-t pt-3 space-y-2">{logs.slice(0, 3).map(log => (<div key={log.id} className="flex items-center justify-between"><div className="min-w-0 pr-4"><p className="text-[10px] font-black text-slate-700 truncate leading-none mb-1">{log.product_name}</p><p className="text-[8px] font-bold text-slate-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><span className="text-[10px] font-black text-emerald-600 shrink-0">+{log.quantity} {log.unit}</span></div>))}{logs.length > 3 && <p className="text-[8px] font-bold text-slate-400 italic">+{logs.length-3} lainnya...</p>}</div></motion.div>)}</AnimatePresence></div>)))}</div><div className="mt-8 bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex gap-3 items-center"><AlertCircle className="w-5 h-5 text-emerald-600 shrink-0"/><p className="text-[10px] font-medium text-emerald-700 leading-relaxed italic">Riwayat dikelompokkan per Supplier agar pengecekan nota lebih akurat.</p></div></div>
        </div>
      </div>

      {/* --- FULL HISTORY MODAL --- */}
      <AnimatePresence>
        {isFullHistoryOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFullHistoryOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white rounded-[40px] w-full max-w-6xl h-[85vh] shadow-2xl relative overflow-hidden flex flex-col z-[110]">
               <div className="p-8 border-b flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white sticky top-0">
                  <div className="flex items-center gap-4">
                     <div>
                        <h2 className="text-2xl font-black text-slate-800 leading-none mb-1">Laporan Supply Inbound</h2>
                        <div className="flex items-center gap-4">
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Total {filteredFullHistory.length} Log Data</p>
                           <div className="w-1 h-1 rounded-full bg-slate-200"/>
                           <div className="flex items-center gap-2">
                              {['all', 'today', 'week', 'month'].map(f => (
                                <button key={f} onClick={() => { setFullHistoryFilter(f as any); setCurrentPage(1); }} className={cn("text-[9px] font-black uppercase px-3 py-1 rounded-full border", fullHistoryFilter === f ? "bg-[#8b7365] text-white border-[#8b7365]" : "text-slate-400 border-slate-100")}>{f === 'all' ? 'Semua' : f === 'today' ? 'Hari Ini' : f === 'week' ? 'Minggu Ini' : 'Bulan Ini'}</button>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
                  
                  {/* GLOBAL SEARCH IN MODAL */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-full md:w-64">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <input 
                         value={fullHistorySearch}
                         onChange={(e) => { setFullHistorySearch(e.target.value); setCurrentPage(1); }}
                         placeholder="Cari Supplier / Produk / PLU..." 
                         className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs focus:border-[#8b7365] transition-all"
                       />
                    </div>
                    <button onClick={() => setIsFullHistoryOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"><X className="w-6 h-6 text-slate-400"/></button>
                  </div>
               </div>

               <div className="flex-1 overflow-x-auto p-4 custom-scrollbar bg-slate-50/30">
                  <table className="w-full text-left border-separate border-spacing-y-3">
                     <thead><tr className="bg-white/80 backdrop-blur shadow-sm"><th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Waktu</th><th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Supplier & Salesman</th><th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Produk</th><th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 text-center">Jumlah</th><th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 text-right">Opsi</th></tr></thead>
                     <tbody>
                        {paginatedHistory.map(log => (
                          <tr key={log.id} className="bg-white hover:bg-slate-50/50 transition-colors"><td className="px-6 py-4 whitespace-nowrap"><div className="text-xs font-black text-slate-800">{new Date(log.created_at).toLocaleDateString('id-ID')}</div><div className="text-[9px] font-bold text-slate-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></td><td className="px-6 py-4"><div className="flex items-center gap-2 mb-1"><Building2 className="w-3 h-3 text-[#8b7365]"/><span className="text-[10px] font-black text-slate-800 uppercase line-clamp-1">{log.supplier}</span></div><div className="flex items-center gap-2"><User className="w-3 h-3 text-slate-300"/><span className="text-[9px] font-bold text-slate-400 truncate max-w-[120px]">{log.salesman}</span></div></td><td className="px-6 py-4"><div className="text-[10px] font-black text-[#8b7365] mb-0.5">{log.brand}</div><div className="text-xs font-bold text-slate-800 truncate">{log.product_name}</div><div className="text-[9px] font-black text-rose-500 uppercase">PLU: {log.plu}</div></td><td className="px-6 py-4 text-center"><span className="inline-flex flex-col items-center"><span className="text-sm font-black text-emerald-600 block leading-none">+{log.quantity}</span><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{log.unit}</span></span></td><td className="px-6 py-4 text-right">{log.invoice_image && (<button onClick={() => setViewingInvoice(log.invoice_image!)} className="text-[10px] font-black text-[#8b7365] hover:underline flex items-center gap-1 ml-auto"><FileText className="w-3 h-4"/> BUKTI FAKTUR</button>)}</td></tr>
                        ))}
                     </tbody>
                  </table>
                  {paginatedHistory.length === 0 && <div className="py-20 text-center text-slate-300 italic">Tidak ada riwayat yang cocok dengan pencarian Anda.</div>}
               </div>

               <div className="p-6 border-t bg-white flex items-center justify-between"><p className="text-[10px] font-bold text-slate-400">Total {filteredFullHistory.length} data ditemukan.</p><div className="flex items-center gap-4"><button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="p-2 border rounded-xl hover:bg-slate-50 transition-all disabled:opacity-30" disabled={currentPage === 1}><ChevronLeft className="w-5 h-5 text-[#8b7365]"/></button><span className="text-sm font-black text-[#8b7365]">Halaman {currentPage} dari {totalPages || 1}</span><button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-2 border rounded-xl hover:bg-slate-50 transition-all disabled:opacity-30" disabled={currentPage === totalPages}><ChevronRight className="w-5 h-5 text-[#8b7365]"/></button></div></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INVOICE PREVIEW MODAL */}
      <AnimatePresence>{viewingInvoice && (<div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-slate-900/90 backdrop-blur-sm" onClick={() => setViewingInvoice(null)}><motion.img initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} src={viewingInvoice} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"/><button className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white"><X className="w-8 h-8"/></button></div>)}</AnimatePresence>
    </div>
  );
}
