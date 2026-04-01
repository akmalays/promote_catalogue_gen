import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit2, Trash2, X, Filter, Tag, Info, AlertCircle, Check, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
}

const CATEGORIES = [
  'All', 'Makanan', 'Minuman', 'Kebutuhan Rumah', 'Perawatan Diri', 'Bayi & Anak', 'Peralatan'
];

const INITIAL_PRODUCTS = [
  {
    name: 'Lite Potato Chips',
    brand: 'Chitato',
    description: 'Snack kentang gurih kualitas premium dengan rasa bumbu merata.',
    price: 19500,
    category: 'Makanan',
    image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=2070&auto=format&fit=crop'
  },
  {
    name: 'Activ-Go',
    brand: 'Milo',
    description: 'Susu cokelat bergizi dengan kandungan malt tinggi untuk energi harian.',
    price: 8400,
    category: 'Minuman',
    image_url: 'https://images.unsplash.com/photo-1550583724-1d2ee29ad706?q=80&w=1974&auto=format&fit=crop'
  },
  {
    name: 'Cheddar Cheese 70g',
    brand: 'Kraft',
    description: 'Keju cheddar olahan kualitas terbaik yang mudah diparut.',
    price: 8900,
    category: 'Kebutuhan Rumah',
    image_url: 'https://images.unsplash.com/photo-1486297678162-ad2a19b05840?q=80&w=2070&auto=format&fit=crop'
  }
];

export default function ProductDatabase({ onNavigate }: { onNavigate: (page: any) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    brand: '',
    description: '',
    price: 0,
    category: 'Makanan',
    image_url: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      let data = await api.getProducts();
      
      // Auto-insert initial data if empty and no error occurred
      if (data.length === 0) {
        toast.loading('Menyiapkan database produk...', { id: 'init-db' });
        for (const p of INITIAL_PRODUCTS) {
          await api.addProduct(p);
        }
        data = await api.getProducts();
        toast.success('Database produk siap digunakan!', { id: 'init-db' });
      }
      
      setProducts(data);
    } catch (e: any) {
      console.warn('Gagal memuat produk dari DB cloud:', e);
      // Fallback robust
      setProducts(INITIAL_PRODUCTS as Product[]);
      toast.error('Database cloud belum siap. Bapak bisa mencoba dalam "Mode Lokal" dulu.', {
        icon: 'ℹ️',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Hapus produk ini secara permanen?')) return;
    
    try {
      await api.deleteProduct(id);
      toast.success('Produk berhasil dihapus');
      fetchProducts();
    } catch (e) {
      toast.error('Gagal menghapus produk');
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.brand || !formData.price) {
      toast.error('Lengkapi data wajib (Nama, Merek, Harga)');
      return;
    }

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
        toast.success('Produk berhasil diperbarui');
      } else {
        await api.addProduct(formData);
        toast.success('Produk baru ditambahkan');
      }
      setIsFormOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (e) {
      toast.error('Gagal menyimpan produk');
    }
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: '',
      description: '',
      price: 0,
      category: 'Makanan',
      image_url: ''
    });
    setIsFormOpen(true);
  };

  const openEditForm = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(p);
    setFormData({ ...p });
    setIsFormOpen(true);
  };

  const openDetail = (p: Product) => {
    setViewingProduct(p);
    setIsDetailOpen(true);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      {/* Header Section */}
      <div className="mb-10 lg:flex items-center justify-between gap-6">
        <div className="mb-6 lg:mb-0">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Product Database
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Kelola data master produk untuk katalog promosi Anda.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari produk atau merek..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl w-[260px] md:w-[320px] text-sm focus:ring-4 focus:ring-[#8b7365]/10 focus:border-[#8b7365] outline-none transition-all shadow-sm font-bold"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
            {['All', 'Makanan', 'Minuman'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-black transition-all",
                  filterCategory === cat ? "bg-[#8b7365] text-white shadow-md shadow-[#8b7365]/20" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAddForm}
            className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </motion.button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[400px] flex items-center justify-center flex-col gap-4">
           <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#8b7365] border-t-transparent"></div>
           <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Sinkronisasi Database...</p>
        </div>
      ) : (
        <>
          {filteredProducts.length === 0 ? (
            <div className="h-[400px] bg-white rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-center px-6">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 opacity-20" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-1">Produk tidak ditemukan</h3>
              <p className="text-sm font-medium">Coba gunakan kata kunci lain atau tambahkan produk baru.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((p, i) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => openDetail(p)}
                  className="bg-white rounded-[32px] border border-slate-100 p-5 group flex flex-col hover:shadow-2xl hover:shadow-slate-200/50 transition-all cursor-pointer relative"
                >
                  <div className="relative aspect-square rounded-[24px] overflow-hidden bg-slate-50 border border-slate-100 mb-4">
                    <img 
                      src={p.image_url || 'https://via.placeholder.com/400x400?text=No+Image'} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black text-[#8b7365] uppercase tracking-widest shadow-sm">
                      {p.category}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{p.brand}</p>
                    <h3 className="text-lg font-black text-slate-800 leading-tight mb-2 group-hover:text-[#8b7365] transition-colors">{p.name}</h3>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4 italic">"{p.description}"</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                    <div className="text-xl font-black text-emerald-600">
                      Rp {p.price.toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={(e) => openEditForm(p, e)}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                       >
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button 
                        onClick={(e) => handleDelete(p.id, e)}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CRUD Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsFormOpen(false)}
                className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <p className="text-slate-500 font-medium">Lengkapi detail produk di bawah ini.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Merek (Brand)</label>
                  <input 
                    value={formData.brand}
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                    placeholder="Contoh: Indomie / Coca Cola"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Produk</label>
                  <input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Contoh: Mie Goreng Jumbo"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Kategori</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold appearance-none"
                  >
                    {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga (Rupiah)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">Rp</span>
                    <input 
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black"
                    />
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">URL Gambar Produk</label>
                   <input 
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Deskripsi Produk</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    placeholder="Jelaskan keunggulan produk ini..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[20px] font-black hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSubmit}
                  className="flex-3 py-4 bg-emerald-600 text-white rounded-[20px] font-black hover:bg-emerald-700 transition-colors shadow-2xl shadow-emerald-600/20"
                >
                  {editingProduct ? 'Update Produk' : 'Simpan Produk'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Preview Modal */}
      <AnimatePresence>
        {isDetailOpen && viewingProduct && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[48px] max-w-4xl w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="absolute top-10 right-10 z-10 p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-2xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="aspect-square md:h-[600px] relative bg-slate-100">
                  <img 
                    src={viewingProduct.image_url} 
                    alt={viewingProduct.name} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-12">
                     <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest w-fit mb-4">
                        Tersedia Secara Global
                     </div>
                     <h2 className="text-4xl font-black text-white leading-tight">{viewingProduct.name}</h2>
                     <p className="text-white/80 text-xl font-bold">{viewingProduct.brand}</p>
                  </div>
                </div>

                <div className="p-12 flex flex-col justify-center">
                  <div className="mb-8">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Informasi Produk</p>
                     <p className="text-slate-600 text-lg leading-relaxed font-medium italic">"{viewingProduct.description}"</p>
                  </div>

                  <div className="space-y-6 mb-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <Tag className="w-6 h-6 text-[#8b7365]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kategori</p>
                        <p className="font-black text-slate-800 uppercase">{viewingProduct.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Harga Dasar</p>
                        <p className="text-3xl font-black text-emerald-600">Rp {viewingProduct.price.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => { setIsDetailOpen(false); onNavigate('catalogue'); }}
                      className="flex-1 py-5 bg-[#8b7365] text-white rounded-[24px] font-black text-lg hover:bg-[#725e52] shadow-2xl shadow-[#8b7365]/30 transition-all active:scale-95"
                    >
                      Gunakan di Katalog
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
