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

// Components
import CatalogueEditor from './components/CatalogueEditor';
import Sidebar from './components/Sidebar';
import AppHeader from './components/AppHeader';

type Page = 'dashboard' | 'catalogue' | 'promotions' | 'history' | 'settings' | 'activity' | 'products' | 'inventory' | 'supply' | 'pos' | 'revenue' | 'analytics' | 'notifications' | 'stock_opname' | 'campaigns';

type AuthView = 'login' | 'signup' | 'reset-password';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [editingCatalogue, setEditingCatalogue] = useState<SavedCatalogue | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');

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
       allowed.push('catalogue', 'promotions', 'campaigns', 'history', 'products', 'supply', 'notifications', 'stock_opname', 'activity', 'analytics');
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
    <div className="flex h-screen w-screen bg-[#f3f4f6] font-sans text-slate-800 antialiased overflow-hidden relative">
      <Toaster 
        position="bottom-right" 
        reverseOrder={false} 
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{ 
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            padding: '12px 16px',
          },
          success: { style: { background: '#059669' } },
          error: { style: { background: '#e11d48' } },
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden"
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
      <main className="flex-1 overflow-y-auto relative bg-[#f8f9fb] custom-scrollbar h-full w-full">
        {currentPage !== 'pos' && (
          <AppHeader
            currentPage={currentPage}
            isSidebarExpanded={isSidebarExpanded}
            userProfile={userProfile}
            onToggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)}
            onNavigate={setCurrentPage}
          />
        )}

        <section className="relative p-0 transition-all duration-300">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
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
