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
  stock: number;
  unit: string;
  plu: string;
}

const CATEGORIES = [
  'All', 'Makanan', 'Minuman', 'Kardus', 'Kebutuhan Rumah', 'Perawatan Diri', 'Bayi & Anak', 'Peralatan'
];

const INITIAL_PRODUCTS: Product[] = [];

export default function ProductDatabase({ onNavigate }: { onNavigate: (page: any) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLowStockExpanded, setIsLowStockExpanded] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    brand: '',
    description: '',
    price: 0,
    category: 'Makanan',
    image_url: '',
    stock: 0,
    unit: 'pcs',
    plu: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (e: any) {
      console.warn('Gagal memuat produk dari DB cloud:', e);
      setProducts(INITIAL_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  };

  const lowStockItems = products.filter(p => (p.stock || 0) < 10);

  const openDeleteModal = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductToDelete(p);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.deleteProduct(productToDelete.id);
      toast.success('Produk berhasil dihapus');
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (e) {
      toast.error('Gagal menghapus produk');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.brand || !formData.price) {
      toast.error('Lengkapi data wajib (Nama, Merek, Harga)');
      return;
    }

    setIsSubmitting(true);
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
    } catch (e: any) {
      console.error('Gagal simpan:', e);
      toast.error('Gagal menyimpan produk ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddForm = () => {
    // Generate a unique 6-digit PLU
    const randomPlu = Math.floor(100000 + Math.random() * 900000).toString();
    
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: '',
      description: '',
      price: 0,
      category: 'Makanan',
      image_url: '',
      stock: 0,
      unit: 'pcs',
      plu: randomPlu
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

  // Smart Pagination Controls
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentItems = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

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
          
          <div className="relative group">
            <Filter className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
              filterCategory === 'All' ? "text-slate-400" : "text-[#8b7365]"
            )} />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 focus:ring-4 focus:ring-[#8b7365]/10 focus:border-[#8b7365] outline-none transition-all shadow-sm appearance-none cursor-pointer min-w-[180px]"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat === 'All' ? 'Semua Kategori' : cat}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Plus className="w-3.5 h-3.5 rotate-45" />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAddForm}
            className="px-6 py-3 bg-[#8b7365] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#8b7365]/20 flex items-center gap-2 hover:bg-[#7a6458] transition-colors"
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
          {/* Low Stock Alerts (Expandable) */}
          {lowStockItems.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 overflow-hidden rounded-[32px] border border-rose-200 bg-rose-50/30"
            >
              <div 
                onClick={() => setIsLowStockExpanded(!isLowStockExpanded)}
                className="flex items-center justify-between px-8 py-4 cursor-pointer hover:bg-rose-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                     <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-rose-800 text-base leading-none">Peringatan: {lowStockItems.length} Produk Stok Menipis</h3>
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-1">Stok di bawah 10 unit</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">{isLowStockExpanded ? 'Tutup Detail' : 'Lihat Detail'}</span>
                  <div className={cn("w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center transition-transform duration-300", 
                    isLowStockExpanded && "rotate-180"
                  )}>
                    <Plus className="w-4 h-4 text-rose-600 rotate-45" />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isLowStockExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-8 pb-8"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                       {lowStockItems.map(item => (
                         <div key={item.id} onClick={() => openDetail(item)} className="bg-white p-3 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-3 cursor-pointer hover:border-rose-300 transition-all group">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 group-hover:scale-110 transition-transform">
                               <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="min-w-0 pr-2">
                               <p className="text-[10px] font-black text-[#8b7365] uppercase truncate tracking-tighter leading-none mb-1">{item.brand}</p>
                               <h4 className="font-bold text-slate-800 text-xs truncate leading-tight">{item.name}</h4>
                               <div className="flex items-center gap-1 mt-1">
                                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Sisa:</span>
                                  <span className="text-[11px] font-black text-rose-600">{item.stock || 0}</span>
                                  <span className="text-[10px] font-black text-rose-400 lowercase">{item.unit || 'pcs'}</span>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="h-[400px] bg-white rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-center px-6">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 opacity-20" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-1">Produk tidak ditemukan</h3>
              <p className="text-sm font-medium">Coba gunakan kata kunci lain atau tambahkan produk baru.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center w-20">Gambar</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">PLU</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Nama Produk</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Merek</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Kategori</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Stok</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Satuan</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Harga</th>
                      <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {currentItems.map((p, i) => (
                      <motion.tr 
                        key={p.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="group hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-3">
                          <div 
                            onClick={() => openDetail(p)}
                            className="w-11 h-11 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#8b7365]/20 transition-all mx-auto"
                          >
                            <img 
                              src={p.image_url || 'https://via.placeholder.com/100x100?text=No+Img'} 
                              alt={p.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </div>
                        </td>
                        <td className="px-6 py-3">
                           <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                              {p.plu || 'N/A'}
                           </span>
                        </td>
                        <td className="px-6 py-3">
                          <button 
                            onClick={() => openDetail(p)}
                            className="font-black text-slate-800 hover:text-[#8b7365] transition-colors text-left text-sm"
                          >
                            {p.name}
                          </button>
                        </td>
                        <td className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {p.brand}
                        </td>
                        <td className="px-6 py-3">
                          <span className="px-2.5 py-1 bg-slate-100 text-[9px] font-black text-slate-500 rounded uppercase tracking-tight">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                           <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "text-xs font-black",
                                p.stock <= 10 ? "text-rose-500" : "text-slate-600"
                              )}>
                                {p.stock || 0}
                              </span>
                              {p.stock <= 10 && (
                                <AlertCircle className="w-3 h-3 text-rose-500" />
                              )}
                           </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {p.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm font-black text-emerald-600">
                          Rp {p.price.toLocaleString()}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={(e) => openEditForm(p, e)}
                              className="p-2 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 rounded-lg transition-all shadow-sm"
                              title="Edit Produk"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={(e) => openDeleteModal(p, e)}
                              className="p-2 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 rounded-lg transition-all shadow-sm"
                              title="Hapus Produk"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-8 py-5 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Halaman {currentPage} dari {totalPages} <span className="mx-2">|</span> Total {filteredProducts.length} Produk
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                    >
                      Sebelumnya
                    </button>
                    {renderPageNumbers().map((pg, i) => (
                      <button
                        key={i}
                        onClick={() => typeof pg === 'number' && setCurrentPage(pg)}
                        disabled={pg === '...'}
                        className={cn(
                          "w-9 h-9 rounded-xl text-xs font-black transition-all shadow-sm",
                          currentPage === pg ? "bg-[#8b7365] text-white shadow-md shadow-[#8b7365]/20" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50",
                          pg === '...' && "cursor-default border-none shadow-none bg-transparent"
                        )}
                      >
                        {pg}
                      </button>
                    ))}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              )}
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
              className="bg-white rounded-[40px] p-8 max-w-2xl w-full shadow-2xl relative max-h-[95vh] overflow-y-auto mt-4"
            >
              <button 
                onClick={() => setIsFormOpen(false)}
                className="absolute top-6 right-8 p-2 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <p className="text-slate-500 text-xs font-medium">Lengkapi detail produk di bawah ini.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-rose-500 tracking-widest ml-1">KODE PLU (AUTO)</label>
                  <input 
                    value={formData.plu}
                    readOnly
                    className="w-full px-4 py-2.5 bg-rose-50/30 border border-rose-100 rounded-2xl outline-none font-black text-rose-600 cursor-not-allowed text-sm"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Merek (Brand)</label>
                  <input 
                    value={formData.brand}
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                    placeholder="Contoh: Indomie / Coca Cola"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Produk</label>
                  <input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Contoh: Mie Goreng Jumbo"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-sm"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Kategori</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#8b7365]/10 focus:border-[#8b7365] outline-none transition-all font-bold appearance-none text-sm"
                  >
                    {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Satuan</label>
                  <input 
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    placeholder="Contoh: pcs / kardus"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#8b7365]/10 focus:border-[#8b7365] outline-none transition-all font-bold text-sm"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Stok Awal</label>
                  <input 
                    type="number"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#8b7365]/10 focus:border-[#8b7365] outline-none transition-all font-bold text-sm"
                  />
                </div>
                <div className="col-span-2 md:col-span-1 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga (Rupiah)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">Rp</span>
                    <input 
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black text-sm"
                    />
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Gambar Produk</label>
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 group relative">
                      {formData.image_url ? (
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <Plus className="w-5 h-5 text-slate-300" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({ ...formData, image_url: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <button 
                        type="button"
                        onClick={() => {
                          const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                          input?.click();
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                      >
                        Ganti Gambar
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Deskripsi Produk</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows={2}
                    placeholder="Jelaskan keunggulan produk ini..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium resize-none text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-[20px] font-black hover:bg-slate-200 transition-colors text-sm"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-3 py-3 text-white rounded-[20px] font-black transition-all shadow-2xl flex items-center justify-center gap-2 text-sm",
                    isSubmitting 
                      ? "bg-slate-400 cursor-not-allowed" 
                      : "bg-[#8b7365] hover:bg-[#7a6458] shadow-[#8b7365]/20"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {editingProduct ? 'Updating...' : 'Saving...'}
                    </>
                  ) : (
                    editingProduct ? 'Update Produk' : 'Simpan Produk'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDetailOpen && viewingProduct && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="mb-8 flex items-center gap-6">
                <div className="w-24 h-24 bg-slate-50 rounded-3xl border border-slate-100 p-4 shrink-0">
                  <img 
                    src={viewingProduct.image_url} 
                    alt={viewingProduct.name} 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#8b7365] uppercase tracking-widest mb-1">{viewingProduct.brand}</p>
                  <h2 className="text-2xl font-black text-slate-800 leading-tight">{viewingProduct.name}</h2>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Deskripsi Produk</p>
                  <p className="text-slate-600 leading-relaxed font-medium italic">
                    "{viewingProduct.description || 'Tidak ada deskripsi untuk produk ini.'}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kategori</p>
                    <p className="font-black text-slate-800">{viewingProduct.category}</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Harga</p>
                    <p className="font-black text-emerald-600">Rp {viewingProduct.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsDetailOpen(false)}
                className="w-full mt-10 py-4 bg-slate-800 text-white rounded-[20px] font-black hover:bg-slate-900 transition-colors shadow-xl shadow-slate-900/20"
              >
                Tutup Detail
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && productToDelete && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600">
                <AlertCircle className="w-10 h-10" />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 mb-2">Hapus Produk?</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                Apakah Anda yakin ingin menghapus <span className="text-slate-800 font-black">"{productToDelete.name}"</span>? Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-white transition-all shadow-lg flex items-center justify-center gap-2",
                    isDeleting ? "bg-slate-400 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  )}
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menghapus...
                    </>
                  ) : 'Ya, Hapus Produk'}
                </button>
                <button 
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-full py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
