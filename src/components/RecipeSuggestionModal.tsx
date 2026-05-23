import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Loader2, Check, Lightbulb, AlertCircle } from 'lucide-react';
import { suggestRecipe } from '../lib/ai';
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

    if (result && result.length > 0) {
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

    const selected = suggestions
      .filter((_, idx) => selectedItems.has(idx))
      .map(item => ({
        name: item.name,
        usageQty: item.usageQty,
        usageUnit: item.usageUnit,
        buyPrice: item.estimatedPrice,
        buyQty: item.buyQty,
        buyUnit: item.buyUnit,
      }));

    onApply(selected);
    toast.success(`${selected.length} bahan ditambahkan`);
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
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold text-stone-900 dark:text-white">Saran Resep</h2>
                <span className="text-[10px] font-medium text-stone-500 inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 rounded">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Resep lengkap dengan takaran bahan</p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-stone-500 dark:text-stone-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {!suggestions ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1.5">
                    Nama produk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder="Contoh: Ayam geprek sambal matah"
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-stone-600 block mb-1.5">
                      Jumlah porsi
                    </label>
                    <input
                      type="number"
                      value={servings}
                      onChange={e => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-stone-600 block mb-1.5">
                      Kategori (opsional)
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="F&B, Minuman"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg">
                  <Lightbulb className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Hasil saran adalah estimasi rata-rata. Edit jumlah & harga setelah ditambahkan untuk menyesuaikan dengan resep & supplier kamu.
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !productName.trim()}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    <p className="text-xs text-stone-500 mt-0.5">
                      {suggestions.length} bahan ditemukan
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleAll}
                      className="text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-white"
                    >
                      {selectedItems.size === suggestions.length ? 'Batal pilih' : 'Pilih semua'}
                    </button>
                    <span className="text-stone-300">·</span>
                    <button
                      onClick={() => {
                        setSuggestions(null);
                        setSelectedItems(new Set());
                      }}
                      className="text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-white"
                    >
                      Generate ulang
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {suggestions.map((item, idx) => {
                    const isSelected = selectedItems.has(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleSelection(idx)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-colors',
                          isSelected
                            ? 'border-stone-900 bg-stone-50'
                            : 'border-stone-200 bg-white hover:border-stone-300',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                              isSelected
                                ? 'border-stone-900 bg-stone-900'
                                : 'border-stone-300 bg-white',
                            )}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-sm font-medium text-stone-900 dark:text-white">{item.name}</p>
                              <span className="text-xs font-semibold text-stone-700 tabular-nums whitespace-nowrap">
                                Rp {item.estimatedPrice.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-stone-500 tabular-nums">
                              <span>Pakai {item.usageQty} {item.usageUnit}</span>
                              <span className="text-stone-300">·</span>
                              <span>Beli {item.buyQty} {item.buyUnit}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Harga estimasi mengikuti pasar umum di Indonesia. Sesuaikan dengan supplier & daerah kamu.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {suggestions && (
            <div className="px-5 py-3 border-t border-stone-200 flex items-center justify-between gap-3 bg-stone-50">
              <p className="text-xs text-stone-500 tabular-nums">
                {selectedItems.size} dari {suggestions.length} terpilih
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClose}
                  className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleApply}
                  disabled={selectedItems.size === 0}
                  className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
