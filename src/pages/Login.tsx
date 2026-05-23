import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { UserProfile } from '../types';
import AuthLayout from '../components/auth/AuthLayout';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
  onNavigateToSignup: () => void;
}

const TAGLINES = [
  'POS & inventori terintegrasi',
  'Desain katalog promo',
  'WhatsApp blast ke pelanggan',
  'Laporan penjualan harian',
  'Stock opname & inbound',
];

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 bg-white dark:bg-stone-950/60 border border-stone-300 dark:border-stone-700/80 rounded-lg text-sm text-stone-900 dark:text-stone-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-amber-400/30 focus:border-stone-900 dark:focus:border-amber-400/60 ' +
  'transition-shadow placeholder:text-stone-400 dark:placeholder:text-stone-500';

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
    <AuthLayout
      taglines={TAGLINES}
      footer={
        !isResetMode && !resetSent && (
          <>
            Belum punya akun?{' '}
            <button
              onClick={onNavigateToSignup}
              className="text-stone-900 dark:text-amber-400 font-medium hover:underline dark:hover:text-amber-300 underline-offset-2 transition-colors"
            >
              Daftar
            </button>
          </>
        )
      }
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-white mb-1">
          {isResetMode ? 'Reset kata sandi' : 'Masuk ke akun'}
        </h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          {isResetMode
            ? 'Kami akan kirim link reset ke email kamu.'
            : 'Masukkan email & password untuk melanjutkan.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 p-3 rounded-lg flex items-start gap-2.5 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {resetSent ? (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-5 rounded-lg text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <p className="font-medium text-sm">Link reset telah dikirim ke email kamu.</p>
          <button
            onClick={() => { setResetSent(false); setIsResetMode(false); }}
            className="text-emerald-700 dark:text-emerald-400 font-medium text-sm underline underline-offset-2 hover:text-emerald-800 dark:hover:text-emerald-300"
          >
            Kembali ke login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nama@perusahaan.com"
              className={INPUT_CLASS}
              required
            />
          </div>

          {!isResetMode && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Password</label>
                <button
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-amber-400 transition-colors"
                >
                  Lupa password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={INPUT_CLASS + ' pr-10'}
                  required={!isResetMode}
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
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-950 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2 dark:shadow-lg dark:shadow-amber-500/10"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 dark:border-stone-300 border-t-white dark:border-t-stone-900 rounded-full animate-spin" />
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
              className="w-full text-stone-500 dark:text-stone-400 text-sm hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              Kembali ke login
            </button>
          )}
        </form>
      )}
    </AuthLayout>
  );
}
