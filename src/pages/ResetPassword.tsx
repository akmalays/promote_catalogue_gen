import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logoAsset from '../assets/img/pcs_logo.png';

interface ResetPasswordProps {
  onBackToLogin: () => void;
}

export default function ResetPassword({ onBackToLogin }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if we are really in a recovery session
  useEffect(() => {
    const checkSession = async () => {
       const { data } = await supabase.auth.getSession();
       if (!data.session) {
         setError('Sesi reset kata sandi tidak valid atau telah kedaluwarsa.');
       }
    };
    checkSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Kata sandi tidak cocok.');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      // Optional: auto login or stay here
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 mb-4">
            <img src={logoAsset} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-800">Ubah Kata Sandi</h2>
          <p className="text-slate-500 text-sm text-center mt-2">Silakan masukkan kata sandi baru untuk akun Anda</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800">Berhasil!</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Kata sandi Anda telah diperbarui. Silakan login kembali.</p>
            </div>
            <button 
              onClick={onBackToLogin}
              className="w-full bg-[#8b7365] hover:bg-[#7a6458] text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              Kembali ke Login <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 block">Kata Sandi Baru</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all text-sm"
                  required
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 block">Konfirmasi Kata Sandi</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#8b7365]/20 focus:border-[#8b7365] outline-none transition-all text-sm"
                  required
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#8b7365] hover:bg-[#7a6458] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#8b7365]/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Simpan Kata Sandi Baru'
              )}
            </button>

            <button 
              type="button"
              onClick={onBackToLogin}
              className="w-full text-slate-500 text-sm font-bold hover:text-slate-700"
            >
              Batal
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
