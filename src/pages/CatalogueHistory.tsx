import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Trash2, User, Calendar, X, Edit, Eye } from 'lucide-react';
import { SavedCatalogue, UserProfile } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

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

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const dbData = await api.getCatalogues(userProfile.company_id!);
      setCatalogues(dbData.map((item: any) => ({ id: item.id, name: item.name, createdAt: item.created_at, catalogData: item.catalog_data, creator_name: item.creator_name, thumbnail: item.thumbnail })));
    } catch { const local = localStorage.getItem('saved_catalogues'); if (local) setCatalogues(JSON.parse(local)); }
    finally { setIsLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await api.deleteCatalogueFromDB(deleteId, userProfile.company_id!); setCatalogues(prev => prev.filter(c => c.id !== deleteId)); setDeleteId(null); toast.success('Draft dihapus'); }
    catch { setCatalogues(prev => prev.filter(c => c.id !== deleteId)); setDeleteId(null); toast.error('Gagal menghapus dari cloud'); }
  };

  const filtered = catalogues.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.creator_name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-stone-50 dark:bg-stone-950">
      {/* Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-8" onClick={() => setPreviewImage(null)}>
            <motion.img initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} src={previewImage} className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
            <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Catalogue Drafts</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Katalog yang sedang dalam pengerjaan.</p>
        </div>
        <button onClick={() => onNavigate('catalogue')} className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Buat Katalog
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari draft..." className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? <LoadingScreen message="Memuat draft..." subMessage="Mengambil data katalog." /> : filtered.length === 0 ? (
        <div className="py-16 text-center"><FileText className="w-8 h-8 mx-auto mb-3 text-stone-300 dark:text-stone-600" /><p className="text-sm text-stone-500 dark:text-stone-400">Belum ada draft katalog.</p><p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Buat katalog baru lalu simpan sebagai draft.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cat => {
            const totalItems = cat.catalogData?.rows?.reduce((sum, r) => sum + r.items.length, 0) || 0;
            return (
              <div key={cat.id} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden group">
                {/* Thumbnail */}
                <div onClick={() => setPreviewImage(cat.thumbnail || null)} className="h-40 bg-stone-100 dark:bg-stone-800 relative cursor-pointer overflow-hidden">
                  {cat.thumbnail ? (
                    <img src={cat.thumbnail} alt="" className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><FileText className="w-8 h-8 text-stone-300 dark:text-stone-600" /></div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate mb-1">{cat.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 mb-3">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{cat.creator_name || 'System'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(cat.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">{totalItems} produk · {cat.catalogData?.rows?.length || 0} baris</p>

                  <div className="flex items-center gap-2">
                    <button onClick={() => onContinueEdit(cat)} className="flex-1 px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center justify-center gap-1.5">
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => setDeleteId(cat.id)} className="p-2 text-stone-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)} className="absolute inset-0 bg-black/40" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 z-10">
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-2">Hapus draft?</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">Katalog ini akan dihapus permanen dan tidak bisa dikembalikan.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Hapus</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
