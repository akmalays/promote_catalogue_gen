import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Loader2, Check, Lightbulb, AlertCircle } from 'lucide-react';
import { suggestFixedCosts } from '../lib/ai';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface FixedCostItem {
  name: string;
  amount: number;
  reasoning: string;
}

interface FixedCostsSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (costs: Array<{ name: string; amount: number }>) => void;
}

export default function FixedCostsSuggestionModal({ isOpen, onClose, onApply }: FixedCostsSuggestionModalProps) {
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [scale, setScale] = useState<'kecil' | 'menengah' | 'besar'>('kecil');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<FixedCostItem[] | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!businessType.trim()) {
      toast.error('Masukkan jenis usaha dulu');
      return;
    }

    setLoading(true);
    setSuggestions(null);
    setSelectedItems(new Set());

    const result = await suggestFixedCosts({
      businessType: businessType.trim(),
      location: location.trim() || undefined,
      scale,
    });

    if (result && result.length > 0) {
      setSuggestions(result);
      setSelectedItems(new Set(result.map((_, idx) => idx)));
    } else {
      toast.error('Gagal menyusun estimasi, coba lagi');
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
      toast.error('Pilih minimal 1 biaya');
      return;
    }

    const selected = suggestions
      .filter((_, idx) => selectedItems.has(idx))
      .map(item => ({ name: item.name, amount: item.amount }));

    onApply(selected);
    toast.success(`${selected.length} biaya ditambahkan`);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setBusinessType('');
    setLocation('');
    setScale('kecil');
    setSuggestions(null);
    setSelectedItems(new Set());
  };

  const totalSelected = suggestions
    ? suggestions
        .filter((_, idx) => selectedItems.has(idx))
        .reduce((sum, item) => sum + item.amount, 0)
    : 0;

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
          className="bg-white rounded-2xl border border-stone-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold text-stone-900">Saran Biaya Tetap</h2>
                <span className="text-[10px] font-medium text-stone-500 inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 rounded">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Estimasi biaya operasional bulanan</p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {!suggestions ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1.5">
                    Jenis usaha <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessType}
                    onChange={e => setBusinessType(e.target.value)}
                    placeholder="Contoh: Warung ayam geprek, kedai kopi, laundry"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1.5">
                    Lokasi (opsional)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Contoh: Jakarta Selatan, Bandung, Surabaya"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                    disabled={loading}
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Lokasi membantu estimasi sewa & gaji lebih akurat
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1.5">
                    Skala usaha
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-lg">
                    {(['kecil', 'menengah', 'besar'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setScale(s)}
                        disabled={loading}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize disabled:opacity-50',
                          scale === s
                            ? 'bg-white text-stone-900 shadow-sm'
                            : 'text-stone-600 hover:text-stone-900',
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-stone-50 border border-stone-200 rounded-lg">
                  <Lightbulb className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Estimasi mencakup sewa, listrik, gaji, dan biaya operasional rutin lainnya. Sesuaikan dengan kondisi aktual usaha kamu.
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading || !businessType.trim()}
                  className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyusun estimasi...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate estimasi
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900">
                      Estimasi biaya tetap bulanan
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Skala {scale} · {suggestions.length} item
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleAll}
                      className="text-xs font-medium text-stone-600 hover:text-stone-900"
                    >
                      {selectedItems.size === suggestions.length ? 'Batal pilih' : 'Pilih semua'}
                    </button>
                    <span className="text-stone-300">·</span>
                    <button
                      onClick={() => {
                        setSuggestions(null);
                        setSelectedItems(new Set());
                      }}
                      className="text-xs font-medium text-stone-600 hover:text-stone-900"
                    >
                      Generate ulang
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
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
                              <p className="text-sm font-medium text-stone-900">{item.name}</p>
                              <span className="text-xs font-semibold text-stone-700 tabular-nums whitespace-nowrap">
                                Rp {item.amount.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 leading-relaxed">{item.reasoning}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Estimasi adalah panduan umum. Sesuaikan dengan kondisi aktual usaha kamu sebelum disimpan.
                  </p>
                </div>

                {selectedItems.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-stone-900 text-white rounded-lg">
                    <span className="text-xs font-medium text-stone-300">Total terpilih / bulan</span>
                    <span className="text-sm font-bold tabular-nums">
                      Rp {totalSelected.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
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
