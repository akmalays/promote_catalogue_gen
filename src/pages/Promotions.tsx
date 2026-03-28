import React, { useState } from 'react';
import { Users, Plus, Trash2, Send, MessageSquare, Phone, User, Search, CheckSquare, Square, Megaphone, X, Edit2, Check, ArrowDown, Image as ImageIcon, Paperclip, XCircle } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Visitor {
  id: string;
  name: string;
  phone: string;
  selected: boolean;
}

const DEFAULT_VISITORS: Visitor[] = [
  { id: '1', name: 'Budi Santoso', phone: '6281234567890', selected: false },
  { id: '2', name: 'Siti Rahayu', phone: '6285678901234', selected: false },
  { id: '3', name: 'Andi Kurniawan', phone: '6287890123456', selected: false },
];

export default function Promotions() {
  const [visitors, setVisitors] = useState<Visitor[]>(DEFAULT_VISITORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState(
    "Halo {nama}! \uD83D\uDE0A Ada kabar gembira pelanggan toko kami! \uD83D\uDCE2\n\nKatalog promo terbaru kita sudah rilis lho. Cek yuk lewat gambar di bawah ini, banyak diskon menarik yang sayang banget kalau dilewatkan! \u2728\n\nYuk, amankan promonya sebelum kehabisan ya! Happy shopping! \uD83D\uDECD"
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [blastSent, setBlastSent] = useState<string[]>([]);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyImageToClipboard = async () => {
    if (!attachedImage) return;
    try {
      // First, we need to convert the image to PNG because most browsers 
      // only support 'image/png' for Clipboard API write
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = attachedImage;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const item = new ClipboardItem({ [blob.type]: blob });
          await navigator.clipboard.write([item]);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
          console.error('Final clipboard write fail:', err);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Gagal menyalin gambar:', err);
    }
  };

  const filtered = visitors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.phone.includes(searchQuery)
  );

  const selectedVisitors = visitors.filter(v => v.selected);
  const allSelected = filtered.length > 0 && filtered.every(v => v.selected);

  const toggleSelect = (id: string) => {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, selected: !v.selected } : v));
  };

  const toggleAll = () => {
    const filteredIds = new Set(filtered.map(v => v.id));
    setVisitors(prev => prev.map(v =>
      filteredIds.has(v.id) ? { ...v, selected: !allSelected } : v
    ));
  };

  const addVisitor = () => {
    if (!newName.trim() || !newPhone.trim()) return;
    const phone = newPhone.replace(/\D/g, '').replace(/^0/, '62');
    const newV: Visitor = {
      id: Date.now().toString(),
      name: newName.trim(),
      phone,
      selected: false,
    };
    setVisitors(prev => [...prev, newV]);
    setNewName('');
    setNewPhone('');
    setShowAddForm(false);
  };

  const removeVisitor = (id: string) => {
    setVisitors(prev => prev.filter(v => v.id !== id));
  };

  const startEdit = (v: Visitor) => {
    setEditingId(v.id);
    setEditName(v.name);
    setEditPhone(v.phone);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const phone = editPhone.replace(/\D/g, '').replace(/^0/, '62');
    setVisitors(prev => prev.map(v => v.id === editingId ? { ...v, name: editName, phone } : v));
    setEditingId(null);
  };

  const buildWhatsAppUrl = (visitor: Visitor) => {
    const personalizedMsg = message.replace('{nama}', visitor.name);
    const params = new URLSearchParams();
    params.append('text', personalizedMsg);
    return `https://wa.me/${visitor.phone}?${params.toString()}`;
  };

  const handleBlastOne = (visitor: Visitor) => {
    window.open(buildWhatsAppUrl(visitor), '_blank');
    setBlastSent(prev => [...prev, visitor.id]);
  };

  const handleBlastSelected = () => {
    selectedVisitors.forEach((v, i) => {
      setTimeout(() => {
        window.open(buildWhatsAppUrl(v), '_blank');
        setBlastSent(prev => [...prev, v.id]);
      }, i * 600);
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Promotions Blast</h1>
            <p className="text-sm text-slate-500 mt-0.5">Kelola pengunjung dan kirim pesan promosi via WhatsApp</p>
          </div>
          <button
            onClick={handleBlastSelected}
            disabled={selectedVisitors.length === 0}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm",
              selectedVisitors.length > 0
                ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
            Blast WA ({selectedVisitors.length})
          </button>
        </div>
      </div>

      <div className="flex-1 px-8 pb-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Visitor List */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau nomor..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
              <button
                onClick={() => setShowAddForm(f => !f)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah
              </button>
            </div>

            {/* Add Form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-slate-100 overflow-hidden"
                >
                  <div className="p-4 bg-emerald-50 flex gap-3">
                    <div className="relative flex-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Nama lengkap"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                      />
                    </div>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        placeholder="08xx / 628xx"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                      />
                    </div>
                    <button onClick={addVisitor} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1">
                      <Check className="w-4 h-4" /> Simpan
                    </button>
                    <button onClick={() => setShowAddForm(false)} className="px-3 py-2 bg-white border border-slate-200 text-slate-500 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Select All */}
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
              <button onClick={toggleAll} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors">
                {allSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                Pilih Semua ({filtered.length})
              </button>
              <div className="flex-1" />
              <span className="text-xs text-slate-400">{selectedVisitors.length} dipilih</span>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-slate-400">
                    <Users className="w-10 h-10 mb-2 opacity-40" />
                    <p className="text-sm font-medium">Belum ada pengunjung</p>
                    <p className="text-xs">Klik "Tambah" untuk menambahkan kontak</p>
                  </div>
                ) : (
                  filtered.map(visitor => (
                    <motion.div
                      key={visitor.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group",
                        visitor.selected && "bg-emerald-50/50"
                      )}
                    >
                      <button onClick={() => toggleSelect(visitor.id)} className="flex-shrink-0">
                        {visitor.selected
                          ? <CheckSquare className="w-4 h-4 text-emerald-600" />
                          : <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />}
                      </button>

                      {editingId === visitor.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="flex-1 text-sm border border-emerald-300 rounded px-2 py-0.5 focus:outline-none"
                          />
                          <input
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            className="flex-1 text-sm border border-emerald-300 rounded px-2 py-0.5 focus:outline-none font-mono"
                          />
                          <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-800">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                            {visitor.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{visitor.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{visitor.phone}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {blastSent.includes(visitor.id) && (
                              <span className="text-[10px] text-emerald-600 font-bold mr-1">Terkirim</span>
                            )}
                            <button
                              onClick={() => handleBlastOne(visitor)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                              title="Kirim WA"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => startEdit(visitor)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeVisitor(visitor.id)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right: Message Composer */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-slate-800 text-sm">Isi Pesan Promosi</h2>
              <div className="ml-auto bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                WhatsApp
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 border border-slate-100">
                💡 Gunakan <code className="bg-slate-200 px-1 rounded font-mono text-slate-700">{'{nama}'}</code> untuk menyisipkan nama pengunjung secara otomatis
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={7}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none font-[inherit] leading-relaxed"
                placeholder="Tulis pesan promosi di sini..."
              />
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Lampiran</span>
                  <p className="text-[10px] text-slate-400">{message.length} karakter</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                   <label className="flex items-center gap-2 px-3 py-2 bg-[#f4f4f2] hover:bg-slate-200 text-[#6d4d42] rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-200/50 shadow-sm active:scale-95">
                      <ImageIcon className="w-4 h-4" />
                      {attachedImage ? 'Ganti Katalog' : 'Lampirkan Katalog'}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                   </label>
                   
                   {attachedImage && (
                     <div className="flex gap-2">
                        <button 
                          onClick={copyImageToClipboard}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm active:scale-95",
                            copySuccess 
                              ? "bg-emerald-600 text-white border-emerald-600" 
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100"
                          )}
                          title="Salin gambar untuk di-paste langsung di WA"
                        >
                          {copySuccess ? <Check className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                          {copySuccess ? 'Berhasil Disalin!' : 'Salin Katalog (Paste)'}
                        </button>

                        <a 
                           href={attachedImage} 
                           download="Katalog-Promo.png"
                           className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 border border-slate-200 shadow-sm active:scale-95 transition-all"
                           title="Download gambar jika copy-paste tidak didukung browser"
                        >
                           <ArrowDown className="w-4 h-4" /> Download
                        </a>

                        <button 
                            onClick={() => setAttachedImage(null)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors border border-rose-100 shadow-sm active:scale-95 ml-auto"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                     </div>
                   )}
                </div>

                {attachedImage && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video group"
                    >
                      <img src={attachedImage} alt="Katalog" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <p className="text-white text-[10px] font-bold px-3 py-1.5 bg-black/60 rounded-full">Pratinjau Katalog</p>
                      </div>
                    </motion.div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                         <span className="text-blue-600 font-bold text-xs">!</span>
                      </div>
                      <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                        <span className="font-bold uppercase block mb-0.5">🚀 Workflow Super Cepat:</span> 
                        Klik <span className="font-bold">"Salin Katalog"</span> di atas sekali saja, lalu untuk setiap jendela WhatsApp yang terbuka nanti, cukup tekan <span className="font-bold text-blue-900 underline">Ctrl+V (Paste)</span> lalu <span className="font-bold">Enter</span>. Jadi prosesnya jauh lebih cepat dan tidak ribet!
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="px-4 pb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview Pesan</p>
              <div className="bg-[#e5ddd5] rounded-xl p-4">
                  <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm max-w-xs ml-auto">
                    {attachedImage && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-slate-100">
                        <img src={attachedImage} alt="Katalog Attached" className="w-full h-24 object-cover" />
                      </div>
                    )}
                    <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                      {message.replace('{nama}', selectedVisitors[0]?.name || 'Pelanggan')}
                    </p>
                  <p className="text-[10px] text-slate-400 text-right mt-1">
                    {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Blast Button */}
          <button
            onClick={handleBlastSelected}
            disabled={selectedVisitors.length === 0}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-base transition-all",
              selectedVisitors.length > 0
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:-translate-y-0.5"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <Megaphone className="w-5 h-5" />
            {selectedVisitors.length > 0
              ? `Blast ke ${selectedVisitors.length} Pengunjung`
              : 'Pilih Pengunjung Terlebih Dahulu'}
          </button>

          {selectedVisitors.length > 0 && (
            <p className="text-xs text-center text-slate-400">
              WhatsApp akan terbuka satu per satu untuk setiap pengunjung yang dipilih
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
