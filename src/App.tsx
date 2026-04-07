import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import { 
  Plus, Trash2, Download, Upload, Package, FileText,
  Palette, CheckCircle2,
  BookOpen, Megaphone, LayoutDashboard, Search, TrendingUp,
  Facebook, Twitter, Instagram, Youtube, Music, QrCode,
  Menu, LogOut, Bell, Settings as SettingsIcon, User, X, ChevronLeft,
  History, Truck, BarChart3, ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import { cn } from './lib/utils';
import { CatalogData, CatalogItem, CatalogRow, DEFAULT_CATALOG, DEFAULT_ITEMS, SavedCatalogue, UserProfile } from './types';
import logoAsset from './assets/img/pcs_logo.png';
import Dashboard from './pages/Dashboard';
import Promotions from './pages/Promotions';
import Login from './pages/Login';
import CatalogueHistory from './pages/CatalogueHistory';
import SettingsPage from './pages/Settings';
import Activity from './pages/Activity';
import Analytics from './pages/Analytics';
import ProductInventory from './pages/ProductInventory';
import Supply from './pages/Supply';
import POS from './pages/POS';
import SalesRevenue from './pages/SalesRevenue';
import Notifications from './pages/Notifications';
import StockOpname from './pages/StockOpname';
import NotificationPopup from './components/NotificationPopup';

type Page = 'dashboard' | 'catalogue' | 'promotions' | 'history' | 'settings' | 'activity' | 'products' | 'inventory' | 'supply' | 'pos' | 'revenue' | 'analytics' | 'notifications' | 'stock_opname';

const HEADER_PATTERNS = [
  { id: 'none', name: 'Polos', url: '' },
  { id: 'linen', name: 'Linen Bold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjMDEwMTAxIiBmaWxsLW9wYWNpdHk9IjAuMiIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMCA0MEw0MCAwSDIwTDAgMjBNNDAgNDBWMjBMMjAgNDAiLz48L2c+PC9zdmc+' },
  { id: 'dots', name: 'Polka Dots Bold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjMDEwMTAxIiBmaWxsLW9wYWNpdHk9IjAuMjUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGNpcmNsZSBjeD0iMyIgY3k9IjMiIHI9IjMiLz48L2c+PC9zdmc+' },
  { id: 'carbon', name: 'Grid Lines Bold+', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAxaDQwVjBIMHYxem0xIDM5VjBIMHY0MGgxeiIgZmlsbD0iIzAxMDEwMSIgZmlsbC1vcGFjaXR5PSIwLjI1Ii8+PC9zdmc+' },
  { id: 'escher', name: 'Diamond Bold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMEw0MCAyMEwyMCA0MEwwIDIwWiIgZmlsbD0iIzAxMDEwMSIgZmlsbC1vcGFjaXR5PSIwLjE1Ii8+PC9zdmc+' },
  { id: 'chevron', name: 'Chevron Bold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAyMEwyMCAwTDQwIDIwTDIwIDQwTDAgMjBaIiBmaWxsPSJub25lIiBzdHJva2U9IiMwMTAxMDEiIHN0cm9rZS1vcGFjaXR5PSIwLjMwIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=' },
  { id: 'diagonals', name: 'Diagonals Bold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMDAgNDBMNDAgMFYyNEwyNCA0ME00MCA0MEgyNEwwIDI0VjAiIGZpbGw9IiMwMTAxMDEiIGZpbGwtb3BhY2l0eT0iMC4zIi8+PC9zdmc+' },
  { id: 'honeycomb', name: 'Honeycomb Bold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgNTYgMTAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0yOCA2NkwwIDUwTDAgMTZMMjggMEw1NiAxNkw1NiA1MEwyOCA2NkwyOCAxMDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAxMDEwMSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIgc3Ryb2tlLXdpZHRoPSIzIi8+PC9zdmc+' },
  { id: 'moroccan', name: 'Moroccan Bold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMGM1LjUyMyAwIDEwIDQuNDc3IDEwIDEwczQuNDc3IDEwIDEwIDEwLTQuNDc3IDEwLTEwIDEwLTEwIDQuNDc3LTEwIDEwLTQuNDc3LTEwLTEwLTEwLTEwLTQuNDc3LTEwLTEwIDQuNDc3LTEwIDEwLTEwIDEwLTQuNDc3IDEwLTEweiIgZmlsbD0iIzAxMDEwMSIgZmlsbC1vcGFjaXR5PSIwLjI1IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=' },
  { id: 'waves', name: 'Waves Bold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0OCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAyNGM0LTQgOC04IDEyLThzOCA0IDEyIDhsMTItOGM0LTQgOC04IDEyLTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAxMDEwMSIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIgc3Ryb2tlLXdpZHRoPSIzIi8+PC9zdmc+' },
];

const BODY_PATTERNS = [
  { id: 'none', name: 'Polos', url: '' },
  { id: 'dots', name: 'Soft Dots Bold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMTAxMDEiIGZpbGwtb3BhY2l0eT0iMC4xMCI+PGNpcmNsZSBjeD0iMyIgY3k9IjMiIHI9IjMiLz48Y2lyY2xlIGN4PSIzMyIgY3k9IjMzIiByPSIzIi8+PC9nPjwvZz48L3N2Zz4=' },
  { id: 'grid', name: 'Fine Grid Bold', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNTAgMUgwVjBoNTB2MXpNMSA1MFYwSDB2NTBoMXoiIGZpbGw9IiMwMTAxMDEiIGZpbGwtb3BhY2l0eT0iMC4xNSIvPjwvc3ZnPg==' },
  { id: 'waves', name: 'Subtle Waves', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA0OCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAyNGM0LTQgOC04IDEyLThzOCA0IDEyIDhsMTItOGM0LTQgOC04IDEyLTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAxMDEwMSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==' }
];

import { api } from './lib/api';

function SaveDraftModal({ isOpen, onCancel, onConfirm, initialName }: { 
  isOpen: boolean; 
  onCancel: () => void; 
  onConfirm: (name: string) => void;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
      >
        <div className="mb-6">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">Simpan Draft</h2>
          <p className="text-slate-500 text-sm mt-1">Beri nama atau tema untuk draf katalog ini.</p>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tema / Nama Draft</label>
            <input 
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Promo Lebaran 2026"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold text-slate-800"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={() => onConfirm(name)}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Simpan Sekarang
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CatalogueEditor({ userProfile, editingCatalogue, onDraftSaved }: { 
  userProfile: UserProfile, 
  editingCatalogue?: SavedCatalogue,
  onDraftSaved?: (cat: SavedCatalogue) => void
}) {
  const [catalog, setCatalog] = useState<CatalogData>(editingCatalogue?.catalogData || DEFAULT_CATALOG);
  const [activeTab, setActiveTab] = useState<'items' | 'campaign' | 'template'>('template');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Database Lookup State
  const [isDbLookupOpen, setIsDbLookupOpen] = useState(false);
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbFilterCategory, setDbFilterCategory] = useState('All');
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [targetLookup, setTargetLookup] = useState<{rowId: string, itemId: string} | null>(null);

  const fetchDbProducts = async () => {
    setIsDbLoading(true);
    try {
      const data = await api.getProducts();
      setDbProducts(data);
    } catch (e) {
      console.error('Gagal ambil data DB:', e);
      toast.error('Gagal mengambil data dari database master.');
    } finally {
      setIsDbLoading(false);
    }
  };

  const openDbLookup = (rowId: string, itemId: string) => {
    setTargetLookup({ rowId, itemId });
    setIsDbLookupOpen(true);
    fetchDbProducts();
  };

  const handlePickFromDb = (p: any) => {
    if (!targetLookup) return;
    updateItem(targetLookup.rowId, targetLookup.itemId, {
      brand: p.brand || '',
      name: p.name || '',
      description: p.description || '',
      image: p.image_url || '',
      originalPrice: p.price || 0,
      discountedPrice: p.price || 0, // Initial sync
      unit: p.unit || 'pcs',
    });
    setIsDbLookupOpen(false);
    setTargetLookup(null);
    toast.success(`${p.name} berhasil diambil dari database!`);
  };

  // Sync state if editingCatalogue changes
  useEffect(() => {
    if (editingCatalogue) setCatalog(editingCatalogue.catalogData);
    else setCatalog(DEFAULT_CATALOG);
  }, [editingCatalogue]);

  const handleExport = useCallback((format: 'jpg' | 'png') => {
    if (previewRef.current === null) return;
    const el = previewRef.current;
    setTimeout(() => {
      const options = {
        quality: 0.95, 
        cacheBust: true, 
        pixelRatio: 3,
        includeQueryParams: true, 
        width: el.scrollWidth, 
        height: el.scrollHeight,
        backgroundColor: '#ffffff',
        style: { transform: 'scale(1)', margin: '0', padding: '0' }
      };
      setIsExporting(true);
      const fn = format === 'jpg' ? toJpeg : toPng;
      fn(el, options).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `katalog-promosi-${Date.now()}.${format}`;
        link.href = dataUrl;
        link.click();
        
        toast.success(`Katalog berhasil di-ekspor sebagai ${format.toUpperCase()}!`);
      }).catch(err => {
        console.error('Ekspor gagal:', err);
        toast.error('Gagal mengekspor katalog: ' + err.message);
      }).finally(() => {
        setIsExporting(false);
      });
    }, 500);
  }, [previewRef, catalog, userProfile]);

  const handleSaveToDraft = async (draftName: string) => {
    if (previewRef.current === null) return;
    setIsModalOpen(false);
    setIsSaving(true);
    try {
      const finalCatalog = { ...catalog, promoSubtitle: draftName };
      setCatalog(finalCatalog);
      await new Promise(r => setTimeout(r, 500));

      const thumbnailWidth = previewRef.current.scrollWidth;
      const thumbnailHeight = previewRef.current.scrollHeight;
      const dataUrl = await toJpeg(previewRef.current, { 
        quality: 0.6, pixelRatio: 0.8, cacheBust: true, includeQueryParams: true, width: thumbnailWidth, height: thumbnailHeight, style: { transform: 'scale(1)' }
      });
      
      const data = await api.saveCatalogue({
        name: draftName,
        data: finalCatalog,
        creator_name: userProfile.nickname || userProfile.username,
        thumbnail: dataUrl
      });
      
      if (data && onDraftSaved) {
        onDraftSaved({
          id: data.id,
          name: data.name,
          catalogData: data.catalog_data,
          createdAt: data.created_at,
          creator_name: data.creator_name,
          thumbnail: data.thumbnail
        });
      }
      
      toast.success('Draft katalog berhasil disimpan!');
    } catch (err: any) {
      console.error('Gagal simpan ke DB:', err);
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateExisting = async () => {
    if (!editingCatalogue || !previewRef.current) return;
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      const thumbnailWidth = previewRef.current.scrollWidth;
      const thumbnailHeight = previewRef.current.scrollHeight;
      const dataUrl = await toJpeg(previewRef.current, { 
        quality: 0.6, pixelRatio: 0.8, cacheBust: true, includeQueryParams: true, width: thumbnailWidth, height: thumbnailHeight, style: { transform: 'scale(1)' }
      });

      await api.updateCatalogue(editingCatalogue.id, {
        name: editingCatalogue.name,
        data: catalog,
        thumbnail: dataUrl,
        creator_name: userProfile.nickname || userProfile.username
      });
      toast.success('Perubahan draft berhasil disimpan!');
    } catch (err: any) {
      console.error('Gagal update draft:', err);
      toast.error('Gagal memperbarui draft: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="flex-1 flex flex-col">
      {/* Catalogue Header */}
      <div className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] shadow-sm shadow-[#8b7365]/10">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Catalogue Generator</h1>
            <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none">Buat katalog promosi profesional dengan mudah</p>
          </div>
        </div>
        <div className="flex gap-3">
          {editingCatalogue ? (
            <button 
              onClick={handleUpdateExisting} 
              disabled={isSaving || isExporting}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm text-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Update Draft'}
            </button>
          ) : (
            <button 
              onClick={() => setIsModalOpen(true)} 
              disabled={isSaving || isExporting}
              className="px-5 py-2.5 bg-[#8b7365] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#725e52] transition-colors shadow-md text-sm cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Add to Draft
            </button>
          )}
          
          <SaveDraftModal 
            isOpen={isModalOpen}
            initialName={catalog.promoTitle || ''}
            onCancel={() => setIsModalOpen(false)}
            onConfirm={handleSaveToDraft}
          />
          <button 
            disabled={isExporting || isSaving}
            onClick={() => handleExport('jpg')} 
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm text-sm cursor-pointer disabled:opacity-50"
          >
            {isExporting ? 'Processing...' : <><Download className="w-4 h-4" /> Ekspor JPG</>}
          </button>
          <button 
            disabled={isExporting || isSaving}
            onClick={() => handleExport('png')} 
            className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm text-sm cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Ekspor PNG
          </button>
        </div>
      </div>

      <div className="flex-1 px-8 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => openDbLookup(row.id, item.id)}
                                  className="p-1.5 bg-white text-[#8b7365] hover:bg-[#8b7365] hover:text-white border border-slate-200 rounded-lg transition-all shadow-sm"
                                  title="Ambil dari Database Master"
                                >
                                  <Package className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => removeItemFromRow(row.id, item.id)} disabled={row.items.length <= 2}
                                  className="p-1.5 bg-white text-slate-400 hover:text-red-500 border border-slate-200 rounded-lg transition-all shadow-sm disabled:opacity-30">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
                      <label className="text-sm font-bold text-slate-700">Periode Promo</label>
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
                          <label className="text-xs font-bold text-slate-500">Slogan Logo (Italic)</label>
                          <input value={catalog.headerLogoSlogan} onChange={e => setCatalog(p => ({ ...p, headerLogoSlogan: e.target.value }))} placeholder="Slogan di bawah logo" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Nama Toko (Footer)</label>
                          <input value={catalog.footerShopName} onChange={e => setCatalog(p => ({ ...p, footerShopName: e.target.value }))} placeholder="Nama Toko Lily Mart" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Follow Handle (Footer)</label>
                          <input value={catalog.footerFollowUsHandle} onChange={e => setCatalog(p => ({ ...p, footerFollowUsHandle: e.target.value }))} placeholder="@lilymart" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" />
                       </div>
                    </div>
                
                    <div className="grid grid-cols-2 gap-4 pt-2">
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Teks S&K Header</label>
                          <input value={catalog.headerSKText} onChange={e => setCatalog(p => ({ ...p, headerSKText: e.target.value }))} placeholder="*s&k berlaku  | hanya untuk di toko tertentu" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500">Gaya Teks (Font Style)</label>
                          <select value={catalog.headerFontFamily} onChange={e => setCatalog(p => ({ ...p, headerFontFamily: e.target.value }))}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                             <option value="font-display font-black">Jakarta Black (Modern)</option>
                             <option value="font-sans font-bold">Jakarta Bold (Clean)</option>
                             <option value="font-serif font-black">Playfair Black (Klasik)</option>
                             <option value="font-mono font-bold">Grotesk Mono (Modern+)</option>
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between bg-slate-100 px-2 py-1.5 rounded">
                              <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Teks Tengah</h3>
                              <input type="checkbox" checked={catalog.showHeaderMainText} onChange={e => setCatalog(p => ({ ...p, showHeaderMainText: e.target.checked }))} className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                           </div>
                           <input value={catalog.headerMainText1} onChange={e => setCatalog(p => ({ ...p, headerMainText1: e.target.value }))} disabled={!catalog.showHeaderMainText} placeholder="PRODUK" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50" />
                           <input value={catalog.headerMainText2} onChange={e => setCatalog(p => ({ ...p, headerMainText2: e.target.value }))} disabled={!catalog.showHeaderMainText} placeholder="DISKON" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50" />
                        </div>
                        <div className="space-y-2">
                           <div className="flex items-center justify-between bg-slate-100 px-2 py-1.5 rounded">
                              <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Angka Promo</h3>
                              <input type="checkbox" checked={catalog.showHeaderNumber} onChange={e => setCatalog(p => ({ ...p, showHeaderNumber: e.target.checked }))} className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                           </div>
                           <div className={cn("flex gap-2", !catalog.showHeaderNumber && "opacity-50 pointer-events-none")}>
                              <input value={catalog.headerBadgeText} onChange={e => setCatalog(p => ({ ...p, headerBadgeText: e.target.value }))} placeholder="s/d" className="w-1/3 p-2 bg-white border border-slate-200 rounded-lg text-xs" title="Teks Kecil Atas" />
                              <input value={catalog.headerNumber} onChange={e => setCatalog(p => ({ ...p, headerNumber: e.target.value }))} placeholder="70" className="w-1/3 p-2 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold" title="Angka Besar" />
                              <input value={catalog.headerNumberUnit} onChange={e => setCatalog(p => ({ ...p, headerNumberUnit: e.target.value }))} placeholder="%" className="w-1/3 p-2 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold" title="Unit Angka" />
                           </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                       <div className="flex items-center justify-between bg-slate-100 px-2 py-1.5 rounded">
                          <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Teks Sisi Kanan (Panggilan Aksi)</h3>
                          <input type="checkbox" checked={catalog.showHeaderRightText} onChange={e => setCatalog(p => ({ ...p, showHeaderRightText: e.target.checked }))} className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <input value={catalog.headerRightText1} onChange={e => setCatalog(p => ({ ...p, headerRightText1: e.target.value }))} disabled={!catalog.showHeaderRightText} placeholder="Borong" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50" />
                          <input value={catalog.headerRightText2} onChange={e => setCatalog(p => ({ ...p, headerRightText2: e.target.value }))} disabled={!catalog.showHeaderRightText} placeholder="Sekarang!" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50" />
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
                            {HEADER_PATTERNS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                        {BODY_PATTERNS.map(p => (
                          <button key={p.id} onClick={() => setCatalog(prev => ({ ...prev, patternId: p.id }))}
                            className={cn("p-2 rounded-xl border-2 transition-all text-center relative h-20 flex flex-col items-center justify-center gap-1",
                              catalog.patternId === p.id ? "border-blue-500 bg-blue-50/30" : "border-slate-100 hover:border-slate-200 bg-white")}>
                            {catalog.patternId === p.id && <CheckCircle2 className="absolute top-1 right-1 w-3.5 h-3.5 text-blue-500" />}
                            <div className="w-full h-8 rounded bg-slate-100 border border-slate-200"
                              style={{ backgroundImage: p.url ? `url("${p.url}")` : 'none', backgroundSize: 'cover' }} />
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
                       <div className="absolute inset-0 opacity-25 mix-blend-color-burn pointer-events-none" style={{ backgroundImage: `url("${HEADER_PATTERNS.find(p => p.id === catalog.headerPatternId)?.url}")` }}></div>
                    )}
                    
                    {/* Lighting Effects */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                    <div className="absolute -right-10 -top-20 w-64 h-64 bg-yellow-400/40 blur-[50px] rounded-full pointer-events-none" />
                    <div className="absolute right-[40%] top-[-20px] w-32 h-32 bg-yellow-300/30 blur-[40px] rounded-full pointer-events-none mix-blend-screen" />

                    {/* Logo (Left) */}
                    <div className="flex flex-col items-center gap-1 group text-center px-1">
                      <div className="relative z-10 bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-1.5 flex items-center justify-center min-w-[120px] h-[55px] transform hover:scale-105 transition-transform border border-slate-100">
                         <img src={catalog.headerLogoImage} alt="Logo" className="max-w-[100px] max-h-[42px] object-contain" />
                      </div>
                      <span className="text-[9px] text-white/90 italic font-medium drop-shadow-sm mt-0 tracking-tight leading-tight">{catalog.headerLogoSlogan}</span>
                    </div>

                    {/* Main Promotion (Center) */}
                    <div className={cn("relative z-10 flex items-center shrink-0 ml-auto mr-auto pl-4 -mt-1", catalog.headerFontFamily)}>
                       {catalog.showHeaderMainText && (
                         <div className="flex flex-col text-white transform -skew-x-[12deg] leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] mr-2 text-right">
                            <span className="text-[16px] uppercase tracking-wide">{catalog.headerMainText1}</span>
                            <span className="text-[26px] uppercase tracking-tighter text-yellow-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] mt-0.5">{catalog.headerMainText2}</span>
                         </div>
                       )}
                       
                       {catalog.showHeaderNumber && (
                         <>
                           {/* Floating Small Badge */}
                           <div className="w-7 h-7 bg-[#212121] rounded-full flex items-center justify-center z-20 text-white transform rotate-[-15deg] mt-[-25px] mr-[-8px] shadow-sm border border-white/20 text-center leading-none">
                              <span className="text-[9px] font-sans font-black">{catalog.headerBadgeText}</span>
                           </div>

                           {/* Big Number */}
                           <div className="flex items-start text-[#fff314] drop-shadow-[0_4px_0px_#7d0c0e]">
                              <span className="text-[72px] leading-[0.75] uppercase italic tracking-tighter" style={{ WebkitTextStroke: '2px #ca141a' }}>{catalog.headerNumber}</span>
                              <span className="text-[32px] leading-[0.8] uppercase italic font-sans font-black mt-1" style={{ WebkitTextStroke: '1px #ca141a' }}>{catalog.headerNumberUnit}</span>
                           </div>
                         </>
                       )}
                    </div>

                    {/* Standard Period Footer - Small at the bottom right */}
                    <div className="absolute bottom-0 right-0 py-0.5 px-4 bg-black/40 text-[9px] text-white/90 font-sans z-20 flex gap-4 backdrop-blur-sm rounded-tl-lg font-bold">
                       <span className="opacity-70 mr-1">{catalog.headerSKText}</span>
                       <span className="text-yellow-300 tracking-wider"> PERIODE: {catalog.period} </span>
                    </div>

                    {/* Call to action (Right) */}
                    {catalog.showHeaderRightText && (
                      <div className={cn("relative z-10 flex flex-col items-center justify-center pr-2 text-white transform -rotate-[3deg] drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)] -mt-1", catalog.headerFontFamily)}>
                            <span className="text-[22px] leading-tight italic tracking-wide">{catalog.headerRightText1}</span>
                            <span className="text-[28px] leading-none text-white italic -mt-1 tracking-tighter drop-shadow-[0_2px_0px_rgba(255,200,0,0.5)]">{catalog.headerRightText2}</span>
                      </div>
                    )}

                  </div>

                  {/* Frame for Left Border, Content, Right Border */}
                  <div className="flex w-full flex-1 relative z-0">
                      {/* Left Border */}
                      <div className={cn("w-[12px] shrink-0 relative shadow-[inset_-2px_0_4px_rgba(0,0,0,0.05)]",
                         catalog.headerBgColor.includes('bg-') ? catalog.headerBgColor : `bg-gradient-to-b ${catalog.headerBgColor}`
                      )}>
                         {catalog.headerPatternId && catalog.headerPatternId !== 'none' && (
                            <div className="absolute inset-0 opacity-25 mix-blend-color-burn pointer-events-none" style={{ backgroundImage: `url("${HEADER_PATTERNS.find(p => p.id === catalog.headerPatternId)?.url}")` }}></div>
                         )}
                      </div>

                      {/* Main Center Area */}
                      <div className="flex-1 flex flex-col min-w-0 pb-4 relative" style={{
                         backgroundImage: catalog.patternId && catalog.patternId !== 'none' ? `url("${BODY_PATTERNS.find(p => p.id === catalog.patternId)?.url}")` : undefined,
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
                                <div className={cn("text-white text-[10px] font-bold px-3 py-1 rounded-r-full shadow-sm uppercase tracking-wider",
                                  catalog.templateId === 'indomaret-style' && "bg-blue-600",
                                  catalog.templateId === 'modern-dark' && "bg-red-600",
                                  catalog.templateId === 'eco-organic' && "bg-green-600",
                                  catalog.templateId === 'vibrant-yellow' && "bg-orange-500",
                                  catalog.templateId === 'floral-spring' && "bg-rose-500",
                                  catalog.templateId === 'floral-tropical' && "bg-teal-600",
                                  catalog.templateId === 'floral-vintage' && "bg-amber-800"
                                )}>{row.title}</div>
                                <div className={cn("flex-1 h-px ml-2 opacity-30",
                                  catalog.templateId === 'indomaret-style' && "bg-blue-600",
                                  catalog.templateId === 'modern-dark' && "bg-red-600",
                                  catalog.templateId === 'eco-organic' && "bg-green-600",
                                  catalog.templateId === 'vibrant-yellow' && "bg-orange-500",
                                  catalog.templateId === 'floral-spring' && "bg-rose-500",
                                  catalog.templateId === 'floral-tropical' && "bg-teal-600",
                                  catalog.templateId === 'floral-vintage' && "bg-amber-800"
                                )} />
                              </div>
                            )}
                            <div className={cn("grid gap-2 relative z-10",
                              row.items.length === 2 ? "grid-cols-2" :
                              row.items.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
                              {row.items.map(item => (
                                <div key={item.id} className={cn("p-2 rounded-lg border-2 flex flex-col items-start text-left relative overflow-hidden h-full",
                                  row.items.length === 2 ? "min-h-[240px]" : row.items.length === 3 ? "min-h-[210px]" : "min-h-[180px]",
                                  catalog.templateId === 'modern-dark' ? "bg-slate-800 border-slate-700 shadow-md" : "bg-white border-slate-100 shadow-sm",
                                  catalog.templateId === 'indomaret-style' && "border-blue-200 shadow-blue-50/50",
                                  catalog.templateId === 'eco-organic' && "border-green-200 shadow-green-50/50",
                                  catalog.templateId === 'vibrant-yellow' && "border-orange-200 shadow-orange-50/50",
                                  catalog.templateId === 'floral-spring' && "bg-white/90 border-pink-200 shadow-pink-50/50",
                                  catalog.templateId === 'floral-tropical' && "bg-white/90 border-emerald-200 shadow-emerald-50/50",
                                  catalog.templateId === 'floral-vintage' && "bg-[#fffbf0]/90 border-amber-200 shadow-amber-50/50")}>
                              <div className="w-full mb-1 h-10 overflow-hidden relative z-10">
                                <h3 className={cn("text-[9px] font-display font-black leading-none uppercase text-slate-900 truncate",
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
                                      <span className={cn("font-display font-black text-slate-800 skew-x-[15deg] uppercase leading-none whitespace-nowrap",
                                        row.items.length === 4 ? "text-[8px]" : row.items.length === 3 ? "text-[9px]" : "text-[10px]")}>Beli {item.buyQuantity || 2}</span>
                                    </div>
                                    <div className={cn("bg-[#ed1c24] transform -skew-x-[15deg] origin-top-left rounded-sm shadow-md inline-flex items-center justify-center gap-0.5 relative z-10",
                                      row.items.length === 4 ? "px-3.5 py-1 min-w-[95px]" : "px-5 py-1.5 min-w-[100px]",
                                      catalog.templateId === 'floral-spring' && "bg-rose-500",
                                      catalog.templateId === 'floral-tropical' && "bg-teal-600",
                                      catalog.templateId === 'floral-vintage' && "bg-orange-700")}>
                                      <span className={cn("font-display font-black text-white skew-x-[15deg] uppercase tracking-tighter leading-none whitespace-nowrap",
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
                                      <span className="text-[15px] font-display font-black text-white skew-x-[15deg] tracking-tighter leading-none">{item.discountedPrice.toLocaleString('id-ID')}</span>
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
                            <div className="absolute inset-0 opacity-25 mix-blend-color-burn pointer-events-none" style={{ backgroundImage: `url("${HEADER_PATTERNS.find(p => p.id === catalog.headerPatternId)?.url}")` }}></div>
                         )}
                      </div>
                  </div>

                  {/* Footer Editable Styled */}
                  <div className={cn("mt-auto flex flex-col z-10 relative overflow-hidden w-full text-white",
                    catalog.headerBgColor.includes('bg-') ? catalog.headerBgColor : `bg-gradient-to-r ${catalog.headerBgColor}`
                  )}>
                    {catalog.headerPatternId && catalog.headerPatternId !== 'none' && (
                       <div className="absolute inset-0 opacity-25 mix-blend-color-burn pointer-events-none" style={{ backgroundImage: `url("${HEADER_PATTERNS.find(p => p.id === catalog.headerPatternId)?.url}")` }}></div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    
                    {/* Social Media Bar (Top of Footer) */}
                    <div className="flex border-b border-white/20 px-6 py-1.5 gap-4 items-center relative z-10 bg-black/5">
                        <span className="text-[10px] font-black tracking-tighter uppercase opacity-80 shrink-0">Follow Us : {catalog.footerFollowUsHandle}</span>
                        <div className="flex gap-1.5">
                           <div className="w-4 h-4 bg-white rounded flex items-center justify-center shadow-sm"><Facebook className="w-2.5 h-2.5 text-blue-600" /></div>
                           <div className="w-4 h-4 bg-white rounded flex items-center justify-center shadow-sm"><Twitter className="w-2.5 h-2.5 text-blue-400" /></div>
                           <div className="w-4 h-4 bg-white rounded flex items-center justify-center shadow-sm"><Instagram className="w-2.5 h-2.5 text-pink-600" /></div>
                           <div className="w-4 h-4 bg-white rounded flex items-center justify-center shadow-sm"><Youtube className="w-2.5 h-2.5 text-red-600" /></div>
                           <div className="w-4 h-4 bg-white rounded flex items-center justify-center shadow-sm"><Music className="w-2.5 h-2.5 text-black" /></div>
                        </div>
                    </div>

                    <div className="p-4 px-6 flex justify-between items-center relative z-10">
                        <div className={cn("text-[9px] font-medium relative z-10 text-white/90 drop-shadow-sm", catalog.headerFontFamily)}>
                          <p>Layanan Konsumen: halo@promosikita.id</p>
                          <div className="mt-1 flex flex-col leading-none">
                             <p className="font-sans font-black text-yellow-300 text-[11px]">WhatsApp: 0811 1500 280</p>
                             <p className="text-[10px] uppercase font-bold text-white tracking-widest mt-1 opacity-90">{catalog.footerShopName}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {/* QR Section (Now on the right with stylized text) */}
                            <div className={cn("text-right drop-shadow-md", catalog.headerFontFamily)}>
                                <span className="text-[11px] italic block uppercase leading-none mb-0.5 tracking-tight">SCAN</span>
                                <span className="text-[14px] font-bold text-yellow-300 font-sans tracking-tighter leading-none block">ME</span>
                            </div>
                            <div className="w-12 h-12 bg-white p-1 rounded-sm shadow-md flex items-center justify-center">
                               <QrCode className="w-full h-full text-slate-900" />
                            </div>
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

      {/* Database Lookup Modal */}
      <AnimatePresence>
        {isDbLookupOpen && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-8 max-w-2xl w-full shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <button 
                onClick={() => setIsDbLookupOpen(false)}
                className="absolute top-8 right-8 p-3 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">Cari di Database Master</h2>
                <p className="text-slate-500 text-sm font-medium">Pilih produk untuk mengisi baris katalog secara otomatis.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Ketik nama produk, merek atau plu..." 
                    value={dbSearchQuery}
                    onChange={e => setDbSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-[#8b7365]/10 outline-none font-bold transition-all"
                  />
                </div>
                <select 
                  value={dbFilterCategory}
                  onChange={e => setDbFilterCategory(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-[#8b7365]/10 transition-all appearance-none cursor-pointer min-w-[150px]"
                >
                  {['All', 'Makanan', 'Minuman', 'Kebutuhan Rumah', 'Perawatan Diri', 'Peralatan', 'Lainnya'].map(cat => (
                    <option key={cat} value={cat}>{cat === 'All' ? 'Semua Kategori' : cat}</option>
                  ))}
                </select>
              </div>

              {/* Product List */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {isDbLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                     <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#8b7365] border-t-transparent"></div>
                     <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Memuat Master Data...</p>
                  </div>
                ) : dbProducts.filter(p => {
                  const s = dbSearchQuery.toLowerCase();
                  const matchesSearch = p.name.toLowerCase().includes(s) || 
                                       p.brand.toLowerCase().includes(s) ||
                                       (p.plu && p.plu.toLowerCase().includes(s));
                  const matchesCat = dbFilterCategory === 'All' || p.category === dbFilterCategory;
                  return matchesSearch && matchesCat;
                }).length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-bold">Produk tidak ditemukan di database master.</p>
                  </div>
                ) : (
                  dbProducts.filter(p => {
                    const s = dbSearchQuery.toLowerCase();
                    const matchesSearch = p.name.toLowerCase().includes(s) || 
                                         p.brand.toLowerCase().includes(s) ||
                                         (p.plu && p.plu.toLowerCase().includes(s));
                    const matchesCat = dbFilterCategory === 'All' || p.category === dbFilterCategory;
                    return matchesSearch && matchesCat;
                  }).map(p => (
                    <button 
                      key={p.id}
                      onClick={() => handlePickFromDb(p)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-3xl transition-all group text-left"
                    >
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                        <img src={p.image_url || 'https://via.placeholder.com/100'} alt={p.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-[#8b7365] uppercase tracking-widest leading-none mb-1">{p.brand}</p>
                        <h4 className="font-bold text-slate-800 truncate">{p.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight inline-flex items-center gap-2">
                          {p.category}
                          <span className="text-[#8b7365]/30">●</span>
                          <span className="text-rose-500">PLU: {p.plu}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-600">Rp {p.price.toLocaleString()}</p>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pilih Item</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database Cloud Connected</p>
                <button 
                  onClick={() => setIsDbLookupOpen(false)}
                  className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [editingCatalogue, setEditingCatalogue] = useState<SavedCatalogue | null>(null);

  const handleContinueEdit = (cat: SavedCatalogue) => {
    setEditingCatalogue(cat);
    setCurrentPage('catalogue');
  };

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Gagal memuat profil:', e);
      }
    }
    return {
      username: 'admin',
      nickname: 'Master Curator',
      role: 'admin',
      password: 'password123'
    };
  });

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    localStorage.setItem('user_profile', JSON.stringify(newProfile));
  };

  // RBAC: Redirect if unauthorized page access
  useEffect(() => {
    const role = userProfile.role?.toLowerCase() || 'kasir';
    const isAdmin = role.includes('admin');
    const isManager = role.includes('manager');
    
    const allowed: Page[] = ['dashboard', 'settings', 'pos', 'revenue'];
    if (isManager) allowed.push('catalogue', 'promotions', 'history', 'products', 'supply', 'notifications', 'stock_opname');
    if (isAdmin) allowed.push('catalogue', 'promotions', 'history', 'products', 'supply', 'activity', 'analytics', 'notifications', 'stock_opname');
    
    if (!allowed.includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [userProfile.role, currentPage]);

  useEffect(() => {
    if (currentPage === 'pos') {
      setIsSidebarExpanded(false);
    }
  }, [currentPage]);

  if (!isLoggedIn) {
     return <Login onLogin={(user) => {
       setUserProfile(user);
       localStorage.setItem('user_profile', JSON.stringify(user));
       setIsLoggedIn(true);
     }} />;
  }

  const allNavItems: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
    { id: 'revenue', label: 'Sales Report', icon: <TrendingUp className="w-5 h-5 shrink-0" /> },
    { id: 'products', label: 'Product Database', icon: <Package className="w-5 h-5 shrink-0" /> },
    { id: 'supply', label: 'Supply Inbound', icon: <Truck className="w-5 h-5 shrink-0" /> },
    { id: 'stock_opname', label: 'Stock Opname', icon: <ClipboardCheck className="w-5 h-5 shrink-0" /> },
    { id: 'pos', label: 'POS', icon: <QrCode className="w-5 h-5 shrink-0" /> },
    { id: 'activity', label: 'Activity Log', icon: <History className="w-5 h-5 shrink-0" /> },
    { id: 'analytics', label: 'Revenue', icon: <BarChart3 className="w-5 h-5 shrink-0" /> },
    { id: 'notifications', label: 'Notifikasi', icon: <Bell className="w-5 h-5 shrink-0" /> },
    { id: 'catalogue', label: 'Catalogue', icon: <BookOpen className="w-5 h-5 shrink-0" /> },
    { id: 'promotions', label: 'Promotions', icon: <Megaphone className="w-5 h-5 shrink-0" /> },
    { id: 'history', label: 'Drafts', icon: <Plus className="w-5 h-5 shrink-0" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5 shrink-0" /> },
  ];

  const clearEditingState = () => {
    setEditingCatalogue(null);
    setCurrentPage('catalogue');
  };

  const navItems = allNavItems.filter(item => {
    const role = userProfile.role?.toLowerCase() || 'kasir';
    const isAdmin = role.includes('admin');
    const isManager = role.includes('manager');
    const isKasir = role.includes('kasir');

    // Semua role bisa akses settings, revenue, dashboard, & Admin akses semua
    if (item.id === 'settings' || item.id === 'dashboard' || isAdmin) return true;
    
    // Role Manager
    if (isManager) return ['catalogue', 'promotions', 'history', 'revenue', 'pos', 'products', 'supply', 'notifications', 'stock_opname'].includes(item.id);
    
    // Role Kasir
    if (isKasir) return ['pos', 'revenue'].includes(item.id);

    return false;
  });

  return (
    <div className="flex h-screen w-screen bg-[#f3f4f6] font-sans text-slate-800 antialiased overflow-hidden relative">
      <Toaster 
        position="bottom-right" 
        reverseOrder={false} 
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{ 
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            padding: '12px 16px',
          },
          success: {
            style: {
              background: '#059669', // Emerald 600
            },
          },
          error: {
            style: {
              background: '#e11d48', // Rose 600
            },
          },
        }} 
      />

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarExpanded(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar - Responsive */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarExpanded ? 260 : 80,
          x: (typeof window !== 'undefined' && window.innerWidth < 1024 && !isSidebarExpanded) ? -260 : 0
        }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className={cn(
          "h-full flex flex-col bg-white border-r border-slate-200 z-[100] relative",
          "fixed lg:relative top-0 left-0"
        )}
      >
        {/* Top Spacer - Minimalist */}
        <div className="h-10" />

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-visible">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'catalogue') setEditingCatalogue(null);
                setCurrentPage(item.id);
              }}
              title={item.label}
              className={cn(
                "flex items-center group relative transition-all duration-200 rounded-xl",
                isSidebarExpanded ? "w-full px-4 py-3.5 justify-start" : "w-12 h-12 justify-center mx-auto",
                currentPage === item.id
                  ? "bg-[#8b7365] text-white shadow-lg shadow-[#8b7365]/20 translate-x-1"
                  : "text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              )}
            >
              {item.icon}
              <AnimatePresence>
                {isSidebarExpanded && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="ml-3 font-bold text-sm whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip for Collapsed State */}
              {!isSidebarExpanded && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-800 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-1 pointer-events-none transition-all duration-200 whitespace-nowrap z-[120] shadow-xl border border-slate-700">
                    {item.label}
                    <div className="absolute top-1/2 -left-1.5 transform -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-800" />
                </div>
              )}
              
              {/* Active Indicator Line */}
              {currentPage === item.id && isSidebarExpanded && (
                <div className="absolute left-0 w-1.5 h-6 bg-yellow-400 rounded-full my-auto inset-y-0 -translate-x-1/2" />
              )}
            </button>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="px-4 py-6 border-t border-slate-100">
           <button 
             onClick={() => setIsLoggedIn(false)} 
             className={cn(
               "w-full flex items-center group relative p-3.5 rounded-xl transition-all duration-200",
               isSidebarExpanded ? "justify-start gap-3 bg-red-50 text-red-600 hover:bg-red-100" : "justify-center text-slate-400 hover:text-red-500 hover:bg-red-50"
             )}
           >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarExpanded && <span className="text-sm font-bold">Logout</span>}
              
              {!isSidebarExpanded && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-800 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-1 pointer-events-none transition-all duration-200 whitespace-nowrap z-[120] shadow-xl border border-slate-700">
                    Keluar Sistem
                    <div className="absolute top-1/2 -left-1.5 transform -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-800" />
                </div>
              )}
           </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative bg-[#f8f9fb] custom-scrollbar h-full w-full">
        {/* Top Header - Redesigned Sticky */}
        {currentPage !== 'pos' && (
          <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3 md:gap-8 flex-1">
              <button 
                onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                className="w-12 h-12 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-xl transition-all duration-300 shadow-sm border border-slate-100 flex items-center justify-center group active:scale-95 shrink-0"
                title={isSidebarExpanded ? "Sembunyikan Sidebar" : "Tampilkan Sidebar"}
              >
                <div className="relative">
                   {isSidebarExpanded ? (
                     <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                   ) : (
                     <Menu className="w-5 h-5" />
                   )}
                </div>
              </button>

              <div className="flex items-center gap-0 -ml-2">
                <div className="h-12 shrink-0 hidden md:flex items-center justify-center">
                  <img src={logoAsset} alt="Logo" className="h-full w-auto object-contain" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-lg md:text-xl font-display font-black text-slate-900 tracking-tighter leading-none uppercase">myStore</h1>
                    <span className="text-[9px] font-display font-bold text-[#8b7365]/60 uppercase tracking-[0.3em] mt-1 ml-0.5 leading-none">Studio</span>
                 </div>
              </div>
              
              <div className="relative w-full max-w-lg hidden lg:flex items-center">
                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                   <Search className="h-4 w-4 text-[#6d4d42]/50" />
                 </div>
                 <input 
                   type="text" 
                   className="w-full pl-11 pr-4 py-2 bg-[#f4f4f2] border-none rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6d4d42]/10 text-sm placeholder-slate-400 font-medium transition-all" 
                   placeholder="Search inventory or tools..." 
                 />
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-5 text-[#6d4d42]/70 ml-2 md:ml-8">
               <NotificationPopup onBellClick={() => setCurrentPage('notifications')} />               
               <div className="relative group/settings">
                 <button 
                   onClick={() => setCurrentPage('settings')}
                   className={cn(
                     "hidden sm:flex p-2.5 rounded-full hover:bg-slate-100 transition-all items-center justify-center group transform active:scale-95 shadow-sm border",
                     currentPage === 'settings' ? "bg-[#8b7365] text-white border-[#8b7365]" : "bg-white border-slate-100 text-[#6d4d42]/70"
                   )}
                 >
                    <SettingsIcon className="w-5 h-5 group-hover:text-inherit" />
                 </button>
                 
                 {/* Custom Tooltip */}
                 <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/settings:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-[120] shadow-xl border border-slate-700 translate-y-2 group-hover/settings:translate-y-0">
                    Pengaturan Profil
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-x-[6px] border-x-transparent border-b-[6px] border-b-slate-800" />
                 </div>
               </div>

               <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

               <button 
                 onClick={() => setCurrentPage('settings')}
                 title={`Profil: ${userProfile.nickname}`}
                 className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-[#f4f4f2]/50 hover:bg-white border border-slate-200/50 transition-all transform active:scale-95 shadow-sm group"
               >
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-[#8b7365] text-white rounded-full flex items-center justify-center shadow-inner">
                     <User className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="hidden md:flex flex-col items-start leading-tight">
                     <span className="text-xs font-display font-black text-slate-800 tracking-tighter truncate max-w-[100px]">
                        {userProfile.nickname}
                     </span>
                     <span className="text-[9px] font-bold text-[#8b7365] uppercase tracking-widest truncate max-w-[100px]">
                        {userProfile.role}
                     </span>
                  </div>
               </button>
            </div>
          </header>
        )}

        {/* Workspace Content */}
        <section className="relative p-0 transition-all duration-300">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} userProfile={userProfile} />}
                {currentPage === 'activity' && <Activity />}
                {currentPage === 'analytics' && <Analytics />}
                {currentPage === 'catalogue' && (
                  <CatalogueEditor 
                    userProfile={userProfile} 
                    editingCatalogue={editingCatalogue || undefined} 
                    onDraftSaved={setEditingCatalogue}
                  />
                )}
                {currentPage === 'promotions' && <Promotions userProfile={userProfile} />}
                {currentPage === 'history' && <CatalogueHistory onNavigate={setCurrentPage} userProfile={userProfile} onContinueEdit={handleContinueEdit} />}
                {currentPage === 'products' && <ProductInventory onNavigate={setCurrentPage} />}
                {currentPage === 'supply' && <Supply />}
                { currentPage === 'pos' && <POS onNavigate={setCurrentPage} userProfile={userProfile} /> }
                { currentPage === 'revenue' && <SalesRevenue userProfile={userProfile} /> }
                { currentPage === 'notifications' && <Notifications userProfile={userProfile} /> }
                { currentPage === 'stock_opname' && <StockOpname /> }
                { currentPage === 'settings' && <SettingsPage userProfile={userProfile} onUpdateProfile={handleUpdateProfile} /> }
              </motion.div>
            </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
