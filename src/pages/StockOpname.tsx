import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  Printer, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  RotateCcw,
  ChevronRight,
  TrendingUp,
  Package,
  Search,
  FileText,
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import LoadingScreen from '../components/LoadingScreen';

interface Product {
  id: string;
  name: string;
  brand: string;
  stock: number;
  price: number;
  plu: string;
  category: string;
  image_url: string;
}

interface OpnameItem {
  product_id: string;
  product_name: string;
  brand: string;
  plu: string;
  expected_stock: number;
  stage1: number | '';
  stage2: number | '';
  stage3: number | '';
  difference: number;
  status: 'pending' | 'warning' | 'ok';
}

export default function StockOpname() {
  const [products, setProducts] = useState<Product[]>([]);
  const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStage, setCurrentStage] = useState(1);
  const [isFinalized, setIsFinalized] = useState(false);
  const [sessionDate] = useState(new Date().toLocaleDateString('id-ID', { 
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  }));

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
      const items: OpnameItem[] = data.map((p: any) => ({
        product_id: p.id,
        product_name: p.name,
        brand: p.brand,
        plu: p.plu,
        expected_stock: p.stock || 0,
        stage1: '',
        stage2: '',
        stage3: '',
        difference: 0,
        status: 'pending'
      }));
      setOpnameItems(items);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Gagal memuat data produk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (index: number, stage: number, value: string) => {
    const newItems = [...opnameItems];
    const numValue = value === '' ? '' : parseInt(value);
    
    if (stage === 1) newItems[index].stage1 = numValue;
    else if (stage === 2) newItems[index].stage2 = numValue;
    else if (stage === 3) newItems[index].stage3 = numValue;

    setOpnameItems(newItems);
  };

  const processResults = () => {
    const newItems = opnameItems.map(item => {
      let actualCount = 0;
      if (currentStage === 1) actualCount = Number(item.stage1) || 0;
      else if (currentStage === 2) actualCount = item.stage2 === '' ? (Number(item.stage1) || 0) : Number(item.stage2);
      else actualCount = item.stage3 === '' ? (item.stage2 === '' ? (Number(item.stage1) || 0) : Number(item.stage2)) : Number(item.stage3);

      const diff = actualCount - item.expected_stock;
      return {
        ...item,
        difference: diff,
        status: diff === 0 ? 'ok' : 'warning'
      } as OpnameItem;
    });
    setOpnameItems(newItems);
    toast.success('Hasil sementara berhasil diproses');
  };

  const nextStage = () => {
    if (currentStage < 3) {
      setCurrentStage(currentStage + 1);
      toast.success(`Berlanjut ke Tahap ${currentStage + 1}`);
    }
  };

  const finalizeOpname = async () => {
    if (window.confirm('Apakah Anda yakin ingin memfinalisasi stock opname? Data stok sistem akan diperbarui.')) {
      setIsLoading(true);
      try {
        for (const item of opnameItems) {
          const finalCount = item.stage3 === '' ? (item.stage2 === '' ? (Number(item.stage1) || 0) : Number(item.stage2)) : Number(item.stage3);
          
          if (item.difference !== 0) {
            await api.updateProduct(item.product_id, {
              stock: finalCount
            });
            
            await api.addSupplyHistory({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.difference,
              type: 'adjustment',
              supplier: 'STOCK OPNAME',
              status: 'completed',
              notes: `Stock Opname difference: ${item.difference}`
            });
          }
        }

        await api.addSale({
          total_amount: 0,
          payment_method: 'SYSTEM',
          items: opnameItems.filter(i => i.difference !== 0).map(i => ({
            name: `ADJ: ${i.product_name}`,
            quantity: i.difference,
            price: 0
          })),
          created_at: new Date().toISOString(),
          customer_id: null,
          note: 'STOCK OPNAME FINALIZATION'
        });

        setIsFinalized(true);
        toast.success('Stock Opname berhasil difinalisasi');
      } catch (error) {
        console.error('Finalize error:', error);
        toast.error('Gagal memfinalisasi stock opname');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredItems = opnameItems.filter(item => 
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.plu.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && products.length === 0) {
    return (
      <LoadingScreen 
        message="Menyiapkan Sesi Stock Opname..."
        subMessage="Sedang menyinkronkan data stok terkini dari database cloud untuk rekonsiliasi inventaris."
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-50 overflow-hidden relative">
      <AnimatePresence>
        {isLoading && (
          <LoadingScreen 
            fullScreen 
            message="Memproses Data Opname..." 
            subMessage="Hasil perhitungan sedang disinkronkan dengan stok sistem di server cloud."
          />
        )}
      </AnimatePresence>
      {/* Header Section */}
      <div className="px-8 py-6 bg-transparent flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 no-print">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] shadow-sm shadow-[#8b7365]/10">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Stock Opname</h1>
            <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none">Inventory Reconciliation System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak Form
          </button>
          
          <button 
            onClick={processResults}
            disabled={isFinalized}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" /> Proses Hasil
          </button>

          {currentStage < 3 && !isFinalized && (
            <button 
              onClick={nextStage}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
            >
              <ChevronRight className="w-4 h-4" /> Tahap {currentStage + 1}
            </button>
          )}

          <button 
            onClick={finalizeOpname}
            disabled={isFinalized}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> Finalisasi
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar no-print">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 no-print">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500"><Package className="w-6 h-6" /></div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Produk</p>
                 <h3 className="text-xl font-black text-slate-800">{products.length}</h3>
              </div>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500"><AlertCircle className="w-6 h-6" /></div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Selisih Stok</p>
                 <h3 className="text-xl font-black text-slate-800">{opnameItems.filter(i => i.difference !== 0).length} Item</h3>
              </div>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500"><Clock className="w-6 h-6" /></div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tahap Aktif</p>
                 <h3 className="text-xl font-black text-slate-800">Tahap {currentStage}</h3>
              </div>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500"><FileText className="w-6 h-6" /></div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Sesi</p>
                 <h3 className={cn("text-xl font-black", isFinalized ? "text-emerald-600" : "text-slate-800")}>{isFinalized ? 'Selesai' : 'Aktif'}</h3>
              </div>
           </motion.div>
        </div>

        {/* Search & Table Area */}
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden no-print">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari Produk / PLU / Brand..." 
                className="w-full pl-11 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-[#8b7365]/10 focus:border-[#8b7365] transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
               <div className="px-5 py-2 bg-slate-100 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sesi: {sessionDate}</span>
               </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Produk</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stok Sistem</th>
                  <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center", currentStage === 1 ? "text-[#8b7365] bg-[#8b7365]/5" : "text-slate-400")}>Tahap 1</th>
                  <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center", currentStage === 2 ? "text-[#8b7365] bg-[#8b7365]/5" : "text-slate-400")}>Tahap 2</th>
                  <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center", currentStage === 3 ? "text-[#8b7365] bg-[#8b7365]/5" : "text-slate-400")}>Tahap 3</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map((item) => {
                  const idx = opnameItems.findIndex(oi => oi.product_id === item.product_id);
                  return (
                    <tr key={item.product_id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                              <img src={products.find(p => p.id === item.product_id)?.image_url || 'https://via.placeholder.com/40'} className="w-full h-full object-contain" alt="" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-[#8b7365] uppercase mb-0.5">{item.brand}</p>
                              <h4 className="text-sm font-black text-slate-800 leading-tight">{item.product_name}</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PLU: {item.plu}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="font-mono text-sm font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">{item.expected_stock}</span>
                      </td>
                      <td className={cn("px-8 py-5", currentStage === 1 && "bg-[#8b7365]/5")}>
                        <input 
                          type="number" 
                          value={item.stage1}
                          disabled={isFinalized || currentStage !== 1}
                          onChange={e => handleInputChange(idx, 1, e.target.value)}
                          className={cn(
                            "w-20 mx-auto block p-3 rounded-xl text-center font-black font-mono text-sm outline-none transition-all",
                            currentStage === 1 ? "bg-white border-2 border-[#8b7365] shadow-sm text-[#8b7365]" : "bg-transparent border border-transparent text-slate-400"
                          )}
                        />
                      </td>
                      <td className={cn("px-8 py-5", currentStage === 2 && "bg-[#8b7365]/5")}>
                        <input 
                          type="number" 
                          value={item.stage2}
                          disabled={isFinalized || currentStage !== 2}
                          onChange={e => handleInputChange(idx, 2, e.target.value)}
                          className={cn(
                            "w-20 mx-auto block p-3 rounded-xl text-center font-black font-mono text-sm outline-none transition-all",
                            currentStage === 2 ? "bg-white border-2 border-[#8b7365] shadow-sm text-[#8b7365]" : "bg-transparent border border-transparent text-slate-400"
                          )}
                        />
                      </td>
                      <td className={cn("px-8 py-5", currentStage === 3 && "bg-[#8b7365]/5")}>
                        <input 
                          type="number" 
                          value={item.stage3}
                          disabled={isFinalized || currentStage !== 3}
                          onChange={e => handleInputChange(idx, 3, e.target.value)}
                          className={cn(
                            "w-20 mx-auto block p-3 rounded-xl text-center font-black font-mono text-sm outline-none transition-all",
                            currentStage === 3 ? "bg-white border-2 border-[#8b7365] shadow-sm text-[#8b7365]" : "bg-transparent border border-transparent text-slate-400"
                          )}
                        />
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black font-mono text-sm",
                          item.difference === 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          item.difference < 0 ? "bg-rose-50 text-rose-600 border border-rose-100" :
                          "bg-blue-50 text-blue-600 border border-blue-100"
                        )}>
                          {item.difference > 0 && '+'}
                          {item.difference}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PRINT VIEW */}
      <div className="hidden print:block p-8 bg-white">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
             <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">FORM STOCK OPNAME</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">{sessionDate}</p>
             </div>
             <div className="text-right">
                <p className="text-xl font-black uppercase tracking-tighter">LILY MART STUDIO</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Management System</p>
             </div>
          </div>

          <table className="w-full border-collapse border-2 border-slate-900">
             <thead>
                <tr className="bg-slate-100">
                   <th className="border-2 border-slate-900 p-3 text-left text-[10px] uppercase font-black">INFO PRODUK</th>
                   <th className="border-2 border-slate-900 p-3 text-center text-[10px] uppercase font-black w-24">SYS</th>
                   <th className="border-2 border-slate-900 p-3 text-center text-[10px] uppercase font-black w-24">HITUNG (1)</th>
                   <th className="border-2 border-slate-900 p-3 text-center text-[10px] uppercase font-black w-24">HITUNG (2)</th>
                   <th className="border-2 border-slate-900 p-3 text-center text-[10px] uppercase font-black w-40">CATATAN</th>
                </tr>
             </thead>
             <tbody>
                {opnameItems.map(item => (
                   <tr key={item.product_id}>
                      <td className="border-2 border-slate-900 p-3">
                         <p className="text-xs font-black uppercase leading-tight mb-1">{item.product_name}</p>
                         <p className="text-[9px] font-bold text-slate-500">PLU: {item.plu} | {item.brand}</p>
                      </td>
                      <td className="border-2 border-slate-900 p-3 text-center font-mono font-black">{item.expected_stock}</td>
                      <td className="border-2 border-slate-900 p-3"></td>
                      <td className="border-2 border-slate-900 p-3"></td>
                      <td className="border-2 border-slate-900 p-3"></td>
                   </tr>
                ))}
             </tbody>
          </table>

          <div className="mt-16 grid grid-cols-3 gap-12">
             <div className="text-center">
                <div className="h-24 border-b-2 border-slate-900 mb-2"></div>
                <p className="text-[10px] font-black uppercase tracking-widest">Admin Gudang</p>
             </div>
             <div className="text-center">
                <div className="h-24 border-b-2 border-slate-900 mb-2"></div>
                <p className="text-[10px] font-black uppercase tracking-widest">Saksi Lapangan</p>
             </div>
             <div className="text-center">
                <div className="h-24 border-b-2 border-slate-900 mb-2"></div>
                <p className="text-[10px] font-black uppercase tracking-widest">Manager Operasional</p>
             </div>
          </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
