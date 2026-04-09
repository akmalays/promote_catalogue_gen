import React, { useState, useEffect } from 'react';
import { FileText, Package, Plus, Search, Trash2, User, Calendar, X, Edit, Eye, BookOpen } from 'lucide-react';
import { SavedCatalogue, UserProfile, CatalogData } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

function DeleteConfirmModal({ isOpen, onCancel, onConfirm }: { isOpen: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
      >
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Trash2 className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Hapus Draft?</h2>
        <p className="text-slate-500 text-sm mb-8">Katalog ini akan dihapus permanen dari database cloud dan tidak bisa dikembalikan.</p>
        
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
          >
            Hapus
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface CatalogueHistoryProps {
  onNavigate: (page: any) => void;
  userProfile: UserProfile;
  onContinueEdit: (data: SavedCatalogue) => void;
}

export default function CatalogueHistory({ onNavigate, userProfile, onContinueEdit }: CatalogueHistoryProps) {
  const [catalogues, setCatalogues] = useState<SavedCatalogue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const dbData = await api.getCatalogues(userProfile.company_id!);
      const formatted = dbData.map((item: any) => ({
        id: item.id,
        name: item.name,
        createdAt: item.created_at,
        catalogData: item.catalog_data,
        creator_name: item.creator_name,
        thumbnail: item.thumbnail
      }));
      setCatalogues(formatted);
    } catch (e) {
      console.error('Gagal ambil data history:', e);
      const local = localStorage.getItem('saved_catalogues');
      if (local) setCatalogues(JSON.parse(local));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteCatalogueFromDB(deleteId, userProfile.company_id!);
      setCatalogues(prev => prev.filter(c => c.id !== deleteId));
      setDeleteId(null);
      toast.success('Draft berhasil dihapus permanen!');
    } catch (e: any) {
      console.error('Delete error:', e);
      const newData = catalogues.filter(c => c.id !== deleteId);
      setCatalogues(newData);
      localStorage.setItem('saved_catalogues', JSON.stringify(newData));
      setDeleteId(null);
      toast.error('Gagal menghapus dari database, draf dihapus secara lokal.');
    }
  };

  const filtered = catalogues.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.catalogData?.promoTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.creator_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 overflow-hidden" onClick={() => setPreviewImage(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-4 -right-4 md:-top-6 md:-right-6 w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center shadow-xl hover:bg-slate-100 transition-colors z-[3010]"
              >
                <X className="w-5 h-5 md:w-6 md:h-6 text-slate-800" />
              </button>
              <img src={previewImage} alt="Large Preview" className="max-w-full max-h-[85vh] md:max-h-[90vh] object-contain rounded-xl shadow-2xl border-4 border-white/10" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] shadow-sm shadow-[#8b7365]/10">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Catalogue Drafts</h1>
            <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none">Daftar katalog yang sedang dalam proses pengerjaan</p>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('catalogue')}
          className="bg-[#8b7365] text-white px-6 py-3 rounded-2xl hover:bg-[#725e52] transition flex items-center gap-2 font-black shadow-xl shadow-[#8b7365]/20 text-sm"
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
              placeholder="Cari kampanye, produk, atau pembuat..."
              className="w-full pl-9 pr-3 py-2 bg-[#f4f4f2] border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8b7365]/20 font-medium placeholder-slate-400"
            />
          </div>
        </div>
        
        {isLoading ? (
          <LoadingScreen 
            message="Mengambil Daftar Draft..."
            subMessage="Kami sedang menyiapkan seluruh katalog dan kampanye yang tersimpan untuk Anda."
          />
        ) : filtered.length === 0 ? (
           <div className="p-16 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-[#f4f2ef] flex items-center justify-center rounded-full mb-4">
               <FileText className="w-8 h-8 text-[#8b7365]/40" />
             </div>
             <p className="text-slate-600 font-bold mb-1">Belum ada riwayat ditemukan.</p>
             <p className="text-slate-400 text-sm">Gunakan Editor Katalog lalu tekan "Add to Draft" untuk menyimpan di sini.</p>
           </div>
        ) : (
          <div className="divide-y divide-slate-100">
             {filtered.map(cat => {
               const totalItems = cat.catalogData?.rows?.reduce((sum, r) => sum + r.items.length, 0) || 0;
               return (
                 <div key={cat.id} className="p-6 hover:bg-[#fcfbf9] transition flex flex-col md:flex-row gap-6">
                   {/* Thumbnail Preview */}
                   <div 
                    onClick={() => setPreviewImage(cat.thumbnail || null)}
                    className="w-full md:w-32 lg:w-40 h-56 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm shrink-0 relative group cursor-zoom-in"
                   >
                     {cat.thumbnail ? (
                       <img src={cat.thumbnail} alt="Preview" className="w-full h-full object-cover object-top" />
                     ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-300">
                         <FileText className="w-10 h-10 mb-2 opacity-30" />
                         <span className="text-[10px] uppercase font-bold tracking-widest">No Preview</span>
                       </div>
                     )}
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <Eye className="w-8 h-8 text-white drop-shadow-lg" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md">Preview Detail</span>
                     </div>
                   </div>

                   <div className="flex-1 min-w-0">
                     <div className="flex items-start justify-between mb-3">
                       <div>
                         <div className="flex items-center gap-3 mb-1">
                           <h3 className="font-bold text-xl text-slate-800 truncate">{cat.name}</h3>
                           <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded uppercase tracking-widest border border-emerald-100">
                             Draft
                           </span>
                         </div>
                         <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs">
                           <div className="flex items-center gap-1.5">
                             <User className="w-3.5 h-3.5" />
                             <span className="font-bold text-slate-700">{cat.creator_name || 'System'}</span>
                           </div>
                           <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                             <Calendar className="w-3.5 h-3.5" />
                             <span>{new Date(cat.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                           </div>
                         </div>
                       </div>
                       
                       <div className="flex items-center gap-2">
                        <button 
                           onClick={() => onContinueEdit(cat)}
                           className="flex items-center gap-1.5 px-4 py-2 bg-[#8b7365]/10 text-[#8b7365] rounded-xl hover:bg-[#8b7365] hover:text-white transition-all font-bold text-xs"
                         >
                           <Edit className="w-3.5 h-3.5" />
                           Continue Edit
                         </button>
                        <button 
                           onClick={() => setDeleteId(cat.id)}
                           className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                          >
                           <Trash2 className="w-5 h-5" />
                         </button>
                       </div>
                     </div>

                     <div className="bg-[#fcfbf9]/50 border border-slate-200/50 p-4 rounded-2xl">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                         <Package className="w-4 h-4" /> 
                         Detail Campaign & Produk ({totalItems} item)
                       </p>
                       
                       <div className="flex flex-col gap-1 mb-4">
                         <p className="text-sm font-bold text-slate-700">Tema: <span className="text-[#8b7365]">{cat.catalogData?.promoTitle}</span></p>
                         <p className="text-xs text-slate-500 italic">"{cat.catalogData?.promoSubtitle}"</p>
                       </div>

                       <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                         {cat.catalogData?.rows?.map(row => 
                           row.items.slice(0, 10).map(item => (
                             <div key={item.id} className="flex-none w-10 h-10 bg-white border border-slate-200 rounded-lg p-1 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                             </div>
                           ))
                         )}
                         {totalItems > 10 && (
                           <div className="flex-none w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-500">
                             +{totalItems - 10}
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
               )
             })}
          </div>
        )}
      </div>

      <AnimatePresence>
        <DeleteConfirmModal 
          isOpen={!!deleteId} 
          onCancel={() => setDeleteId(null)} 
          onConfirm={confirmDelete} 
        />
      </AnimatePresence>
    </div>
  );
}
