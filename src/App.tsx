import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import { SavedCatalogue, UserProfile } from './types';

// Pages
import Dashboard from './pages/Dashboard';
import Promotions from './pages/Promotions';
import Login from './pages/Login';
import CatalogueHistory from './pages/CatalogueHistory';
import SettingsPage from './pages/Settings';
import Activity from './pages/Activity';
import Analytics from './pages/Analytics';
import ProductInventory from './pages/ProductInventory';
import Supply from './pages/Supply';
import POS from './pages/POS';
import SalesRevenue from './pages/SalesRevenue';
import Notifications from './pages/Notifications';
import StockOpname from './pages/StockOpname';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import CampaignManager from './pages/CampaignManager';
import Reports from './pages/Reports';

// Components
import CatalogueEditor from './components/CatalogueEditor';
import Sidebar from './components/Sidebar';
import AppHeader from './components/AppHeader';

type Page = 'dashboard' | 'catalogue' | 'promotions' | 'history' | 'settings' | 'activity' | 'products' | 'inventory' | 'supply' | 'pos' | 'revenue' | 'analytics' | 'notifications' | 'stock_opname' | 'campaigns' | 'reports';

type AuthView = 'login' | 'signup' | 'reset-password';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('user_profile');
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [editingCatalogue, setEditingCatalogue] = useState<SavedCatalogue | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  const handleAuthSuccess = (user: UserProfile) => {
    setUserProfile(user);
    localStorage.setItem('user_profile', JSON.stringify(user));
    setIsLoggedIn(true);
  };

  const handleContinueEdit = (cat: SavedCatalogue) => {
    setEditingCatalogue(cat);
    setCurrentPage('catalogue');
  };

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Gagal memuat profil:', e);
      }
    }
    return {
      username: 'admin',
      nickname: 'Master Curator',
      role: 'admin',
      password: 'password123'
    };
  });

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    localStorage.setItem('user_profile', JSON.stringify(newProfile));
  };

  // RBAC: Redirect if unauthorized page access
  useEffect(() => {
    const role = userProfile.role?.toLowerCase() || 'kasir';
    const isAdmin = role.includes('admin');
    const isManager = role.includes('manager');
    
    const allowed: Page[] = ['dashboard', 'settings', 'pos', 'revenue'];
    if (isManager || isAdmin) { 
       allowed.push('catalogue', 'promotions', 'campaigns', 'reports', 'history', 'products', 'supply', 'notifications', 'stock_opname', 'activity', 'analytics');
    }
    
    if (!allowed.includes(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [userProfile.role, currentPage]);

  useEffect(() => {
    if (currentPage === 'pos') {
      setIsSidebarExpanded(false);
    }
  }, [currentPage]);

  // Detect Reset Password (Recovery) Link
  useEffect(() => {
    const isRecovery = window.location.hash.includes('type=recovery') || 
                       window.location.pathname.includes('reset-password');
    
    if (isRecovery) {
      setAuthView('reset-password');
      setIsLoggedIn(false);
    }
  }, []);

  // Auth Gate
  if (!isLoggedIn) {
    if (authView === 'reset-password') {
      return <ResetPassword onBackToLogin={() => setAuthView('login')} />;
    }

    return authView === 'login' ? (
      <Login 
        onLogin={handleAuthSuccess} 
        onNavigateToSignup={() => setAuthView('signup')}
      />
    ) : (
      <Signup 
        onSignup={handleAuthSuccess} 
        onNavigateToLogin={() => setAuthView('login')}
      />
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('user_profile');
    setIsLoggedIn(false);
  };

  return (
    <div className="flex h-screen w-screen bg-stone-50 dark:bg-stone-950 font-sans text-stone-900 dark:text-stone-100 antialiased overflow-hidden relative">
      <Toaster 
        position="bottom-right" 
        reverseOrder={false} 
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{ 
          duration: 4000,
          style: {
            borderRadius: '8px',
            background: isDarkMode ? '#292524' : '#1c1917',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '500',
            padding: '10px 14px',
          },
          success: { style: { background: '#059669' } },
          error: { style: { background: '#dc2626' } },
        }} 
      />

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isSidebarExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarExpanded(false)}
            className="fixed inset-0 bg-black/30 z-[90] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        isSidebarExpanded={isSidebarExpanded}
        userProfile={userProfile}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        onResetEditing={() => setEditingCatalogue(null)}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-stone-50 dark:bg-stone-950 h-full w-full">
        {currentPage !== 'pos' && (
          <AppHeader
            currentPage={currentPage}
            isSidebarExpanded={isSidebarExpanded}
            userProfile={userProfile}
            isDarkMode={isDarkMode}
            onToggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)}
            onNavigate={setCurrentPage}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          />
        )}

        <section className="relative p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} userProfile={userProfile} />}
              {currentPage === 'activity' && <Activity userProfile={userProfile} />}
              {currentPage === 'analytics' && <Analytics userProfile={userProfile} />}
              {currentPage === 'catalogue' && (
                <CatalogueEditor 
                  userProfile={userProfile} 
                  editingCatalogue={editingCatalogue || undefined} 
                  onDraftSaved={setEditingCatalogue}
                />
              )}
              {currentPage === 'promotions' && <Promotions userProfile={userProfile} />}
              {currentPage === 'campaigns' && <CampaignManager userProfile={userProfile} />}
              {currentPage === 'reports' && <Reports userProfile={userProfile} />}
              {currentPage === 'history' && <CatalogueHistory onNavigate={setCurrentPage} userProfile={userProfile} onContinueEdit={handleContinueEdit} />}
              {currentPage === 'products' && <ProductInventory onNavigate={setCurrentPage} userProfile={userProfile} />}
              {currentPage === 'supply' && <Supply userProfile={userProfile} />}
              {currentPage === 'pos' && <POS onNavigate={setCurrentPage} userProfile={userProfile} />}
              {currentPage === 'revenue' && <SalesRevenue userProfile={userProfile} />}
              {currentPage === 'notifications' && <Notifications userProfile={userProfile} />}
              {currentPage === 'stock_opname' && <StockOpname userProfile={userProfile} />}
              {currentPage === 'settings' && <SettingsPage userProfile={userProfile} onUpdateProfile={handleUpdateProfile} />}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
