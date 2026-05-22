import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Calculator, Sparkles, Target, ArrowLeft, ArrowRight,
  Loader2, Lightbulb, AlertCircle, Download, Save, History,
  Info, ChevronDown, FileSpreadsheet, BookOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import logoAsset from '../assets/img/pcs_logo.png';
import { suggestPriceTiers, analyzeHPP, projectSalesTarget, isAIAvailable, type PriceTier } from '../lib/ai';
import toast, { Toaster } from 'react-hot-toast';
import Select from '../components/ui/Select';

interface VariableCost {
  id: string;
  name: string;       // Bahan
  usageQty: number;   // Jml pakai (per produk)
  usageUnit: string;  // Satuan pakai
  buyPrice: number;   // Total harga beli
  buyQty: number;     // Jml beli
  buyUnit: string;    // Satuan beli
}

interface FixedCost {
  id: string;
  name: string;
  amount: number;
}

interface SavedCalculation {
  id: string;
  productName: string;
  totalHpp: number;
  variableCosts: VariableCost[];
  fixedCosts: FixedCost[];
  targetMonthlyUnits: number;
  selectedPrice: number;
  savedAt: string;
}

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'pack', 'box', 'porsi'];
const STORAGE_KEY = 'hpp_history';
const PRESET_KEY = 'hpp_fixed_cost_preset';

export default function HPPCalculator() {
  const navigate = useNavigate();

  // Product info
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');

  // Variable costs (bahan)
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([
    { id: '1', name: '', usageQty: 0, usageUnit: 'g', buyPrice: 0, buyQty: 1, buyUnit: 'kg' },
  ]);

  // Fixed costs (biaya tetap bulanan)
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([
    { id: '1', name: 'Sewa Tempat', amount: 0 },
    { id: '2', name: 'Listrik & Air', amount: 0 },
  ]);

  // Target produksi & alokasi
  const [targetMonthlyUnits, setTargetMonthlyUnits] = useState(1000);
  const [competitorPrice, setCompetitorPrice] = useState<number | ''>('');

  // Selected price from AI suggestion
  const [selectedPrice, setSelectedPrice] = useState<number>(0);

  // Profit projection
  const [netProfitTarget, setNetProfitTarget] = useState<number | ''>('');

  // AI states
  const [priceTiers, setPriceTiers] = useState<PriceTier[] | null>(null);
  const [hppAnalysis, setHppAnalysis] = useState<string | null>(null);
  const [salesAnalysis, setSalesAnalysis] = useState<string | null>(null);
  const [loadingHpp, setLoadingHpp] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  // History
  const [history, setHistory] = useState<SavedCalculation[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history & preset on mount
  useEffect(() => {
    try {
      const h = localStorage.getItem(STORAGE_KEY);
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);

  // ============================================================
  // Calculations
  // ============================================================

  // Variable cost per produk = (usageQty / buyQty converted) × buyPrice
  // Asumsi simple: kalau satuan sama, ratio langsung
  const calcCostPerProduct = (vc: VariableCost): number => {
    if (vc.buyQty === 0 || vc.buyPrice === 0) return 0;
    // Convert usage to buy unit if possible
    const ratio = convertUnitRatio(vc.usageUnit, vc.buyUnit);
    if (ratio === null) {
      // If can't convert, assume direct ratio
      return (vc.usageQty / vc.buyQty) * vc.buyPrice;
    }
    return (vc.usageQty * ratio / vc.buyQty) * vc.buyPrice;
  };

  const totalVariableCost = useMemo(
    () => variableCosts.reduce((sum, vc) => sum + calcCostPerProduct(vc), 0),
    [variableCosts],
  );

  const totalFixedMonthly = useMemo(
    () => fixedCosts.reduce((sum, fc) => sum + fc.amount, 0),
    [fixedCosts],
  );

  const allocatedFixedPerProduct = useMemo(() => {
    if (targetMonthlyUnits === 0) return 0;
    return totalFixedMonthly / targetMonthlyUnits;
  }, [totalFixedMonthly, targetMonthlyUnits]);

  const totalHpp = totalVariableCost + allocatedFixedPerProduct;

  // Projection metrics
  const profit = selectedPrice - totalHpp;
  const projection = useMemo(() => {
    if (profit <= 0 || !netProfitTarget || selectedPrice === 0) return null;
    const target = typeof netProfitTarget === 'number' ? netProfitTarget : 0;
    const unitsMonthly = Math.ceil((target + totalFixedMonthly) / (selectedPrice - totalVariableCost));
    const dailyTarget = Math.ceil(unitsMonthly / 26);
    const monthlyRevenue = unitsMonthly * selectedPrice;
    const monthlyVariableCost = unitsMonthly * totalVariableCost;
    const monthlyTotalCost = monthlyVariableCost + totalFixedMonthly;
    const monthlyNetProfit = monthlyRevenue - monthlyTotalCost;

    // BEP
    const bepUnits = totalFixedMonthly > 0
      ? Math.ceil(totalFixedMonthly / (selectedPrice - totalVariableCost))
      : 0;
    const bepRevenue = bepUnits * selectedPrice;
    const bepDays = bepUnits > 0 && dailyTarget > 0 ? Math.ceil(bepUnits / dailyTarget) : 0;
    const marginOfSafety = unitsMonthly > 0 ? ((unitsMonthly - bepUnits) / unitsMonthly) * 100 : 0;

    return {
      unitsMonthly, dailyTarget, monthlyRevenue, monthlyVariableCost, monthlyTotalCost,
      monthlyNetProfit, bepUnits, bepRevenue, bepDays, marginOfSafety,
    };
  }, [profit, netProfitTarget, selectedPrice, totalFixedMonthly, totalVariableCost]);

  // ============================================================
  // Handlers
  // ============================================================

  const addVariable = () => {
    setVariableCosts([...variableCosts, {
      id: Date.now().toString(), name: '', usageQty: 0, usageUnit: 'g',
      buyPrice: 0, buyQty: 1, buyUnit: 'kg',
    }]);
  };

  const removeVariable = (id: string) => {
    if (variableCosts.length === 1) return;
    setVariableCosts(variableCosts.filter(v => v.id !== id));
  };

  const updateVariable = (id: string, field: keyof VariableCost, value: any) => {
    setVariableCosts(variableCosts.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const addFixed = () => {
    setFixedCosts([...fixedCosts, { id: Date.now().toString(), name: '', amount: 0 }]);
  };

  const removeFixed = (id: string) => {
    if (fixedCosts.length === 1) return;
    setFixedCosts(fixedCosts.filter(f => f.id !== id));
  };

  const updateFixed = (id: string, field: keyof FixedCost, value: any) => {
    setFixedCosts(fixedCosts.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const savePreset = () => {
    localStorage.setItem(PRESET_KEY, JSON.stringify(fixedCosts));
    toast.success('Preset biaya tetap disimpan');
  };

  const loadPreset = () => {
    try {
      const p = localStorage.getItem(PRESET_KEY);
      if (p) {
        setFixedCosts(JSON.parse(p));
        toast.success('Preset dimuat');
      } else {
        toast.error('Belum ada preset tersimpan');
      }
    } catch {
      toast.error('Gagal memuat preset');
    }
  };

  const handleAnalyzeHPP = async () => {
    if (!isAIAvailable()) { toast.error('Fitur AI belum tersedia'); return; }
    if (totalHpp === 0) { toast.error('Lengkapi data biaya dulu'); return; }
    setLoadingHpp(true);
    setHppAnalysis(null);
    const items = variableCosts.filter(v => v.name && v.buyPrice > 0).map(v => ({
      name: v.name,
      cost: calcCostPerProduct(v),
      qty: v.usageQty,
      unit: v.usageUnit,
    }));
    const result = await analyzeHPP(items);
    if (result) setHppAnalysis(result);
    else toast.error('Gagal menganalisis');
    setLoadingHpp(false);
  };

  const handleSuggestPrice = async () => {
    if (!isAIAvailable()) { toast.error('Fitur AI belum tersedia'); return; }
    if (!productName || totalHpp === 0) { toast.error('Isi nama produk dan HPP dulu'); return; }
    setLoadingPrice(true);
    setPriceTiers(null);
    const tiers = await suggestPriceTiers({
      productName, hpp: totalHpp, category,
      competitorPrice: competitorPrice || undefined,
    });
    if (tiers) {
      setPriceTiers(tiers);
      // Auto-select Standar tier
      const standar = tiers.find(t => t.tier === 'standar');
      if (standar) setSelectedPrice(standar.price);
    } else {
      toast.error('Gagal mendapat saran');
    }
    setLoadingPrice(false);
  };

  const handleAnalyzeSales = async () => {
    if (!isAIAvailable()) { toast.error('Fitur AI belum tersedia'); return; }
    if (!projection || !netProfitTarget) { toast.error('Lengkapi data target dulu'); return; }
    setLoadingSales(true);
    setSalesAnalysis(null);
    const result = await projectSalesTarget({
      productName,
      hpp: totalHpp,
      sellingPrice: selectedPrice,
      netProfitTarget: typeof netProfitTarget === 'number' ? netProfitTarget : 0,
      fixedCostPerMonth: totalFixedMonthly,
    });
    if (result) setSalesAnalysis(result.reasoning);
    else toast.error('Gagal menganalisis');
    setLoadingSales(false);
  };

  const saveCalculation = () => {
    if (!productName) { toast.error('Isi nama produk dulu'); return; }
    const calc: SavedCalculation = {
      id: Date.now().toString(),
      productName, totalHpp, variableCosts, fixedCosts,
      targetMonthlyUnits, selectedPrice,
      savedAt: new Date().toISOString(),
    };
    const updated = [calc, ...history].slice(0, 20); // keep last 20
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success('Perhitungan disimpan');
  };

  const loadCalculation = (calc: SavedCalculation) => {
    setProductName(calc.productName);
    setVariableCosts(calc.variableCosts);
    setFixedCosts(calc.fixedCosts);
    setTargetMonthlyUnits(calc.targetMonthlyUnits);
    setSelectedPrice(calc.selectedPrice);
    setShowHistory(false);
    toast.success(`Dimuat: ${calc.productName}`);
  };

  const deleteFromHistory = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const exportXlsx = () => {
    if (totalHpp === 0) { toast.error('Lengkapi data dulu'); return; }
    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan
    const summary = [
      ['Perhitungan HPP & Harga Jual'],
      ['Produk', productName || '-'],
      ['Kategori', category || '-'],
      ['Tanggal', new Date().toLocaleDateString('id-ID')],
      [],
      ['Total HPP per Produk', totalHpp],
      ['  Biaya Variabel per Produk', totalVariableCost],
      ['  Alokasi Biaya Tetap', allocatedFixedPerProduct],
      ['Target Penjualan / Bulan', targetMonthlyUnits],
      [],
      ['Harga Jual Terpilih', selectedPrice],
      ['Profit per Unit', profit],
      ['Margin', selectedPrice > 0 ? `${((profit / selectedPrice) * 100).toFixed(1)}%` : '-'],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Ringkasan');

    // Sheet 2: Biaya Variabel
    const varHeader = ['Bahan', 'Jml Pakai', 'Satuan Pakai', 'Total Harga Beli', 'Jml Beli', 'Satuan Beli', 'Biaya per Produk'];
    const varRows = variableCosts.map(v => [
      v.name, v.usageQty, v.usageUnit, v.buyPrice, v.buyQty, v.buyUnit, calcCostPerProduct(v),
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([varHeader, ...varRows]), 'Biaya Variabel');

    // Sheet 3: Biaya Tetap
    const fixedHeader = ['Nama Biaya', 'Total / Bulan', 'Alokasi per Produk'];
    const fixedRows = fixedCosts.map(f => [
      f.name, f.amount, targetMonthlyUnits > 0 ? f.amount / targetMonthlyUnits : 0,
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([fixedHeader, ...fixedRows]), 'Biaya Tetap');

    // Sheet 4: Saran Harga (kalau ada)
    if (priceTiers) {
      const tierHeader = ['Tier', 'Harga', 'Profit', 'Margin', 'Reasoning'];
      const tierRows = priceTiers.map(t => [t.tier, t.price, t.profit, `${t.margin}%`, t.reasoning]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([tierHeader, ...tierRows]), 'Saran Harga');
    }

    // Sheet 5: Proyeksi (kalau ada)
    if (projection) {
      const projData = [
        ['Metrik', 'Nilai'],
        ['Target Jual / Hari', `${projection.dailyTarget} unit`],
        ['Total Jual / Bulan', `${projection.unitsMonthly} unit`],
        ['Potensi Omzet / Bulan', projection.monthlyRevenue],
        ['Total Biaya Variabel / Bulan', projection.monthlyVariableCost],
        ['Total Biaya / Bulan', projection.monthlyTotalCost],
        ['Proyeksi Laba Bersih', projection.monthlyNetProfit],
        [],
        ['BEP Unit', projection.bepUnits],
        ['BEP Omzet', projection.bepRevenue],
        ['BEP tercapai hari ke-', projection.bepDays],
        ['Margin of Safety', `${projection.marginOfSafety.toFixed(1)}%`],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projData), 'Proyeksi');
    }

    const filename = `HPP_${productName.replace(/\s+/g, '_') || 'produk'}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('File Excel berhasil diekspor');
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased">
      <Toaster position="top-center" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src={logoAsset} alt="myStore" className="w-8 h-8 object-contain" />
            <span className="text-base font-bold tracking-tight">myStore</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <History className="w-4 h-4" /> Riwayat
              {history.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 bg-stone-900 text-white rounded font-semibold">
                  {history.length}
                </span>
              )}
            </button>
            <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-14">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-medium text-stone-500 mb-4">
            <Calculator className="w-3.5 h-3.5" /> Tools gratis
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Kalkulator HPP & Harga Jual
          </h1>
          <p className="text-stone-500 text-sm md:text-base max-w-xl mx-auto">
            Hitung modal produk lengkap dengan alokasi biaya tetap, saran harga jual dari AI, dan proyeksi target penjualan.
          </p>
        </div>

        {/* Guide / How-to */}
        <HPPGuide />

        {/* Product Info */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldInput label="Nama produk" value={productName} onChange={setProductName} placeholder="Contoh: Ayam penyet cabe ijo" />
            <FieldInput label="Kategori (opsional)" value={category} onChange={setCategory} placeholder="Contoh: F&B, Minuman" />
          </div>
        </div>

        {/* Variable Costs */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 mb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base md:text-lg font-semibold">Biaya Variabel <span className="text-xs font-normal text-stone-400">(Variable Cost)</span></h2>
              <p className="text-xs md:text-sm text-stone-500 mt-0.5">
                Rincikan semua bahan untuk membuat satu produk jadi.
              </p>
            </div>
            <button
              onClick={exportXlsx}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export .xlsx
            </button>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3 mb-3">
            {variableCosts.map((vc, idx) => (
              <VariableCostCard
                key={vc.id}
                index={idx}
                vc={vc}
                onUpdate={(field, val) => updateVariable(vc.id, field, val)}
                onRemove={() => removeVariable(vc.id)}
                canRemove={variableCosts.length > 1}
                cost={calcCostPerProduct(vc)}
              />
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left text-[11px] font-medium text-stone-500 pb-2 pr-2">Bahan</th>
                  <th colSpan={2} className="text-left text-[11px] font-medium text-stone-500 pb-2 pr-2">Pemakaian per Produk</th>
                  <th colSpan={3} className="text-left text-[11px] font-medium text-stone-500 pb-2 pr-2">Info Pembelian Bahan</th>
                  <th className="text-right text-[11px] font-medium text-stone-500 pb-2">Biaya / Produk</th>
                  <th className="w-8" />
                </tr>
                <tr className="border-b border-stone-200">
                  <th />
                  <th className="text-left text-[10px] text-stone-400 font-normal pb-2 pr-2">Jml Pakai</th>
                  <th className="text-left text-[10px] text-stone-400 font-normal pb-2 pr-2">Satuan</th>
                  <th className="text-right text-[10px] text-stone-400 font-normal pb-2 pr-2">Total Harga</th>
                  <th className="text-left text-[10px] text-stone-400 font-normal pb-2 pr-2">Jml Beli</th>
                  <th className="text-left text-[10px] text-stone-400 font-normal pb-2 pr-2">Satuan</th>
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {variableCosts.map(vc => (
                  <tr key={vc.id} className="align-middle">
                    <td className="py-2 pr-2">
                      <input
                        value={vc.name}
                        onChange={e => updateVariable(vc.id, 'name', e.target.value)}
                        placeholder="Nama bahan"
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <NumInput
                        value={vc.usageQty}
                        onChange={v => updateVariable(vc.id, 'usageQty', v)}
                        allowDecimal
                        className="w-20 px-2.5 py-1.5 bg-white border border-stone-200 rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Select
                        value={vc.usageUnit}
                        onChange={v => updateVariable(vc.id, 'usageUnit', v)}
                        options={UNITS.map(u => ({ value: u, label: u }))}
                        size="sm"
                        buttonClassName="text-sm"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <CurrencyInput
                        value={vc.buyPrice}
                        onChange={v => updateVariable(vc.id, 'buyPrice', v)}
                        placeholder="0"
                        className="w-32 py-1.5 bg-white border border-stone-200 rounded-md text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <NumInput
                        value={vc.buyQty}
                        onChange={v => updateVariable(vc.id, 'buyQty', v)}
                        allowDecimal
                        className="w-16 px-2.5 py-1.5 bg-white border border-stone-200 rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Select
                        value={vc.buyUnit}
                        onChange={v => updateVariable(vc.id, 'buyUnit', v)}
                        options={UNITS.map(u => ({ value: u, label: u }))}
                        size="sm"
                        buttonClassName="text-sm"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-sm font-semibold text-stone-900 tabular-nums bg-stone-100 px-2.5 py-1 rounded-md whitespace-nowrap">
                        Rp {calcCostPerProduct(vc).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="py-2 pl-2">
                      <button
                        onClick={() => removeVariable(vc.id)}
                        disabled={variableCosts.length === 1}
                        className="text-stone-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addVariable}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Bahan
          </button>
        </div>

        {/* Fixed Cost Allocation */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 mb-4">
          <h2 className="text-base md:text-lg font-semibold mb-1">Alokasi Biaya Tetap per Produk</h2>
          <p className="text-xs md:text-sm text-stone-500 mb-4">
            Alokasikan sebagian dari total biaya bulanan ke setiap produk yang terjual.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 mb-4">
            <label className="text-xs font-medium text-emerald-900 block mb-1.5">
              Target Penjualan Produk Ini (Unit/Bulan)
            </label>
            <NumInput
              value={targetMonthlyUnits}
              onChange={setTargetMonthlyUnits}
              className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[11px] text-emerald-700 mt-1.5">
              Target penjualan HANYA untuk produk yang sedang dihitung ini.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            <div className="text-[11px] font-medium text-stone-500 px-1">Nama Biaya</div>
            <div className="text-[11px] font-medium text-stone-500 px-1 hidden md:block">Total Biaya (per bulan)</div>
          </div>

          <div className="space-y-2 mb-3">
            {fixedCosts.map(fc => (
              <div key={fc.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  value={fc.name}
                  onChange={e => updateFixed(fc.id, 'name', e.target.value)}
                  placeholder="Sewa Tempat (per bulan)"
                  className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
                <CurrencyInput
                  value={fc.amount}
                  onChange={v => updateFixed(fc.id, 'amount', v)}
                  placeholder="0"
                  className="w-full py-2 bg-white border border-stone-200 rounded-lg text-sm tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
                <button
                  onClick={() => removeFixed(fc.id)}
                  disabled={fixedCosts.length === 1}
                  className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={addFixed} className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
              <Plus className="w-3.5 h-3.5" /> Tambah Biaya
            </button>
            <button onClick={savePreset} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900">
              <Save className="w-3.5 h-3.5" /> Simpan Preset
            </button>
            <button onClick={loadPreset} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900">
              <Download className="w-3.5 h-3.5" /> Muat Preset
            </button>
          </div>
        </div>

        {/* HPP Result */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 mb-4">
          <h2 className="text-base md:text-lg font-semibold mb-4">Hasil Perhitungan</h2>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold text-stone-700 mb-3">$ Rincian HPP per Produk</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-600">Biaya Variabel per Produk</span>
                <span className="font-semibold tabular-nums">Rp {totalVariableCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-stone-600">
                  Alokasi Biaya Tetap
                  <Info className="w-3 h-3 text-stone-400" />
                </div>
                <span className="font-semibold tabular-nums">Rp {allocatedFixedPerProduct.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
              </div>
              {targetMonthlyUnits > 0 && totalFixedMonthly > 0 && (
                <p className="text-[11px] text-stone-400">
                  (Total Rp {totalFixedMonthly.toLocaleString('id-ID')} / {targetMonthlyUnits.toLocaleString('id-ID')} unit)
                </p>
              )}
              <div className="border-t border-stone-200 pt-2 flex items-center justify-between">
                <span className="font-semibold text-stone-900">Total HPP per Produk</span>
                <span className="font-bold text-base tabular-nums text-stone-900">
                  Rp {totalHpp.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <button
              onClick={handleAnalyzeHPP}
              disabled={loadingHpp || totalHpp === 0}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loadingHpp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {loadingHpp ? 'Menganalisis...' : 'Analisis HPP dengan AI'}
            </button>
          </div>

          <AnimatePresence>
            {hppAnalysis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{hppAnalysis}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Price Suggestions */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 mb-4">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div>
              <h2 className="text-base md:text-lg font-semibold">
                Saran Harga Jual{' '}
                <span className="text-xs font-medium text-blue-600 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Didukung oleh AI
                </span>
              </h2>
              <p className="text-xs md:text-sm text-stone-500 mt-0.5">
                AI memberikan 3 tier harga: kompetitif, standar, dan premium.
              </p>
            </div>
          </div>

          <FieldInputNumber
            label="Harga kompetitor (opsional)"
            value={competitorPrice}
            onChange={setCompetitorPrice}
            placeholder="0"
            prefix="Rp"
            className="mb-4"
          />

          {!priceTiers ? (
            <button
              onClick={handleSuggestPrice}
              disabled={loadingPrice || !productName || totalHpp === 0}
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loadingPrice ? 'AI sedang berpikir...' : 'Minta Saran Harga AI'}
            </button>
          ) : (
            <div className="space-y-3">
              {priceTiers.map(tier => (
                <PriceTierCard
                  key={tier.tier}
                  tier={tier}
                  selected={selectedPrice === tier.price}
                  onSelect={() => setSelectedPrice(tier.price)}
                />
              ))}
              <button
                onClick={handleSuggestPrice}
                disabled={loadingPrice}
                className="w-full text-xs font-medium text-stone-500 hover:text-stone-900 py-1.5 transition-colors"
              >
                Generate ulang saran AI
              </button>
            </div>
          )}
        </div>

        {/* Sales Projection */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 md:p-6 mb-4">
          <div className="flex items-start gap-2.5 mb-4">
            <Target className="w-4 h-4 text-stone-700 mt-0.5" />
            <div>
              <h2 className="text-base md:text-lg font-semibold">Target & Proyeksi Penjualan</h2>
              <p className="text-xs md:text-sm text-stone-500 mt-0.5">
                Hitung berapa unit harus terjual untuk capai target laba bersih.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <FieldInputNumber
              label="Target Laba Bersih / Bulan"
              value={netProfitTarget}
              onChange={setNetProfitTarget}
              placeholder="Contoh: 10.000.000"
              prefix="Rp"
            />
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Harga Jual Pilihan</label>
              <CurrencyInput
                value={selectedPrice}
                onChange={setSelectedPrice}
                placeholder="Pilih dari saran AI"
                className="w-full py-2 bg-white border border-stone-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              />
            </div>
          </div>

          {!projection ? (
            <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl flex items-center gap-2.5 mb-4">
              <AlertCircle className="w-4 h-4 text-stone-500 shrink-0" />
              <p className="text-xs text-stone-600">
                Lengkapi target laba dan harga jual untuk lihat proyeksi.
              </p>
            </div>
          ) : (
            <>
              {/* Sales Target */}
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">Target Penjualan</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Stat label="Target Jual / Hari" value={`${projection.dailyTarget} unit`} sub="26 hari kerja" accent />
                  <Stat label="Total Jual / Bulan" value={`${projection.unitsMonthly.toLocaleString('id-ID')} unit`} />
                  <Stat label="Potensi Omzet / Bulan" value={`Rp ${projection.monthlyRevenue.toLocaleString('id-ID')}`} />
                </div>
              </div>

              {/* Cost & Profit */}
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">Biaya & Laba</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Stat label="Biaya Produksi / Bulan" value={`Rp ${projection.monthlyVariableCost.toLocaleString('id-ID')}`} sub="HPP × unit" />
                  <Stat label="Total Biaya / Bulan" value={`Rp ${projection.monthlyTotalCost.toLocaleString('id-ID')}`} sub="produksi + tetap" />
                  <Stat label="Proyeksi Laba Bersih" value={`Rp ${projection.monthlyNetProfit.toLocaleString('id-ID')}`} positive={projection.monthlyNetProfit > 0} />
                </div>
              </div>

              {/* BEP */}
              <div className="p-4 bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 rounded-xl mb-4">
                <div className="flex items-start gap-2.5 mb-3">
                  <Calculator className="w-4 h-4 text-stone-700 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Analisis Break Even Point (BEP)</p>
                    <p className="text-[11px] text-stone-500">Titik impas — minimal jualan untuk balik modal biaya tetap</p>
                  </div>
                </div>
                {projection.bepUnits > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <BEPStat label="BEP Unit" value={`${projection.bepUnits.toLocaleString('id-ID')} unit`} />
                    <BEPStat label="BEP Omzet" value={`Rp ${projection.bepRevenue.toLocaleString('id-ID')}`} />
                    <BEPStat label="BEP Tercapai" value={`hari ke-${projection.bepDays}`} sub="dari 26 hari" />
                    <BEPStat
                      label="Margin of Safety"
                      value={`${projection.marginOfSafety.toFixed(1)}%`}
                      sub={projection.marginOfSafety > 30 ? 'aman' : projection.marginOfSafety > 0 ? 'tipis' : 'risiko'}
                      tone={projection.marginOfSafety > 30 ? 'good' : projection.marginOfSafety > 0 ? 'warn' : 'bad'}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-stone-500">
                    Tidak ada biaya tetap — setiap unit terjual sudah menghasilkan laba bersih.
                  </p>
                )}
              </div>

              <button
                onClick={handleAnalyzeSales}
                disabled={loadingSales}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-colors"
              >
                {loadingSales ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loadingSales ? 'Menyusun strategi...' : 'Minta Analisis AI'}
              </button>

              <AnimatePresence>
                {salesAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-stone-700 leading-relaxed">{salesAnalysis}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <button
            onClick={saveCalculation}
            className="inline-flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Save className="w-4 h-4" /> Simpan Perhitungan
          </button>
          <button
            onClick={exportXlsx}
            className="inline-flex items-center justify-center gap-2 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export .xlsx
          </button>
        </div>

        {/* CTA */}
        <div className="mt-10 p-6 md:p-8 bg-stone-900 text-white rounded-2xl text-center">
          <h3 className="text-xl md:text-2xl font-bold mb-2">Mau yang otomatis tersinkron dengan toko?</h3>
          <p className="text-stone-400 text-sm md:text-base mb-5 max-w-md mx-auto">
            Di myStore, HPP, harga jual, dan target penjualan langsung terhubung dengan POS dan stok.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-stone-900 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors"
          >
            Coba myStore gratis <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {!isAIAvailable() && (
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Fitur AI butuh API key. Tetap bisa pakai kalkulator manual & export.</span>
          </div>
        )}
      </div>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <HistoryDrawer
            history={history}
            onLoad={loadCalculation}
            onDelete={deleteFromHistory}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Subcomponents
// ============================================================

function HPPGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200 rounded-2xl mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-amber-100/40 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-900">Belum tahu cara hitung HPP yang benar?</p>
          <p className="text-xs text-stone-600 mt-0.5">Klik untuk baca panduan singkat 2 menit.</p>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-stone-500 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-4 text-sm text-stone-700 leading-relaxed">
              <div>
                <p className="font-semibold text-stone-900 mb-1">1. Apa itu HPP?</p>
                <p className="text-xs md:text-sm">
                  HPP (Harga Pokok Produksi) adalah total biaya untuk membuat <strong>satu unit produk siap jual</strong>. HPP terdiri dari dua komponen utama: <strong>biaya variabel</strong> dan <strong>alokasi biaya tetap</strong>.
                </p>
              </div>

              <div>
                <p className="font-semibold text-stone-900 mb-1">2. Hitung Biaya Variabel</p>
                <p className="text-xs md:text-sm mb-2">
                  Ini biaya bahan/modal yang berubah-ubah tergantung berapa unit yang kamu produksi. Contoh untuk Ayam Penyet:
                </p>
                <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs space-y-1 font-mono">
                  <p>Beli ayam: <strong>1 kg = Rp 35.000</strong></p>
                  <p>Pakai per porsi: <strong>150 gram</strong></p>
                  <p className="text-emerald-700">→ Biaya per produk = (150 / 1000) × 35.000 = Rp 5.250</p>
                </div>
                <p className="text-[11px] text-stone-500 mt-2">
                  Tips: Jangan lupa hitung bumbu, kemasan, gas/listrik untuk masak (kalau bisa diukur).
                </p>
              </div>

              <div>
                <p className="font-semibold text-stone-900 mb-1">3. Alokasi Biaya Tetap</p>
                <p className="text-xs md:text-sm mb-2">
                  Biaya yang sama setiap bulan (sewa, gaji, listrik dasar). Bagi rata ke <strong>target penjualan bulanan</strong>:
                </p>
                <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs space-y-1 font-mono">
                  <p>Total biaya tetap: <strong>Rp 4.150.000 / bulan</strong></p>
                  <p>Target jual: <strong>5.000 unit / bulan</strong></p>
                  <p className="text-emerald-700">→ Alokasi per unit = 4.150.000 / 5.000 = Rp 830</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-stone-900 mb-1">4. Total HPP</p>
                <div className="bg-stone-900 text-white rounded-lg p-3 text-xs font-mono">
                  <p>Total HPP = Biaya Variabel + Alokasi Biaya Tetap</p>
                  <p className="text-emerald-400 mt-1">= Rp 7.410 + Rp 830 = Rp 8.240</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-stone-900 mb-1">5. Tips menentukan target penjualan</p>
                <ul className="text-xs md:text-sm space-y-1 list-disc pl-4 text-stone-600">
                  <li>Untuk produk baru, asumsikan target konservatif (jangan over-optimis)</li>
                  <li>Lihat data penjualan kompetitor sejenis di area yang sama</li>
                  <li>Kalau target tidak tercapai, alokasi biaya tetap per unit jadi lebih besar → margin kecil</li>
                  <li>Review ulang HPP setiap bulan sesuai data aktual</li>
                </ul>
              </div>

              <div className="pt-2 border-t border-amber-200">
                <p className="text-[11px] text-stone-500">
                  Sudah paham? Yuk mulai hitung di bawah. Kalau masih bingung, AI akan bantu kasih saran.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VariableCostCard({
  index, vc, onUpdate, onRemove, canRemove, cost,
}: {
  index: number;
  vc: VariableCost;
  onUpdate: (field: keyof VariableCost, val: any) => void;
  onRemove: () => void;
  canRemove: boolean;
  cost: number;
}) {
  return (
    <div className="border border-stone-200 rounded-xl p-3 bg-stone-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-stone-500">Bahan #{index + 1}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-900 tabular-nums bg-white px-2 py-0.5 rounded">
            Rp {cost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
          </span>
          <button
            onClick={onRemove}
            disabled={!canRemove}
            className="text-stone-400 hover:text-red-500 disabled:opacity-30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <input
        value={vc.name}
        onChange={e => onUpdate('name', e.target.value)}
        placeholder="Nama bahan"
        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-[10px] text-stone-500">Jml Pakai</label>
          <NumInput
            value={vc.usageQty}
            onChange={v => onUpdate('usageQty', v)}
            allowDecimal
            className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-md text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-500">Satuan</label>
          <Select
            value={vc.usageUnit}
            onChange={v => onUpdate('usageUnit', v)}
            options={UNITS.map(u => ({ value: u, label: u }))}
            size="sm"
            buttonClassName="text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-stone-500">Total Harga</label>
          <CurrencyInput
            value={vc.buyPrice}
            onChange={v => onUpdate('buyPrice', v)}
            className="w-full py-1.5 bg-white border border-stone-200 rounded-md text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-500">Jml Beli</label>
          <NumInput
            value={vc.buyQty}
            onChange={v => onUpdate('buyQty', v)}
            allowDecimal
            className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-md text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-500">Satuan</label>
          <Select
            value={vc.buyUnit}
            onChange={v => onUpdate('buyUnit', v)}
            options={UNITS.map(u => ({ value: u, label: u }))}
            size="sm"
            buttonClassName="text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function PriceTierCard({ tier, selected, onSelect }: { tier: PriceTier; selected: boolean; onSelect: () => void }) {
  const colorMap = {
    kompetitif: { bg: 'bg-blue-50', border: 'border-blue-200', tag: 'bg-blue-100 text-blue-700' },
    standar: { bg: 'bg-emerald-50', border: 'border-emerald-200', tag: 'bg-emerald-100 text-emerald-700' },
    premium: { bg: 'bg-purple-50', border: 'border-purple-200', tag: 'bg-purple-100 text-purple-700' },
  };
  const c = colorMap[tier.tier];
  const labelMap = { kompetitif: 'Kompetitif', standar: 'Standar', premium: 'Premium' };

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-xl border-2 transition-all',
        selected ? 'border-stone-900 bg-stone-900/5' : c.border,
        !selected && c.bg,
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide', c.tag)}>
          {labelMap[tier.tier]}
        </span>
        <span className="text-2xl font-bold text-emerald-600 tabular-nums">
          Rp {tier.price.toLocaleString('id-ID')}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-stone-600">Profit:</span>
        <span className="font-semibold text-stone-900 tabular-nums">Rp {tier.profit.toLocaleString('id-ID')}</span>
      </div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-stone-600">Margin:</span>
        <span className="font-semibold text-stone-900 tabular-nums">{tier.margin}%</span>
      </div>
      <p className="text-xs text-stone-500 italic leading-relaxed">"{tier.reasoning}"</p>
    </button>
  );
}

function HistoryDrawer({
  history, onLoad, onDelete, onClose,
}: {
  history: SavedCalculation[];
  onLoad: (c: SavedCalculation) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-50"
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white z-50 shadow-xl flex flex-col"
      >
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Riwayat Perhitungan</h3>
            <p className="text-xs text-stone-500">{history.length} tersimpan</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100">
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-8 h-8 mx-auto text-stone-300 mb-2" />
              <p className="text-sm text-stone-500">Belum ada perhitungan tersimpan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(calc => (
                <div key={calc.id} className="border border-stone-200 rounded-xl p-3 hover:border-stone-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{calc.productName}</p>
                      <p className="text-[11px] text-stone-400">{new Date(calc.savedAt).toLocaleString('id-ID')}</p>
                    </div>
                    <button onClick={() => onDelete(calc.id)} className="text-stone-400 hover:text-red-500 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <p className="text-stone-400">HPP</p>
                      <p className="font-semibold tabular-nums">Rp {calc.totalHpp.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-stone-400">Harga jual</p>
                      <p className="font-semibold tabular-nums">Rp {calc.selectedPrice.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onLoad(calc)}
                    className="w-full py-1.5 bg-stone-900 text-white rounded-md text-xs font-medium hover:bg-stone-800"
                  >
                    Muat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function FieldInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-stone-600 block mb-1.5">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
      />
    </div>
  );
}

function FieldInputNumber({
  label, value, onChange, placeholder, prefix, className,
}: {
  label: string;
  value: number | '';
  onChange: (v: number | '') => void;
  placeholder?: string;
  prefix?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-stone-600 block mb-1.5">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={value === '' ? '' : formatThousand(value)}
          onChange={e => {
            const parsed = parseThousand(e.target.value);
            onChange(parsed === null ? '' : parsed);
          }}
          placeholder={placeholder}
          className={cn(
            'w-full py-2 bg-white border border-stone-200 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10',
            prefix ? 'pl-9 pr-3' : 'px-3',
          )}
        />
      </div>
    </div>
  );
}

/** Format a number with thousand separator (1000000 → "1.000.000") */
function formatThousand(n: number): string {
  if (isNaN(n)) return '';
  return n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

/** Parse a string with thousand separator to number, returns null if empty/invalid */
function parseThousand(s: string): number | null {
  const cleaned = s.replace(/[^\d]/g, ''); // strip everything except digits (no minus)
  if (cleaned === '') return null;
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : Math.max(0, n);
}

/** Number input that only accepts non-negative numbers, no separator */
function NumInput({
  value, onChange, placeholder, className, allowDecimal = false,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
  allowDecimal?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={value === 0 ? '' : value.toString()}
      onChange={e => {
        let v = e.target.value.replace(/[^\d.]/g, ''); // digits + dot only, no minus
        if (!allowDecimal) v = v.replace(/\./g, '');
        const parsed = allowDecimal ? parseFloat(v) : parseInt(v, 10);
        onChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

/** Formatted thousand-separator currency input (with Rp prefix) */
function CurrencyInput({
  value, onChange, placeholder, className,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-medium pointer-events-none">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? '' : formatThousand(value)}
        onChange={e => {
          const parsed = parseThousand(e.target.value);
          onChange(parsed ?? 0);
        }}
        placeholder={placeholder}
        className={cn('pl-10 pr-3', className)}
      />
    </div>
  );
}

function Stat({ label, value, sub, accent, positive }: { label: string; value: string; sub?: string; accent?: boolean; positive?: boolean }) {
  return (
    <div className={cn('p-3 rounded-xl border', accent ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 border-stone-200')}>
      <p className={cn('text-[10px] mb-1', accent ? 'text-stone-400' : 'text-stone-500')}>{label}</p>
      <p className={cn('text-base font-bold tabular-nums', !accent && positive === false && 'text-red-600', !accent && positive === true && 'text-emerald-600')}>{value}</p>
      {sub && <p className={cn('text-[10px] mt-0.5', accent ? 'text-stone-400' : 'text-stone-500')}>{sub}</p>}
    </div>
  );
}

function BEPStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-2.5">
      <p className="text-[10px] text-stone-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
      {sub && (
        <p className={cn(
          'text-[10px] mt-0.5 font-medium',
          tone === 'good' && 'text-emerald-600',
          tone === 'warn' && 'text-amber-600',
          tone === 'bad' && 'text-red-600',
          !tone && 'text-stone-400',
        )}>{sub}</p>
      )}
    </div>
  );
}

// ============================================================
// Unit conversion helpers
// ============================================================

const UNIT_TO_BASE: Record<string, number> = {
  g: 1, kg: 1000,
  ml: 1, L: 1000,
  pcs: 1, pack: 1, box: 1, porsi: 1,
};

function convertUnitRatio(usageUnit: string, buyUnit: string): number | null {
  const usageBase = UNIT_TO_BASE[usageUnit];
  const buyBase = UNIT_TO_BASE[buyUnit];
  if (!usageBase || !buyBase) return null;
  // If the units are not in the same group (mass vs volume vs count), can't convert
  const isMass = (u: string) => u === 'g' || u === 'kg';
  const isVolume = (u: string) => u === 'ml' || u === 'L';
  const isCount = (u: string) => u === 'pcs' || u === 'pack' || u === 'box' || u === 'porsi';

  if (isMass(usageUnit) !== isMass(buyUnit) && isVolume(usageUnit) !== isVolume(buyUnit) && isCount(usageUnit) !== isCount(buyUnit)) {
    return null;
  }
  return usageBase / buyBase;
}
