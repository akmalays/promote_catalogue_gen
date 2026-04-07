import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  History,
  ShieldCheck,
  PlayCircle,
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
   
   const handleInputKeyDown = (e: React.KeyboardEvent, index: number, stage: number) => {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
         e.preventDefault();
         const nextInput = document.getElementById(`input-${stage}-${index + 1}`);
         if (nextInput) {
            (nextInput as HTMLInputElement).focus();
            (nextInput as HTMLInputElement).select();
         }
      } else if (e.key === 'ArrowUp') {
         e.preventDefault();
         const prevInput = document.getElementById(`input-${stage}-${index - 1}`);
         if (prevInput) {
            (prevInput as HTMLInputElement).focus();
            (prevInput as HTMLInputElement).select();
         }
      }
   };
   const [currentStage, setCurrentStage] = useState(1);
   const [isFinalized, setIsFinalized] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showPrintResultModal, setShowPrintResultModal] = useState(false);
    const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
    const [showFinalizePrint, setShowFinalizePrint] = useState(false);
    const [printMode, setPrintMode] = useState<'blank' | 'result'>('blank');
   const [storeName, setStoreName] = useState('MyStore Studio');
   const [staffLabels, setStaffLabels] = useState({
     admin: 'Admin Gudang',
     manager: 'Store Manager',
     staff: 'Saksi Lapangan'
   });
   const [staffInfo, setStaffInfo] = useState({
     admin: '',
     manager: '',
     staff: ''
   });

   const [activeTab, setActiveTab] = useState<'info' | 'new' | 'history'>('info');
  const [history, setHistory] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [unfilteredSessions, setUnfilteredSessions] = useState<any[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [selectedWatchItem, setSelectedWatchItem] = useState<any>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [lossSortMode, setLossSortMode] = useState<'nominal' | 'qty'>('nominal');
  const [showAllLosses, setShowAllLosses] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchStoreInfo();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, selectedDate, timeRange]);

  const fetchStoreInfo = async () => {
     try {
        const settings = await api.getStoreSettings();
        if (settings.store_name) setStoreName(settings.store_name);
        
        const users = await api.getUsers();
        // Mencari user berdasarkan role yang ada di screenshot: Manager, Kasir, Administrator
        const m = users.find((u: any) => u.role?.toLowerCase() === 'manager');
        const a = users.find((u: any) => u.role?.toLowerCase() === 'administrator');
        const s = users.find((u: any) => u.role?.toLowerCase() === 'kasir');

        setStaffInfo({
           manager: m ? m.name : '...........................',
           admin: a ? a.name : '...........................',
           staff: s ? s.name : '...........................'
        });
        
        // Simpan role asli untuk label bawah
        setStaffLabels({
           manager: m ? m.role : 'Manager',
           admin: a ? a.role : 'Administrator',
           staff: s ? s.role : 'Kasir'
        });
     } catch (e) {}
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOpnameSessions();
      setUnfilteredSessions(data);
      
      const filtered = data.filter((s: any) => {
        // Search filter
        const matchesSearch = !historySearchQuery || 
                              (s.session_code && s.session_code.toLowerCase().includes(historySearchQuery.toLowerCase())) ||
                              (s.processor_name && s.processor_name.toLowerCase().includes(historySearchQuery.toLowerCase()));
        
        if (!matchesSearch) return false;

        const sessionDate = new Date(s.created_at);
        
        
        const y = sessionDate.getFullYear();
        const m = String(sessionDate.getMonth() + 1).padStart(2, '0');
        const d = String(sessionDate.getDate()).padStart(2, '0');
        const sessionDateStr = `${y}-${m}-${d}`;

        if (timeRange === 'daily') {
          return sessionDateStr === selectedDate;
        } else if (timeRange === 'monthly') {
          return sessionDateStr.substring(0, 7) === selectedDate.substring(0, 7);
        } else {
          return sessionDateStr.substring(0, 4) === selectedDate.substring(0, 4);
        }
      });

      setSessions(filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e) {
      console.error('Error fetching sessions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSessionCode = () => {
    const d = new Date();
    const today = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SO-${today}-${random}`;
  };

  const startSession = () => {
    const code = generateSessionCode();
    setSessionCode(code);
    setIsSessionActive(true);
    setShowStartModal(false);
    setOpnameItems(prev => prev.map(item => ({ 
       ...item, 
       stage1: '', 
       stage2: '', 
       stage3: '', 
       difference: 0, 
       status: 'pending' 
    })));
    setCurrentStage(1);
    setIsFinalized(false);
    toast.success(`Sesi ${code} dimulai!`);
  };

  const exitSession = () => {
    setIsSessionActive(false);
    setSessionCode(null);
    setOpnameItems(prev => prev.map(item => ({ 
       ...item, 
       stage1: '', 
       stage2: '', 
       stage3: '', 
       difference: 0, 
       status: 'pending' 
    })));
    setCurrentStage(1);
  };

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
    setIsLoading(true);
    // Simulate API processing
    setTimeout(() => {
      setOpnameItems(prev => prev.map(item => {
        let count: number | null = null;
        if (currentStage === 1 && item.stage1 !== '') count = Number(item.stage1);
        else if (currentStage === 2 && item.stage2 !== '') count = Number(item.stage2);
        else if (currentStage === 3 && item.stage3 !== '') count = Number(item.stage3);

        if (count === null) return item;

        return {
          ...item,
          status: 'success',
          difference: count - item.expected_stock
        };
      }));
      setIsLoading(false);
      setShowConfirmModal(false);
      setPrintMode('result');
      setShowPrintResultModal(true);
      toast.success(`Hasil Tahap ${currentStage} Berhasil Diproses`);
    }, 1500);
  };

  const nextStage = () => {
    if (currentStage < 3) {
      setCurrentStage(currentStage + 1);
      toast.success(`Berlanjut ke Tahap ${currentStage + 1}`);
    }
  };

  const finalizeOpname = async () => {
    if (!showFinalizeConfirm) {
      setShowFinalizeConfirm(true);
      return;
    }

    try {
      setIsLoading(true);
      setShowFinalizeConfirm(false);
      
      const finishedItems = opnameItems
        .filter(item => item.stage1 !== '' || item.stage2 !== '' || item.stage3 !== '')
        .map(item => {
          const finalCount = item.stage3 !== '' ? Number(item.stage3) : (item.stage2 !== '' ? Number(item.stage2) : Number(item.stage1));
          const diff = finalCount - item.expected_stock;
          const price = products.find(p => p.id === item.product_id)?.price || 0;
          return { 
             ...item, 
             finalCount, 
             diff,
             nominal: diff * price
          };
        });

      let totalNominalDiff = 0;
      let totalQtyDiff = 0;
      let surplusCount = 0;
      let minusCount = 0;

      for (const item of finishedItems) {
        totalNominalDiff += item.nominal;
        totalQtyDiff += Math.abs(item.diff);
        if (item.diff > 0) surplusCount++;
        else if (item.diff < 0) minusCount++;

        if (item.diff !== 0) {
          await api.updateProduct(item.product_id, {
            stock: item.finalCount
          });
          
          await api.addSupplyHistory({
            product_id: item.product_id,
            product_name: item.product_name,
            brand: item.brand,
            plu: item.plu,
            quantity: item.diff,
            supplier: 'STOCK OPNAME',
            salesman: 'SYSTEM',
            unit: 'pcs',
            created_at: new Date().toISOString()
          });
        }
      }

      // Record the session summary
      const currentAdmin = await api.getUsers().then(users => users.find((u: any) => u.username === localStorage.getItem('username')) || users[0]);
      
      await api.addOpnameSession({
        processor_name: currentAdmin?.name || 'Administrator',
        processor_role: currentAdmin?.role || 'Admin',
        total_nominal_diff: totalNominalDiff,
        total_qty_diff: totalQtyDiff,
        items_surplus_count: surplusCount,
        items_minus_count: minusCount,
        items_data: finishedItems,
        session_code: sessionCode || "SO-MANUAL"
      });
      
      setIsFinalized(true);
      setIsSessionActive(false);
      setPrintMode('result');
      setShowFinalizePrint(true);
      toast.success('Stock Opname berhasil difinalisasi');
    } catch (error) {
      console.error('Finalize error:', error);
      toast.error('Gagal memfinalisasi stock opname');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSession = () => {
    if (window.confirm('Mulai sesi opname baru? Data yang belum difinalisasi akan hilang.')) {
      setIsFinalized(false);
      setCurrentStage(1);
      fetchProducts();
      setActiveTab('new');
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
      
      {/* Modals */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm no-print">
            <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 20 }} 
               className="bg-white p-8 rounded-[32px] max-w-sm w-full shadow-2xl relative border border-slate-100"
            >
              <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] mb-6">
                <AlertCircle className="w-7 h-7" />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Proses Hasil Opname?</h3>
              
              <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
                Apakah Anda yakin ingin memproses hasil perhitungan untuk <span className="text-[#8b7365] font-black underline underline-offset-4">Tahap {currentStage}</span>? Seluruh data pada tahap ini akan <span className="text-slate-800 font-bold">dikunci</span>.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)} 
                  className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl font-bold text-xs text-slate-400 hover:bg-slate-100 transition-all border border-slate-100"
                >
                  Batal
                </button>
                <button 
                  onClick={processResults} 
                  className="flex-1 px-4 py-3 bg-[#8b7365] rounded-2xl font-bold text-xs text-white hover:bg-[#7a6458] transition-all shadow-xl shadow-[#8b7365]/25"
                >
                  Ya, Proses
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showPrintResultModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm no-print">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} 
               animate={{ opacity: 1, scale: 1 }} 
               exit={{ opacity: 0, scale: 0.9 }} 
               className="bg-white p-8 rounded-[32px] max-w-sm w-full shadow-2xl relative border border-slate-100"
            >
              <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] mb-6">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Berhasil Diproses</h3>
              
              <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
                Hasil perhitungan <span className="text-[#8b7365] font-bold underline underline-offset-4 decoration-2">Tahap {currentStage}</span> telah tersimpan. Silakan cetak laporan hasil untuk keperluan arsip fisik.
              </p>
              
              <div className="flex gap-3">
                <button 
                   onClick={() => setShowPrintResultModal(false)} 
                   className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl font-bold text-xs text-slate-400 hover:bg-slate-100 transition-all border border-slate-100"
                >
                   Tutup
                </button>
                <button 
                   onClick={() => {
                     setPrintMode('result');
                     setTimeout(() => window.print(), 100);
                   }} 
                   className="flex-1 px-4 py-3 bg-[#8b7365] rounded-2xl font-bold text-xs text-white hover:bg-[#7a6458] transition-all shadow-xl shadow-[#8b7365]/25 flex items-center justify-center gap-2"
                >
                   <Printer className="w-4 h-4" /> Cetak
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showFinalizeConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm no-print">
            <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 20 }} 
               className="bg-white p-8 rounded-[32px] max-w-sm w-full shadow-2xl relative border border-slate-100 uppercase-control"
            >
              <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] mb-6">
                <ShieldCheck className="w-7 h-7" />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Finalisasi Sesi?</h3>
              
              <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
                Anda akan <span className="text-[#8b7365] font-black underline underline-offset-4 decoration-2">mengunci data</span> sesi ini. Stok sistem akan disesuaikan secara permanen berdasarkan perhitungan terakhir.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFinalizeConfirm(false)} 
                  className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl font-bold text-xs text-slate-400 hover:bg-slate-100 transition-all border border-slate-100"
                >
                  Batal
                </button>
                <button 
                  onClick={finalizeOpname} 
                  className="flex-1 px-4 py-3 bg-[#8b7365] rounded-2xl font-bold text-xs text-white hover:bg-[#7a6458] transition-all shadow-xl shadow-[#8b7365]/25"
                >
                  Ya, Finalisasi
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showStartModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm no-print">
            <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: 20 }} 
               className="bg-white p-10 rounded-[48px] max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-[#8b7365]/10 rounded-[32px] flex items-center justify-center text-[#8b7365] mb-8">
                <PlayCircle className="w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Mulai Sesi Opname?</h3>
              <p className="text-sm text-slate-500 mb-10 font-medium leading-relaxed">
                Sistem akan membuat <span className="text-[#8b7365] font-bold">Kode Seri Unik</span> untuk sesi ini. Pastikan semua transaksi hari ini sudah selesai diinput.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 px-6 py-4 bg-slate-50 rounded-3xl font-bold text-xs text-slate-400 hover:bg-slate-100 transition-all border border-slate-100"
                >
                  Batal
                </button>
                <button 
                  onClick={startSession}
                  className="flex-1 px-6 py-4 bg-[#8b7365] text-white rounded-3xl font-bold text-xs hover:bg-[#7a6458] transition-all shadow-xl shadow-[#8b7365]/20"
                >
                  Mulai Sesi
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showFinalizePrint && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm no-print">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} 
               animate={{ opacity: 1, scale: 1 }} 
               exit={{ opacity: 0, scale: 0.9 }} 
               className="bg-white p-8 rounded-[32px] max-w-sm w-full shadow-2xl relative border border-slate-100"
            >
              <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] mb-6">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Opname Berhasil</h3>
              
              <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">
                Stock Opname telah <span className="text-[#8b7365] font-bold underline underline-offset-4 decoration-2">berhasil difinalisasi</span>. Anda dapat mencetak Laporan Hasil Akhir sekarang.
              </p>
              
              <div className="flex gap-3">
                <button 
                   onClick={() => setShowFinalizePrint(false)} 
                   className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl font-bold text-xs text-slate-400 hover:bg-slate-100 transition-all border border-slate-100"
                >
                   Tutup
                </button>
                <button 
                   onClick={() => {
                     setPrintMode('result');
                     setTimeout(() => window.print(), 100);
                   }} 
                   className="flex-1 px-4 py-3 bg-[#8b7365] rounded-2xl font-bold text-xs text-white hover:bg-[#7a6458] transition-all shadow-xl shadow-[#8b7365]/25 flex items-center justify-center gap-2"
                >
                   <Printer className="w-4 h-4" /> Cetak Laporan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="px-8 py-6 bg-transparent flex flex-col md:flex-row md:items-start justify-between gap-6 z-10 no-print">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] shadow-sm shadow-[#8b7365]/10 mt-1">
            <ClipboardCheck className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Stock Opname</h1>
            <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none mb-4">Rekonsiliasi inventaris toko</p>
            
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => setActiveTab('info')}
                 className={cn(
                   "text-xs font-semibold px-4 py-1.5 rounded-xl transition-all",
                   activeTab === 'info' ? "bg-[#8b7365] text-white shadow-lg shadow-[#8b7365]/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                 )}
               >
                 Informasi
               </button>
               <div className="w-1 h-1 bg-slate-300 rounded-full" />
               <button 
                 onClick={() => setActiveTab('new')}
                 className={cn(
                   "text-xs font-semibold px-4 py-1.5 rounded-xl transition-all",
                   activeTab === 'new' ? "bg-[#8b7365] text-white shadow-lg shadow-[#8b7365]/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                 )}
               >
                 Sesi Baru
               </button>
               <div className="w-1 h-1 bg-slate-300 rounded-full" />
               <button 
                 onClick={() => setActiveTab('history')}
                 className={cn(
                   "text-xs font-semibold px-4 py-1.5 rounded-xl transition-all",
                   activeTab === 'history' ? "bg-[#8b7365] text-white shadow-lg shadow-[#8b7365]/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                 )}
               >
                 Riwayat Sesi
               </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'new' ? (
            <>
              {isFinalized && (
                <button 
                  onClick={resetSession}
                  className="flex items-center gap-2 px-4 py-2 bg-[#8b7365] text-white rounded-xl font-bold text-xs hover:bg-[#7a6458] transition-all shadow-lg shadow-[#8b7365]/20"
                >
                  <RotateCcw className="w-4 h-4" /> Sesi Baru
                </button>
              )}
              <button 
                onClick={() => {
                   setPrintMode('blank');
                   setTimeout(() => window.print(), 100);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak Form Kosong </button>
              
              <button 
                 onClick={() => setShowConfirmModal(true)}
                 disabled={isFinalized}
                 className="flex items-center gap-2 px-4 py-2 bg-[#8b7365] text-white rounded-xl font-bold text-xs hover:bg-[#7a6559] transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
               >
                 <Zap className="w-4 h-4" /> Review Hasil </button>

              {currentStage < 3 && !isFinalized && (
                <button 
                  onClick={nextStage}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <ChevronRight className="w-4 h-4" /> Tahap {currentStage + 1}
                </button>
              )}

              <button 
                onClick={finalizeOpname}
                disabled={isFinalized || currentStage < 3}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Finalisasi Stok </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-xl border border-slate-100 shadow-sm flex items-center mr-2">
                 {(['daily', 'monthly', 'yearly'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[12px] font-bold transition-all",
                        timeRange === r ? "bg-[#8b7365] text-white shadow-lg shadow-[#8b7365]/20" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                       {r === 'daily' ? 'Hari' : r === 'monthly' ? 'Bulan' : 'Tahun'}
                    </button>
                 ))}
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                 <input 
                   type="date" 
                   value={selectedDate}
                   onChange={(e) => setSelectedDate(e.target.value)}
                   className="bg-transparent border-none text-[10px] font-black text-slate-600 px-3 py-1.5 focus:ring-0 outline-none uppercase tracking-widest"
                 />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar no-print">
        {activeTab === 'info' ? (
          <div className="max-w-4xl mx-auto space-y-8 py-4">
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-[#8b7365] p-10 rounded-[48px] text-white shadow-2xl shadow-[#8b7365]/20 relative overflow-hidden"
             >
                <div className="relative z-10">
                   <h2 className="text-3xl font-black tracking-tight mb-4 leading-tight uppercase">Mengenal Stock Opname</h2>
                   <p className="text-[#e2dcd9] text-base font-medium leading-relaxed mb-8 max-w-2xl">
                      Stock opname adalah kegiatan rekonsiliasi berkala untuk memastikan data stok di sistem digital 
                      selaras dengan jumlah fisik barang di gudang. Proses ini krusial untuk menjaga 
                      akurasi laporan keuangan dan ketersediaan barang bagi pelanggan.
                   </p>
                   <div className="flex gap-4">
                      <button onClick={() => setActiveTab('new')} className="px-6 py-3 bg-white text-[#8b7365] rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all outline-none">Mulai Sesi Baru</button>
                      <button onClick={() => setActiveTab('history')} className="px-6 py-3 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all outline-none">Lihat Riwayat</button>
                   </div>
                </div>
                {/* Background Decor */}
                <div className="absolute -right-10 -bottom-10 opacity-10">
                   <ClipboardCheck className="w-64 h-64" />
                </div>
             </motion.div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: <FileText />, title: "1. Persiapan", desc: "Cetak formulir stock opname dan lakukan perhitungan fisik di gudang secara manual." },
                  { icon: <TrendingUp />, title: "2. Verifikasi", desc: "Masukkan data hasil hitung ke sistem. Sistem akan melakukan validasi hingga 3 tahap (triple check)." },
                  { icon: <Save />, title: "3. Sinkronisasi", desc: "Finalisasi hasil untuk memperbarui stok digital secara otomatis dan mencatat riwayat penyesuaian." }
                ].map((step, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (i + 1) }}
                    className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm group hover:border-[#8b7365] transition-all"
                  >
                     <div className="w-12 h-12 bg-slate-50 text-[#8b7365] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#8b7365] group-hover:text-white transition-all">
                        {step.icon}
                     </div>
                     <h3 className="text-sm font-black text-slate-800 tracking-tight mb-2 tracking-widest uppercase">{step.title}</h3>
                     <p className="text-xs font-bold text-slate-500 leading-relaxed">{step.desc}</p>
                  </motion.div>
                ))}
             </div>

             <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center shrink-0">
                   <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                   <h4 className="text-sm font-black text-slate-800 tracking-tight mb-1 uppercase tracking-widest">Tips Akurasi</h4>
                   <p className="text-xs font-bold text-slate-500 leading-relaxed">
                      Lakukan stock opname saat toko tutup atau arus barang minimal untuk menghindari selisih data akibat transaksi yang sedang berjalan.
                   </p>
                </div>
             </div>
          </div>
        ) : activeTab === 'new' ? (
          !isSessionActive ? (
            <div className="flex flex-col items-center justify-center p-20 py-32 bg-white rounded-[48px] border border-slate-100 shadow-sm transition-all animate-in fade-in zoom-in duration-500">
               <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 mb-8 border border-slate-50">
                  <Package className="w-10 h-10" />
               </div>
               <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Sesi Opname Baru</h3>
               <p className="text-sm text-slate-400 font-medium mb-10 text-center max-w-sm leading-relaxed">
                  Belum ada sesi aktif. Silakan mulai sesi baru untuk melakukan perhitungan stok fisik secara akurat dengan kode seri unik.
               </p>
               <button 
                 onClick={() => setShowStartModal(true)}
                 className="px-10 py-5 bg-[#8b7365] text-white rounded-[32px] font-bold text-sm hover:bg-[#7a6458] transition-all shadow-2xl shadow-[#8b7365]/30 flex items-center gap-3 active:scale-95"
               >
                 <PlayCircle className="w-6 h-6" /> Mulai Sesi Sekarang
               </button>
            </div>
          ) : (
            <>
              {/* Sticky Session Code Header */}
              <div className="bg-[#8b7365] p-6 px-10 rounded-[32px] mb-8 flex items-center justify-between shadow-xl shadow-[#8b7365]/10 text-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-[30deg] translate-x-12" />
                 <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                       <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Status Sesi Aktif</p>
                       <h4 className="text-lg font-black tracking-tight leading-none">Stok Opname : {sessionCode}</h4>
                    </div>
                 </div>
                 <button 
                   onClick={exitSession}
                   className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs transition-all backdrop-blur-md border border-white/20 flex items-center gap-2"
                 >
                   <RotateCcw className="w-3.5 h-3.5" /> Batal Sesi
                 </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 no-print">
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500"><Package className="w-6 h-6" /></div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Produk</p>
                       <h3 className="text-xl font-bold text-slate-800">{products.length}</h3>
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
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500"><CheckCircle2 className="w-6 h-6" /></div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sesuai Stok</p>
                     <h3 className="text-xl font-black text-slate-800">{opnameItems.filter(i => i.difference === 0 && i.status !== 'pending').length} Item</h3>
                  </div>
               </motion.div>
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500"><Clock className="w-6 h-6" /></div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tahap Aktif</p>
                     <h3 className="text-xl font-black text-slate-800">{isFinalized ? 'Selesai' : `Tahap ${currentStage}`}</h3>
                  </div>
               </motion.div>
            </div>

            {/* Filter & Search */}
            <div className="bg-white p-4 rounded-[40px] shadow-sm border border-slate-100 flex items-center justify-between gap-6 mb-8 no-print">
               <div className="relative flex-1">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari produk di stok gudang..."
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-[32px] text-sm font-bold text-slate-800 placeholder-slate-300 focus:ring-2 focus:ring-[#8b7365]/20 transition-all"
                  />
               </div>
            </div>

            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden no-print">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Daftar Produk Opname</h3>
                <div className="flex items-center gap-2">
                   <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">{filteredItems.length} Produk</span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">No</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Produk</th>
                      <th className={cn("px-8 py-5 text-[10px] font-bold text-center", currentStage === 1 ? "text-[#8b7365] bg-[#8b7365]/5" : "text-slate-400")}>Tahap 1</th>
                      <th className={cn("px-8 py-5 text-[10px] font-bold text-center", currentStage === 2 ? "text-[#8b7365] bg-[#8b7365]/5" : "text-slate-400")}>Tahap 2</th>
                      <th className={cn("px-8 py-5 text-[10px] font-bold text-center", currentStage === 3 ? "text-[#8b7365] bg-[#8b7365]/5" : "text-slate-400")}>Tahap 3</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredItems.map((item, f_idx) => {
                      const idx = opnameItems.findIndex(oi => oi.product_id === item.product_id);
                      return (
                        <tr key={item.product_id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5 text-center">
                            <span className="text-xs font-black text-slate-400 font-mono tracking-tighter">#{f_idx + 1}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                  <img src={products.find(p => p.id === item.product_id)?.image_url || 'https://via.placeholder.com/40'} className="w-full h-full object-contain" alt="" />
                               </div>
                               <div>
                                  <p className="text-[9px] font-black text-[#8b7365] uppercase mb-0.5">{item.brand}</p>
                                  <h4 className="text-sm font-black text-slate-800 leading-tight">{item.product_name}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PLU: {item.plu}</p>
                               </div>
                            </div>
                          </td>
                          <td className={cn("px-8 py-5", currentStage === 1 && "bg-[#8b7365]/5")}>
                            <input 
                              id={`input-1-${f_idx}`}
                              type="number" 
                              value={item.stage1}
                              disabled={isFinalized || currentStage !== 1}
                              onChange={e => handleInputChange(idx, 1, e.target.value)}
                              onKeyDown={e => handleInputKeyDown(e, f_idx, 1)}
                              className={cn(
                                "w-20 mx-auto block p-3 rounded-2xl text-center font-black font-mono text-sm outline-none transition-all focus:scale-110 focus:shadow-lg",
                                currentStage === 1 ? "bg-white border-2 border-[#8b7365] shadow-sm text-[#8b7365]" : "bg-transparent border border-transparent text-slate-400"
                              )}
                            />
                          </td>
                          <td className={cn("px-8 py-5", currentStage === 2 && "bg-[#8b7365]/5")}>
                            <input 
                              id={`input-2-${f_idx}`}
                              type="number" 
                              value={item.stage2}
                              disabled={isFinalized || currentStage !== 2}
                              onChange={e => handleInputChange(idx, 2, e.target.value)}
                              onKeyDown={e => handleInputKeyDown(e, f_idx, 2)}
                              className={cn(
                                "w-20 mx-auto block p-3 rounded-2xl text-center font-black font-mono text-sm outline-none transition-all focus:scale-110 focus:shadow-lg",
                                currentStage === 2 ? "bg-white border-2 border-[#8b7365] shadow-sm text-[#8b7365]" : "bg-transparent border border-transparent text-slate-400"
                              )}
                            />
                          </td>
                          <td className={cn("px-8 py-5", currentStage === 3 && "bg-[#8b7365]/5")}>
                            <input 
                              id={`input-3-${f_idx}`}
                              type="number" 
                              value={item.stage3}
                              disabled={isFinalized || currentStage !== 3}
                              onChange={e => handleInputChange(idx, 3, e.target.value)}
                              onKeyDown={e => handleInputKeyDown(e, f_idx, 3)}
                              className={cn(
                                "w-20 mx-auto block p-3 rounded-2xl text-center font-black font-mono text-sm outline-none transition-all focus:scale-110 focus:shadow-lg",
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
          </>
        ) ) : (
          <div className="space-y-8">
            {/* Analytics Dashboard - Top 10 Losses */}
            {sessions.length > 0 && (() => {
              const problemItemsList: any[] = [];
              unfilteredSessions.forEach(s => {
                s.items_data?.forEach((item: any) => {
                  if (item.diff < 0) {
                    problemItemsList.push({
                      name: item.product_name,
                      brand: item.brand,
                      plu: item.plu,
                      qty: Math.abs(item.diff),
                      nominal: Math.abs(item.nominal || 0),
                      session_code: s.session_code,
                      date: s.created_at
                    });
                  }
                });
              });

              const sortedLosses = problemItemsList
                .sort((a, b) => b[lossSortMode] - a[lossSortMode]);
              
              const displayLosses = sortedLosses.slice(0, showAllLosses ? 10 : 5);

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden"
                >
                  <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white text-rose-500 rounded-2xl flex items-center justify-center shadow-sm">
                        <TrendingUp className="w-6 h-6 rotate-180" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-none mb-1">Daftar Pengawasan Inventaris</h3>
                        <p className="text-xs font-medium text-slate-400">Barang dengan akumulasi kehilangan tertinggi ({lossSortMode === 'nominal' ? 'Nominal' : 'Unit'})</p>
                      </div>
                    </div>

                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
                      <button 
                        onClick={() => setLossSortMode('nominal')}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[12px] font-bold transition-all",
                          lossSortMode === 'nominal' ? "bg-[#8b7365] text-white shadow-lg shadow-[#8b7365]/20" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Nominal
                      </button>
                      <button 
                        onClick={() => setLossSortMode('qty')}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[12px] font-bold transition-all",
                          lossSortMode === 'qty' ? "bg-[#8b7365] text-white shadow-lg shadow-[#8b7365]/20" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Unit
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-5 text-xs font-bold text-slate-400 w-12 text-center">No</th>
                          <th className="px-8 py-5 text-xs font-bold text-slate-400">Detail Produk</th>
                          <th className="px-8 py-5 text-xs font-bold text-slate-400 text-center">Total Unit Hilang</th>
                          <th className="px-8 py-5 text-xs font-bold text-slate-400 text-right">Potensi Kerugian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {displayLosses.map((item, i) => (
                          <tr key={i} className="hover:bg-rose-50/20 transition-all group">
                            <td className="px-8 py-5 text-center">
                              <span className="text-xs font-black text-slate-300 font-mono">#{i + 1}</span>
                            </td>
                            <td className="px-8 py-5">
                              <div>
                                <h4 className="text-sm font-black text-slate-800 leading-tight mb-0.5">{item.name}</h4>
                                <div className="flex items-center gap-2">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.brand} | PLU: {item.plu}</p>
                                   <span className="text-[9px] font-black text-[#8b7365]/40 uppercase">•</span>
                                   <p className="text-[10px] font-black text-[#8b7365]/60 uppercase">{item.session_code || 'Manual'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">-{item.qty} Unit</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-right font-black text-rose-600 font-mono text-sm">
                              -{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.nominal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sortedLosses.length > 5 && (
                    <div className="p-4 bg-slate-50/50 border-t border-slate-50 flex justify-center">
                      <button 
                        onClick={() => setShowAllLosses(!showAllLosses)}
                        className="flex items-center gap-2 text-[10px] font-black text-[#8b7365] uppercase tracking-widest hover:text-[#7a6458] transition-all"
                      >
                        {showAllLosses ? 'Lihat Lebih Sedikit' : `Lihat Semua (${Math.min(10, sortedLosses.length)} Item)`}
                        <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showAllLosses ? "-rotate-90" : "rotate-90")} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })()}

            <div className="bg-white rounded-[48px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 text-[#8b7365] rounded-2xl flex items-center justify-center">
                        <History className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">Riwayat Sesi Finalisasi</h3>
                   </div>
                   
                   <div className="relative min-w-[300px]">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text" 
                        value={historySearchQuery}
                        onChange={e => setHistorySearchQuery(e.target.value)}
                        placeholder="Cari Kode Seri atau Nama..."
                        className="w-full pl-12 pr-5 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-300 focus:ring-2 focus:ring-[#8b7365]/20 transition-all"
                      />
                   </div>
                </div>

                <div className="divide-y divide-slate-50">
                  {sessions.length === 0 ? (
                    <div className="p-24 text-center">
                      <div className="w-20 h-20 bg-slate-50 text-slate-200 flex items-center justify-center rounded-[32px] mx-auto mb-6">
                        <Package className="w-10 h-10" />
                      </div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Belum ada riwayat sesi opname</p>
                    </div>
                  ) : (
                    sessions.map((session, idx) => (
                      <div key={session.id} className="p-10 hover:bg-slate-50/50 transition-all flex flex-col gap-10">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                               <div className="w-14 h-14 bg-[#8b7365]/10 text-[#8b7365] rounded-3xl flex items-center justify-center shadow-inner">
                                  <CheckCircle2 className="w-7 h-7" />
                               </div>
                               <div>
                                  <p className="text-xs font-semibold text-slate-400 mb-1">
                                     {new Date(session.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                     <span className="mx-2 opacity-50">•</span>
                                     Pukul {new Date(session.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <h4 className="text-xl font-bold text-slate-800 tracking-tight leading-none">Sesi Opname Selesai</h4>
                                  {session.session_code && (
                                     <p className="text-[10px] font-bold text-[#8b7365] bg-[#8b7365]/5 px-2 py-0.5 rounded mt-2 inline-block">
                                        Kode: {session.session_code}
                                     </p>
                                  )}
                               </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                               <div className="px-6 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 text-center min-w-[140px]">
                                  <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Penyesuaian Nilai</p>
                                  <p className={cn(
                                    "text-base font-bold font-mono",
                                    session.total_nominal_diff >= 0 ? "text-emerald-600" : "text-rose-600"
                                  )}>
                                     {session.total_nominal_diff >= 0 ? '+' : ''}
                                     {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(session.total_nominal_diff)}
                                  </p>
                               </div>
                               <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 text-center min-w-[100px]">
                                  <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Item Minus</p>
                                  <p className="text-base font-bold text-rose-600">{session.items_minus_count} Produk</p>
                               </div>
                               <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 text-center min-w-[100px]">
                                  <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Item Surplus</p>
                                  <p className="text-base font-bold text-emerald-600">{session.items_surplus_count} Produk</p>
                               </div>
                            </div>
                         </div>

                         <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100 gap-6">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-200">
                                  <ShieldCheck className="w-6 h-6 text-[#8b7365]" />
                               </div>
                               <div>
                                  <p className="text-[11px] font-semibold text-slate-400 leading-none mb-1">Diproses Oleh</p>
                                  <h5 className="text-sm font-bold text-slate-800 leading-none">
                                     {session.processor_name} <span className="text-xs font-medium text-slate-400 ml-2">({session.processor_role})</span>
                                  </h5>
                               </div>
                            </div>
                            
                            <div className="flex gap-3">
                               <button 
                                 onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
                                 className={cn(
                                    "px-6 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2",
                                    expandedSessionId === session.id 
                                       ? "bg-[#8b7365] text-white shadow-xl shadow-[#8b7365]/20" 
                                       : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                 )}
                               >
                                 <motion.div
                                    animate={{ rotate: expandedSessionId === session.id ? 90 : 0 }}
                                 >
                                    <ChevronRight className="w-4 h-4" />
                                 </motion.div>
                                 {expandedSessionId === session.id ? 'Tutup Detail' : 'Lihat Detail Barang'}
                               </button>
                            </div>
                         </div>

                         {/* Expandable Details Table */}
                         <AnimatePresence>
                            {expandedSessionId === session.id && (
                               <motion.div
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 className="overflow-hidden"
                               >
                                  <div className="pt-2">
                                     <div className="bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl">
                                        <table className="w-full text-left border-collapse">
                                           <thead>
                                              <tr className="bg-slate-800/50">
                                                 <th className="px-8 py-5 text-xs font-semibold text-slate-500">Detail Produk</th>
                                                 <th className="px-8 py-5 text-xs font-semibold text-slate-500 text-center">Stok Sistem</th>
                                                 <th className="px-8 py-5 text-xs font-semibold text-slate-500 text-center">Hasil Update</th>
                                                 <th className="px-8 py-5 text-xs font-semibold text-slate-500 text-center">Selisih</th>
                                                 <th className="px-8 py-5 text-xs font-semibold text-slate-500 text-right">Nilai Nominal</th>
                                              </tr>
                                           </thead>
                                           <tbody className="divide-y divide-slate-800">
                                              {session.items_data?.filter((item: any) => item.diff !== 0).map((item: any, i_idx: number) => (
                                                 <tr key={i_idx} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-8 py-5">
                                                       <div>
                                                          <h4 className="text-xs font-black text-white leading-tight mb-1">{item.product_name}</h4>
                                                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">PLU: {item.plu} | {item.brand}</p>
                                                       </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-center text-xs font-bold text-slate-400 font-mono">
                                                       {item.expected_stock}
                                                    </td>
                                                    <td className="px-8 py-5 text-center text-xs font-black text-slate-200 font-mono">
                                                       {item.finalCount}
                                                    </td>
                                                    <td className="px-8 py-5 text-center">
                                                       <span className={cn(
                                                          "px-3 py-1 rounded-lg text-[11px] font-black font-mono",
                                                          item.diff > 0 ? "bg-blue-500/10 text-blue-400" : "bg-rose-500/10 text-rose-400"
                                                       )}>
                                                          {item.diff > 0 ? '+' : ''}{item.diff}
                                                       </span>
                                                    </td>
                                                    <td className={cn(
                                                       "px-8 py-5 text-right font-black font-mono text-xs",
                                                       item.diff > 0 ? "text-blue-400" : "text-rose-400"
                                                    )}>
                                                       {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.nominal)}
                                                    </td>
                                                 </tr>
                                              ))}
                                              {session.items_data?.filter((item: any) => item.diff !== 0).length === 0 && (
                                                 <tr>
                                                    <td colSpan={5} className="px-8 py-10 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                                                       Tidak ada selisih stok ditemukan
                                                    </td>
                                                 </tr>
                                              )}
                                           </tbody>
                                        </table>
                                     </div>
                                  </div>
                               </motion.div>
                            )}
                         </AnimatePresence>
                      </div>
                    ))
                  )}
                </div>
            </div>
          </div>
        )}
      </div>

      {/* PRINT VIEW (Portalled to Body) */}
      {createPortal(
        <div id="print-area" className="hidden print:block bg-white text-slate-900">
            {(opnameItems.length > 0 ? Array.from({ length: Math.ceil(opnameItems.length / 20) }) : [0]).map((_, pageIdx) => {
               const items = opnameItems.slice(pageIdx * 20, (pageIdx + 1) * 20);
               const isLastPage = pageIdx === Math.ceil(opnameItems.length / 20) - 1;
               
               return (
                  <div key={pageIdx} className="p-8 bg-white relative print-page" style={{ breakAfter: 'page', pageBreakAfter: 'always' }}>
                      <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                         <h1 className="text-2xl font-bold mb-0.5">
                            {printMode === 'blank' ? 'FORM HITUNG OPNAME' : 'LAPORAN HASIL OPNAME'}
                         </h1>
                         <p className="text-sm font-bold text-slate-800 mb-2">{storeName}</p>
                         <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <span>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            {sessionCode && (
                               <span className="text-slate-900 border-x-2 border-slate-900 px-4">
                                 KODE : {sessionCode}
                               </span>
                             )}
                             <span>Halaman {pageIdx + 1} dari {Math.max(1, Math.ceil(opnameItems.length / 20))}</span>
                         </div>
                    </div>

                      <table className="w-full border-collapse border-2 border-slate-900">
                         <thead>
                            <tr className="bg-slate-50">
                               <th className="border-2 border-slate-900 p-1.5 text-center text-[8px] uppercase font-black w-8">No</th>
                               <th className="border-2 border-slate-900 p-1.5 text-left text-[8px] uppercase font-black">INFO PRODUK</th>
                               {printMode === 'blank' ? (
                                  <th className="border-2 border-slate-900 p-1.5 text-center text-[8px] uppercase font-black w-32">KOLOM HITUNG</th>
                               ) : (
                                  <>
                                     <th className="border-2 border-slate-900 p-1.5 text-center text-[8px] uppercase font-black w-16">H-1</th>
                                     <th className="border-2 border-slate-900 p-1.5 text-center text-[8px] uppercase font-black w-16">H-2</th>
                                     <th className="border-2 border-slate-900 p-1.5 text-center text-[8px] uppercase font-black w-16">H-3</th>
                                     <th className="border-2 border-slate-900 p-1.5 text-center text-[8px] uppercase font-black w-16">SELISIH</th>
                                     <th className="border-2 border-slate-900 p-1.5 text-right text-[8px] uppercase font-black w-48">NOMINAL & CATATAN</th>
                                  </>
                               )}
                            </tr>
                         </thead>
                         <tbody>
                            {items.map((item, idx) => (
                               <tr key={item.product_id} className="h-10">
                                  <td className="border-2 border-slate-900 p-1.5 text-center font-mono text-[9px] font-black">
                                     {pageIdx * 20 + idx + 1}
                                  </td>
                                  <td className="border-2 border-slate-900 p-1.5">
                                     <p className="text-[9px] font-black uppercase leading-none mb-0.5">{item.product_name}</p>
                                     <p className="text-[7px] font-bold text-slate-500 leading-none">PLU: {item.plu} | {item.brand}</p>
                                  </td>
                                  {printMode === 'blank' ? (
                                     <td colSpan={2} className="border-2 border-slate-900 p-1.5"></td>
                                  ) : (
                                     <>
                                        <td className="border-2 border-slate-900 p-1.5 text-center font-mono font-black text-[9px] w-16">{item.stage1}</td>
                                        <td className="border-2 border-slate-900 p-1.5 text-center font-mono font-black text-[9px] w-16">{item.stage2}</td>
                                        <td className="border-2 border-slate-900 p-1.5 text-center font-mono font-black text-[9px] w-16">{item.stage3}</td>
                                        <td className={cn(
                                          "border-2 border-slate-900 p-1.5 text-center font-mono font-black text-[9px] w-16",
                                          item.status === 'success' ? (item.difference === 0 ? "text-slate-900" : (item.difference > 0 ? "text-blue-600" : "text-rose-600")) : ""
                                        )}>
                                          {item.status === 'success' ? (item.difference > 0 ? `+${item.difference}` : item.difference) : ''}
                                        </td>
                                        <td className={cn(
                                          "border-2 border-slate-900 p-1.5 text-right font-mono font-black text-[9px] w-48",
                                          item.status === 'success' && item.difference < 0 ? "text-rose-600" : (item.difference > 0 ? "text-blue-600" : "text-rose-600")
                                        )}>
                                          {(() => {
                                             const price = products.find(p => p.id === item.product_id)?.price || 0;
                                             const value = item.difference * price;
                                             return item.status === 'success' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) : '';
                                          })()}
                                        </td>
                                     </>
                                  )}
                               </tr>
                            ))}
                             {(!isLastPage || items.length < 5) && Array.from({ length: Math.max(0, (isLastPage ? 5 : 20) - items.length) }).map((_, i) => (
                                <tr key={`empty-${i}`} className="h-10">
                                   <td className="border-2 border-slate-900 p-1.5 text-center font-mono text-[9px] font-black"></td>
                                   <td className="border-2 border-slate-900 p-1.5"></td>
                                   {printMode === 'result' ? (
                                      <>
                                         <td className="border-2 border-slate-900 p-1.5 w-16"></td>
                                         <td className="border-2 border-slate-900 p-1.5 w-16"></td>
                                         <td className="border-2 border-slate-900 p-1.5 w-16"></td>
                                         <td className="border-2 border-slate-900 p-1.5 w-16"></td>
                                         <td className="border-2 border-slate-900 p-1.5 w-48"></td>                                      </>
                                   ) : (
                                      <>
                                         <td className="border-2 border-slate-900 p-1.5"></td>
                                         <td className="border-2 border-slate-900 p-1.5"></td>
                                      </>
                                   )}
                                </tr>
                             ))}
                             {isLastPage && printMode === 'result' && (
                                <tr className="h-12 bg-slate-50">
                                   <td colSpan={6} className="border-2 border-slate-900 p-2 text-right text-[10px] font-bold bg-slate-900 text-white">
                                      Total Penyesuaian Nilai Inventaris:
                                   </td>
                                   <td className="border-2 border-slate-900 p-2 text-right font-mono font-black text-[12px] bg-slate-100">
                                      {(() => {
                                         const activeItems = opnameItems.filter(i => i.status === 'success');
                                         const total = activeItems.reduce((acc, curr) => {
                                            const price = products.find(p => p.id === curr.product_id)?.price || 0;
                                            return acc + (curr.difference * price);
                                         }, 0);
                                         return (
                                            <span className={total < 0 ? "text-rose-600" : "text-blue-600"}>
                                               {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(total)}
                                            </span>
                                         );
                                      })()}
                                   </td>
                                </tr>
                             )}
                         </tbody>
                      </table>

                      {isLastPage && (
                       <div className="mt-12 grid grid-cols-3 gap-12">
                          <div className="text-center">
                             <div className="h-16 border-b-2 border-slate-900 mb-2 flex flex-col justify-end">
                                <p className="text-[11px] font-black text-slate-800 mb-1">
                                   {staffInfo.admin}
                                </p>
                             </div>
                             <p className="text-[9px] font-bold text-slate-400">
                                {staffLabels.admin}
                             </p>
                          </div>
                          <div className="text-center">
                             <div className="h-16 border-b-2 border-slate-900 mb-2 flex flex-col justify-end">
                                <p className="text-[11px] font-black text-slate-800 mb-1">
                                   {staffInfo.staff}
                                </p>
                             </div>
                             <p className="text-[9px] font-bold text-slate-400">
                                {staffLabels.staff}
                             </p>
                          </div>
                          <div className="text-center">
                             <div className="h-16 border-b-2 border-slate-900 mb-2 flex flex-col justify-end">
                                <p className="text-[11px] font-black text-slate-800 mb-1">
                                   {staffInfo.manager}
                                </p>
                             </div>
                             <p className="text-[9px] font-bold text-slate-400">
                                {staffLabels.manager}
                             </p>
                          </div>
                       </div>
                    )}
                  </div>
               );
            })}
        </div>,
        document.body
      )}

      {/* Detail Modal for Watch Item */}
      <AnimatePresence>
        {selectedWatchItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedWatchItem(null)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-2xl bg-white rounded-[48px] shadow-2xl overflow-hidden"
             >
                <div className="p-10">
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-inner">
                            <AlertCircle className="w-8 h-8" />
                         </div>
                         <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">{selectedWatchItem.name.replace('ADJ: ', '')}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detail Riwayat Kehilangan Stok</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => setSelectedWatchItem(null)}
                        className="w-10 h-10 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all"
                      >
                         <Plus className="w-6 h-6 rotate-45" />
                      </button>
                   </div>

                   <div className="bg-slate-50 rounded-[32px] overflow-hidden border border-slate-100">
                      <table className="w-full text-left border-collapse">
                         <thead>
                            <tr className="bg-slate-100/50">
                               <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal Sesi</th>
                               <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty Hilang</th>
                               <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Nilai Kerugian</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {history.filter(session => 
                               session.items?.some((item: any) => item.name === selectedWatchItem.name && item.quantity < 0)
                            ).map((session, idx) => {
                               const item = session.items.find((i: any) => i.name === selectedWatchItem.name);
                               const qty = Math.abs(item.quantity);
                               const product = products.find(p => p.name === item.name.replace('ADJ: ', ''));
                               const price = product?.price || 15000;
                               
                               return (
                                  <tr key={idx} className="hover:bg-white transition-colors">
                                     <td className="px-8 py-5">
                                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                           {new Date(session.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pukul {new Date(session.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                     </td>
                                     <td className="px-8 py-5 text-center">
                                        <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">-{qty}</span>
                                     </td>
                                     <td className="px-8 py-5 text-right font-black text-slate-800 text-xs">
                                        -{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(qty * price)}
                                     </td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>

                   <div className="mt-8 flex items-center justify-between p-6 bg-[#8b7365]/5 rounded-3xl border border-[#8b7365]/10">
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Kerugian Item Ini</p>
                         <h4 className="text-lg font-black text-[#8b7365] tracking-tight">
                            -{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedWatchItem.stats.qty * selectedWatchItem.stats.price)}
                         </h4>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Kuantitas</p>
                         <h4 className="text-lg font-black text-slate-800 tracking-tight">{selectedWatchItem.stats.qty} Unit</h4>
                      </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          /* Hide non-essential UI */
          .no-print, aside, header, nav, button, .flex-none, .fixed { 
            display: none !important; 
          }
          
          /* Reset ALL ancestors to allow the page to grow and break */
          html, body, #root, main, section, .motion-container {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* The print area itself */
          #print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            z-index: 9999 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: visible !important;
            background: white !important;
          }

          .print-page {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            min-height: 290mm;
            height: auto !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 40px !important;
            background: white !important;
          }

          /* Table density for print */
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          @page { 
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
