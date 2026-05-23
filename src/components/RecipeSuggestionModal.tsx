import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Loader2, Check, Lightbulb, AlertCircle } from 'lucide-react';
import { suggestRecipe } from '../lib/ai';
import { QUOTA_EXCEEDED } from '../lib/ai';
import { formatResetIn, getResetMs } from '../lib/ai-quota';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface RecipeIngredient {
  name: string;
  usageQty: number;
  usageUnit: string;
  buyQty: number;
  buyUnit: string;
  estimatedPrice: number;
}

interface RecipeSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (ingredients: Array<{
    name: string;
    usageQty: number;
    usageUnit: string;
    buyPrice: number;
    buyQty: number;
    buyUnit: string;
  }>) => void;
}

export default function RecipeSuggestionModal({ isOpen, onClose, onApply }: RecipeSuggestionModalProps) {
  const [productName, setProductName] = useState('');
  const [servings, setServings] = useState(10);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<RecipeIngredient[] | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!productName.trim()) {
      toast.error('Masukkan nama produk dulu');
      return;
    }

    setLoading(true);
    setSuggestions(null);
    setSelectedItems(new Set());

    const result = await suggestRecipe({
      productName: productName.trim(),
      servings,
      category: category.trim() || undefined,
    });

    if (result === QUOTA_EXCEEDED) {
      toast.error(`Kuota AI harian habis. Reset dalam ${formatResetIn(getResetMs())}.`, { duration: 5000 });
    } else if (result && result.length > 0) {
      setSuggestions(result);
      setSelectedItems(new Set(result.map((_, idx) => idx)));
    } else {
      toast.error('Gagal menyusun resep, coba lagi');
    }

    setLoading(false);
  };

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedItems(newSet);
  };

  const toggleAll = () => {
    if (!suggestions) return;
    if (selectedItems.size === suggestions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(suggestions.map((_, idx) => idx)));
    }
  };

  const handleApply = () => {
    if (!suggestions || selectedItems.size === 0) {
      toast.error('Pilih minimal 1 bahan');
      return;
    }

    // AI returns usageQty as total for `servings` portions, but the HPP
    // table expects usage per 1 product. Normalize by dividing.
    const divisor = Math.max(1, servings);
    const selected = suggestions
      .filter((_, idx) => selectedItems.has(idx))
      .map(item => ({
        name: item.name,
        usageQty: +(item.usageQty / divisor).toFixed(4),
        usageUnit: item.usageUnit,
        buyPrice: item.estimatedPrice,
        buyQty: item.buyQty,
        buyUnit: item.buyUnit,
      }));

    onApply(selected);
    toast.success(`${selected.length} bahan ditambahkan (per ${servings === 1 ? '1 produk' : `1 dari ${servings} produk`})`);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setProductName('');
    setServings(10);
    setCategory('');
    setSuggestions(null);
    setSelectedItems(new Set());
  };

  /** Trim trailing zeros while keeping precision for sub-1 values. */
  function formatQty(n: number): string {
    if (!isFinite(n)) return '0';
    if (n === 0) return '0';
    if (Math.abs(n) >= 10) return n.toFixed(0);
    if (Math.abs(n) >= 1) return n.toFixed(1).replace(/\.0$/, '');
    return n.toFixed(3).replace(/\.?0+$/, '');
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-[9998] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold text-stone-900 dark:text-white">Saran Resep</h2>
                <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Resep lengkap dengan takaran bahan</p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {!suggestions ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1.5">
                    Nama produk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder="Contoh: Ayam geprek sambal matah"
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1.5">
                      Jumlah porsi sekali masak
                    </label>
                    <input
                      type="number"
                      value={servings}
                      onChange={e => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                      disabled={loading}
                    />
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                      Resep AI akan otomatis dibagi ke pemakaian per 1 produk
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-stone-600 dark:text-stone-400 block mb-1.5">
                      Kategori (opsional)
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="F&B, Minuman"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg">
                  <Lightbulb className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Hasil saran adalah estimasi rata-rata. Edit jumlah & harga setelah ditambahkan untuk menyesuaikan dengan resep & supplier kamu.
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !productName.trim()}
                  className="w-full py-2.5 bg-stone-900 dark:bg-white hover:bg-stone-800 dark:hover:bg-stone-100 text-white dark:text-stone-950 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyusun resep...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate resep
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
                      Resep untuk {servings} porsi
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {suggestions.length} bahan ditemukan · otomatis dibagi {servings} saat ditambahkan
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleAll}
                      className="text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
                    >
                      {selectedItems.size === suggestions.length ? 'Batal pilih' : 'Pilih semua'}
                    </button>
                    <span className="text-stone-300 dark:text-stone-600">·</span>
                    <button
                      onClick={() => {
                        setSuggestions(null);
                        setSelectedItems(new Set());
                      }}
                      className="text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
                    >
                      Generate ulang
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {suggestions.map((item, idx) => {
                    const isSelected = selectedItems.has(idx);
                    const perUnitQty = item.usageQty / Math.max(1, servings);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleSelection(idx)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-colors',
                          isSelected
                            ? 'border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800/50'
                            : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                              isSelected
                                ? 'border-stone-900 dark:border-white bg-stone-900 dark:bg-white'
                                : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900',
                            )}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white dark:text-stone-950" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-medium text-stone-900 dark:text-white">{item.name}</p>
                              <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 tabular-nums whitespace-nowrap">
                                Rp {item.estimatedPrice.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                              <span>Untuk {servings} porsi: <span className="text-stone-700 dark:text-stone-300 font-medium">{formatQty(item.usageQty)} {item.usageUnit}</span></span>
                              <span className="text-stone-300 dark:text-stone-600">·</span>
                              <span>Per produk: <span className="text-stone-700 dark:text-stone-300 font-medium">{formatQty(perUnitQty)} {item.usageUnit}</span></span>
                              <span className="text-stone-300 dark:text-stone-600">·</span>
                              <span>Beli {item.buyQty} {item.buyUnit}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    Takaran akan otomatis dibagi {servings} agar sesuai pemakaian per 1 produk. Harga & ukuran tetap mengikuti supplier — sesuaikan jika perlu.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {suggestions && (
            <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50 dark:bg-stone-900/50">
              <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                {selectedItems.size} dari {suggestions.length} terpilih
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClose}
                  className="px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleApply}
                  disabled={selectedItems.size === 0}
                  className="px-3.5 py-1.5 bg-stone-900 dark:bg-white hover:bg-stone-800 dark:hover:bg-stone-100 text-white dark:text-stone-950 rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Tambahkan{selectedItems.size > 0 && ` (${selectedItems.size})`}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
