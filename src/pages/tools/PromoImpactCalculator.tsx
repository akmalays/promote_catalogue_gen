import { useState, useMemo } from 'react';
import { Tag, AlertCircle } from 'lucide-react';
import ToolsLayout from '../../components/tools/ToolsLayout';
import { cn } from '../../lib/utils';

type PromoType = 'discount' | 'b1g1' | 'bundle';

/**
 * Calculator: simulate the impact of a promo on margin & profit.
 *
 * - discount: % off
 * - b1g1: buy one get one (effectively 50% off)
 * - bundle: pay X get Y items (e.g. pay 2 get 3)
 */
export default function PromoImpactCalculator() {
  const [type, setType] = useState<PromoType>('discount');
  const [hpp, setHpp] = useState(0);
  const [price, setPrice] = useState(0);
  const [discountPct, setDiscountPct] = useState(15);
  const [bundlePay, setBundlePay] = useState(2);
  const [bundleGet, setBundleGet] = useState(3);
  const [expectedSalesUplift, setExpectedSalesUplift] = useState(50);
  const [baselineUnits, setBaselineUnits] = useState(100);

  const result = useMemo(() => {
    if (hpp === 0 || price === 0) return null;

    const baseProfit = price - hpp;
    const baseMargin = (baseProfit / price) * 100;

    let promoPrice = price;
    let promoCost = hpp;
    let unitsPerTransaction = 1;
    let label = '';

    if (type === 'discount') {
      promoPrice = price * (1 - discountPct / 100);
      label = `Diskon ${discountPct}%`;
    } else if (type === 'b1g1') {
      // customer pays for 1, gets 2 → effectively 50% off, but cost is 2× hpp
      promoPrice = price;
      promoCost = hpp * 2;
      unitsPerTransaction = 2;
      label = 'Buy 1 Get 1';
    } else {
      // pay X, get Y
      promoPrice = price * bundlePay;
      promoCost = hpp * bundleGet;
      unitsPerTransaction = bundleGet;
      label = `Bayar ${bundlePay} dapat ${bundleGet}`;
    }

    const promoProfit = promoPrice - promoCost;
    const promoMargin = promoPrice > 0 ? (promoProfit / promoPrice) * 100 : 0;
    const profitDelta = promoProfit - (baseProfit * unitsPerTransaction);

    // Volume scenario (without and with promo)
    const baselineProfit = baseProfit * baselineUnits;
    const promoUnits = baselineUnits * (1 + expectedSalesUplift / 100);
    // Each "transaction" yields promoProfit and consumes unitsPerTransaction units
    const promoTransactions = promoUnits / unitsPerTransaction;
    const totalPromoProfit = promoProfit * promoTransactions;
    const profitImpact = totalPromoProfit - baselineProfit;

    return {
      label, baseProfit, baseMargin,
      promoPrice, promoCost, promoProfit, promoMargin, profitDelta,
      unitsPerTransaction, baselineProfit, totalPromoProfit, profitImpact,
      isWorthIt: profitImpact > 0,
    };
  }, [type, hpp, price, discountPct, bundlePay, bundleGet, expectedSalesUplift, baselineUnits]);

  return (
    <ToolsLayout
      heroIcon={<Tag className="w-3.5 h-3.5" />}
      badge="Tools gratis · Kalkulator"
      title="Kalkulator Dampak Promo"
      subtitle="Simulasi dampak diskon, B1G1, atau bundling ke margin & profit sebelum kamu jalankan."
    >
      <div className="space-y-4">
        {/* Input */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-4">Data produk</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Modal / HPP</label>
              <CurrencyInput value={hpp} onChange={setHpp} />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Harga jual normal</label>
              <CurrencyInput value={price} onChange={setPrice} />
            </div>
          </div>

          <h3 className="text-sm font-semibold mb-2">Jenis promo</h3>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-lg mb-4">
            <PromoTab label="Diskon %" active={type === 'discount'} onClick={() => setType('discount')} />
            <PromoTab label="Buy 1 Get 1" active={type === 'b1g1'} onClick={() => setType('b1g1')} />
            <PromoTab label="Bundle" active={type === 'bundle'} onClick={() => setType('bundle')} />
          </div>

          {type === 'discount' && (
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Persentase diskon</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={70}
                  step={1}
                  value={discountPct}
                  onChange={e => setDiscountPct(parseInt(e.target.value))}
                  className="flex-1 accent-stone-900"
                />
                <div className="px-2.5 py-1 bg-stone-100 rounded-md text-sm font-semibold tabular-nums w-14 text-center">
                  {discountPct}%
                </div>
              </div>
            </div>
          )}

          {type === 'bundle' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Customer bayar</label>
                <NumInput value={bundlePay} onChange={setBundlePay} min={1} max={10} suffix="item" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Customer dapat</label>
                <NumInput value={bundleGet} onChange={setBundleGet} min={bundlePay} max={20} suffix="item" />
              </div>
            </div>
          )}
        </div>

        {/* Per-transaction impact */}
        {result && (
          <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6">
            <h2 className="text-base md:text-lg font-semibold mb-1">Dampak per transaksi</h2>
            <p className="text-xs md:text-sm text-stone-500 mb-4">
              Membandingkan: 1 transaksi normal vs 1 transaksi pakai promo "{result.label}"
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ScenarioCard
                title="Tanpa promo"
                price={price}
                cost={hpp}
                profit={result.baseProfit}
                margin={result.baseMargin}
              />
              <ScenarioCard
                title={`Dengan promo (${result.label})`}
                price={result.promoPrice}
                cost={result.promoCost}
                profit={result.promoProfit}
                margin={result.promoMargin}
                isPromoBoxNote={`${result.unitsPerTransaction} unit per transaksi`}
              />
            </div>

            {result.promoProfit < 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-900 leading-relaxed">
                  Promo ini menghasilkan rugi per transaksi. Perlu uplift volume signifikan untuk break-even, atau pertimbangkan promo yang lebih kecil.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Volume scenario */}
        {result && (
          <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6">
            <h2 className="text-base md:text-lg font-semibold mb-1">Dampak ke total profit</h2>
            <p className="text-xs md:text-sm text-stone-500 mb-4">
              Hitung total profit selama periode promo dengan estimasi kenaikan penjualan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Penjualan normal (unit)</label>
                <NumInput value={baselineUnits} onChange={setBaselineUnits} min={1} max={10000} suffix="unit" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Estimasi kenaikan penjualan</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={300}
                    step={5}
                    value={expectedSalesUplift}
                    onChange={e => setExpectedSalesUplift(parseInt(e.target.value))}
                    className="flex-1 accent-stone-900"
                  />
                  <div className="px-2.5 py-1 bg-stone-100 rounded-md text-sm font-semibold tabular-nums w-16 text-center">
                    +{expectedSalesUplift}%
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat
                label="Profit tanpa promo"
                value={`Rp ${Math.round(result.baselineProfit).toLocaleString('id-ID')}`}
                sub={`${baselineUnits} unit`}
              />
              <Stat
                label="Profit dengan promo"
                value={`Rp ${Math.round(result.totalPromoProfit).toLocaleString('id-ID')}`}
                sub={`${Math.round(baselineUnits * (1 + expectedSalesUplift / 100))} unit`}
              />
            </div>

            <div className={cn(
              'mt-3 p-4 rounded-xl',
              result.isWorthIt ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200',
            )}>
              <p className="text-xs font-medium text-stone-700 mb-1">
                {result.isWorthIt ? 'Layak dijalankan' : 'Hati-hati'}
              </p>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                result.isWorthIt ? 'text-emerald-700' : 'text-red-700',
              )}>
                {result.profitImpact > 0 ? '+' : ''}Rp {Math.round(result.profitImpact).toLocaleString('id-ID')}
              </p>
              <p className="text-[11px] text-stone-600 mt-1">
                {result.isWorthIt
                  ? `Promo ini menambah profit Rp ${Math.round(result.profitImpact).toLocaleString('id-ID')} dibanding tanpa promo. Selama uplift penjualan tercapai, ini menguntungkan.`
                  : `Promo ini mengurangi profit Rp ${Math.abs(Math.round(result.profitImpact)).toLocaleString('id-ID')}. Pertimbangkan: turunkan diskon, naikkan target uplift, atau cari cara lain.`}
              </p>
            </div>

            <p className="text-[11px] text-stone-500 mt-3 leading-relaxed">
              Catatan: Asumsi semua transaksi pakai promo. Kalau promo cuma untuk segmen tertentu, hitung manual proporsinya.
            </p>
          </div>
        )}
      </div>
    </ToolsLayout>
  );
}

// ============================================================
// Subcomponents
// ============================================================

function CurrencyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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
        placeholder="0"
        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
      />
    </div>
  );
}

function NumInput({ value, onChange, min, max, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; suffix?: string }) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        value={value || ''}
        onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
        className="w-full pl-3 pr-12 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium pointer-events-none">{suffix}</span>
      )}
    </div>
  );
}

function PromoTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
        active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900',
      )}
    >
      {label}
    </button>
  );
}

function ScenarioCard({ title, price, cost, profit, margin, isPromoBoxNote }: {
  title: string;
  price: number;
  cost: number;
  profit: number;
  margin: number;
  isPromoBoxNote?: string;
}) {
  return (
    <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-xl">
      <p className="text-xs font-semibold text-stone-700 mb-3">{title}</p>
      <div className="space-y-1.5 text-sm">
        <Row label="Harga" value={`Rp ${Math.round(price).toLocaleString('id-ID')}`} />
        <Row label="Modal" value={`Rp ${Math.round(cost).toLocaleString('id-ID')}`} muted />
        <div className="pt-1.5 border-t border-stone-200 space-y-1.5">
          <Row label="Profit" value={`Rp ${Math.round(profit).toLocaleString('id-ID')}`} bold negative={profit < 0} />
          <Row label="Margin" value={`${margin.toFixed(1)}%`} muted />
        </div>
      </div>
      {isPromoBoxNote && (
        <p className="text-[10px] text-stone-500 mt-2 italic">{isPromoBoxNote}</p>
      )}
    </div>
  );
}

function Row({ label, value, bold, muted, negative }: { label: string; value: string; bold?: boolean; muted?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(muted ? 'text-stone-500' : 'text-stone-600', bold && 'font-semibold text-stone-900')}>{label}</span>
      <span className={cn(
        'tabular-nums',
        bold ? 'font-bold' : 'font-medium',
        negative ? 'text-red-600' : 'text-stone-900',
      )}>{value}</span>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-xl">
      <p className="text-[10px] text-stone-500 mb-1">{label}</p>
      <p className="text-base font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-stone-500 mt-0.5">{sub}</p>}
    </div>
  );
}
