import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, ShoppingBag, CreditCard, 
  Banknote, Search, Download,
  ChevronRight, Package, Clock, X, FileText, Gift, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import LoadingScreen from '../components/LoadingScreen';
import DatePicker from '../components/ui/DatePicker';

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

import { UserProfile } from '../types';

export default function SalesRevenue({ userProfile }: { userProfile: UserProfile }) {
  const isAdmin = userProfile?.role === 'admin' || (userProfile?.role as string) === 'owner';
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [dailyTargetAmount, setDailyTargetAmount] = useState(5000000);
  const [focusItemsConfig, setFocusItemsConfig] = useState<any[]>([
    { name: 'Aqua 600ml (Isi 24)', target: 50 },
    { name: 'Minyak Kita 1L', target: 50 },
    { name: 'Beras Premium 5kg', target: 50 }
  ]);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'debit' | 'qris'>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [activeCampaign, setActiveCampaign] = useState<any>(null);
  const [campaignProducts, setCampaignProducts] = useState<any[]>([]);
  const [posSettings, setPosSettings] = useState({ storeName: 'LILY MART', slogan: 'Layanan Terbaik dari Kami', address: 'GROGOL, KEDIRI', phone: '0812-3456-7890' });

  useEffect(() => {
    const saved = localStorage.getItem('pos_branding_settings');
    if (saved) setPosSettings(JSON.parse(saved));
    fetchSales(); fetchStoreSettings(); fetchProducts(); fetchCampaignData();
  }, []);

  const fetchCampaignData = async () => { try { const c = await api.getActiveCampaign(userProfile.company_id!); if (c) { setActiveCampaign(c); setCampaignProducts(await api.getCampaignProducts(c.id)); } } catch {} };
  const fetchProducts = async () => { try { setAvailableProducts(await api.getProducts(userProfile.company_id!)); } catch {} };
  const fetchStoreSettings = async () => { try { const s = await api.getStoreSettings(userProfile.company_id!); if (s.daily_sales_target) setDailyTargetAmount(s.daily_sales_target.amount || 5000000); if (s.focus_items) setFocusItemsConfig(s.focus_items); } catch {} };
  const saveStoreSettings = async () => { setIsSavingTargets(true); try { await api.updateStoreSetting(userProfile.company_id!, 'daily_sales_target', { amount: dailyTargetAmount }); await api.updateStoreSetting(userProfile.company_id!, 'focus_items', focusItemsConfig); toast.success('Target diperbarui'); setIsTargetModalOpen(false); } catch { toast.error('Gagal menyimpan'); } finally { setIsSavingTargets(false); } };

  useEffect(() => { setCurrentPage(1); }, [selectedDate, searchQuery, filterMethod]);
  const fetchSales = async () => { setIsLoading(true); try { setSales(await api.getSales(userProfile.company_id!)); } catch { toast.error('Gagal memuat penjualan'); } finally { setIsLoading(false); } };

  const filteredSales = useMemo(() => sales.filter(s => {
    const d = new Date(s.created_at).toISOString().split('T')[0];
    return d === selectedDate && s.id.toString().toLowerCase().includes(searchQuery.toLowerCase()) && (filterMethod === 'all' || s.payment_method === filterMethod);
  }), [sales, selectedDate, searchQuery, filterMethod]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((a, s) => a + s.total_amount, 0);
    const cashRevenue = filteredSales.filter(s => s.payment_method === 'cash').reduce((a, s) => a + s.total_amount, 0);
    const digitalRevenue = totalRevenue - cashRevenue;
    const targetProgress = Math.min((totalRevenue / dailyTargetAmount) * 100, 100);
    const itemSales: Record<string, number> = {};
    filteredSales.forEach(sale => { sale.items?.forEach((item: any) => { if (!item.is_metadata) { const n = item.name || 'Produk'; itemSales[n] = (itemSales[n] || 0) + (item.qty || item.quantity || 0); } }); });
    const focusItems = focusItemsConfig.map(c => { const sold = itemSales[c.name] || 0; return { name: c.name, sold, target: c.target, progress: Math.min((sold / c.target) * 100, 100) }; });
    return { totalRevenue, totalTransactions: filteredSales.length, cashRevenue, digitalRevenue, targetProgress, focusItems };
  }, [filteredSales, dailyTargetAmount, focusItemsConfig]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = useMemo(() => filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredSales, currentPage]);

  if (isLoading && sales.length === 0) {
    return <LoadingScreen page="sales" />;
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-stone-50 dark:bg-stone-950">
      <style>{`@media print { body > * { visibility: hidden !important; } .ReportPrintArea, .ReportPrintArea *, .ReceiptPrintArea, .ReceiptPrintArea * { visibility: visible !important; } .ReportPrintArea, .ReceiptPrintArea { position: fixed !important; left: 0; top: 0; width: 100%; padding: 24px !important; background: white !important; } .no-print { display: none !important; } }`}</style>

      {/* Header */}
      <div className="px-6 md:px-8 pt-6 pb-4 flex items-center justify-between gap-4 no-print shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Sales Report</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Pantau performa penjualan harian.</p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker value={selectedDate} onChange={(v) => setSelectedDate(v || new Date().toISOString().split('T')[0])} size="sm" align="right" />
          {isAdmin && (
            <button onClick={() => setIsTargetModalOpen(true)} className="px-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Target
            </button>
          )}
          <button onClick={() => setIsReportModalOpen(true)} className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Rekap
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 no-print">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Omzet', value: `Rp ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, extra: `${stats.targetProgress.toFixed(0)}% target` },
            { label: 'Transaksi', value: String(stats.totalTransactions), icon: ShoppingBag, extra: 'hari ini' },
            { label: 'Tunai', value: `Rp ${stats.cashRevenue.toLocaleString()}`, icon: Banknote, extra: 'cash' },
            { label: 'Digital', value: `Rp ${stats.digitalRevenue.toLocaleString()}`, icon: CreditCard, extra: 'QRIS/debit' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <stat.icon className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                <span className="text-xs text-stone-400 dark:text-stone-500">{stat.extra}</span>
              </div>
              <p className="text-xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{stat.value}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Target progress */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">Progress target harian</span>
            <span className="text-sm text-stone-500 dark:text-stone-400 tabular-nums">{stats.targetProgress.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${stats.targetProgress}%` }} />
          </div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-2 tabular-nums">Rp {stats.totalRevenue.toLocaleString()} / Rp {dailyTargetAmount.toLocaleString()}</p>
        </div>

        {/* Focus Items */}
        {stats.focusItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-3">Item Fokus</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.focusItems.map((item, i) => (
                <div key={i} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-200 truncate pr-2">{item.name}</p>
                    <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums shrink-0">{item.sold}/{item.target}</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-stone-700 dark:bg-stone-300 rounded-full transition-all duration-500" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign Impact */}
        {activeCampaign && campaignProducts.length > 0 && (
          <div className="mb-6">
            <div className="mb-3">
              <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200">Kampanye Aktif: {activeCampaign.name}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {campaignProducts.slice(0, 6).map((cp: any) => {
                const soldQty = filteredSales.reduce((acc, sale) => { sale.items?.forEach((item: any) => { if (!item.is_metadata && (item.product_id === cp.product_id || item.name === cp.name)) acc += (item.qty || item.quantity || 0); }); return acc; }, 0);
                const promoLabel = cp.promo_type === 'b1g1' ? 'B1G1' : cp.promo_type === 'b2g1' ? 'B2G1' : cp.promo_type === 'buy_x_get_y' ? `B${cp.buy_qty}G${cp.get_qty}` : `${Math.round((1 - (cp.promo_price || 0) / (cp.price || 1)) * 100)}% off`;
                return (
                  <div key={cp.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{promoLabel}</span>
                      <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">{soldQty} terjual</span>
                    </div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">{cp.name}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{cp.brand}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari ID transaksi..." className="w-full pl-9 pr-3 py-2 bg-stone-100 dark:bg-stone-800 border-none rounded-lg text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" />
            </div>
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg">
              {(['all', 'cash', 'debit', 'qris'] as const).map((m) => (
                <button key={m} onClick={() => setFilterMethod(m)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", filterMethod === m ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200")}>
                  {m === 'all' ? 'Semua' : m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">ID</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Waktu</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Metode</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Item</th>
                  <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {isLoading ? [...Array(5)].map((_, i) => (<tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 bg-stone-100 dark:bg-stone-800 rounded animate-pulse" /></td></tr>)) : paginatedSales.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center"><ShoppingBag className="w-6 h-6 mx-auto mb-2 text-stone-300 dark:text-stone-600" /><p className="text-sm text-stone-400 dark:text-stone-500">Tidak ada transaksi</p></td></tr>
                ) : paginatedSales.map((sale) => (
                  <tr key={sale.id} onClick={() => setSelectedSale(sale)} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5"><span className="font-mono text-xs text-stone-700 dark:text-stone-300">#{sale.id.toString().slice(-6).toUpperCase()}</span></td>
                    <td className="px-5 py-3.5"><div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400"><Clock className="w-3 h-3" />{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></td>
                    <td className="px-5 py-3.5"><span className={cn("text-xs font-medium px-2 py-0.5 rounded", sale.payment_method === 'cash' ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400")}>{sale.payment_method === 'cash' ? 'Tunai' : sale.payment_method.toUpperCase()}</span></td>
                    <td className="px-5 py-3.5 text-right"><span className="text-xs text-stone-600 dark:text-stone-400 tabular-nums">{sale.items?.reduce((a: number, i: any) => i.is_metadata ? a : a + (i.qty || i.quantity || 0), 0) || 0}</span></td>
                    <td className="px-5 py-3.5 text-right"><span className="text-sm font-medium text-stone-900 dark:text-stone-100 tabular-nums">Rp {sale.total_amount.toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <p className="text-xs text-stone-500 dark:text-stone-400">{filteredSales.length} transaksi · Hal {currentPage}/{totalPages}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4 rotate-180" /></button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex justify-end">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors"><Download className="w-3.5 h-3.5" /> Export CSV</button>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReportModalOpen(false)} className="absolute inset-0 bg-black/40 no-print" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh] z-10">
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between no-print">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Rekap Harian</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{new Date(selectedDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
                </div>
                <button onClick={() => setIsReportModalOpen(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 ReportPrintArea">
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-lg"><p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Tunai</p><p className="text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">Rp {stats.cashRevenue.toLocaleString()}</p></div>
                  <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-lg"><p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Digital</p><p className="text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">Rp {stats.digitalRevenue.toLocaleString()}</p></div>
                  <div className="p-4 bg-stone-900 dark:bg-stone-100 rounded-lg"><p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Total</p><p className="text-sm font-semibold text-white dark:text-stone-900 tabular-nums">Rp {stats.totalRevenue.toLocaleString()}</p></div>
                </div>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-3">Per Kasir</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(filteredSales.reduce((acc: any, sale: any) => { const meta = sale.items?.find((i: any) => i.is_metadata); const c = meta?.cashier_name || 'Kasir'; acc[c] = (acc[c] || 0) + (sale.total_amount || 0); return acc; }, {})).map(([cashier, total]: [string, any], i) => (
                      <div key={i} className="p-3 bg-stone-50 dark:bg-stone-800 rounded-lg"><p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{cashier}</p><p className="text-sm font-medium text-stone-900 dark:text-stone-100 tabular-nums">Rp {total.toLocaleString()}</p></div>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-3">Rincian Item</h3>
                  <table className="w-full text-left">
                    <thead><tr className="border-b border-stone-200 dark:border-stone-700"><th className="py-2 text-xs font-medium text-stone-500 dark:text-stone-400">Produk</th><th className="py-2 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Qty</th><th className="py-2 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Subtotal</th></tr></thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {Object.entries(filteredSales.reduce((acc: any, sale: any) => { sale.items?.forEach((item: any) => { if (item.is_metadata) return; const n = item.name || 'Produk'; if (!acc[n]) acc[n] = { qty: 0, price: item.price || 0 }; acc[n].qty += (item.qty || item.quantity || 0); }); return acc; }, {})).map(([name, data]: [string, any], i) => (
                        <tr key={i}><td className="py-2 text-sm text-stone-700 dark:text-stone-300">{name}</td><td className="py-2 text-sm text-stone-500 dark:text-stone-400 text-right tabular-nums">{data.qty}</td><td className="py-2 text-sm font-medium text-stone-900 dark:text-stone-100 text-right tabular-nums">Rp {(data.qty * data.price).toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-stone-900 dark:border-stone-100"><td colSpan={2} className="py-3 text-sm font-semibold text-stone-900 dark:text-stone-100">Total</td><td className="py-3 text-base font-semibold text-stone-900 dark:text-stone-100 text-right tabular-nums">Rp {stats.totalRevenue.toLocaleString()}</td></tr></tfoot>
                  </table>
                </div>
              </div>
              <div className="p-4 border-t border-stone-200 dark:border-stone-800 no-print">
                <button onClick={() => { document.title = `Laporan_${selectedDate}`; window.print(); setTimeout(() => { document.title = 'myStore Studio'; }, 100); }} className="w-full py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Cetak / Download PDF</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Target Modal */}
      <AnimatePresence>
        {isTargetModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTargetModalOpen(false)} className="absolute inset-0 bg-black/40" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[85vh] z-10">
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div><h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Pengaturan Target</h2><p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Atur target omzet dan item fokus.</p></div>
                <button onClick={() => setIsTargetModalOpen(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Target omzet harian (Rp)</label>
                  <input type="number" value={dailyTargetAmount} onChange={e => setDailyTargetAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent tabular-nums" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Item fokus</label>
                    <button onClick={() => setFocusItemsConfig([...focusItemsConfig, { name: '', target: 50 }])} className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium">+ Tambah</button>
                  </div>
                  <div className="space-y-2">
                    {focusItemsConfig.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <button onClick={() => { setEditingIndex(idx); setIsProductPickerOpen(true); }} className="flex-1 px-3 py-2 bg-stone-100 dark:bg-stone-800 rounded-lg text-sm text-left text-stone-700 dark:text-stone-200 truncate hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">{item.name || 'Pilih produk...'}</button>
                        <input type="number" value={item.target} onChange={e => { const c = [...focusItemsConfig]; c[idx].target = Number(e.target.value); setFocusItemsConfig(c); }} className="w-16 px-2 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-center text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 tabular-nums" />
                        <button onClick={() => setFocusItemsConfig(focusItemsConfig.filter((_, i) => i !== idx))} className="p-1.5 text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex gap-2 justify-end">
                <button onClick={() => setIsTargetModalOpen(false)} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
                <button onClick={saveStoreSettings} disabled={isSavingTargets} className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50">{isSavingTargets ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Picker */}
      <AnimatePresence>
        {isProductPickerOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProductPickerOpen(false)} className="absolute inset-0 bg-black/40" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[70vh] z-10">
              <div className="p-4 border-b border-stone-200 dark:border-stone-800">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" /><input autoFocus value={pickerSearchQuery} onChange={e => setPickerSearchQuery(e.target.value)} placeholder="Cari produk..." className="w-full pl-9 pr-3 py-2 bg-stone-100 dark:bg-stone-800 border-none rounded-lg text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" /></div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                {availableProducts.filter(p => p.name.toLowerCase().includes(pickerSearchQuery.toLowerCase())).map(product => (
                  <button key={product.id} onClick={() => { if (editingIndex !== null) { const c = [...focusItemsConfig]; c[editingIndex].name = product.name; setFocusItemsConfig(c); setIsProductPickerOpen(false); setPickerSearchQuery(''); } }} className="w-full px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{product.name}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">Rp {product.price?.toLocaleString()} · Stok: {product.stock}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {selectedSale && (() => {
          const items = (selectedSale.items || []).filter((i: any) => !i.is_metadata);
          const cashier = selectedSale.items?.find((i: any) => i.is_metadata)?.cashier_name || 'Admin';
          // Compute totals based on item snapshots
          const originalTotal = items.reduce((acc: number, it: any) => {
            const qty = it.qty || it.quantity || 0;
            const normal = it.original_price ?? it.price ?? 0;
            return acc + normal * qty;
          }, 0);
          const totalDiscount = Math.max(0, originalTotal - selectedSale.total_amount);
          return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSale(null)} className="absolute inset-0 bg-black/40 no-print" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[85vh] z-10 ReceiptPrintArea">
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between no-print">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Detail Transaksi</h3>
                <button onClick={() => setSelectedSale(null)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="text-center mb-4 pb-4 border-b border-dashed border-stone-200 dark:border-stone-700">
                  <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase">{posSettings.storeName}</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{posSettings.address}</p>
                </div>
                <div className="space-y-1 mb-4 pb-4 border-b border-dashed border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400">
                  <div className="flex justify-between"><span>No.</span><span className="font-mono">#{selectedSale.id.toString().toUpperCase()}</span></div>
                  <div className="flex justify-between"><span>Waktu</span><span>{new Date(selectedSale.created_at).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between"><span>Kasir</span><span>{cashier}</span></div>
                </div>
                <div className="space-y-2 mb-4 pb-4 border-b border-dashed border-stone-200 dark:border-stone-700">
                  {items.map((item: any, idx: number) => {
                    const qty = item.qty || item.quantity || 0;
                    const normal = item.original_price ?? item.price ?? 0;
                    const lineNormal = normal * qty;
                    const after = item.is_free_item ? 0 : (item.price ?? normal);
                    const lineDiscount = item.is_free_item
                      ? lineNormal
                      : Math.max(0, (normal - after) * qty);
                    return (
                      <div key={idx} className="flex justify-between text-sm">
                        <div className="min-w-0 pr-2">
                          <p className="text-stone-800 dark:text-stone-200">{item.name || 'Produk'}</p>
                          <p className="text-xs text-stone-400 dark:text-stone-500">{qty} × Rp {normal.toLocaleString()}</p>
                          {lineDiscount > 0 && (
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                              Diskon{item.campaign_name ? ` ${item.campaign_name}` : ''}: − Rp {lineDiscount.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums shrink-0">Rp {lineNormal.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between text-stone-700 dark:text-stone-300"><span>Subtotal (harga normal)</span><span className="tabular-nums">Rp {originalTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between text-stone-700 dark:text-stone-300"><span>Total diskon</span><span className="tabular-nums">− Rp {totalDiscount.toLocaleString()}</span></div>
                  <div className="flex justify-between font-semibold text-stone-900 dark:text-stone-100 pt-1 border-t border-dashed border-stone-200 dark:border-stone-700 mt-1"><span>Total</span><span className="tabular-nums">Rp {selectedSale.total_amount.toLocaleString()}</span></div>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400 pt-1"><span>{selectedSale.payment_method === 'cash' ? 'Tunai' : selectedSale.payment_method.toUpperCase()}</span><span className="tabular-nums">Rp {(selectedSale.payment_amount || selectedSale.total_amount).toLocaleString()}</span></div>
                  {selectedSale.payment_method !== 'cash' && selectedSale.payment_ref && (
                    <div className="flex justify-between text-stone-600 dark:text-stone-400"><span>Ref / Trace</span><span className="font-mono">{selectedSale.payment_ref}</span></div>
                  )}
                  {selectedSale.change_amount > 0 && <div className="flex justify-between text-stone-600 dark:text-stone-400"><span>Kembali</span><span className="tabular-nums">Rp {selectedSale.change_amount.toLocaleString()}</span></div>}
                </div>
                <div className="text-center pt-4 border-t border-dashed border-stone-200 dark:border-stone-700"><p className="text-xs text-stone-400 dark:text-stone-500">{posSettings.slogan}</p></div>
              </div>
              <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 no-print">
                <button onClick={() => { document.title = `Struk_${selectedSale.id}`; window.print(); setTimeout(() => { document.title = 'myStore Studio'; }, 100); }} className="flex-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Cetak</button>
                <button onClick={() => setSelectedSale(null)} className="flex-1 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Tutup</button>
              </div>
            </motion.div>
          </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
