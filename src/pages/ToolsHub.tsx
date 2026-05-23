import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Wrench, Search } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import logoAsset from '../assets/img/pcs_logo.png';
import { cn } from '../lib/utils';
import { TOOLS, businessLabel, categoryLabel, type BusinessType, type ToolCategory } from '../lib/tools-registry';
import ThemeToggle from '../components/ThemeToggle';

type Filter = 'semua' | BusinessType | ToolCategory;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'semua', label: 'Semua' },
  { value: 'retail', label: 'Retail' },
  { value: 'fnb', label: 'F&B' },
  { value: 'umum', label: 'Umum' },
  { value: 'kalkulator', label: 'Kalkulator' },
  { value: 'generator', label: 'Generator' },
];

export default function ToolsHub() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('semua');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = TOOLS;
    if (filter !== 'semua') {
      list = list.filter(t => t.forBusiness.includes(filter as BusinessType) || t.category === (filter as ToolCategory));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [filter, search]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans antialiased">
      <Toaster position="top-center" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-100 dark:border-stone-800/60">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <img src={logoAsset} alt="myStore" className="w-8 h-8 object-contain" />
            <span className="text-base font-bold tracking-tight text-stone-900 dark:text-white">myStore</span>
          </button>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-14">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-stone-900/70 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-full text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">
            <Wrench className="w-3.5 h-3.5" /> Tools gratis untuk UMKM
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-stone-900 dark:text-white">
            Tools gratis untuk bantu kelola bisnis
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm md:text-base max-w-xl mx-auto">
            Kumpulan kalkulator dan generator gratis untuk UMKM — retail, kafe, warung, atau jasa. Tanpa daftar, tanpa biaya.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari tools..."
                className="w-full pl-10 pr-3 py-2 bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-amber-400/30 focus:bg-white dark:focus:bg-stone-950 placeholder:text-stone-400 dark:placeholder:text-stone-500"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                    filter === f.value
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-950'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl">
            <p className="text-sm text-stone-500 dark:text-stone-400">Tidak ada tools yang cocok dengan filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(tool => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.slug}
                  onClick={() => tool.available && navigate(`/tools/${tool.slug}`)}
                  disabled={!tool.available}
                  className={cn(
                    'group p-5 bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl text-left transition-colors',
                    tool.available
                      ? 'hover:border-stone-400 dark:hover:border-stone-700 cursor-pointer'
                      : 'opacity-60 cursor-not-allowed',
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800/80 dark:border dark:border-stone-700/60 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1 justify-end">
                      <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded">
                        {categoryLabel[tool.category]}
                      </span>
                      {tool.forBusiness.map(b => (
                        <span
                          key={b}
                          className="text-[10px] font-medium text-stone-500 dark:text-stone-400 px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded"
                        >
                          {businessLabel[b]}
                        </span>
                      ))}
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-stone-900 dark:text-white mb-1.5">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-3">
                    {tool.description}
                  </p>

                  {tool.available ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-white">
                      Buka tools <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-stone-400 dark:text-stone-500">Segera hadir</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 p-6 md:p-8 bg-stone-900 dark:bg-stone-900/70 dark:backdrop-blur-xl dark:border dark:border-stone-800 text-white rounded-2xl text-center dark:shadow-2xl dark:shadow-black/40">
          <h3 className="text-xl md:text-2xl font-bold mb-2">Mau yang lebih dari sekadar tools?</h3>
          <p className="text-stone-400 text-sm md:text-base mb-5 max-w-md mx-auto">
            myStore POS adalah solusi kasir lengkap untuk toko retail — kelola stok, transaksi, promo, dan laporan dalam satu aplikasi.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-stone-900 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors dark:shadow-lg dark:shadow-amber-500/20"
          >
            Coba myStore gratis <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
