import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, Minus, X, Trash2, ShoppingCart, 
  CreditCard, Banknote, Receipt, CheckCircle2, 
  Package, Calculator, QrCode, User, Calendar, 
  ArrowRight, Printer, RefreshCw, AlertCircle,
  Menu, LayoutDashboard, Truck, Megaphone, Settings as SettingsIcon, Gift, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import toast from 'react-hot-toast';
import LoadingScreen from '../../../components/LoadingScreen';
import { buildOffersForProduct, filterLiveCampaigns, offerLabel, PromoOffer } from '../../../lib/promo';
import { PromoCampaign } from '../../../types';

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

import { UserProfile } from '../../../types';

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
  const [showActivePromoDrawer, setShowActivePromoDrawer] = useState(false);
  
  // Cashier Shift & Settlement state
  const [activeShift, setActiveShift] = useState<any>(null);
  const [isOpeningShiftModalOpen, setIsOpeningShiftModalOpen] = useState(false);
  const [startingCashInput, setStartingCashInput] = useState<string>('');
  const [isClosingShiftModalOpen, setIsClosingShiftModalOpen] = useState(false);
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [shiftNotes, setShiftNotes] = useState<string>('');
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [printedShiftReceipt, setPrintedShiftReceipt] = useState<any>(null);
  const [allRecentSales, setAllRecentSales] = useState<any[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const checkActiveShift = async () => {
    try {
      const shift = await api.getActiveSettlement(userProfile.company_id!, userProfile.id!);
      if (shift) {
        setActiveShift(shift);
      } else {
        setIsOpeningShiftModalOpen(true);
      }
    } catch (e) {
      console.error('Gagal mengecek shift aktif', e);
      setIsOpeningShiftModalOpen(true);
    }
  };

  const handleStartShift = async () => {
    const startingCash = Number(startingCashInput) || 0;
    if (startingCash < 0) {
      toast.error('Modal awal tidak boleh negatif');
      return;
    }
    
    setIsProcessing(true);
    try {
      const newShift = await api.createSettlement({
        company_id: userProfile.company_id,
        cashier_id: userProfile.id || null,
        cashier_name: userProfile?.nickname || userProfile?.username || 'Kasir',
        starting_cash: startingCash,
        expected_cash: startingCash,
        status: 'open'
      });
      
      setActiveShift(newShift);
      setIsOpeningShiftModalOpen(false);
      setStartingCashInput('');
      toast.success('Shift kasir berhasil dibuka!');
    } catch (e) {
      toast.error('Gagal membuka shift');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenClosingModal = async () => {
    if (!activeShift) return;
    setIsLoading(true);
    try {
      const sales = await api.getSales(userProfile.company_id!);
      setAllRecentSales(sales);
      
      const shiftStartTime = new Date(activeShift.created_at).getTime();
      const shiftSales = sales.filter((sale: any) => {
        const saleTime = new Date(sale.created_at).getTime();
        if (saleTime < shiftStartTime) return false;
        
        const cashierMeta = sale.items?.find((i: any) => i.is_metadata);
        const saleCashierId = cashierMeta?.cashier_id;
        const saleCashierName = cashierMeta?.cashier_name;
        const currentCashierName = userProfile?.nickname || userProfile?.username || 'Kasir';
        
        return (saleCashierId && saleCashierId === userProfile.id) || 
               (saleCashierName === currentCashierName);
      });
      
      let cashSales = 0;
      let qrisSales = 0;
      let debitSales = 0;
      let totalSales = 0;
      
      shiftSales.forEach((sale: any) => {
        totalSales += (sale.total_amount || 0);
        if (sale.payment_method === 'cash') {
          cashSales += (sale.total_amount || 0);
        } else if (sale.payment_method === 'qris') {
          qrisSales += (sale.total_amount || 0);
        } else if (sale.payment_method === 'debit') {
          debitSales += (sale.total_amount || 0);
        }
      });
      
      const startingCash = Number(activeShift.starting_cash || 0);
      const expectedCash = startingCash + cashSales;
      
      setShiftSummary({
        shiftSalesCount: shiftSales.length,
        startingCash,
        cashSales,
        qrisSales,
        debitSales,
        expectedCash,
        totalSales,
      });
      
      setActualCashInput(String(expectedCash));
      setShiftNotes('');
      setIsClosingShiftModalOpen(true);
    } catch (e) {
      toast.error('Gagal memuat rekap penjualan shift');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseShiftSubmit = async () => {
    if (!activeShift || !shiftSummary) return;
    
    const actualCash = Number(actualCashInput) || 0;
    if (actualCash < 0) {
      toast.error('Uang aktual tidak boleh negatif');
      return;
    }
    
    const expectedCash = shiftSummary.expectedCash;
    const difference = actualCash - expectedCash;
    
    setIsProcessing(true);
    try {
      const closingData = {
        expected_cash: expectedCash,
        actual_cash: actualCash,
        difference: difference,
        total_sales: shiftSummary.totalSales,
        cash_sales: shiftSummary.cashSales,
        qris_sales: shiftSummary.qrisSales,
        debit_sales: shiftSummary.debitSales,
        notes: shiftNotes
      };
      
      const closedShift = await api.closeSettlement(activeShift.id, closingData);
      
      setPrintedShiftReceipt({
        ...closedShift,
        ...shiftSummary,
        actual_cash: actualCash,
        difference: difference,
        notes: shiftNotes
      });
      
      setActiveShift(null);
      setShiftSummary(null);
      setIsClosingShiftModalOpen(false);
      
      toast.success('Shift kasir ditutup & diselesaikan!');
    } catch (e) {
      toast.error('Gagal menutup shift');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchActiveCampaign();
    checkActiveShift();
    const timer = setTimeout(() => searchInputRef.current?.focus(), 500);
    const savedBrand = localStorage.getItem('pos_branding_settings');
    if (savedBrand) {
      try { setPosSettings(JSON.parse(savedBrand)); } catch(e) {}
    }
    // Refresh active campaigns every 60s so cashiers pick up new promos
    // without forcing a page reload.
    const refreshTimer = setInterval(() => fetchActiveCampaign(), 60_000);
    return () => { clearTimeout(timer); clearInterval(refreshTimer); };
  }, []);

  // Re-validate cart when active campaigns or offers change. If a cart line
  // references a campaign that's no longer active, drop the promo metadata
  // (and the paired free-item row for volume promos).
  useEffect(() => {
    if (cart.length === 0) return;
    const liveCampaignIds = new Set(activeCampaigns.map(c => c.id));
    let mutated = false;
    const next: CartItem[] = [];
    for (const item of cart) {
      const stillValid = !item.campaignId || liveCampaignIds.has(item.campaignId);
      if (stillValid) {
        // Extra check: if its specific offer disappeared (e.g. removed from campaign),
        // reset to plain price.
        if (item.campaignId && !item.isFreeItem) {
          const offers = productOffers.get(item.product.id) || [];
          const matchingOffer = offers.find(o => o.campaignProductId === item.campaignProductId);
          if (!matchingOffer) {
            mutated = true;
            next.push({ ...item, promoType: null, promoPrice: item.product.price, campaignId: null, campaignProductId: null, campaignName: null });
            continue;
          }
        }
        next.push(item);
      } else {
        // Drop free items entirely; keep paying line but strip promo.
        if (item.isFreeItem) { mutated = true; continue; }
        mutated = true;
        next.push({ ...item, promoType: null, promoPrice: item.product.price, campaignId: null, campaignProductId: null, campaignName: null });
      }
    }
    if (mutated) {
      setCart(next);
      toast('Promo cart diperbarui karena ada kampanye yang berubah', { icon: '🔄' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCampaigns, productOffers]);

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
            campaign_id: i.campaignId || null,
            campaign_name: i.campaignName || null,
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
        originalTotal,
        totalDiscount,
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

  if (isLoading && products.length === 0) {
    return <LoadingScreen page="pos" />;
  }

  return (
    <div className="flex flex-col h-screen bg-stone-50 dark:bg-stone-950 overflow-hidden">
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

          {activeShift && (
            <button
              onClick={handleOpenClosingModal}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors no-print"
              title="Tutup Shift Kasir"
            >
              🔐 Tutup Shift
            </button>
          )}

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors no-print"
            title="Pengaturan Struk"
          >
             <SettingsIcon className="w-4 h-4" />
          </button>

          <button onClick={() => { fetchProducts(); fetchActiveCampaign(); }} className="p-2 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors no-print">
             <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Area: Product Search & Grid */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col">
           {/* Active campaigns banner */}
           {activeCampaigns.length > 0 && (
             <button
               type="button"
               onClick={() => setShowActivePromoDrawer(true)}
               className="mb-4 self-start flex items-center gap-2 flex-wrap text-left rounded-lg px-2 py-1 -mx-2 hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors"
               title="Lihat detail promo"
             >
               <span className="text-xs text-stone-500 dark:text-stone-400 inline-flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-amber-500" />Kampanye aktif:</span>
               {activeCampaigns.map(c => (
                 <span key={c.id} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60">
                   {c.name}
                 </span>
               ))}
               <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 underline underline-offset-2 ml-1">Lihat detail</span>
             </button>
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
                    className="absolute top-full left-4 right-4 mt-4 bg-white dark:bg-stone-900 rounded-xl shadow-lg border border-stone-200 dark:border-stone-800 z-50 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800"
                  >
                    {filteredProducts.length === 0 ? (
                      <div className="p-10 text-center text-stone-400 dark:text-stone-500 italic">Produk tidak ditemukan</div>
                    ) : (
                      filteredProducts.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => addToCart(p)}
                          className={cn(
                            "w-full p-6 flex items-center gap-6 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-all text-left group",
                            p.stock <= 0 && "opacity-50 grayscale pointer-events-none"
                          )}
                        >
                          <div className="w-16 h-16 bg-white dark:bg-stone-800 rounded-lg border-2 border-stone-100 dark:border-stone-700 flex items-center justify-center p-2 group-hover:border-stone-300 dark:group-hover:border-stone-600 group-hover:scale-105 transition-all">
                             <img src={p.image_url} alt="" className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="flex-1">
                             <p className="text-[10px] font-bold text-stone-700 dark:text-stone-300 mb-0.5">{p.brand}</p>
                             <h4 className="text-sm font-medium text-stone-800 dark:text-stone-100 leading-tight">{p.name}</h4>
                             <p className="text-[10px] font-bold text-rose-500  mt-0.5">PLU: {p.plu}</p>
                          </div>
                          <div className="text-right">
                            {(() => {
                              const offers = productOffers.get(p.id) || [];
                              const primary = offers[0];
                              if (primary?.promoType === 'price_cut' && primary.promoPrice) {
                                return (
                                  <div>
                                    <p className="text-xs font-bold text-stone-400 dark:text-stone-500 line-through">Rp {p.price.toLocaleString()}</p>
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
        <div className="w-[520px] bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 flex flex-col shadow-lg z-20">
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
                         <div className="w-12 h-12 bg-white dark:bg-stone-700 rounded-xl border border-stone-100 dark:border-stone-700 flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                            <img src={item.product.image_url} alt="" className="max-h-full max-w-full object-contain" />
                         </div>
                         <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {item.isFreeItem && <span className="text-[8px] font-medium bg-amber-500 text-white px-1.5 py-0.5 rounded ">GRATIS</span>}
                              <h4 className="text-xs font-medium text-stone-800 dark:text-stone-100 leading-tight">{item.product.name}</h4>
                            </div>
                            {item.isFreeItem 
                              ? <p className="text-[10px] font-medium text-amber-600">Rp 0 (Bonus Promo)</p>
                              : item.promoPrice !== undefined && item.promoPrice !== item.product.price
                              ? <div className="flex items-center gap-1.5">
                                  <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 line-through">Rp {item.product.price.toLocaleString()}</p>
                                  <p className="text-[10px] font-medium text-emerald-600">Rp {(item.promoPrice || 0).toLocaleString()}</p>
                                </div>
                              : <p className="text-[10px] font-medium text-stone-700 dark:text-stone-300">Rp {item.product.price.toLocaleString()}</p>
                            }
                         </div>
                      </div>

                      {!item.isFreeItem && (
                        <div className="flex items-center gap-2 bg-white dark:bg-stone-800 px-2 py-1.5 rounded-lg border border-stone-100 dark:border-stone-700 shadow-sm">
                           <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-lg text-stone-400 dark:text-stone-500 transition-colors">
                              <Minus className="w-3.5 h-3.5" />
                           </button>
                           <input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                              className="text-sm font-medium w-8 text-center bg-transparent border-none outline-none focus:ring-0 p-0 text-stone-900 dark:text-stone-100"
                           />
                           <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 hover:bg-stone-50 dark:hover:bg-stone-700 rounded-lg text-stone-700 dark:text-stone-300 transition-colors">
                              <Plus className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      )}

                      {!item.isFreeItem && (
                        <button onClick={() => removeFromCart(item.product.id)} className="ml-3 p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all">
                           <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                   </div>
                 ))
              )}
           </div>

           {/* Order Summary & Pay Button */}
           <div className="p-8 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 space-y-6">
              <div className="space-y-3">
                 <div className="flex items-center justify-between text-stone-500 dark:text-stone-400">
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Subtotal</span>
                    <span className="text-sm font-medium">Rp {originalTotal.toLocaleString()}</span>
                 </div>
                 <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 pb-2 border-b border-white dark:border-stone-800">
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      Diskon / Promo{activeCampaigns.length === 1 ? ` (${activeCampaigns[0].name})` : activeCampaigns.length > 1 ? ` (${activeCampaigns.length} kampanye)` : ''}
                    </span>
                    <span className="text-sm font-medium text-emerald-600">- Rp {totalDiscount.toLocaleString()}</span>
                 </div>
                 <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-100">Total Akhir</span>
                    <span className="text-3xl font-medium text-stone-800 dark:text-stone-100">Rp {subtotal.toLocaleString()}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button 
                    disabled={cart.length === 0}
                    onClick={() => setIsDebitQRISModalOpen(true)}
                    className="flex flex-col items-center justify-center p-4 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-all font-bold text-[11px] text-stone-500 dark:text-stone-300 gap-2 disabled:opacity-50"
                  >
                     <CreditCard className="w-5 h-5" />
                     Debit / QRIS
                  </button>
                 <button 
                  disabled={cart.length === 0}
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg hover:bg-stone-800 dark:hover:bg-stone-200 transition-all font-bold text-sm gap-2 disabled:opacity-50 disabled:grayscale"
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPaymentModalOpen(false)} className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 z-10"
            >
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Pembayaran Tunai</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Masukkan jumlah uang yang diterima</p>
                </div>
                <button onClick={() => setIsPaymentModalOpen(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500 dark:text-stone-400">Total tagihan</span>
                  <span className="text-lg font-semibold text-stone-900 dark:text-stone-100 tabular-nums">Rp {subtotal.toLocaleString()}</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Uang diterima</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 dark:text-stone-500">Rp</span>
                    <input
                      autoFocus
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Cepat</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[20000, 50000, 100000].map(amount => (
                      <button
                        key={amount}
                        onClick={() => handleQuickPay(amount)}
                        className="px-2 py-2 rounded-md border border-stone-200 dark:border-stone-700 text-sm text-stone-700 dark:text-stone-200 tabular-nums hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                      >
                        {amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleQuickPay(subtotal)}
                    className="w-full mt-2 px-3 py-2 rounded-md border border-stone-200 dark:border-stone-700 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Uang pas (Rp {subtotal.toLocaleString()})
                  </button>
                </div>

                {Number(paymentAmount) >= subtotal && Number(paymentAmount) > 0 && (
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-dashed border-stone-200 dark:border-stone-700">
                    <span className="text-stone-500 dark:text-stone-400">Kembalian</span>
                    <span className="text-base font-semibold text-stone-900 dark:text-stone-100 tabular-nums">Rp {(Number(paymentAmount) - subtotal).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  disabled={!paymentAmount || Number(paymentAmount) < subtotal || isProcessing}
                  onClick={processPayment}
                  className="flex-[2] py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Konfirmasi bayar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DEBIT / QRIS MODAL --- */}
      <AnimatePresence>
        {isDebitQRISModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDebitQRISModalOpen(false)} className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 z-10"
            >
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Pembayaran Non-Tunai</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Pilih metode EDC atau QRIS</p>
                </div>
                <button onClick={() => setIsDebitQRISModalOpen(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500 dark:text-stone-400">Total tagihan</span>
                  <span className="text-lg font-semibold text-stone-900 dark:text-stone-100 tabular-nums">Rp {subtotal.toLocaleString()}</span>
                </div>

                <div className="flex p-1 bg-stone-100 dark:bg-stone-800 rounded-lg gap-1">
                  <button
                    onClick={() => setPaymentMethod('debit')}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                      paymentMethod === 'debit'
                        ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                        : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200",
                    )}
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Debit
                  </button>
                  <button
                    onClick={() => setPaymentMethod('qris')}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5",
                      paymentMethod === 'qris'
                        ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                        : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200",
                    )}
                  >
                    <QrCode className="w-3.5 h-3.5" /> QRIS
                  </button>
                </div>

                {paymentMethod === 'debit' ? (
                  <div className="space-y-3">
                    <div className="text-center py-4 border border-dashed border-stone-200 dark:border-stone-700 rounded-lg">
                      <CreditCard className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                      <p className="text-xs text-stone-500 dark:text-stone-400">Gesek atau insert kartu pada mesin EDC</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">No. referensi / trace</label>
                      <input
                        type="text"
                        value={nonCashRef}
                        onChange={(e) => setNonCashRef(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2 py-2">
                    <div className="w-40 h-40 mx-auto bg-white p-3 rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center">
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=POS-LILYMART" alt="QRIS" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Scan QRIS dari aplikasi mobile banking / e-wallet</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2">
                <button
                  onClick={() => setIsDebitQRISModalOpen(false)}
                  className="flex-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  disabled={isProcessing || (paymentMethod === 'debit' && !nonCashRef)}
                  onClick={processPayment}
                  className="flex-[2] py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Konfirmasi bayar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SUCCESS / RECEIPT MODAL --- */}
      <AnimatePresence>
        {completedTransaction && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 no-print" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-none shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[85vh] z-10 ReceiptArea"
            >
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between no-print">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Detail Transaksi</h3>
                <button
                  onClick={() => { setCompletedTransaction(null); setIsPaymentModalOpen(false); setIsDebitQRISModalOpen(false); }}
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <div className="text-center mb-4 pb-4 border-b border-dashed border-stone-200 dark:border-stone-700">
                  <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 uppercase">{posSettings.storeName}</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{posSettings.address}</p>
                </div>

                <div className="space-y-1 mb-4 pb-4 border-b border-dashed border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400">
                  <div className="flex justify-between"><span>No.</span><span className="font-mono">#{completedTransaction.id.toString().toUpperCase()}</span></div>
                  <div className="flex justify-between"><span>Waktu</span><span>{new Date(completedTransaction.created_at).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between"><span>Kasir</span><span>{userProfile?.nickname || userProfile?.username || 'Kasir'}</span></div>
                </div>

                {/* Items: each line uses normal price, then promo savings shown below in stone tone */}
                <div className="space-y-2 mb-4 pb-4 border-b border-dashed border-stone-200 dark:border-stone-700">
                  {completedTransaction.items.map((item: any, idx: number) => {
                    const normal = item.product.price;
                    const lineNormal = normal * item.quantity;
                    const after = item.isFreeItem ? 0 : (item.promoPrice ?? normal);
                    const lineDiscount = item.isFreeItem
                      ? lineNormal
                      : Math.max(0, (normal - after) * item.quantity);
                    return (
                      <div key={idx} className="flex justify-between text-sm">
                        <div className="min-w-0 pr-2">
                          <p className="text-stone-800 dark:text-stone-200">{item.product.name}</p>
                          <p className="text-xs text-stone-400 dark:text-stone-500">{item.quantity} × Rp {normal.toLocaleString()}</p>
                          {lineDiscount > 0 && (
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                              Diskon{item.campaignName ? ` ${item.campaignName}` : ''}: − Rp {lineDiscount.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums shrink-0">
                          Rp {lineNormal.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Totals: normal subtotal, total discount, payable */}
                <div className="space-y-1 text-sm mb-4">
                  <div className="flex justify-between text-stone-700 dark:text-stone-300">
                    <span>Subtotal (harga normal)</span>
                    <span className="tabular-nums">Rp {(completedTransaction.originalTotal ?? completedTransaction.total_amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-stone-700 dark:text-stone-300">
                    <span>Total diskon</span>
                    <span className="tabular-nums">− Rp {(completedTransaction.totalDiscount ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-stone-900 dark:text-stone-100 pt-1 border-t border-dashed border-stone-200 dark:border-stone-700 mt-1">
                    <span>Total</span>
                    <span className="tabular-nums">Rp {completedTransaction.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400 pt-1">
                    <span>{completedTransaction.payment_method === 'cash' ? 'Tunai' : completedTransaction.payment_method.toUpperCase()}</span>
                    <span className="tabular-nums">Rp {completedTransaction.payment_amount.toLocaleString()}</span>
                  </div>
                  {completedTransaction.payment_method !== 'cash' && completedTransaction.payment_ref && (
                    <div className="flex justify-between text-stone-600 dark:text-stone-400">
                      <span>Ref / Trace</span>
                      <span className="font-mono">{completedTransaction.payment_ref}</span>
                    </div>
                  )}
                  {completedTransaction.change_amount > 0 && (
                    <div className="flex justify-between text-stone-600 dark:text-stone-400">
                      <span>Kembali</span>
                      <span className="tabular-nums">Rp {completedTransaction.change_amount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="text-center pt-4 border-t border-dashed border-stone-200 dark:border-stone-700">
                  <p className="text-xs text-stone-400 dark:text-stone-500">{posSettings.slogan}</p>
                </div>
              </div>

              <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 no-print">
                <button
                  onClick={printReceipt}
                  className="flex-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </button>
                <button
                  onClick={() => { setCompletedTransaction(null); setIsPaymentModalOpen(false); setIsDebitQRISModalOpen(false); }}
                  className="flex-1 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
                >
                  Tutup
                </button>
              </div>

              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  .ReceiptArea, .ReceiptArea * { visibility: visible; }
                  .ReceiptArea { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
                  .no-print { display: none !important; }
                }
              `}</style>
            </motion.div>
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

      {/* --- ACTIVE CAMPAIGNS DRAWER --- */}
      <AnimatePresence>
        {showActivePromoDrawer && (
          <div className="fixed inset-0 z-[5500] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowActivePromoDrawer(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-stone-900 rounded-xl max-w-lg w-full shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-500" /> Promo aktif
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{activeCampaigns.length} kampanye, {Array.from(productOffers.keys()).length} produk terkait</p>
                </div>
                <button onClick={() => setShowActivePromoDrawer(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {activeCampaigns.length === 0 ? (
                  <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">Tidak ada kampanye aktif saat ini.</p>
                ) : activeCampaigns.map(camp => {
                  // Collect all offers belonging to this campaign
                  const offersForCamp: Array<{ pid: string; offer: PromoOffer }> = [];
                  productOffers.forEach((offers, pid) => {
                    offers.forEach(o => {
                      if (o.campaignId === camp.id) offersForCamp.push({ pid, offer: o });
                    });
                  });
                  return (
                    <div key={camp.id} className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800/50 border-b border-stone-200 dark:border-stone-800">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{camp.name}</p>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                              {new Date(camp.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {new Date(camp.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              {' · '}{offersForCamp.length} produk
                            </p>
                          </div>
                          {camp.stackable && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 shrink-0">Stack</span>
                          )}
                        </div>
                        {camp.description && (
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">{camp.description}</p>
                        )}
                      </div>
                      <div className="divide-y divide-stone-100 dark:divide-stone-800">
                        {offersForCamp.length === 0 ? (
                          <p className="text-xs text-stone-400 dark:text-stone-500 px-4 py-4 text-center">Belum ada produk di kampanye ini</p>
                        ) : offersForCamp.map(({ pid, offer }) => {
                          const product = products.find(p => p.id === pid);
                          if (!product) return null;
                          return (
                            <div key={`${camp.id}-${pid}`} className="px-4 py-2.5 flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-stone-900 dark:text-stone-100 truncate">{product.name}</p>
                                <p className="text-[11px] text-stone-400 dark:text-stone-500">
                                  {product.brand}{product.plu ? ` · PLU ${product.plu}` : ''}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
                                  {offerLabel(offer, product.price)}
                                </span>
                                {offer.promoType === 'price_cut' && offer.promoPrice != null ? (
                                  <p className="text-[11px] tabular-nums mt-0.5">
                                    <span className="text-stone-400 dark:text-stone-500 line-through">Rp {product.price.toLocaleString()}</span>
                                    {' '}
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Rp {offer.promoPrice.toLocaleString()}</span>
                                  </p>
                                ) : (
                                  <p className="text-[11px] tabular-nums text-stone-500 dark:text-stone-400 mt-0.5">
                                    Rp {product.price.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t border-stone-200 dark:border-stone-800 shrink-0">
                <button
                  onClick={() => setShowActivePromoDrawer(false)}
                  className="w-full py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
                >
                  Tutup
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

      {/* --- OPEN SHIFT MODAL --- */}
      <AnimatePresence>
        {isOpeningShiftModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 dark:bg-stone-950/85 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-stone-150 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-4">
                  <Calculator className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Buka Shift Kasir</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Harap input uang modal awal di laci kasir untuk mulai bertransaksi.</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">Modal Tunai Awal (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 dark:text-stone-500 font-medium">Rp</span>
                    <input
                      autoFocus
                      type="number"
                      value={startingCashInput}
                      onChange={e => setStartingCashInput(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-stone-400 mt-2">Gunakan uang pas atau uang kembalian standar laci Anda (misal: Rp 100.000).</p>
                </div>
              </div>

              <div className="p-6 border-t border-stone-150 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="flex-1 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-sm font-semibold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleStartShift}
                  className="flex-1 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Buka Kasir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CLOSE SHIFT MODAL --- */}
      <AnimatePresence>
        {isClosingShiftModalOpen && shiftSummary && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsClosingShiftModalOpen(false)} className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 z-10 overflow-hidden"
            >
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/50">
                <div>
                  <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Settlement & Tutup Shift</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Lakukan rekonsiliasi laci uang kasir saat ini.</p>
                </div>
                <button onClick={() => setIsClosingShiftModalOpen(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-lg border border-stone-100 dark:border-stone-800">
                    <span className="text-[10px] font-semibold text-stone-400 block mb-1">Mulai Shift</span>
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      {new Date(activeShift.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(activeShift.created_at).toLocaleDateString()})
                    </span>
                  </div>
                  <div className="p-3 bg-stone-50 dark:bg-stone-850 rounded-lg border border-stone-100 dark:border-stone-800">
                    <span className="text-[10px] font-semibold text-stone-400 block mb-1">Kasir</span>
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate block">
                      {activeShift.cashier_name}
                    </span>
                  </div>
                </div>

                <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden divide-y divide-stone-150 dark:divide-stone-800">
                  <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-900/30 flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
                    <span>Metode</span>
                    <span>Penjualan Sistem</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-xs text-stone-700 dark:text-stone-300">
                    <span>Modal Awal (Tunai)</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">Rp {shiftSummary.startingCash.toLocaleString()}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-xs text-stone-700 dark:text-stone-300">
                    <span>Transaksi Tunai</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">+ Rp {shiftSummary.cashSales.toLocaleString()}</span>
                  </div>
                  <div className="px-4 py-2.5 bg-amber-500/5 dark:bg-amber-500/10 flex justify-between text-xs font-bold text-stone-800 dark:text-amber-400">
                    <span>Ekspektasi Uang Tunai di Laci</span>
                    <span className="tabular-nums">Rp {shiftSummary.expectedCash.toLocaleString()}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-xs text-stone-700 dark:text-stone-300">
                    <span>Transaksi QRIS</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">Rp {shiftSummary.qrisSales.toLocaleString()}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-xs text-stone-700 dark:text-stone-300">
                    <span>Transaksi Debit</span>
                    <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">Rp {shiftSummary.debitSales.toLocaleString()}</span>
                  </div>
                  <div className="px-4 py-3 bg-stone-50 dark:bg-stone-900/50 flex justify-between text-sm font-bold text-stone-800 dark:text-stone-200">
                    <span>Total Omzet Penjualan (Shift)</span>
                    <span className="text-base text-stone-900 dark:text-stone-100 tabular-nums">Rp {shiftSummary.totalSales.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Uang Tunai Riil di Laci (Uang Fisik Akhir)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 dark:text-stone-500 font-semibold">Rp</span>
                      <input
                        autoFocus
                        type="number"
                        value={actualCashInput}
                        onChange={e => setActualCashInput(e.target.value)}
                        placeholder="0"
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 font-bold tabular-nums"
                      />
                    </div>
                  </div>

                  {Number(actualCashInput) !== shiftSummary.expectedCash && (
                    <div className={cn(
                      "p-3 rounded-lg border text-xs flex justify-between items-center font-semibold",
                      Number(actualCashInput) > shiftSummary.expectedCash
                        ? "bg-emerald-50 border-emerald-250 text-emerald-850 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400"
                        : "bg-rose-50 border-rose-250 text-rose-850 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400"
                    )}>
                      <span>{Number(actualCashInput) > shiftSummary.expectedCash ? "Selisih Lebih (Surplus)" : "Selisih Kurang (Shortage/Tekor)"}</span>
                      <span className="tabular-nums">
                        {Number(actualCashInput) > shiftSummary.expectedCash ? "+" : ""}
                        Rp {(Number(actualCashInput) - shiftSummary.expectedCash).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">Catatan / Keterangan Shift</label>
                    <textarea
                      rows={2}
                      value={shiftNotes}
                      onChange={e => setShiftNotes(e.target.value)}
                      placeholder="Contoh: Selisih Rp 5.000 karena pembulatan atau tidak ada pecahan kembalian."
                      className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 bg-stone-50 dark:bg-stone-900/50">
                <button
                  type="button"
                  onClick={() => setIsClosingShiftModalOpen(false)}
                  className="flex-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-sm font-semibold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleCloseShiftSubmit}
                  className="flex-[2] py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                  Tutup Kasir & Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SHIFT SETTLEMENT RECEIPT MODAL --- */}
      <AnimatePresence>
        {printedShiftReceipt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPrintedShiftReceipt(null)} className="absolute inset-0 bg-black/40 no-print" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-none shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[85vh] z-10 ShiftReceiptPrintArea"
            >
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between no-print bg-stone-50 dark:bg-stone-900/50">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Struk Laporan Shift</h3>
                <button onClick={() => setPrintedShiftReceipt(null)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 text-stone-850 dark:text-stone-200">
                <div className="text-center mb-4 pb-4 border-b border-dashed border-stone-200 dark:border-stone-750">
                  <h2 className="text-base font-bold text-stone-950 dark:text-white uppercase">{posSettings.storeName}</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{posSettings.address}</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300 font-bold mt-3">LAPORAN TUTUP SHIFT KASIR</p>
                </div>
                
                <div className="space-y-1.5 mb-4 pb-4 border-b border-dashed border-stone-200 dark:border-stone-750 text-xs">
                  <div className="flex justify-between"><span>Kasir</span><span className="font-semibold">{printedShiftReceipt.cashier_name}</span></div>
                  <div className="flex justify-between"><span>Buka Shift</span><span>{new Date(printedShiftReceipt.created_at).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between"><span>Tutup Shift</span><span>{new Date(printedShiftReceipt.closed_at || new Date()).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between"><span>Status</span><span className="font-semibold text-red-600 uppercase">CLOSED</span></div>
                </div>

                <div className="space-y-2 mb-4 pb-4 border-b border-dashed border-stone-200 dark:border-stone-750 text-xs">
                  <div className="flex justify-between"><span>Modal Awal</span><span className="font-semibold tabular-nums">Rp {printedShiftReceipt.startingCash.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Penjualan Tunai</span><span className="font-semibold tabular-nums">+ Rp {printedShiftReceipt.cashSales.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold border-t border-stone-100 dark:border-stone-800 pt-1.5 text-stone-950 dark:text-white">
                    <span>Ekspektasi Uang Tunai</span>
                    <span className="tabular-nums">Rp {printedShiftReceipt.expectedCash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-950 dark:text-white">
                    <span>Aktual Uang Fisik</span>
                    <span className="tabular-nums">Rp {printedShiftReceipt.actual_cash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-dashed border-stone-200 dark:border-stone-750 pt-1.5">
                    <span>Selisih</span>
                    <span className={cn("tabular-nums", printedShiftReceipt.difference < 0 ? "text-red-600 font-bold" : printedShiftReceipt.difference > 0 ? "text-emerald-600 font-bold" : "text-stone-500")}>
                      {printedShiftReceipt.difference > 0 ? "+" : ""}
                      Rp {printedShiftReceipt.difference.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4 pb-4 border-b border-dashed border-stone-200 dark:border-stone-750 text-xs">
                  <div className="flex justify-between"><span>Penjualan QRIS</span><span className="font-semibold tabular-nums">Rp {printedShiftReceipt.qrisSales.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Penjualan Debit</span><span className="font-semibold tabular-nums">Rp {printedShiftReceipt.debitSales.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold border-t border-stone-100 dark:border-stone-800 pt-1.5 text-stone-950 dark:text-white">
                    <span>Total Omzet Penjualan</span>
                    <span className="tabular-nums">Rp {printedShiftReceipt.totalSales.toLocaleString()}</span>
                  </div>
                </div>

                {printedShiftReceipt.notes && (
                  <div className="text-xs mb-4">
                    <p className="font-semibold text-stone-500 mb-1">Catatan:</p>
                    <p className="bg-stone-50 dark:bg-stone-850 p-2.5 rounded text-stone-700 dark:text-stone-300 italic border border-stone-100 dark:border-stone-800">{printedShiftReceipt.notes}</p>
                  </div>
                )}

                <div className="text-center pt-2 text-[10px] text-stone-400">
                  Laporan ini di-generate secara otomatis oleh sistem kasir.
                </div>
              </div>

              <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex gap-2 no-print bg-stone-50 dark:bg-stone-900/50">
                <button
                  type="button"
                  onClick={() => { window.print(); }}
                  className="flex-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-sm font-semibold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Laporan
                </button>
                <button
                  type="button"
                  onClick={() => setPrintedShiftReceipt(null)}
                  className="flex-1 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body > * { visibility: hidden !important; }
          .ShiftReceiptPrintArea, .ShiftReceiptPrintArea * { visibility: visible !important; }
          .ShiftReceiptPrintArea {
            position: fixed !important;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px !important;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
