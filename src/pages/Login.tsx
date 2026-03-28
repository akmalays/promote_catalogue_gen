import React, { useState } from 'react';
import { BookOpen, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import logoAsset from '../assets/img/pcs_logo.png';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await api.login({ username: email, password });
      if (result.success) {
        onLogin();
      } else {
        setError('Username atau password salah.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyambung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - Marketing/Image */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col relative overflow-hidden">
        {/* Abstract background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#8b7365]/20 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#8b7365]/10 blur-[100px]" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center flex-1 px-16 py-20 text-white">
          <div className="mb-12">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 overflow-hidden bg-white/10 backdrop-blur-md p-1">
              <img src={logoAsset} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black font-serif leading-tight mb-6">
              Pusat Kendali<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e3d1c7] to-[#a28a7e]">Promosi & Konten</span><br />
              Bisnis Anda.
            </h1>
            <p className="text-slate-400 text-lg max-w-md leading-relaxed">
              Buat katalog menawan dan sebarkan kampanye promosi langsung ke pelanggan Anda dalam hitungan menit.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm max-w-md">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <p className="text-sm font-medium text-slate-300">Desain Katalog Otomatis</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm max-w-md">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>
              <p className="text-sm font-medium text-slate-300">WhatsApp Blast Terintegrasi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
              <img src={logoAsset} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">PromoContent Studio</h1>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Selamat Datang</h2>
            <p className="text-slate-500 text-sm">Masuk ke akun Anda untuk mulai mengelola kampanye promosi.</p>
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 block">Username / Email</label>
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan username atau email"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all placeholder:text-slate-400 text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700 block">Kata Sandi</label>
                <a href="#" className="text-xs font-bold text-[#8b7365] hover:text-[#7a6458]">Lupa sandi?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all placeholder:text-slate-400 text-sm"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#8b7365] hover:bg-[#7a6458] text-white font-bold py-3.5 px-4 rounded-xl shadow-sm transition-all focus:ring-4 focus:ring-[#8b7365]/30 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Masuk ke Dashboard <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Belum memiliki akun? <a href="#" className="text-[#8b7365] font-bold hover:underline">Daftar sekarang</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
