import React, { useState } from 'react';
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { UserProfile } from '../types';
import AuthLayout from '../components/auth/AuthLayout';

interface SignupProps {
  onSignup: (user: UserProfile) => void;
  onNavigateToLogin: () => void;
}

const TAGLINES = [
  'Multi-user dengan kontrol akses',
  'Data terisolasi per perusahaan',
  'Siap pakai dalam hitungan menit',
  'Skalabel untuk bisnis kamu',
];

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 bg-white dark:bg-stone-950/60 border border-stone-300 dark:border-stone-700/80 rounded-lg text-sm text-stone-900 dark:text-stone-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-amber-400/30 focus:border-stone-900 dark:focus:border-amber-400/60 ' +
  'transition-shadow placeholder:text-stone-400 dark:placeholder:text-stone-500';

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
        password,
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
    <AuthLayout
      taglines={TAGLINES}
      footer={
        <>
          Sudah punya akun?{' '}
          <button
            onClick={onNavigateToLogin}
            className="text-stone-900 dark:text-amber-400 font-medium hover:underline dark:hover:text-amber-300 underline-offset-2 transition-colors"
          >
            Masuk
          </button>
        </>
      }
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-white mb-1">Buat akun baru</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          Daftarkan perusahaan kamu sebagai administrator.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 p-3 rounded-lg flex items-start gap-2.5 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Nama toko / perusahaan
          </label>
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="Contoh: Toko Lily Mart"
            className={INPUT_CLASS}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin.lily"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Nama panggilan</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Lily"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="nama@perusahaan.com"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className={INPUT_CLASS + ' pr-10'}
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-950 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2 dark:shadow-lg dark:shadow-amber-500/10"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/30 dark:border-stone-300 border-t-white dark:border-t-stone-900 rounded-full animate-spin" />
          ) : (
            <>
              Daftarkan bisnis
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
