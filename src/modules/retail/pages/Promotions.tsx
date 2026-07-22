import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Send, Phone, User, Search, CheckSquare, Square, X, Edit2, Check, ArrowDown, Image as ImageIcon, Paperclip, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import { UserProfile } from '../../../types';

interface Visitor { id: string; name: string; phone: string; selected: boolean; }

export default function Promotions({ userProfile }: { userProfile: UserProfile }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("Halo {nama}! Ada kabar gembira dari toko kami!\n\nKatalog promo terbaru sudah rilis. Cek gambar di bawah ini, banyak diskon menarik!\n\nYuk amankan promonya sebelum kehabisan.");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [blastSent, setBlastSent] = useState<string[]>([]);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isNamingCampaign, setIsNamingCampaign] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [isBlasting, setIsBlasting] = useState(false);
  const [currentBlastIdx, setCurrentBlastIdx] = useState(0);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setAttachedImage(r.result as string); r.readAsDataURL(f); } };

  const copyImageToClipboard = async () => {
    if (!attachedImage) return;
    try {
      const img = new Image(); img.crossOrigin = "anonymous"; img.src = attachedImage;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('No ctx'); ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => { if (!blob) return; try { await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); toast.success('Gambar disalin ke clipboard'); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); } catch { toast.error('Gagal menyalin gambar'); } }, 'image/png');
    } catch { toast.error('Gagal menyiapkan gambar'); }
  };

  const filtered = visitors.filter(v => (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (v.phone || '').includes(searchQuery));
  const selectedVisitors = visitors.filter(v => v.selected);
  const allSelected = filtered.length > 0 && filtered.every(v => v.selected);
  const toggleSelect = (id: string) => setVisitors(prev => prev.map(v => v.id === id ? { ...v, selected: !v.selected } : v));
  const toggleAll = () => { const ids = new Set(filtered.map(v => v.id)); setVisitors(prev => prev.map(v => ids.has(v.id) ? { ...v, selected: !allSelected } : v)); };

  useEffect(() => { fetchVisitors(); }, []);
  const fetchVisitors = async () => { try { setVisitors(await api.getVisitors(userProfile.company_id!)); } catch {} };

  const addVisitor = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    const phone = newPhone.replace(/\D/g, '').replace(/^0/, '62');
    try { await api.addVisitor({ name: newName.trim(), phone, company_id: userProfile.company_id }); fetchVisitors(); setNewName(''); setNewPhone(''); setShowAddForm(false); toast.success('Kontak ditambahkan'); } catch { toast.error('Gagal menambahkan'); }
  };

  const removeVisitor = async (id: string) => { try { await api.deleteVisitor(id, userProfile.company_id!); fetchVisitors(); toast.success('Kontak dihapus'); } catch { toast.error('Gagal menghapus'); } };
  const startEdit = (v: Visitor) => { setEditingId(v.id); setEditName(v.name); setEditPhone(v.phone); };
  const saveEdit = async () => { if (!editingId) return; try { await api.updateVisitor(editingId, { name: editName, phone: editPhone.replace(/\D/g, '').replace(/^0/, '62'), company_id: userProfile.company_id }); setEditingId(null); fetchVisitors(); toast.success('Diperbarui'); } catch { toast.error('Gagal memperbarui'); } };

  const buildWhatsAppUrl = (visitor: Visitor) => { const msg = message.replace('{nama}', visitor.name || 'Pelanggan'); return `https://wa.me/${visitor.phone}?text=${encodeURIComponent(msg)}`; };
  const handleBlastOne = (visitor: Visitor) => { window.open(buildWhatsAppUrl(visitor), '_blank'); setBlastSent(prev => [...prev, visitor.id]); };

  const handleBlastSelected = () => { if (selectedVisitors.length === 0) return; setCampaignName(attachedImage ? "Katalog Blast" : "Pesan Promosi"); setIsNamingCampaign(true); };

  const startBlastQueue = async () => {
    setIsNamingCampaign(false); setIsBlasting(true); setCurrentBlastIdx(0);
    try { await api.saveBlastHistory({ promo_name: campaignName || "Blast", sender_name: userProfile.nickname || userProfile.username, recipient_count: selectedVisitors.length, company_id: userProfile.company_id!, catalogue_preview: attachedImage || undefined }); } catch {}
  };

  const sendNextInQueue = () => {
    if (currentBlastIdx >= selectedVisitors.length) return;
    window.open(buildWhatsAppUrl(selectedVisitors[currentBlastIdx]), '_blank');
    setBlastSent(prev => [...prev, selectedVisitors[currentBlastIdx].id]);
    if (currentBlastIdx < selectedVisitors.length - 1) { setCurrentBlastIdx(prev => prev + 1); }
    else { toast.success('Semua antrean diproses'); setTimeout(() => { setIsBlasting(false); setCampaignName(''); }, 1000); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* Header */}
      <div className="px-6 md:px-8 pt-6 pb-4 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Promotions Blast</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Kelola kontak dan broadcast promo via WhatsApp.</p>
        </div>
        <button onClick={handleBlastSelected} disabled={selectedVisitors.length === 0} className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5", selectedVisitors.length > 0 ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200" : "bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-not-allowed")}>
          <Send className="w-3.5 h-3.5" /> Blast ({selectedVisitors.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Contact List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
            {/* Search + Add */}
            <div className="p-3 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama atau nomor..." className="w-full pl-9 pr-3 py-2 bg-stone-100 dark:bg-stone-800 border-none rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" />
              </div>
              <button onClick={() => setShowAddForm(f => !f)} className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div className="p-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 flex gap-2">
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama" className="flex-1 px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10" />
                <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="08xx" className="flex-1 px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 font-mono" />
                <button onClick={addVisitor} className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium"><Check className="w-4 h-4" /></button>
                <button onClick={() => setShowAddForm(false)} className="px-2 py-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Select All */}
            <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <button onClick={toggleAll} className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100">
                {allSelected ? <CheckSquare className="w-4 h-4 text-stone-900 dark:text-stone-100" /> : <Square className="w-4 h-4" />}
                Pilih semua ({filtered.length})
              </button>
              <span className="text-xs text-stone-400 dark:text-stone-500">{selectedVisitors.length} dipilih</span>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
              {filtered.length === 0 ? (
                <div className="py-12 text-center"><User className="w-6 h-6 mx-auto mb-2 text-stone-300 dark:text-stone-600" /><p className="text-sm text-stone-400 dark:text-stone-500">Belum ada kontak</p></div>
              ) : filtered.map(visitor => (
                <div key={visitor.id} className={cn("flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors group", visitor.selected && "bg-stone-50 dark:bg-stone-800/30")}>
                  <button onClick={() => toggleSelect(visitor.id)} className="shrink-0">
                    {visitor.selected ? <CheckSquare className="w-4 h-4 text-stone-900 dark:text-stone-100" /> : <Square className="w-4 h-4 text-stone-300 dark:text-stone-600" />}
                  </button>

                  {editingId === visitor.id ? (
                    <div className="flex-1 flex gap-2">
                      <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 text-sm border border-stone-300 dark:border-stone-600 rounded px-2 py-1 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none" />
                      <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="flex-1 text-sm border border-stone-300 dark:border-stone-600 rounded px-2 py-1 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono focus:outline-none" />
                      <button onClick={saveEdit} className="text-stone-900 dark:text-stone-100"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="text-stone-400"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-medium text-stone-600 dark:text-stone-300 shrink-0">
                        {(visitor.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-800 dark:text-stone-200 truncate">{visitor.name}</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500 font-mono">{visitor.phone}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {blastSent.includes(visitor.id) && <span className="text-xs text-emerald-600 dark:text-emerald-400 mr-1">Sent</span>}
                        <button onClick={() => handleBlastOne(visitor)} className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors"><Send className="w-3.5 h-3.5" /></button>
                        <button onClick={() => startEdit(visitor)} className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeVisitor(visitor.id)} className="p-1.5 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Message Composer */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-stone-200 dark:border-stone-800">
              <h2 className="text-sm font-medium text-stone-900 dark:text-stone-100">Pesan</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Gunakan <code className="bg-stone-100 dark:bg-stone-800 px-1 rounded text-stone-700 dark:text-stone-300">{'{nama}'}</code> untuk nama otomatis.</p>
            </div>

            <div className="p-4">
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 resize-none leading-relaxed" placeholder="Tulis pesan promosi..." />

              {/* Attachment */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg text-xs font-medium cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> {attachedImage ? 'Ganti gambar' : 'Lampirkan katalog'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
                {attachedImage && (
                  <>
                    <button onClick={copyImageToClipboard} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors", copySuccess ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700")}>
                      <Paperclip className="w-3.5 h-3.5" /> {copySuccess ? 'Disalin' : 'Salin gambar'}
                    </button>
                    <a href={attachedImage} download="Katalog.png" className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg text-xs font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5">
                      <ArrowDown className="w-3.5 h-3.5" /> Download
                    </a>
                    <button onClick={() => setAttachedImage(null)} className="p-1.5 text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>

              {attachedImage && (
                <div className="mt-3 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 h-40">
                  <img src={attachedImage} alt="Katalog" className="w-full h-full object-contain" />
                </div>
              )}

              {attachedImage && (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  Klik "Salin gambar" lalu paste (Ctrl+V) di setiap jendela WhatsApp yang terbuka.
                </p>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-2">Preview</p>
            <div className="bg-stone-100 dark:bg-stone-800 rounded-lg p-3">
              <p className="text-sm text-stone-800 dark:text-stone-200 whitespace-pre-line leading-relaxed">
                {message.replace('{nama}', selectedVisitors[0]?.name || 'Pelanggan')}
              </p>
              {attachedImage && <div className="mt-2 rounded border border-stone-200 dark:border-stone-700 overflow-hidden h-20"><img src={attachedImage} alt="" className="w-full h-full object-cover" /></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Name Modal */}
      <AnimatePresence>
        {isNamingCampaign && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNamingCampaign(false)} className="absolute inset-0 bg-black/40" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative bg-white dark:bg-stone-900 rounded-xl max-w-sm w-full border border-stone-200 dark:border-stone-800 shadow-xl z-10">
              <div className="p-5 border-b border-stone-200 dark:border-stone-800">
                <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Nama kampanye</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Untuk pelacakan di log aktivitas.</p>
              </div>
              <div className="p-5 space-y-3">
                <input autoFocus value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Contoh: Promo Ramadhan" className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" />
                {attachedImage && <p className="text-xs text-stone-500 dark:text-stone-400">Katalog terlampir akan disimpan di log.</p>}
              </div>
              <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex gap-2 justify-end">
                <button onClick={() => setIsNamingCampaign(false)} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
                <button onClick={startBlastQueue} className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Mulai blast</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Blast Queue Modal */}
      <AnimatePresence>
        {isBlasting && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative bg-white dark:bg-stone-900 rounded-xl max-w-md w-full border border-stone-200 dark:border-stone-800 shadow-xl z-10">
              {/* Progress bar */}
              <div className="h-1 bg-stone-100 dark:bg-stone-800 rounded-t-xl overflow-hidden">
                <div className="h-full bg-stone-900 dark:bg-stone-100 transition-all duration-300" style={{ width: `${((currentBlastIdx + 1) / selectedVisitors.length) * 100}%` }} />
              </div>

              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Blast antrean</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{currentBlastIdx + 1} dari {selectedVisitors.length}</p>
                </div>
                <button onClick={() => setIsBlasting(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><XCircle className="w-4 h-4" /></button>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-3 mb-4 p-3 bg-stone-50 dark:bg-stone-800 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-sm font-medium text-stone-700 dark:text-stone-200">
                    {selectedVisitors[currentBlastIdx]?.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{selectedVisitors[currentBlastIdx]?.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">{selectedVisitors[currentBlastIdx]?.phone}</p>
                  </div>
                </div>

                {attachedImage && <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">Jangan lupa paste gambar (Ctrl+V) di WhatsApp.</p>}

                <button onClick={sendNextInQueue} className="w-full py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Kirim ke {selectedVisitors[currentBlastIdx]?.name}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
