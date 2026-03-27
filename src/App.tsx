import React, { useState, useRef, useCallback } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import { 
  Plus, Trash2, Download, Upload, Package, FileText,
  Palette, CheckCircle2, Bike, ArrowDown,
  BookOpen, Megaphone, LayoutDashboard, Home, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { CatalogData, CatalogItem, CatalogRow, DEFAULT_CATALOG, DEFAULT_ITEMS } from './types';
import Dashboard from './pages/Dashboard';
import Promotions from './pages/Promotions';
import Login from './pages/Login';

type Page = 'dashboard' | 'catalogue' | 'promotions';

const PATTERNS = [
  { id: 'none', name: 'Polos', url: '' },
  { id: 'flowers', name: 'Bunga Sakura', url: 'https://www.transparenttextures.com/patterns/flowers.png' },
  { id: 'woven', name: 'Kain Linen', url: 'https://www.transparenttextures.com/patterns/woven.png' },
  { id: 'paper', name: 'Tekstur Kertas', url: 'https://www.transparenttextures.com/patterns/cream-paper.png' },
  { id: 'dots', name: 'Titik Halus', url: 'https://www.transparenttextures.com/patterns/stardust.png' },
  { id: 'wall', name: 'Dinding Putih', url: 'https://www.transparenttextures.com/patterns/white-wall.png' },
  { id: 'arabesque', name: 'Arabesque', url: 'https://www.transparenttextures.com/patterns/arabesque.png' },
  { id: 'grid', name: 'Kotak Grid', url: 'https://www.transparenttextures.com/patterns/graphy.png' }
];

function CatalogueEditor() {
  const [catalog, setCatalog] = useState<CatalogData>(DEFAULT_CATALOG);
  const [activeTab, setActiveTab] = useState<'items' | 'campaign' | 'template'>('template');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback((format: 'jpg' | 'png') => {
    if (previewRef.current === null) return;
    const el = previewRef.current;
    setTimeout(() => {
      const options = {
        quality: 0.95, cacheBust: true, pixelRatio: 3,
        width: el.scrollWidth, height: el.scrollHeight,
        backgroundColor: '#ffffff',
        style: { transform: 'scale(1)', margin: '0', padding: '0' }
      };
      const fn = format === 'jpg' ? toJpeg : toPng;
      fn(el, options).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `katalog-promosi-${Date.now()}.${format}`;
        link.href = dataUrl;
        link.click();
      }).catch(console.error);
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
                if (updates.originalPrice !== undefined || updates.discountedPrice !== undefined) {
                  if (newItem.originalPrice > 0 && newItem.discountedPrice > 0 && newItem.originalPrice > newItem.discountedPrice) {
                    const pct = Math.round(((newItem.originalPrice - newItem.discountedPrice) / newItem.originalPrice) * 100);
                    newItem.discountPercentage = pct > 0 ? pct : undefined;
                  } else { newItem.discountPercentage = undefined; }
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
      brand: 'BRAND', name: 'Produk Baru', description: 'Deskripsi produk',
      originalPrice: 0, discountedPrice: 0,
      image: 'https://picsum.photos/seed/' + Math.random() + '/200/200', unit: 'Pcs'
    };
    setCatalog(prev => ({
      ...prev,
      rows: prev.rows.map(row =>
        row.id === rowId && row.items.length < 4 ? { ...row, items: [...row.items, newItem] } : row
      )
    }));
  };

  const removeItemFromRow = (rowId: string, itemId: string) => {
    setCatalog(prev => ({
      ...prev,
      rows: prev.rows.map(row =>
        row.id === rowId && row.items.length > 2 ? { ...row, items: row.items.filter(i => i.id !== itemId) } : row
      )
    }));
  };

  const updateRowTitle = (rowId: string, title: string) => {
    setCatalog(prev => ({ ...prev, rows: prev.rows.map(r => r.id === rowId ? { ...r, title } : r) }));
  };

  const addRow = () => {
    setCatalog(prev => {
      const newRow: CatalogRow = {
        id: `row-${Date.now()}`,
        title: `Baris ${prev.rows.length + 1}`,
        items: [DEFAULT_ITEMS[0], DEFAULT_ITEMS[1]]
      };
      return { ...prev, rows: [...prev.rows, newRow] };
    });
  };

  const removeRow = (rowId: string) => {
    setCatalog(prev => ({ ...prev, rows: prev.rows.filter(r => r.id !== rowId) }));
  };

  const handleImageUpload = (rowId: string, itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateItem(rowId, itemId, { image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Catalogue Header */}
      <div className="px-8 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Catalogue Generator</h1>
          <p className="text-sm text-slate-500 mt-0.5">Buat katalog promosi profesional dengan mudah</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleExport('jpg')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm text-sm">
            <Download className="w-4 h-4" /> Ekspor JPG
          </button>
          <button onClick={() => handleExport('png')} className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm text-sm">
            <Download className="w-4 h-4" /> Ekspor PNG
          </button>
        </div>
      </div>

      <div className="flex-1 px-8 pb-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Editor */}
        <div className="lg:col-span-5 space-y-4">
          {/* Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            {(['items', 'campaign', 'template'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all",
                  activeTab === tab ? "bg-white shadow-sm text-slate-800 ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"
                )}>
                {tab === 'items' && <><Package className="w-3.5 h-3.5" /> Produk</>}
                {tab === 'campaign' && <><FileText className="w-3.5 h-3.5" /> Kampanye</>}
                {tab === 'template' && <><Palette className="w-3.5 h-3.5" /> Template</>}
              </button>
            ))}
          </div>

          {/* Editor Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[500px] flex flex-col overflow-hidden">
            <div className="p-5 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === 'items' && (
                  <motion.div key="items" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    <h2 className="text-base font-bold">Daftar Produk per Baris</h2>
                    {(catalog.showHeadBanner ? catalog.rows.slice(0, 3) : catalog.rows.slice(0, 4)).map((row, rowIndex) => (
                      <div key={row.id} className="space-y-3 border border-slate-200 rounded-xl p-4 bg-white relative group/row">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-3 pr-8">
                          <div className="bg-blue-100 text-blue-700 font-bold text-xs px-2 py-0.5 rounded">Baris {rowIndex + 1}</div>
                          <input value={row.title} onChange={e => updateRowTitle(row.id, e.target.value)}
                            className="flex-1 font-bold text-sm focus:outline-none border-b border-transparent focus:border-blue-500 bg-transparent" placeholder="Judul Baris" />
                        </div>
                        <button onClick={() => removeRow(row.id)} disabled={catalog.rows.length <= 1}
                          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors opacity-0 group-hover/row:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="space-y-3">
                          {row.items.map(item => (
                            <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 group relative">
                              <button onClick={() => removeItemFromRow(row.id, item.id)} disabled={row.items.length <= 2}
                                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex gap-3">
                                <div className="relative w-14 h-14 bg-white rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
                                  <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                  <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                    <Upload className="w-3.5 h-3.5 text-white" />
                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(row.id, item.id, e)} />
                                  </label>
                                </div>
                                <div className="flex-1 space-y-1">
                                  <input value={item.brand} onChange={e => updateItem(row.id, item.id, { brand: e.target.value })}
                                    className="w-full bg-transparent font-black text-blue-600 text-xs uppercase focus:outline-none border-b border-transparent focus:border-blue-500" placeholder="Brand" />
                                  <input value={item.name} onChange={e => updateItem(row.id, item.id, { name: e.target.value })}
                                    className="w-full bg-transparent font-bold text-sm focus:outline-none border-b border-transparent focus:border-blue-500" placeholder="Nama Produk" />
                                  <input value={item.description} onChange={e => updateItem(row.id, item.id, { description: e.target.value })}
                                    className="w-full bg-transparent text-xs text-slate-500 focus:outline-none border-b border-transparent focus:border-blue-500" placeholder="Deskripsi" />
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: 'Asli', key: 'originalPrice', type: 'number', disabled: item.isBuyXGetY },
                                  { label: 'Promo', key: 'discountedPrice', type: 'number', disabled: item.isBuyXGetY },
                                  { label: 'Unit', key: 'unit', type: 'text', disabled: false },
                                ].map(f => (
                                  <div key={f.key} className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-400">{f.label}</label>
                                    <input type={f.type} value={(item as any)[f.key]} disabled={f.disabled}
                                      onChange={e => updateItem(row.id, item.id, { [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                                      className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono disabled:opacity-50 disabled:bg-slate-100" />
                                  </div>
                                ))}
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-bold text-slate-400">Disc</label>
                                  <div className="w-full p-1.5 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-center">{item.discountPercentage || 0}%</div>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-slate-200">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={item.isBuyXGetY || false}
                                    onChange={e => updateItem(row.id, item.id, { isBuyXGetY: e.target.checked })}
                                    className="rounded border-slate-300 text-blue-600" />
                                  <span className="text-xs font-bold text-slate-700">Promo Beli X Gratis Y</span>
                                </label>
                                {item.isBuyXGetY && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 flex items-center gap-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                                      <span className="text-xs font-bold text-yellow-800">Beli</span>
                                      <input type="number" min="1" value={item.buyQuantity || 2}
                                        onChange={e => updateItem(row.id, item.id, { buyQuantity: Number(e.target.value) })}
                                        className="w-10 p-1 text-center border border-yellow-300 rounded text-xs font-bold" />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 bg-red-50 p-2 rounded border border-red-200">
                                      <span className="text-xs font-bold text-red-800">Gratis</span>
                                      <input type="number" min="1" value={item.getQuantity || 1}
                                        onChange={e => updateItem(row.id, item.id, { getQuantity: Number(e.target.value) })}
                                        className="w-10 p-1 text-center border border-red-300 rounded text-xs font-bold" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {row.items.length < 4 && (
                            <button onClick={() => addItemToRow(row.id)}
                              className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-500 transition-all flex items-center justify-center gap-2 font-medium text-sm">
                              <Plus className="w-4 h-4" /> Tambah Produk ke Baris {rowIndex + 1}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {catalog.rows.length < (catalog.showHeadBanner ? 3 : 4) && (
                      <button onClick={addRow}
                        className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-bold">
                        <Plus className="w-5 h-5" /> Tambah Baris Baru
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
                  <motion.div key="campaign" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5 h-full overflow-y-auto pr-2 pb-10">
                    <h2 className="text-base font-bold">Informasi Header Kampanye</h2>
                    
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Periode Promo (Jangan Diubah Sesuai Permintaan)</label>
                      <input value={catalog.period} onChange={e => setCatalog(p => ({ ...p, period: e.target.value }))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Logo Header (Upload)</label>
                          <input type="file" accept="image/*" onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) { const r = new FileReader(); r.onloadend = () => setCatalog(p => ({ ...p, headerLogoImage: r.result as string })); r.readAsDataURL(f); }
                          }} className="w-full bg-white border border-slate-200 rounded-lg text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 placeholder-slate-400" />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Gaya Teks (Font Style)</label>
                          <select value={catalog.headerFontFamily} onChange={e => setCatalog(p => ({ ...p, headerFontFamily: e.target.value }))}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="font-black">Tebal / Extra Bold (Default)</option>
                            <option value="font-sans font-bold">Sans-Serif Bold</option>
                            <option value="font-serif font-black">Serif Black (Klasik)</option>
                            <option value="font-mono font-bold">Monospace Bold</option>
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <div className="space-y-2">
                          <h3 className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-1.5 rounded uppercase tracking-widest">Teks Tengah</h3>
                          <input value={catalog.headerMainText1} onChange={e => setCatalog(p => ({ ...p, headerMainText1: e.target.value }))} placeholder="PRODUK" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" />
                          <input value={catalog.headerMainText2} onChange={e => setCatalog(p => ({ ...p, headerMainText2: e.target.value }))} placeholder="DISKON" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" />
                       </div>
                       <div className="space-y-2">
                          <h3 className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-1.5 rounded uppercase tracking-widest">Angka Promo</h3>
                          <div className="flex gap-2">
                             <input value={catalog.headerBadgeText} onChange={e => setCatalog(p => ({ ...p, headerBadgeText: e.target.value }))} placeholder="s/d" className="w-1/3 p-2 bg-white border border-slate-200 rounded-lg text-xs" title="Teks Kecil Atas" />
                             <input value={catalog.headerNumber} onChange={e => setCatalog(p => ({ ...p, headerNumber: e.target.value }))} placeholder="70" className="w-1/3 p-2 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold" title="Angka Besar" />
                             <input value={catalog.headerNumberUnit} onChange={e => setCatalog(p => ({ ...p, headerNumberUnit: e.target.value }))} placeholder="%" className="w-1/3 p-2 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold" title="Unit Angka" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2 pt-2">
                       <h3 className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-1.5 rounded uppercase tracking-widest">Teks Sisi Kanan (Panggilan Aksi)</h3>
                       <div className="grid grid-cols-2 gap-4">
                          <input value={catalog.headerRightText1} onChange={e => setCatalog(p => ({ ...p, headerRightText1: e.target.value }))} placeholder="Borong" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" />
                          <input value={catalog.headerRightText2} onChange={e => setCatalog(p => ({ ...p, headerRightText2: e.target.value }))} placeholder="Sekarang!" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Warna Background (Degradasi)</label>
                          <select value={catalog.headerBgColor} onChange={e => setCatalog(p => ({ ...p, headerBgColor: e.target.value }))}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="from-[#ed1c24] to-[#f45c62]">Merah Klasik</option>
                            <option value="from-[#ffc312] to-[#ff9f43]">Emas Promo</option>
                            <option value="from-blue-500 to-blue-400">Biru Retail</option>
                            <option value="from-[#05c46b] to-[#0be881]">Hijau Segar</option>
                            <option value="from-slate-700 to-slate-800 border-b-4 border-yellow-500">Hitam Premium</option>
                          </select>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Motif Pattern (Background)</label>
                          <select value={catalog.headerPatternId} onChange={e => setCatalog(p => ({ ...p, headerPatternId: e.target.value }))}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500">
                            {PATTERNS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                       </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'template' && (
                  <motion.div key="template" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                    <h2 className="text-base font-bold">Pilih Tema Warna Box File</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'indomaret-style', name: 'Biru Retail', desc: 'Modern', colors: ['bg-blue-600', 'bg-yellow-400', 'bg-red-500'] },
                        { id: 'modern-dark', name: 'Merah Promo', desc: 'Classic', colors: ['bg-red-600', 'bg-yellow-400', 'bg-green-500'] },
                        { id: 'eco-organic', name: 'Hijau Segar', desc: 'Minimal', colors: ['bg-green-600', 'bg-orange-500'] },
                        { id: 'vibrant-yellow', name: 'Oranye Sale', desc: 'Modern', colors: ['bg-orange-500', 'bg-blue-600'] },
                        { id: 'floral-spring', name: 'Pastel Pink', desc: 'Soft', colors: ['bg-pink-300', 'bg-rose-400'] },
                        { id: 'floral-tropical', name: 'Emerald Green', desc: 'Vibrant', colors: ['bg-emerald-400', 'bg-teal-600'] },
                        { id: 'floral-vintage', name: 'Vintage Amber', desc: 'Elegant', colors: ['bg-amber-200', 'bg-orange-800'] }
                      ].map(t => (
                        <button key={t.id} onClick={() => setCatalog(p => ({ ...p, templateId: t.id }))}
                          className={cn("p-3 rounded-xl border-2 transition-all text-left relative",
                            catalog.templateId === t.id ? "border-blue-500 bg-blue-50/30" : "border-slate-100 hover:border-slate-200 bg-white")}>
                          {catalog.templateId === t.id && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-blue-500" />}
                          <div className="flex gap-1.5 mb-2">{t.colors.map((c, i) => <div key={i} className={cn("w-5 h-5 rounded-md", c)} />)}</div>
                          <p className="text-xs font-bold text-slate-800">{t.name}</p>
                          <p className="text-[10px] text-slate-500">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-slate-200">
                      <h2 className="text-base font-bold mb-3">Pola Latar (Pattern)</h2>
                      <div className="grid grid-cols-4 gap-2">
                        {PATTERNS.map(p => (
                          <button key={p.id} onClick={() => setCatalog(prev => ({ ...prev, patternId: p.id }))}
                            className={cn("p-2 rounded-xl border-2 transition-all text-center relative h-20 flex flex-col items-center justify-center gap-1",
                              catalog.patternId === p.id ? "border-blue-500 bg-blue-50/30" : "border-slate-100 hover:border-slate-200 bg-white")}>
                            {catalog.patternId === p.id && <CheckCircle2 className="absolute top-1 right-1 w-3.5 h-3.5 text-blue-500" />}
                            <div className="w-full h-8 rounded bg-slate-100 border border-slate-200"
                              style={{ backgroundImage: p.url ? `url("${p.url}")` : 'none' }} />
                            <p className="text-[9px] font-bold text-slate-800 leading-tight">{p.name}</p>
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

        {/* Right: Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="sticky top-4 space-y-4">
            <h2 className="text-base font-bold text-slate-800">Preview Katalog</h2>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-start justify-center min-h-[600px] overflow-auto max-h-[80vh]">
              {catalog.rows.some(row => row.items.length > 0) ? (
                <div ref={previewRef} id="catalog-preview"
                  className={cn("catalog-container relative flex flex-col bg-white",
                    catalog.templateId === 'modern-dark' && "bg-slate-900 text-white",
                    catalog.templateId === 'vibrant-yellow' && "bg-yellow-50",
                    catalog.templateId === 'eco-organic' && "bg-[#fdfcf0] text-emerald-900",
                    catalog.templateId === 'floral-spring' && "bg-pink-50 text-rose-900",
                    catalog.templateId === 'floral-tropical' && "bg-emerald-50 text-emerald-950",
                    catalog.templateId === 'floral-vintage' && "bg-amber-50 text-amber-950"
                  )}>

                  {/* Banner Header Editable Styled */}
                  <div className={cn("relative overflow-hidden w-full flex items-center justify-between px-6 pt-5 pb-8 shadow-sm z-10",
                     catalog.headerBgColor.includes('bg-') ? catalog.headerBgColor : `bg-gradient-to-r ${catalog.headerBgColor}`
                  )}>
                    {catalog.headerPatternId && catalog.headerPatternId !== 'none' && (
                       <div className="absolute inset-0 opacity-25 mix-blend-color-burn pointer-events-none" style={{ backgroundImage: `url("${PATTERNS.find(p => p.id === catalog.headerPatternId)?.url}")` }}></div>
                    )}
                    
                    {/* Lighting Effects */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                    <div className="absolute -right-10 -top-20 w-64 h-64 bg-yellow-400/40 blur-[50px] rounded-full pointer-events-none" />
                    <div className="absolute right-[40%] top-[-20px] w-32 h-32 bg-yellow-300/30 blur-[40px] rounded-full pointer-events-none mix-blend-screen" />

                    {/* Logo (Left) */}
                    <div className="relative z-10 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-1.5 flex items-center justify-center min-w-[120px] h-[60px] transform hover:scale-105 transition-transform -mt-2">
                       <img src={catalog.headerLogoImage} alt="Logo" className="max-w-[100px] max-h-[48px] object-contain" />
                    </div>

                    {/* Main Promotion (Center) */}
                    <div className={cn("relative z-10 flex items-center shrink-0 ml-auto mr-auto pl-4 -mt-3", catalog.headerFontFamily)}>
                       <div className="flex flex-col text-white transform -skew-x-[12deg] leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] mr-2 text-right">
                          <span className="text-[16px] uppercase tracking-wide">{catalog.headerMainText1}</span>
                          <span className="text-[26px] uppercase tracking-tighter text-yellow-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] mt-0.5">{catalog.headerMainText2}</span>
                       </div>
                       
                       {/* Floating Small Badge */}
                       <div className="w-7 h-7 bg-[#212121] rounded-full flex items-center justify-center z-20 text-white transform rotate-[-15deg] mt-[-25px] mr-[-8px] shadow-sm border border-white/20 text-center leading-none">
                          <span className="text-[9px] font-sans font-black">{catalog.headerBadgeText}</span>
                       </div>

                       {/* Big Number */}
                       <div className="flex items-start text-[#fff314] drop-shadow-[0_4px_0px_#7d0c0e]">
                          <span className="text-[72px] leading-[0.75] uppercase italic tracking-tighter" style={{ WebkitTextStroke: '2px #ca141a' }}>{catalog.headerNumber}</span>
                          <span className="text-[32px] leading-[0.8] uppercase italic font-sans font-black mt-1" style={{ WebkitTextStroke: '1px #ca141a' }}>{catalog.headerNumberUnit}</span>
                       </div>
                    </div>

                    {/* Standard Period Footer - Small at the bottom right */}
                    <div className="absolute bottom-0 right-0 py-0.5 px-3 bg-black/40 text-[7px] text-white/90 font-sans z-20 flex gap-3 backdrop-blur-sm rounded-tl-lg font-medium">
                       <span>Berlaku di toko tertentu | S&K Berlaku</span>
                       <span className="font-bold">Periode: {catalog.period}</span>
                    </div>

                    {/* Call to action (Right) */}
                    <div className={cn("relative z-10 flex flex-col items-center justify-center pr-2 text-white transform -rotate-[3deg] drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)] -mt-2", catalog.headerFontFamily)}>
                          <span className="text-[22px] leading-tight italic tracking-wide">{catalog.headerRightText1}</span>
                          <span className="text-[28px] leading-none text-white italic -mt-1 tracking-tighter drop-shadow-[0_2px_0px_rgba(255,200,0,0.5)]">{catalog.headerRightText2}</span>
                    </div>

                  </div>

                  {/* Frame for Left Border, Content, Right Border */}
                  <div className="flex w-full flex-1 relative z-0">
                      {/* Left Border */}
                      <div className={cn("w-[12px] shrink-0 relative shadow-[inset_-2px_0_4px_rgba(0,0,0,0.05)]",
                         catalog.headerBgColor.includes('bg-') ? catalog.headerBgColor : `bg-gradient-to-b ${catalog.headerBgColor}`
                      )}>
                         {catalog.headerPatternId && catalog.headerPatternId !== 'none' && (
                            <div className="absolute inset-0 opacity-25 mix-blend-color-burn pointer-events-none" style={{ backgroundImage: `url("${PATTERNS.find(p => p.id === catalog.headerPatternId)?.url}")` }}></div>
                         )}
                      </div>

                      {/* Main Center Area */}
                      <div className="flex-1 flex flex-col min-w-0 pb-4 relative" style={{
                         backgroundImage: catalog.patternId && catalog.patternId !== 'none' ? `url("${PATTERNS.find(p => p.id === catalog.patternId)?.url}")` : undefined,
                      }}>
                          {/* Head Banner */}
                          {catalog.showHeadBanner && (
                            <div className="w-full h-36 relative overflow-hidden shadow-sm border-b-4 border-yellow-400">
                              <img src={catalog.headBannerImage || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop'}
                                alt="Banner" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex items-center">
                                <div className="p-6 text-white max-w-lg">
                                  {catalog.headBannerTitle && <h2 className="text-2xl font-black italic mb-1 text-yellow-400 drop-shadow-md">{catalog.headBannerTitle}</h2>}
                                  {catalog.headBannerSubtitle && <p className="text-xs drop-shadow-md text-slate-100 line-clamp-2">{catalog.headBannerSubtitle}</p>}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Grid Section */}
                          <div className={cn("w-full px-2 flex flex-col gap-4 relative", catalog.showHeadBanner ? "pt-4" : "pt-8")}>
                        {/* Grid Inner Content */}
                        {(catalog.showHeadBanner ? catalog.rows.slice(0, 3) : catalog.rows.slice(0, 4)).map(row => (
                          <div key={row.id} className="w-full">
                            {row.title && (
                              <div className="w-full mb-2 flex items-center z-10 relative">
                                <div className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-r-full shadow-sm uppercase tracking-wider">{row.title}</div>
                                <div className="flex-1 h-px bg-blue-100 ml-2" />
                              </div>
                            )}
                            <div className={cn("grid gap-2 relative z-10",
                              row.items.length === 2 ? "grid-cols-2" :
                              row.items.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                              {row.items.map(item => (
                                <div key={item.id} className={cn("p-2 rounded-lg border flex flex-col items-start text-left relative overflow-hidden h-full",
                                  row.items.length === 2 ? "min-h-[240px]" : row.items.length === 3 ? "min-h-[210px]" : "min-h-[180px]",
                                  catalog.templateId === 'modern-dark' ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100",
                                  catalog.templateId === 'floral-spring' && "bg-white/90 border-pink-200 shadow-sm",
                                  catalog.templateId === 'floral-tropical' && "bg-white/90 border-emerald-200 shadow-sm",
                                  catalog.templateId === 'floral-vintage' && "bg-[#fffbf0]/90 border-amber-200 shadow-sm")}>
                              <div className="w-full mb-1 h-10 overflow-hidden relative z-10">
                                <h3 className={cn("text-[9px] font-black leading-none uppercase text-slate-900 truncate",
                                  catalog.templateId === 'modern-dark' && "text-white")}>{item.brand}</h3>
                                <div className={cn("text-[8px] font-bold leading-tight text-slate-800 line-clamp-1",
                                  catalog.templateId === 'modern-dark' && "text-slate-200")}>{item.name}</div>
                                <p className={cn("text-[6px] italic leading-tight text-slate-600 line-clamp-1 mt-0.5",
                                  catalog.templateId === 'modern-dark' && "text-slate-400")}>{item.description}</p>
                              </div>
                              <div className="absolute inset-0 z-0 flex items-center justify-center p-2 pt-12 pb-4">
                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                                {item.discountPercentage && !item.isBuyXGetY && (
                                  <div className={cn("absolute top-10 right-2 bg-red-600 text-white rounded-full flex flex-col items-center justify-center shadow-sm z-10 leading-none",
                                    row.items.length === 4 ? "w-8 h-8" : row.items.length === 3 ? "w-9 h-9" : "w-10 h-10",
                                    catalog.templateId === 'floral-spring' && "bg-rose-500",
                                    catalog.templateId === 'floral-tropical' && "bg-teal-600",
                                    catalog.templateId === 'floral-vintage' && "bg-orange-700")}>
                                    <span className={cn("font-bold uppercase tracking-tighter",
                                      row.items.length === 4 ? "text-[4.5px]" : row.items.length === 3 ? "text-[5.5px]" : "text-[6.5px]")}>Hemat</span>
                                    <span className={cn("font-black", row.items.length === 4 ? "text-[9px]" : row.items.length === 3 ? "text-[10px]" : "text-[11px]")}>{item.discountPercentage}%</span>
                                  </div>
                                )}
                              </div>
                              <div className="absolute bottom-0 left-0 flex flex-col items-start z-20 p-1">
                                {item.isBuyXGetY ? (
                                  <>
                                    <div className={cn("bg-[#ffcc00] transform -skew-x-[15deg] origin-bottom-left rounded-t-sm shadow-sm inline-flex items-center justify-center gap-1 relative z-0 translate-y-[2px] ml-1",
                                      row.items.length === 4 ? "px-2.5 py-0.5 min-w-[65px]" : "px-4 py-0.5 min-w-[70px]")}>
                                      <span className={cn("font-black text-slate-800 skew-x-[15deg] uppercase leading-none whitespace-nowrap",
                                        row.items.length === 4 ? "text-[10px]" : "text-[12px]")}>Beli {item.buyQuantity || 2}</span>
                                    </div>
                                    <div className={cn("bg-[#ed1c24] transform -skew-x-[15deg] origin-top-left rounded-sm shadow-md inline-flex items-center justify-center gap-0.5 relative z-10",
                                      row.items.length === 4 ? "px-3.5 py-1 min-w-[95px]" : "px-5 py-1.5 min-w-[100px]",
                                      catalog.templateId === 'floral-spring' && "bg-rose-500",
                                      catalog.templateId === 'floral-tropical' && "bg-teal-600",
                                      catalog.templateId === 'floral-vintage' && "bg-orange-700")}>
                                      <span className={cn("font-black text-white skew-x-[15deg] uppercase tracking-tighter leading-none whitespace-nowrap",
                                        row.items.length === 4 ? "text-[13px]" : "text-[16px]")}>Gratis {item.getQuantity || 1}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className={cn("bg-[#ffcc00] px-3 py-0.5 transform -skew-x-[15deg] origin-bottom-left rounded-t-sm shadow-sm inline-flex items-center gap-1 relative z-0 translate-y-[2px] ml-1 min-w-[60px]",
                                      catalog.templateId === 'modern-dark' && "bg-slate-600",
                                      catalog.templateId === 'floral-spring' && "bg-pink-100",
                                      catalog.templateId === 'floral-tropical' && "bg-emerald-100",
                                      catalog.templateId === 'floral-vintage' && "bg-amber-100")}>
                                      <span className="text-[7px] font-bold text-slate-800 line-through skew-x-[15deg]">{item.originalPrice.toLocaleString('id-ID')}</span>
                                      <span className="text-[6px] font-black text-slate-800 skew-x-[15deg]">/{item.unit}</span>
                                    </div>
                                    <div className={cn("bg-[#ed1c24] px-4 py-1 transform -skew-x-[15deg] origin-top-left rounded-sm shadow-md inline-flex items-center gap-0.5 relative z-10 min-w-[90px]",
                                      catalog.templateId === 'floral-spring' && "bg-rose-500",
                                      catalog.templateId === 'floral-tropical' && "bg-teal-600",
                                      catalog.templateId === 'floral-vintage' && "bg-orange-700")}>
                                      <span className="text-[7px] font-black text-white skew-x-[15deg] uppercase">Rp</span>
                                      <span className="text-[15px] font-black text-white skew-x-[15deg] tracking-tighter leading-none">{item.discountedPrice.toLocaleString('id-ID')}</span>
                                      <span className="text-[7px] font-black text-white skew-x-[15deg] opacity-90">/{item.unit}</span>
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
              </div>

              {/* Right Border */}
                      <div className={cn("w-[12px] shrink-0 relative shadow-[inset_2px_0_4px_rgba(0,0,0,0.05)]",
                         catalog.headerBgColor.includes('bg-') ? catalog.headerBgColor : `bg-gradient-to-b ${catalog.headerBgColor}`
                      )}>
                         {catalog.headerPatternId && catalog.headerPatternId !== 'none' && (
                            <div className="absolute inset-0 opacity-25 mix-blend-color-burn pointer-events-none" style={{ backgroundImage: `url("${PATTERNS.find(p => p.id === catalog.headerPatternId)?.url}")` }}></div>
                         )}
                      </div>
                  </div>

                  {/* Footer Editable Styled */}
                  <div className={cn("mt-auto p-4 flex justify-between items-center z-10 relative overflow-hidden w-full text-white",
                    catalog.headerBgColor.includes('bg-') ? catalog.headerBgColor : `bg-gradient-to-r ${catalog.headerBgColor}`
                  )}>
                    {catalog.headerPatternId && catalog.headerPatternId !== 'none' && (
                       <div className="absolute inset-0 opacity-25 mix-blend-color-burn pointer-events-none" style={{ backgroundImage: `url("${PATTERNS.find(p => p.id === catalog.headerPatternId)?.url}")` }}></div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    
                    <div className={cn("text-[9px] font-medium relative z-10 text-white/90 drop-shadow-sm", catalog.headerFontFamily)}>
                      <p>Layanan Konsumen: halo@promosikita.id</p>
                      <p className="font-sans font-bold text-yellow-300">WhatsApp: 0811 1500 280</p>
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                      <div className="w-10 h-10 bg-white p-1 rounded-md shadow-sm">
                         <div className="w-full h-full bg-slate-900 rounded-sm" />
                      </div>
                      <div className={cn("text-[10px] leading-none text-white drop-shadow-md", catalog.headerFontFamily)}>
                         <span className="italic block uppercase mb-0.5">{catalog.headerRightText1}</span>
                         <span className="font-bold text-yellow-300 font-sans tracking-wide">DISKON</span>
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
      </div>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
     return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  const navItems = [
    { id: 'catalogue' as Page, label: 'Catalogue', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'promotions' as Page, label: 'Promotions', icon: <Megaphone className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-row-reverse font-sans text-slate-800">
      {/* Right Sidebar */}
      <aside className="w-[280px] bg-[#fdfbf7] border-l border-slate-200 flex flex-col shadow-sm flex-shrink-0">
        {/* User Profile in Sidebar */}
        <div className="px-6 py-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white overflow-hidden shadow-sm">
                Hi
             </div>
             <div>
               <p className="font-bold text-slate-800 text-sm">Hi, User!</p>
               <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">Master Curator</p>
             </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-2 space-y-2">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              currentPage === 'dashboard'
                ? "bg-[#8b7365]/10 text-[#8b7365] border border-[#8b7365]/30 border-dashed"
                : "text-slate-500 border border-transparent hover:bg-slate-100/50 hover:text-slate-800"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <div className="py-2">
             <div className="border-t border-dashed border-slate-300 mx-2" />
          </div>

          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                currentPage === item.id
                  ? "bg-[#8b7365]/10 text-[#8b7365] border border-[#8b7365]/30 border-dashed"
                  : "text-slate-500 border border-transparent hover:bg-slate-100/50 hover:text-slate-800"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-6">
           <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 border border-dashed border-slate-300 hover:bg-slate-50 transition-colors">
              Logout
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#f3f4f6]">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
               <h1 className="text-xl font-black text-[#8b7365] tracking-tight leading-none">PromoContent</h1>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Studio</span>
            </div>
            <div className="relative w-96 hidden md:block">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search className="h-4 w-4 text-slate-400" />
               </div>
               <input type="text" className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] text-sm placeholder-slate-400 transition-all" placeholder="Cari kampanye atau alat..." />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
            {currentPage === 'catalogue' && <CatalogueEditor />}
            {currentPage === 'promotions' && <Promotions />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
