import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Info, Gift, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface NotifItem { id: any; title: string; message: string; type: 'info' | 'promo' | 'warning' | 'success'; is_read: boolean; is_sent: boolean; sent_at: string | null; created_at: string; sender_name?: string; }

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  promo: { icon: Gift, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  success: { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
};

export default function NotificationPopup({ onBellClick, userProfile }: { onBellClick?: () => void; userProfile: UserProfile }) {
  const [unreadNotifs, setUnreadNotifs] = useState<NotifItem[]>([]);
  const [popupNotif, setPopupNotif] = useState<NotifItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const schedulerRef = useRef<any>(null);

  const runSchedulerCheck = useCallback(async () => { try { const due = await api.getScheduledDueNotifications(userProfile.company_id!); for (const n of due) await api.markNotificationSent(n.id, userProfile.company_id!); } catch {} }, []);
  const fetchActive = useCallback(async () => { try { setUnreadNotifs(await api.getActiveNotifications(userProfile.company_id!)); } catch {} }, []);

  useEffect(() => {
    fetchActive(); runSchedulerCheck();
    const channel = supabase.channel('notif-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const rec = payload.new as NotifItem;
        if (rec.is_sent && !rec.is_read) { setPopupNotif(rec); fetchActive(); setTimeout(() => setPopupNotif(prev => prev?.id === rec.id ? null : prev), 6000); }
        else if (payload.eventType === 'UPDATE' && rec.is_read) fetchActive();
      } else if (payload.eventType === 'DELETE') fetchActive();
    }).subscribe();
    schedulerRef.current = setInterval(runSchedulerCheck, 30000);
    return () => { supabase.removeChannel(channel); if (schedulerRef.current) clearInterval(schedulerRef.current); };
  }, [fetchActive, runSchedulerCheck]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: any) => { try { await api.markNotificationRead(id, userProfile.company_id!); setUnreadNotifs(prev => prev.filter(n => n.id !== id)); if (popupNotif?.id === id) setPopupNotif(null); } catch {} };
  const markAllRead = async () => { try { await api.markAllNotificationsRead(userProfile.company_id!); setUnreadNotifs([]); setPopupNotif(null); } catch {} };

  return (
    <>
      <div ref={dropdownRef} className="relative group/bell">
        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors relative">
          <Bell className="w-4 h-4" />
          {unreadNotifs.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
        {/* Tooltip */}
        {!isDropdownOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-xs font-medium rounded-md opacity-0 invisible group-hover/bell:opacity-100 group-hover/bell:visible pointer-events-none transition-all duration-150 whitespace-nowrap z-[9999] shadow-md">
            Notifikasi
          </div>
        )}

        {/* Dropdown */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-2 w-[320px] bg-white dark:bg-stone-900 rounded-lg shadow-lg border border-stone-200 dark:border-stone-800 overflow-hidden z-[200]">
              {/* Header */}
              <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-900 dark:text-stone-100">Notifikasi</span>
                <div className="flex items-center gap-2">
                  {unreadNotifs.length > 0 && <button onClick={markAllRead} className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100">Baca semua</button>}
                  {onBellClick && <button onClick={() => { setIsDropdownOpen(false); onBellClick(); }} className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100">Kelola →</button>}
                </div>
              </div>

              {/* List */}
              <div className="max-h-[300px] overflow-y-auto">
                {unreadNotifs.length === 0 ? (
                  <div className="py-10 text-center"><Bell className="w-5 h-5 mx-auto mb-2 text-stone-300 dark:text-stone-600" /><p className="text-xs text-stone-400 dark:text-stone-500">Semua sudah dibaca</p></div>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {unreadNotifs.slice(0, 8).map(notif => {
                      const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                      const Icon = cfg.icon;
                      return (
                        <div key={notif.id} onClick={() => markRead(notif.id)} className="px-4 py-3 flex items-start gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer group">
                          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}><Icon className={cn("w-3.5 h-3.5", cfg.color)} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-stone-800 dark:text-stone-200 truncate">{notif.title}</p>
                            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">{notif.message}</p>
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">{notif.sent_at && new Date(notif.sent_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); markRead(notif.id); }} className="p-1 text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-300 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3" /></button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {onBellClick && unreadNotifs.length > 0 && (
                <div className="px-4 py-2.5 border-t border-stone-200 dark:border-stone-800">
                  <button onClick={() => { setIsDropdownOpen(false); onBellClick(); }} className="w-full text-xs text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 text-center transition-colors">
                    Lihat semua notifikasi →
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast popup for new notifications */}
      {createPortal(
        <AnimatePresence>
          {popupNotif && (
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.2 }}
              className="fixed top-4 right-4 z-[99999] w-[320px]">
              <div className="bg-white dark:bg-stone-900 rounded-lg shadow-lg border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0", TYPE_CONFIG[popupNotif.type]?.bg || 'bg-blue-50')}>
                    {React.createElement(TYPE_CONFIG[popupNotif.type]?.icon || Info, { className: cn("w-4 h-4", TYPE_CONFIG[popupNotif.type]?.color || 'text-blue-600') })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{popupNotif.title}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5">{popupNotif.message}</p>
                  </div>
                  <button onClick={() => setPopupNotif(null)} className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 shrink-0"><X className="w-4 h-4" /></button>
                </div>
                <div className="px-4 pb-3 flex gap-2">
                  <button onClick={() => markRead(popupNotif.id)} className="flex-1 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-md text-xs font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">Tandai dibaca</button>
                  <button onClick={() => setPopupNotif(null)} className="px-3 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-md text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Tutup</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
