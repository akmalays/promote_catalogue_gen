import React from 'react';
import { BookOpen, Megaphone, ArrowRight, Book, Activity, AlertTriangle } from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: 'catalogue' | 'promotions') => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="flex-1 p-8 overflow-y-auto">
      {/* Greeting */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold font-serif text-slate-800 mb-3 tracking-tight">Hi, User!</h1>
        <p className="text-slate-500 text-sm max-w-lg leading-relaxed font-medium">
          Sistem Anda telah siap! Berikut adalah ringkasan dari performa pembuatan katalog, draf kampanye promosi, dan metrik audiens saat ini.
        </p>
      </div>

      {/* Main Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Catalogue Generator Card */}
        <div className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all h-[240px] flex flex-col justify-end p-6 border border-slate-200">
          <div className="absolute inset-0 bg-[#e8e4db]">
            {/* Background decorative image placeholder */}
            <div className="absolute right-0 bottom-0 top-0 w-2/3 opacity-30 bg-gradient-to-l from-black/20 to-transparent mix-blend-overlay"></div>
          </div>
          <div className="relative z-10 w-full md:w-4/5 text-slate-800">
            <span className="inline-block px-2 py-1 bg-black/5 rounded text-[10px] font-bold uppercase tracking-widest mb-3">Produksi Konten</span>
            <h2 className="text-2xl font-bold mb-2">Editor Katalog</h2>
            <p className="text-xs font-medium text-slate-600 mb-6 leading-relaxed">
              Ubah daftar produk Anda menjadi brosur penawaran digital yang menawan untuk pelanggan dengan cepat.
            </p>
            <button
              onClick={() => onNavigate('catalogue')}
              className="bg-[#8b7365] text-white px-5 py-2.5 rounded hover:bg-[#725e52] transition-colors text-sm flex items-center gap-2 font-medium"
            >
              Masuk ke Editor Katalog
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Promotions/Banner Card */}
        <div className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all h-[240px] flex flex-col justify-end p-6 border border-slate-200">
          <div className="absolute inset-0 bg-[#d9c5ba]">
            {/* Background decorative image placeholder */}
            <div className="absolute right-0 bottom-0 top-0 w-2/3 opacity-30 bg-gradient-to-l from-black/20 to-transparent mix-blend-overlay"></div>
          </div>
          <div className="relative z-10 w-full md:w-4/5 text-slate-800">
            <span className="inline-block px-2 py-1 bg-black/5 rounded text-[10px] font-bold uppercase tracking-widest mb-3">Distribusi Promo</span>
            <h2 className="text-2xl font-bold mb-2">WhatsApp Blast</h2>
            <p className="text-xs font-medium text-slate-700 mb-6 leading-relaxed">
              Kelola daftar pengunjung dan siarkan promosi pintar secara massal agar pelanggan langsung berbelanja.
            </p>
            <button
              onClick={() => onNavigate('promotions')}
              className="bg-[#8b7365] text-white px-5 py-2.5 rounded hover:bg-[#725e52] transition-colors text-sm flex items-center gap-2 font-medium w-fit"
            >
              Mulai Broadcast Promo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Aktivitas Terakhir</h3>
            <button className="text-xs font-bold text-slate-500 hover:text-slate-800">Semua Riwayat</button>
          </div>
          <div className="space-y-4">
            {[
              { icon: <Book className="w-4 h-4 text-slate-600" />, title: 'Katalog Mingguan - Promo Imlek', meta: 'Diperbarui 15 mnt lalu • 12 produk siap', badge: 'PUBLISHED', badgeColor: 'bg-[#f0e6e6] text-[#8b7365]' },
              { icon: <Megaphone className="w-4 h-4 text-slate-600" />, title: 'Siaran Flash Sale', meta: 'Draf pesan dibuat kemarin • 45 kontak total', badge: 'DRAFT', badgeColor: 'bg-slate-100 text-slate-500' },
              { icon: <Activity className="w-4 h-4 text-slate-600" />, title: 'Penambahan Kontak Baru', meta: 'Daftar pengunjung di-update • +25 pelanggan', badge: 'AUDIENS', badgeColor: 'bg-[#dfefe9] text-emerald-700' },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-colors cursor-pointer">
                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="font-bold text-sm text-slate-800 truncate mb-1">{activity.title}</p>
                  <p className="text-[10px] font-medium text-slate-400">{activity.meta}</p>
                </div>
                <div className={`px-2 py-1 rounded text-[8px] font-bold tracking-widest ${activity.badgeColor}`}>
                  {activity.badge}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Store Pulse */}
        <div>
           <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">Laporan Metrik</h3>
          </div>
          <div className="space-y-4">
             {/* Total Audiens */}
             <div className="bg-[#f0ece9] rounded-xl p-5 border border-transparent hover:border-[#dfd8d4] transition-colors">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-1">Total Pelanggan Aktif</p>
                <div className="flex items-end gap-3">
                   <span className="text-4xl font-serif text-[#8b7365]">48</span>
                   <span className="text-sm font-bold text-slate-500 mb-1">kontak</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-[#8b7365]">
                   <Activity className="w-3 h-3" />
                   <span>+12 kontak baru bulan ini</span>
                </div>
             </div>

             {/* Tingkat Buka WA */}
             <div className="bg-[#f4f2ef] rounded-xl p-5 border border-transparent hover:border-[#dfd8d4] transition-colors">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-1">Estimasi Konversi Promo</p>
                <div className="flex items-end gap-3">
                   <span className="text-4xl font-serif text-[#8b7365]">94%</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-emerald-600">
                   <Activity className="w-3 h-3" />
                   <span>Di atas rata-rata performa</span>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
