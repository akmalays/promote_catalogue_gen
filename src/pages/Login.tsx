import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import logoAsset from '../assets/img/pcs_logo.png';
import { UserProfile } from '../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  onNavigateToSignup: () => void;
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

export default function Login({ onLogin, onNavigateToSignup }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isResetMode) {
        await api.resetPassword(email);
        setResetSent(true);
      } else {
        const result = await api.login({ username: email, password });
        if (result.success && result.user) {
          onLogin(result.user);
        } else {
          setError('Username atau password salah.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menyambung ke server.');
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
              <TypingText texts={["POS & inventori terintegrasi", "Desain katalog promo", "WhatsApp blast ke pelanggan", "Laporan penjualan harian", "Stock opname & inbound"]} />
            </div>
          </div>

          <p className="text-stone-500 text-sm leading-relaxed max-w-xs">
            Satu platform untuk mengelola seluruh operasional retail Anda.
          </p>
        </div>

        <p className="text-stone-600 text-xs">
          &copy; 2026 myStore Studio
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 mb-10 lg:hidden">
            <img src={logoAsset} alt="myStore Studio" className="w-20 h-20 object-contain" />
            <span className="text-lg font-bold text-stone-900">myStore Studio</span>
            <div className="text-xs h-4">
              <TypingText texts={["POS & inventori terintegrasi", "Desain katalog promo", "WhatsApp blast", "Laporan penjualan"]} />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-stone-900 mb-1">
              {isResetMode ? 'Reset kata sandi' : 'Masuk ke akun Anda'}
            </h2>
            <p className="text-stone-500 text-sm">
              {isResetMode 
                ? 'Kami akan kirim link reset ke email Anda.' 
                : 'Masukkan email dan password untuk melanjutkan.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-start gap-2.5 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {resetSent ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-lg text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-medium text-sm">Link reset telah dikirim ke email Anda.</p>
              <button 
                onClick={() => { setResetSent(false); setIsResetMode(false); }}
                className="text-emerald-700 font-medium text-sm underline underline-offset-2"
              >
                Kembali ke login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-shadow placeholder:text-stone-400"
                  required
                />
              </div>
              
              {!isResetMode && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-stone-700">Password</label>
                    <button 
                      type="button"
                      onClick={() => setIsResetMode(true)}
                      className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-shadow placeholder:text-stone-400"
                      required={!isResetMode}
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
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-6"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {isResetMode ? 'Kirim link reset' : 'Masuk'} 
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
              
              {isResetMode && (
                <button 
                  type="button"
                  onClick={() => setIsResetMode(false)}
                  className="w-full text-stone-500 text-sm hover:text-stone-700 mt-2"
                >
                  Kembali ke login
                </button>
              )}
            </form>
          )}

          {!isResetMode && !resetSent && (
            <p className="mt-6 text-center text-sm text-stone-500">
              Belum punya akun?{' '}
              <button onClick={onNavigateToSignup} className="text-stone-900 font-medium hover:underline underline-offset-2">
                Daftar
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
