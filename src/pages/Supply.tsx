import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Search, Plus, Minus, User, Calendar, Package, History, X, Trash2, Camera, Building2, FileText, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { UserProfile } from '../types';

interface Product { id: string; plu: string; name: string; brand: string; stock: number; unit: string; price: number; cost_price: number; image_url?: string; }
interface CartItem { product: Product; quantity: number; purchase_price: number; }
interface SupplyLog { id: string; product_id: string; product_name: string; brand: string; plu: string; quantity: number; salesman: string; supplier: string; invoice_image?: string; created_at: string; unit: string; }

export default function Supply({ userProfile }: { userProfile: UserProfile }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<SupplyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplier, setSupplier] = useState('');
  const [salesman, setSalesman] = useState('');
  const [invoiceImage, setInvoiceImage] = useState<string | null>(null);
  const [editingLogs, setEditingLogs] = useState<SupplyLog[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFullHistoryOpen, setIsFullHistoryOpen] = useState(false);
  const [fullHistoryFilter, setFullHistoryFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [fullHistoryDate, setFullHistoryDate] = useState('');
  const [fullHistorySearch, setFullHistorySearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [viewingInvoice, setViewingInvoice] = useState<string | null>(null);

  useEffect(() => { fetchInitialData(); }, []);
  const fetchInitialData = async () => { setIsLoading(true); try { const [p, h] = await Promise.all([api.getProducts(userProfile.company_id!), api.getSupplyHistory(userProfile.company_id!)]); setProducts(p); setHistory(h); } catch { toast.error('Gagal memuat data'); } finally { setIsLoading(false); } };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.plu?.toLowerCase().includes(searchTerm.toLowerCase()) || p.brand.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5);
  const addToCart = (p: Product) => { if (cart.find(i => i.product.id === p.id)) { toast.error('Produk sudah ada'); return; } setCart([...cart, { product: p, quantity: 1, purchase_price: p.cost_price || 0 }]); setSearchTerm(''); setIsSearching(false); };
  const updateCartQuantity = (id: string, qty: number) => setCart(cart.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, qty) } : i));
  const updateCartPrice = (id: string, price: number) => setCart(cart.map(i => i.product.id === id ? { ...i, purchase_price: Math.max(0, price) } : i));
  const removeFromCart = (id: string) => setCart(cart.filter(i => i.product.id !== id));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setInvoiceImage(r.result as string); r.readAsDataURL(f); } };

  const handleEditTransaction = (group: any) => {
    setSupplier(group.supplier); setSalesman(group.salesman); setInvoiceImage(group.invoice_image || null);
    const items: CartItem[] = group.items.map((item: any) => { const prod = products.find(p => p.plu === item.plu || p.name === item.product_name); return { product: prod || { id: item.product_id, name: item.product_name, brand: item.brand, plu: item.plu, stock: 0, unit: item.unit, price: 0, cost_price: 0 }, quantity: item.quantity, purchase_price: 0 }; });
    setCart(items);
    const d = new Date(group.created_at);
    setEditingLogs(history.filter(log => { const ld = new Date(log.created_at); return log.supplier === group.supplier && log.salesman === group.salesman && ld.getMinutes() === d.getMinutes() && ld.getHours() === d.getHours() && ld.getDate() === d.getDate(); }));
    setIsFullHistoryOpen(false); toast.success('Mode edit aktif'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTransaction = async (group: any) => {
    if (!confirm('Hapus transaksi ini? Stok akan dikurangi.')) return;
    setIsSubmitting(true);
    try {
      const d = new Date(group.created_at);
      const logs = history.filter(log => { const ld = new Date(log.created_at); return log.supplier === group.supplier && log.salesman === group.salesman && ld.getMinutes() === d.getMinutes() && ld.getHours() === d.getHours() && ld.getDate() === d.getDate(); });
      for (const log of logs) { const p = products.find(x => x.id === log.product_id); if (p) await api.decrementStock(p.id, log.quantity, userProfile.company_id!); await api.deleteSupplyHistory(log.id, userProfile.company_id!); }
      toast.success('Transaksi dihapus'); fetchInitialData();
    } catch { toast.error('Gagal menghapus'); } finally { setIsSubmitting(false); }
  };

  const handleSubmit = async () => {
    if (cart.length === 0 || !supplier || !salesman) { toast.error('Lengkapi supplier, salesman, dan minimal 1 produk'); return; }
    setIsSubmitting(true);
    try {
      if (editingLogs) { for (const old of editingLogs) { const p = products.find(x => x.id === old.product_id); if (p) await api.decrementStock(p.id, old.quantity, userProfile.company_id!); await api.deleteSupplyHistory(old.id, userProfile.company_id!); } }
      for (const item of cart) { await api.processInbound({ product_id: item.product.id, quantity: item.quantity, purchase_price: item.purchase_price, company_id: userProfile.company_id!, supplier, salesman, invoice_image: invoiceImage }); }
      toast.success(editingLogs ? 'Transaksi diperbarui' : 'Supply diproses'); setCart([]); setSupplier(''); setSalesman(''); setInvoiceImage(null); setEditingLogs(null); fetchInitialData();
    } catch { toast.error('Gagal memproses'); } finally { setIsSubmitting(false); }
  };

  const groupedFullHistory = useMemo(() => {
    const now = new Date();
    const filtered = history.filter(log => {
      const ld = new Date(log.created_at);
      let timeMatch = true;
      if (fullHistoryFilter === 'custom' && fullHistoryDate) timeMatch = ld.toLocaleDateString('id-ID') === new Date(fullHistoryDate).toLocaleDateString('id-ID');
      else if (fullHistoryFilter === 'today') timeMatch = ld.toDateString() === now.toDateString();
      else if (fullHistoryFilter === 'week') timeMatch = ld >= new Date(now.getTime() - 7 * 86400000);
      else if (fullHistoryFilter === 'month') timeMatch = ld >= new Date(now.getTime() - 30 * 86400000);
      const s = fullHistorySearch.toLowerCase();
      const searchMatch = !fullHistorySearch || log.supplier?.toLowerCase().includes(s) || log.salesman?.toLowerCase().includes(s) || log.product_name?.toLowerCase().includes(s) || log.plu?.toLowerCase().includes(s);
      return timeMatch && searchMatch;
    });
    const groups: Record<string, any> = {};
    filtered.forEach(log => { const d = new Date(log.created_at); const key = `${log.supplier}-${log.salesman}-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`; if (!groups[key]) groups[key] = { id: log.id, supplier: log.supplier, salesman: log.salesman, created_at: log.created_at, invoice_image: log.invoice_image, items: [] }; groups[key].items.push({ id: log.id, product_name: log.product_name, brand: log.brand, plu: log.plu, quantity: log.quantity, unit: log.unit }); });
    return Object.values(groups).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [history, fullHistoryFilter, fullHistorySearch, fullHistoryDate]);

  const totalPages = Math.ceil(groupedFullHistory.length / itemsPerPage);
  const paginatedHistory = groupedFullHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const recentHistory = history.slice(0, 8);

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><p className="text-sm text-stone-400 dark:text-stone-500">Memuat data...</p></div>;

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-stone-50 dark:bg-stone-950">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Supply Inbound</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Catat barang masuk dan kelola stok.</p>
        </div>
        <div className="flex items-center gap-2">
          {editingLogs && <button onClick={() => { setEditingLogs(null); setCart([]); setSupplier(''); setSalesman(''); setInvoiceImage(null); }} className="px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors flex items-center gap-1.5"><X className="w-3.5 h-3.5" /> Batal edit</button>}
          <button onClick={() => setIsFullHistoryOpen(true)} className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Riwayat</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Form & Cart */}
        <div className="xl:col-span-2 space-y-4">
          {/* Supplier/Salesman */}
          <div className={cn("bg-white dark:bg-stone-900 border rounded-lg p-5", editingLogs ? "border-amber-300 dark:border-amber-700" : "border-stone-200 dark:border-stone-800")}>
            {editingLogs && <span className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-3 block">Mode edit — merevisi transaksi sebelumnya</span>}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Supplier</label><input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="PT. Sumber Makmur" className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" /></div>
              <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Salesman</label><input value={salesman} onChange={e => setSalesman(e.target.value)} placeholder="Nama pembawa barang" className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" /></div>
            </div>
          </div>

          {/* Cart */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">Item Inbound ({cart.length})</h3>
              <div className="relative flex-1 max-w-xs ml-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setIsSearching(true); }} placeholder="Cari produk / PLU..." className="w-full pl-9 pr-3 py-2 bg-stone-100 dark:bg-stone-800 border-none rounded-lg text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" />
                {isSearching && searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg z-30 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                    {filteredProducts.length === 0 ? <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-3">Tidak ditemukan</p> : filteredProducts.map(p => (
                      <button key={p.id} onClick={() => addToCart(p)} className="w-full text-left px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-between">
                        <div><p className="text-sm text-stone-800 dark:text-stone-200">{p.name}</p><p className="text-xs text-stone-400 dark:text-stone-500">{p.brand} · PLU: {p.plu}</p></div>
                        <Plus className="w-3.5 h-3.5 text-stone-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center"><Package className="w-6 h-6 mx-auto mb-2 text-stone-300 dark:text-stone-600" /><p className="text-sm text-stone-400 dark:text-stone-500">Cari dan tambahkan produk</p></div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{item.product.name}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{item.product.brand}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 mb-0.5">Harga beli</span>
                        <input type="number" value={item.purchase_price} onChange={e => updateCartPrice(item.product.id, Number(e.target.value))} className="w-20 px-2 py-1 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded text-xs text-right text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 tabular-nums" />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-stone-400 dark:text-stone-500 mb-0.5">Qty</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded text-stone-500 dark:text-stone-300 text-xs"><Minus className="w-3 h-3" /></button>
                          <input type="number" value={item.quantity} onChange={e => updateCartQuantity(item.product.id, Number(e.target.value) || 1)} className="w-10 px-1 py-1 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded text-xs text-center text-stone-700 dark:text-stone-200 focus:outline-none tabular-nums" />
                          <button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded text-stone-500 dark:text-stone-300 text-xs"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="p-1.5 text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer: invoice + submit */}
            <div className="mt-5 pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center gap-3">
              <label className={cn("flex-1 h-10 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors relative", invoiceImage ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20" : "border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800")}>
                <Camera className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                <span className="text-xs text-stone-500 dark:text-stone-400">{invoiceImage ? 'Faktur terunggah' : 'Upload faktur'}</span>
                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
              </label>
              <button onClick={handleSubmit} disabled={isSubmitting || cart.length === 0} className="px-5 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {isSubmitting ? 'Memproses...' : editingLogs ? 'Simpan perubahan' : 'Simpan supply'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Recent History */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">Riwayat Terbaru</h3>
            <button onClick={() => setIsFullHistoryOpen(true)} className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium">Lihat semua →</button>
          </div>
          {recentHistory.length === 0 ? (
            <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">Belum ada riwayat</p>
          ) : (
            <div className="space-y-2">
              {recentHistory.map(log => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-stone-800 last:border-0">
                  <div className="min-w-0 pr-2">
                    <p className="text-sm text-stone-800 dark:text-stone-200 truncate">{log.product_name}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{log.supplier} · {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">+{log.quantity} {log.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full History Modal */}
      <AnimatePresence>
        {isFullHistoryOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFullHistoryOpen(false)} className="absolute inset-0 bg-black/40" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative bg-white dark:bg-stone-900 rounded-xl w-full max-w-5xl h-[85vh] shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col z-10">
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Riwayat Supply Inbound</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Semua transaksi barang masuk.</p>
                </div>
                <button onClick={() => setIsFullHistoryOpen(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              {/* Filters */}
              <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg">
                  {(['all', 'today', 'week', 'month'] as const).map(f => (
                    <button key={f} onClick={() => { setFullHistoryFilter(f); setFullHistoryDate(''); setCurrentPage(1); }} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", fullHistoryFilter === f ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm" : "text-stone-500 dark:text-stone-400")}>
                      {f === 'all' ? 'Semua' : f === 'today' ? 'Hari ini' : f === 'week' ? 'Minggu' : 'Bulan'}
                    </button>
                  ))}
                </div>
                <input type="date" value={fullHistoryDate} onChange={e => { setFullHistoryDate(e.target.value); setFullHistoryFilter('custom'); setCurrentPage(1); }} className="px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-700 dark:text-stone-200 focus:outline-none" />
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                  <input value={fullHistorySearch} onChange={e => { setFullHistorySearch(e.target.value); setCurrentPage(1); }} placeholder="Cari supplier / produk..." className="w-full pl-8 pr-3 py-1.5 bg-stone-100 dark:bg-stone-800 border-none rounded-lg text-xs text-stone-700 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" />
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-stone-50 dark:bg-stone-800/80 border-b border-stone-200 dark:border-stone-800">
                    <tr>
                      <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Waktu</th>
                      <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Supplier / Salesman</th>
                      <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Produk</th>
                      <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-center">Item</th>
                      <th className="px-5 py-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {paginatedHistory.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-stone-400 dark:text-stone-500">Tidak ada riwayat</td></tr>
                    ) : paginatedHistory.map((group: any) => (
                      <tr key={group.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors align-top">
                        <td className="px-5 py-3"><p className="text-sm text-stone-800 dark:text-stone-200">{new Date(group.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p><p className="text-xs text-stone-400 dark:text-stone-500">{new Date(group.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></td>
                        <td className="px-5 py-3"><p className="text-sm font-medium text-stone-800 dark:text-stone-200">{group.supplier}</p><p className="text-xs text-stone-400 dark:text-stone-500">{group.salesman}</p></td>
                        <td className="px-5 py-3"><div className="space-y-1">{group.items.slice(0, 3).map((item: any, i: number) => <p key={i} className="text-xs text-stone-600 dark:text-stone-300">{item.product_name} <span className="text-stone-400 dark:text-stone-500">({item.quantity} {item.unit})</span></p>)}{group.items.length > 3 && <p className="text-xs text-stone-400 dark:text-stone-500">+{group.items.length - 3} lagi</p>}</div></td>
                        <td className="px-5 py-3 text-center"><span className="text-sm font-medium text-stone-700 dark:text-stone-200">{group.items.length}</span></td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleEditTransaction(group)} className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors" title="Edit"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                            <button onClick={() => handleDeleteTransaction(group)} className="p-1.5 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                            {group.invoice_image && <button onClick={() => setViewingInvoice(group.invoice_image)} className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors" title="Faktur"><FileText className="w-3.5 h-3.5" /></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
                  <p className="text-xs text-stone-500 dark:text-stone-400">{groupedFullHistory.length} transaksi · Hal {currentPage}/{totalPages}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-md text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Preview */}
      <AnimatePresence>
        {viewingInvoice && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/80" onClick={() => setViewingInvoice(null)}>
            <motion.img initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} src={viewingInvoice} className="max-w-full max-h-full object-contain rounded-lg" />
            <button className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
