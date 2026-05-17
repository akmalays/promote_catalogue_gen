import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { UserProfile } from '../types';
import logoAsset from '../assets/img/pcs_logo.png';

interface SignupProps {
  onSignup: (user: UserProfile) => void;
  onNavigateToLogin: () => void;
}

function TypingText({ texts }: { texts: string[] }) {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = texts[index % texts.length];
    const speed = isDeleting ? 30 : 55;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(fullText.substring(0, displayText.length + 1));
        if (displayText === fullText) {
          setTimeout(() => setIsDeleting(true), 2200);
          return;
        }
      } else {
        setDisplayText(fullText.substring(0, displayText.length - 1));
        if (displayText === '') {
          setIsDeleting(false);
          setIndex((prev) => prev + 1);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, index, texts]);

  return (
    <span className="text-stone-400">
      {displayText}
      <span className="inline-block w-px h-4 bg-stone-500 ml-0.5 animate-pulse align-middle" />
    </span>
  );
}

export default function Signup({ onSignup, onNavigateToLogin }: SignupProps) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!companyName || !email || !username || !password) {
      setError('Harap isi semua field yang wajib.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await api.signup({
        companyName,
        email,
        username,
        nickname: nickname || username,
        password
      });
      
      if (result.success && result.user) {
        onSignup(result.user);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftarkan perusahaan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[45%] bg-[#1c1917] flex-col justify-between p-12">
        <div />

        <div className="space-y-8">
          <img src={logoAsset} alt="myStore Studio" className="w-28 h-28 object-contain" />
          
          <div className="space-y-3">
            <h1 className="text-white text-2xl font-bold leading-tight tracking-tight">
              myStore Studio
            </h1>
            <div className="text-sm h-5">
              <TypingText texts={["Multi-user dengan kontrol akses", "Data terisolasi per perusahaan", "Siap pakai dalam hitungan menit", "Skalabilitas untuk bisnis Anda"]} />
            </div>
          </div>

          <p className="text-stone-500 text-sm leading-relaxed max-w-xs">
            Daftarkan toko Anda dan dapatkan akses ke semua fitur manajemen retail.
          </p>
        </div>

        <p className="text-stone-600 text-xs">
          &copy; 2026 myStore Studio
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 mb-10 lg:hidden">
            <img src={logoAsset} alt="myStore Studio" className="w-20 h-20 object-contain" />
            <span className="text-lg font-bold text-stone-900">myStore Studio</span>
            <div className="text-xs h-4">
              <TypingText texts={["Multi-user & kontrol akses", "Data aman per perusahaan", "Siap pakai dalam menit"]} />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-stone-900 mb-1">Buat akun baru</h2>
            <p className="text-stone-500 text-sm">
              Daftarkan perusahaan Anda sebagai administrator.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2.5 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Nama toko / perusahaan</label>
              <input 
                type="text" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Contoh: Toko Lily Mart"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-shadow placeholder:text-stone-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin.lily"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-shadow placeholder:text-stone-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Nama panggilan</label>
                <input 
                  type="text" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Lily"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-shadow placeholder:text-stone-400"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-shadow placeholder:text-stone-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-shadow placeholder:text-stone-400"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-6"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Daftarkan bisnis
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            Sudah punya akun?{' '}
            <button onClick={onNavigateToLogin} className="text-stone-900 font-medium hover:underline underline-offset-2">
              Masuk
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
