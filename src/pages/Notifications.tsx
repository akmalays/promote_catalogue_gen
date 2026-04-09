import React, { useState, useEffect } from 'react';
import {
  Bell, Send, Clock, Plus, Trash2, X, CheckCircle2,
  AlertTriangle, Info, Gift, Megaphone, Calendar,
  Zap, Eye, EyeOff, RefreshCw, Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface Notification {
  id: any;
  title: string;
  message: string;
  type: 'info' | 'promo' | 'warning' | 'success';
  is_read: boolean;
  is_sent: boolean;
  scheduled_at: string | null;
  sent_at: string | null;
  target_role?: string;
  sender_name?: string;
  created_at: string;
}

const NOTIF_TYPES = [
  { value: 'info', label: 'Info', icon: Info, color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50' },
  { value: 'promo', label: 'Promo', icon: Gift, color: 'bg-emerald-500', textColor: 'text-emerald-600', bgLight: 'bg-emerald-50' },
  { value: 'warning', label: 'Peringatan', icon: AlertTriangle, color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50' },
  { value: 'success', label: 'Sukses', icon: CheckCircle2, color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50' },
];

import { UserProfile } from '../types';

interface NotificationsProps {
  userProfile: UserProfile;
}

export default function Notifications({ userProfile }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isScheduleMode, setIsScheduleMode] = useState(false);
  const [isRunningScheduler, setIsRunningScheduler] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'sent' | 'scheduled' | 'read'>('all');

  const role = userProfile.role?.toLowerCase() || 'kasir';
  const isAdmin = role.includes('admin') || role.includes('manager');

  // Compose form state
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeType, setComposeType] = useState<'info' | 'promo' | 'warning' | 'success'>('info');
  const [composeScheduledAt, setComposeScheduledAt] = useState('');
  const [composeTargetRole, setComposeTargetRole] = useState('all');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await api.getNotifications(userProfile.company_id!);
      setNotifications(data);
    } catch (e) {
      toast.error('Gagal memuat notifikasi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!composeTitle.trim() || !composeMessage.trim()) {
      toast.error('Judul dan pesan wajib diisi!');
      return;
    }

    setIsSending(true);
    try {
      await api.addNotification({
        title: composeTitle,
        message: composeMessage,
        type: composeType,
        scheduled_at: isScheduleMode && composeScheduledAt ? new Date(composeScheduledAt).toISOString() : null,
        target_role: composeTargetRole === 'all' ? undefined : composeTargetRole,
        sender_name: userProfile.nickname || userProfile.username,
        company_id: userProfile.company_id
      } as any);

      toast.success(isScheduleMode ? 'Notifikasi berhasil dijadwalkan!' : 'Notifikasi berhasil dikirim!');
      resetComposeForm();
      fetchNotifications();
    } catch (e: any) {
      toast.error('Gagal mengirim: ' + e.message);
    } finally {
      setIsSending(false);
    }
  };

  const resetComposeForm = () => {
    setComposeTitle('');
    setComposeMessage('');
    setComposeType('info');
    setComposeScheduledAt('');
    setIsScheduleMode(false);
    setComposeTargetRole('all');
    setIsComposeOpen(false);
  };

  const handleDeleteNotification = async (id: any) => {
    try {
      await api.deleteNotification(id, userProfile.company_id!);
      toast.success('Notifikasi dihapus');
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      toast.error('Gagal menghapus');
    }
  };

  const handleRunScheduler = async () => {
    setIsRunningScheduler(true);
    try {
      const dueNotifs = await api.getScheduledDueNotifications(userProfile.company_id!);
      if (dueNotifs.length === 0) {
        toast('Tidak ada notifikasi terjadwal yang perlu dikirim saat ini.');
      } else {
        let sentCount = 0;
        for (const notif of dueNotifs) {
          await api.markNotificationSent(notif.id, userProfile.company_id!);
          sentCount++;
        }
        toast.success(`${sentCount} notifikasi terjadwal berhasil dikirim!`);
        fetchNotifications();
      }
    } catch (e: any) {
      toast.error('Scheduler gagal: ' + e.message);
    } finally {
      setIsRunningScheduler(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterTab === 'sent') return n.is_sent && !n.is_read;
    if (filterTab === 'scheduled') return !n.is_sent;
    if (filterTab === 'read') return n.is_read;
    return true;
  });

  const getTypeConfig = (type: string) => NOTIF_TYPES.find(t => t.value === type) || NOTIF_TYPES[0];

  const scheduledCount = notifications.filter(n => !n.is_sent).length;
  const unreadCount = notifications.filter(n => n.is_sent && !n.is_read).length;

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 bg-transparent flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 no-print">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] shadow-sm shadow-[#8b7365]/10">
            <Bell className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">
              {isAdmin ? 'Pusat Notifikasi' : 'Notifikasi'}
            </h1>
            <p className="text-xs font-medium text-slate-400 tracking-widest leading-none">
              {isAdmin ? 'Kelola & Jadwalkan Notifikasi untuk Tim' : 'Kotak Masuk Pesan & Info Toko'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3">
            {/* Scheduler Trigger */}
            <button
              onClick={handleRunScheduler}
              disabled={isRunningScheduler}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs  tracking-wider transition-all shadow-lg",
                isRunningScheduler
                  ? "bg-slate-300 text-slate-500 cursor-wait"
                  : "bg-slate-800 text-white hover:bg-slate-700 shadow-slate-800/20"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isRunningScheduler && "animate-spin")} />
              {isRunningScheduler ? 'Memproses...' : 'Jalankan Scheduler'}
            </button>

            {/* Compose Button */}
            <button
              onClick={() => setIsComposeOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#8b7365] text-white rounded-xl font-bold text-xs  tracking-wider transition-all shadow-lg shadow-[#8b7365]/20 hover:bg-[#7a6458]"
            >
              <Plus className="w-4 h-4" /> Buat Notifikasi
            </button>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="px-8 pb-4">
        <div className={cn("grid gap-4", isAdmin ? "grid-cols-4" : "grid-cols-2 max-w-2xl")}>
          {[
            { label: 'Total Notifikasi', value: notifications.length, icon: Bell, color: 'bg-slate-100', textColor: 'text-slate-600', show: true },
            { label: 'Belum Dibaca', value: unreadCount, icon: Eye, color: 'bg-blue-50', textColor: 'text-blue-600', show: true },
            { label: 'Terjadwal', value: scheduledCount, icon: Timer, color: 'bg-amber-50', textColor: 'text-amber-600', show: isAdmin },
            { label: 'Sudah Dibaca', value: notifications.filter(n => n.is_read).length, icon: EyeOff, color: 'bg-slate-50', textColor: 'text-slate-400', show: isAdmin },
          ].filter(s => s.show).map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn("flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm")}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.color)}>
                <stat.icon className={cn("w-5 h-5", stat.textColor)} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400">{stat.label}</p>
                <p className="text-xl font-black text-slate-800">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-8 pb-4">
        <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
          {[
            { key: 'all', label: 'Semua', show: true },
            { key: 'sent', label: 'Aktif', show: true },
            { key: 'scheduled', label: 'Terjadwal', show: isAdmin },
            { key: 'read', label: 'Dibaca', show: true },
          ].filter(t => t.show).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key as any)}
              className={cn(
                "px-6 py-2 rounded-lg text-xs font-bold transition-all",
                filterTab === tab.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
        <div className="space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-50 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
              <Bell className="w-16 h-16 mb-4" />
              <p className="text-sm font-bold text-slate-400">Tidak ada notifikasi baru</p>
            </div>
          ) : (
            filteredNotifications.map((notif, i) => {
              const typeConfig = getTypeConfig(notif.type);
              const TypeIcon = typeConfig.icon;
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "bg-white rounded-2xl p-5 border transition-all group hover:shadow-md relative overflow-hidden",
                    notif.is_read ? "border-slate-100 opacity-60" : "border-slate-200 shadow-sm",
                    !notif.is_sent && "border-l-4 border-l-amber-400"
                  )}
                >
                  {/* Unread Indicator */}
                  {notif.is_sent && !notif.is_read && (
                    <div className="absolute top-5 right-5">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full block animate-pulse" />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", typeConfig.bgLight)}>
                      <TypeIcon className={cn("w-6 h-6", typeConfig.textColor)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-black text-slate-800 truncate">{notif.title}</h3>
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", typeConfig.bgLight, typeConfig.textColor)}>
                          {typeConfig.label}
                        </span>
                        {!notif.is_sent && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Terjadwal
                          </span>
                        )}
                        {notif.is_read && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                            Dibaca
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400">
                        {notif.sender_name && <span>Dari: {notif.sender_name}</span>}
                        {notif.scheduled_at && !notif.is_sent && (
                          <span className="text-amber-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Jadwal: {new Date(notif.scheduled_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {notif.sent_at && (
                          <span className="text-emerald-500">
                            Terkirim: {new Date(notif.sent_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <span>
                          Dibuat: {new Date(notif.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDeleteNotification(notif.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComposeOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-8 pb-3 border-b border-slate-50 flex items-start justify-between">
                <div className="flex flex-col items-start gap-4">
                  <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365]">
                    <Megaphone className="w-7 h-7" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Buat Notifikasi</h2>
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] ">Kirim atau Jadwalkan Pesan</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 -mr-2 -mt-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-8 space-y-5 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {/* Type Selector */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipe Notifikasi</label>
                  <div className="grid grid-cols-4 gap-2">
                    {NOTIF_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setComposeType(t.value as any)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                          composeType === t.value
                            ? "border-[#8b7365] bg-[#8b7365]/5"
                            : "border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", t.bgLight)}>
                          <t.icon className={cn("w-4 h-4", t.textColor)} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Judul Notifikasi</label>
                  <input
                    value={composeTitle}
                    onChange={e => setComposeTitle(e.target.value)}
                    placeholder="Contoh: Promo Spesial Hari Ini!"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-300 focus:ring-2 focus:ring-[#8b7365]/10 outline-none transition-all"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Isi Pesan</label>
                  <textarea
                    value={composeMessage}
                    onChange={e => setComposeMessage(e.target.value)}
                    placeholder="Tulis pesan notifikasi di sini..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-300 focus:ring-2 focus:ring-[#8b7365]/10 outline-none transition-all resize-none"
                  />
                </div>

                {/* Target Role */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Target Penerima</label>
                  <select
                    value={composeTargetRole}
                    onChange={e => setComposeTargetRole(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8b7365]/10 transition-all"
                  >
                    <option value="all">Semua User</option>
                    <option value="admin">Admin saja</option>
                    <option value="manager">Manager saja</option>
                    <option value="kasir">Kasir saja</option>
                  </select>
                </div>

                {/* Schedule Toggle */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-700">Jadwalkan Pengiriman</p>
                        <p className="text-[9px] text-slate-400 font-bold">Kirim otomatis di waktu tertentu</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isScheduleMode}
                      onChange={e => setIsScheduleMode(e.target.checked)}
                      className="rounded border-slate-300 text-[#8b7365] focus:ring-[#8b7365] w-5 h-5"
                    />
                  </label>

                  <AnimatePresence>
                    {isScheduleMode && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-4 border-t border-slate-200">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Waktu Kirim</label>
                          <input
                            type="datetime-local"
                            value={composeScheduledAt}
                            onChange={e => setComposeScheduledAt(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#8b7365]/10 transition-all"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-8 border-t border-slate-50 flex gap-4">
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-[12px] font-black  tracking-widest hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={isSending}
                  className={cn(
                    "flex-1 py-3.5 rounded-2xl text-[12px] font-black  tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl",
                    isScheduleMode
                      ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
                      : "bg-[#8b7365] text-white hover:bg-[#7a6458] shadow-[#8b7365]/20"
                  )}
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : isScheduleMode ? (
                    <>
                      <Calendar className="w-4 h-4" /> Jadwalkan
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Kirim 
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
