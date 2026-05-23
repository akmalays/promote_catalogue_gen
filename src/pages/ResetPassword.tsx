import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AuthLayout from '../components/auth/AuthLayout';

interface ResetPasswordProps {
  onBackToLogin: () => void;
}

const TAGLINES = [
  'Atur ulang kata sandi',
  'Akses akun kamu kembali',
  'Aman & terenkripsi',
];

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 bg-white dark:bg-stone-950/60 border border-stone-300 dark:border-stone-700/80 rounded-lg text-sm text-stone-900 dark:text-stone-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-amber-400/30 focus:border-stone-900 dark:focus:border-amber-400/60 ' +
  'transition-shadow placeholder:text-stone-400 dark:placeholder:text-stone-500';

export default function ResetPassword({ onBackToLogin }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout taglines={TAGLINES}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-white mb-1">Ubah kata sandi</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          Masukkan kata sandi baru untuk akun kamu.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 p-3 rounded-lg flex items-start gap-2.5 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-5 rounded-lg text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <div>
            <p className="font-semibold text-base text-stone-900 dark:text-white mb-1">Berhasil</p>
            <p className="text-stone-700 dark:text-stone-300 text-sm">Kata sandi telah diperbarui. Silakan login kembali.</p>
          </div>
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-950 rounded-lg text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-100 transition-colors"
          >
            Kembali ke login <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Kata sandi baru</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={INPUT_CLASS + ' pr-10'}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Konfirmasi kata sandi</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={INPUT_CLASS}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-950 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2 dark:shadow-lg dark:shadow-amber-500/10"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 dark:border-stone-300 border-t-white dark:border-t-stone-900 rounded-full animate-spin" />
            ) : (
              <>
                Simpan kata sandi baru
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-stone-500 dark:text-stone-400 text-sm hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            Batal
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
