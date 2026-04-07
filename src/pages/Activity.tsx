import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, History, User, Users, ChevronLeft, ChevronRight, X, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import LoadingScreen from '../components/LoadingScreen';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface BlastLog {
  id: string;
  promo_name: string;
  sender_name: string;
  recipient_count: number;
  created_at: string;
  catalogue_preview?: string;
}

export default function Activity() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [logs, setLogs] = useState<BlastLog[]>([]);
  const [selectedDayLogs, setSelectedDayLogs] = useState<BlastLog[] | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBlastLogs();
      setLogs(data);
    } catch (e) {
      console.error('Gagal ambil log:', e);
      toast.error('Gagal memuat log aktivitas.');
    } finally {
      setIsLoading(false);
    }
  };

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const startOfMonthDay = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

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

    // Empty spaces for start offset
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-50/50 rounded-xl" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dayLogs = getLogsForDate(day);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const hasActivity = dayLogs.length > 0;

      days.push(
        <motion.button
          key={day}
          whileHover={hasActivity ? { scale: 0.98 } : {}}
          whileTap={hasActivity ? { scale: 0.95 } : {}}
          onClick={() => handleDateClick(day)}
          className={cn(
            "h-24 md:h-32 p-3 border border-slate-100 rounded-xl transition-all flex flex-col items-start gap-1 group relative",
            hasActivity ? "bg-white hover:border-emerald-200 hover:shadow-md cursor-pointer" : "bg-white opacity-50 cursor-default",
            isToday && "ring-2 ring-emerald-500/20 border-emerald-500/50 shadow-[inset_0_0_12px_rgba(16,185,129,0.05)]"
          )}
        >
          <span className={cn(
            "text-sm font-bold",
            isToday ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
          )}>
            {day}
            {isToday && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500/70">Hari Ini</span>}
          </span>
          
          {hasActivity && (
            <div className="flex flex-col gap-1 w-full mt-1 overflow-hidden">
               {dayLogs.slice(0, 2).map((log, idx) => (
                 <div key={log.id} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-bold truncate">
                   {log.promo_name} ({log.recipient_count})
                 </div>
               ))}
               {dayLogs.length > 2 && (
                 <div className="text-[9px] text-slate-400 font-bold pl-1">
                   +{dayLogs.length - 2} lagi...
                 </div>
               )}
            </div>
          )}

          {hasActivity && (
            <div className="absolute bottom-2 right-2 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          )}
        </motion.button>
      );
    }

    return days;
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <AnimatePresence>
        {selectedDayLogs && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Aktivitas Blast</h2>
                  <p className="text-slate-500 text-sm font-medium">{selectedDateStr}</p>
                </div>
                <button onClick={() => setSelectedDayLogs(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {selectedDayLogs.map(log => (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <Megaphone className="w-5 h-5 text-emerald-600" />
                       </div>
                       <div>
                          <p className="font-bold text-slate-800">{log.promo_name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Target: {log.recipient_count} Pelanggan</p>
                       </div>
                    </div>

                    {log.catalogue_preview && (
                      <div className="mt-4 mb-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video relative group">
                        <img src={log.catalogue_preview} alt="Preview Katalog" className="w-full h-full object-contain" />
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[9px] text-white font-bold">
                          Pratinjau Katalog
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200/50">
                       <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600">{log.sender_name}</span>
                       </div>
                       <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setSelectedDayLogs(null)}
                className="w-full mt-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mb-10 flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#8b7365]/10 rounded-2xl flex items-center justify-center text-[#8b7365] shadow-sm shadow-[#8b7365]/10">
            <History className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">Activity Log</h1>
            <p className="text-[11px] font-bold text-slate-400 tracking-widest leading-none">Lacak riwayat promosi dan performa blast Anda</p>
          </div>
        </div>
        <div className="flex items-center bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm">
           <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5 text-slate-800" /></button>
           <div className="px-4 text-sm font-black text-slate-800 uppercase tracking-widest min-w-[150px] text-center">
             {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
           </div>
           <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight className="w-5 h-5 text-slate-800" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center py-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">{d}</div>
        ))}
      </div>

      {isLoading ? (
        <LoadingScreen 
          message="Menyiapkan Kalender Aktivitas..."
          subMessage="Kami sedang menyinkronkan riwayat promosi dan blast terbaru untuk Anda."
        />
      ) : (
        <div className="grid grid-cols-7 gap-4">
          {renderCalendar()}
        </div>
      )}
    </div>
  );
}
