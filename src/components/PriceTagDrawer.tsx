import React, { useState, useEffect } from 'react';

import { X, Printer, Package, Plus, Trash2, Search, Check, Copy, ChevronRight, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { PromoCampaign, CampaignProduct } from '../types';


interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  plu: string;
  unit?: string;
}

interface PriceTagDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  productsFromPage: Product[];
  allProducts: Product[];
  companyName: string;
  initialProduct?: Product | null;
}

export default function PriceTagDrawer({ isOpen, onClose, productsFromPage, allProducts, companyName, initialProduct }: PriceTagDrawerProps) {
  const [selectedToPrint, setSelectedToPrint] = useState<(Product & { quantity: number })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignProducts, setCampaignProducts] = useState<CampaignProduct[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<PromoCampaign | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadActiveCampaign();
    }
  }, [isOpen]);

  const loadActiveCampaign = async () => {
    try {
      const camp = await api.getActiveCampaign((productsFromPage[0] as any)?.company_id || '');
      if (camp) {
        setActiveCampaign(camp);
        const products = await api.getCampaignProducts(camp.id);
        setCampaignProducts(products);
      } else {
        setActiveCampaign(null);
        setCampaignProducts([]);
      }
    } catch (err) {
      console.error('Gagal memuat kampanye aktif:', err);
    }
  };

  const getPromoInfo = (productId: string) => {
    return campaignProducts.find(cp => cp.product_id === productId);
  };


  // Handle initial product addition
  React.useEffect(() => {
    if (isOpen && initialProduct) {
      addItem(initialProduct);
    }
  }, [isOpen, initialProduct]);


  const addFromPage = () => {
    const newItems = productsFromPage.map(p => ({ ...p, quantity: 1 }));
    setSelectedToPrint(prev => {
      const existingIds = new Set(prev.map(item => item.id));
      const uniqueNew = newItems.filter(item => !existingIds.has(item.id));
      return [...prev, ...uniqueNew];
    });
  };

  const addItem = (product: Product) => {
    setSelectedToPrint(prev => {
      if (prev.some(p => p.id === product.id)) return prev;
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setSelectedToPrint(prev => prev.filter(p => p.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setSelectedToPrint(prev => prev.map(p => 
      p.id === id ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
    ));
  };

  const handlePrint = () => {
    window.print();
  };

  const totalTags = selectedToPrint.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <>
      {/* Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[6000]"
          />
        )}
      </AnimatePresence>

      {/* Drawer Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-[450px] bg-white shadow-2xl z-[6001] flex flex-col"
          >
            {/* Header */}
            <div className="p-8 pb-7 border-b border-slate-100 relative bg-slate-50/30">
              <button 
                onClick={onClose}
                className="absolute top-8 right-8 p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-start">
                <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] mb-6 shadow-sm border border-[#8b7365]/5">
                  <Printer className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-3">Cetak label harga</h2>
                  <p className="text-slate-400 text-[10px] font-black tracking-widest leading-none">Yuk, siapkan label harga untuk produk tokomu hari ini.</p>
                </div>
              </div>
            </div>

            {/* Actions Area */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={addFromPage}
                  className="flex flex-col items-center justify-center p-4 bg-emerald-50 border border-emerald-100 rounded-2xl group hover:bg-emerald-100 transition-all"
                >
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white mb-2 shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-700 tracking-tight">Ambil semua</span>
                  <span className="text-[9px] font-bold text-emerald-600/60 leading-none mt-0.5">Dari halaman ini</span>
                </button>
                <button 
                  onClick={() => setSelectedToPrint([])}
                  className="flex flex-col items-center justify-center p-4 bg-rose-50 border border-rose-100 rounded-2xl group hover:bg-rose-100 transition-all"
                >
                  <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white mb-2 shadow-md shadow-rose-500/20 group-hover:scale-110 transition-transform">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black text-rose-700 tracking-tight">Bersihkan semua</span>
                  <span className="text-[9px] font-bold text-rose-600/60 leading-none mt-0.5">Kosongkan antrean</span>
                </button>

              </div>

              <div className="relative z-50">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari PLU atau nama produk..."
                    className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#8b7365]/10 focus:border-[#8b7365] outline-none transition-all font-bold text-sm shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-[250px] overflow-y-auto custom-scrollbar p-2">
                    {(() => {
                      const results = (allProducts || []).filter(p => 
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.plu.includes(searchTerm)
                      ).slice(0, 15);
                      
                      if (results.length === 0) {
                        return <p className="text-center text-xs font-bold text-slate-400 py-4">Produk tidak ditemukan</p>;
                      }

                      return results.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            addItem(p);
                            setSearchTerm('');
                          }}
                          className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors text-left group"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-[9px] font-black text-[#8b7365] uppercase leading-none">{p.brand}</p>
                            <p className="font-bold text-slate-800 text-[13px] mt-1 truncate">{p.name}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">PLU: {p.plu}</span>
                            <div className="flex items-center gap-1 mt-1 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-3 h-3" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Tambah</span>
                            </div>
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
              </div>

            {/* List Header */}
            <div className="px-6 flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Antrean cetak ({selectedToPrint.length})</h3>
              <span className="text-[10px] font-bold text-slate-400">Total: {totalTags} label</span>
            </div>


            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 space-y-3 custom-scrollbar pb-6">
              {selectedToPrint.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                  <Package className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold">Belum ada produk nih...</p>
                  <p className="text-[10px] font-black tracking-widest mt-1 opacity-60">Klik 'Ambil semua' atau klik ikon print di tabel produk ya.</p>
                </div>

              ) : (
                selectedToPrint.map((item) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-[#8b7365]/30 transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                      <Hash className="w-5 h-5 opacity-30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-[#8b7365] uppercase leading-none mb-1">{item.brand}</p>
                      <h4 className="text-sm font-black text-slate-800 truncate leading-tight">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {getPromoInfo(item.id) ? (
                          <>
                            <p className="text-[10px] font-bold text-slate-400 line-through">Rp {item.price.toLocaleString()}</p>
                            <p className="text-[10px] font-black text-emerald-600">Rp {getPromoInfo(item.id)?.promo_type === 'price_cut' ? getPromoInfo(item.id)?.promo_price?.toLocaleString() : item.price.toLocaleString()}</p>
                          </>
                        ) : (
                          <p className="text-[10px] font-bold text-emerald-600">Rp {item.price.toLocaleString()}</p>
                        )}
                      </div>
                      {getPromoInfo(item.id) && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black uppercase rounded-full">
                          {getPromoInfo(item.id)?.promo_type === 'price_cut' ? 'Diskon' : getPromoInfo(item.id)?.promo_type?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-all"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-black text-slate-700">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 transition-all"
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer / Print Button */}
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                disabled={selectedToPrint.length === 0}
                onClick={handlePrint}
                className={cn(
                  "w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-sm tracking-tight transition-all shadow-xl",
                  selectedToPrint.length > 0 
                    ? "bg-[#8b7365] text-white hover:bg-[#7a6458] shadow-[#8b7365]/20" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                )}
              >
                <Printer className="w-5 h-5" />
                Cetak {totalTags} label sekarang
              </button>
              <p className="text-[9px] text-center text-slate-400 font-bold mt-4 tracking-widest">Siap cetak di kertas A4 atau kertas stiker</p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Print-only container */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] overflow-y-auto p-[5mm]">
        <div className="grid grid-cols-5 gap-[2mm] max-w-[200mm] mx-auto">
          {selectedToPrint.flatMap(product => 
            Array.from({ length: product.quantity }).map((_, idx) => (
              <div 
                key={`${product.id}-${idx}`}
                className="w-full border border-slate-300 p-2 rounded-[2px] bg-white flex flex-col justify-between h-[30mm] break-inside-avoid relative overflow-hidden"
              >
                {/* Brand Banner */}
                <div className="bg-[#1e293b] text-white py-0.5 px-1.5 absolute top-0 left-0 right-0 flex justify-between items-center h-4 z-10">
                  <span className="text-[6px] font-black tracking-widest uppercase truncate max-w-[60%]">{companyName}</span>
                  <span className="text-[5px] font-bold opacity-70">plu: {product.plu}</span>
                </div>

                {(() => {
                  const promo = getPromoInfo(product.id);
                  return (
                    <>
                      {/* Top Promo Banner */}
                      {promo && (
                        <div className="absolute top-[16px] left-0 right-0 flex flex-col items-center bg-white border-b border-rose-200 overflow-hidden z-20 pb-[1px]">
                          <div className="flex justify-center gap-3 w-full overflow-hidden px-1">
                             <span className="text-[8px] font-black text-rose-600 tracking-widest uppercase mt-0.5 leading-none">PROMO</span>
                             <span className="text-[8px] font-black text-rose-600 tracking-widest uppercase mt-0.5 leading-none">PROMO</span>
                             <span className="text-[8px] font-black text-rose-600 tracking-widest uppercase mt-0.5 leading-none">PROMO</span>
                             <span className="text-[8px] font-black text-rose-600 tracking-widest uppercase mt-0.5 leading-none">PROMO</span>
                          </div>
                          <div className="w-[200%] flex overflow-hidden mt-[1px] pb-[px]">
                            <span className="text-[3.5px] font-black text-rose-400/80 whitespace-nowrap tracking-[0.2em] uppercase pl-2">
                              PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO PROMO
                            </span>
                          </div>
                        </div>
                      )}

                      <div className={cn("flex flex-col h-full", promo ? "pt-[32px]" : "pt-[20px]")}>
                        <div className={cn("flex flex-col flex-1", promo ? "justify-center" : "justify-start pt-1")}>
                          <div className={cn("flex justify-between pr-[22px]", promo ? "items-center" : "items-start")}>
                            <div className="flex-1 pr-1">
                              <span className={cn("font-black text-[#8b7365] uppercase tracking-tighter block leading-none", promo ? "text-[6px] mb-0.5" : "text-[7.5px] mb-1")}>{product.brand}</span>
                              <h3 className={cn("font-black text-slate-900 leading-tight uppercase", promo ? "text-[8px] line-clamp-2" : "text-[10px] line-clamp-2")}>{product.name}</h3>
                            </div>
                            
                            {/* Original Price and Save percentage on the right for price_cut */}
                            {promo?.promo_type === 'price_cut' && promo.promo_price ? (
                              <div className="flex flex-col items-end shrink-0 justify-center pb-0.5">
                                <span className="text-[5.5px] font-black bg-rose-100 text-rose-600 px-1 py-0.5 rounded-[2px] uppercase tracking-widest leading-none mb-0.5">
                                  HEMAT {Math.round(((product.price - promo.promo_price) / product.price) * 100)}%
                                </span>
                                <span className="text-[6.5px] font-bold text-slate-400 line-through leading-none">
                                  Rp {product.price.toLocaleString('id-ID')}
                                </span>
                              </div>
                            ) : promo?.promo_type && promo.promo_type !== 'price_cut' ? (
                              <div className="flex flex-col items-end shrink-0 justify-center pb-0.5">
                                <span className="text-[4px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                                  harga / {product.unit || 'pcs'}
                                </span>
                                <div className="flex items-baseline gap-0.5 mt-0.5">
                                  <span className="text-[6px] font-black text-slate-900">Rp</span>
                                  <span className="text-[12px] font-black text-slate-900 tracking-tighter leading-none">
                                    {product.price.toLocaleString('id-ID')}
                                  </span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                      <div className="flex items-end justify-between border-t border-dashed border-slate-200 mt-auto pt-1 pb-[1px] h-full max-h-[14mm]">
                        <div className="flex flex-col w-full justify-end">
                          {(() => {
                            if (promo && promo.promo_type === 'price_cut' && promo.promo_price) {
                              return (
                                <div className="flex justify-between items-end w-full pr-[22px]">
                                  <div className="flex flex-col mb-0.5">
                                    <span className="text-[6px] font-black text-rose-500 uppercase tracking-widest leading-none mb-0.5">
                                      Harga Spesial
                                    </span>
                                    <div className="flex items-baseline gap-0.5">
                                      <span className="text-[8px] font-black text-rose-600">Rp</span>
                                      <span className="text-[20px] font-black text-rose-600 tracking-tighter leading-none">
                                        {promo.promo_price.toLocaleString('id-ID')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else if (promo && promo.promo_type !== 'price_cut') {
                              // Volume promo
                              let promoText = 'PROMO';
                              if (promo.promo_type === 'b1g1') promoText = 'BELI 1 GRATIS 1';
                              if (promo.promo_type === 'b2g1') promoText = 'BELI 2 GRATIS 1';
                              if (promo.promo_type !== 'b1g1' && promo.promo_type !== 'b2g1') promoText = `PROMO ${promo.promo_type.replace('_', ' ').toUpperCase()}`;

                              return (
                                <div className="flex justify-between items-end w-full pr-[22px]">
                                  <div className="flex flex-col mb-0.5">
                                    <span className="text-[6px] font-black text-rose-500 uppercase tracking-widest leading-none mb-0.5">
                                      Spesial Promo
                                    </span>
                                    <div className="flex items-baseline gap-0.5">
                                      <span className="text-[13px] font-black text-rose-600 tracking-tighter leading-none whitespace-nowrap">
                                        {promoText}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else {
                              // Normal tag
                              return (
                                <div className="flex flex-col pr-[22px] pb-[1px]">
                                  <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                                    harga / {product.unit || 'pcs'}
                                  </span>
                                  <div className="flex items-baseline gap-0.5 mt-0.5">
                                     <span className="text-[8px] font-black text-slate-900">Rp</span>
                                     <span className="text-[20px] font-black text-slate-900 tracking-tighter leading-none">
                                       {product.price.toLocaleString('id-ID')}
                                     </span>
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                    </>
                  );
                })()}
                  
                {/* Mock QR */}
                <div className="absolute bottom-[2mm] right-[2mm] w-5 h-5 bg-slate-50 border border-slate-100 flex items-center justify-center p-0.5">
                  <svg viewBox="0 0 24 24" className="w-full h-full text-slate-300">
                    <path fill="currentColor" d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2z" />
                  </svg>
                </div>

                {/* Vertical Stripe */}
                <div className="absolute left-0 top-4 bottom-0 w-0.5 bg-[#8b7365]" />
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>
    </>
  );
}
