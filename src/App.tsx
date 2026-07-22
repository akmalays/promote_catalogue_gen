import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import { SavedCatalogue, UserProfile } from './types';

// Pages
import LandingPage from './pages/LandingPage';
import HPPCalculator from './pages/HPPCalculator';
import ToolsHub from './pages/ToolsHub';
import MarginCalculator from './pages/tools/MarginCalculator';
import PromoImpactCalculator from './pages/tools/PromoImpactCalculator';
import Dashboard from './modules/retail/pages/Dashboard';
import Promotions from './modules/retail/pages/Promotions';
import Login from './pages/Login';
import CatalogueHistory from './modules/retail/pages/CatalogueHistory';
import SettingsPage from './pages/Settings';
import Activity from './modules/retail/pages/Activity';
import Analytics from './modules/retail/pages/Analytics';
import ProductInventory from './modules/retail/pages/ProductInventory';
import Supply from './modules/retail/pages/Supply';
import POS from './modules/retail/pages/POS';
import SalesRevenue from './modules/retail/pages/SalesRevenue';
import Notifications from './modules/retail/pages/Notifications';
import StockOpname from './modules/retail/pages/StockOpname';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import CampaignManager from './modules/retail/pages/CampaignManager';
import Reports from './modules/retail/pages/Reports';

// Components
import CatalogueEditor from './modules/retail/components/CatalogueEditor';
import Sidebar from './components/Sidebar';
import AppHeader from './components/AppHeader';

type Page = 'dashboard' | 'catalogue' | 'promotions' | 'history' | 'settings' | 'activity' | 'products' | 'inventory' | 'supply' | 'pos' | 'revenue' | 'analytics' | 'notifications' | 'stock_opname' | 'campaigns' | 'reports';

export default function App() {
  return (
    <BrowserRouter>
      <RecoveryRedirect />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/tools" element={<ToolsHub />} />
        <Route path="/tools/hpp" element={<HPPCalculator />} />
        <Route path="/tools/margin" element={<MarginCalculator />} />
        <Route path="/tools/promo-impact" element={<PromoImpactCalculator />} />
        {/* Legacy redirect */}
        <Route path="/hpp" element={<Navigate to="/tools/hpp" replace />} />
        <Route path="/login" element={<AuthRoute view="login" />} />
        <Route path="/signup" element={<AuthRoute view="signup" />} />
        <Route path="/reset-password" element={<AuthRoute view="reset-password" />} />

        {/* Protected app routes */}
        <Route path="/app/*" element={<ProtectedApp />} />

        {/* Catch-all: redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ============================================================
// Recovery Redirect — detects Supabase recovery hash and redirects
// ============================================================

function RecoveryRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      navigate('/reset-password', { replace: true });
    }
  }, [navigate]);

  return null;
}

// ============================================================
// Auth Route — handles login/signup/reset
// ============================================================

function AuthRoute({ view }: { view: 'login' | 'signup' | 'reset-password' }) {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('user_profile');

  // If already logged in, redirect to app
  if (isLoggedIn) {
    return <Navigate to="/app" replace />;
  }

  const handleAuthSuccess = (user: UserProfile) => {
    localStorage.setItem('user_profile', JSON.stringify(user));
    navigate('/app', { replace: true });
  };

  if (view === 'reset-password') {
    return <ResetPassword onBackToLogin={() => navigate('/login')} />;
  }

  if (view === 'signup') {
    return (
      <Signup
        onSignup={handleAuthSuccess}
        onNavigateToLogin={() => navigate('/login')}
      />
    );
  }

  return (
    <Login
      onLogin={handleAuthSuccess}
      onNavigateToSignup={() => navigate('/signup')}
    />
  );
}

// ============================================================
// Protected App — the main application shell
// ============================================================

function ProtectedApp() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('user_profile'));

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell onLogout={() => { localStorage.removeItem('user_profile'); setIsLoggedIn(false); navigate('/login', { replace: true }); }} />;
}

// ============================================================
// App Shell — sidebar + header + page content
// ============================================================

function AppShell({ onLogout }: { onLogout: () => void }) {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [editingCatalogue, setEditingCatalogue] = useState<SavedCatalogue | null>(null);

  // Dark mode — read from unified `theme` key (with legacy `dark_mode` fallback)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    const legacy = localStorage.getItem('dark_mode');
    if (legacy !== null) return legacy === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('user_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { username: 'admin', nickname: 'Master Curator', role: 'admin', password: 'password123' };
  });

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    localStorage.setItem('user_profile', JSON.stringify(newProfile));
  };

  const handleContinueEdit = (cat: SavedCatalogue) => {
    setEditingCatalogue(cat);
    setCurrentPage('catalogue');
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
        onLogout={onLogout}
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
