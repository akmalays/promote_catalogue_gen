import React, { useState, useEffect } from 'react';
import { Package, Search, ChevronRight, BookOpen, ExternalLink, ArrowLeft, Filter, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { CatalogItem } from '../types';

interface ProductInventoryProps {
  onNavigate: (page: any) => void;
}

interface AggregatedProduct extends CatalogItem {
  appearances: number;
  catalogues: { id: string, name: string, date: string }[];
}

export default function ProductInventory({ onNavigate }: ProductInventoryProps) {
  const [products, setProducts] = useState<AggregatedProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<AggregatedProduct | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const catalogues = await api.getCatalogues();
      const productMap: Record<string, AggregatedProduct> = {};

      catalogues.forEach((c: any) => {
        try {
          const data = typeof c.catalog_data === 'string' ? JSON.parse(c.catalog_data) : c.catalog_data;
          const items: CatalogItem[] = (data?.rows?.flatMap((r: any) => r.items) || data?.items || []);
          
          items.forEach(item => {
            // Create a unique key based on name and brand
            const key = `${item.brand}-${item.name}`.toLowerCase();
            if (!productMap[key]) {
              productMap[key] = {
                ...item,
                appearances: 1,
                catalogues: [{ id: c.id, name: c.name, date: c.created_at }]
              };
            } else {
              productMap[key].appearances++;
              if (!productMap[key].catalogues.find(cat => cat.id === c.id)) {
                productMap[key].catalogues.push({ id: c.id, name: c.name, date: c.created_at });
              }
            }
          });
        } catch (e) {}
      });

      setProducts(Object.values(productMap).sort((a, b) => b.appearances - a.appearances));
    } catch (e) {
      console.error('Gagal memuat produk:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Inventori Produk Terlibat</h1>
              <p className="text-slate-500 text-sm font-medium">Analisis item produk yang paling sering muncul di katalog Anda.</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari brand atau nama produk..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl w-[300px] text-sm focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all shadow-sm font-bold"
              />
           </div>
           <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-600">
              <Filter className="w-5 h-5" />
           </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[400px] flex items-center justify-center">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8b7365]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Products List */}
           <div className={cn("transition-all duration-300", selectedProduct ? "lg:col-span-7" : "lg:col-span-12")}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                 {filteredProducts.map((p, i) => (
                   <motion.div 
                     key={i}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.05 }}
                     onClick={() => setSelectedProduct(p)}
                     className={cn(
                       "bg-white p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-md",
                       selectedProduct?.name === p.name && selectedProduct?.brand === p.brand ? "border-[#8b7365] ring-2 ring-[#8b7365]/5 shadow-md" : "border-slate-200"
                     )}
                   >
                      <div className="flex gap-4">
                         <div className="w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 p-2 shrink-0 group-hover:scale-105 transition-transform">
                            <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-[#8b7365] uppercase tracking-widest leading-none mb-1">{p.brand}</p>
                            <h3 className="text-sm font-bold text-slate-800 truncate mb-1">{p.name}</h3>
                            <div className="flex items-center gap-1.5 mt-2">
                               <div className="px-2 py-0.5 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                  {p.appearances}x Muncul
                               </div>
                               <div className="px-2 py-0.5 bg-emerald-50 rounded-md text-[9px] font-bold text-emerald-600">
                                  Rp {p.discountedPrice.toLocaleString()}
                               </div>
                            </div>
                         </div>
                      </div>
                   </motion.div>
                 ))}
              </div>
           </div>

           {/* Detail Sidebar */}
           <AnimatePresence>
             {selectedProduct && (
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xl p-8 sticky top-8 h-fit"
               >
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-xl font-black text-slate-800">Detail Produk</h2>
                     <button 
                       onClick={() => setSelectedProduct(null)}
                       className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                     >
                        <ChevronRight className="w-5 h-5 text-slate-400 rotate-180" />
                     </button>
                  </div>

                  <div className="flex gap-6 mb-8 p-6 bg-[#f8f6f4] rounded-3xl border border-[#edeae8]">
                     <div className="w-32 h-32 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                        <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-contain" />
                     </div>
                     <div className="flex-1 flex flex-col justify-center">
                        <p className="text-xs font-black text-[#8b7365] uppercase tracking-widest mb-1">{selectedProduct.brand}</p>
                        <h3 className="text-2xl font-black text-slate-800 leading-tight mb-2">{selectedProduct.name}</h3>
                        <p className="text-sm text-slate-500 font-medium italic">"{selectedProduct.description}"</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Harga Promo Terakhir</p>
                        <p className="text-xl font-black text-emerald-600">Rp {selectedProduct.discountedPrice.toLocaleString()}</p>
                     </div>
                     <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Muncul</p>
                        <p className="text-xl font-black text-slate-800">{selectedProduct.appearances} Katalog</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5" /> Ada di Katalog Berikut:
                     </h4>
                     <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {selectedProduct.catalogues.map((cat, idx) => (
                           <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                              <div>
                                 <p className="text-sm font-bold text-slate-700 group-hover:text-[#8b7365] transition-colors">{cat.name}</p>
                                 <p className="text-[10px] text-slate-400 font-medium">{new Date(cat.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              </div>
                              <button 
                                onClick={() => onNavigate('history')}
                                className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                              >
                                 <ExternalLink className="w-4 h-4 text-[#8b7365]" />
                              </button>
                           </div>
                        ))}
                     </div>
                  </div>

                  <button 
                    onClick={() => onNavigate('catalogue')}
                    className="w-full mt-8 py-3 bg-[#8b7365] text-white rounded-2xl font-black transition-all hover:bg-[#725e52] shadow-lg shadow-[#8b7365]/20 flex items-center justify-center gap-2"
                  >
                     Gunakan Produk di Katalog Baru
                     <ChevronRight className="w-4 h-4" />
                  </button>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      )}
    </div>
  );
}
