import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, Minus, X, Trash2, ShoppingCart, 
  CreditCard, Banknote, Receipt, CheckCircle2, 
  Package, Calculator, QrCode, User, Calendar, 
  ArrowRight, Printer, RefreshCw, AlertCircle,
  Menu, LayoutDashboard, Truck, Megaphone, Settings as SettingsIcon, Gift, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { buildOffersForProduct, filterLiveCampaigns, offerLabel, PromoOffer } from '../lib/promo';
import { PromoCampaign } from '../types';

interface Product {
  id: string;
  plu: string;
  name: string;
  brand: string;
  price: number;
  stock: number;
  unit: string;
  image_url: string;
  category: string;
  cost_price: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  promoType?: 'price_cut' | 'b1g1' | 'b2g1' | 'buy_x_get_y' | null;
  promoPrice?: number | null;  // effective price per unit after promo
  isFreeItem?: boolean;         // true = this row is the gratisan
  buyQty?: number;
  getQty?: number;
  campaignId?: string | null;
  campaignProductId?: string | null;
  campaignName?: string | null;
}

import { UserProfile } from '../types';

export default function POS({ onNavigate, userProfile }: { onNavigate: (page: any) => void, userProfile: UserProfile }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDebitQRISModalOpen, setIsDebitQRISModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'qris'>('cash');
  const [nonCashRef, setNonCashRef] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<any>(null);
  
  // POS Branding Settings
  const [posSettings, setPosSettings] = useState({
    storeName: 'MY STORE STUDIO',
    slogan: 'Terima kasih sudah berbelanja!',
    address: 'Grogol, Kediri - Jawa Timur',
    phone: '0812-3456-7890'
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active Campaigns (multi)
  const [activeCampaigns, setActiveCampaigns] = useState<PromoCampaign[]>([]);
  const [productOffers, setProductOffers] = useState<Map<string, PromoOffer[]>>(new Map());
  const [pendingPickProduct, setPendingPickProduct] = useState<Product | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchActiveCampaign();
    const timer = setTimeout(() => searchInputRef.current?.focus(), 500);
    const savedBrand = localStorage.getItem('pos_branding_settings');
    if (savedBrand) {
      try { setPosSettings(JSON.parse(savedBrand)); } catch(e) {}
    }
    return () => clearTimeout(timer);
  }, []);

  const fetchActiveCampaign = async () => {
    try {
      const all = await api.getActiveCampaigns(userProfile.company_id!);
      const live = filterLiveCampaigns(all);
      setActiveCampaigns(live);
      if (live.length === 0) { setProductOffers(new Map()); return; }
      const cps = await api.getCampaignProductsBulk(live.map(c => c.id));
      const byProduct = new Map<string, PromoOffer[]>();
      const seen = new Set<string>();
      cps.forEach(cp => seen.add(cp.product_id));
      seen.forEach(pid => byProduct.set(pid, buildOffersForProduct(pid, live, cps)));
      setProductOffers(byProduct);
    } catch (e) {
      setActiveCampaigns([]);
      setProductOffers(new Map());
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProducts(userProfile.company_id!);
      setProducts(data);
    } catch (e) {
      toast.error('Gagal memuat produk');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const s = searchTerm.toLowerCase();
    if (!s) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(s) || 
      p.plu?.toLowerCase().includes(s) ||
      p.brand.toLowerCase().includes(s)
    ).slice(0, 6);
  }, [products, searchTerm]);

  const addToCart = (p: Product) => {
    if (p.stock <= 0) {
      toast.error('Stok habis!');
      return;
    }

    const offers = productOffers.get(p.id) || [];
    if (offers.length > 1) {
      // Let cashier pick which campaign to apply
      setPendingPickProduct(p);
      return;
    }
    addWithOffer(p, offers[0] || null);
  };

  const addWithOffer = (p: Product, offer: PromoOffer | null) => {
    if (offer && (offer.promoType === 'b1g1' || offer.promoType === 'b2g1' || offer.promoType === 'buy_x_get_y')) {
      const buyQty = offer.buyQty;
      const getQty = offer.getQty;
      const totalNeeded = buyQty + getQty;

      if (p.stock < totalNeeded) {
        toast.error(`Stok kurang untuk promo ini (butuh ${totalNeeded} unit)`);
        return;
      }

      const existingPay = cart.find(i => i.product.id === p.id && !i.isFreeItem);
      if (existingPay) {
        if ((existingPay.quantity + buyQty) > p.stock) {
          toast.error('Stok tidak mencukupi');
          return;
        }
        setCart(cart.map(i => {
          if (i.product.id === p.id && !i.isFreeItem) return { ...i, quantity: i.quantity + buyQty };
          if (i.product.id === p.id && i.isFreeItem) return { ...i, quantity: i.quantity + getQty };
          return i;
        }));
      } else {
        const promoLabel = offerLabel(offer, p.price);
        setCart(prev => [
          ...prev,
          {
            product: p, quantity: buyQty, promoType: offer.promoType, promoPrice: p.price,
            isFreeItem: false, buyQty, getQty,
            campaignId: offer.campaignId, campaignProductId: offer.campaignProductId, campaignName: offer.campaignName,
          },
          {
            product: { ...p, name: `${p.name} (GRATIS ${promoLabel})` }, quantity: getQty, promoType: offer.promoType, promoPrice: 0,
            isFreeItem: true,
            campaignId: offer.campaignId, campaignProductId: offer.campaignProductId, campaignName: offer.campaignName,
          },
        ]);
      }
    } else {
      const effectivePrice = offer?.promoType === 'price_cut' && offer.promoPrice ? offer.promoPrice : p.price;
      const existing = cart.find(item => item.product.id === p.id && !item.isFreeItem);
      if (existing) {
        if (existing.quantity >= p.stock) {
          toast.error('Stok tidak mencukupi');
          return;
        }
        setCart(cart.map(item => item.product.id === p.id && !item.isFreeItem ? { ...item, quantity: item.quantity + 1 } : item));
      } else {
        setCart([...cart, {
          product: p, quantity: 1,
          promoType: offer?.promoType || null, promoPrice: effectivePrice,
          campaignId: offer?.campaignId ?? null, campaignProductId: offer?.campaignProductId ?? null, campaignName: offer?.campaignName ?? null,
        }]);
      }
    }

    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const updateQuantity = (id: string, qty: number) => {
    const item = cart.find(i => i.product.id === id);
    if (!item) return;
    
    const newQty = Math.max(1, qty);
    if (newQty > item.product.stock) {
      toast.error('Stok maksimal tercapai');
      return;
    }
    setCart(cart.map(i => i.product.id === id ? { ...i, quantity: newQty } : i));
  };

  const removeFromCart = (id: string, isFree?: boolean) => {
    // Remove paying item + its free-item pair together
    const target = cart.find(i => i.product.id === id && (isFree ? i.isFreeItem : !i.isFreeItem));
    if (target?.promoType && target.promoType !== 'price_cut') {
      setCart(cart.filter(i => i.product.id !== id)); // remove both
    } else {
      setCart(cart.filter(item => item.product.id !== id));
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + ((item.promoPrice ?? item.product.price) * item.quantity), 0);
  const originalTotal = cart.reduce((acc, item) => acc + (item.isFreeItem ? 0 : item.product.price * item.quantity), 0);
  const totalDiscount = originalTotal - subtotal;
  const totalItems = cart.filter(i => !i.isFreeItem).reduce((acc, item) => acc + item.quantity, 0);


  const handleQuickPay = (amount: number) => {
    setPaymentAmount(amount);
  };

  const processPayment = async () => {
    let pay = Number(paymentAmount);
    
    // Auto-fill for non-cash or quick pay
    if (isDebitQRISModalOpen) {
      pay = subtotal;
    }

    if (pay < subtotal) {
      toast.error('Uang pembayaran kurang!');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create Transaction Header
      const sale = await api.addSale({
        company_id: userProfile.company_id,
        items: [
          ...cart.map(i => ({
            product_id: i.product.id,
            name: i.product.name,
            qty: i.quantity,
            price: i.isFreeItem ? 0 : (i.promoPrice ?? i.product.price),
            original_price: i.product.price,
            cost_price: i.product.cost_price || 0,
            promo_type: i.promoType || null,
            is_free_item: i.isFreeItem || false,
          })),
          {
            is_metadata: true,
            cashier_name: userProfile?.nickname || userProfile?.username || 'Kasir',
            cashier_id: userProfile?.id || null
          }
        ],
        total_amount: subtotal,
        payment_amount: pay,
        change_amount: pay - subtotal,
        payment_method: isDebitQRISModalOpen ? paymentMethod : 'cash',
        payment_ref: isDebitQRISModalOpen ? nonCashRef : null,
      });


      // 2. Update Stocks (Atomic) — include free items for volume promos
      for (const item of cart) {
        await api.decrementStock(item.product.id, item.quantity, userProfile.company_id!);
      }

      // 3. Log promo applications for audit / metrics
      const promoApplications: any[] = [];
      const seenPay = new Set<string>();
      for (const item of cart) {
        if (!item.campaignId || item.isFreeItem) continue;
        // Aggregate paid + free item per (product, campaign)
        const key = `${item.product.id}-${item.campaignId}`;
        if (seenPay.has(key)) continue;
        seenPay.add(key);
        const payRow = item;
        const freeRow = cart.find(i => i.product.id === item.product.id && i.isFreeItem && i.campaignId === item.campaignId);
        const unitNormal = item.product.price;
        const unitAfter = (item.promoPrice ?? unitNormal);
        const qtyPaid = payRow.quantity;
        const qtyFree = freeRow?.quantity ?? 0;
        const discount = Math.max(0, (unitNormal - unitAfter) * qtyPaid) + (unitNormal * qtyFree);
        promoApplications.push({
          campaign_id: item.campaignId,
          campaign_product_id: item.campaignProductId ?? null,
          product_id: item.product.id,
          promo_type: item.promoType || 'price_cut',
          qty_paid: qtyPaid,
          qty_free: qtyFree,
          unit_price_normal: unitNormal,
          unit_price_after: unitAfter,
          cost_price_snapshot: item.product.cost_price || 0,
          discount_amount: discount,
        });
      }
      if (promoApplications.length > 0) {
        try {
          await api.logPromoApplications(sale.id, userProfile.company_id!, promoApplications);
        } catch (logErr) {
          // Non-fatal: keep transaction success even if audit fails.
          console.warn('Failed to log promo applications', logErr);
        }
      }


      setCompletedTransaction({
        ...sale,
        items: cart,
        payment_method: isDebitQRISModalOpen ? paymentMethod : 'cash',
        payment_ref: isDebitQRISModalOpen ? nonCashRef : null
      });
      toast.success('Pembayaran Berhasil!');
      setCart([]);
      setPaymentAmount('');
      setNonCashRef('');
      setIsDebitQRISModalOpen(false);
      setIsPaymentModalOpen(false);
      fetchProducts();
    } catch (e) {
      toast.error('Gagal memproses transaksi');
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = () => {
    window.print();
    // Tutup modal struk dan modal pembayaran setelah cetak
    setTimeout(() => {
      setCompletedTransaction(null);
      setIsPaymentModalOpen(false);
      setIsDebitQRISModalOpen(false);
    }, 500);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Top Header POS */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-6 py-3 flex items-center justify-between z-10">
        <div>
          <h1 className="text-base font-semibold text-stone-900 dark:text-stone-100">POS</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">Kasir: {userProfile?.nickname || userProfile?.username || 'Kasir'}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-600 dark:text-stone-300 tabular-nums hidden md:block">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400">
            <User className="w-4 h-4" />
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
            title="Pengaturan Struk"
          >
             <SettingsIcon className="w-4 h-4" />
          </button>

          <button onClick={fetchProducts} className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">
             <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Area: Product Search & Grid */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col">
           {/* Active campaigns banner */}
           {activeCampaigns.length > 0 && (
             <div className="mb-4 flex items-center gap-2 flex-wrap">
               <span className="text-xs text-stone-500 dark:text-stone-400 inline-flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-amber-500" />Kampanye aktif:</span>
               {activeCampaigns.map(c => (
                 <span key={c.id} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60">
                   {c.name}
                 </span>
               ))}
             </div>
           )}

           {/* Search Box */}
           <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cari produk atau scan PLU..."
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
              />
              
              {/* Floating Results */}
              <AnimatePresence>
                {searchTerm && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-4 right-4 mt-4 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden divide-y divide-slate-50"
                  >
                    {filteredProducts.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 italic">Produk tidak ditemukan</div>
                    ) : (
                      filteredProducts.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => addToCart(p)}
                          className={cn(
                            "w-full p-6 flex items-center gap-6 hover:bg-slate-50 transition-all text-left group",
                            p.stock <= 0 && "opacity-50 grayscale pointer-events-none"
                          )}
                        >
                          <div className="w-16 h-16 bg-white rounded-lg border-2 border-slate-100 flex items-center justify-center p-2 group-hover:border-stone-300 group-hover:scale-105 transition-all">
                             <img src={p.image_url} alt="" className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="flex-1">
                             <p className="text-[10px] font-bold text-stone-700 mb-0.5">{p.brand}</p>
                             <h4 className="text-sm font-medium text-slate-800 leading-tight">{p.name}</h4>
                             <p className="text-[10px] font-bold text-rose-500  mt-0.5">PLU: {p.plu}</p>
                          </div>
                          <div className="text-right">
                            {(() => {
                              const offers = productOffers.get(p.id) || [];
                              const primary = offers[0];
                              if (primary?.promoType === 'price_cut' && primary.promoPrice) {
                                return (
                                  <div>
                                    <p className="text-xs font-bold text-slate-400 line-through">Rp {p.price.toLocaleString()}</p>
                                    <p className="text-lg font-medium text-emerald-600">Rp {primary.promoPrice.toLocaleString()}</p>
                                    <span className="text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 px-2 py-0.5 rounded-full">
                                      {offerLabel(primary, p.price)}
                                    </span>
                                    {offers.length > 1 && <span className="ml-1 text-[10px] font-medium text-stone-500">+{offers.length - 1}</span>}
                                  </div>
                                );
                              }
                              if (primary && primary.promoType !== 'price_cut') {
                                return (
                                  <div>
                                    <p className="text-lg font-medium text-stone-700">Rp {p.price.toLocaleString()}</p>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                      <Gift className="w-2.5 h-2.5" />{offerLabel(primary, p.price)}
                                    </span>
                                    {offers.length > 1 && <span className="ml-1 text-[10px] font-medium text-stone-500">+{offers.length - 1}</span>}
                                  </div>
                                );
                              }
                              return <p className="text-lg font-medium text-stone-700">Rp {p.price.toLocaleString()}</p>;
                            })()}
                             <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", p.stock < 10 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200")}>Stok: {p.stock}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
           </div>

           {/* Dashboard Stats or Quick Recommendations can go here */}
           <div className="flex-1 flex flex-col items-center justify-center text-stone-300 dark:text-stone-600">
              <ShoppingCart className="w-16 h-16 mb-3 opacity-30" />
              <p className="text-sm text-stone-400 dark:text-stone-500">Cari produk untuk memulai</p>
           </div>
        </div>

        {/* Right Sidebar: Cart */}
        <div className="w-[520px] bg-white border-l border-slate-200 flex flex-col shadow-lg z-20">
           <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">Keranjang</h3>
                <span className="text-xs text-stone-500 dark:text-stone-400">{totalItems} item</span>
             </div>
           </div>

           <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                   <ShoppingCart className="w-6 h-6 mb-2 text-stone-300 dark:text-stone-600" />
                   <p className="text-sm text-stone-400 dark:text-stone-500">Keranjang kosong</p>
                </div>
              ) : (
                cart.map(item => (
                   <div key={`${item.product.id}-${item.isFreeItem}`} className={cn(
                     "border p-3 rounded-lg flex items-center justify-between group transition-colors",
                     item.isFreeItem ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                   )}>
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                         <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                            <img src={item.product.image_url} alt="" className="max-h-full max-w-full object-contain" />
                         </div>
                         <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {item.isFreeItem && <span className="text-[8px] font-medium bg-amber-500 text-white px-1.5 py-0.5 rounded ">GRATIS</span>}
                              <h4 className="text-xs font-medium text-slate-800 leading-tight">{item.product.name}</h4>
                            </div>
                            {item.isFreeItem 
                              ? <p className="text-[10px] font-medium text-amber-600">Rp 0 (Bonus Promo)</p>
                              : item.promoPrice !== undefined && item.promoPrice !== item.product.price
                              ? <div className="flex items-center gap-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 line-through">Rp {item.product.price.toLocaleString()}</p>
                                  <p className="text-[10px] font-medium text-emerald-600">Rp {(item.promoPrice || 0).toLocaleString()}</p>
                                </div>
                              : <p className="text-[10px] font-medium text-stone-700">Rp {item.product.price.toLocaleString()}</p>
                            }
                         </div>
                      </div>

                      {!item.isFreeItem && (
                        <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                           <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                              <Minus className="w-3.5 h-3.5" />
                           </button>
                           <input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                              className="text-sm font-medium w-8 text-center bg-transparent border-none outline-none focus:ring-0 p-0"
                           />
                           <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 hover:bg-slate-50 rounded-lg text-stone-700 transition-colors">
                              <Plus className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      )}

                      {!item.isFreeItem && (
                        <button onClick={() => removeFromCart(item.product.id)} className="ml-3 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                           <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                   </div>
                 ))
              )}
           </div>

           {/* Order Summary & Pay Button */}
           <div className="p-8 bg-slate-50 border-t border-slate-200 space-y-6">
              <div className="space-y-3">
                 <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold text-slate-500">Subtotal</span>
                    <span className="text-sm font-medium">Rp {originalTotal.toLocaleString()}</span>
                 </div>
                 <div className="flex items-center justify-between text-slate-500 pb-2 border-b border-white">
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      Diskon / Promo{activeCampaigns.length === 1 ? ` (${activeCampaigns[0].name})` : activeCampaigns.length > 1 ? ` (${activeCampaigns.length} kampanye)` : ''}
                    </span>
                    <span className="text-sm font-medium text-emerald-600">- Rp {totalDiscount.toLocaleString()}</span>
                 </div>
                 <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-slate-800">Total Akhir</span>
                    <span className="text-3xl font-medium text-slate-800 er">Rp {subtotal.toLocaleString()}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button 
                    disabled={cart.length === 0}
                    onClick={() => setIsDebitQRISModalOpen(true)}
                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all font-bold text-[11px] text-slate-500 gap-2"
                  >
                     <CreditCard className="w-5 h-5" />
                     Debit / QRIS
                  </button>
                 <button 
                  disabled={cart.length === 0}
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-all font-bold text-sm gap-2  disabled:opacity-50 disabled:grayscale"
                 >
                    <Banknote className="w-6 h-6" />
                    Bayar Tunai
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* --- PAYMENT MODAL (CALCULATOR STYLE) --- */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setIsPaymentModalOpen(false)} 
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.9, y: 20 }} 
               className="bg-white rounded-xl w-full max-w-2xl shadow-lg relative overflow-hidden flex flex-col z-[110]"
             >
                <div className="p-10 border-b flex items-center justify-between bg-slate-50">
                   <div>
                      <h2 className="text-3xl font-medium text-slate-800 er mb-1">Penyelesaian Transaksi</h2>
                      <p className="text-[10px] font-medium text-slate-400  ">Metode Pembayaran: Tunai / Cash</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-medium text-rose-500   mb-1">Total Tagihan</p>
                      <h3 className="text-4xl font-medium text-slate-800 er">Rp {subtotal.toLocaleString()}</h3>
                   </div>
                </div>

                <div className="p-10 space-y-8">
                   <div className="space-y-4">
                      <label className="text-xs font-medium text-slate-400   ml-1">Uang yang Diterima</label>
                      <div className="relative">
                         <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-medium text-slate-300">Rp</div>
                         <input 
                            autoFocus
                            type="number" 
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="0"
                            className="w-full pl-20 pr-10 py-8 bg-slate-50 border-none rounded-lg text-5xl font-medium text-slate-800 outline-none focus:ring-4 focus:ring-stone-900/10 transition-all placeholder-slate-200"
                         />
                      </div>
                   </div>

                   {/* Quick Payment Options */}
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[50000, 100000, 150000, 200000].map(amount => (
                        <button 
                          key={amount}
                          onClick={() => handleQuickPay(amount)}
                          className="py-4 rounded-lg border-2 border-slate-100 font-medium text-slate-600 hover:border-stone-900 hover:text-stone-700 hover:bg-stone-900/5 transition-all"
                        >
                          Rp {amount.toLocaleString()}
                        </button>
                      ))}
                      <button 
                        onClick={() => handleQuickPay(subtotal)}
                        className="py-4 col-span-2 rounded-lg border border-stone-200 dark:border-stone-700 font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        UANG PAS (Rp {subtotal.toLocaleString()})
                      </button>
                   </div>

                   {/* Change Indicator */}
                   {Number(paymentAmount) >= subtotal && (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 bg-emerald-50 rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-between"
                      >
                        <div>
                           <p className="text-[10px] font-medium text-emerald-600   mb-1">Uang Kembalian</p>
                           <h4 className="text-4xl font-medium text-emerald-700 er">Rp {(Number(paymentAmount) - subtotal).toLocaleString()}</h4>
                        </div>
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 opacity-20" />
                     </motion.div>
                   )}

                   <div className="pt-6 flex gap-4">
                      <button 
                        onClick={() => setIsPaymentModalOpen(false)}
                        className="flex-1 py-5 rounded-lg font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                      >
                         Batal
                      </button>
                      <button 
                        disabled={!paymentAmount || Number(paymentAmount) < subtotal || isProcessing}
                        onClick={processPayment}
                        className="flex-[2] py-5 bg-stone-900 text-white rounded-lg font-medium  hover:bg-stone-800 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                      >
                         {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                         KONFIRMASI BAYAR
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DEBIT / QRIS MODAL --- */}
      <AnimatePresence>
        {isDebitQRISModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setIsDebitQRISModalOpen(false)} 
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.9, y: 20 }} 
               className="bg-white rounded-xl w-full max-w-xl shadow-lg relative overflow-hidden flex flex-col z-[160]"
             >
                <div className="p-8 bg-slate-50 border-b flex items-center justify-between">
                   <div>
                      <h2 className="text-2xl font-medium text-slate-800 er">Pembayaran Non-Tunai</h2>
                      <p className="text-[10px] font-medium text-slate-400  ">Pilih Metode EDC / Digital</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-medium text-rose-500   mb-1">Total Tagihan</p>
                      <h3 className="text-3xl font-medium text-slate-800 er">Rp {subtotal.toLocaleString()}</h3>
                   </div>
                </div>

                <div className="p-8 space-y-8">
                   {/* Tab Toggle */}
                   <div className="flex p-1.5 bg-slate-100 rounded-lg gap-1">
                      <button 
                        onClick={() => setPaymentMethod('debit')}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-medium text-xs  transition-all flex items-center justify-center gap-2",
                          paymentMethod === 'debit' ? "bg-white text-stone-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                         <CreditCard className="w-4 h-4" /> Kartu Debit
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('qris')}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-medium text-xs  transition-all flex items-center justify-center gap-2",
                          paymentMethod === 'qris' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                         <QrCode className="w-4 h-4" /> QRIS Scan
                      </button>
                   </div>

                   {/* Content */}
                   {paymentMethod === 'debit' ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                         <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                            <CreditCard className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                            <p className="text-xs font-medium text-slate-400  ">Silahkan Gesek / Masukkan Kartu pada Mesin EDC</p>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-medium text-slate-400   ml-1">Nomor Referensi / Trace</label>
                            <input 
                               type="text" 
                               value={nonCashRef}
                               onChange={(e) => setNonCashRef(e.target.value)}
                               placeholder="Contoh: 123456"
                               className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-lg focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-bold text-slate-800"
                            />
                         </div>
                      </div>
                   ) : (
                      <div className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-2">
                         <div className="w-48 h-48 bg-white mx-auto p-4 rounded-lg shadow-xl border border-slate-100 flex items-center justify-center">
                            {/* Mock QR Code */}
                            <div className="relative group">
                               <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=POS-LILYMART" alt="QRIS" className="w-40 h-40 group-hover:blur-[2px] transition-all" />
                               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                  <QrCode className="w-10 h-10 text-emerald-600" />
                               </div>
                            </div>
                         </div>
                         <p className="text-[10px] font-medium text-emerald-600  ">Scan QRIS via Dana / ShopeePay / OVO / M-Banking</p>
                      </div>
                   )}

                   <div className="pt-6 flex gap-4">
                      <button 
                        onClick={() => setIsDebitQRISModalOpen(false)}
                        className="flex-1 py-5 rounded-lg font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all  text-xs"
                      >
                         Batal
                      </button>
                      <button 
                        disabled={isProcessing || (paymentMethod === 'debit' && !nonCashRef)}
                        onClick={processPayment}
                        className="flex-[2] py-5 bg-stone-900 text-white rounded-lg font-medium  hover:bg-stone-800 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3  text-xs "
                      >
                         {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                         KONFIRMASI BAYAR LUNAS
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SUCCESS / RECEIPT MODAL --- */}
      <AnimatePresence>
        {completedTransaction && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
             <div className="bg-white rounded-xl w-full max-w-sm shadow-lg overflow-hidden relative ReceiptArea">
                <div className="p-8 pb-4 text-center border-b border-dashed border-slate-200">
                   <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                   </div>
                   <h2 className="text-2xl font-medium text-slate-800 er mb-1 ">{posSettings.storeName}</h2>
                    <p className="text-[10px] font-bold text-slate-400   leading-tight whitespace-pre-line">
                       {posSettings.address}
                       {posSettings.phone && `\nTelp: ${posSettings.phone}`}
                    </p>
                </div>

                <div className="p-8 space-y-6">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between text-[10px] font-medium text-slate-400  er">
                         <span>#{completedTransaction.id.toString().slice(-8).toUpperCase()}</span>
                         <span>{new Date(completedTransaction.created_at).toLocaleString('id-ID')}</span>
                      </div>
                      
                      <div className="border-t border-b border-dashed border-slate-100 py-4 space-y-2">
                         {completedTransaction.items.map((item: any, idx: number) => (
                           <div key={idx} className="flex justify-between text-xs font-bold text-slate-700">
                              <div className="flex-1 pr-4">
                                 {item.isFreeItem 
                                   ? <p className="leading-tight text-amber-600">{item.product.name}</p>
                                   : <p className="leading-tight">{item.product.name}</p>
                                 }
                                 {item.isFreeItem 
                                   ? <p className="text-[10px] text-amber-500 ">BONUS PROMO</p>
                                   : <p className="text-[10px] text-slate-400 ">{item.quantity} x {(item.promoPrice ?? item.product.price).toLocaleString()}</p>
                                 }
                              </div>
                              <span className={item.isFreeItem ? "text-amber-600" : "text-slate-800"}>
                                {item.isFreeItem ? 'GRATIS' : ((item.promoPrice ?? item.product.price) * item.quantity).toLocaleString()}
                              </span>
                           </div>
                         ))}
                      </div>

                      <div className="space-y-1 pt-2">
                         {totalDiscount > 0 && (
                           <div className="flex justify-between text-xs font-bold text-emerald-600">
                              <span>DISKON PROMO</span>
                              <span>- {totalDiscount.toLocaleString()}</span>
                           </div>
                         )}
                         <div className="flex justify-between text-xs font-bold text-slate-500">
                            <span>SUBTOTAL</span>
                            <span>{originalTotal.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between text-lg font-medium text-slate-800">
                            <span>TOTAL</span>
                            <span>{completedTransaction.total_amount.toLocaleString()}</span>
                         </div>
                      </div>

                      <div className="space-y-1 border-t border-slate-50 pt-4">
                         <div className="flex justify-between text-[10px] font-bold text-slate-500">
                            <span className="">{completedTransaction.payment_method === 'cash' ? 'TUNAI' : completedTransaction.payment_method}</span>
                            <span>{completedTransaction.payment_amount.toLocaleString()}</span>
                         </div>
                         {completedTransaction.payment_method !== 'cash' && (
                           <div className="flex justify-between text-[10px] font-bold text-slate-400">
                              <span>REF/TRACE</span>
                              <span>{completedTransaction.payment_ref}</span>
                           </div>
                         )}
                         <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>KEMBALI</span>
                            <span>{completedTransaction.change_amount.toLocaleString()}</span>
                         </div>
                      </div>
                   </div>

                   {/* Receipt Footer Note */}
                   <div className="mt-6 pt-5 border-t border-dashed border-slate-200 text-center space-y-1.5">
                      <p className="text-[10px] font-medium text-slate-700  ">
                         {posSettings.slogan}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                         Barang yang sudah dibeli tidak dapat ditukar.
                      </p>
                   </div>

                   <div className="pt-5 text-center space-y-4 no-print">
                      <div className="grid grid-cols-2 gap-3">
                         <button 
                           onClick={() => {
                              setCompletedTransaction(null);
                              setIsPaymentModalOpen(false);
                              setIsDebitQRISModalOpen(false);
                            }}
                           className="py-4 bg-slate-100 text-slate-500 rounded-lg font-medium text-xs "
                         >
                            Selesai
                         </button>
                         <button 
                           onClick={printReceipt}
                           className="py-4 bg-stone-900 text-white rounded-lg font-medium text-xs   flex items-center justify-center gap-2"
                         >
                            <Printer className="w-4 h-4" />
                            Print Struk
                         </button>
                      </div>
                   </div>
                </div>

                <style>{`
                  @media print {
                    body * { visibility: hidden; }
                    .ReceiptArea, .ReceiptArea * { visibility: visible; }
                    .ReceiptArea { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
                    .no-print { display: none !important; }
                  }
                `}</style>
             </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- POS SETTINGS MODAL --- */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setIsSettingsOpen(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-xl w-full max-w-lg shadow-lg relative z-[610] overflow-hidden flex flex-col"
             >
                <div className="p-8 pb-6 border-b border-slate-50 flex items-start justify-between bg-slate-50">
                   <div className="flex flex-col items-start text-left">
                      <div className="w-14 h-14 bg-stone-900/10 rounded-lg flex items-center justify-center text-stone-700 mb-5">
                         <SettingsIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-slate-800  leading-none mb-1.5">Pengaturan Struk</h3>
                        <p className="text-[10px] font-medium text-slate-400   leading-none">Branding & Informasi Toko</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setIsSettingsOpen(false)} 
                     className="p-2.5 hover:bg-white rounded-xl text-slate-400 hover:text-slate-500 transition-all -mr-2 -mt-2"
                   >
                     <X className="w-5 h-5" />
                   </button>
                </div>

                <div className="p-8 space-y-6">
                   <div className="space-y-4">
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-medium text-slate-400   ml-1">Nama Toko</label>
                         <input 
                            type="text" 
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-lg focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-bold text-slate-700"
                            value={posSettings.storeName}
                            onChange={(e) => setPosSettings({...posSettings, storeName: e.target.value})}
                         />
                      </div>

                      <div className="space-y-1.5">
                         <label className="text-[10px] font-medium text-slate-400   ml-1">Slogan Struk</label>
                         <input 
                            type="text" 
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-lg focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-bold text-slate-700"
                            value={posSettings.slogan}
                            onChange={(e) => setPosSettings({...posSettings, slogan: e.target.value})}
                         />
                      </div>

                      <div className="space-y-1.5">
                         <label className="text-[10px] font-medium text-slate-400   ml-1">Alamat Toko</label>
                         <textarea 
                            rows={2}
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-lg focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-bold text-slate-700 resize-none"
                            value={posSettings.address}
                            onChange={(e) => setPosSettings({...posSettings, address: e.target.value})}
                         />
                      </div>

                      <div className="space-y-1.5">
                         <label className="text-[10px] font-medium text-slate-400   ml-1">Nomor Telp</label>
                            <input 
                               type="text" 
                               className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-lg focus:border-stone-900 focus:bg-white focus:outline-none transition-all font-bold text-slate-700"
                               value={posSettings.phone}
                               onChange={(e) => setPosSettings({...posSettings, phone: e.target.value})}
                            />
                         </div>

                   </div>

                   <button 
                      onClick={() => {
                        localStorage.setItem('pos_branding_settings', JSON.stringify(posSettings));
                        setIsSettingsOpen(false);
                        toast.success('Pengaturan Struk Disimpan!');
                      }}
                      className="w-full py-3.5 bg-stone-900 text-white rounded-lg text-[11px] font-medium    hover:bg-stone-800 transition-all"
                   >
                      Simpan & Terapkan
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MULTI-PROMO PICKER --- */}
      <AnimatePresence>
        {pendingPickProduct && (() => {
          const offers = productOffers.get(pendingPickProduct.id) || [];
          return (
            <div className="fixed inset-0 z-[5500] flex items-center justify-center p-4 bg-black/50" onClick={() => setPendingPickProduct(null)}>
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
                    <p className="text-xs text-stone-500 dark:text-stone-400">Pilih promo</p>
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{pendingPickProduct.name}</h2>
                  </div>
                  <button onClick={() => setPendingPickProduct(null)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 overflow-y-auto flex-1 space-y-2">
                  <button
                    onClick={() => { addWithOffer(pendingPickProduct, null); setPendingPickProduct(null); }}
                    className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60 text-left transition-colors"
                  >
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Tanpa promo</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">Rp {pendingPickProduct.price.toLocaleString()}</p>
                  </button>
                  {offers.map((offer, idx) => (
                    <button
                      key={offer.campaignProductId}
                      onClick={() => { addWithOffer(pendingPickProduct, offer); setPendingPickProduct(null); }}
                      className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{offer.campaignName}</p>
                        {idx === 0 && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shrink-0">Direkomendasikan</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                          <Gift className="w-3 h-3" />{offerLabel(offer, pendingPickProduct.price)}
                        </span>
                        {offer.promoType === 'price_cut' && offer.promoPrice != null && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">Rp {offer.promoPrice.toLocaleString()}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
