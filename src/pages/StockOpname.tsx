import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardCheck, Printer, Save, CheckCircle2, AlertCircle, Trash2, RotateCcw,
  ChevronRight, ChevronDown, ChevronUp, TrendingUp, Package, Search, FileText, Clock, History,
  ShieldCheck, PlayCircle, Zap, X, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import LoadingScreen from '../components/LoadingScreen';
import Select from '../components/ui/Select';

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
  status: 'pending' | 'warning' | 'ok' | 'success';
}

import { UserProfile } from '../types';

const TIME_RANGE_OPTIONS = [
  { value: 'daily', label: 'Hari' },
  { value: 'monthly', label: 'Bulan' },
  { value: 'yearly', label: 'Tahun' },
];

const TAB_OPTIONS = [
  { id: 'info', label: 'Informasi' },
  { id: 'new', label: 'Sesi Baru' },
  { id: 'history', label: 'Riwayat' },
] as const;

export default function StockOpname({ userProfile }: { userProfile: UserProfile }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const handleInputKeyDown = (e: React.KeyboardEvent, index: number, stage: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = document.getElementById(`input-${stage}-${index + 1}`) as HTMLInputElement | null;
      if (next) { next.focus(); next.select(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = document.getElementById(`input-${stage}-${index - 1}`) as HTMLInputElement | null;
      if (prev) { prev.focus(); prev.select(); }
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
    staff: 'Saksi Lapangan',
  });
  const [staffInfo, setStaffInfo] = useState({ admin: '', manager: '', staff: '' });

  const [activeTab, setActiveTab] = useState<'info' | 'new' | 'history'>('info');
  const [sessions, setSessions] = useState<any[]>([]);
  const [unfilteredSessions, setUnfilteredSessions] = useState<any[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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
      const settings = await api.getStoreSettings(userProfile.company_id!);
      if (settings.store_name) setStoreName(settings.store_name);

      const users = await api.getUsers(userProfile.company_id!);
      const m = users.find((u: any) => u.role?.toLowerCase() === 'manager');
      const a = users.find((u: any) => u.role?.toLowerCase() === 'administrator');
      const s = users.find((u: any) => u.role?.toLowerCase() === 'kasir');

      setStaffInfo({
        manager: m ? m.name : '...........................',
        admin: a ? a.name : '...........................',
        staff: s ? s.name : '...........................',
      });
      setStaffLabels({
        manager: m ? m.role : 'Manager',
        admin: a ? a.role : 'Administrator',
        staff: s ? s.role : 'Kasir',
      });
    } catch (e) {}
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getOpnameSessions(userProfile.company_id!);
      setUnfilteredSessions(data);

      const filtered = data.filter((s: any) => {
        const matchesSearch = !historySearchQuery ||
          (s.session_code && s.session_code.toLowerCase().includes(historySearchQuery.toLowerCase())) ||
          (s.processor_name && s.processor_name.toLowerCase().includes(historySearchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        const sessionDate = new Date(s.created_at);
        const y = sessionDate.getFullYear();
        const mm = String(sessionDate.getMonth() + 1).padStart(2, '0');
        const dd = String(sessionDate.getDate()).padStart(2, '0');
        const sessionDateStr = `${y}-${mm}-${dd}`;

        if (timeRange === 'daily') return sessionDateStr === selectedDate;
        if (timeRange === 'monthly') return sessionDateStr.substring(0, 7) === selectedDate.substring(0, 7);
        return sessionDateStr.substring(0, 4) === selectedDate.substring(0, 4);
      });

      setSessions(filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e) {
      console.error(e);
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
      ...item, stage1: '', stage2: '', stage3: '', difference: 0, status: 'pending',
    })));
    setCurrentStage(1);
    setIsFinalized(false);
    toast.success(`Sesi ${code} dimulai`);
  };

  const exitSession = () => {
    setIsSessionActive(false);
    setSessionCode(null);
    setOpnameItems(prev => prev.map(item => ({
      ...item, stage1: '', stage2: '', stage3: '', difference: 0, status: 'pending',
    })));
    setCurrentStage(1);
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProducts(userProfile.company_id!);
      setProducts(data);
      const items: OpnameItem[] = data.map((p: any) => ({
        product_id: p.id,
        product_name: p.name,
        brand: p.brand,
        plu: p.plu,
        expected_stock: p.stock || 0,
        stage1: '', stage2: '', stage3: '',
        difference: 0,
        status: 'pending',
      }));
      setOpnameItems(items);
    } catch (e) {
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
    setTimeout(() => {
      setOpnameItems(prev => prev.map(item => {
        let count: number | null = null;
        if (currentStage === 1 && item.stage1 !== '') count = Number(item.stage1);
        else if (currentStage === 2 && item.stage2 !== '') count = Number(item.stage2);
        else if (currentStage === 3 && item.stage3 !== '') count = Number(item.stage3);
        if (count === null) return item;
        return { ...item, status: 'success', difference: count - item.expected_stock };
      }));
      setIsLoading(false);
      setShowConfirmModal(false);
      setPrintMode('result');
      setShowPrintResultModal(true);
      toast.success(`Hasil tahap ${currentStage} diproses`);
    }, 800);
  };

  const nextStage = () => {
    if (currentStage < 3) {
      setCurrentStage(currentStage + 1);
      toast.success(`Lanjut ke tahap ${currentStage + 1}`);
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
        .filter(i => i.stage1 !== '' || i.stage2 !== '' || i.stage3 !== '')
        .map(item => {
          const finalCount = item.stage3 !== '' ? Number(item.stage3) : (item.stage2 !== '' ? Number(item.stage2) : Number(item.stage1));
          const diff = finalCount - item.expected_stock;
          const price = products.find(p => p.id === item.product_id)?.price || 0;
          return { ...item, finalCount, diff, nominal: diff * price };
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
          await api.updateProduct(item.product_id, { stock: item.finalCount, company_id: userProfile.company_id });
          await api.addSupplyHistory({
            product_id: item.product_id,
            product_name: item.product_name,
            brand: item.brand,
            plu: item.plu,
            quantity: item.diff,
            supplier: 'STOCK OPNAME',
            salesman: 'SYSTEM',
            unit: 'pcs',
            company_id: userProfile.company_id,
            created_at: new Date().toISOString(),
          });
        }
      }

      const currentAdmin = await api.getUsers(userProfile.company_id!).then(users => users.find((u: any) => u.username === localStorage.getItem('username')) || users[0]);
      await api.addOpnameSession({
        processor_name: currentAdmin?.name || 'Administrator',
        processor_role: currentAdmin?.role || 'Admin',
        total_nominal_diff: totalNominalDiff,
        total_qty_diff: totalQtyDiff,
        items_surplus_count: surplusCount,
        items_minus_count: minusCount,
        items_data: finishedItems,
        session_code: sessionCode || 'SO-MANUAL',
        company_id: userProfile.company_id,
      });

      setIsFinalized(true);
      setIsSessionActive(false);
      setPrintMode('result');
      setShowFinalizePrint(true);
      toast.success('Stock opname difinalisasi');
    } catch (e) {
      console.error(e);
      toast.error('Gagal memfinalisasi');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSession = () => {
    setShowResetConfirm(false);
    setIsFinalized(false);
    setCurrentStage(1);
    fetchProducts();
    setActiveTab('new');
  };

  const filteredItems = opnameItems.filter(item =>
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.plu.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && products.length === 0) {
    return <LoadingScreen page="stock-opname" />;
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-stone-50 dark:bg-stone-950 overflow-hidden relative">
      <AnimatePresence>
        {isLoading && products.length > 0 && (
          <LoadingScreen fullScreen page="stock-opname" message="Memproses data opname..." subMessage="Sinkronisasi dengan server cloud." />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 md:px-8 pt-6 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-10 no-print shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Stock Opname</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Rekonsiliasi stok fisik dengan data sistem.</p>
          <div className="flex items-center gap-1 mt-3 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg w-fit">
            {TAB_OPTIONS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                    : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {activeTab === 'new' ? (
            <>
              {isFinalized && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Sesi baru
                </button>
              )}
              <button
                onClick={() => { setPrintMode('blank'); setTimeout(() => window.print(), 100); }}
                className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Form kosong
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isFinalized || !isSessionActive}
                className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap className="w-3.5 h-3.5" /> Review tahap {currentStage}
              </button>
              {currentStage < 3 && !isFinalized && isSessionActive && (
                <button
                  onClick={nextStage}
                  className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5"
                >
                  Tahap {currentStage + 1} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={finalizeOpname}
                disabled={isFinalized || currentStage < 3 || !isSessionActive}
                className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Finalisasi
              </button>
            </>
          ) : activeTab === 'history' ? (
            <div className="flex items-center gap-2">
              <Select
                value={timeRange}
                onChange={(v) => setTimeRange(v as any)}
                options={TIME_RANGE_OPTIONS}
                size="sm"
                className="min-w-[110px]"
              />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 no-print">
        {activeTab === 'info' ? <InfoTab onStart={() => setActiveTab('new')} onHistory={() => setActiveTab('history')} /> : null}

        {activeTab === 'new' && !isSessionActive && (
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl py-16 px-6 text-center">
            <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center mx-auto mb-4 text-stone-500 dark:text-stone-400">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">Belum ada sesi aktif</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-5 max-w-sm mx-auto">Mulai sesi baru untuk melakukan perhitungan stok fisik dengan kode seri unik.</p>
            <button
              onClick={() => setShowStartModal(true)}
              className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors inline-flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" /> Mulai sesi
            </button>
          </div>
        )}

        {activeTab === 'new' && isSessionActive && (
          <>
            {/* Session bar */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-5 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Sesi aktif</p>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 font-mono truncate">{sessionCode}</p>
                </div>
              </div>
              <button
                onClick={exitSession}
                className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-md text-xs font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" /> Batalkan sesi
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatCard icon={<Package className="w-3.5 h-3.5" />} label="Total produk" value={String(products.length)} />
              <StatCard icon={<AlertCircle className="w-3.5 h-3.5" />} label="Selisih stok" value={`${opnameItems.filter(i => i.difference !== 0 && i.status === 'success').length} item`} />
              <StatCard icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Sesuai" value={`${opnameItems.filter(i => i.difference === 0 && i.status === 'success').length} item`} />
              <StatCard icon={<Clock className="w-3.5 h-3.5" />} label="Tahap" value={isFinalized ? 'Selesai' : `Tahap ${currentStage}`} />
            </div>

            {/* Opname Table */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari produk..."
                    className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border-none rounded-md text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                  />
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">{filteredItems.length} dari {opnameItems.length}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                      <th className="px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 w-10 text-right">#</th>
                      <th className="px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Produk</th>
                      {[1, 2, 3].map(s => (
                        <th
                          key={s}
                          className={cn(
                            "px-4 py-3 text-xs font-medium text-center",
                            currentStage === s
                              ? "text-stone-900 dark:text-stone-100 bg-stone-100/80 dark:bg-stone-800"
                              : "text-stone-500 dark:text-stone-400",
                          )}
                        >
                          Tahap {s}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-center">Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {filteredItems.map((item, fIdx) => {
                      const idx = opnameItems.findIndex(o => o.product_id === item.product_id);
                      return (
                        <tr key={item.product_id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors">
                          <td className="px-4 py-3 text-right text-xs text-stone-400 dark:text-stone-500 font-mono">{fIdx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{item.brand}</p>
                            <p className="text-sm text-stone-900 dark:text-stone-100">{item.product_name}</p>
                            <p className="text-[11px] text-stone-400 dark:text-stone-500 font-mono mt-0.5">PLU {item.plu}</p>
                          </td>
                          {[1, 2, 3].map(s => (
                            <td
                              key={s}
                              className={cn(
                                "px-4 py-3 text-center",
                                currentStage === s && "bg-stone-50 dark:bg-stone-800/40",
                              )}
                            >
                              <input
                                id={`input-${s}-${fIdx}`}
                                type="number"
                                value={(item as any)[`stage${s}`]}
                                disabled={isFinalized || currentStage !== s}
                                onChange={e => handleInputChange(idx, s, e.target.value)}
                                onKeyDown={e => handleInputKeyDown(e, fIdx, s)}
                                className={cn(
                                  "w-20 px-2 py-1 text-sm text-center font-mono tabular-nums rounded-md transition-colors focus:outline-none focus:ring-2",
                                  currentStage === s
                                    ? "bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                                    : "bg-transparent border border-transparent text-stone-400 dark:text-stone-500",
                                )}
                              />
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center">
                            {item.status === 'success' ? (
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium tabular-nums",
                                item.difference === 0
                                  ? "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                                  : item.difference < 0
                                    ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                                    : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
                              )}>
                                {item.difference > 0 && '+'}
                                {item.difference}
                              </span>
                            ) : (
                              <span className="text-xs text-stone-400 dark:text-stone-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <HistoryView
            sessions={sessions}
            unfilteredSessions={unfilteredSessions}
            historySearchQuery={historySearchQuery}
            setHistorySearchQuery={setHistorySearchQuery}
            lossSortMode={lossSortMode}
            setLossSortMode={setLossSortMode}
            showAllLosses={showAllLosses}
            setShowAllLosses={setShowAllLosses}
            expandedSessionId={expandedSessionId}
            setExpandedSessionId={setExpandedSessionId}
          />
        )}
      </div>

      {/* Start Session Modal */}
      <ConfirmModal
        open={showStartModal}
        onClose={() => setShowStartModal(false)}
        onConfirm={startSession}
        icon={<PlayCircle className="w-5 h-5" />}
        title="Mulai sesi opname?"
        description="Sistem akan membuat kode seri unik untuk sesi ini. Pastikan semua transaksi hari ini sudah selesai diinput."
        confirmLabel="Mulai sesi"
      />

      <ConfirmModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={processResults}
        icon={<AlertCircle className="w-5 h-5" />}
        title={`Proses hasil tahap ${currentStage}?`}
        description={`Data tahap ${currentStage} akan dikunci dan tidak bisa diubah lagi setelah diproses.`}
        confirmLabel="Ya, proses"
      />

      <ConfirmModal
        open={showFinalizeConfirm}
        onClose={() => setShowFinalizeConfirm(false)}
        onConfirm={finalizeOpname}
        icon={<ShieldCheck className="w-5 h-5" />}
        title="Finalisasi sesi?"
        description="Stok sistem akan disesuaikan secara permanen berdasarkan perhitungan tahap terakhir. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, finalisasi"
      />

      <ConfirmModal
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={resetSession}
        icon={<RotateCcw className="w-5 h-5" />}
        title="Mulai sesi baru?"
        description="Data yang belum difinalisasi akan hilang."
        confirmLabel="Ya, mulai baru"
      />

      <PrintResultModal
        open={showPrintResultModal}
        onClose={() => setShowPrintResultModal(false)}
        title="Hasil tahap berhasil diproses"
        description={`Data tahap ${currentStage} sudah tersimpan. Cetak laporan untuk arsip fisik bila perlu.`}
        onPrint={() => { setPrintMode('result'); setTimeout(() => window.print(), 100); }}
      />

      <PrintResultModal
        open={showFinalizePrint}
        onClose={() => setShowFinalizePrint(false)}
        title="Stock opname selesai"
        description="Sesi telah difinalisasi dan stok sistem sudah diperbarui. Cetak laporan akhir untuk arsip."
        onPrint={() => { setPrintMode('result'); setTimeout(() => window.print(), 100); }}
      />

      {/* PRINT VIEW (Portalled to Body) */}
      {createPortal(
        <div id="print-area" className="hidden print:block bg-white text-stone-900">
          {(opnameItems.length > 0 ? Array.from({ length: Math.ceil(opnameItems.length / 20) }) : [0]).map((_, pageIdx) => {
            const items = opnameItems.slice(pageIdx * 20, (pageIdx + 1) * 20);
            const isLastPage = pageIdx === Math.ceil(opnameItems.length / 20) - 1;

            return (
              <div key={pageIdx} className="p-8 bg-white relative print-page" style={{ breakAfter: 'page', pageBreakAfter: 'always' }}>
                <div className="text-center border-b-2 border-stone-900 pb-4 mb-6">
                  <h1 className="text-2xl font-bold mb-0.5">{printMode === 'blank' ? 'FORM HITUNG OPNAME' : 'LAPORAN HASIL OPNAME'}</h1>
                  <p className="text-sm font-bold text-stone-900 mb-2">{storeName}</p>
                  <div className="flex justify-between items-center text-xs font-bold text-stone-500">
                    <span>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {sessionCode && (
                      <span className="text-stone-900 border-x-2 border-stone-900 px-4">KODE: {sessionCode}</span>
                    )}
                    <span>Halaman {pageIdx + 1} dari {Math.max(1, Math.ceil(opnameItems.length / 20))}</span>
                  </div>
                </div>

                <table className="w-full border-collapse border-2 border-stone-900">
                  <thead>
                    <tr className="bg-stone-100">
                      <th className="border-2 border-stone-900 p-1.5 text-center text-[10px] font-bold w-8">No</th>
                      <th className="border-2 border-stone-900 p-1.5 text-left text-[10px] font-bold">INFO PRODUK</th>
                      {printMode === 'blank' ? (
                        <th className="border-2 border-stone-900 p-1.5 text-center text-[10px] font-bold w-32">KOLOM HITUNG</th>
                      ) : (
                        <>
                          <th className="border-2 border-stone-900 p-1.5 text-center text-[10px] font-bold w-16">H-1</th>
                          <th className="border-2 border-stone-900 p-1.5 text-center text-[10px] font-bold w-16">H-2</th>
                          <th className="border-2 border-stone-900 p-1.5 text-center text-[10px] font-bold w-16">H-3</th>
                          <th className="border-2 border-stone-900 p-1.5 text-center text-[10px] font-bold w-16">SELISIH</th>
                          <th className="border-2 border-stone-900 p-1.5 text-right text-[10px] font-bold w-48">NOMINAL</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.product_id} className="h-10">
                        <td className="border-2 border-stone-900 p-1.5 text-center font-mono text-xs">{pageIdx * 20 + idx + 1}</td>
                        <td className="border-2 border-stone-900 p-1.5">
                          <p className="text-xs font-medium leading-none mb-0.5">{item.product_name}</p>
                          <p className="text-[7px] text-stone-500 leading-none">PLU {item.plu} | {item.brand}</p>
                        </td>
                        {printMode === 'blank' ? (
                          <td colSpan={2} className="border-2 border-stone-900 p-1.5"></td>
                        ) : (
                          <>
                            <td className="border-2 border-stone-900 p-1.5 text-center font-mono text-xs">{item.stage1}</td>
                            <td className="border-2 border-stone-900 p-1.5 text-center font-mono text-xs">{item.stage2}</td>
                            <td className="border-2 border-stone-900 p-1.5 text-center font-mono text-xs">{item.stage3}</td>
                            <td className={cn(
                              "border-2 border-stone-900 p-1.5 text-center font-mono text-xs",
                              item.status === 'success' && item.difference !== 0 ? (item.difference > 0 ? "text-emerald-700" : "text-red-700") : "",
                            )}>
                              {item.status === 'success' ? (item.difference > 0 ? `+${item.difference}` : item.difference) : ''}
                            </td>
                            <td className={cn(
                              "border-2 border-stone-900 p-1.5 text-right font-mono text-xs",
                              item.status === 'success' && item.difference < 0 ? "text-red-700" : (item.difference > 0 ? "text-emerald-700" : ""),
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
                        <td className="border-2 border-stone-900 p-1.5"></td>
                        <td className="border-2 border-stone-900 p-1.5"></td>
                        {printMode === 'result' ? (
                          <>
                            <td className="border-2 border-stone-900 p-1.5"></td>
                            <td className="border-2 border-stone-900 p-1.5"></td>
                            <td className="border-2 border-stone-900 p-1.5"></td>
                            <td className="border-2 border-stone-900 p-1.5"></td>
                            <td className="border-2 border-stone-900 p-1.5"></td>
                          </>
                        ) : (
                          <>
                            <td className="border-2 border-stone-900 p-1.5"></td>
                            <td className="border-2 border-stone-900 p-1.5"></td>
                          </>
                        )}
                      </tr>
                    ))}
                    {isLastPage && printMode === 'result' && (
                      <tr className="h-12 bg-stone-100">
                        <td colSpan={6} className="border-2 border-stone-900 p-2 text-right text-xs font-bold bg-stone-900 text-white">
                          Total penyesuaian:
                        </td>
                        <td className="border-2 border-stone-900 p-2 text-right font-mono text-xs bg-stone-100">
                          {(() => {
                            const total = opnameItems.filter(i => i.status === 'success').reduce((acc, curr) => {
                              const price = products.find(p => p.id === curr.product_id)?.price || 0;
                              return acc + (curr.difference * price);
                            }, 0);
                            return (
                              <span className={total < 0 ? "text-red-700" : "text-emerald-700"}>
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
                    {[
                      { name: staffInfo.admin, label: staffLabels.admin },
                      { name: staffInfo.staff, label: staffLabels.staff },
                      { name: staffInfo.manager, label: staffLabels.manager },
                    ].map((s, i) => (
                      <div key={i} className="text-center">
                        <div className="h-16 border-b-2 border-stone-900 mb-2 flex flex-col justify-end">
                          <p className="text-xs font-medium text-stone-900 mb-1">{s.name}</p>
                        </div>
                        <p className="text-xs font-bold text-stone-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>,
        document.body,
      )}

      <style>{`
        @media print {
          .no-print, aside, header, nav, button, .flex-none, .fixed { display: none !important; }
          html, body, #root, main, section, .motion-container { height: auto !important; overflow: visible !important; display: block !important; position: static !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          #print-area { display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; z-index: 9999 !important; width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; visibility: visible !important; background: white !important; }
          .print-page { display: block !important; position: relative !important; width: 100% !important; min-height: 290mm; height: auto !important; page-break-after: always !important; break-after: page !important; padding: 40px !important; background: white !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mb-1.5">
        {icon}<span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{value}</p>
    </div>
  );
}

function InfoTab({ onStart, onHistory }: { onStart: () => void; onHistory: () => void }) {
  return (
    <div className="space-y-4 pt-2">
      {/* Hero card */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 relative overflow-hidden">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Mengenal Stock Opname</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed mb-4">
            Stock opname adalah kegiatan rekonsiliasi berkala untuk memastikan data stok di sistem digital selaras dengan jumlah fisik barang di gudang. Proses ini menjaga akurasi laporan keuangan dan ketersediaan barang.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={onStart} className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Mulai sesi baru</button>
            <button onClick={onHistory} className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">Lihat riwayat</button>
          </div>
        </div>
        <ClipboardCheck className="absolute -right-6 -bottom-6 w-32 h-32 text-stone-100 dark:text-stone-800 pointer-events-none" />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: <FileText className="w-4 h-4" />, title: '1. Persiapan', desc: 'Cetak formulir kosong dan lakukan perhitungan fisik di gudang.' },
          { icon: <TrendingUp className="w-4 h-4" />, title: '2. Verifikasi', desc: 'Masukkan hasil hitung ke sistem dengan validasi tiga tahap (triple check).' },
          { icon: <Save className="w-4 h-4" />, title: '3. Sinkronisasi', desc: 'Finalisasi untuk memperbarui stok digital dan mencatat riwayat.' },
        ].map((step, i) => (
          <div key={i} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5">
            <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 flex items-center justify-center mb-3">
              {step.icon}
            </div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">{step.title}</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-0.5">Tips akurasi</h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            Lakukan stock opname saat toko tutup atau arus barang minimal untuk menghindari selisih akibat transaksi yang sedang berjalan.
          </p>
        </div>
      </div>
    </div>
  );
}

interface HistoryViewProps {
  sessions: any[];
  unfilteredSessions: any[];
  historySearchQuery: string;
  setHistorySearchQuery: (v: string) => void;
  lossSortMode: 'nominal' | 'qty';
  setLossSortMode: (v: 'nominal' | 'qty') => void;
  showAllLosses: boolean;
  setShowAllLosses: (v: boolean | ((p: boolean) => boolean)) => void;
  expandedSessionId: any;
  setExpandedSessionId: (v: any) => void;
}

function HistoryView({
  sessions,
  unfilteredSessions,
  historySearchQuery,
  setHistorySearchQuery,
  lossSortMode,
  setLossSortMode,
  showAllLosses,
  setShowAllLosses,
  expandedSessionId,
  setExpandedSessionId,
}: HistoryViewProps) {
  const problemItems: any[] = [];
  unfilteredSessions.forEach(s => {
    s.items_data?.forEach((item: any) => {
      if (item.diff < 0) {
        problemItems.push({
          name: item.product_name,
          brand: item.brand,
          plu: item.plu,
          qty: Math.abs(item.diff),
          nominal: Math.abs(item.nominal || 0),
          session_code: s.session_code,
          date: s.created_at,
        });
      }
    });
  });

  const sortedLosses = problemItems.sort((a, b) => b[lossSortMode] - a[lossSortMode]);
  const displayLosses = sortedLosses.slice(0, showAllLosses ? 10 : 5);

  return (
    <div className="space-y-4">
      {sortedLosses.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Pengawasan inventaris</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Item dengan akumulasi kehilangan tertinggi</p>
            </div>
            <div className="flex p-0.5 bg-stone-100 dark:bg-stone-800 rounded-md">
              {(['nominal', 'qty'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setLossSortMode(m)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium transition-colors",
                    lossSortMode === m
                      ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200",
                  )}
                >
                  {m === 'nominal' ? 'Nominal' : 'Unit'}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 w-10 text-right">#</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Produk</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Unit hilang</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Potensi kerugian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {displayLosses.map((item, i) => (
                  <tr key={i} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors">
                    <td className="px-5 py-3 text-right text-xs text-stone-400 dark:text-stone-500 font-mono">{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-stone-900 dark:text-stone-100">{item.name}</p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">{item.brand} · PLU {item.plu} · {item.session_code || 'Manual'}</p>
                    </td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums text-red-600 dark:text-red-400">−{item.qty}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums text-red-600 dark:text-red-400">
                      −{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.nominal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sortedLosses.length > 5 && (
            <button
              onClick={() => setShowAllLosses(v => !v)}
              className="w-full px-5 py-2.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/40 border-t border-stone-200 dark:border-stone-800 transition-colors"
            >
              {showAllLosses ? 'Tampilkan lebih sedikit' : `Lihat semua (${Math.min(10, sortedLosses.length)} item)`}
            </button>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-400 dark:text-stone-500" />
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Riwayat sesi</h3>
          </div>
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              value={historySearchQuery}
              onChange={e => setHistorySearchQuery(e.target.value)}
              placeholder="Cari kode atau nama..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border-none rounded-md text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
            />
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-8 h-8 mx-auto mb-3 text-stone-300 dark:text-stone-600" />
            <p className="text-sm text-stone-500 dark:text-stone-400">Belum ada riwayat sesi</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {sessions.map(session => (
              <div key={session.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {new Date(session.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      <span className="mx-1.5 text-stone-300 dark:text-stone-600">·</span>
                      {new Date(session.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
                      {session.session_code || 'Sesi opname'}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {session.processor_name} <span className="text-stone-400 dark:text-stone-500">· {session.processor_role}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-right">
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">Penyesuaian</p>
                      <p className={cn(
                        "text-sm font-semibold tabular-nums",
                        session.total_nominal_diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                      )}>
                        {session.total_nominal_diff >= 0 ? '+' : ''}
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(session.total_nominal_diff)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">Minus / Surplus</p>
                      <p className="text-sm tabular-nums">
                        <span className="text-red-600 dark:text-red-400">{session.items_minus_count}</span>
                        <span className="text-stone-400 dark:text-stone-500"> / </span>
                        <span className="text-emerald-600 dark:text-emerald-400">{session.items_surplus_count}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
                      className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-md text-xs font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5"
                    >
                      {expandedSessionId === session.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      Detail
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedSessionId === session.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-3"
                    >
                      <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                              <th className="px-4 py-2 text-[11px] font-medium text-stone-500 dark:text-stone-400">Produk</th>
                              <th className="px-4 py-2 text-[11px] font-medium text-stone-500 dark:text-stone-400 text-right">Sistem</th>
                              <th className="px-4 py-2 text-[11px] font-medium text-stone-500 dark:text-stone-400 text-right">Hasil</th>
                              <th className="px-4 py-2 text-[11px] font-medium text-stone-500 dark:text-stone-400 text-right">Selisih</th>
                              <th className="px-4 py-2 text-[11px] font-medium text-stone-500 dark:text-stone-400 text-right">Nilai</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {session.items_data?.filter((item: any) => item.diff !== 0).map((item: any, i: number) => (
                              <tr key={i} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30">
                                <td className="px-4 py-2">
                                  <p className="text-sm text-stone-900 dark:text-stone-100">{item.product_name}</p>
                                  <p className="text-[11px] text-stone-500 dark:text-stone-400">{item.brand} · PLU {item.plu}</p>
                                </td>
                                <td className="px-4 py-2 text-right text-sm tabular-nums text-stone-600 dark:text-stone-400">{item.expected_stock}</td>
                                <td className="px-4 py-2 text-right text-sm tabular-nums text-stone-900 dark:text-stone-100">{item.finalCount}</td>
                                <td className={cn(
                                  "px-4 py-2 text-right text-sm tabular-nums",
                                  item.diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                                )}>
                                  {item.diff > 0 ? '+' : ''}{item.diff}
                                </td>
                                <td className={cn(
                                  "px-4 py-2 text-right text-sm tabular-nums",
                                  item.nominal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                                )}>
                                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.nominal)}
                                </td>
                              </tr>
                            ))}
                            {(!session.items_data || session.items_data.filter((i: any) => i.diff !== 0).length === 0) && (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-xs text-stone-500 dark:text-stone-400">
                                  Tidak ada selisih stok
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
}

function ConfirmModal({ open, onClose, onConfirm, icon, title, description, confirmLabel }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800"
          >
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 flex items-center justify-center">
                  {icon}
                </div>
                <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{description}</p>
            </div>
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
              <button onClick={onConfirm} className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">{confirmLabel}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface PrintResultModalProps {
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
  title: string;
  description: string;
}

function PrintResultModal({ open, onClose, onPrint, title, description }: PrintResultModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800"
          >
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{description}</p>
            </div>
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Tutup</button>
              <button onClick={onPrint} className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Cetak
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
