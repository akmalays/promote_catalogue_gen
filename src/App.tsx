import React, { useState, useRef, useCallback } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import { 
  Plus, 
  Trash2, 
  Download, 
  Image as ImageIcon, 
  Type, 
  Calendar, 
  Layout, 
  Save,
  ChevronRight,
  ChevronLeft,
  Upload,
  RefreshCw,
  Package,
  FileText,
  Palette,
  CheckCircle2,
  Bike,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { CatalogData, CatalogItem, CatalogRow, DEFAULT_CATALOG, DEFAULT_ITEMS } from './types';

const PATTERNS = [
  { id: 'none', name: 'Polos', url: '' },
  { id: 'flowers', name: 'Bunga Sakura', url: 'https://www.transparenttextures.com/patterns/flowers.png' },
  { id: 'leaves', name: 'Daun Tropis', url: 'https://www.transparenttextures.com/patterns/leaves.png' },
  { id: 'floral-vintage', name: 'Bunga Klasik', url: 'https://www.transparenttextures.com/patterns/floral-pattern.png' },
  { id: 'paper', name: 'Tekstur Kertas', url: 'https://www.transparenttextures.com/patterns/cream-paper.png' },
  { id: 'dots', name: 'Titik Halus', url: 'https://www.transparenttextures.com/patterns/stardust.png' },
  { id: 'woven', name: 'Kain Linen', url: 'https://www.transparenttextures.com/patterns/woven.png' },
  { id: 'wall', name: 'Dinding Putih', url: 'https://www.transparenttextures.com/patterns/white-wall.png' }
];

export default function App() {
  const [catalog, setCatalog] = useState<CatalogData>(DEFAULT_CATALOG);
  const [activeTab, setActiveTab] = useState<'items' | 'campaign' | 'template'>('template');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback((format: 'jpg' | 'png') => {
    if (previewRef.current === null) return;

    // Ensure the element is fully rendered and styles are applied
    const el = previewRef.current;
    
    // Use a small timeout to let the browser settle
    setTimeout(() => {
      const options = {
        quality: 0.95,
        cacheBust: true,
        pixelRatio: 3, // High quality
        width: el.scrollWidth,
        height: el.scrollHeight,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          margin: '0',
          padding: '0',
        }
      };

      const fn = format === 'jpg' ? toJpeg : toPng;

      fn(el, options)
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `katalog-promosi-${Date.now()}.${format}`;
          link.href = dataUrl;
          link.click();
        })
        .catch((err) => {
          console.error('Export failed', err);
        });
    }, 100);
  }, [previewRef]);

  const updateItem = (rowId: string, itemId: string, updates: Partial<CatalogItem>) => {
    setCatalog(prev => ({
      ...prev,
      rows: prev.rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            items: row.items.map(item => {
              if (item.id === itemId) {
                const newItem = { ...item, ...updates };
                // Auto-calculate discount percentage if prices change
                if (updates.originalPrice !== undefined || updates.discountedPrice !== undefined) {
                  if (newItem.originalPrice > 0 && newItem.discountedPrice > 0 && newItem.originalPrice > newItem.discountedPrice) {
                    const pct = Math.round(((newItem.originalPrice - newItem.discountedPrice) / newItem.originalPrice) * 100);
                    newItem.discountPercentage = pct > 0 ? pct : undefined;
                  } else {
                    newItem.discountPercentage = undefined;
                  }
                }
                return newItem;
              }
              return item;
            })
          };
        }
        return row;
      })
    }));
  };

  const addItemToRow = (rowId: string) => {
    const newItem: CatalogItem = {
      id: Math.random().toString(36).substr(2, 9),
      brand: 'BRAND',
      name: 'Produk Baru',
      description: 'Deskripsi produk',
      originalPrice: 0,
      discountedPrice: 0,
      image: 'https://picsum.photos/seed/' + Math.random() + '/200/200',
      unit: 'Pcs'
    };
    
    setCatalog(prev => ({
      ...prev,
      rows: prev.rows.map(row => {
        if (row.id === rowId && row.items.length < 4) {
          return { ...row, items: [...row.items, newItem] };
        }
        return row;
      })
    }));
  };

  const removeItemFromRow = (rowId: string, itemId: string) => {
    setCatalog(prev => ({
      ...prev,
      rows: prev.rows.map(row => {
        if (row.id === rowId && row.items.length > 2) {
          return { ...row, items: row.items.filter(item => item.id !== itemId) };
        }
        return row;
      })
    }));
  };

  const updateRowTitle = (rowId: string, title: string) => {
    setCatalog(prev => ({
      ...prev,
      rows: prev.rows.map(row => row.id === rowId ? { ...row, title } : row)
    }));
  };

  const addRow = () => {
    setCatalog(prev => {
      const newRowId = `row-${Date.now()}`;
      const newRow: CatalogRow = {
        id: newRowId,
        title: `Baris ${prev.rows.length + 1}`,
        items: [DEFAULT_ITEMS[0], DEFAULT_ITEMS[1]]
      };
      return {
        ...prev,
        rows: [...prev.rows, newRow]
      };
    });
  };

  const removeRow = (rowId: string) => {
    setCatalog(prev => ({
      ...prev,
      rows: prev.rows.filter(row => row.id !== rowId)
    }));
  };

  const handleImageUpload = (rowId: string, itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateItem(rowId, itemId, { image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Katalog Promo Generator</h1>
          <p className="text-sm text-slate-500">Buat katalog promosi profesional dengan mudah</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleExport('jpg')}
            className="px-6 py-2.5 bg-[#1a73e8] text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Ekspor JPG
          </button>
          <button 
            onClick={() => handleExport('png')}
            className="px-6 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Ekspor PNG
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Editor */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tab Switcher */}
          <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1">
            <button 
              onClick={() => setActiveTab('items')}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all",
                activeTab === 'items' ? "bg-white shadow-sm text-slate-800 ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-800"
              )}
            >
              <Package className="w-4 h-4" /> Produk
            </button>
            <button 
              onClick={() => setActiveTab('campaign')}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all",
                activeTab === 'campaign' ? "bg-white shadow-sm text-slate-800 ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-800"
              )}
            >
              <FileText className="w-4 h-4" /> Kampanye
            </button>
            <button 
              onClick={() => setActiveTab('template')}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all",
                activeTab === 'template' ? "bg-white shadow-sm text-slate-800 ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-800"
              )}
            >
              <Palette className="w-4 h-4" /> Template
            </button>
          </div>

          {/* Editor Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col overflow-hidden">
            <div className="p-6 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === 'items' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <h2 className="text-lg font-bold mb-4">Daftar Produk per Baris</h2>
                    
                    {(catalog.showHeadBanner ? catalog.rows.slice(0, 3) : catalog.rows.slice(0, 4)).map((row, rowIndex) => (
                      <div key={row.id} className="space-y-4 border border-slate-200 rounded-xl p-4 bg-white relative group/row">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3 pr-8">
                          <div className="bg-blue-100 text-blue-700 font-bold text-xs px-2 py-1 rounded">Baris {rowIndex + 1}</div>
                          <input 
                            value={row.title}
                            onChange={(e) => updateRowTitle(row.id, e.target.value)}
                            className="flex-1 font-bold text-sm focus:outline-none border-b border-transparent focus:border-blue-500 bg-transparent"
                            placeholder="Judul Baris (opsional)"
                          />
                        </div>
                        
                        <button 
                          onClick={() => removeRow(row.id)}
                          disabled={catalog.rows.length <= 1}
                          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors opacity-0 group-hover/row:opacity-100"
                          title={catalog.rows.length <= 1 ? "Minimal 1 baris" : "Hapus baris"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="space-y-4">
                          {row.items.map((item) => (
                            <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 group relative">
                              <button 
                                onClick={() => removeItemFromRow(row.id, item.id)}
                                disabled={row.items.length <= 2}
                                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                                title={row.items.length <= 2 ? "Minimal 2 produk per baris" : "Hapus produk"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              
                              <div className="flex gap-4">
                                <div className="relative w-16 h-16 bg-white rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
                                  <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                  <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                    <Upload className="w-4 h-4 text-white" />
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(row.id, item.id, e)} />
                                  </label>
                                </div>
                                <div className="flex-1 space-y-1">
                                  <input 
                                    value={item.brand}
                                    onChange={(e) => updateItem(row.id, item.id, { brand: e.target.value })}
                                    className="w-full bg-transparent font-black text-blue-600 text-xs uppercase focus:outline-none border-b border-transparent focus:border-blue-500"
                                    placeholder="Brand"
                                  />
                                  <input 
                                    value={item.name}
                                    onChange={(e) => updateItem(row.id, item.id, { name: e.target.value })}
                                    className="w-full bg-transparent font-bold text-sm focus:outline-none border-b border-transparent focus:border-blue-500"
                                    placeholder="Nama Produk"
                                  />
                                  <input 
                                    value={item.description}
                                    onChange={(e) => updateItem(row.id, item.id, { description: e.target.value })}
                                    className="w-full bg-transparent text-xs text-slate-500 focus:outline-none border-b border-transparent focus:border-blue-500"
                                    placeholder="Deskripsi"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-bold text-slate-400">Asli</label>
                                  <input 
                                    type="number"
                                    value={item.originalPrice}
                                    onChange={(e) => updateItem(row.id, item.id, { originalPrice: Number(e.target.value) })}
                                    disabled={item.isBuyXGetY}
                                    className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-mono disabled:opacity-50 disabled:bg-slate-100"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-bold text-slate-400">Promo</label>
                                  <input 
                                    type="number"
                                    value={item.discountedPrice}
                                    onChange={(e) => updateItem(row.id, item.id, { discountedPrice: Number(e.target.value) })}
                                    disabled={item.isBuyXGetY}
                                    className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-blue-600 disabled:opacity-50 disabled:bg-slate-100"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-bold text-slate-400">Unit</label>
                                  <input 
                                    value={item.unit}
                                    onChange={(e) => updateItem(row.id, item.id, { unit: e.target.value })}
                                    className="w-full p-2 bg-white border border-slate-200 rounded text-xs"
                                    placeholder="Pck"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-bold text-slate-400">Disc</label>
                                  <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-center">
                                    {item.discountPercentage || 0}%
                                  </div>
                                </div>
                              </div>
                              
                              <div className="pt-2 border-t border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                  <input 
                                    type="checkbox" 
                                    checked={item.isBuyXGetY || false}
                                    onChange={(e) => updateItem(row.id, item.id, { isBuyXGetY: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs font-bold text-slate-700">Promo Beli X Gratis Y</span>
                                </label>
                                
                                {item.isBuyXGetY && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 flex items-center gap-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                                      <span className="text-xs font-bold text-yellow-800">Beli</span>
                                      <input 
                                        type="number"
                                        min="1"
                                        value={item.buyQuantity || 2}
                                        onChange={(e) => updateItem(row.id, item.id, { buyQuantity: Number(e.target.value) })}
                                        className="w-12 p-1 text-center border border-yellow-300 rounded text-xs font-bold"
                                      />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 bg-red-50 p-2 rounded border border-red-200">
                                      <span className="text-xs font-bold text-red-800">Gratis</span>
                                      <input 
                                        type="number"
                                        min="1"
                                        value={item.getQuantity || 1}
                                        onChange={(e) => updateItem(row.id, item.id, { getQuantity: Number(e.target.value) })}
                                        className="w-12 p-1 text-center border border-red-300 rounded text-xs font-bold"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {row.items.length < 4 && (
                            <button 
                              onClick={() => addItemToRow(row.id)}
                              className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all flex items-center justify-center gap-2 font-medium text-sm"
                            >
                              <Plus className="w-4 h-4" />
                              Tambah Produk ke Baris {rowIndex + 1}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {catalog.rows.length < (catalog.showHeadBanner ? 3 : 4) && (
                      <button 
                        onClick={addRow}
                        className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-bold"
                      >
                        <Plus className="w-5 h-5" />
                        Tambah Baris Baru
                      </button>
                    )}
                    
                    {catalog.rows.length >= (catalog.showHeadBanner ? 3 : 4) && (
                      <div className="text-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                        Maksimal {catalog.showHeadBanner ? 3 : 4} baris produk telah tercapai.
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'campaign' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <h2 className="text-lg font-bold mb-4">Informasi Kampanye</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Nama Brand</label>
                          <input 
                            value={catalog.brandName}
                            onChange={(e) => setCatalog(prev => ({ ...prev, brandName: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Periode Promo</label>
                          <input 
                            value={catalog.period}
                            onChange={(e) => setCatalog(prev => ({ ...prev, period: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Judul Promo (Besar)</label>
                        <input 
                          value={catalog.promoTitle}
                          onChange={(e) => setCatalog(prev => ({ ...prev, promoTitle: e.target.value }))}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Tagline (Kanan)</label>
                        <input 
                          value={catalog.tagline}
                          onChange={(e) => setCatalog(prev => ({ ...prev, tagline: e.target.value }))}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700">Pengaturan Gratis Ongkir</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">Judul Atas</label>
                            <input 
                              value={catalog.shippingTitle}
                              onChange={(e) => setCatalog(prev => ({ ...prev, shippingTitle: e.target.value }))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">Nilai Tengah (Besar)</label>
                            <input 
                              value={catalog.shippingValue}
                              onChange={(e) => setCatalog(prev => ({ ...prev, shippingValue: e.target.value }))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">Unit Tengah (Biru)</label>
                            <input 
                              value={catalog.shippingUnit}
                              onChange={(e) => setCatalog(prev => ({ ...prev, shippingUnit: e.target.value }))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">Subjudul Bawah</label>
                            <input 
                              value={catalog.shippingSubtitle}
                              onChange={(e) => setCatalog(prev => ({ ...prev, shippingSubtitle: e.target.value }))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700">Pengaturan Head Banner</h3>
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={catalog.showHeadBanner}
                            onChange={(e) => setCatalog(prev => ({ ...prev, showHeadBanner: e.target.checked }))}
                            className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-slate-700">Tampilkan Head Banner</span>
                        </label>
                        
                        {catalog.showHeadBanner && (
                          <div className="space-y-4 pl-8">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500">Gambar Banner</label>
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setCatalog(prev => ({ ...prev, headBannerImage: reader.result as string }));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              {catalog.headBannerImage && catalog.headBannerImage.startsWith('data:') && (
                                <p className="text-xs text-green-600 mt-1">Gambar berhasil diunggah</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500">Judul Banner</label>
                              <input 
                                value={catalog.headBannerTitle || ''}
                                onChange={(e) => setCatalog(prev => ({ ...prev, headBannerTitle: e.target.value }))}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500">Subjudul Banner</label>
                              <input 
                                value={catalog.headBannerSubtitle || ''}
                                onChange={(e) => setCatalog(prev => ({ ...prev, headBannerSubtitle: e.target.value }))}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'template' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <h2 className="text-lg font-bold mb-4">Pilih Tema Warna</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'indomaret-style', name: 'Biru Retail', desc: 'Modern', colors: ['bg-blue-600', 'bg-yellow-400', 'bg-red-500'] },
                        { id: 'modern-dark', name: 'Merah Promo', desc: 'Classic', colors: ['bg-red-600', 'bg-yellow-400', 'bg-green-500'] },
                        { id: 'eco-organic', name: 'Hijau Segar', desc: 'Minimal', colors: ['bg-green-600', 'bg-orange-500'] },
                        { id: 'vibrant-yellow', name: 'Oranye Sale', desc: 'Modern', colors: ['bg-orange-500', 'bg-blue-600'] },
                        { id: 'floral-spring', name: 'Pastel Pink', desc: 'Soft', colors: ['bg-pink-300', 'bg-rose-400'] },
                        { id: 'floral-tropical', name: 'Emerald Green', desc: 'Vibrant', colors: ['bg-emerald-400', 'bg-teal-600'] },
                        { id: 'floral-vintage', name: 'Vintage Amber', desc: 'Elegant', colors: ['bg-amber-200', 'bg-orange-800'] }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setCatalog(prev => ({ ...prev, templateId: t.id }))}
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all text-left relative group",
                            catalog.templateId === t.id ? "border-blue-500 bg-blue-50/30" : "border-slate-100 hover:border-slate-200 bg-white"
                          )}
                        >
                          {catalog.templateId === t.id && (
                            <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-blue-500" />
                          )}
                          <div className="flex gap-2 mb-3">
                            {t.colors.map((c, i) => (
                              <div key={i} className={cn("w-6 h-6 rounded-md", c)} />
                            ))}
                          </div>
                          <p className="text-sm font-bold text-slate-800">{t.name}</p>
                          <p className="text-xs text-slate-500">{t.desc}</p>
                        </button>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                      <h2 className="text-lg font-bold mb-4">Pilih Pola Latar (Pattern)</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {PATTERNS.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setCatalog(prev => ({ ...prev, patternId: p.id }))}
                            className={cn(
                              "p-3 rounded-xl border-2 transition-all text-center relative group h-24 flex flex-col items-center justify-center gap-2",
                              catalog.patternId === p.id ? "border-blue-500 bg-blue-50/30" : "border-slate-100 hover:border-slate-200 bg-white"
                            )}
                          >
                            {catalog.patternId === p.id && (
                              <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-blue-500" />
                            )}
                            <div 
                              className="w-full h-10 rounded bg-slate-100 border border-slate-200"
                              style={{ backgroundImage: p.url ? `url("${p.url}")` : 'none' }}
                            />
                            <p className="text-[10px] font-bold text-slate-800 leading-tight">{p.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="sticky top-8 space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Preview Katalog</h2>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-start justify-center min-h-[600px] overflow-auto max-h-[85vh]">
              {catalog.rows.some(row => row.items.length > 0) ? (
                <div 
                  ref={previewRef}
                  className={cn(
                    "catalog-container relative",
                    catalog.templateId === 'modern-dark' && "bg-slate-900 text-white",
                    catalog.templateId === 'vibrant-yellow' && "bg-yellow-50",
                    catalog.templateId === 'eco-organic' && "bg-[#fdfcf0] text-emerald-900 font-serif",
                    catalog.templateId === 'brutalist-retro' && "bg-white text-black font-mono",
                    catalog.templateId === 'floral-spring' && "bg-pink-50 text-rose-900",
                    catalog.templateId === 'floral-tropical' && "bg-emerald-50 text-emerald-950",
                    catalog.templateId === 'floral-vintage' && "bg-amber-50 text-amber-950 font-serif"
                  )}
                  style={{
                    backgroundImage: catalog.patternId && catalog.patternId !== 'none' 
                      ? `url("${PATTERNS.find(p => p.id === catalog.patternId)?.url}")` 
                      : undefined,
                  }}
                  id="catalog-preview"
                >
                {/* New Banner Header */}
                <div className={cn(
                  "relative border-b-4 transition-colors duration-300",
                  catalog.templateId === 'indomaret-style' && "border-indomaret-yellow bg-white",
                  catalog.templateId === 'modern-dark' && "border-slate-700 bg-slate-900 text-white",
                  catalog.templateId === 'vibrant-yellow' && "border-yellow-400 bg-yellow-100",
                  catalog.templateId === 'eco-organic' && "border-emerald-200 bg-[#fdfcf0]",
                  catalog.templateId === 'brutalist-retro' && "border-black bg-white",
                  catalog.templateId === 'floral-spring' && "border-pink-300 bg-white/80 backdrop-blur-sm",
                  catalog.templateId === 'floral-tropical' && "border-emerald-400 bg-white/90 backdrop-blur-sm",
                  catalog.templateId === 'floral-vintage' && "border-amber-300 bg-[#fffbf0]/90 backdrop-blur-sm"
                )}>
                  <div className="p-4 flex items-center justify-between gap-4">
                    {/* Left: Brand */}
                    <div className="flex items-center gap-2">
                       <div className={cn(
                         "font-black italic text-3xl tracking-tighter leading-none",
                         catalog.templateId === 'indomaret-style' ? "text-indomaret-blue" : 
                         catalog.templateId === 'floral-spring' ? "text-pink-600" :
                         catalog.templateId === 'floral-tropical' ? "text-emerald-700" :
                         catalog.templateId === 'floral-vintage' ? "text-amber-800" : "text-current"
                       )}>
                         {catalog.brandName}
                       </div>
                    </div>

                    {/* Middle: Promo Title with Arrow */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center transform -rotate-12 shadow-sm",
                          catalog.templateId === 'indomaret-style' ? "bg-indomaret-red" : 
                          catalog.templateId === 'floral-spring' ? "bg-pink-500" :
                          catalog.templateId === 'floral-tropical' ? "bg-emerald-600" :
                          catalog.templateId === 'floral-vintage' ? "bg-amber-700" : "bg-current opacity-90"
                        )}>
                           <ArrowDown className={cn(
                             "w-8 h-8",
                             catalog.templateId === 'indomaret-style' ? "text-white" : "text-white"
                           )} strokeWidth={3} />
                           <span className="absolute bottom-1 right-1 text-white text-[10px] font-black">%</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className={cn(
                          "font-black text-xl leading-none uppercase italic tracking-tighter -mb-1",
                          catalog.templateId === 'indomaret-style' ? "text-indomaret-red" : 
                          catalog.templateId === 'floral-spring' ? "text-pink-600" :
                          catalog.templateId === 'floral-tropical' ? "text-emerald-700" :
                          catalog.templateId === 'floral-vintage' ? "text-amber-800" : "text-current"
                        )}>{catalog.promoTitle.split(' ')[0]}</div>
                        <div className={cn(
                          "font-black text-xl leading-none uppercase italic tracking-tighter",
                          catalog.templateId === 'indomaret-style' ? "text-indomaret-yellow" : 
                          catalog.templateId === 'floral-spring' ? "text-rose-500" :
                          catalog.templateId === 'floral-tropical' ? "text-teal-600" :
                          catalog.templateId === 'floral-vintage' ? "text-orange-700" : "text-current opacity-80"
                        )}>{catalog.promoTitle.split(' ').slice(1).join(' ')}</div>
                      </div>
                    </div>

                    {/* Middle-Right: Shipping Info */}
                    <div className="flex items-center gap-2">
                       <div className="flex flex-col items-end">
                          <div className={cn(
                            "font-black text-[10px] leading-none uppercase tracking-tighter",
                            catalog.templateId === 'indomaret-style' ? "text-indomaret-blue" : 
                            catalog.templateId === 'floral-spring' ? "text-pink-500" :
                            catalog.templateId === 'floral-tropical' ? "text-emerald-600" :
                            catalog.templateId === 'floral-vintage' ? "text-amber-700" : "text-current opacity-70"
                          )}>
                            {catalog.shippingTitle}
                          </div>
                          <div className="flex items-center gap-1 leading-none">
                            <span className={cn(
                              "font-black tracking-tighter leading-none",
                              catalog.shippingValue.length > 2 ? "text-xl" : "text-2xl",
                              catalog.templateId === 'indomaret-style' ? "text-indomaret-red" : 
                              catalog.templateId === 'floral-spring' ? "text-rose-500" :
                              catalog.templateId === 'floral-tropical' ? "text-teal-600" :
                              catalog.templateId === 'floral-vintage' ? "text-orange-700" : "text-current"
                            )}>{catalog.shippingValue}</span>
                            <div className="flex flex-col leading-none">
                              <span className={cn(
                                "font-black tracking-tighter",
                                catalog.shippingUnit.length > 3 ? "text-xs" : "text-sm",
                                catalog.templateId === 'indomaret-style' ? "text-indomaret-blue" : 
                                catalog.templateId === 'floral-spring' ? "text-pink-600" :
                                catalog.templateId === 'floral-tropical' ? "text-emerald-700" :
                                catalog.templateId === 'floral-vintage' ? "text-amber-800" : "text-current"
                              )}>{catalog.shippingUnit}</span>
                              <span className={cn(
                                "font-black text-[10px] tracking-tighter",
                                catalog.templateId === 'indomaret-style' ? "text-indomaret-blue" : 
                                catalog.templateId === 'floral-spring' ? "text-pink-500" :
                                catalog.templateId === 'floral-tropical' ? "text-emerald-600" :
                                catalog.templateId === 'floral-vintage' ? "text-amber-700" : "text-current opacity-80"
                              )}>{catalog.shippingSubtitle}</span>
                            </div>
                          </div>
                       </div>
                       <div className="relative">
                          <Bike className={cn(
                            "w-10 h-10",
                            catalog.templateId === 'indomaret-style' ? "text-indomaret-blue" : 
                            catalog.templateId === 'floral-spring' ? "text-pink-600" :
                            catalog.templateId === 'floral-tropical' ? "text-emerald-700" :
                            catalog.templateId === 'floral-vintage' ? "text-amber-800" : "text-current"
                          )} strokeWidth={2.5} />
                       </div>
                    </div>

                    {/* Separator */}
                    <div className={cn(
                      "w-px h-12",
                      catalog.templateId === 'modern-dark' ? "bg-slate-700" : "bg-slate-200"
                    )} />

                    {/* Right: Brand + Tagline */}
                    <div className="flex flex-col items-start">
                       <div className="flex items-center gap-1">
                          <span className={cn(
                            "font-black italic text-xl tracking-tighter",
                            catalog.templateId === 'indomaret-style' ? "text-indomaret-blue" : 
                            catalog.templateId === 'floral-spring' ? "text-pink-600" :
                            catalog.templateId === 'floral-tropical' ? "text-emerald-700" :
                            catalog.templateId === 'floral-vintage' ? "text-amber-800" : "text-current"
                          )}>{catalog.brandName}</span>
                          <div className="flex flex-col">
                             <div className="flex gap-0.5">
                                <div className="w-3 h-1 bg-indomaret-red" />
                                <div className="w-3 h-1 bg-indomaret-blue" />
                                <div className="w-3 h-1 bg-indomaret-yellow" />
                             </div>
                             <span className={cn(
                               "text-[8px] font-black italic leading-none",
                               catalog.templateId === 'indomaret-style' ? "text-indomaret-blue" : 
                               catalog.templateId === 'floral-spring' ? "text-pink-500" :
                               catalog.templateId === 'floral-tropical' ? "text-emerald-600" :
                               catalog.templateId === 'floral-vintage' ? "text-amber-700" : "text-current opacity-60"
                             )}>Indomaret</span>
                          </div>
                       </div>
                       <div className={cn(
                         "text-[8px] font-black italic leading-none mt-1",
                         catalog.templateId === 'indomaret-style' ? "text-indomaret-blue" : 
                         catalog.templateId === 'floral-spring' ? "text-pink-400" :
                         catalog.templateId === 'floral-tropical' ? "text-emerald-500" :
                         catalog.templateId === 'floral-vintage' ? "text-amber-600" : "text-current opacity-70"
                       )}>{catalog.tagline}</div>
                    </div>
                  </div>

                  {/* Period Badge */}
                  <div className={cn(
                    "absolute -bottom-3 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2 shadow-lg z-20 border",
                    catalog.templateId === 'indomaret-style' && "bg-slate-700 text-white border-slate-600",
                    catalog.templateId === 'modern-dark' && "bg-blue-600 text-white border-blue-500",
                    catalog.templateId === 'vibrant-yellow' && "bg-red-600 text-white border-red-500",
                    catalog.templateId === 'eco-organic' && "bg-emerald-700 text-white border-emerald-600",
                    catalog.templateId === 'brutalist-retro' && "bg-black text-white border-white",
                    catalog.templateId === 'floral-spring' && "bg-pink-500 text-white border-pink-400",
                    catalog.templateId === 'floral-tropical' && "bg-emerald-600 text-white border-emerald-500",
                    catalog.templateId === 'floral-vintage' && "bg-amber-700 text-white border-amber-600"
                  )}>
                    <span className="opacity-70 uppercase tracking-widest text-[8px]">Periode</span>
                    <div className="w-px h-3 bg-white/30" />
                    <span>{catalog.period}</span>
                  </div>
                </div>

                {/* Head Banner Section */}
                {catalog.showHeadBanner && (
                  <div className="w-full h-36 relative overflow-hidden mt-6 mb-0 shadow-sm border-y-4 border-yellow-400">
                    <img 
                      src={catalog.headBannerImage || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop'} 
                      alt="Campaign Banner" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex items-center">
                       <div className="p-6 md:p-8 text-white max-w-lg">
                         {catalog.headBannerTitle && (
                           <h2 className="text-2xl md:text-3xl font-black italic mb-1 text-yellow-400 drop-shadow-md leading-tight">
                             {catalog.headBannerTitle}
                           </h2>
                         )}
                         {catalog.headBannerSubtitle && (
                           <p className="text-xs md:text-sm font-medium drop-shadow-md text-slate-100 line-clamp-2">
                             {catalog.headBannerSubtitle}
                           </p>
                         )}
                       </div>
                    </div>
                  </div>
                )}

                {/* Grid Section */}
                <div className={cn(
                  "p-2 flex flex-col gap-4",
                  catalog.showHeadBanner ? "pt-4" : "pt-8",
                  catalog.templateId === 'brutalist-retro' && "gap-0 p-0"
                )}>
                  {(catalog.showHeadBanner ? catalog.rows.slice(0, 3) : catalog.rows.slice(0, 4)).map((row, rowIndex) => (
                    <div key={row.id} className="w-full">
                      {row.title && (
                        <div className="w-full mb-2 flex items-center">
                          <div className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-r-full shadow-sm uppercase tracking-wider">
                            {row.title}
                          </div>
                          <div className="flex-1 h-px bg-blue-100 ml-2"></div>
                        </div>
                      )}
                      <div className={cn(
                        "grid gap-2",
                        row.items.length === 2 ? "grid-cols-2" :
                        row.items.length === 3 ? "grid-cols-3" :
                        "grid-cols-4",
                        catalog.templateId === 'brutalist-retro' && "gap-0"
                      )}>
                        {row.items.map((item) => (
                          <div key={item.id} className={cn(
                            "p-2 rounded-lg border flex flex-col items-start text-left relative overflow-hidden h-full",
                            row.items.length === 2 ? "min-h-[240px]" :
                            row.items.length === 3 ? "min-h-[210px]" :
                            "min-h-[180px]",
                            catalog.templateId === 'modern-dark' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100",
                            catalog.templateId === 'eco-organic' && "bg-white border-emerald-100 rounded-xl shadow-sm",
                            catalog.templateId === 'brutalist-retro' && "bg-white border-black border-2 rounded-none m-[-1px]",
                            catalog.templateId === 'floral-spring' && "bg-white/90 border-pink-200 shadow-sm backdrop-blur-sm",
                            catalog.templateId === 'floral-tropical' && "bg-white/90 border-emerald-200 shadow-sm backdrop-blur-sm",
                            catalog.templateId === 'floral-vintage' && "bg-[#fffbf0]/90 border-amber-200 shadow-sm backdrop-blur-sm"
                          )}>
                            {/* Product Info at Top */}
                            <div className="w-full mb-1 h-10 overflow-hidden relative z-10">
                              <h3 className={cn(
                                "text-[9px] font-black leading-none uppercase text-slate-900 truncate",
                                catalog.templateId === 'modern-dark' && "text-white"
                              )} title={item.brand}>{item.brand}</h3>
                              <div className={cn(
                                "text-[8px] font-bold leading-tight text-slate-800 line-clamp-1",
                                catalog.templateId === 'modern-dark' && "text-slate-200"
                              )} title={item.name}>{item.name}</div>
                              <p className={cn(
                                "text-[6px] italic leading-tight text-slate-600 line-clamp-1 mt-0.5",
                                catalog.templateId === 'modern-dark' && "text-slate-400"
                              )} title={item.description}>{item.description}</p>
                            </div>
                            
                            {/* Product Image Area - Positioned behind text */}
                            <div className="absolute inset-0 z-0 flex items-center justify-center p-2 pt-12 pb-4">
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-full h-full object-contain" 
                                crossOrigin="anonymous"
                                referrerPolicy="no-referrer"
                              />
                              
                              {item.discountPercentage && !item.isBuyXGetY && (
                                <div className={cn(
                                  "absolute top-10 right-2 bg-red-600 text-white rounded-full flex flex-col items-center justify-center shadow-sm z-10 leading-none",
                                  row.items.length === 4 ? "w-8 h-8" : row.items.length === 3 ? "w-9 h-9" : "w-10 h-10",
                                  catalog.templateId === 'eco-organic' && "bg-emerald-600",
                                  catalog.templateId === 'brutalist-retro' && "bg-black rounded-none",
                                  catalog.templateId === 'floral-spring' && "bg-rose-500",
                                  catalog.templateId === 'floral-tropical' && "bg-teal-600",
                                  catalog.templateId === 'floral-vintage' && "bg-orange-700"
                                )}>
                                  <span className={cn(
                                    "font-bold uppercase tracking-tighter",
                                    row.items.length === 4 ? "text-[4.5px]" : row.items.length === 3 ? "text-[5.5px]" : "text-[6.5px]"
                                  )}>Hemat</span>
                                  <span className={cn(
                                    "font-black",
                                    row.items.length === 4 ? "text-[9px]" : row.items.length === 3 ? "text-[10px]" : "text-[11px]"
                                  )}>{item.discountPercentage}%</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Skewed Price Tag at Bottom - Absolute Positioned to overlap image */}
                            <div className="absolute bottom-0 left-0 flex flex-col items-start z-20 p-1">
                              {item.isBuyXGetY ? (
                                <>
                                  {/* Buy X Tag (Yellow) */}
                                  <div className={cn(
                                    "bg-[#ffcc00] transform -skew-x-[15deg] origin-bottom-left rounded-t-sm shadow-sm inline-flex items-center justify-center gap-1 relative z-0 translate-y-[2px] ml-1",
                                    row.items.length === 4 ? "px-2.5 py-0.5 min-w-[65px]" : row.items.length === 3 ? "px-4 py-0.5 min-w-[70px]" : "px-5 py-1 min-w-[80px]",
                                    catalog.templateId === 'modern-dark' && "bg-slate-600",
                                    catalog.templateId === 'eco-organic' && "bg-emerald-100",
                                    catalog.templateId === 'floral-spring' && "bg-pink-100",
                                    catalog.templateId === 'floral-tropical' && "bg-emerald-100",
                                    catalog.templateId === 'floral-vintage' && "bg-amber-100"
                                  )}>
                                    <span className={cn(
                                      "font-black text-slate-800 skew-x-[15deg] uppercase leading-none whitespace-nowrap",
                                      row.items.length === 4 ? "text-[10px]" : row.items.length === 3 ? "text-[11px]" : "text-[12px]"
                                    )}>
                                      Beli {item.buyQuantity || 2}
                                    </span>
                                  </div>

                                  {/* Get Y Tag (Red) */}
                                  <div className={cn(
                                    "bg-[#ed1c24] transform -skew-x-[15deg] origin-top-left rounded-sm shadow-md inline-flex items-center justify-center gap-0.5 relative z-10",
                                    row.items.length === 4 ? "px-3.5 py-1 min-w-[95px]" : row.items.length === 3 ? "px-5 py-1.5 min-w-[100px]" : "px-6 py-2 min-w-[110px]",
                                    catalog.templateId === 'eco-organic' && "bg-emerald-600",
                                    catalog.templateId === 'brutalist-retro' && "bg-black rounded-none",
                                    catalog.templateId === 'floral-spring' && "bg-rose-500",
                                    catalog.templateId === 'floral-tropical' && "bg-teal-600",
                                    catalog.templateId === 'floral-vintage' && "bg-orange-700"
                                  )}>
                                    <span className={cn(
                                      "font-black text-white skew-x-[15deg] uppercase tracking-tighter leading-none whitespace-nowrap",
                                      row.items.length === 4 ? "text-[13px]" : row.items.length === 3 ? "text-[14px]" : "text-[16px]"
                                    )}>
                                      Gratis {item.getQuantity || 1}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Original Price Tag (Yellow) - Stuck to the red one */}
                                  <div className={cn(
                                    "bg-[#ffcc00] px-3 py-0.5 transform -skew-x-[15deg] origin-bottom-left rounded-t-sm shadow-sm inline-flex items-center gap-1 relative z-0 translate-y-[2px] ml-1 min-w-[60px]",
                                    catalog.templateId === 'modern-dark' && "bg-slate-600",
                                    catalog.templateId === 'eco-organic' && "bg-emerald-100",
                                    catalog.templateId === 'floral-spring' && "bg-pink-100",
                                    catalog.templateId === 'floral-tropical' && "bg-emerald-100",
                                    catalog.templateId === 'floral-vintage' && "bg-amber-100"
                                  )}>
                                    <span className="text-[7px] font-bold text-slate-800 line-through decoration-slate-800/50 skew-x-[15deg]">
                                      {item.originalPrice.toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-[6px] font-black text-slate-800 skew-x-[15deg]">
                                      /{item.unit}
                                    </span>
                                  </div>

                                  {/* Discounted Price Tag (Red) - Larger font and compact */}
                                  <div className={cn(
                                    "bg-[#ed1c24] px-4 py-1 transform -skew-x-[15deg] origin-top-left rounded-sm shadow-md inline-flex items-center gap-0.5 relative z-10 min-w-[90px]",
                                    catalog.templateId === 'eco-organic' && "bg-emerald-600",
                                    catalog.templateId === 'brutalist-retro' && "bg-black rounded-none",
                                    catalog.templateId === 'floral-spring' && "bg-rose-500",
                                    catalog.templateId === 'floral-tropical' && "bg-teal-600",
                                    catalog.templateId === 'floral-vintage' && "bg-orange-700"
                                  )}>
                                    <span className="text-[7px] font-black text-white skew-x-[15deg] uppercase">Rp</span>
                                    <span className="text-[15px] font-black text-white skew-x-[15deg] tracking-tighter leading-none">
                                      {item.discountedPrice.toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-[7px] font-black text-white skew-x-[15deg] opacity-90">
                                      /{item.unit}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className={cn(
                  "mt-auto p-4 flex justify-between items-center border-t",
                  catalog.templateId === 'indomaret-style' ? "bg-indomaret-blue text-white border-indomaret-yellow" : "bg-slate-100 text-slate-500 border-slate-200",
                  catalog.templateId === 'eco-organic' && "bg-emerald-900 text-emerald-50 border-none",
                  catalog.templateId === 'brutalist-retro' && "bg-black text-white border-none"
                )}>
                  <div className="text-[8px] font-medium">
                    <p>Layanan Konsumen: kontak@promogen.co.id</p>
                    <p>WhatsApp: 0811 1500 280</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white p-1 rounded">
                      <div className="w-full h-full bg-slate-800" /> {/* Placeholder QR */}
                    </div>
                    <div className="text-[8px] font-black leading-none uppercase">
                      Scan<br/>Disini
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200">
                  <Plus className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium">Tambahkan produk untuk preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
    </div>
  );
}
