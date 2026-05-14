import React from 'react';
import { Search, Menu, ChevronLeft, Settings as SettingsIcon, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
import NotificationPopup from './NotificationPopup';

type Page = 'dashboard' | 'catalogue' | 'promotions' | 'history' | 'settings' | 'activity' | 'products' | 'inventory' | 'supply' | 'pos' | 'revenue' | 'analytics' | 'notifications' | 'stock_opname' | 'campaigns';

interface AppHeaderProps {
  currentPage: Page;
  isSidebarExpanded: boolean;
  userProfile: UserProfile;
  onToggleSidebar: () => void;
  onNavigate: (page: Page) => void;
}

export default function AppHeader({ currentPage, isSidebarExpanded, userProfile, onToggleSidebar, onNavigate }: AppHeaderProps) {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm no-print">
      <div className="flex items-center gap-3 md:gap-8 flex-1">
        <button 
          onClick={onToggleSidebar}
          className="w-12 h-12 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 rounded-xl transition-all duration-300 shadow-sm border border-slate-100 flex items-center justify-center group active:scale-95 shrink-0"
          title={isSidebarExpanded ? "Sembunyikan Sidebar" : "Tampilkan Sidebar"}
        >
          <div className="relative">
             {isSidebarExpanded ? (
               <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
             ) : (
               <Menu className="w-5 h-5" />
             )}
          </div>
        </button>

        <div className="flex items-center gap-0 -ml-2">
          <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-display font-black text-slate-900 tracking-tighter leading-none uppercase">myStore</h1>
              <span className="text-[9px] font-display font-bold text-[#8b7365]/60 uppercase tracking-[0.3em] mt-1 ml-0.5 leading-none">Studio</span>
           </div>
        </div>
        
        <div className="relative w-full max-w-lg hidden lg:flex items-center">
           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
             <Search className="h-4 w-4 text-[#6d4d42]/50" />
           </div>
           <input 
             type="text" 
             className="w-full pl-11 pr-4 py-2 bg-[#f4f4f2] border-none rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6d4d42]/10 text-sm placeholder-slate-400 font-medium transition-all" 
             placeholder="Search inventory or tools..." 
           />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-5 text-[#6d4d42]/70 ml-2 md:ml-8">
         <NotificationPopup onBellClick={() => onNavigate('notifications')} userProfile={userProfile} />               
         <div className="relative group/settings">
           <button 
             onClick={() => onNavigate('settings')}
             className={cn(
               "hidden sm:flex p-2.5 rounded-full hover:bg-slate-100 transition-all items-center justify-center group transform active:scale-95 shadow-sm border",
               currentPage === 'settings' ? "bg-[#8b7365] text-white border-[#8b7365]" : "bg-white border-slate-100 text-[#6d4d42]/70"
             )}
           >
              <SettingsIcon className="w-5 h-5 group-hover:text-inherit" />
           </button>
           
           <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover/settings:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-[120] shadow-xl border border-slate-700 translate-y-2 group-hover/settings:translate-y-0">
              Pengaturan Profil
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-x-[6px] border-x-transparent border-b-[6px] border-b-slate-800" />
           </div>
         </div>

         <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

         <button 
           onClick={() => onNavigate('settings')}
           title={`Profil: ${userProfile.nickname}`}
           className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-[#f4f4f2]/50 hover:bg-white border border-slate-200/50 transition-all transform active:scale-95 shadow-sm group"
         >
            <div className="w-9 h-9 md:w-10 md:h-10 bg-[#8b7365] text-white rounded-full flex items-center justify-center shadow-inner">
               <User className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="hidden md:flex flex-col items-start leading-tight">
               <span className="text-xs font-display font-black text-slate-800 tracking-tighter truncate max-w-[120px]">
                  {userProfile.nickname}
               </span>
               <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                 <span className="text-[9px] font-bold text-[#8b7365] uppercase tracking-widest whitespace-nowrap">
                    {userProfile.role}
                 </span>
                 {userProfile.company?.name && (
                   <>
                     <span className="text-[8px] text-slate-300">•</span>
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                        {userProfile.company.name}
                     </span>
                   </>
                 )}
               </div>
            </div>
         </button>
      </div>
    </header>
  );
}
