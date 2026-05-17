import React from 'react';
import { Search, Menu, ChevronLeft, Moon, Sun, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
import NotificationPopup from './NotificationPopup';

type Page = 'dashboard' | 'catalogue' | 'promotions' | 'history' | 'settings' | 'activity' | 'products' | 'inventory' | 'supply' | 'pos' | 'revenue' | 'analytics' | 'notifications' | 'stock_opname' | 'campaigns' | 'reports';

interface AppHeaderProps {
  currentPage: Page;
  isSidebarExpanded: boolean;
  userProfile: UserProfile;
  isDarkMode: boolean;
  onToggleSidebar: () => void;
  onNavigate: (page: Page) => void;
  onToggleDarkMode: () => void;
}

export default function AppHeader({ currentPage, isSidebarExpanded, userProfile, isDarkMode, onToggleSidebar, onNavigate, onToggleDarkMode }: AppHeaderProps) {
  return (
    <header className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm border-b border-stone-200 dark:border-stone-800 px-4 md:px-6 h-[60px] flex items-center justify-between sticky top-0 z-40 no-print">
      <div className="flex items-center gap-3 flex-1">
        {/* Sidebar toggle */}
        <button 
          onClick={onToggleSidebar}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors"
          title={isSidebarExpanded ? "Tutup sidebar" : "Buka sidebar"}
        >
          {isSidebarExpanded ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Search */}
        <div className="relative w-full max-w-md hidden md:flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" />
          <input 
            type="text" 
            className="w-full pl-9 pr-4 py-2 bg-stone-100 dark:bg-stone-800 border-none rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10 transition-shadow" 
            placeholder="Cari produk, fitur..." 
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Dark mode toggle */}
        <div className="relative group/dark">
          <button 
            onClick={onToggleDarkMode}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-xs font-medium rounded-md opacity-0 invisible group-hover/dark:opacity-100 group-hover/dark:visible pointer-events-none transition-all duration-150 whitespace-nowrap z-[9999] shadow-md">
            {isDarkMode ? 'Mode terang' : 'Mode gelap'}
          </div>
        </div>

        {/* Notifications */}
        <NotificationPopup onBellClick={() => onNavigate('notifications')} userProfile={userProfile} />               

        {/* Divider */}
        <div className="h-6 w-px bg-stone-200 dark:bg-stone-700 mx-1 hidden md:block" />

        {/* Profile */}
        <button 
          onClick={() => onNavigate('settings')}
          title={`Profil: ${userProfile.nickname}`}
          className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <div className="w-8 h-8 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-full flex items-center justify-center text-xs font-bold">
            {userProfile.nickname?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
          </div>
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate max-w-[100px]">
              {userProfile.nickname}
            </span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate max-w-[120px]">
              {userProfile.company?.name || userProfile.role}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}
