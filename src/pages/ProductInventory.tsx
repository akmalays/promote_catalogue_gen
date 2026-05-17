import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit2, Trash2, X, AlertCircle, Truck, ChevronDown, ChevronUp, Layers, Printer, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import LoadingScreen from '../components/LoadingScreen';
import toast from 'react-hot-toast';
import { UserProfile } from '../types';
import PriceTagDrawer from '../components/PriceTagDrawer';
import Select from '../components/ui/Select';
import { buildOffersForProduct, filterLiveCampaigns, offerLabel, PromoOffer, projectStockDays, stockDaysLabel, stockDaysTone } from '../lib/promo';

interface Product {
  id: string; name: string; brand: string; description: string; price: number; category: string; image_url: string; unit: string; plu: string; cost_price: number; stock?: number;
}

const CATEGORIES = ['All', 'Makanan', 'Minuman', 'Kardus', 'Kebutuhan Rumah', 'Perawatan Diri', 'Bayi & Anak', 'Peralatan'];

export default function ProductDatabase({ onNavigate, userProfile }: { onNavigate: (page: any) => void, userProfile: UserProfile }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [productSupplyHistory, setProductSupplyHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'supply' | 'sales' | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productSalesHistory, setProductSalesHistory] = useState<any[]>([]);
  const [isSalesHistoryLoading, setIsSalesHistoryLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPriceTagDrawerOpen, setIsPriceTagDrawerOpen] = useState(false);
  const [productForPriceTag, setProductForPriceTag] = useState<Product | null>(null);
  const [productOffers, setProductOffers] = useState<Map<string, PromoOffer[]>>(new Map());
  const [dailyAverages, setDailyAverages] = useState<Map<string, number>>(new Map());
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [promoDrawerProductId, setPromoDrawerProductId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({ name: '', brand: '', description: '', price: 0, category: 'Makanan', image_url: '', stock: 0, unit: 'pcs', plu: '', cost_price: 0 });

  useEffect(() => { fetchProducts(); fetchActivePromo(); fetchDailyAverages(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterCategory, onlyPromo]);

  const fetchProducts = async () => { setIsLoading(true); try { setProducts(await api.getProducts(userProfile.company_id!)); } catch { setProducts([]); } finally { setIsLoading(false); } };
  const fetchDailyAverages = async () => {
    try { setDailyAverages(await api.getDailyAverages(userProfile.company_id!)); }
    catch { setDailyAverages(new Map()); }
  };
  const fetchActivePromo = async () => {
    try {
      const all = await api.getActiveCampaigns(userProfile.company_id!);
      const live = filterLiveCampaigns(all);
      if (live.length === 0) { setProductOffers(new Map()); return; }
      const cps = await api.getCampaignProductsBulk(live.map(c => c.id));
      const byProduct = new Map<string, PromoOffer[]>();
      const seen = new Set<string>();
      cps.forEach(cp => seen.add(cp.product_id));
      seen.forEach(pid => byProduct.set(pid, buildOffersForProduct(pid, live, cps)));
      setProductOffers(byProduct);
    } catch {
      setProductOffers(new Map());
    }
  };

  const lowStockItems = products.filter(p => (p.stock || 0) < 10);

  const openDeleteModal = (p: Product, e: React.MouseEvent) => { e.stopPropagation(); setProductToDelete(p); setIsDeleteModalOpen(true); };
  const confirmDelete = async () => { if (!productToDelete) return; setIsDeleting(true); try { await api.deleteProduct(productToDelete.id, userProfile.company_id!); toast.success('Produk dihapus'); setIsDeleteModalOpen(false); setProductToDelete(null); fetchProducts(); } catch { toast.error('Gagal menghapus'); } finally { setIsDeleting(false); } };

  const handleSubmit = async () => {
    if (!formData.name || !formData.brand || !formData.price) { toast.error('Lengkapi data wajib (Nama, Merek, Harga)'); return; }
    setIsSubmitting(true);
    try { if (editingProduct) { await api.updateProduct(editingProduct.id, { ...formData, company_id: userProfile.company_id }); toast.success('Produk diperbarui'); } else { await api.addProduct({ ...formData, company_id: userProfile.company_id }); toast.success('Produk ditambahkan'); } setIsFormOpen(false); setEditingProduct(null); fetchProducts(); }
    catch { toast.error('Gagal menyimpan produk'); } finally { setIsSubmitting(false); }
  };

  const openAddForm = () => { setEditingProduct(null); setFormData({ name: '', brand: '', description: '', price: 0, category: 'Makanan', image_url: '', stock: 0, unit: 'pcs', plu: Math.floor(100000 + Math.random() * 900000).toString(), cost_price: 0 }); setIsFormOpen(true); };
  const openEditForm = (p: Product, e: React.MouseEvent) => { e.stopPropagation(); setEditingProduct(p); setFormData({ ...p }); setIsFormOpen(true); };

  useEffect(() => { if (isDetailOpen && viewingProduct) { fetchProductHistory(viewingProduct.id); } else { setExpandedSection(null); } }, [isDetailOpen, viewingProduct]);

  const fetchProductHistory = async (productId: string) => {
    setIsHistoryLoading(true); setIsSalesHistoryLoading(true);
    try { const h = await api.getSupplyHistory(userProfile.company_id!); setProductSupplyHistory(h.filter((x: any) => x.product_id === productId)); } catch {} finally { setIsHistoryLoading(false); }
    try { setProductSalesHistory(await api.getSalesByProduct(userProfile.company_id!, productId)); } catch {} finally { setIsSalesHistoryLoading(false); }
  };

  const openDetail = (p: Product) => { setViewingProduct(p); setIsDetailOpen(true); };

  const filteredProducts = products.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s) || (p.plu && p.plu.toLowerCase().includes(s));
    const matchesPromo = !onlyPromo || (productOffers.get(p.id)?.length ?? 0) > 0;
    return matchesSearch && matchesPromo && (filterCategory === 'All' || p.category === filterCategory);
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentItems = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-stone-50 dark:bg-stone-950">
      {/* Header */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Product Inventory</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Kelola stok dan database produk toko.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
            <input type="text" placeholder="Cari produk, merek, PLU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg w-[240px] text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" />
          </div>
          <Select
            value={filterCategory}
            onChange={setFilterCategory}
            options={CATEGORIES.map(cat => ({ value: cat, label: cat === 'All' ? 'Semua' : cat }))}
            ariaLabel="Filter kategori"
            className="min-w-[140px]"
          />
          <button
            onClick={() => setOnlyPromo(v => !v)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 border",
              onlyPromo
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700",
            )}
          >
            <Gift className="w-3.5 h-3.5" /> Hanya promo
          </button>
          <button onClick={() => setIsPriceTagDrawerOpen(true)} className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Label</button>
          <button onClick={openAddForm} className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Tambah</button>
        </div>
      </div>

      {isLoading ? <LoadingScreen message="Memuat produk..." subMessage="Mengambil data inventori." /> : (
        <>
          {/* Low stock alert */}
          {lowStockItems.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-800 dark:text-red-300">{lowStockItems.length} produk stok menipis (&lt;10)</span>
              </div>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">{lowStockItems.slice(0, 5).map(i => i.name).join(', ')}{lowStockItems.length > 5 ? ` +${lowStockItems.length - 5} lagi` : ''}</p>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center"><Package className="w-8 h-8 mx-auto mb-3 text-stone-300 dark:text-stone-600" /><p className="text-sm text-stone-500 dark:text-stone-400">Produk tidak ditemukan</p></div>
          ) : (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                      <th className="px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 w-12"></th>
                      <th className="px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">PLU</th>
                      <th className="px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Produk</th>
                      <th className="px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Kategori</th>
                      <th className="px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Stok</th>
                      <th className="px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">Harga Jual</th>
                      <th className="px-4 py-3 text-xs font-medium text-stone-500 dark:text-stone-400 text-right">HPP</th>
                      <th className="px-4 py-3 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {currentItems.map((p) => (
                      <tr key={p.id} onClick={() => openDetail(p)} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors cursor-pointer group">
                        <td className="px-4 py-3"><div className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-md overflow-hidden border border-stone-200 dark:border-stone-700"><img src={p.image_url || 'https://via.placeholder.com/40'} alt="" className="w-full h-full object-cover" /></div></td>
                        <td className="px-4 py-3"><span className="text-xs font-mono text-stone-500 dark:text-stone-400">{p.plu || '—'}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div><p className="text-sm font-medium text-stone-900 dark:text-stone-100">{p.name}</p><p className="text-xs text-stone-500 dark:text-stone-400">{p.brand}</p></div>
                            {(() => {
                              const offers = productOffers.get(p.id) || [];
                              if (offers.length === 0) return null;
                              const primary = offers[0];
                              return (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setPromoDrawerProductId(p.id); }}
                                  className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                  title={offers.length > 1 ? `${offers.length} kampanye aktif` : primary.campaignName}
                                >
                                  <Gift className="w-2.5 h-2.5" />
                                  {offerLabel(primary, p.price)}
                                  {offers.length > 1 && <span className="ml-0.5 text-[9px] opacity-70">+{offers.length - 1}</span>}
                                </button>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs text-stone-500 dark:text-stone-400">{p.category}</span></td>
                        <td className="px-4 py-3 text-right">
                          {(() => {
                            const stock = p.stock || 0;
                            const avg = dailyAverages.get(p.id) || 0;
                            const days = projectStockDays(stock, avg, productOffers.get(p.id)?.[0] || null);
                            const tone = stockDaysTone(days);
                            return (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={cn("text-sm tabular-nums font-medium", stock < 10 ? "text-red-600 dark:text-red-400" : "text-stone-900 dark:text-stone-100")}>{stock}</span>
                                {tone !== 'idle' && (
                                  <span className={cn(
                                    "text-[10px] tabular-nums",
                                    tone === 'danger' && "text-red-600 dark:text-red-400 font-medium",
                                    tone === 'warn' && "text-amber-600 dark:text-amber-400",
                                    tone === 'ok' && "text-stone-400 dark:text-stone-500",
                                  )}>{stockDaysLabel(days)}</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right"><span className="text-sm text-stone-900 dark:text-stone-100 tabular-nums">Rp {p.price?.toLocaleString()}</span></td>
                        <td className="px-4 py-3 text-right"><span className="text-sm text-stone-500 dark:text-stone-400 tabular-nums">Rp {(p.cost_price || 0).toLocaleString()}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button onClick={(e) => openEditForm(p, e)} className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setProductForPriceTag(p); setIsPriceTagDrawerOpen(true); }} className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors"><Printer className="w-3.5 h-3.5" /></button>
                            <button onClick={(e) => openDeleteModal(p, e)} className="p-1.5 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <p className="text-xs text-stone-500 dark:text-stone-400">{filteredProducts.length} produk · Hal {currentPage}/{totalPages}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 rounded-md disabled:opacity-30 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">Prev</button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 rounded-md disabled:opacity-30 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* CRUD Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="bg-white dark:bg-stone-900 rounded-xl max-w-xl w-full shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
                <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</h2>
                <button onClick={() => setIsFormOpen(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">PLU</label><input value={formData.plu} readOnly className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-500 dark:text-stone-400 font-mono" /></div>
                  <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Merek</label><input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="Indomie" className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Nama Produk</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Mie Goreng Jumbo" className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" /></div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Kategori</label>
                    <Select
                      value={formData.category || 'Makanan'}
                      onChange={v => setFormData({ ...formData, category: v })}
                      options={CATEGORIES.slice(1).map(c => ({ value: c, label: c }))}
                      className="w-full"
                      buttonClassName="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Satuan</label><input value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="pcs" className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" /></div>
                  <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Stok</label><input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 tabular-nums" /></div>
                  <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Harga Beli</label><input type="number" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 tabular-nums" /></div>
                </div>
                <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Harga Jual</label><input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 tabular-nums" /></div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Gambar</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden flex items-center justify-center relative">
                      {formData.image_url ? <img src={formData.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-stone-300 dark:text-stone-600" />}
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setFormData({...formData, image_url: r.result as string}); r.readAsDataURL(f); } }} />
                    </div>
                    <span className="text-xs text-stone-400 dark:text-stone-500">Klik untuk upload</span>
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">Deskripsi</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} placeholder="Opsional..." className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 resize-none" /></div>
              </div>
              <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex gap-2 justify-end shrink-0">
                <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : editingProduct ? 'Update' : 'Simpan'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailOpen && viewingProduct && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden"><img src={viewingProduct.image_url} alt="" className="w-full h-full object-cover" /></div>
                  <div><p className="text-xs text-stone-500 dark:text-stone-400">{viewingProduct.brand} · PLU: {viewingProduct.plu}</p><h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{viewingProduct.name}</h2></div>
                </div>
                <button onClick={() => setIsDetailOpen(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-lg text-center"><p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Stok</p><p className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{viewingProduct.stock}<span className="text-xs text-stone-400 dark:text-stone-500 ml-1">{viewingProduct.unit}</span></p></div>
                  <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-lg text-center"><p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Harga Jual</p><p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">Rp {viewingProduct.price.toLocaleString()}</p></div>
                </div>
                {/* Supply History */}
                <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedSection(expandedSection === 'supply' ? null : 'supply')} className="w-full p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                    <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-stone-400 dark:text-stone-500" /><span className="text-sm font-medium text-stone-700 dark:text-stone-200">Riwayat Masuk</span></div>
                    {expandedSection === 'supply' ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                  </button>
                  <AnimatePresence>{expandedSection === 'supply' && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-3 pt-0 space-y-1.5 max-h-[180px] overflow-y-auto">
                        {isHistoryLoading ? <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-4">Memuat...</p> : productSupplyHistory.length === 0 ? <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-4">Belum ada riwayat</p> : productSupplyHistory.map(log => (
                          <div key={log.id} className="flex items-center justify-between p-2 bg-stone-50 dark:bg-stone-800 rounded-md">
                            <div><p className="text-xs font-medium text-stone-700 dark:text-stone-200">{log.supplier || 'Stok Masuk'}</p><p className="text-[10px] text-stone-400 dark:text-stone-500">{new Date(log.created_at).toLocaleDateString('id-ID')}</p></div>
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">+{log.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}</AnimatePresence>
                </div>
                {/* Stock Ledger */}
                <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedSection(expandedSection === 'sales' ? null : 'sales')} className="w-full p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                    <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-stone-400 dark:text-stone-500" /><span className="text-sm font-medium text-stone-700 dark:text-stone-200">Buku Stok</span></div>
                    {expandedSection === 'sales' ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                  </button>
                  <AnimatePresence>{expandedSection === 'sales' && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-3 pt-0 space-y-1.5 max-h-[220px] overflow-y-auto">
                        {(isHistoryLoading || isSalesHistoryLoading) ? <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-4">Memuat...</p> : (() => {
                          const merged = [
                            ...productSupplyHistory.map((l: any) => ({ id: `s-${l.id}`, date: l.created_at, type: 'in' as const, qty: l.quantity || 0, source: l.supplier || 'Masuk', promo_type: null, is_free_item: false })),
                            ...productSalesHistory.map((l: any) => ({ id: `o-${l.id}`, date: l.date, type: 'out' as const, qty: l.qty, source: `Terjual (${l.cashier})`, promo_type: l.promo_type, is_free_item: l.is_free_item }))
                          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                          if (merged.length === 0) return <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-4">Belum ada gerakan stok</p>;
                          return merged.map(ev => (
                            <div key={ev.id} className="flex items-center gap-2 p-2 bg-stone-50 dark:bg-stone-800 rounded-md">
                              <span className={cn("text-xs font-medium w-6 text-center", ev.type === 'in' ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>{ev.type === 'in' ? '+' : '-'}{ev.qty}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-stone-700 dark:text-stone-200 truncate">{ev.source}{ev.promo_type ? ` [${ev.promo_type.toUpperCase()}]` : ''}{ev.is_free_item ? ' (GRATIS)' : ''}</p>
                                <p className="text-[10px] text-stone-400 dark:text-stone-500">{new Date(ev.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </motion.div>
                  )}</AnimatePresence>
                </div>
              </div>
              <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 shrink-0">
                <button onClick={() => setIsDetailOpen(false)} className="flex-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">Tutup</button>
                <button onClick={() => { setIsDetailOpen(false); openEditForm(viewingProduct, { stopPropagation: () => {} } as any); }} className="flex-1 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Edit</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && productToDelete && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 p-6">
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-2">Hapus produk?</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">Hapus <strong className="text-stone-700 dark:text-stone-200">"{productToDelete.name}"</strong>? Aksi ini tidak dapat dibatalkan.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
                <button onClick={confirmDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">{isDeleting ? 'Menghapus...' : 'Hapus'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PriceTagDrawer isOpen={isPriceTagDrawerOpen} onClose={() => { setIsPriceTagDrawerOpen(false); setProductForPriceTag(null); }} productsFromPage={currentItems} allProducts={products} companyName={userProfile.company?.name || 'MYSTORE STUDIO'} initialProduct={productForPriceTag} userProfile={userProfile} />

      {/* Promo Detail Drawer */}
      <AnimatePresence>
        {promoDrawerProductId && (() => {
          const product = products.find(p => p.id === promoDrawerProductId);
          const offers = productOffers.get(promoDrawerProductId) || [];
          if (!product) return null;
          return (
            <div className="fixed inset-0 z-[5500] flex items-center justify-center p-4 bg-black/50" onClick={() => setPromoDrawerProductId(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[85vh]"
              >
                <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
                  <div className="min-w-0">
                    <p className="text-xs text-stone-500 dark:text-stone-400">Promo aktif untuk</p>
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{product.name}</h2>
                  </div>
                  <button onClick={() => setPromoDrawerProductId(null)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 overflow-y-auto flex-1 space-y-2">
                  {offers.length === 0 ? (
                    <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">Tidak ada kampanye aktif.</p>
                  ) : offers.map((offer, idx) => (
                    <div key={offer.campaignProductId} className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{offer.campaignName}</p>
                        {idx === 0 && offers.length > 1 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shrink-0">Prioritas</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                          <Gift className="w-3 h-3" />{offerLabel(offer, product.price)}
                        </span>
                        {offer.stackable && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">Stack</span>}
                        <span className="text-[11px] text-stone-500 dark:text-stone-400">P{offer.priority}</span>
                      </div>
                      {offer.promoType === 'price_cut' && offer.promoPrice != null && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 tabular-nums">
                          Rp {product.price.toLocaleString()} → <span className="text-emerald-600 dark:text-emerald-400 font-medium">Rp {offer.promoPrice.toLocaleString()}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 shrink-0">
                  <button onClick={() => setPromoDrawerProductId(null)} className="flex-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">Tutup</button>
                  <button onClick={() => { setPromoDrawerProductId(null); onNavigate('campaigns'); }} className="flex-1 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Buka kampanye</button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
