import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Info, Gift, AlertTriangle, CheckCircle2, Clock, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface NotifItem {
  id: any;
  title: string;
  message: string;
  type: 'info' | 'promo' | 'warning' | 'success';
  is_read: boolean;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
  sender_name?: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bgLight: string; borderColor: string; gradient: string }> = {
  info: { icon: Info, color: 'text-blue-600', bgLight: 'bg-blue-50', borderColor: 'border-blue-300', gradient: 'from-blue-500 to-blue-600' },
  promo: { icon: Gift, color: 'text-emerald-600', bgLight: 'bg-emerald-50', borderColor: 'border-emerald-300', gradient: 'from-emerald-500 to-emerald-600' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bgLight: 'bg-amber-50', borderColor: 'border-amber-300', gradient: 'from-amber-500 to-amber-600' },
  success: { icon: CheckCircle2, color: 'text-green-600', bgLight: 'bg-green-50', borderColor: 'border-green-300', gradient: 'from-green-500 to-green-600' },
};

interface NotificationPopupProps {
  onBellClick?: () => void;
}

export default function NotificationPopup({ onBellClick }: NotificationPopupProps) {
  const [unreadNotifs, setUnreadNotifs] = useState<NotifItem[]>([]);
  const [popupNotif, setPopupNotif] = useState<NotifItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [lastCheckedIds, setLastCheckedIds] = useState<Set<any>>(new Set());
  const pollIntervalRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Run the scheduler check (mark due scheduled notifications as sent)
  const runSchedulerCheck = useCallback(async () => {
    try {
      const dueNotifs = await api.getScheduledDueNotifications();
      for (const notif of dueNotifs) {
        await api.markNotificationSent(notif.id);
      }
    } catch (e) {
      // Silently fail for scheduler check
    }
  }, []);

  // Poll for new notifications
  const checkForNewNotifications = useCallback(async () => {
    try {
      // First, run scheduler to mark due notifications as sent
      await runSchedulerCheck();
      
      // Then fetch active (sent + unread) notifications
      const activeNotifs = await api.getActiveNotifications();
      setUnreadNotifs(activeNotifs);

      // Check if there's a new notification to show as popup
      if (activeNotifs.length > 0) {
        const newNotifs = activeNotifs.filter((n: NotifItem) => !lastCheckedIds.has(n.id));
        if (newNotifs.length > 0) {
          // Show the newest one as popup
          setPopupNotif(newNotifs[0]);
          
          // Auto-dismiss popup after 8 seconds
          setTimeout(() => {
            setPopupNotif(prev => prev?.id === newNotifs[0].id ? null : prev);
          }, 8000);
        }
        // Update the checked IDs
        setLastCheckedIds(new Set(activeNotifs.map((n: NotifItem) => n.id)));
      }
    } catch (e) {
      // Silently fail
    }
  }, [lastCheckedIds, runSchedulerCheck]);

  // Start polling every 15 seconds
  useEffect(() => {
    checkForNewNotifications(); // Initial check
    pollIntervalRef.current = setInterval(checkForNewNotifications, 15000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Update polling callback when lastCheckedIds changes
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(checkForNewNotifications, 15000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [checkForNewNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: any) => {
    try {
      await api.markNotificationRead(id);
      setUnreadNotifs(prev => prev.filter(n => n.id !== id));
      if (popupNotif?.id === id) setPopupNotif(null);
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadNotifs([]);
      setPopupNotif(null);
    } catch (e) {}
  };

  const dismissPopup = () => {
    setPopupNotif(null);
  };

  const unreadCount = unreadNotifs.length;

  return (
    <>
      {/* Bell Button with Badge */}
      <div ref={dropdownRef} className="relative">
        <button
          title="Notifikasi"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-2.5 rounded-full hover:bg-slate-100 transition-all flex items-center justify-center group relative transform active:scale-95 shadow-sm bg-white border border-slate-100"
        >
          <Bell className={cn("w-5 h-5 group-hover:text-[#6d4d42]", unreadCount > 0 && "text-[#8b7365]")} />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full border-2 border-white flex items-center justify-center"
            >
              <span className="text-[9px] font-black text-white leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
            </motion.span>
          )}
        </button>

        {/* Dropdown Panel */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-3 w-[380px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-[200]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#8b7365]" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Notifikasi</h3>
                  {unreadCount > 0 && (
                    <span className="text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">{unreadCount} baru</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[9px] font-black text-[#8b7365] uppercase tracking-widest hover:underline"
                    >
                      Baca Semua
                    </button>
                  )}
                  {onBellClick && (
                    <button
                      onClick={() => { setIsDropdownOpen(false); onBellClick(); }}
                      className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                    >
                      Kelola →
                    </button>
                  )}
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-[360px] overflow-y-auto custom-scrollbar divide-y divide-slate-50">
                {unreadNotifs.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center opacity-20">
                    <Bell className="w-10 h-10 mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Semua sudah dibaca</p>
                  </div>
                ) : (
                  unreadNotifs.slice(0, 8).map((notif) => {
                    const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                    const IconComp = config.icon;
                    return (
                      <div
                        key={notif.id}
                        className="p-4 flex items-start gap-3 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => handleMarkRead(notif.id)}
                      >
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", config.bgLight)}>
                          <IconComp className={cn("w-4 h-4", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate mb-0.5">{notif.title}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                          <p className="text-[8px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">
                            {notif.sent_at && new Date(notif.sent_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                          className="p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {onBellClick && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <button
                    onClick={() => { setIsDropdownOpen(false); onBellClick(); }}
                    className="w-full py-2.5 text-[10px] font-black text-[#8b7365] uppercase tracking-widest hover:bg-[#8b7365]/5 rounded-xl transition-all"
                  >
                    Lihat Semua Notifikasi →
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Popup Toast (new notification) */}
      <AnimatePresence>
        {popupNotif && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-6 right-6 z-[9999] w-[380px]"
          >
            <div className={cn(
              "bg-white rounded-3xl shadow-2xl border-2 overflow-hidden",
              TYPE_CONFIG[popupNotif.type]?.borderColor || 'border-blue-300'
            )}>
              {/* Top Accent Bar */}
              <div className={cn("h-1.5 bg-gradient-to-r", TYPE_CONFIG[popupNotif.type]?.gradient || 'from-blue-500 to-blue-600')} />
              
              <div className="p-5 flex items-start gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative", TYPE_CONFIG[popupNotif.type]?.bgLight || 'bg-blue-50')}>
                  {React.createElement(TYPE_CONFIG[popupNotif.type]?.icon || Info, {
                    className: cn("w-6 h-6", TYPE_CONFIG[popupNotif.type]?.color || 'text-blue-600')
                  })}
                  {/* Pulse ring */}
                  <span className={cn(
                    "absolute inset-0 rounded-2xl animate-ping opacity-20",
                    TYPE_CONFIG[popupNotif.type]?.bgLight || 'bg-blue-50'
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Volume2 className="w-3 h-3 text-[#8b7365] animate-pulse" />
                    <span className="text-[8px] font-black text-[#8b7365] uppercase tracking-widest">Notifikasi Baru</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 mb-1 leading-tight">{popupNotif.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{popupNotif.message}</p>
                  {popupNotif.sender_name && (
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">Dari: {popupNotif.sender_name}</p>
                  )}
                </div>

                <button
                  onClick={dismissPopup}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-300 hover:text-slate-500 shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action bar */}
              <div className="px-5 pb-4 flex gap-2">
                <button
                  onClick={() => { handleMarkRead(popupNotif.id); }}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Tandai Dibaca
                </button>
                <button
                  onClick={dismissPopup}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
