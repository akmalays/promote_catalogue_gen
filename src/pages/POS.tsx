import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, Minus, X, Trash2, ShoppingCart, 
  CreditCard, Banknote, Receipt, CheckCircle2, 
  Package, Calculator, QrCode, User, Calendar, 
  ArrowRight, Printer, RefreshCw, AlertCircle,
  Menu, LayoutDashboard, Truck, Megaphone, Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

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
}

interface CartItem {
  product: Product;
  quantity: number;
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
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    // Auto focus search for scanner support
    const timer = setTimeout(() => searchInputRef.current?.focus(), 500);
    
    // Load branding
    const savedBrand = localStorage.getItem('pos_branding_settings');
    if (savedBrand) {
      try {
        setPosSettings(JSON.parse(savedBrand));
      } catch(e) {}
    }

    return () => clearTimeout(timer);
  }, []);

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
    const existing = cart.find(item => item.product.id === p.id);
    if (existing) {
      if (existing.quantity >= p.stock) {
        toast.error('Stok tidak mencukupi');
        return;
      }
      setCart(cart.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product: p, quantity: 1 }]);
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

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.product.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

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
            price: i.product.price
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
        created_at: new Date().toISOString()
      });

      // 2. Update Stocks
      for (const item of cart) {
        await api.updateProduct(item.product.id, {
          stock: item.product.stock - item.quantity,
          company_id: userProfile.company_id
        });
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
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#8b7365] rounded-xl flex items-center justify-center text-white shadow-lg">
             <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">POS Premium</h1>
            <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none">Sinkronisasi stok real-time</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col text-right">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Waktu Sekarang</span>
             <span className="text-sm font-bold text-slate-700">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Kasir Aktif</p>
              <h3 className="text-sm font-bold text-slate-800 leading-none">{userProfile?.nickname || userProfile?.username || 'Kasir'}</h3>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
               <User className="w-5 h-5" />
            </div>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 bg-[#8b7365]/5 text-[#8b7365] hover:bg-[#8b7365]/10 rounded-xl transition-all border border-[#8b7365]/10 group"
            title="Pengaturan Struk (Admin)"
          >
             <SettingsIcon className="w-4 h-4 group-hover:rotate-45 transition-transform" />
          </button>

          <button onClick={fetchProducts} className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-xl transition-all border border-slate-100">
             <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Area: Product Search & Grid */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col">
           {/* Scan / Search Box */}
           <div className="relative mb-8 group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none">
                 <Search className="w-5 h-5 text-slate-300 group-focus-within:text-[#8b7365] transition-colors" />
                 <div className="w-px h-5 bg-slate-200" />
              </div>
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Scan QR / Ketik Nama Produk / PLU..."
                className="w-full pl-16 pr-8 py-6 bg-white border-none rounded-[32px] text-lg font-black text-slate-800 placeholder-slate-300 shadow-xl shadow-slate-200/50 outline-none focus:ring-4 focus:ring-[#8b7365]/5 transition-all"
              />
              
              {/* Floating Results */}
              <AnimatePresence>
                {searchTerm && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-4 right-4 mt-4 bg-white rounded-[32px] shadow-2xl border border-slate-100 z-50 overflow-hidden divide-y divide-slate-50"
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
                          <div className="w-16 h-16 bg-white rounded-2xl border-2 border-slate-100 flex items-center justify-center p-2 group-hover:border-[#8b7365]/20 group-hover:scale-105 transition-all">
                             <img src={p.image_url} alt="" className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="flex-1">
                             <p className="text-[10px] font-black text-[#8b7365] uppercase tracking-widest">{p.brand}</p>
                             <h4 className="text-sm font-black text-slate-800 leading-tight">{p.name}</h4>
                             <p className="text-[10px] font-bold text-rose-500 uppercase mt-0.5">PLU: {p.plu}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-lg font-black text-[#8b7365]">Rp {p.price.toLocaleString()}</p>
                             <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", p.stock < 10 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200")}>Stok: {p.stock}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
           </div>

           {/* Dashboard Stats or Quick Recommendations can go here */}
           <div className="flex-1 flex flex-col items-center justify-center text-slate-300 opacity-20">
              <ShoppingCart className="w-48 h-48 mb-6" />
              <p className="text-2xl font-black uppercase tracking-[0.2em] italic">Ready to Serve</p>
           </div>
        </div>

        {/* Right Sidebar: Cart */}
        <div className="w-[520px] bg-white border-l border-slate-200 flex flex-col shadow-2xl z-20">
           <div className="p-8 border-b border-slate-100">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                      <ShoppingCart className="w-5 h-5" />
                   </div>
                   <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Keranjang Belanja</h3>
                </div>
                <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase">{totalItems} Items</span>
             </div>
           </div>

           <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 border-2 border-dashed border-slate-100 rounded-[32px] mx-2">
                   <Package className="w-12 h-12 mb-3 opacity-20" />
                   <p className="text-xs font-black uppercase tracking-widest">Belum ada barang</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="bg-slate-50/50 border border-slate-100 p-4 rounded-3xl flex items-center justify-between group transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-200/40">
                     <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                           <img src={item.product.image_url} alt="" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="min-w-0">
                           <h4 className="text-xs font-black text-slate-800 leading-tight mb-1">{item.product.name}</h4>
                           <p className="text-[10px] font-black text-[#8b7365]">Rp {item.product.price.toLocaleString()}</p>
                        </div>
                     </div>

                     <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-2xl border border-slate-100 shadow-sm">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                           <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input 
                           type="number"
                           value={item.quantity}
                           onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                           className="text-sm font-black w-8 text-center bg-transparent border-none outline-none focus:ring-0 p-0"
                        />
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 hover:bg-slate-50 rounded-lg text-[#8b7365] transition-colors">
                           <Plus className="w-3.5 h-3.5" />
                        </button>
                     </div>

                     <button onClick={() => removeFromCart(item.product.id)} className="ml-3 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                ))
              )}
           </div>

           {/* Order Summary & Pay Button */}
           <div className="p-8 bg-slate-50 border-t border-slate-200 space-y-6">
              <div className="space-y-3">
                 <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-widest">Subtotal</span>
                    <span className="text-sm font-black">Rp {subtotal.toLocaleString()}</span>
                 </div>
                 <div className="flex items-center justify-between text-slate-500 pb-2 border-b border-white">
                    <span className="text-xs font-bold uppercase tracking-widest">Diskon / Promo</span>
                    <span className="text-sm font-black text-emerald-600">- Rp 0</span>
                 </div>
                 <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tighter">Total Akhir</span>
                    <span className="text-3xl font-black text-slate-800 tracking-tighter">Rp {subtotal.toLocaleString()}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button 
                    disabled={cart.length === 0}
                    onClick={() => setIsDebitQRISModalOpen(true)}
                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all font-black text-[10px] text-slate-500 gap-2 uppercase"
                  >
                     <CreditCard className="w-5 h-5" />
                     Debit / QRIS
                  </button>
                 <button 
                  disabled={cart.length === 0}
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex flex-col items-center justify-center p-4 bg-[#8b7365] text-white rounded-3xl hover:bg-[#7a6458] transition-all font-black text-xs gap-2 uppercase shadow-xl shadow-[#8b7365]/20 disabled:opacity-50 disabled:grayscale"
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
               className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col z-[110]"
             >
                <div className="p-10 border-b flex items-center justify-between bg-slate-50">
                   <div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">Penyelesaian Transaksi</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metode Pembayaran: Tunai / Cash</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Total Tagihan</p>
                      <h3 className="text-4xl font-black text-slate-800 tracking-tighter">Rp {subtotal.toLocaleString()}</h3>
                   </div>
                </div>

                <div className="p-10 space-y-8">
                   <div className="space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Uang yang Diterima</label>
                      <div className="relative">
                         <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">Rp</div>
                         <input 
                            autoFocus
                            type="number" 
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="0"
                            className="w-full pl-20 pr-10 py-8 bg-slate-50 border-none rounded-3xl text-5xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-[#8b7365]/10 transition-all placeholder-slate-200"
                         />
                      </div>
                   </div>

                   {/* Quick Payment Options */}
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[50000, 100000, 150000, 200000].map(amount => (
                        <button 
                          key={amount}
                          onClick={() => handleQuickPay(amount)}
                          className="py-4 rounded-2xl border-2 border-slate-100 font-black text-slate-600 hover:border-[#8b7365] hover:text-[#8b7365] hover:bg-[#8b7365]/5 transition-all"
                        >
                          Rp {amount.toLocaleString()}
                        </button>
                      ))}
                      <button 
                        onClick={() => handleQuickPay(subtotal)}
                        className="py-4 col-span-2 rounded-2xl border-2 border-emerald-100 font-black text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
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
                        className="p-8 bg-emerald-50 rounded-3xl border-2 border-emerald-100 flex items-center justify-between"
                      >
                        <div>
                           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Uang Kembalian</p>
                           <h4 className="text-4xl font-black text-emerald-700 tracking-tighter">Rp {(Number(paymentAmount) - subtotal).toLocaleString()}</h4>
                        </div>
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 opacity-20" />
                     </motion.div>
                   )}

                   <div className="pt-6 flex gap-4">
                      <button 
                        onClick={() => setIsPaymentModalOpen(false)}
                        className="flex-1 py-5 rounded-3xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                      >
                         Batal
                      </button>
                      <button 
                        disabled={!paymentAmount || Number(paymentAmount) < subtotal || isProcessing}
                        onClick={processPayment}
                        className="flex-[2] py-5 bg-[#8b7365] text-white rounded-3xl font-black shadow-2xl shadow-[#8b7365]/20 hover:bg-[#7a6458] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
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
               className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col z-[160]"
             >
                <div className="p-8 bg-slate-50 border-b flex items-center justify-between">
                   <div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Pembayaran Non-Tunai</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Metode EDC / Digital</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Total Tagihan</p>
                      <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Rp {subtotal.toLocaleString()}</h3>
                   </div>
                </div>

                <div className="p-8 space-y-8">
                   {/* Tab Toggle */}
                   <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
                      <button 
                        onClick={() => setPaymentMethod('debit')}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2",
                          paymentMethod === 'debit' ? "bg-white text-[#8b7365] shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                         <CreditCard className="w-4 h-4" /> Kartu Debit
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('qris')}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2",
                          paymentMethod === 'qris' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                         <QrCode className="w-4 h-4" /> QRIS Scan
                      </button>
                   </div>

                   {/* Content */}
                   {paymentMethod === 'debit' ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                         <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50">
                            <CreditCard className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Silahkan Gesek / Masukkan Kartu pada Mesin EDC</p>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Referensi / Trace</label>
                            <input 
                               type="text" 
                               value={nonCashRef}
                               onChange={(e) => setNonCashRef(e.target.value)}
                               placeholder="Contoh: 123456"
                               className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#8b7365] focus:bg-white focus:outline-none transition-all font-bold text-slate-800"
                            />
                         </div>
                      </div>
                   ) : (
                      <div className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-2">
                         <div className="w-48 h-48 bg-white mx-auto p-4 rounded-3xl shadow-xl border border-slate-100 flex items-center justify-center">
                            {/* Mock QR Code */}
                            <div className="relative group">
                               <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=POS-LILYMART" alt="QRIS" className="w-40 h-40 group-hover:blur-[2px] transition-all" />
                               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                  <QrCode className="w-10 h-10 text-emerald-600" />
                               </div>
                            </div>
                         </div>
                         <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Scan QRIS via Dana / ShopeePay / OVO / M-Banking</p>
                      </div>
                   )}

                   <div className="pt-6 flex gap-4">
                      <button 
                        onClick={() => setIsDebitQRISModalOpen(false)}
                        className="flex-1 py-5 rounded-3xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase text-xs"
                      >
                         Batal
                      </button>
                      <button 
                        disabled={isProcessing || (paymentMethod === 'debit' && !nonCashRef)}
                        onClick={processPayment}
                        className="flex-[2] py-5 bg-[#8b7365] text-white rounded-3xl font-black shadow-2xl shadow-[#8b7365]/20 hover:bg-[#7a6458] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
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
             <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden relative ReceiptArea">
                <div className="p-8 pb-4 text-center border-b border-dashed border-slate-200">
                   <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                   </div>
                   <h2 className="text-2xl font-black text-slate-800 tracking-tighter mb-1 uppercase">{posSettings.storeName}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight whitespace-pre-line">
                       {posSettings.address}
                       {posSettings.phone && `\nTelp: ${posSettings.phone}`}
                    </p>
                </div>

                <div className="p-8 space-y-6">
                   <div className="space-y-4">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                         <span>#{completedTransaction.id.toString().slice(-8).toUpperCase()}</span>
                         <span>{new Date(completedTransaction.created_at).toLocaleString('id-ID')}</span>
                      </div>
                      
                      <div className="border-t border-b border-dashed border-slate-100 py-4 space-y-2">
                         {completedTransaction.items.map((item: any, idx: number) => (
                           <div key={idx} className="flex justify-between text-xs font-bold text-slate-700">
                              <div className="flex-1 pr-4">
                                 <p className="leading-tight">{item.product.name}</p>
                                 <p className="text-[9px] text-slate-400 uppercase">{item.quantity} x {item.product.price.toLocaleString()}</p>
                              </div>
                              <span className="text-slate-800">{(item.product.price * item.quantity).toLocaleString()}</span>
                           </div>
                         ))}
                      </div>

                      <div className="space-y-1 pt-2">
                         <div className="flex justify-between text-xs font-bold text-slate-500">
                            <span>SUBTOTAL</span>
                            <span>{completedTransaction.total_amount.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between text-lg font-black text-slate-800">
                            <span>TOTAL</span>
                            <span>{completedTransaction.total_amount.toLocaleString()}</span>
                         </div>
                      </div>

                      <div className="space-y-1 border-t border-slate-50 pt-4">
                         <div className="flex justify-between text-[10px] font-bold text-slate-500">
                            <span className="uppercase">{completedTransaction.payment_method === 'cash' ? 'TUNAI' : completedTransaction.payment_method}</span>
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
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                         {posSettings.slogan}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">
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
                           className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase"
                         >
                            Selesai
                         </button>
                         <button 
                           onClick={printReceipt}
                           className="py-4 bg-[#8b7365] text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-[#8b7365]/20 flex items-center justify-center gap-2"
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
               className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl relative z-[610] overflow-hidden flex flex-col"
             >
                <div className="p-8 pb-6 border-b border-slate-50 flex items-start justify-between bg-slate-50">
                   <div className="flex flex-col items-start text-left">
                      <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] mb-5">
                         <SettingsIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Pengaturan Struk</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Branding & Informasi Toko</p>
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
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Toko</label>
                         <input 
                            type="text" 
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#8b7365] focus:bg-white focus:outline-none transition-all font-bold text-slate-700"
                            value={posSettings.storeName}
                            onChange={(e) => setPosSettings({...posSettings, storeName: e.target.value})}
                         />
                      </div>

                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slogan Struk</label>
                         <input 
                            type="text" 
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#8b7365] focus:bg-white focus:outline-none transition-all font-bold text-slate-700"
                            value={posSettings.slogan}
                            onChange={(e) => setPosSettings({...posSettings, slogan: e.target.value})}
                         />
                      </div>

                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Toko</label>
                         <textarea 
                            rows={2}
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#8b7365] focus:bg-white focus:outline-none transition-all font-bold text-slate-700 resize-none"
                            value={posSettings.address}
                            onChange={(e) => setPosSettings({...posSettings, address: e.target.value})}
                         />
                      </div>

                      <div className="space-y-1.5">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Telp</label>
                            <input 
                               type="text" 
                               className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#8b7365] focus:bg-white focus:outline-none transition-all font-bold text-slate-700"
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
                      className="w-full py-3.5 bg-[#8b7365] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#8b7365]/20 hover:bg-[#7a6458] transition-all"
                   >
                      Simpan & Terapkan
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
