import React, { useState, useEffect } from 'react';
import { FileText, Package, Plus, Search, Trash2 } from 'lucide-react';
import { SavedCatalogue } from '../types';

interface CatalogueHistoryProps {
  onNavigate: (page: string) => void;
}

export default function CatalogueHistory({ onNavigate }: CatalogueHistoryProps) {
  const [catalogues, setCatalogues] = useState<SavedCatalogue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const data = localStorage.getItem('saved_catalogues');
    if (data) {
      try {
        setCatalogues(JSON.parse(data));
      } catch(e) {}
    }
  }, []);

  const deleteCatalogue = (id: string) => {
    const newData = catalogues.filter(c => c.id !== id);
    setCatalogues(newData);
    localStorage.setItem('saved_catalogues', JSON.stringify(newData));
  };

  const filtered = catalogues.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.catalogData.promoTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">History Catalogue</h1>
          <p className="text-slate-500 text-sm font-medium">Daftar semua katalog promo yang pernah dibuat beserta detail item di dalamnya.</p>
        </div>
        <button 
          onClick={() => onNavigate('catalogue')}
          className="bg-[#8b7365] text-white px-5 py-2.5 rounded-xl hover:bg-[#725e52] transition flex items-center gap-2 font-bold shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Buat Katalog Baru
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari katalog atau tema promo..."
              className="w-full pl-9 pr-3 py-2 bg-[#f4f4f2] border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8b7365]/20 font-medium placeholder-slate-400"
            />
          </div>
        </div>
        
        {filtered.length === 0 ? (
           <div className="p-16 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-[#f4f2ef] flex items-center justify-center rounded-full mb-4">
               <FileText className="w-8 h-8 text-[#8b7365]/40" />
             </div>
             <p className="text-slate-600 font-bold mb-1">Belum ada riwayat katalog terdeteksi.</p>
             <p className="text-slate-400 text-sm">Gunakan Editor Katalog lalu tekan "Ekspor HD" untuk menyimpan rekam jejak katalog Anda.</p>
           </div>
        ) : (
          <div className="divide-y divide-slate-100">
             {filtered.map(cat => {
               const totalItems = cat.catalogData.rows.reduce((sum, r) => sum + r.items.length, 0);
               return (
                 <div key={cat.id} className="p-6 hover:bg-[#fcfbf9] transition flex flex-col md:flex-row gap-6">
                   <div className="flex-1">
                     <div className="flex items-center gap-3 mb-2">
                       <h3 className="font-bold text-lg text-slate-800">{cat.name}</h3>
                       <span className="px-2 py-0.5 bg-[#dfd8d4] text-[#6d4d42] text-[10px] font-black rounded uppercase tracking-widest">
                         {new Date(cat.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                       </span>
                     </div>
                     <p className="text-slate-600 text-sm font-medium mb-4">
                       Tema Pemasaran: <span className="font-bold text-[#8b7365]">{cat.catalogData.promoTitle}</span> 
                       {' '} <span className="opacity-70">({cat.catalogData.promoSubtitle})</span>
                     </p>
                     
                     <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                         <Package className="w-3.5 h-3.5" /> 
                         Konten Produk ({totalItems} item)
                       </p>
                       <div className="flex flex-wrap gap-2">
                         {cat.catalogData.rows.map(row => 
                           row.items.map(item => (
                             <div key={item.id} className="flex flex-col gap-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl min-w-[200px] max-w-[240px] flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-white rounded lg:rounded-md flex items-center justify-center shrink-0 shadow-sm p-0.5">
                                      <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-slate-700 truncate" title={`${item.brand} ${item.name}`}>
                                      {item.brand} {item.name}
                                    </span>
                                    {item.isBuyXGetY ? (
                                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-wide">
                                        Beli {item.buyQuantity} Gratis {item.getQuantity}
                                      </span>
                                    ) : item.discountPercentage ? (
                                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">
                                        Diskon {item.discountPercentage}%
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex items-end justify-between mt-1 border-t border-slate-200/50 pt-1.5">
                                  {item.originalPrice > item.discountedPrice && !item.isBuyXGetY ? (
                                    <div className="flex flex-col leading-none">
                                      <span className="text-[9px] text-slate-400 line-through">
                                        Rp {item.originalPrice.toLocaleString('id-ID')}
                                      </span>
                                      <span className="text-xs font-bold text-[#8b7365]">
                                        Rp {item.discountedPrice.toLocaleString('id-ID')}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-[#8b7365] leading-none">
                                      Rp {item.originalPrice.toLocaleString('id-ID')}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-slate-400 font-medium ml-2">/{item.unit}</span>
                                </div>
                             </div>
                           ))
                         )}
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex items-start gap-2 justify-end shrink-0">
                     <button 
                       onClick={() => deleteCatalogue(cat.id)}
                       className="p-2.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                       title="Hapus Data Katalog"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                   </div>
                 </div>
               )
             })}
          </div>
        )}
      </div>
    </div>
  );
}
