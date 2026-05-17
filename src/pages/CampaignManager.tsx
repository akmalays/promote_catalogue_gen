import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Calendar, Package, Search, X, AlertCircle, Inbox, Layers, TrendingUp,
  Tag, Activity, Pencil, Copy, CheckSquare, Square,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { PromoCampaign, CampaignProduct, UserProfile, CampaignMetric } from '../types';
import toast from 'react-hot-toast';
import Select from '../components/ui/Select';
import Toggle from '../components/ui/Toggle';
import { stockDaysLabel, stockDaysTone } from '../lib/promo';

const PROMO_TYPE_OPTIONS = [
  { value: 'price_cut', label: 'Potong harga' },
  { value: 'b1g1', label: 'Beli 1 gratis 1' },
  { value: 'b2g1', label: 'Beli 2 gratis 1' },
  { value: 'buy_x_get_y', label: 'Custom (X get Y)' },
];

const PRIORITY_OPTIONS = [
  { value: '50', label: 'Tinggi (50)' },
  { value: '100', label: 'Normal (100)' },
  { value: '200', label: 'Rendah (200)' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Semua status' },
  { value: 'active', label: 'Aktif' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'ended', label: 'Berakhir' },
  { value: 'draft', label: 'Draft' },
];

const DEFAULT_MIN_MARGIN = 10;

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  cost_price: number;
  category: string;
  stock?: number;
}

type CampaignStatus = 'active' | 'scheduled' | 'ended' | 'draft';

function getCampaignStatus(c: PromoCampaign, now = new Date()): CampaignStatus {
  const start = c.start_date ? new Date(c.start_date) : null;
  const end = c.end_date ? new Date(c.end_date) : null;
  if (!c.is_active) return 'draft';
  if (start && now < start) return 'scheduled';
  if (end && now > end) return 'ended';
  return 'active';
}

const STATUS_STYLES: Record<CampaignStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  scheduled: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  ended: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
  draft: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  active: 'Aktif',
  scheduled: 'Terjadwal',
  ended: 'Berakhir',
  draft: 'Draft',
};

function calculateMargin(item: CampaignProduct): number {
  const cost = item.cost_price || 0;
  const normalPrice = item.price || 0;
  if (item.promo_type === 'price_cut') {
    const sell = item.promo_price || 0;
    if (sell === 0) return 0;
    return ((sell - cost) / sell) * 100;
  } else {
    const x = item.promo_type === 'b1g1' ? 1 : item.promo_type === 'b2g1' ? 2 : (item.buy_qty || 1);
    const y = item.promo_type === 'b1g1' ? 1 : item.promo_type === 'b2g1' ? 1 : (item.get_qty || 1);
    const revenue = x * normalPrice;
    const totalCost = (x + y) * cost;
    if (revenue === 0) return 0;
    return ((revenue - totalCost) / revenue) * 100;
  }
}

interface CampaignFormState {
  name: string;
  description: string;
  priority: string;
  stackable: boolean;
  start_date: string;
  end_date: string;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function plusDaysStr(d: number) { return new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; }

const blankCampaignForm: CampaignFormState = {
  name: '', description: '', priority: '100', stackable: false,
  start_date: todayStr(), end_date: plusDaysStr(7),
};

export default function CampaignManager({ userProfile }: { userProfile: UserProfile }) {
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<PromoCampaign | null>(null);
  const [campaignProducts, setCampaignProducts] = useState<CampaignProduct[]>([]);
  const [metrics, setMetrics] = useState<CampaignMetric[]>([]);
  const [, setIsLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formCampaignId, setFormCampaignId] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<PromoCampaign | null>(null);
  const [productFilter, setProductFilter] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState('');
  const [sidebarStatus, setSidebarStatus] = useState('all');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ open: boolean; type: 'price_cut' | 'b1g1' | 'b2g1'; pct: number } | null>(null);

  const [form, setForm] = useState<CampaignFormState>(blankCampaignForm);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dailyAverages, setDailyAverages] = useState<Map<string, number>>(new Map());

  useEffect(() => { loadData(); }, [userProfile.company_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (!userProfile.company_id) {
        toast.error('ID Perusahaan tidak ditemukan');
        return;
      }
      const [campData, products, met, avgs] = await Promise.all([
        api.getPromoCampaigns(userProfile.company_id),
        api.getProducts(userProfile.company_id),
        api.getCampaignMetrics(userProfile.company_id).catch(() => []),
        api.getDailyAverages(userProfile.company_id).catch(() => new Map<string, number>()),
      ]);
      setCampaigns(campData);
      setAllProducts(products);
      setMetrics(met);
      setDailyAverages(avgs);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data kampanye');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCampaignDetail = async (campaign: PromoCampaign) => {
    setSelectedCampaign(campaign);
    setSelectedProductIds(new Set());
    try {
      const products = await api.getCampaignProducts(campaign.id);
      setCampaignProducts(products);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat detail produk kampanye');
    }
  };

  const openCreateForm = () => {
    setFormMode('create');
    setFormCampaignId(null);
    setForm(blankCampaignForm);
    setShowFormModal(true);
  };

  const openEditForm = (camp: PromoCampaign) => {
    setFormMode('edit');
    setFormCampaignId(camp.id);
    setForm({
      name: camp.name,
      description: camp.description || '',
      priority: String(camp.priority ?? 100),
      stackable: camp.stackable ?? false,
      start_date: (camp.start_date || todayStr()).split('T')[0],
      end_date: (camp.end_date || plusDaysStr(7)).split('T')[0],
    });
    setShowFormModal(true);
  };

  const submitForm = async () => {
    if (!form.name.trim()) { toast.error('Nama kampanye wajib diisi'); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      priority: Number(form.priority),
      stackable: form.stackable,
      start_date: form.start_date,
      end_date: form.end_date,
    } as Partial<PromoCampaign>;
    try {
      if (formMode === 'edit' && formCampaignId) {
        const updated = await api.updatePromoCampaign(formCampaignId, payload);
        setCampaigns(campaigns.map(c => c.id === formCampaignId ? updated : c));
        if (selectedCampaign?.id === formCampaignId) setSelectedCampaign(updated);
        toast.success('Kampanye diperbarui');
      } else {
        const created = await api.createPromoCampaign({ ...payload, company_id: userProfile.company_id!, is_active: false });
        setCampaigns([created, ...campaigns]);
        toast.success('Kampanye dibuat');
      }
      setShowFormModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan kampanye');
    }
  };

  const handleToggleActive = async (campaign: PromoCampaign) => {
    try {
      const newStatus = !campaign.is_active;
      const updated = await api.updatePromoCampaign(campaign.id, { is_active: newStatus });
      setCampaigns(campaigns.map(c => c.id === campaign.id ? updated : c));
      if (selectedCampaign?.id === campaign.id) setSelectedCampaign(updated);
      toast.success(newStatus ? `"${campaign.name}" diaktifkan` : `"${campaign.name}" dinonaktifkan`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengubah status kampanye');
    }
  };

  const cloneCampaign = async (camp: PromoCampaign) => {
    try {
      const cloned = await api.createPromoCampaign({
        name: `${camp.name} (Salinan)`,
        description: camp.description ?? null,
        priority: camp.priority ?? 100,
        stackable: camp.stackable ?? false,
        start_date: todayStr(),
        end_date: plusDaysStr(7),
        is_active: false,
        company_id: userProfile.company_id!,
      });
      // Copy products
      const products = await api.getCampaignProducts(camp.id);
      if (products.length > 0) {
        await api.addToCampaign(products.map(p => ({
          campaign_id: cloned.id,
          product_id: p.product_id,
          promo_type: p.promo_type,
          promo_price: p.promo_price,
          buy_qty: p.buy_qty,
          get_qty: p.get_qty,
          min_margin_pct: p.min_margin_pct,
          max_qty_per_trx: p.max_qty_per_trx,
          stock_cap: p.stock_cap,
          company_id: userProfile.company_id!,
        })));
      }
      setCampaigns([cloned, ...campaigns]);
      toast.success('Kampanye disalin');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyalin kampanye');
    }
  };

  const confirmDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    try {
      await api.deletePromoCampaign(campaignToDelete.id);
      setCampaigns(campaigns.filter(c => c.id !== campaignToDelete.id));
      if (selectedCampaign?.id === campaignToDelete.id) setSelectedCampaign(null);
      setCampaignToDelete(null);
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
      setSelectedProductIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus produk');
    }
  };

  const removeSelectedProducts = async () => {
    if (selectedProductIds.size === 0) return;
    try {
      await Promise.all([...selectedProductIds].map(id => api.removeFromCampaign(id)));
      setCampaignProducts(campaignProducts.filter(p => !selectedProductIds.has(p.id)));
      setSelectedProductIds(new Set());
      toast.success(`${selectedProductIds.size} produk dihapus`);
    } catch {
      toast.error('Sebagian produk gagal dihapus');
    }
  };

  const applyBulkAction = async () => {
    if (!bulkAction || selectedProductIds.size === 0) return;
    try {
      const updates = await Promise.all(
        [...selectedProductIds].map(async id => {
          const item = campaignProducts.find(p => p.id === id);
          if (!item) return null;
          const patch: any = { promo_type: bulkAction.type };
          if (bulkAction.type === 'price_cut') {
            patch.promo_price = Math.round((item.price || 0) * (1 - bulkAction.pct / 100));
          } else if (bulkAction.type === 'b1g1') {
            patch.buy_qty = 1; patch.get_qty = 1;
          } else if (bulkAction.type === 'b2g1') {
            patch.buy_qty = 2; patch.get_qty = 1;
          }
          await api.updateCampaignProduct(id, patch);
          return { id, patch };
        })
      );
      setCampaignProducts(prev => prev.map(p => {
        const u = updates.find(x => x?.id === p.id);
        return u ? { ...p, ...u.patch } : p;
      }));
      setBulkAction(null);
      setSelectedProductIds(new Set());
      toast.success('Bulk update diterapkan');
    } catch {
      toast.error('Gagal menerapkan bulk update');
    }
  };

  const filteredAvailableProducts = allProducts.filter(p =>
    !campaignProducts.some(cp => cp.product_id === p.id) &&
    ((p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const visibleCampaignProducts = useMemo(() => {
    const f = productFilter.toLowerCase();
    if (!f) return campaignProducts;
    return campaignProducts.filter(p =>
      (p.name || '').toLowerCase().includes(f) ||
      (p.brand || '').toLowerCase().includes(f)
    );
  }, [campaignProducts, productFilter]);

  const visibleCampaigns = useMemo(() => {
    const f = sidebarFilter.toLowerCase();
    return campaigns.filter(c => {
      if (sidebarStatus !== 'all' && getCampaignStatus(c) !== sidebarStatus) return false;
      if (!f) return true;
      return c.name.toLowerCase().includes(f) || (c.description || '').toLowerCase().includes(f);
    });
  }, [campaigns, sidebarFilter, sidebarStatus]);

  const avgMargin = campaignProducts.length > 0
    ? (campaignProducts.reduce((acc, c) => acc + calculateMargin(c), 0) / campaignProducts.length)
    : 0;

  const lowMarginCount = campaignProducts.filter(p => {
    const min = p.min_margin_pct ?? DEFAULT_MIN_MARGIN;
    return calculateMargin(p) < min;
  }).length;

  const kpis = useMemo(() => {
    const live = campaigns.filter(c => getCampaignStatus(c) === 'active').length;
    const totalDiscount = metrics.reduce((acc, m) => acc + Number(m.total_discount || 0), 0);
    const totalRevenue = metrics.reduce((acc, m) => acc + Number(m.gross_revenue || 0), 0);
    const totalCogs = metrics.reduce((acc, m) => acc + Number(m.total_cogs || 0), 0);
    const totalUnits = metrics.reduce((acc, m) => acc + Number(m.units_moved || 0), 0);
    const totalTrx = metrics.reduce((acc, m) => acc + Number(m.trx_count || 0), 0);
    const margin = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;
    return { live, totalDiscount, totalRevenue, totalUnits, totalTrx, margin };
  }, [campaigns, metrics]);

  const selectedCampaignMetric = useMemo(() => {
    if (!selectedCampaign) return null;
    return metrics.find(m => m.campaign_id === selectedCampaign.id) || null;
  }, [selectedCampaign, metrics]);

  const allVisibleSelected = visibleCampaignProducts.length > 0 && visibleCampaignProducts.every(p => selectedProductIds.has(p.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelectedProductIds(new Set());
    else setSelectedProductIds(new Set(visibleCampaignProducts.map(p => p.id)));
  };
  const toggleSelectOne = (id: string) => {
    setSelectedProductIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-50 dark:bg-stone-950 min-h-0">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 min-h-0">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Kampanye Promo</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Kelola diskon, B1G1, dan margin profit kampanye toko Anda.</p>
          </div>
          <button
            onClick={openCreateForm}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Buat kampanye
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard icon={<Activity className="w-3.5 h-3.5" />} label="Kampanye aktif" value={String(kpis.live)} hint={`${campaigns.length} total`} />
          <KpiCard icon={<Tag className="w-3.5 h-3.5" />} label="Total diskon" value={`Rp ${Math.round(kpis.totalDiscount).toLocaleString()}`} />
          <KpiCard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Revenue promo" value={`Rp ${Math.round(kpis.totalRevenue).toLocaleString()}`} />
          <KpiCard icon={<Layers className="w-3.5 h-3.5" />} label="Unit terjual" value={kpis.totalUnits.toLocaleString()} hint={`${kpis.totalTrx} trx`} />
          <KpiCard
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            label="Avg margin"
            value={`${kpis.margin.toFixed(1)}%`}
            tone={kpis.margin > 0 && kpis.margin < DEFAULT_MIN_MARGIN ? 'danger' : 'ok'}
          />
        </div>

        {/* Workspace: Sidebar Card + Detail Card */}
        <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 min-h-[60vh]">
          {/* Sidebar Card */}
          <aside className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl flex flex-col overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-stone-200 dark:border-stone-800 space-y-2 shrink-0">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Daftar kampanye <span className="text-stone-400 dark:text-stone-500 font-normal">({campaigns.length})</span></h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                <input
                  value={sidebarFilter}
                  onChange={e => setSidebarFilter(e.target.value)}
                  placeholder="Cari kampanye..."
                  className="w-full pl-8 pr-2 py-1.5 bg-stone-100 dark:bg-stone-800 border-none rounded-md text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                />
              </div>
              <Select
                value={sidebarStatus}
                onChange={setSidebarStatus}
                options={STATUS_FILTER_OPTIONS}
                size="sm"
                className="w-full"
                buttonClassName="w-full"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 min-h-0 max-h-[55vh] lg:max-h-none">
            {visibleCampaigns.length === 0 ? (
              <div className="p-6 text-center">
                <Inbox className="w-6 h-6 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                <p className="text-sm text-stone-400 dark:text-stone-500">
                  {campaigns.length === 0 ? 'Belum ada kampanye' : 'Tidak ada hasil'}
                </p>
              </div>
            ) : (
              visibleCampaigns.map(camp => {
                const status = getCampaignStatus(camp);
                return (
                  <div key={camp.id} className="relative group mb-1">
                    <button
                      onClick={() => loadCampaignDetail(camp)}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-colors",
                        selectedCampaign?.id === camp.id
                          ? "bg-stone-100 dark:bg-stone-800"
                          : "hover:bg-stone-50 dark:hover:bg-stone-800/50",
                      )}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5 pr-12">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", STATUS_STYLES[status])}>
                          {STATUS_LABEL[status]}
                        </span>
                        {camp.stackable && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                            Stack
                          </span>
                        )}
                        {(camp.priority ?? 100) < 100 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" title="Prioritas tinggi">
                            P{camp.priority}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-stone-900 dark:text-stone-100 text-sm truncate">{camp.name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(camp.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {new Date(camp.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </button>
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditForm(camp); }}
                        className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); cloneCampaign(camp); }}
                        className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded"
                        title="Salin"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCampaignToDelete(camp); }}
                        className="p-1 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded"
                        title="Hapus"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Detail Card */}
        <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl flex flex-col overflow-hidden min-h-[60vh]">
          {selectedCampaign ? (
            <>
              {/* Detail Header */}
              <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4 shrink-0 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 truncate">{selectedCampaign.name}</h2>
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", STATUS_STYLES[getCampaignStatus(selectedCampaign)])}>
                      {STATUS_LABEL[getCampaignStatus(selectedCampaign)]}
                    </span>
                    {selectedCampaign.stackable && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">Stack</span>
                    )}
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">P{selectedCampaign.priority ?? 100}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
                    <span>{campaignProducts.length} produk</span>
                    <span className="text-stone-300 dark:text-stone-600">·</span>
                    <span>Avg margin <span className={cn(
                      "font-medium",
                      avgMargin > 0 && avgMargin < DEFAULT_MIN_MARGIN ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>{avgMargin.toFixed(1)}%</span></span>
                    {lowMarginCount > 0 && (
                      <>
                        <span className="text-stone-300 dark:text-stone-600">·</span>
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-3 h-3" /> {lowMarginCount} produk margin rendah
                        </span>
                      </>
                    )}
                    {selectedCampaignMetric && Number(selectedCampaignMetric.trx_count) > 0 && (
                      <>
                        <span className="text-stone-300 dark:text-stone-600">·</span>
                        <span>{selectedCampaignMetric.trx_count} trx · Rp {Math.round(Number(selectedCampaignMetric.gross_revenue || 0)).toLocaleString()} revenue</span>
                      </>
                    )}
                  </div>
                  {selectedCampaign.description && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 max-w-xl">{selectedCampaign.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditForm(selectedCampaign)}
                    className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Produk
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
              <div className="flex-1 overflow-auto min-h-0">
                <div className="overflow-hidden">
                  {/* Toolbar */}
                  {campaignProducts.length > 0 && (
                    <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3 flex-wrap">
                      <div className="relative flex-1 max-w-xs min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                        <input
                          value={productFilter}
                          onChange={e => setProductFilter(e.target.value)}
                          placeholder="Cari produk dalam kampanye..."
                          className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border-none rounded-md text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedProductIds.size > 0 && (
                          <>
                            <span className="text-xs text-stone-500 dark:text-stone-400">{selectedProductIds.size} dipilih</span>
                            <button
                              onClick={() => setBulkAction({ open: true, type: 'price_cut', pct: 10 })}
                              className="px-2.5 py-1 text-xs font-medium text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700"
                            >
                              Bulk update
                            </button>
                            <button
                              onClick={removeSelectedProducts}
                              className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-md hover:bg-red-100 dark:hover:bg-red-950/50"
                            >
                              Hapus
                            </button>
                          </>
                        )}
                        <p className="text-xs text-stone-500 dark:text-stone-400">{visibleCampaignProducts.length} dari {campaignProducts.length}</p>
                      </div>
                    </div>
                  )}

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
                          <th className="px-3 py-3 w-10">
                            <button onClick={toggleSelectAll} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
                              {allVisibleSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>
                          </th>
                          <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Produk</th>
                          <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Tipe promo</th>
                          <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Harga normal</th>
                          <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Harga promo</th>
                          <th className="px-5 py-3 text-xs font-medium text-stone-500 dark:text-stone-400">Margin</th>
                          <th className="px-5 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {visibleCampaignProducts.map(item => {
                          const margin = calculateMargin(item);
                          const minMargin = item.min_margin_pct ?? DEFAULT_MIN_MARGIN;
                          const isSel = selectedProductIds.has(item.id);
                          return (
                            <tr key={item.id} className={cn(
                              "transition-colors",
                              isSel ? "bg-stone-50 dark:bg-stone-800/50" : "hover:bg-stone-50/50 dark:hover:bg-stone-800/30",
                            )}>
                              <td className="px-3 py-3.5">
                                <button onClick={() => toggleSelectOne(item.id)} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
                                  {isSel ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                </button>
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{item.brand}</p>
                                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{item.name}</p>
                                {(() => {
                                  const masterProduct = allProducts.find(p => p.id === item.product_id);
                                  const stock = masterProduct?.stock ?? 0;
                                  const avg = dailyAverages.get(item.product_id) || 0;
                                  if (stock <= 0 && avg <= 0) return null;
                                  const days = avg > 0 ? stock / avg : Infinity;
                                  const tone = stockDaysTone(days);
                                  return (
                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                                      <span className={cn(stock < 10 && "text-red-600 dark:text-red-400")}>Stok {stock}</span>
                                      {tone !== 'idle' && (
                                        <span className={cn(
                                          tone === 'danger' && "text-red-600 dark:text-red-400 font-medium",
                                          tone === 'warn' && "text-amber-600 dark:text-amber-400",
                                          tone === 'ok' && "text-stone-400 dark:text-stone-500",
                                        )}>· {stockDaysLabel(days)}</span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-5 py-3.5">
                                <Select
                                  value={item.promo_type}
                                  onChange={async (val) => {
                                    const type = val as any;
                                    const updateData: any = { promo_type: type };
                                    if (type === 'buy_x_get_y' && !item.buy_qty) {
                                      updateData.buy_qty = 1;
                                      updateData.get_qty = 1;
                                    }
                                    await api.updateCampaignProduct(item.id, updateData);
                                    setCampaignProducts(campaignProducts.map(p => p.id === item.id ? { ...p, ...updateData } : p));
                                  }}
                                  options={PROMO_TYPE_OPTIONS}
                                  size="sm"
                                  className="min-w-[160px]"
                                />
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
                                <div
                                  className={cn(
                                    "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
                                    margin < minMargin
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  )}
                                  title={margin < minMargin ? `Di bawah margin minimum (${minMargin}%)` : undefined}
                                >
                                  {margin < minMargin && <AlertCircle className="w-3.5 h-3.5" />}
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
              {campaigns.length === 0 && (
                <button
                  onClick={openCreateForm}
                  className="mt-4 px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Buat kampanye pertama
                </button>
              )}
            </div>
          )}
        </section>
        </div>
      </div>

      {/* Create / Edit Campaign Modal */}
      <AnimatePresence>
        {showFormModal && (
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
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                    {formMode === 'edit' ? 'Edit kampanye' : 'Kampanye baru'}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {formMode === 'edit' ? 'Perbarui detail kampanye Anda.' : 'Buat sesi promo untuk toko Anda.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 dark:text-stone-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Nama kampanye</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: Promo Ramadhan 2026"
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Deskripsi (opsional)</label>
                  <input
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Catatan internal..."
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Mulai</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Selesai</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Prioritas</label>
                  <Select
                    value={form.priority}
                    onChange={v => setForm({ ...form, priority: v })}
                    options={PRIORITY_OPTIONS}
                    className="w-full"
                    buttonClassName="w-full"
                  />
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
                    Prioritas <strong>kecil = menang</strong> kalau produk muncul di lebih dari satu kampanye aktif.
                  </p>
                </div>
                <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg p-3">
                  <Toggle
                    checked={form.stackable}
                    onChange={v => setForm({ ...form, stackable: v })}
                    label="Bisa digabung kampanye lain"
                    description="Kampanye stackable boleh aktif paralel dengan stackable lain pada produk yang sama."
                  />
                </div>
              </div>

              <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex gap-2 justify-end">
                <button
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={submitForm}
                  disabled={!form.name.trim()}
                  className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formMode === 'edit' ? 'Simpan' : 'Buat kampanye'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {campaignToDelete && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 p-6"
            >
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-2">Hapus kampanye?</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                Hapus <strong className="text-stone-700 dark:text-stone-200">"{campaignToDelete.name}"</strong>? Semua produk dalam kampanye ini juga akan dihapus.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCampaignToDelete(null)} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
                <button onClick={confirmDeleteCampaign} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Hapus</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Update Modal */}
      <AnimatePresence>
        {bulkAction?.open && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800"
            >
              <div className="p-5 border-b border-stone-200 dark:border-stone-800">
                <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">Bulk update {selectedProductIds.size} produk</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Terapkan satu konfigurasi promo ke semua produk yang dipilih.</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Tipe promo</label>
                  <Select
                    value={bulkAction.type}
                    onChange={v => setBulkAction({ ...bulkAction, type: v as any })}
                    options={[
                      { value: 'price_cut', label: 'Potong harga (%)' },
                      { value: 'b1g1', label: 'Beli 1 gratis 1' },
                      { value: 'b2g1', label: 'Beli 2 gratis 1' },
                    ]}
                    className="w-full"
                    buttonClassName="w-full"
                  />
                </div>
                {bulkAction.type === 'price_cut' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Diskon (%)</label>
                    <input
                      type="number"
                      value={bulkAction.pct}
                      min={1}
                      max={90}
                      onChange={e => setBulkAction({ ...bulkAction, pct: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent tabular-nums"
                    />
                  </div>
                )}
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Harga master tiap produk tidak diubah, hanya harga promo yang dihitung ulang.
                </p>
              </div>
              <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex gap-2 justify-end">
                <button onClick={() => setBulkAction(null)} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
                <button onClick={applyBulkAction} className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Terapkan</button>
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
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{filteredAvailableProducts.length} produk tersedia</p>
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
                {filteredAvailableProducts.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                    <p className="text-sm text-stone-400 dark:text-stone-500">Produk tidak ditemukan</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {filteredAvailableProducts.map(p => (
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

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'ok' | 'danger';
}

function KpiCard({ icon, label, value, hint, tone }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn(
        "text-lg font-semibold tabular-nums",
        tone === 'danger' ? "text-red-600 dark:text-red-400" : "text-stone-900 dark:text-stone-100",
      )}>{value}</p>
      {hint && <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">{hint}</p>}
    </div>
  );
}
