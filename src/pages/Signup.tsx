import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, AlertCircle, Eye, EyeOff, Building2, User, Mail, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { UserProfile } from '../types';
import logoAsset from '../assets/img/pcs_logo.png';

interface SignupProps {
  onSignup: (user: UserProfile) => void;
  onNavigateToLogin: () => void;
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
    <div className="min-h-screen bg-white flex">
      {/* Left side - Marketing/Image */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 flex-col relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40 shadow-inner" style={{ backgroundImage: 'radial-gradient(#8b7365 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#8b7365]/30 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#8b7365]/20 blur-[100px]" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center flex-1 px-16 py-20 text-white">
          <div className="mb-12">
            <motion.div 
               animate={{ y: [0, -15, 0] }}
               transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
               className="w-48 h-48 md:w-60 md:h-60 flex items-center justify-center -mb-8 shrink-0 drop-shadow-[0_45px_90px_rgba(139,115,101,0.5)]"
            >
              <img src={logoAsset} alt="Logo" className="w-full h-full object-contain filter brightness-125 saturate-110" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-display font-black leading-none mb-6 tracking-tighter">
              <span className="text-white tracking-[-0.05em] uppercase">Mulai </span>
              <span className="text-white/40 tracking-[0.3em] uppercase text-xl font-bold">Bisnis Anda</span><br />
              <span className="text-lg md:text-xl text-slate-500 font-bold block my-3 lowercase italic opacity-80">dengan</span>
              <TypingText texts={["Manajemen Multi-User", "Kontrol Admin Penuh", "Isolasi Data Aman", "Skalabilitas Bisnis"]} /><br />
              <span className="text-white tracking-[-0.05em]">Bersama myStore Studio.</span>
            </h1>
            <p className="text-slate-400 text-base max-w-sm leading-relaxed font-medium">
              Satu platform untuk mengelola seluruh operasional retail Anda dengan struktur organisasi yang jelas.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 bg-slate-50 relative overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[420px] py-10"
        >
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-1.5 font-display">Daftar Akun Bisnis</h2>
            <p className="text-slate-500 text-[13px] font-medium">Buat perusahaan baru dan kelola sebagai Administrator</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Nama Perusahaan / Toko
              </label>
              <input 
                type="text" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Contoh: Lily Mart Pusat"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Username Admin
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin.lily"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Nama Panggilan
                </label>
                <input 
                  type="text" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Lily Admin"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> Email Bisnis
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kontak@tokolily.id"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Kata Sandi</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all placeholder:text-slate-400 text-sm font-mono"
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

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#8b7365] hover:bg-[#7a6458] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#8b7365]/20 transition-all focus:ring-4 focus:ring-[#8b7365]/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Daftarkan Bisnis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                )}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Sudah memiliki akun? <button onClick={onNavigateToLogin} className="text-[#8b7365] font-bold hover:underline">Masuk di sini</button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
