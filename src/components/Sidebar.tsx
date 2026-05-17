import React from 'react';
import {
  Plus, Package, BookOpen, Megaphone, LayoutDashboard, TrendingUp,
  QrCode, LogOut, Bell, Settings as SettingsIcon,
  History, Truck, BarChart3, ClipboardCheck, Gift
} from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
import logoAsset from '../assets/img/pcs_logo.png';

type Page = 'dashboard' | 'catalogue' | 'promotions' | 'history' | 'settings' | 'activity' | 'products' | 'inventory' | 'supply' | 'pos' | 'revenue' | 'analytics' | 'notifications' | 'stock_opname' | 'campaigns';

interface SidebarProps {
  currentPage: Page;
  isSidebarExpanded: boolean;
  userProfile: UserProfile;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  onResetEditing: () => void;
}

const allNavItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'campaigns', label: 'Promo & Campaign', icon: <Gift className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'revenue', label: 'Sales Report', icon: <TrendingUp className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'products', label: 'Product Database', icon: <Package className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'supply', label: 'Supply Inbound', icon: <Truck className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'stock_opname', label: 'Stock Opname', icon: <ClipboardCheck className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'pos', label: 'POS', icon: <QrCode className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'activity', label: 'Activity Log', icon: <History className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'analytics', label: 'Revenue', icon: <BarChart3 className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'notifications', label: 'Notifikasi', icon: <Bell className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'catalogue', label: 'Catalogue', icon: <BookOpen className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'promotions', label: 'Promotions', icon: <Megaphone className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'history', label: 'Drafts', icon: <Plus className="w-[18px] h-[18px] shrink-0" /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-[18px] h-[18px] shrink-0" /> },
];

export default function Sidebar({ currentPage, isSidebarExpanded, userProfile, onNavigate, onLogout, onResetEditing }: SidebarProps) {
  const navItems = allNavItems.filter(item => {
    const role = userProfile.role?.toLowerCase() || 'kasir';
    const isAdmin = role.includes('admin') || role.includes('owner') || role.includes('administrator');
    const isManager = role.includes('manager');
    const isKasir = role.includes('kasir');

    if (isAdmin) return true;
    if (['settings', 'dashboard'].includes(item.id)) return true;
    if (isManager) return ['catalogue', 'promotions', 'campaigns', 'history', 'revenue', 'pos', 'products', 'supply', 'notifications', 'stock_opname'].includes(item.id);
    if (isKasir) return ['pos', 'revenue'].includes(item.id);

    return false;
  });

  return (
    <aside 
      className={cn(
        "h-full flex flex-col border-r no-print transition-all duration-200 ease-out",
        "bg-white border-stone-200 dark:bg-stone-900 dark:border-stone-800",
        "fixed lg:relative top-0 left-0 z-[100]",
        isSidebarExpanded ? "w-[220px]" : "w-[64px]",
        !isSidebarExpanded && "max-lg:-translate-x-full"
      )}
    >
      {/* Logo area */}
      <div className={cn(
        "flex items-center border-b border-stone-200 dark:border-stone-800 shrink-0 h-[60px]",
        isSidebarExpanded ? "px-5 gap-3" : "px-0 justify-center"
      )}>
        <img src={logoAsset} alt="Logo" className="w-10 h-10 object-contain shrink-0" />
        {isSidebarExpanded && (
          <div className="flex flex-col leading-none">
            <span className="text-md font-bold text-stone-900 dark:text-stone-100">myStore</span>
            <span className="text-[12px] text-stone-400 dark:text-stone-500">Studio</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-3 space-y-0.5 overflow-x-visible overflow-y-auto",
        isSidebarExpanded ? "px-3" : "px-2"
      )}>
        {navItems.map(item => (
          <div key={item.id} className="relative group/nav">
            <button
              onClick={() => {
                if (item.id === 'catalogue') onResetEditing();
                onNavigate(item.id);
              }}
              className={cn(
                "flex items-center rounded-lg transition-colors duration-150 w-full",
                isSidebarExpanded ? "px-3 py-2.5 gap-3" : "p-2.5 justify-center",
                currentPage === item.id
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800"
              )}
            >
              {item.icon}
              {isSidebarExpanded && (
                <span className="text-[13px] font-medium whitespace-nowrap truncate">
                  {item.label}
                </span>
              )}
            </button>
            {/* Tooltip */}
            {!isSidebarExpanded && (
              <div className="fixed left-[72px] top-auto ml-0 px-2.5 py-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-xs font-medium rounded-md opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible pointer-events-none transition-all duration-150 whitespace-nowrap z-[9999] shadow-md -translate-y-1/2" style={{ marginTop: '-12px' }}>
                {item.label}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className={cn(
        "border-t border-stone-200 dark:border-stone-800 shrink-0 relative group/logout",
        isSidebarExpanded ? "px-3 py-3" : "px-2 py-3"
      )}>
        <button 
          onClick={onLogout} 
          className={cn(
            "flex items-center rounded-lg transition-colors duration-150 w-full text-stone-500 hover:text-red-600 hover:bg-red-50 dark:text-stone-400 dark:hover:text-red-400 dark:hover:bg-red-950/30",
            isSidebarExpanded ? "px-3 py-2.5 gap-3" : "p-2.5 justify-center"
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {isSidebarExpanded && <span className="text-[13px] font-medium">Keluar</span>}
        </button>
        {!isSidebarExpanded && (
          <div className="fixed left-[72px] px-2.5 py-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-xs font-medium rounded-md opacity-0 invisible group-hover/logout:opacity-100 group-hover/logout:visible pointer-events-none transition-all duration-150 whitespace-nowrap z-[9999] shadow-md" style={{ marginTop: '-28px' }}>
            Keluar
          </div>
        )}
      </div>
    </aside>
  );
}
