import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Calendar, Package, Search, X, AlertCircle, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { PromoCampaign, CampaignProduct, UserProfile } from '../types';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  cost_price: number;
  category: string;
}

export default function CampaignManager({ userProfile }: { userProfile: UserProfile }) {
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<PromoCampaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<PromoCampaign | null>(null);
  const [campaignProducts, setCampaignProducts] = useState<CampaignProduct[]>([]);
  const [, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [userProfile.company_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (!userProfile.company_id) {
        toast.error('ID Perusahaan tidak ditemukan');
        return;
      }
      const [campData, activeCamp] = await Promise.all([
        api.getPromoCampaigns(userProfile.company_id),
        api.getActiveCampaign(userProfile.company_id)
      ]);
      setCampaigns(campData);
      setActiveCampaign(activeCamp);
      
      const products = await api.getProducts(userProfile.company_id);
      setAllProducts(products);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data kampanye');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCampaignDetail = async (campaign: PromoCampaign) => {
    setSelectedCampaign(campaign);
    try {
      const products = await api.getCampaignProducts(campaign.id);
      setCampaignProducts(products);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat detail produk kampanye');
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) return;
    try {
      const data = await api.createPromoCampaign({
        ...newCampaign,
        company_id: userProfile.company_id!,
        is_active: false
      });
      setCampaigns([data, ...campaigns]);
      setShowAddModal(false);
      setNewCampaign({
        name: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      toast.success('Kampanye berhasil dibuat');
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat kampanye');
    }
  };

  const handleToggleActive = async (campaign: PromoCampaign) => {
    try {
      const newStatus = !campaign.is_active;
      
      if (newStatus && activeCampaign && activeCampaign.id !== campaign.id) {
        await api.updatePromoCampaign(activeCampaign.id, { is_active: false });
      }

      const updated = await api.updatePromoCampaign(campaign.id, { is_active: newStatus });
      
      setCampaigns(campaigns.map(c => 
        c.id === campaign.id ? updated : (newStatus ? { ...c, is_active: false } : c)
      ));
      setSelectedCampaign(updated);
      
      if (newStatus) {
        setActiveCampaign(updated);
        toast.success(`Kampanye "${campaign.name}" diaktifkan`);
      } else {
        setActiveCampaign(null);
        toast.success(`Kampanye "${campaign.name}" dinonaktifkan`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengubah status kampanye');
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('Hapus kampanye ini?')) return;
    try {
      await api.deletePromoCampaign(id);
      setCampaigns(campaigns.filter(c => c.id !== id));
      if (selectedCampaign?.id === id) setSelectedCampaign(null);
      if (activeCampaign?.id === id) setActiveCampaign(null);
      toast.success('Kampanye dihapus');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus kampanye');
    }
  };

  const addProductToCampaign = async (product: Product) => {
    if (!selectedCampaign) return;
    try {
      const newItem: Partial<CampaignProduct> = {
        campaign_id: selectedCampaign.id,
        product_id: product.id,
        promo_type: 'price_cut',
        promo_price: product.price * 0.9,
        company_id: userProfile.company_id!
      };
      const [added] = await api.addToCampaign([newItem]);
      setCampaignProducts([...campaignProducts, { ...added, name: product.name, brand: product.brand, price: product.price, cost_price: product.cost_price }]);
      toast.success(`${product.name} ditambahkan`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menambah produk');
    }
  };

  const removeProductFromCampaign = async (id: string) => {
    try {
      await api.removeFromCampaign(id);
      setCampaignProducts(campaignProducts.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus produk');
    }
  };

  const calculateMargin = (item: CampaignProduct) => {
    const cost = item.cost_price || 0;
    const normalPrice = item.price || 0;
    
    if (item.promo_type === 'price_cut') {
      const sell = item.promo_price || 0;
      if (sell === 0) return 0;
      return ((sell - cost) / sell) * 100;
    } else {
      const x = item.promo_type === 'b1g1' ? 1 : 
                item.promo_type === 'b2g1' ? 2 : 
                (item.buy_qty || 1);
      const y = item.promo_type === 'b1g1' ? 1 : 
                item.promo_type === 'b2g1' ? 1 : 
                (item.get_qty || 1);
      
      const revenue = x * normalPrice;
      const totalCost = (x + y) * cost;
      
      if (revenue === 0) return 0;
      return ((revenue - totalCost) / revenue) * 100;
    }
  };

  const filteredProducts = allProducts.filter(p => 
    !campaignProducts.some(cp => cp.product_id === p.id) &&
    ((p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
     (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const avgMargin = campaignProducts.length > 0 
    ? (campaignProducts.reduce((acc, curr) => acc + calculateMargin(curr), 0) / campaignProducts.length)
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* Page Header */}
      <div className="px-6 md:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Kampanye Promo</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Kelola diskon, B1G1, dan margin profit kampanye toko Anda.</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Buat kampanye
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Campaign List */}
        <div className="w-72 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800">
            <h3 className="text-xs font-medium text-stone-500 dark:text-stone-400">Daftar kampanye ({campaigns.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {campaigns.length === 0 ? (
              <div className="p-6 text-center">
                <Inbox className="w-6 h-6 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                <p className="text-sm text-stone-400 dark:text-stone-500">Belum ada kampanye</p>
              </div>
            ) : (
              campaigns.map(camp => (
                <button
                  key={camp.id}
                  onClick={() => loadCampaignDetail(camp)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors group relative mb-1",
                    selectedCampaign?.id === camp.id 
                      ? "bg-stone-100 dark:bg-stone-800" 
                      : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      camp.is_active 
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" 
                        : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                    )}>
                      {camp.is_active ? 'Aktif' : 'Draft'}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteCampaign(camp.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="font-medium text-stone-900 dark:text-stone-100 text-sm truncate">{camp.name}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(camp.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {new Date(camp.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedCampaign ? (
            <>
              {/* Detail Header */}
              <div className="px-8 py-5 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 truncate">{selectedCampaign.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-500 dark:text-stone-400">
                    <span>{campaignProducts.length} produk</span>
                    <span className="text-stone-300 dark:text-stone-600">·</span>
                    <span>Avg margin <span className={cn(
                      "font-medium",
                      avgMargin < 10 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>{avgMargin.toFixed(1)}%</span></span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => setShowProductModal(true)}
                    className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Tambah produk
                  </button>
                  <button 
                    onClick={() => handleToggleActive(selectedCampaign)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      selectedCampaign.is_active 
                        ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60" 
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    )}
                  >
                    {selectedCampaign.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="flex-1 overflow-auto p-6 md:p-8">
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                  {campaignProducts.length === 0 ? (
                    <div className="py-16 px-6 text-center">
                      <Package className="w-8 h-8 mx-auto mb-3 text-stone-300 dark:text-stone-600" />
                      <p className="text-sm text-stone-600 dark:text-stone-300 font-medium mb-1">Belum ada produk</p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Tambahkan produk untuk mulai mengatur promo.</p>
                      <button 
                        onClick={() => setShowProductModal(true)}
                        className="text-sm text-stone-900 dark:text-stone-100 font-medium hover:underline underline-offset-2"
                      >
                        Tambah produk pertama
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                          <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Produk</th>
                          <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Tipe promo</th>
                          <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Harga normal</th>
                          <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Harga promo</th>
                          <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Margin</th>
                          <th className="px-5 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {campaignProducts.map(item => {
                          const margin = calculateMargin(item);
                          return (
                            <tr key={item.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/30 transition-colors">
                              <td className="px-5 py-3.5">
                                <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{item.brand}</p>
                                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{item.name}</p>
                              </td>
                              <td className="px-5 py-3.5">
                                <select 
                                  value={item.promo_type}
                                  onChange={async (e) => {
                                    const type = e.target.value as any;
                                    const updateData: any = { promo_type: type };
                                    if (type === 'buy_x_get_y' && !item.buy_qty) {
                                      updateData.buy_qty = 1;
                                      updateData.get_qty = 1;
                                    }
                                    await api.updateCampaignProduct(item.id, updateData);
                                    setCampaignProducts(campaignProducts.map(p => p.id === item.id ? { ...p, ...updateData } : p));
                                  }}
                                  className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-none rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                                >
                                  <option value="price_cut">Potong harga</option>
                                  <option value="b1g1">Beli 1 gratis 1</option>
                                  <option value="b2g1">Beli 2 gratis 1</option>
                                  <option value="buy_x_get_y">Custom (X get Y)</option>
                                </select>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-stone-400 dark:text-stone-500">Rp</span>
                                  <input 
                                    type="number"
                                    defaultValue={item.price}
                                    onBlur={async (e) => {
                                      const val = Number(e.target.value);
                                      if (val === item.price) return;
                                      await api.updateProduct(item.product_id, { price: val, company_id: item.company_id });
                                      setCampaignProducts(campaignProducts.map(p => p.id === item.id ? { ...p, price: val } : p));
                                      toast.success('Harga master diperbarui');
                                    }}
                                    className="w-24 bg-transparent text-sm text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 tabular-nums"
                                  />
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                {item.promo_type === 'price_cut' ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-stone-400 dark:text-stone-500 w-6">Rp</span>
                                      <input 
                                        type="number"
                                        value={item.promo_price}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          setCampaignProducts(campaignProducts.map(p => p.id === item.id ? { ...p, promo_price: val } : p));
                                        }}
                                        onBlur={async (e) => {
                                          await api.updateCampaignProduct(item.id, { promo_price: Number(e.target.value) } as any);
                                        }}
                                        className="w-24 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium border-none rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-stone-400 dark:text-stone-500 w-6">%</span>
                                      <input 
                                        type="number"
                                        value={Math.round(((item.price! - item.promo_price!) / item.price!) * 100) || 0}
                                        onChange={(e) => {
                                          const pct = Number(e.target.value);
                                          const newPrice = Math.round(item.price! * (1 - pct / 100));
                                          setCampaignProducts(campaignProducts.map(p => p.id === item.id ? { ...p, promo_price: newPrice } : p));
                                        }}
                                        onBlur={async (e) => {
                                          const pct = Number(e.target.value);
                                          const newPrice = Math.round(item.price! * (1 - pct / 100));
                                          await api.updateCampaignProduct(item.id, { promo_price: newPrice } as any);
                                        }}
                                        className="w-14 bg-transparent text-xs text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 tabular-nums"
                                      />
                                    </div>
                                  </div>
                                ) : item.promo_type === 'buy_x_get_y' ? (
                                  <div className="flex items-center gap-1.5">
                                    <input 
                                      type="number"
                                      value={item.buy_qty}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setCampaignProducts(campaignProducts.map(p => p.id === item.id ? { ...p, buy_qty: val } : p));
                                      }}
                                      onBlur={async (e) => {
                                        await api.updateCampaignProduct(item.id, { buy_qty: Number(e.target.value) } as any);
                                      }}
                                      className="w-12 bg-stone-100 dark:bg-stone-800 text-center text-xs font-medium text-stone-700 dark:text-stone-200 border-none rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                                    />
                                    <span className="text-xs text-stone-400 dark:text-stone-500">get</span>
                                    <input 
                                      type="number"
                                      value={item.get_qty}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setCampaignProducts(campaignProducts.map(p => p.id === item.id ? { ...p, get_qty: val } : p));
                                      }}
                                      onBlur={async (e) => {
                                        await api.updateCampaignProduct(item.id, { get_qty: Number(e.target.value) } as any);
                                      }}
                                      className="w-12 bg-stone-100 dark:bg-stone-800 text-center text-xs font-medium text-stone-700 dark:text-stone-200 border-none rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Auto promo</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className={cn(
                                  "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
                                  margin < 10 
                                    ? "text-red-600 dark:text-red-400" 
                                    : "text-emerald-600 dark:text-emerald-400"
                                )}>
                                  {margin < 10 && <AlertCircle className="w-3.5 h-3.5" />}
                                  {margin.toFixed(1)}%
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <button 
                                  onClick={() => removeProductFromCampaign(item.id)}
                                  className="p-1.5 text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Package className="w-10 h-10 mb-3 text-stone-300 dark:text-stone-600" />
              <h2 className="text-base font-medium text-stone-700 dark:text-stone-300 mb-1">Pilih kampanye</h2>
              <p className="max-w-xs text-sm text-stone-500 dark:text-stone-400">
                Pilih kampanye di sidebar untuk mengelola detail promo dan margin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Campaign Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-stone-900 rounded-xl max-w-md w-full shadow-xl border border-stone-200 dark:border-stone-800"
            >
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Kampanye baru</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Buat sesi promo untuk toko Anda.</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 dark:text-stone-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Nama kampanye</label>
                  <input 
                    value={newCampaign.name}
                    onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                    placeholder="Contoh: Promo Ramadhan 2026"
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Mulai</label>
                    <input 
                      type="date"
                      value={newCampaign.start_date}
                      onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Selesai</label>
                    <input 
                      type="date"
                      value={newCampaign.end_date}
                      onChange={e => setNewCampaign({...newCampaign, end_date: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex gap-2 justify-end">
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleCreateCampaign}
                  disabled={!newCampaign.name}
                  className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Selection Modal */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-stone-900 rounded-xl w-full max-w-xl h-[75vh] flex flex-col shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden"
            >
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Pilih produk</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{filteredProducts.length} produk tersedia</p>
                </div>
                <button 
                  onClick={() => setShowProductModal(false)} 
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 dark:text-stone-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                  <input 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari nama produk atau brand..."
                    className="w-full pl-9 pr-3 py-2 bg-stone-100 dark:bg-stone-800 border-none rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                    <p className="text-sm text-stone-400 dark:text-stone-500">Produk tidak ditemukan</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {filteredProducts.map(p => (
                      <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{p.brand}</p>
                          <h4 className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{p.name}</h4>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">Rp {p.price?.toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => addProductToCampaign(p)}
                          className="px-3 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-md text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <Plus className="w-3 h-3" /> Tambah
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-stone-200 dark:border-stone-800">
                <button 
                  onClick={() => setShowProductModal(false)}
                  className="w-full py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
