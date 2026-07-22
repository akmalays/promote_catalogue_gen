import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Package, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { api } from '../../../lib/api';
import { CampaignProduct, UserProfile } from '../../../types';
import JsBarcode from 'jsbarcode';

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
  userProfile?: UserProfile;
}

// Barcode component using JsBarcode
function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: 'CODE128',
          displayValue: false,
          height: 24,
          width: 1.2,
          margin: 0,
          background: 'transparent',
          lineColor: '#1a1a1a'
        });
      } catch {}
    }
  }, [value]);
  return <svg ref={ref} className="w-full h-[24px]" />;
}

export default function PriceTagDrawer({ isOpen, onClose, productsFromPage, allProducts, companyName, initialProduct, userProfile }: PriceTagDrawerProps) {
  const [selectedToPrint, setSelectedToPrint] = useState<(Product & { quantity: number })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignProducts, setCampaignProducts] = useState<CampaignProduct[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);

  useEffect(() => { if (isOpen) loadActiveCampaign(); }, [isOpen]);

  const loadActiveCampaign = async () => {
    try {
      const camp = await api.getActiveCampaign((productsFromPage[0] as any)?.company_id || '');
      if (camp) { setActiveCampaign(camp); setCampaignProducts(await api.getCampaignProducts(camp.id)); }
      else { setActiveCampaign(null); setCampaignProducts([]); }
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
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] overflow-y-auto p-[4mm]">
        <div className="max-w-[210mm] mx-auto">
          {(() => {
            const allTags = selectedToPrint.flatMap(product => 
              Array.from({ length: product.quantity }).map((_, idx) => ({ product, idx }))
            );
            const rows: typeof allTags[] = [];
            for (let i = 0; i < allTags.length; i += 4) {
              rows.push(allTags.slice(i, i + 4));
            }
            return rows.map((row, rowIdx) => (
              <div key={rowIdx}>
                <div className="grid grid-cols-4 gap-0">
                  {row.map(({ product, idx }) => {
                    const promo = getPromoInfo(product.id);
                    const displayPrice = promo?.promo_type === 'price_cut' && promo.promo_price ? promo.promo_price : product.price;
                    const hasDiscount = promo?.promo_type === 'price_cut' && promo.promo_price;
                    const discountPct = hasDiscount ? Math.round(((product.price - (promo!.promo_price || 0)) / product.price) * 100) : 0;
                    const isVolumePromo = promo && promo.promo_type !== 'price_cut';
                    const volumeLabel = promo?.promo_type === 'b1g1' ? 'BELI 1 GRATIS 1' : promo?.promo_type === 'b2g1' ? 'BELI 2 GRATIS 1' : promo?.promo_type === 'buy_x_get_y' ? `BELI ${promo.buy_qty} GRATIS ${promo.get_qty}` : '';
                    const hasAnyPromo = hasDiscount || isVolumePromo;

                    return (
                      <div key={`${product.id}-${idx}`} className={cn(
                        "w-full flex flex-col break-inside-avoid border border-stone-700 relative overflow-hidden",
                        hasAnyPromo ? "bg-[#fcd34d]" : "bg-white"
                      )}>
                        {/* Promo badge - top right (only for discount %) */}
                        {hasDiscount && (
                          <div className="absolute top-1 right-1 bg-[#e11d48] text-white px-2 py-0.5 text-[10px] font-black leading-none z-10">
                            -{discountPct}%
                          </div>
                        )}

                        {/* Original price for discount (top left small) */}
                        {hasDiscount && (
                          <div className="absolute top-2 left-2 text-[8px] font-bold text-[#1a1a1a] z-10">
                            <span className="line-through underline decoration-[#e11d48] decoration-[1.5px]">Rp {product.price.toLocaleString('id-ID')}</span>
                          </div>
                        )}

                        {/* Volume promo label (top left) */}
                        {isVolumePromo && (
                          <div className="absolute top-1 left-1.5 bg-[#1a1a1a] text-[#fcd34d] px-2 py-0.5 text-[9px] font-black leading-none z-10">
                            {volumeLabel}
                          </div>
                        )}

                        {/* Brand (top center, very small) */}
                        <div className={cn("text-center pt-3 pb-0", (hasDiscount || isVolumePromo) ? "mt-1" : "")}>
                          <span className="text-[7px] font-bold text-stone-600 uppercase tracking-wider">{product.brand}</span>
                        </div>

                        {/* Main price (centered, dominant) */}
                        <div className="flex flex-col items-center justify-center px-2 pb-1">
                          <div className="flex items-baseline gap-0.5 leading-none">
                            <span className="text-[12px] font-bold text-[#1a1a1a]">Rp</span>
                            <span className="text-[40px] font-black text-[#1a1a1a] tracking-tighter leading-none">
                              {displayPrice.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-[#1a1a1a] uppercase mt-1.5 text-center line-clamp-2 leading-tight px-1">
                            {product.name}
                          </p>
                        </div>

                        {/* Barcode */}
                        <div className="px-3 pb-1 flex flex-col items-center">
                          <Barcode value={product.plu || product.id} />
                          <span className="text-[7px] font-mono text-[#1a1a1a] tracking-[0.2em] mt-0.5">{product.plu || product.id}</span>
                        </div>

                        {/* Info row: unit, date, admin */}
                        <div className={cn(
                          "px-2 py-0.5 flex justify-between items-center text-[6.5px] font-mono border-t",
                          hasAnyPromo ? "text-[#1a1a1a]/80 border-[#1a1a1a]/20" : "text-stone-600 border-stone-200"
                        )}>
                          <span>/{product.unit || 'pcs'}</span>
                          <span>{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                          {userProfile?.username && <span>{userProfile.username.slice(0, 8).toUpperCase()}</span>}
                        </div>

                        {/* Promo end date (only if applicable) */}
                        {hasAnyPromo && activeCampaign?.end_date && (
                          <div className="px-2 py-0 bg-[#1a1a1a]/10 flex justify-center">
                            <span className="text-[6.5px] font-bold text-[#1a1a1a] uppercase tracking-wide">
                              s/d {new Date(activeCampaign.end_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </span>
                          </div>
                        )}

                        {/* Bottom strip: PROMO repeating (promo) or red bar (normal) */}
                        {hasAnyPromo ? (
                          <div className="h-[14px] bg-[#e11d48] flex items-center overflow-hidden px-1">
                            <span className="text-[8px] font-black text-white whitespace-nowrap tracking-wider">
                              PROMO &nbsp;&nbsp; PROMO &nbsp;&nbsp; PROMO &nbsp;&nbsp; PROMO &nbsp;&nbsp; PROMO &nbsp;&nbsp; PROMO
                            </span>
                          </div>
                        ) : (
                          <div className="h-[7px] bg-[#e11d48] relative overflow-hidden">
                            <div className="absolute inset-0" style={{
                              background: 'repeating-linear-gradient(45deg, #e11d48 0, #e11d48 7px, #fbbf24 7px, #fbbf24 10px)'
                            }} />
                          </div>
                        )}

                        {/* Store name footer */}
                        <div className="h-[12px] bg-[#1a1a1a] flex items-center justify-center px-1">
                          <span className="text-[7px] font-bold text-white uppercase tracking-wider truncate">{companyName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Cut line after each row */}
                <div className="flex items-center h-[4mm]">
                  <span className="text-[7px] text-stone-400 shrink-0">✂</span>
                  <div className="flex-1 border-t border-dashed border-stone-400 mx-1"></div>
                  <span className="text-[7px] text-stone-400 shrink-0">✂</span>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      <style>{`@media print { @page { size: A4; margin: 0; } body * { visibility: hidden; } .print\\:block, .print\\:block * { visibility: visible; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } .print\\:block { position: absolute; left: 0; top: 0; } }`}</style>
    </>
  );
}
