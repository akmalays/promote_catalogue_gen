import React, { useState, useEffect } from 'react';
import { 
  Tag, Plus, Trash2, Calendar, Target, CheckCircle2, 
  AlertCircle, ChevronRight, BarChart3, Package, 
  ArrowRight, DollarSign, Percent, Gift, Search, X
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
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Form State
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
      
      // If we are activating this one, we must deactivate others first
      if (newStatus && activeCampaign && activeCampaign.id !== campaign.id) {
        await api.updatePromoCampaign(activeCampaign.id, { is_active: false });
      }

      const updated = await api.updatePromoCampaign(campaign.id, { is_active: newStatus });
      
      setCampaigns(campaigns.map(c => 
        c.id === campaign.id ? updated : (newStatus ? { ...c, is_active: false } : c)
      ));
      
      if (newStatus) {
        setActiveCampaign(updated);
        toast.success(`Kampanye "${campaign.name}" sekarang aktif!`);
      } else {
        setActiveCampaign(null);
        toast.success(`Kampanye "${campaign.name}" dimatikan.`);
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
        promo_price: product.price * 0.9, // Default 10% off
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
      // For Buy X Get Y
      // Revenue is only from X items
      // Cost is for (X + Y) items
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


  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] shadow-sm">
              <Tag className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Kampanye Promo</h1>
              <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none uppercase">Kelola diskon, B1G1, dan margin profit kampanye</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-[#8b7365] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#8b7365]/20 flex items-center gap-2 hover:bg-[#7a6458] transition-all"
          >
            <Plus className="w-4 h-4" /> Buat Kampanye Baru
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Campaign List */}
        <div className="w-80 border-r border-slate-100 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Kampanye</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {campaigns.map(camp => (
              <motion.div
                key={camp.id}
                whileHover={{ x: 4 }}
                onClick={() => loadCampaignDetail(camp)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer group relative",
                  selectedCampaign?.id === camp.id 
                    ? "bg-[#8b7365]/5 border-[#8b7365]/20 shadow-sm" 
                    : "bg-white border-slate-100 hover:border-[#8b7365]/20"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                    camp.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  )}>
                    {camp.is_active ? 'Aktif' : 'Draft'}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteCampaign(camp.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">{camp.name}</h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                  <Calendar className="w-3 h-3" />
                  {new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}
                </div>
                {selectedCampaign?.id === camp.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#8b7365] rounded-r-full" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Main Content: Campaign Detail & Products */}
        <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
          {selectedCampaign ? (
            <>
              <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">{selectedCampaign.name}</h2>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Target className="w-4 h-4" /> {campaignProducts.length} Produk Terdaftar
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      <BarChart3 className="w-4 h-4" /> Avg Margin: {
                        campaignProducts.length > 0 
                          ? (campaignProducts.reduce((acc, curr) => acc + calculateMargin(curr), 0) / campaignProducts.length).toFixed(1)
                          : 0
                      }%
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleToggleActive(selectedCampaign)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl font-black text-xs tracking-widest uppercase transition-all shadow-sm",
                      selectedCampaign.is_active 
                        ? "bg-rose-50 text-rose-600 hover:bg-rose-100" 
                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
                    )}
                  >
                    {selectedCampaign.is_active ? 'Nonaktifkan Promo' : 'Aktifkan Sekarang'}
                  </button>
                  <button 
                    onClick={() => setShowProductModal(true)}
                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-slate-50 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Tambah Produk
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="flex-1 px-8 pb-8 overflow-hidden">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Promo</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga Normal</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga Promo</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Margin (%)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {campaignProducts.map(item => {
                          const margin = calculateMargin(item);
                          return (
                            <tr key={item.id} className="group hover:bg-slate-50/30 transition-all">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-[10px] font-black text-[#8b7365] uppercase leading-none mb-1">{item.brand}</p>
                                  <p className="text-sm font-bold text-slate-800">{item.name}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
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
                                   className="text-xs font-bold bg-slate-100 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#8b7365]/20 outline-none"
                                 >
                                   <option value="price_cut">Potong Harga (%)</option>
                                   <option value="b1g1">Beli 1 Gratis 1</option>
                                   <option value="b2g1">Beli 2 Gratis 1</option>
                                   <option value="buy_x_get_y">Custom (Buy X Get Y)</option>
                                 </select>

                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2 opacity-50">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DB:</span>
                                    <span className="text-xs font-bold text-slate-400 line-through">Rp {item.price?.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-[#8b7365]">SET:</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold text-slate-400">Rp</span>
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
                                        className="w-24 bg-white text-slate-700 font-bold text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-[#8b7365]/20"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </td>


                              <td className="px-6 py-4">
                                {item.promo_type === 'price_cut' ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-slate-400 w-8">Rp</span>
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
                                        className="w-24 bg-emerald-50 text-emerald-700 font-bold text-xs border-none rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-slate-400 w-8">Disc</span>
                                      <input 
                                        type="number"
                                        value={Math.round(((item.price! - item.promo_price!) / item.price!) * 100)}
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
                                        className="w-12 bg-white text-slate-700 font-bold text-[10px] border border-slate-200 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-slate-200"
                                      />
                                      <span className="text-[10px] font-bold text-slate-400">%</span>
                                    </div>
                                  </div>
                                ) : item.promo_type === 'buy_x_get_y' ? (
                                  <div className="flex items-center gap-1">
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
                                      className="w-8 bg-slate-50 text-center font-bold text-xs border-none rounded-md px-1 py-1"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400"> Get </span>
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
                                      className="w-8 bg-slate-50 text-center font-bold text-xs border-none rounded-md px-1 py-1"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs font-black text-emerald-600 uppercase">Auto Promo</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-sm",
                                  margin < 10 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                                )}>
                                  {margin < 10 && <AlertCircle className="w-3 h-3" />}
                                  {margin.toFixed(1)}%
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button 
                                  onClick={() => removeProductFromCampaign(item.id)}
                                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {campaignProducts.length === 0 && (
                      <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                        <Package className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-bold">Belum ada produk di kampanye ini</p>
                        <button 
                          onClick={() => setShowProductModal(true)}
                          className="mt-4 text-[#8b7365] font-black text-xs uppercase tracking-widest hover:underline"
                        >
                          Klik untuk tambah produk
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-[32px] flex items-center justify-center mb-6">
                <Target className="w-10 h-10 opacity-20" />
              </div>
              <h2 className="text-2xl font-black text-slate-400 tracking-tight mb-2">Pilih Kampanye</h2>
              <p className="max-w-xs text-sm font-bold text-slate-400">Pilih salah satu kampanye di sidebar untuk mengelola detail promo dan margin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Campaign Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365]">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Kampanye Baru</h2>
                    <p className="text-slate-400 text-[10px] font-black tracking-widest leading-none mt-2">Buat sesi promo toko Anda</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nama Kampanye</label>
                  <input 
                    value={newCampaign.name}
                    onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                    placeholder="Contoh: Promo Ramadhan 2026"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tgl Mulai</label>
                    <input 
                      type="date"
                      value={newCampaign.start_date}
                      onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#8b7365]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tgl Selesai</label>
                    <input 
                      type="date"
                      value={newCampaign.end_date}
                      onChange={e => setNewCampaign({...newCampaign, end_date: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#8b7365]/20"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">Batal</button>
                  <button onClick={handleCreateCampaign} className="flex-2 py-4 bg-[#8b7365] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#8b7365]/20 hover:bg-[#7a6458] transition-all">Simpan Kampanye</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Selection Modal */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center icon-emerald-600">
                    <Package className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 leading-none">Pilih Produk</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{filteredProducts.length} Produk Tersedia</p>
                  </div>
                </div>
                <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari nama produk atau brand..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#8b7365]/20 outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {filteredProducts.map(p => (
                  <div key={p.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-emerald-200 hover:bg-emerald-50/10 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 font-black text-xs">IMG</div>
                      <div>
                        <p className="text-[9px] font-black text-[#8b7365] uppercase leading-none mb-1">{p.brand}</p>
                        <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400">Harga Normal: Rp {p.price?.toLocaleString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => addProductToCampaign(p)}
                      className="px-4 py-2 bg-[#8b7365] text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-[#7a6458] transition-all flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3" /> Tambah
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setShowProductModal(false)}
                  className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
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
