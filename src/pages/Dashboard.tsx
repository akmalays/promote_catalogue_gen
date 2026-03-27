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
          Your pantry is well-stocked and ready for the day. Here is a summary of your store's creative performance and inventory health.
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
            <span className="inline-block px-2 py-1 bg-black/5 rounded text-[10px] font-bold uppercase tracking-widest mb-3">Creative Tool</span>
            <h2 className="text-2xl font-bold mb-2">Catalogue Generator</h2>
            <p className="text-xs font-medium text-slate-600 mb-6 leading-relaxed">
              Transform your inventory list into a beautifully curated digital catalogue for your customers.
            </p>
            <button
              onClick={() => onNavigate('catalogue')}
              className="bg-[#8b7365] text-white px-5 py-2.5 rounded hover:bg-[#725e52] transition-colors text-sm flex items-center gap-2 font-medium"
            >
              Create New Catalogue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Promotions/Banner Card */}
        <div className="group relative bg-[#dfeeff] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all h-[240px] border border-blue-100 flex flex-col justify-center items-center text-center">
          <div className="w-10 h-10 mb-4 text-[#8b7365]">
            <Megaphone className="w-full h-full" />
          </div>
          <h2 className="text-xl font-bold text-[#8b7365] mb-2">Promotions Tool</h2>
          <p className="text-xs font-medium text-slate-500 mb-6 max-w-xs leading-relaxed">
            Manage your audience and blast professional promotional messages directly to your customers in seconds.
          </p>
          <div className="flex gap-2">
            <button className="bg-white/50 w-10 h-10 flex items-center justify-center rounded border border-white hover:bg-white transition-colors text-slate-500">
              <span className="font-bold text-xs">%</span>
            </button>
             <button className="bg-white/50 w-10 h-10 flex items-center justify-center rounded border border-white hover:bg-white transition-colors text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            </button>
          </div>
          <button
            onClick={() => onNavigate('promotions')}
            className="mt-6 bg-white text-slate-700 font-semibold px-8 py-2.5 rounded hover:bg-slate-50 transition-colors w-full border border-dashed border-blue-200 text-sm shadow-sm"
          >
            Launch Designer
          </button>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Recent Activity</h3>
            <button className="text-xs font-bold text-slate-500 hover:text-slate-800">View All History</button>
          </div>
          <div className="space-y-4">
            {[
              { icon: <Book className="w-4 h-4 text-slate-600" />, title: 'Weekly Staples Catalogue', meta: 'Updated 15 mins ago • 142 items listed', badge: 'PUBLISHED', badgeColor: 'bg-[#f0e6e6] text-[#8b7365]' },
              { icon: <Megaphone className="w-4 h-4 text-slate-600" />, title: 'Eid Mubarak Special Sale', meta: 'Draft created yesterday • Banner Design', badge: 'DRAFT', badgeColor: 'bg-slate-100 text-slate-500' },
              { icon: <BookOpen className="w-4 h-4 text-slate-600" />, title: 'Premium Rice Stock Inflow', meta: 'Inventory update • +500kg', badge: 'STOCK', badgeColor: 'bg-[#def0ff] text-blue-700' },
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
            <h3 className="font-bold text-slate-800 flex items-center gap-2">Store Pulse</h3>
          </div>
          <div className="space-y-4">
             {/* Active Catalogues */}
             <div className="bg-[#f0ece9] rounded-xl p-5 border border-transparent hover:border-[#dfd8d4] transition-colors">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-1">Active Catalogues</p>
                <div className="flex items-end gap-3">
                   <span className="text-4xl font-serif text-[#8b7365]">12</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-emerald-600">
                   <Activity className="w-3 h-3" />
                   <span>4 new this month</span>
                </div>
             </div>

             {/* Stock Health */}
             <div className="bg-[#f4f2ef] rounded-xl p-5 border border-transparent hover:border-[#dfd8d4] transition-colors">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-1">Stock Health</p>
                <div className="flex items-end gap-3">
                   <span className="text-4xl font-serif text-[#8b7365]">94%</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-amber-600">
                   <AlertTriangle className="w-3 h-3" />
                   <span>3 items low on stock</span>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
