import React, { useState, useEffect } from 'react';
import { Bell, Send, Clock, Plus, Trash2, X, CheckCircle2, AlertTriangle, Info, Gift, Calendar, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { UserProfile } from '../types';
import Select from '../components/ui/Select';

const TARGET_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'kasir', label: 'Kasir' },
];

interface Notification {
  id: any; title: string; message: string; type: 'info' | 'promo' | 'warning' | 'success';
  is_read: boolean; is_sent: boolean; scheduled_at: string | null; sent_at: string | null;
  target_role?: string; sender_name?: string; created_at: string;
}

const NOTIF_TYPES = [
  { value: 'info', label: 'Info', icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { value: 'promo', label: 'Promo', icon: Gift, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { value: 'warning', label: 'Peringatan', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { value: 'success', label: 'Sukses', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
];

export default function Notifications({ userProfile }: { userProfile: UserProfile }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [isRunningScheduler, setIsRunningScheduler] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'sent' | 'scheduled' | 'read'>('all');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeType, setComposeType] = useState<'info' | 'promo' | 'warning' | 'success'>('info');
  const [composeScheduledAt, setComposeScheduledAt] = useState('');
  const [composeTargetRole, setComposeTargetRole] = useState('all');
  const [isSending, setIsSending] = useState(false);

  const role = userProfile.role?.toLowerCase() || 'kasir';
  const isAdmin = role.includes('admin') || role.includes('manager');

  useEffect(() => { fetchNotifications(); }, []);
  const fetchNotifications = async () => { setIsLoading(true); try { setNotifications(await api.getNotifications(userProfile.company_id!)); } catch { toast.error('Gagal memuat notifikasi'); } finally { setIsLoading(false); } };

  const handleSendNotification = async () => {
    if (!composeTitle.trim() || !composeMessage.trim()) { toast.error('Judul dan pesan wajib diisi'); return; }
    setIsSending(true);
    try {
      await api.addNotification({ title: composeTitle, message: composeMessage, type: composeType, scheduled_at: isScheduleMode && composeScheduledAt ? new Date(composeScheduledAt).toISOString() : null, target_role: composeTargetRole === 'all' ? undefined : composeTargetRole, sender_name: userProfile.nickname || userProfile.username, company_id: userProfile.company_id } as any);
      toast.success(isScheduleMode ? 'Notifikasi dijadwalkan' : 'Notifikasi dikirim');
      resetForm(); fetchNotifications();
    } catch (e: any) { toast.error('Gagal: ' + e.message); } finally { setIsSending(false); }
  };

  const resetForm = () => { setComposeTitle(''); setComposeMessage(''); setComposeType('info'); setComposeScheduledAt(''); setIsScheduleMode(false); setComposeTargetRole('all'); setIsComposeOpen(false); };
  const handleDelete = async (id: any) => { try { await api.deleteNotification(id, userProfile.company_id!); toast.success('Dihapus'); setNotifications(prev => prev.filter(n => n.id !== id)); } catch { toast.error('Gagal menghapus'); } };

  const handleRunScheduler = async () => {
    setIsRunningScheduler(true);
    try { const due = await api.getScheduledDueNotifications(userProfile.company_id!); if (due.length === 0) { toast('Tidak ada notifikasi terjadwal yang perlu dikirim.'); } else { for (const n of due) await api.markNotificationSent(n.id, userProfile.company_id!); toast.success(`${due.length} notifikasi dikirim`); fetchNotifications(); } }
    catch (e: any) { toast.error('Scheduler gagal: ' + e.message); } finally { setIsRunningScheduler(false); }
  };

  const filtered = notifications.filter(n => { if (filterTab === 'sent') return n.is_sent && !n.is_read; if (filterTab === 'scheduled') return !n.is_sent; if (filterTab === 'read') return n.is_read; return true; });
  const getType = (type: string) => NOTIF_TYPES.find(t => t.value === type) || NOTIF_TYPES[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* Header */}
      <div className="px-6 md:px-8 pt-6 pb-4 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">{isAdmin ? 'Pusat Notifikasi' : 'Notifikasi'}</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{isAdmin ? 'Kelola dan jadwalkan notifikasi untuk tim.' : 'Pesan dan info dari toko.'}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={handleRunScheduler} disabled={isRunningScheduler} className="px-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCw className={cn("w-3.5 h-3.5", isRunningScheduler && "animate-spin")} /> Scheduler
            </button>
            <button onClick={() => setIsComposeOpen(true)} className="px-3 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Buat
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="px-6 md:px-8 py-3 shrink-0">
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg w-fit">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'sent', label: 'Aktif' },
            ...(isAdmin ? [{ key: 'scheduled', label: 'Terjadwal' }] : []),
            { key: 'read', label: 'Dibaca' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilterTab(tab.key as any)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", filterTab === tab.key ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm" : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200")}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="bg-white dark:bg-stone-900 rounded-lg p-5 border border-stone-200 dark:border-stone-800 animate-pulse"><div className="h-4 bg-stone-100 dark:bg-stone-800 rounded w-1/3 mb-2" /><div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-2/3" /></div>)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center"><Bell className="w-8 h-8 mb-3 text-stone-300 dark:text-stone-600" /><p className="text-sm text-stone-400 dark:text-stone-500">Tidak ada notifikasi</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map(notif => {
              const t = getType(notif.type);
              const Icon = t.icon;
              return (
                <div key={notif.id} className={cn("bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 transition-colors group", notif.is_read && "opacity-60", !notif.is_sent && "border-l-2 border-l-amber-400 dark:border-l-amber-500")}>
                  <div className="flex items-start gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", t.bg)}>
                      <Icon className={cn("w-4 h-4", t.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{notif.title}</h3>
                        {!notif.is_sent && <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded shrink-0">Terjadwal</span>}
                        {notif.is_sent && !notif.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mb-1.5">{notif.message}</p>
                      <div className="flex items-center gap-3 text-xs text-stone-400 dark:text-stone-500">
                        {notif.sender_name && <span>{notif.sender_name}</span>}
                        {notif.scheduled_at && !notif.is_sent && <span className="text-amber-500 dark:text-amber-400">{new Date(notif.scheduled_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                        {notif.sent_at && <span>{new Date(notif.sent_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDelete(notif.id)} className="p-1.5 text-stone-400 hover:text-red-500 dark:hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-all shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsComposeOpen(false)} className="absolute inset-0 bg-black/40" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }} className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[85vh] z-10">
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
                <div><h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Buat Notifikasi</h2><p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Kirim atau jadwalkan pesan.</p></div>
                <button onClick={() => setIsComposeOpen(false)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Type */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">Tipe</label>
                  <div className="grid grid-cols-4 gap-2">
                    {NOTIF_TYPES.map(tp => (
                      <button key={tp.value} onClick={() => setComposeType(tp.value as any)} className={cn("flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-colors", composeType === tp.value ? "border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800" : "border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600")}>
                        <tp.icon className={cn("w-4 h-4", tp.color)} />
                        <span className="text-[10px] font-medium text-stone-600 dark:text-stone-300">{tp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Title */}
                <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Judul</label><input value={composeTitle} onChange={e => setComposeTitle(e.target.value)} placeholder="Judul notifikasi..." className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" /></div>
                {/* Message */}
                <div><label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Pesan</label><textarea value={composeMessage} onChange={e => setComposeMessage(e.target.value)} placeholder="Isi pesan..." rows={3} className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent resize-none" /></div>
                {/* Target */}
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">Target</label>
                  <Select
                    value={composeTargetRole}
                    onChange={setComposeTargetRole}
                    options={TARGET_OPTIONS}
                    className="w-full"
                    buttonClassName="w-full"
                  />
                </div>
                {/* Schedule */}
                <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-stone-400 dark:text-stone-500" /><span className="text-sm text-stone-700 dark:text-stone-200">Jadwalkan</span></div>
                    <input type="checkbox" checked={isScheduleMode} onChange={e => setIsScheduleMode(e.target.checked)} className="rounded border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 focus:ring-stone-900 dark:focus:ring-stone-100 w-4 h-4" />
                  </label>
                  {isScheduleMode && <input type="datetime-local" value={composeScheduledAt} onChange={e => setComposeScheduledAt(e.target.value)} className="w-full mt-3 px-3 py-2 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-100 focus:border-transparent" />}
                </div>
              </div>

              <div className="p-5 border-t border-stone-200 dark:border-stone-800 flex gap-2 justify-end shrink-0">
                <button onClick={() => setIsComposeOpen(false)} className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors">Batal</button>
                <button onClick={handleSendNotification} disabled={isSending} className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                  {isSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : isScheduleMode ? <><Calendar className="w-3.5 h-3.5" /> Jadwalkan</> : <><Send className="w-3.5 h-3.5" /> Kirim</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
