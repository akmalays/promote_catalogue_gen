import React, { useState, useEffect } from 'react';
import { X, Printer, Package, Plus, Search, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { CampaignProduct } from '../types';

interface Product {
  id: string; name: string; brand: string; price: number; plu: string; unit?: string;
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

  useEffect(() => { if (isOpen) loadActiveCampaign(); }, [isOpen]);

  const loadActiveCampaign = async () => {
    try {
      const camp = await api.getActiveCampaign((productsFromPage[0] as any)?.company_id || '');
      if (camp) setCampaignProducts(await api.getCampaignProducts(camp.id));
      else setCampaignProducts([]);
    } catch {}
  };

  const getPromoInfo = (productId: string) => campaignProducts.find(cp => cp.product_id === productId);

  useEffect(() => { if (isOpen && initialProduct) addItem(initialProduct); }, [isOpen, initialProduct]);

  const addFromPage = () => {
    const newItems = productsFromPage.map(p => ({ ...p, quantity: 1 }));
    setSelectedToPrint(prev => {
      const ids = new Set(prev.map(i => i.id));
      return [...prev, ...newItems.filter(i => !ids.has(i.id))];
    });
  };

  const addItem = (product: Product) => {
    setSelectedToPrint(prev => prev.some(p => p.id === product.id) ? prev : [...prev, { ...product, quantity: 1 }]);
  };

  const removeItem = (id: string) => setSelectedToPrint(prev => prev.filter(p => p.id !== id));
  const updateQuantity = (id: string, delta: number) => setSelectedToPrint(prev => prev.map(p => p.id === id ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p));
  const totalTags = selectedToPrint.reduce((a, c) => a + c.quantity, 0);

  return (
    <>
      <AnimatePresence>
        {isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/30 z-[6000]" />}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
            className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-white dark:bg-stone-900 shadow-xl z-[6001] flex flex-col border-l border-stone-200 dark:border-stone-800"
          >
            {/* Header */}
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Cetak Label Harga</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Siapkan label untuk dicetak.</p>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Actions */}
            <div className="p-4 space-y-3 border-b border-stone-200 dark:border-stone-800 shrink-0">
              <div className="flex gap-2">
                <button onClick={addFromPage} className="flex-1 px-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 rounded-lg text-xs font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">Ambil dari halaman ini</button>
                <button onClick={() => setSelectedToPrint([])} className="px-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-lg text-xs font-medium hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors">Kosongkan</button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Cari PLU atau nama produk..." className="w-full pl-9 pr-8 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><X className="w-3.5 h-3.5" /></button>}

                {searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-900 rounded-lg shadow-lg border border-stone-200 dark:border-stone-800 max-h-[200px] overflow-y-auto z-50">
                    {(() => {
                      const results = (allProducts || []).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.plu.includes(searchTerm)).slice(0, 10);
                      if (results.length === 0) return <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-4">Tidak ditemukan</p>;
                      return results.map(p => (
                        <button key={p.id} onClick={() => { addItem(p); setSearchTerm(''); }} className="w-full px-3 py-2.5 text-left hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-between">
                          <div className="min-w-0"><p className="text-sm text-stone-800 dark:text-stone-200 truncate">{p.name}</p><p className="text-xs text-stone-400 dark:text-stone-500">{p.brand} · PLU: {p.plu}</p></div>
                          <Plus className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Queue header */}
            <div className="px-4 py-2 flex items-center justify-between shrink-0">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Antrean ({selectedToPrint.length})</span>
              <span className="text-xs text-stone-400 dark:text-stone-500">{totalTags} label</span>
            </div>

            {/* Queue list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {selectedToPrint.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <Package className="w-8 h-8 mb-2 text-stone-300 dark:text-stone-600" />
                  <p className="text-sm text-stone-400 dark:text-stone-500">Belum ada produk</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">Cari atau ambil dari halaman.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedToPrint.map((item) => {
                    const promo = getPromoInfo(item.id);
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-stone-500 dark:text-stone-400">{item.brand}</span>
                            {promo && <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-1 py-0.5 rounded">{promo.promo_type === 'price_cut' ? 'Diskon' : promo.promo_type?.toUpperCase()}</span>}
                          </div>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                            Rp {(promo?.promo_type === 'price_cut' && promo.promo_price ? promo.promo_price : item.price).toLocaleString()}
                            {promo?.promo_type === 'price_cut' && promo.promo_price && <span className="text-stone-400 dark:text-stone-500 line-through ml-1.5">Rp {item.price.toLocaleString()}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded text-stone-600 dark:text-stone-300 text-xs hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors">−</button>
                          <span className="w-6 text-center text-xs font-medium text-stone-700 dark:text-stone-200 tabular-nums">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded text-stone-600 dark:text-stone-300 text-xs hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors">+</button>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="p-1 text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 shrink-0">
              <button 
                disabled={selectedToPrint.length === 0}
                onClick={() => window.print()}
                className="w-full py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" /> Cetak {totalTags} label
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print-only labels */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] overflow-y-auto p-[5mm]">
        <div className="grid grid-cols-5 gap-[2mm] max-w-[200mm] mx-auto">
          {selectedToPrint.flatMap(product => 
            Array.from({ length: product.quantity }).map((_, idx) => {
              const promo = getPromoInfo(product.id);
              const displayPrice = promo?.promo_type === 'price_cut' && promo.promo_price ? promo.promo_price : product.price;
              const hasDiscount = promo?.promo_type === 'price_cut' && promo.promo_price;
              const promoLabel = promo ? (promo.promo_type === 'b1g1' ? 'B1G1' : promo.promo_type === 'b2g1' ? 'B2G1' : promo.promo_type === 'price_cut' ? `HEMAT ${Math.round(((product.price - (promo.promo_price || 0)) / product.price) * 100)}%` : promo.promo_type?.toUpperCase()) : null;

              return (
                <div key={`${product.id}-${idx}`} className="w-full border border-slate-300 p-1.5 bg-white flex flex-col justify-between h-[30mm] break-inside-avoid relative overflow-hidden">
                  <div className="bg-slate-900 text-white py-0.5 px-1.5 absolute top-0 left-0 right-0 flex justify-between items-center h-[14px]">
                    <span className="text-[5.5px] font-bold tracking-wide uppercase truncate">{companyName}</span>
                    <span className="text-[5px] opacity-70">{product.plu}</span>
                  </div>
                  <div className={cn("flex flex-col flex-1", promo ? "pt-[18px]" : "pt-[16px]")}>
                    {promoLabel && <div className="text-[6px] font-bold text-red-600 uppercase mb-0.5">{promoLabel}</div>}
                    <span className="text-[6px] font-bold text-stone-500 uppercase">{product.brand}</span>
                    <h3 className="text-[9px] font-bold text-stone-900 leading-tight line-clamp-2 mt-0.5">{product.name}</h3>
                  </div>
                  <div className="border-t border-dashed border-stone-200 pt-1 mt-auto">
                    {hasDiscount && <span className="text-[6px] text-stone-400 line-through block">Rp {product.price.toLocaleString('id-ID')}</span>}
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-[7px] font-bold text-stone-900">Rp</span>
                      <span className="text-[16px] font-bold text-stone-900 tracking-tighter leading-none">{displayPrice.toLocaleString('id-ID')}</span>
                      <span className="text-[5px] text-stone-400 ml-0.5">/{product.unit || 'pcs'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`@media print { @page { size: A4; margin: 0; } body * { visibility: hidden; } .print\\:block, .print\\:block * { visibility: visible; } .print\\:block { position: absolute; left: 0; top: 0; } }`}</style>
    </>
  );
}
