import { useState, useMemo } from 'react';
import { Percent, Info } from 'lucide-react';
import ToolsLayout from '../../components/tools/ToolsLayout';
import { cn } from '../../lib/utils';

type Mode = 'markup' | 'margin';

/**
 * Simple Margin & Markup Calculator
 *
 * - Markup mode: input cost + markup% → selling price
 * - Margin mode: input cost + target margin% → selling price
 *
 * Both modes also let you reverse-calculate: input price + cost → margin & markup.
 */
export default function MarginCalculator() {
  const [mode, setMode] = useState<Mode>('markup');
  const [cost, setCost] = useState<number>(0);
  const [percent, setPercent] = useState<number>(30);
  const [sellingPrice, setSellingPrice] = useState<number>(0);

  // Forward calculation: cost + percent → price
  const calculatedPrice = useMemo(() => {
    if (cost === 0) return 0;
    if (mode === 'markup') {
      return Math.round(cost * (1 + percent / 100));
    }
    // margin mode: price = cost / (1 - margin%)
    if (percent >= 100) return 0;
    return Math.round(cost / (1 - percent / 100));
  }, [cost, percent, mode]);

  // Reverse calculation: cost + sellingPrice → margin & markup
  const reverseAnalysis = useMemo(() => {
    if (cost === 0 || sellingPrice === 0) return null;
    const profit = sellingPrice - cost;
    const markup = (profit / cost) * 100;
    const margin = (profit / sellingPrice) * 100;
    return { profit, markup, margin };
  }, [cost, sellingPrice]);

  return (
    <ToolsLayout
      heroIcon={<Percent className="w-3.5 h-3.5" />}
      badge="Tools gratis · Kalkulator"
      title="Kalkulator Margin & Markup"
      subtitle="Hitung harga jual dari modal — atau cek margin & markup dari harga jual yang sudah ada."
    >
      <div className="space-y-4">
        {/* Mode tabs */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-lg mb-5">
            <button
              onClick={() => setMode('markup')}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium transition-all',
                mode === 'markup' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900',
              )}
            >
              Hitung dari Markup
            </button>
            <button
              onClick={() => setMode('margin')}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium transition-all',
                mode === 'margin' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900',
              )}
            >
              Hitung dari Margin
            </button>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg mb-5">
            <Info className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
            <p className="text-xs text-stone-600 leading-relaxed">
              {mode === 'markup'
                ? <><strong>Markup</strong> = profit dibagi modal. Contoh: modal Rp 10.000, markup 50% → harga jual Rp 15.000.</>
                : <><strong>Margin</strong> = profit dibagi harga jual. Contoh: modal Rp 10.000, margin 50% → harga jual Rp 20.000 (margin lebih besar dari markup pada angka yang sama).</>}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">
                Modal / Harga beli (HPP)
              </label>
              <CurrencyInput value={cost} onChange={setCost} placeholder="0" />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">
                {mode === 'markup' ? 'Markup' : 'Margin'} (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={mode === 'markup' ? 300 : 95}
                  step={1}
                  value={percent}
                  onChange={e => setPercent(parseInt(e.target.value))}
                  className="flex-1 accent-stone-900"
                />
                <div className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 rounded-md tabular-nums">
                  <input
                    type="number"
                    min={0}
                    max={mode === 'markup' ? 500 : 99}
                    value={percent}
                    onChange={e => setPercent(Math.max(0, Math.min(mode === 'markup' ? 500 : 99, parseInt(e.target.value) || 0)))}
                    className="w-12 bg-transparent text-sm font-semibold text-right focus:outline-none"
                  />
                  <Percent className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Result */}
          {cost > 0 && calculatedPrice > 0 && (
            <div className="mt-5 p-4 bg-stone-900 text-white rounded-xl">
              <p className="text-[11px] text-stone-400 mb-1">Harga jual ideal</p>
              <p className="text-3xl font-bold tabular-nums">
                Rp {calculatedPrice.toLocaleString('id-ID')}
              </p>
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-stone-700">
                <ResultStat label="Profit" value={`Rp ${(calculatedPrice - cost).toLocaleString('id-ID')}`} />
                <ResultStat label="Margin" value={`${(((calculatedPrice - cost) / calculatedPrice) * 100).toFixed(1)}%`} />
                <ResultStat label="Markup" value={`${(((calculatedPrice - cost) / cost) * 100).toFixed(1)}%`} />
              </div>
            </div>
          )}
        </div>

        {/* Reverse: cek margin dari harga jual */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-1">Atau cek margin dari harga jual yang sudah ada</h2>
          <p className="text-xs md:text-sm text-stone-500 mb-4">
            Punya harga jual yang sudah jalan? Masukkan modal & harga jualnya untuk lihat margin & markup-nya.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Modal</label>
              <CurrencyInput value={cost} onChange={setCost} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Harga jual</label>
              <CurrencyInput value={sellingPrice} onChange={setSellingPrice} placeholder="0" />
            </div>
          </div>

          {reverseAnalysis ? (
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Profit" value={`Rp ${reverseAnalysis.profit.toLocaleString('id-ID')}`} positive={reverseAnalysis.profit > 0} />
              <Stat label="Margin" value={`${reverseAnalysis.margin.toFixed(1)}%`} />
              <Stat label="Markup" value={`${reverseAnalysis.markup.toFixed(1)}%`} />
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic">Lengkapi modal & harga jual untuk lihat hasilnya.</p>
          )}
        </div>

        {/* Tips */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-3">Panduan margin per kategori</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <GuideRow category="Retail / Sembako" range="15–30%" note="Margin tipis, andalkan volume" />
            <GuideRow category="Fashion" range="50–100%" note="Bisa tinggi untuk premium" />
            <GuideRow category="F&B / Makanan" range="60–70%" note="Standar industri kuliner" />
            <GuideRow category="Minuman" range="65–80%" note="Lebih tinggi dari makanan" />
            <GuideRow category="Jasa" range="40–70%" note="Tergantung effort & branding" />
            <GuideRow category="Kerajinan" range="50–80%" note="Hargai waktu produksi" />
          </div>
        </div>
      </div>
    </ToolsLayout>
  );
}

// ============================================================
// Subcomponents
// ============================================================

function CurrencyInput({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium pointer-events-none">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? '' : value.toLocaleString('id-ID')}
        onChange={e => {
          const cleaned = e.target.value.replace(/[^\d]/g, '');
          onChange(cleaned === '' ? 0 : parseInt(cleaned, 10));
        }}
        placeholder={placeholder}
        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
      />
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-xl">
      <p className="text-[10px] text-stone-500 mb-1">{label}</p>
      <p className={cn(
        'text-base font-bold tabular-nums',
        positive === false && 'text-red-600',
        positive === true && 'text-emerald-700',
      )}>{value}</p>
    </div>
  );
}

function GuideRow({ category, range, note }: { category: string; range: string; note: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-stone-900 truncate">{category}</p>
        <p className="text-[11px] text-stone-500 truncate">{note}</p>
      </div>
      <span className="text-xs font-bold text-stone-900 tabular-nums whitespace-nowrap">{range}</span>
    </div>
  );
}
