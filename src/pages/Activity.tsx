import React, { useState, useEffect } from 'react';
import { History, User, ChevronLeft, ChevronRight, X, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import LoadingScreen from '../components/LoadingScreen';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { UserProfile } from '../types';

interface BlastLog {
  id: string;
  promo_name: string;
  sender_name: string;
  recipient_count: number;
  created_at: string;
  catalogue_preview?: string;
}

export default function Activity({ userProfile }: { userProfile: UserProfile }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState<BlastLog[]>([]);
  const [selectedDayLogs, setSelectedDayLogs] = useState<BlastLog[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try { setLogs(await api.getBlastLogs(userProfile.company_id!)); }
    catch { toast.error('Gagal memuat log aktivitas.'); }
    finally { setIsLoading(false); }
  };

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const startOfMonthDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const getLogsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return logs.filter(log => log.created_at.startsWith(dateStr));
  };

  const handleDateClick = (day: number) => {
    const dayLogs = getLogsForDate(day);
    if (dayLogs.length > 0) {
      setSelectedDayLogs(dayLogs);
      setSelectedDateStr(`${day} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`);
    }
  };

  const renderCalendar = () => {
    const totalDays = daysInMonth(currentDate);
    const startOffset = startOfMonthDay(currentDate);
    const days = [];

    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 md:h-24" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dayLogs = getLogsForDate(day);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const hasActivity = dayLogs.length > 0;

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          disabled={!hasActivity}
          className={cn(
            "h-20 md:h-24 p-2 rounded-lg border text-left flex flex-col transition-colors",
            hasActivity
              ? "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 cursor-pointer"
              : "bg-stone-50 dark:bg-stone-900/50 border-transparent cursor-default",
            isToday && "ring-2 ring-stone-900/10 dark:ring-stone-100/10"
          )}
        >
          <span className={cn(
            "text-xs font-medium",
            isToday ? "text-stone-900 dark:text-stone-100" : "text-stone-400 dark:text-stone-500"
          )}>
            {day}
          </span>
          
          {hasActivity && (
            <div className="flex flex-col gap-0.5 mt-1 overflow-hidden flex-1">
              {dayLogs.slice(0, 2).map((log) => (
                <div key={log.id} className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded truncate">
                  {log.promo_name}
                </div>
              ))}
              {dayLogs.length > 2 && (
                <span className="text-[10px] text-stone-400 dark:text-stone-500">+{dayLogs.length - 2} lagi</span>
              )}
            </div>
          )}
        </button>
      );
    }

    return days;
  };

  if (isLoading) {
    return <LoadingScreen message="Memuat aktivitas..." subMessage="Menyinkronkan riwayat promosi." />;
  }

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Activity Log</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Riwayat promosi dan blast.</p>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-1">
          <button onClick={prevMonth} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors"><ChevronLeft className="w-4 h-4 text-stone-600 dark:text-stone-300" /></button>
          <span className="px-3 text-sm font-medium text-stone-900 dark:text-stone-100 min-w-[140px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors"><ChevronRight className="w-4 h-4 text-stone-600 dark:text-stone-300" /></button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
          <div key={d} className="text-center py-2 text-xs font-medium text-stone-400 dark:text-stone-500">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendar()}
      </div>

      {/* Day Detail Modal */}
      <AnimatePresence>
        {selectedDayLogs && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDayLogs(null)} className="absolute inset-0 bg-black/40" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative bg-white dark:bg-stone-900 rounded-xl max-w-lg w-full shadow-xl border border-stone-200 dark:border-stone-800 z-10 max-h-[80vh] flex flex-col"
            >
              <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Aktivitas Blast</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{selectedDateStr}</p>
                </div>
                <button onClick={() => setSelectedDayLogs(null)} className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {selectedDayLogs.map(log => (
                  <div key={log.id} className="p-4 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg flex items-center justify-center">
                        <Megaphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">{log.promo_name}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{log.recipient_count} penerima</p>
                      </div>
                    </div>

                    {log.catalogue_preview && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 aspect-video">
                        <img src={log.catalogue_preview} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-200 dark:border-stone-700 text-xs text-stone-500 dark:text-stone-400">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        <span>{log.sender_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <History className="w-3 h-3" />
                        <span>{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-stone-200 dark:border-stone-800 shrink-0">
                <button onClick={() => setSelectedDayLogs(null)} className="w-full py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Tutup</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
