import React, { useState } from 'react';
import { BookOpen, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import logoAsset from '../assets/img/pcs_logo.png';

import { UserProfile } from '../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  onNavigateToSignup: () => void;
}

const TypingText = ({ texts }: { texts: string[] }) => {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [speed, setSpeed] = useState(60);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleTyping = () => {
      const fullText = texts[index % texts.length];
      
      if (isDeleting) {
        setDisplayText(fullText.substring(0, displayText.length - 1));
        setSpeed(25);
      } else {
        setDisplayText(fullText.substring(0, displayText.length + 1));
        setSpeed(50);
      }

      if (!isDeleting && displayText === fullText) {
        timer = setTimeout(() => setIsDeleting(true), 2000);
        return;
      } else if (isDeleting && displayText === '') {
        setIsDeleting(false);
        setIndex((prev) => prev + 1);
        timer = setTimeout(handleTyping, 400);
        return;
      }
      
      timer = setTimeout(handleTyping, speed);
    };

    timer = setTimeout(handleTyping, speed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, index, speed, texts]);

  return (
    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e3d1c7] to-[#8b7365]">
      {displayText}
      <span className="animate-pulse ml-0.5 border-r-2 border-slate-400 opacity-50"></span>
    </span>
  );
};

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
    <div className="min-h-screen bg-white flex">
      {/* Left side - Marketing/Image */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col relative overflow-hidden">
        {/* Abstract background decorative elements */}
        {/* Background Pattern & Decorative elements */}
        <div className="absolute inset-0 z-0 opacity-40 shadow-inner" style={{ backgroundImage: 'radial-gradient(#8b7365 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#8b7365]/30 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#8b7365]/20 blur-[100px]" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center flex-1 px-16 py-20 text-white">
          <div className="mb-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: [0, -15, 0] 
              }}
              transition={{ 
                opacity: { duration: 0.8 },
                scale: { type: 'spring', damping: 12 },
                y: { repeat: Infinity, duration: 6, ease: "easeInOut" }
              }}
              whileHover={{ scale: 1.05, rotate: 5 }}
               className="w-48 h-48 md:w-60 md:h-60 flex items-center justify-center -mb-8 shrink-0 cursor-pointer drop-shadow-[0_45px_90px_rgba(139,115,101,0.5)]"
            >
              <img 
                src={logoAsset} 
                alt="myStore Studio Logo" 
                className="w-full h-full object-contain filter brightness-125 saturate-110"
              />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-display font-black leading-none mb-6 tracking-tighter min-h-[3em]">
              <span className="text-white tracking-[-0.05em] uppercase">myStore </span>
              <span className="text-white/40 tracking-[0.3em] uppercase text-xl font-bold">Studio</span><br />
              <span className="text-lg md:text-xl text-slate-500 font-bold block my-3 lowercase italic opacity-80">untuk</span>
              <TypingText texts={["POS & Stok Terintegrated", "Desain Katalog Otomatis", "WhatsApp Blast", "Laporan Penjualan", "Stock Opname & Inbound"]} /><br />
              <span className="text-white tracking-[-0.05em]">Bisnis Retail Anda.</span>
            </h1>
            <p className="text-slate-400 text-base max-w-sm leading-relaxed font-medium">
              Kelola dan promosikan bisnis retail Anda dengan mudah dan efisien.
            </p>
          </div>
          
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 bg-slate-50 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[380px]"
        >
          <div className="flex flex-col items-center gap-0 mb-8 lg:hidden">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="w-20 h-20 flex items-center justify-center shrink-0 -mb-1"
            >
              <img src={logoAsset} alt="Logo" className="w-full h-full object-contain drop-shadow-lg" />
            </motion.div>
            <div className="text-center">
              <h1 className="text-2xl font-display font-black text-slate-900 tracking-tighter uppercase leading-none">myStore</h1>
              <span className="text-[10px] font-display font-bold text-[#8b7365]/60 tracking-[0.4em] uppercase block mb-2 mt-1 leading-none">Studio</span>
              <div className="text-[10px] font-bold text-[#8b7365]">
                <TypingText texts={["POS & Stok Terintegrasi", "Desain Katalog Otomatis", "WhatsApp Blast", "Laporan Penjualan", "Stock Opname & Inbound"]} />
              </div>
            </div>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-1.5">
              {isResetMode ? 'Reset Kata Sandi' : 'Selamat Datang'}
            </h2>
            <p className="text-slate-500 text-[13px] font-medium">
              {isResetMode 
                ? 'Masukkan email untuk menerima tautan reset' 
                : 'Silahkan login untuk masuk ke akun anda'}
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 mb-6"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}

          {resetSent ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-6 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold">Email Terkirim!</h3>
              <p className="text-sm">Silakan periksa kotak masuk email Anda untuk melanjutkan reset kata sandi.</p>
              <button 
                onClick={() => {
                  setResetSent(false);
                  setIsResetMode(false);
                }}
                className="text-[#8b7365] font-bold text-sm hover:underline"
              >
                Kembali ke Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 block">Email Bisnis</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email terdaftar"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all placeholder:text-slate-400 text-sm"
                  required
                />
              </div>
              
              {!isResetMode && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 block">Kata Sandi</label>
                    <button 
                      type="button"
                      onClick={() => setIsResetMode(true)}
                      className="text-xs font-bold text-[#8b7365] hover:text-[#7a6458]"
                    >
                      Lupa sandi?
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all placeholder:text-slate-400 text-sm"
                      required={!isResetMode}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-[#8b7365] hover:bg-[#7a6458] text-white font-bold py-3.5 px-4 rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-[#8b7365]/30 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isResetMode ? 'Kirim Link Reset' : 'Masuk ke Dashboard'} 
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                
                {isResetMode && (
                  <button 
                    type="button"
                    onClick={() => setIsResetMode(false)}
                    className="w-full mt-4 text-slate-500 font-bold text-sm hover:text-slate-700"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          )}

          {!isResetMode && (
            <p className="mt-8 text-center text-sm text-slate-500 font-medium">
              Belum memiliki akun? <button onClick={onNavigateToSignup} className="text-[#8b7365] font-bold hover:underline">Daftar sekarang</button>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
