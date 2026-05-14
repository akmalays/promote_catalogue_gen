import React from 'react';
import {
  Plus, Package, BookOpen, Megaphone, LayoutDashboard, TrendingUp,
  QrCode, LogOut, Bell, Settings as SettingsIcon,
  History, Truck, BarChart3, ClipboardCheck, Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

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
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5 shrink-0" /> },
  { id: 'campaigns', label: 'Promo & Campaign', icon: <Gift className="w-5 h-5 shrink-0" /> },
  { id: 'revenue', label: 'Sales Report', icon: <TrendingUp className="w-5 h-5 shrink-0" /> },
  { id: 'products', label: 'Product Database', icon: <Package className="w-5 h-5 shrink-0" /> },
  { id: 'supply', label: 'Supply Inbound', icon: <Truck className="w-5 h-5 shrink-0" /> },
  { id: 'stock_opname', label: 'Stock Opname', icon: <ClipboardCheck className="w-5 h-5 shrink-0" /> },
  { id: 'pos', label: 'POS', icon: <QrCode className="w-5 h-5 shrink-0" /> },
  { id: 'activity', label: 'Activity Log', icon: <History className="w-5 h-5 shrink-0" /> },
  { id: 'analytics', label: 'Revenue', icon: <BarChart3 className="w-5 h-5 shrink-0" /> },
  { id: 'notifications', label: 'Notifikasi', icon: <Bell className="w-5 h-5 shrink-0" /> },
  { id: 'catalogue', label: 'Catalogue', icon: <BookOpen className="w-5 h-5 shrink-0" /> },
  { id: 'promotions', label: 'Promotions', icon: <Megaphone className="w-5 h-5 shrink-0" /> },
  { id: 'history', label: 'Drafts', icon: <Plus className="w-5 h-5 shrink-0" /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5 shrink-0" /> },
];

export default function Sidebar({ currentPage, isSidebarExpanded, userProfile, onNavigate, onLogout, onResetEditing }: SidebarProps) {
  const navItems = allNavItems.filter(item => {
    const role = userProfile.role?.toLowerCase() || 'kasir';
    const isAdmin = role.includes('admin') || role.includes('owner') || role.includes('administrator');
    const isManager = role.includes('manager');
    const isKasir = role.includes('kasir');

    if (isAdmin) return true;
    if (['settings', 'dashboard'].includes(item.id)) return true;
    if (isManager || isAdmin) return ['catalogue', 'promotions', 'campaigns', 'history', 'revenue', 'pos', 'products', 'supply', 'notifications', 'stock_opname'].includes(item.id);
    if (isKasir) return ['pos', 'revenue'].includes(item.id);

    return false;
  });

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isSidebarExpanded ? 260 : 80,
        x: (typeof window !== 'undefined' && window.innerWidth < 1024 && !isSidebarExpanded) ? -260 : 0
      }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className={cn(
        "h-full flex flex-col bg-white border-r border-slate-200 z-[100] relative no-print",
        "fixed lg:relative top-0 left-0"
      )}
    >
      <div className="h-10" />

      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-visible">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'catalogue') onResetEditing();
              onNavigate(item.id);
            }}
            title={item.label}
            className={cn(
              "flex items-center group relative transition-all duration-200 rounded-xl",
              isSidebarExpanded ? "w-full px-4 py-3.5 justify-start" : "w-12 h-12 justify-center mx-auto",
              currentPage === item.id
                ? "bg-[#8b7365] text-white shadow-lg shadow-[#8b7365]/20 translate-x-1"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            {item.icon}
            <AnimatePresence>
              {isSidebarExpanded && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="ml-3 font-bold text-sm whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>

            {!isSidebarExpanded && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-800 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-1 pointer-events-none transition-all duration-200 whitespace-nowrap z-[120] shadow-xl border border-slate-700">
                  {item.label}
                  <div className="absolute top-1/2 -left-1.5 transform -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-800" />
              </div>
            )}
            
            {currentPage === item.id && isSidebarExpanded && (
              <div className="absolute left-0 w-1.5 h-6 bg-yellow-400 rounded-full my-auto inset-y-0 -translate-x-1/2" />
            )}
          </button>
        ))}
      </nav>

      <div className="px-4 py-6 border-t border-slate-100">
         <button 
           onClick={onLogout} 
           className={cn(
             "w-full flex items-center group relative p-3.5 rounded-xl transition-all duration-200",
             isSidebarExpanded ? "justify-start gap-3 bg-red-50 text-red-600 hover:bg-red-100" : "justify-center text-slate-400 hover:text-red-500 hover:bg-red-50"
           )}
         >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarExpanded && <span className="text-sm font-bold">Logout</span>}
            
            {!isSidebarExpanded && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-800 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-1 pointer-events-none transition-all duration-200 whitespace-nowrap z-[120] shadow-xl border border-slate-700">
                  Keluar Sistem
                  <div className="absolute top-1/2 -left-1.5 transform -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-800" />
              </div>
            )}
         </button>
      </div>
    </motion.aside>
  );
}
