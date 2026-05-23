import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Calculator, Sparkles,
  Loader2, Lightbulb, AlertCircle, Save, History,
  Info, ChevronDown, FileSpreadsheet, ArrowRight,
  Percent, TrendingUp, TrendingDown, ArrowLeft,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { suggestPriceTiers, analyzeHPP, projectSalesTarget, isAIAvailable, type PriceTier } from '../lib/ai';
import toast from 'react-hot-toast';
import Select from '../components/ui/Select';
import RecipeSuggestionModal from '../components/RecipeSuggestionModal';
import FixedCostsSuggestionModal from '../components/FixedCostsSuggestionModal';
import ToolsLayout from '../components/tools/ToolsLayout';

// ============================================================
// Types
// ============================================================

interface VariableCost {
  id: string;
  name: string;
  usageQty: number;
  usageUnit: string;
  buyPrice: number;
  buyQty: number;
  buyUnit: string;
}

interface PackagingCost {
  id: string;
  name: string;
  costPerUnit: number;
}

interface FixedCost {
  id: string;
  name: string;
  amount: number;
}

interface LaborCost {
  id: string;
  name: string;
  monthlyAmount: number;
  /** If true, treated as variable per unit (allocated to production capacity); if false, treated as fixed (allocated regardless of capacity utilization) */
  perUnit: boolean;
}

interface SalesChannel {
  id: string;
  name: string;
  commissionPct: number; // 0-100
  enabled: boolean;
}

interface SavedCalculation {
  id: string;
  productName: string;
  totalHpp: number;
  variableCosts: VariableCost[];
  packagingCosts: PackagingCost[];
  fixedCosts: FixedCost[];
  laborCosts: LaborCost[];
  productionCapacity: number;
  selectedPrice: number;
  wastagePct: number;
  taxPct: number;
  channels: SalesChannel[];
  savedAt: string;
}

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'pack', 'box', 'porsi'];
const STORAGE_KEY = 'hpp_history';

const CATEGORY_MARGIN_GUIDE: Record<string, { min: number; max: number; note: string }> = {
  'F&B / Makanan': { min: 60, max: 70, note: 'Standar industri kuliner Indonesia' },
  'Minuman': { min: 65, max: 80, note: 'Margin minuman biasanya lebih tinggi dari makanan' },
  'Retail / Sembako': { min: 15, max: 30, note: 'Margin tipis, andalkan volume tinggi' },
  'Fashion': { min: 50, max: 100, note: 'Bisa tinggi untuk brand premium' },
  'Jasa': { min: 40, max: 70, note: 'Margin tergantung effort dan branding' },
  'Kerajinan / Handmade': { min: 50, max: 80, note: 'Hargai waktu produksi dengan layak' },
};

// ============================================================
// Main Component
// ============================================================

export default function HPPCalculator() {
  const navigate = useNavigate();

  // Product info
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');

  // Variable costs
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([
    { id: '1', name: '', usageQty: 0, usageUnit: 'g', buyPrice: 0, buyQty: 1, buyUnit: 'kg' },
  ]);

  // Packaging
  const [packagingCosts, setPackagingCosts] = useState<PackagingCost[]>([
    { id: '1', name: 'Box / Kemasan', costPerUnit: 0 },
  ]);

  // Wastage (%)
  const [wastagePct, setWastagePct] = useState<number>(5);

  // Labor
  const [laborCosts, setLaborCosts] = useState<LaborCost[]>([]);

  // Fixed costs
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);

  // Whether fixed costs should be allocated into HPP (default off for early-stage UMKM)
  const [includeFixedInHpp, setIncludeFixedInHpp] = useState<boolean>(false);

  // Capacity
  const [productionCapacity, setProductionCapacity] = useState(1000);
  const [competitorPrice, setCompetitorPrice] = useState<number | ''>('');

  // Selected price
  const [selectedPrice, setSelectedPrice] = useState<number>(0);

  // Net profit target
  const [netProfitTarget, setNetProfitTarget] = useState<number | ''>('');

  // Sales channels (commission)
  const [channels, setChannels] = useState<SalesChannel[]>([
    { id: '1', name: 'Dine-in / Pickup', commissionPct: 0, enabled: true },
    { id: '2', name: 'GoFood / GrabFood', commissionPct: 22, enabled: false },
    { id: '3', name: 'Marketplace (Tokopedia/Shopee)', commissionPct: 8, enabled: false },
  ]);

  // Tax
  const [taxPct, setTaxPct] = useState<number>(0);

  // Sensitivity (price stress test)
  const [stressMaterialPct, setStressMaterialPct] = useState<number>(0);
  const [stressVolumePct, setStressVolumePct] = useState<number>(0);

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

  // Modals
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showFixedCostsModal, setShowFixedCostsModal] = useState(false);

  // Load history on mount
  useEffect(() => {
    try {
      const h = localStorage.getItem(STORAGE_KEY);
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);

  // ============================================================
  // Calculations
  // ============================================================

  const calcCostPerProduct = (vc: VariableCost): number => {
    if (vc.buyQty === 0 || vc.buyPrice === 0) return 0;
    const ratio = convertUnitRatio(vc.usageUnit, vc.buyUnit);
    if (ratio === null) {
      return (vc.usageQty / vc.buyQty) * vc.buyPrice;
    }
    return (vc.usageQty * ratio / vc.buyQty) * vc.buyPrice;
  };

  // Variable: bahan baku
  const rawMaterialCost = useMemo(
    () => variableCosts.reduce((sum, vc) => sum + calcCostPerProduct(vc), 0),
    [variableCosts],
  );

  // Variable: + susut
  const materialWithWastage = useMemo(
    () => rawMaterialCost * (1 + wastagePct / 100),
    [rawMaterialCost, wastagePct],
  );

  // Packaging per unit
  const packagingPerUnit = useMemo(
    () => packagingCosts.reduce((sum, p) => sum + p.costPerUnit, 0),
    [packagingCosts],
  );

  // Labor: split into variable & fixed
  const laborVariablePerUnit = useMemo(() => {
    if (productionCapacity === 0) return 0;
    return laborCosts
      .filter(l => l.perUnit)
      .reduce((sum, l) => sum + l.monthlyAmount, 0) / productionCapacity;
  }, [laborCosts, productionCapacity]);

  const laborFixedMonthly = useMemo(
    () => laborCosts.filter(l => !l.perUnit).reduce((sum, l) => sum + l.monthlyAmount, 0),
    [laborCosts],
  );

  // Total variable per unit
  const totalVariablePerUnit = materialWithWastage + packagingPerUnit + laborVariablePerUnit;

  // Fixed monthly (operational + fixed labor)
  const totalFixedMonthly = useMemo(
    () => fixedCosts.reduce((sum, fc) => sum + fc.amount, 0) + laborFixedMonthly,
    [fixedCosts, laborFixedMonthly],
  );

  // Allocation
  const allocatedFixedPerProduct = useMemo(() => {
    if (!includeFixedInHpp) return 0;
    if (productionCapacity === 0) return 0;
    return totalFixedMonthly / productionCapacity;
  }, [includeFixedInHpp, totalFixedMonthly, productionCapacity]);

  const totalHpp = totalVariablePerUnit + allocatedFixedPerProduct;

  // Active sales channels
  const activeChannels = useMemo(() => channels.filter(c => c.enabled), [channels]);
  const avgCommissionPct = useMemo(() => {
    if (activeChannels.length === 0) return 0;
    return activeChannels.reduce((sum, c) => sum + c.commissionPct, 0) / activeChannels.length;
  }, [activeChannels]);

  // Net selling price after channel commission & tax
  const netPricePerUnit = (price: number, commissionPct: number) => {
    const afterCommission = price * (1 - commissionPct / 100);
    const afterTax = afterCommission * (1 - taxPct / 100);
    return afterTax;
  };

  const profit = netPricePerUnit(selectedPrice, avgCommissionPct) - totalHpp;
  const grossProfit = selectedPrice - totalHpp;

  // Projection metrics
  const projection = useMemo(() => {
    if (profit <= 0 || !netProfitTarget || selectedPrice === 0) return null;
    const target = typeof netProfitTarget === 'number' ? netProfitTarget : 0;
    const netPrice = netPricePerUnit(selectedPrice, avgCommissionPct);
    const contributionPerUnit = netPrice - totalVariablePerUnit;
    if (contributionPerUnit <= 0) return null;

    const unitsMonthly = Math.ceil((target + totalFixedMonthly) / contributionPerUnit);
    const dailyTarget = Math.ceil(unitsMonthly / 26);
    const monthlyRevenue = unitsMonthly * selectedPrice;
    const monthlyNetRevenue = unitsMonthly * netPrice;
    const monthlyVariableCost = unitsMonthly * totalVariablePerUnit;
    const monthlyTotalCost = monthlyVariableCost + totalFixedMonthly;
    const monthlyNetProfit = monthlyNetRevenue - monthlyTotalCost;

    // BEP
    const bepUnits = totalFixedMonthly > 0
      ? Math.ceil(totalFixedMonthly / contributionPerUnit)
      : 0;
    const bepRevenue = bepUnits * selectedPrice;
    const bepDays = bepUnits > 0 && dailyTarget > 0 ? Math.ceil(bepUnits / dailyTarget) : 0;
    const marginOfSafety = unitsMonthly > 0 ? ((unitsMonthly - bepUnits) / unitsMonthly) * 100 : 0;

    // Working capital: 1 cycle of production + buffer until BEP
    const workingCapital = (totalVariablePerUnit * productionCapacity) + (totalFixedMonthly * Math.max(1, Math.ceil(bepDays / 26)));

    return {
      unitsMonthly, dailyTarget, monthlyRevenue, monthlyNetRevenue,
      monthlyVariableCost, monthlyTotalCost, monthlyNetProfit,
      bepUnits, bepRevenue, bepDays, marginOfSafety, workingCapital,
      contributionPerUnit, netPrice,
    };
  }, [profit, netProfitTarget, selectedPrice, totalFixedMonthly, totalVariablePerUnit, avgCommissionPct, productionCapacity]);

  // Stress test (sensitivity)
  const stressScenario = useMemo(() => {
    const stressedMaterial = materialWithWastage * (1 + stressMaterialPct / 100);
    const stressedVariable = stressedMaterial + packagingPerUnit + laborVariablePerUnit;
    const stressedHpp = stressedVariable + allocatedFixedPerProduct;
    const stressedNetPrice = netPricePerUnit(selectedPrice, avgCommissionPct);
    const stressedProfit = stressedNetPrice - stressedHpp;
    const stressedMargin = selectedPrice > 0 ? (stressedProfit / selectedPrice) * 100 : 0;

    if (!projection) return null;
    const stressedUnits = Math.round(projection.unitsMonthly * (1 + stressVolumePct / 100));
    const stressedNetRevenue = stressedUnits * stressedNetPrice;
    const stressedTotalCost = stressedUnits * stressedVariable + totalFixedMonthly;
    const stressedNetProfit = stressedNetRevenue - stressedTotalCost;

    return { stressedHpp, stressedProfit, stressedMargin, stressedNetProfit, stressedUnits };
  }, [
    stressMaterialPct, stressVolumePct, materialWithWastage, packagingPerUnit, laborVariablePerUnit,
    allocatedFixedPerProduct, selectedPrice, avgCommissionPct, totalFixedMonthly, projection,
  ]);

  // Margin guideline
  const marginGuide = category in CATEGORY_MARGIN_GUIDE
    ? CATEGORY_MARGIN_GUIDE[category]
    : null;
  const currentMargin = selectedPrice > 0 ? ((selectedPrice - totalHpp) / selectedPrice) * 100 : 0;

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

  const addPackaging = () => {
    setPackagingCosts([...packagingCosts, { id: Date.now().toString(), name: '', costPerUnit: 0 }]);
  };
  const removePackaging = (id: string) => {
    if (packagingCosts.length === 1) return;
    setPackagingCosts(packagingCosts.filter(p => p.id !== id));
  };
  const updatePackaging = (id: string, field: keyof PackagingCost, value: any) => {
    setPackagingCosts(packagingCosts.map(p => p.id === id ? { ...p, [field]: value } : p));
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

  const addLabor = () => {
    setLaborCosts([...laborCosts, {
      id: Date.now().toString(), name: '', monthlyAmount: 0, perUnit: false,
    }]);
  };
  const removeLabor = (id: string) => {
    setLaborCosts(laborCosts.filter(l => l.id !== id));
  };
  const updateLabor = (id: string, field: keyof LaborCost, value: any) => {
    setLaborCosts(laborCosts.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const updateChannel = (id: string, field: keyof SalesChannel, value: any) => {
    setChannels(channels.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleApplyRecipe = (ingredients: Array<{
    name: string; usageQty: number; usageUnit: string;
    buyPrice: number; buyQty: number; buyUnit: string;
  }>) => {
    const newIngredients = ingredients.map(ing => ({
      id: Date.now().toString() + Math.random(),
      ...ing,
    }));
    setVariableCosts([...variableCosts, ...newIngredients]);
  };

  const handleApplyFixedCosts = (costs: Array<{ name: string; amount: number }>) => {
    const newCosts = costs.map(cost => ({
      id: Date.now().toString() + Math.random(),
      ...cost,
    }));
    setFixedCosts([...fixedCosts, ...newCosts]);
  };

  const handleAnalyzeHPP = async () => {
    if (!isAIAvailable()) { toast.error('Fitur AI belum tersedia'); return; }
    if (totalHpp === 0) { toast.error('Lengkapi data biaya dulu'); return; }
    setLoadingHpp(true);
    setHppAnalysis(null);
    const items = variableCosts.filter(v => v.name && v.buyPrice > 0).map(v => ({
      name: v.name, cost: calcCostPerProduct(v),
      qty: v.usageQty, unit: v.usageUnit,
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
      productName, hpp: totalHpp, sellingPrice: selectedPrice,
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
      productName, totalHpp, variableCosts, packagingCosts, fixedCosts, laborCosts,
      productionCapacity, selectedPrice, wastagePct, taxPct, channels,
      savedAt: new Date().toISOString(),
    };
    const updated = [calc, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success('Perhitungan disimpan');
  };

  const loadCalculation = (calc: SavedCalculation) => {
    setProductName(calc.productName);
    setVariableCosts(calc.variableCosts);
    setPackagingCosts(calc.packagingCosts ?? [{ id: '1', name: 'Box / Kemasan', costPerUnit: 0 }]);
    setFixedCosts(calc.fixedCosts);
    setLaborCosts(calc.laborCosts ?? []);
    setProductionCapacity(calc.productionCapacity);
    setIncludeFixedInHpp(calc.fixedCosts && calc.fixedCosts.some(f => f.amount > 0));
    setSelectedPrice(calc.selectedPrice);
    setWastagePct(calc.wastagePct ?? 5);
    setTaxPct(calc.taxPct ?? 0);
    if (calc.channels) setChannels(calc.channels);
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

    const summary = [
      ['Perhitungan HPP & Harga Jual'],
      ['Produk', productName || '-'],
      ['Kategori', category || '-'],
      ['Tanggal', new Date().toLocaleDateString('id-ID')],
      [],
      ['Bahan Baku per Produk', rawMaterialCost],
      [`+ Susut (${wastagePct}%)`, materialWithWastage - rawMaterialCost],
      ['+ Packaging per Produk', packagingPerUnit],
      ['+ Tenaga Kerja Variabel', laborVariablePerUnit],
      ['Total Biaya Variabel', totalVariablePerUnit],
      ['+ Alokasi Biaya Tetap', allocatedFixedPerProduct],
      ['= Total HPP per Produk', totalHpp],
      [],
      ['Kapasitas Produksi / Bulan', productionCapacity],
      ['Harga Jual', selectedPrice],
      ['Komisi Channel Rata-rata', `${avgCommissionPct.toFixed(1)}%`],
      ['Pajak', `${taxPct}%`],
      ['Profit per Unit (net)', profit],
      ['Margin Kotor', selectedPrice > 0 ? `${((grossProfit / selectedPrice) * 100).toFixed(1)}%` : '-'],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Ringkasan');

    const varHeader = ['Bahan', 'Jml Pakai', 'Satuan', 'Total Harga', 'Jml Beli', 'Satuan Beli', 'Biaya / Produk'];
    const varRows = variableCosts.map(v => [
      v.name, v.usageQty, v.usageUnit, v.buyPrice, v.buyQty, v.buyUnit, calcCostPerProduct(v),
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([varHeader, ...varRows]), 'Bahan Baku');

    if (packagingCosts.some(p => p.costPerUnit > 0)) {
      const pkgHeader = ['Item', 'Biaya per Unit'];
      const pkgRows = packagingCosts.map(p => [p.name, p.costPerUnit]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([pkgHeader, ...pkgRows]), 'Packaging');
    }

    if (laborCosts.length > 0) {
      const lbHeader = ['Nama', 'Jenis', 'Total / Bulan'];
      const lbRows = laborCosts.map(l => [l.name, l.perUnit ? 'Variabel (alokasi per unit)' : 'Tetap', l.monthlyAmount]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([lbHeader, ...lbRows]), 'Tenaga Kerja');
    }

    const fixedHeader = ['Nama Biaya', 'Total / Bulan', 'Alokasi per Produk'];
    const fixedRows = fixedCosts.map(f => [
      f.name, f.amount, productionCapacity > 0 ? f.amount / productionCapacity : 0,
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([fixedHeader, ...fixedRows]), 'Biaya Tetap');

    if (priceTiers) {
      const tierHeader = ['Tier', 'Harga', 'Profit', 'Margin', 'Reasoning'];
      const tierRows = priceTiers.map(t => [t.tier, t.price, t.profit, `${t.margin}%`, t.reasoning]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([tierHeader, ...tierRows]), 'Saran Harga');
    }

    if (projection) {
      const projData = [
        ['Metrik', 'Nilai'],
        ['Target Jual / Hari', `${projection.dailyTarget} unit`],
        ['Total Jual / Bulan', `${projection.unitsMonthly} unit`],
        ['Potensi Omzet / Bulan', projection.monthlyRevenue],
        ['Omzet Bersih (after komisi & pajak)', projection.monthlyNetRevenue],
        ['Total Biaya / Bulan', projection.monthlyTotalCost],
        ['Proyeksi Laba Bersih', projection.monthlyNetProfit],
        [],
        ['BEP Unit', projection.bepUnits],
        ['BEP Omzet', projection.bepRevenue],
        ['BEP tercapai hari ke-', projection.bepDays],
        ['Margin of Safety', `${projection.marginOfSafety.toFixed(1)}%`],
        ['Modal Kerja Minimum', projection.workingCapital],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projData), 'Proyeksi');
    }

    if (channels.length > 0) {
      const chHeader = ['Channel', 'Aktif', 'Komisi (%)'];
      const chRows = channels.map(c => [c.name, c.enabled ? 'Ya' : '-', c.commissionPct]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([chHeader, ...chRows]), 'Channel');
    }

    const filename = `HPP_${productName.replace(/\s+/g, '_') || 'produk'}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('File Excel berhasil diekspor');
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <ToolsLayout
      heroIcon={<Calculator className="w-3.5 h-3.5" />}
      badge="Tools gratis · Kalkulator"
      title="Kalkulator HPP & Harga Jual"
      subtitle="Hitung modal produk lengkap dengan susut, packaging, komisi marketplace, dan proyeksi target penjualan."
      navbarRight={
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
      }
    >
      <div>
        <HPPGuide />

        {/* Product Info */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldInput label="Nama produk" value={productName} onChange={setProductName} placeholder="Contoh: Ayam penyet cabe ijo" />
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Kategori (opsional)</label>
              <Select
                value={category}
                onChange={setCategory}
                options={[
                  { value: '', label: 'Pilih kategori...' },
                  ...Object.keys(CATEGORY_MARGIN_GUIDE).map(k => ({ value: k, label: k })),
                ]}
                buttonClassName="w-full"
              />
            </div>
          </div>
        </div>

        {/* Variable Costs */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6 mb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base md:text-lg font-semibold">Bahan Baku <span className="text-xs font-normal text-stone-400">(Variable Cost)</span></h2>
              <p className="text-xs md:text-sm text-stone-500 mt-0.5">
                Rincikan semua bahan untuk membuat satu produk jadi.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAIAvailable() && (
                <button
                  onClick={() => setShowRecipeModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Saran AI
                </button>
              )}
            </div>
          </div>

          {/* Mobile cards */}
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

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left text-[11px] font-medium text-stone-500 pb-2 pr-2">Bahan</th>
                  <th colSpan={2} className="text-left text-[11px] font-medium text-stone-500 pb-2 pr-2">Pemakaian per Produk</th>
                  <th colSpan={3} className="text-left text-[11px] font-medium text-stone-500 pb-2 pr-2">Info Pembelian</th>
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
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <NumInput
                        value={vc.usageQty}
                        onChange={v => updateVariable(vc.id, 'usageQty', v)}
                        allowDecimal
                        className="w-20 px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
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
                        className="w-32 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <NumInput
                        value={vc.buyQty}
                        onChange={v => updateVariable(vc.id, 'buyQty', v)}
                        allowDecimal
                        className="w-16 px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah bahan
          </button>

          {/* Wastage */}
          <div className="mt-5 pt-5 border-t border-stone-100">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-white">Susut bahan / Wastage</h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Estimasi bahan terbuang (kulit, layu, takaran lebih). F&B umumnya 5–15%.
                </p>
              </div>
              <span className="text-sm font-semibold text-stone-900 tabular-nums whitespace-nowrap">
                +Rp {(materialWithWastage - rawMaterialCost).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={wastagePct}
                onChange={e => setWastagePct(parseInt(e.target.value))}
                className="flex-1 accent-stone-900"
              />
              <div className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 rounded-md tabular-nums">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={wastagePct}
                  onChange={e => setWastagePct(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                  className="w-10 bg-transparent text-sm font-semibold text-right focus:outline-none"
                />
                <Percent className="w-3 h-3 text-stone-500 dark:text-stone-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Packaging */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6 mb-4">
          <h2 className="text-base md:text-lg font-semibold">Kemasan & Packaging</h2>
          <p className="text-xs md:text-sm text-stone-500 mt-0.5 mb-4">
            Box, plastik, sticker, sendok — biaya per unit yang selalu dipakai.
          </p>

          <div className="space-y-2 mb-3">
            {packagingCosts.map(pc => (
              <div key={pc.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  value={pc.name}
                  onChange={e => updatePackaging(pc.id, 'name', e.target.value)}
                  placeholder="Box / Plastik / Sticker"
                  className="px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
                <CurrencyInput
                  value={pc.costPerUnit}
                  onChange={v => updatePackaging(pc.id, 'costPerUnit', v)}
                  placeholder="0"
                  className="w-full py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                />
                <button
                  onClick={() => removePackaging(pc.id)}
                  disabled={packagingCosts.length === 1}
                  className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addPackaging}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-700 hover:text-stone-900 dark:text-white"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah item
          </button>
        </div>

        {/* Labor */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6 mb-4">
          <h2 className="text-base md:text-lg font-semibold">Tenaga Kerja</h2>
          <p className="text-xs md:text-sm text-stone-500 mt-0.5 mb-4">
            Gaji karyawan. Pilih "per unit" jika gajinya tergantung volume produksi.
          </p>

          {laborCosts.length === 0 ? (
            <p className="text-xs text-stone-500 italic mb-3">Belum ada. Tambah jika ada karyawan.</p>
          ) : (
            <div className="space-y-2 mb-3">
              {laborCosts.map(lc => (
                <div key={lc.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                  <input
                    value={lc.name}
                    onChange={e => updateLabor(lc.id, 'name', e.target.value)}
                    placeholder="Koki, kasir, dll"
                    className="px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  />
                  <CurrencyInput
                    value={lc.monthlyAmount}
                    onChange={v => updateLabor(lc.id, 'monthlyAmount', v)}
                    placeholder="Gaji / bulan"
                    className="w-full py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  />
                  <Select
                    value={lc.perUnit ? 'variable' : 'fixed'}
                    onChange={v => updateLabor(lc.id, 'perUnit', v === 'variable')}
                    options={[
                      { value: 'fixed', label: 'Tetap' },
                      { value: 'variable', label: 'Per unit' },
                    ]}
                    size="sm"
                  />
                  <button
                    onClick={() => removeLabor(lc.id)}
                    className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addLabor}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-700 hover:text-stone-900 dark:text-white"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah karyawan
          </button>
        </div>

        {/* Fixed Cost & Capacity (optional) */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6 mb-4">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-semibold">Biaya Tetap & Kapasitas</h2>
              <span className="text-[10px] font-medium text-stone-500 px-1.5 py-0.5 bg-stone-100 rounded">opsional</span>
            </div>
            {isAIAvailable() && includeFixedInHpp && (
              <button
                onClick={() => setShowFixedCostsModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
              >
                <Sparkles className="w-3.5 h-3.5" /> Saran AI
              </button>
            )}
          </div>
          <p className="text-xs md:text-sm text-stone-500 mb-4">
            Biaya bulanan tetap (sewa, listrik, internet, gaji tetap). Kalau kamu masih awal dan belum tahu volume produksi, lewati saja — biaya tetap tetap dipakai untuk hitung BEP & target penjualan di bawah.
          </p>

          {/* Toggle: Include in HPP? */}
          <button
            onClick={() => setIncludeFixedInHpp(!includeFixedInHpp)}
            className={cn(
              'w-full p-3.5 rounded-lg border text-left transition-colors mb-4',
              includeFixedInHpp ? 'border-stone-900 bg-stone-50' : 'border-stone-200 bg-white hover:border-stone-300',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                  includeFixedInHpp ? 'border-stone-900 bg-stone-900' : 'border-stone-300 bg-white',
                )}
              >
                {includeFixedInHpp && <span className="text-white text-[10px] leading-none">✓</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 dark:text-white">
                  Masukkan alokasi biaya tetap ke HPP
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                  {includeFixedInHpp
                    ? 'HPP kamu akan termasuk porsi biaya tetap (fully-loaded). Butuh estimasi kapasitas produksi.'
                    : 'HPP cuma hitung biaya variabel (bahan + packaging + tenaga kerja per unit). Direkomendasikan untuk awal — lebih sederhana dan tidak butuh tebak-tebak kapasitas.'}
                </p>
              </div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {includeFixedInHpp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg p-3.5 mb-4">
                  <label className="text-xs font-medium text-stone-700 block mb-1.5">
                    Kapasitas produksi per bulan (unit)
                  </label>
                  <NumInput
                    value={productionCapacity}
                    onChange={setProductionCapacity}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                  />
                  <p className="text-[11px] text-stone-500 mt-1.5">
                    Belum tahu? Mulai dengan target realistis (mis. 300–1.000 unit/bulan untuk warung makan), lalu review setelah 1–2 bulan jualan.
                  </p>
                </div>

                <div className="space-y-2 mb-3">
                  {fixedCosts.length === 0 && (
                    <p className="text-xs text-stone-500 italic mb-2">Belum ada biaya tetap. Tambah satu di bawah, atau pakai saran AI.</p>
                  )}
                  {fixedCosts.map(fc => (
                    <div key={fc.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                      <input
                        value={fc.name}
                        onChange={e => updateFixed(fc.id, 'name', e.target.value)}
                        placeholder="Sewa Tempat (per bulan)"
                        className="px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                      <CurrencyInput
                        value={fc.amount}
                        onChange={v => updateFixed(fc.id, 'amount', v)}
                        placeholder="0"
                        className="w-full py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-stone-900/10"
                      />
                      <button
                        onClick={() => removeFixed(fc.id)}
                        className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={addFixed} className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-700 hover:text-stone-900 dark:text-white">
                    <Plus className="w-3.5 h-3.5" /> Tambah biaya
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* HPP Result */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6 mb-4">
          <h2 className="text-base md:text-lg font-semibold mb-4">Rincian HPP per Produk</h2>

          <div className="bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-xl p-4 mb-4">
            <div className="space-y-1.5 text-sm">
              <BreakdownRow label="Bahan baku" value={rawMaterialCost} />
              {wastagePct > 0 && (
                <BreakdownRow label={`Susut bahan (${wastagePct}%)`} value={materialWithWastage - rawMaterialCost} muted />
              )}
              {packagingPerUnit > 0 && (
                <BreakdownRow label="Packaging" value={packagingPerUnit} />
              )}
              {laborVariablePerUnit > 0 && (
                <BreakdownRow label="Tenaga kerja (per unit)" value={laborVariablePerUnit} />
              )}
              <div className="pt-1.5 border-t border-stone-200">
                <BreakdownRow label="Total biaya variabel" value={totalVariablePerUnit} bold />
              </div>
              {includeFixedInHpp && (
                <>
                  <BreakdownRow label="Alokasi biaya tetap" value={allocatedFixedPerProduct} />
                  {productionCapacity > 0 && totalFixedMonthly > 0 && (
                    <p className="text-[11px] text-stone-400 pl-1">
                      (Total Rp {totalFixedMonthly.toLocaleString('id-ID')} / {productionCapacity.toLocaleString('id-ID')} unit)
                    </p>
                  )}
                </>
              )}
              <div className="pt-2 mt-2 border-t-2 border-stone-300 flex items-center justify-between">
                <span className="font-semibold text-stone-900 dark:text-white">
                  Total HPP per Produk
                  {!includeFixedInHpp && <span className="ml-1.5 text-[10px] font-medium text-stone-500 dark:text-stone-400">variabel saja</span>}
                </span>
                <span className="font-bold text-base tabular-nums text-stone-900 dark:text-white">
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
                  <Lightbulb className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{hppAnalysis}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sales Channels & Tax */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6 mb-4">
          <h2 className="text-base md:text-lg font-semibold mb-1">Channel Penjualan & Pajak</h2>
          <p className="text-xs md:text-sm text-stone-500 mb-4">
            Aktifkan channel yang dipakai. Komisi marketplace & pajak akan otomatis dipotong dari proyeksi laba.
          </p>

          <div className="space-y-2 mb-4">
            {channels.map(ch => (
              <div key={ch.id} className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                ch.enabled ? 'border-stone-900 bg-stone-50' : 'border-stone-200 bg-white',
              )}>
                <button
                  onClick={() => updateChannel(ch.id, 'enabled', !ch.enabled)}
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                    ch.enabled ? 'border-stone-900 bg-stone-900' : 'border-stone-300 bg-white',
                  )}
                >
                  {ch.enabled && <span className="text-white text-xs leading-none">✓</span>}
                </button>
                <input
                  value={ch.name}
                  onChange={e => updateChannel(ch.id, 'name', e.target.value)}
                  className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                />
                <div className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md tabular-nums">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={ch.commissionPct}
                    onChange={e => updateChannel(ch.id, 'commissionPct', Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    disabled={!ch.enabled}
                    className="w-12 bg-transparent text-sm font-semibold text-right focus:outline-none disabled:text-stone-400"
                  />
                  <Percent className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-stone-100">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Pajak (PPh Final / PB1)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.5}
                  value={taxPct}
                  onChange={e => setTaxPct(parseFloat(e.target.value))}
                  className="flex-1 accent-stone-900"
                />
                <div className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 rounded-md tabular-nums">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={taxPct}
                    onChange={e => setTaxPct(Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)))}
                    className="w-10 bg-transparent text-sm font-semibold text-right focus:outline-none"
                  />
                  <Percent className="w-3 h-3 text-stone-500 dark:text-stone-400" />
                </div>
              </div>
              <p className="text-[11px] text-stone-500 mt-1.5">
                UMKM omzet ≤ 4.8M/tahun: 0.5%. Restoran umumnya kena PB1 10%.
              </p>
            </div>
            <div className="bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg p-3">
              <p className="text-[11px] text-stone-500 mb-1">Total potongan / unit</p>
              <p className="text-sm font-bold tabular-nums">
                {avgCommissionPct.toFixed(1)}% komisi + {taxPct}% pajak
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                Net price kamu = harga × {((1 - avgCommissionPct / 100) * (1 - taxPct / 100) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* AI Price Suggestions */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6 mb-4">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base md:text-lg font-semibold">Saran Harga Jual</h2>
                {isAIAvailable() && (
                  <span className="text-[10px] font-medium text-stone-500 inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 rounded">
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-stone-500 mt-0.5">
                3 tier harga: kompetitif, standar, premium.
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

          {/* Competitor comparison */}
          {competitorPrice && selectedPrice > 0 && typeof competitorPrice === 'number' && (
            <CompetitorCompare myPrice={selectedPrice} competitorPrice={competitorPrice} />
          )}

          {!priceTiers ? (
            <button
              onClick={handleSuggestPrice}
              disabled={loadingPrice || !productName || totalHpp === 0}
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loadingPrice ? 'Menyusun saran...' : 'Minta saran harga'}
            </button>
          ) : (
            <div className="space-y-2">
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
                className="w-full text-xs font-medium text-stone-500 hover:text-stone-900 py-2 transition-colors"
              >
                Generate ulang
              </button>
            </div>
          )}

          {/* Margin guideline */}
          {selectedPrice > 0 && marginGuide && (
            <div className="mt-4 p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg">
              <div className="flex items-start gap-2.5">
                <Info className="w-3.5 h-3.5 text-stone-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-700 dark:text-stone-200">
                    Margin {category}: <span className="font-semibold">{marginGuide.min}–{marginGuide.max}%</span>
                    <span className="text-stone-500 dark:text-stone-400"> · {marginGuide.note}</span>
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          currentMargin < marginGuide.min ? 'bg-red-500'
                            : currentMargin > marginGuide.max ? 'bg-amber-500'
                              : 'bg-emerald-500',
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, currentMargin))}%` }}
                      />
                    </div>
                    <span className={cn(
                      'text-xs font-semibold tabular-nums',
                      currentMargin < marginGuide.min ? 'text-red-600'
                        : currentMargin > marginGuide.max ? 'text-amber-600'
                          : 'text-emerald-600',
                    )}>
                      {currentMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pricing Scenarios */}
        {selectedPrice > 0 && totalHpp > 0 && (
          <PricingScenarios
            basePrice={selectedPrice}
            hpp={totalHpp}
            channels={channels}
            taxPct={taxPct}
          />
        )}

        {/* Sales Projection */}
        <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6 mb-4">
          <h2 className="text-base md:text-lg font-semibold">Target & Proyeksi Penjualan</h2>
          <p className="text-xs md:text-sm text-stone-500 mt-0.5 mb-4">
            Hitung berapa unit harus terjual untuk capai target laba bersih.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <FieldInputNumber
              label="Target laba bersih / bulan"
              value={netProfitTarget}
              onChange={setNetProfitTarget}
              placeholder="Contoh: 10.000.000"
              prefix="Rp"
            />
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1.5">Harga jual pilihan</label>
              <CurrencyInput
                value={selectedPrice}
                onChange={setSelectedPrice}
                placeholder="Pilih dari saran AI"
                className="w-full py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10"
              />
            </div>
          </div>

          {!projection ? (
            <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-xl flex items-center gap-2.5 mb-4">
              <AlertCircle className="w-4 h-4 text-stone-500 shrink-0" />
              <p className="text-xs text-stone-600 dark:text-stone-300">
                Lengkapi target laba dan harga jual untuk lihat proyeksi.
                {!includeFixedInHpp && totalFixedMonthly === 0 && ' Tambah biaya tetap di section di atas agar perhitungan BEP & target lebih akurat.'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">Target Penjualan</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Stat label="Target jual / hari" value={`${projection.dailyTarget} unit`} sub="26 hari kerja" accent />
                  <Stat label="Total jual / bulan" value={`${projection.unitsMonthly.toLocaleString('id-ID')} unit`} />
                  <Stat label="Potensi omzet / bulan" value={`Rp ${projection.monthlyRevenue.toLocaleString('id-ID')}`} />
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">Biaya & Laba</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Stat label="Omzet bersih / bulan" value={`Rp ${projection.monthlyNetRevenue.toLocaleString('id-ID')}`} sub="setelah komisi & pajak" />
                  <Stat label="Total biaya / bulan" value={`Rp ${projection.monthlyTotalCost.toLocaleString('id-ID')}`} sub="produksi + tetap" />
                  <Stat label="Proyeksi laba bersih" value={`Rp ${projection.monthlyNetProfit.toLocaleString('id-ID')}`} positive={projection.monthlyNetProfit > 0} />
                </div>
              </div>

              {/* BEP & Working Capital */}
              <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-xl mb-4">
                <p className="text-sm font-semibold mb-1">Break Even Point & Modal Kerja</p>
                <p className="text-[11px] text-stone-500 mb-3">Titik impas dan modal awal yang dibutuhkan</p>
                {projection.bepUnits > 0 ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      <BEPStat label="BEP unit" value={`${projection.bepUnits.toLocaleString('id-ID')} unit`} />
                      <BEPStat label="BEP omzet" value={`Rp ${projection.bepRevenue.toLocaleString('id-ID')}`} />
                      <BEPStat label="BEP tercapai" value={`hari ke-${projection.bepDays}`} sub="dari 26 hari" />
                      <BEPStat
                        label="Margin of Safety"
                        value={`${projection.marginOfSafety.toFixed(1)}%`}
                        sub={projection.marginOfSafety > 30 ? 'aman' : projection.marginOfSafety > 0 ? 'tipis' : 'risiko'}
                        tone={projection.marginOfSafety > 30 ? 'good' : projection.marginOfSafety > 0 ? 'warn' : 'bad'}
                      />
                    </div>
                    <BEPChart
                      bepUnits={projection.bepUnits}
                      maxUnits={projection.unitsMonthly}
                      pricePerUnit={projection.netPrice}
                      variableCostPerUnit={totalVariablePerUnit}
                      fixedCost={totalFixedMonthly}
                    />
                    <div className="mt-3 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg">
                      <p className="text-xs font-semibold text-stone-900 dark:text-white">
                        Modal kerja minimum: Rp {projection.workingCapital.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        1 siklus produksi penuh + buffer biaya tetap sampai BEP tercapai.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Tidak ada biaya tetap — setiap unit terjual sudah menghasilkan laba.
                  </p>
                )}
              </div>

              {/* Sensitivity */}
              <SensitivitySection
                stressMaterialPct={stressMaterialPct}
                stressVolumePct={stressVolumePct}
                onMaterialChange={setStressMaterialPct}
                onVolumeChange={setStressVolumePct}
                stressScenario={stressScenario}
                baseHpp={totalHpp}
                baseProfit={projection.monthlyNetProfit}
              />

              <button
                onClick={handleAnalyzeSales}
                disabled={loadingSales}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 mt-4 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-40 transition-colors"
              >
                {loadingSales ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loadingSales ? 'Menyusun strategi...' : 'Analisis strategi dengan AI'}
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
                      <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
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
            className="inline-flex items-center justify-center gap-2 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Save className="w-4 h-4" /> Simpan perhitungan
          </button>
          <button
            onClick={exportXlsx}
            className="inline-flex items-center justify-center gap-2 py-3 bg-white hover:bg-stone-50 border border-stone-300 text-stone-900 rounded-xl text-sm font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export .xlsx
          </button>
        </div>

        {/* CTA already provided by ToolsLayout */}

        {!isAIAvailable() && (
          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Fitur AI butuh API key. Tetap bisa pakai kalkulator manual & export.</span>
          </div>
        )}
      </div>

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

      <RecipeSuggestionModal
        isOpen={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        onApply={handleApplyRecipe}
      />

      <FixedCostsSuggestionModal
        isOpen={showFixedCostsModal}
        onClose={() => setShowFixedCostsModal(false)}
        onApply={handleApplyFixedCosts}
      />
    </ToolsLayout>
  );
}

// ============================================================
// Subcomponents
// ============================================================

function HPPGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-900 dark:text-white">Belum tahu cara hitung HPP yang benar?</p>
          <p className="text-xs text-stone-500 mt-0.5">Klik untuk baca panduan singkat 2 menit.</p>
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
            <div className="px-5 pb-5 pt-1 space-y-4 text-sm text-stone-700 leading-relaxed border-t border-stone-100">
              <div>
                <p className="font-semibold text-stone-900 mb-1">1. Apa itu HPP?</p>
                <p className="text-xs md:text-sm">
                  HPP (Harga Pokok Produksi) adalah total biaya untuk membuat <strong>satu unit produk siap jual</strong>. Terdiri dari biaya variabel (bahan, packaging, tenaga kerja per unit) dan alokasi biaya tetap.
                </p>
              </div>

              <div>
                <p className="font-semibold text-stone-900 mb-1">2. Hitung biaya bahan baku</p>
                <p className="text-xs md:text-sm mb-2">
                  Biaya bahan yang berubah-ubah tergantung volume produksi. Contoh untuk Ayam Penyet:
                </p>
                <div className="bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg p-3 text-xs space-y-1 font-mono">
                  <p>Beli ayam: <strong>1 kg = Rp 35.000</strong></p>
                  <p>Pakai per porsi: <strong>150 gram</strong></p>
                  <p className="text-stone-900 dark:text-white">→ Biaya per produk = (150 / 1000) × 35.000 = Rp 5.250</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-stone-900 mb-1">3. Tambah susut, packaging, tenaga kerja</p>
                <ul className="text-xs md:text-sm space-y-1 list-disc pl-4 text-stone-600 dark:text-stone-300">
                  <li><strong>Susut bahan</strong>: 5–15% bahan terbuang/layu/takaran lebih</li>
                  <li><strong>Packaging</strong>: box, plastik, sticker yang dipakai per unit</li>
                  <li><strong>Tenaga kerja per unit</strong>: gaji koki kalau gajinya by-output</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-stone-900 mb-1">4. Alokasi biaya tetap (opsional untuk awal)</p>
                <p className="text-xs md:text-sm mb-2">
                  Kalau kamu masih awal dan belum tahu volume produksi, <strong>skip dulu</strong>. HPP variabel sudah cukup untuk memulai. Begitu sudah jualan 1–2 bulan dan tahu kapasitas, baru aktifkan alokasi biaya tetap untuk HPP yang lebih akurat.
                </p>
                <div className="bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg p-3 text-xs space-y-1 font-mono">
                  <p>Total biaya tetap: <strong>Rp 4.150.000 / bulan</strong></p>
                  <p>Kapasitas produksi: <strong>5.000 unit / bulan</strong></p>
                  <p className="text-stone-900 dark:text-white">→ Alokasi per unit = Rp 830</p>
                </div>
                <p className="text-[11px] text-stone-500 mt-2">
                  Catatan: biaya tetap tetap dipakai untuk hitung BEP & target penjualan, walau tidak masuk HPP.
                </p>
              </div>

              <div>
                <p className="font-semibold text-stone-900 mb-1">5. Jangan lupa komisi & pajak</p>
                <p className="text-xs md:text-sm text-stone-600 dark:text-stone-300">
                  Kalau jualan via GoFood/GrabFood, komisi 20–25% kepotong langsung. Restoran kena PB1 10%, UMKM kecil PPh Final 0.5%. Aktifkan di section "Channel Penjualan & Pajak" agar proyeksi laba akurat.
                </p>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Sudah paham? Mulai isi data di bawah. AI bisa bantu kasih saran resep & estimasi biaya kalau ragu.
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
        <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Bahan #{index + 1}</span>
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
        className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-stone-900/10"
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-[10px] text-stone-500 dark:text-stone-400">Jml pakai</label>
          <NumInput
            value={vc.usageQty}
            onChange={v => onUpdate('usageQty', v)}
            allowDecimal
            className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-500 dark:text-stone-400">Satuan</label>
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
          <label className="text-[10px] text-stone-500 dark:text-stone-400">Total harga</label>
          <CurrencyInput
            value={vc.buyPrice}
            onChange={v => onUpdate('buyPrice', v)}
            className="w-full py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-500 dark:text-stone-400">Jml beli</label>
          <NumInput
            value={vc.buyQty}
            onChange={v => onUpdate('buyQty', v)}
            allowDecimal
            className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-md text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="text-[10px] text-stone-500 dark:text-stone-400">Satuan</label>
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

function BreakdownRow({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={cn(
      'flex items-center justify-between',
      muted && 'text-stone-500',
    )}>
      <span className={cn(bold ? 'font-semibold text-stone-900' : 'text-stone-600')}>{label}</span>
      <span className={cn(
        'tabular-nums',
        bold ? 'font-semibold text-stone-900' : 'font-medium',
      )}>
        Rp {value.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}

function PriceTierCard({ tier, selected, onSelect }: { tier: PriceTier; selected: boolean; onSelect: () => void }) {
  const labelMap = { kompetitif: 'Kompetitif', standar: 'Standar', premium: 'Premium' };
  const subMap = {
    kompetitif: 'Tarik pelanggan baru, harga ramah',
    standar: 'Profit ideal & berkelanjutan',
    premium: 'Untuk kualitas atau brand premium',
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-colors',
        selected
          ? 'border-stone-900 bg-stone-50'
          : 'border-stone-200 bg-white hover:border-stone-300',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn(
              'text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
              selected ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700',
            )}>
              {labelMap[tier.tier]}
            </span>
            {selected && <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">Terpilih</span>}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">{subMap[tier.tier]}</p>
        </div>
        <span className="text-xl font-bold text-stone-900 tabular-nums">
          Rp {tier.price.toLocaleString('id-ID')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-2 pt-2 border-t border-stone-100">
        <div>
          <span className="text-stone-500 dark:text-stone-400">Profit/unit</span>
          <p className="font-semibold text-stone-900 tabular-nums">Rp {tier.profit.toLocaleString('id-ID')}</p>
        </div>
        <div>
          <span className="text-stone-500 dark:text-stone-400">Margin</span>
          <p className="font-semibold text-stone-900 tabular-nums">{tier.margin}%</p>
        </div>
      </div>
      <p className="text-xs text-stone-600 leading-relaxed">{tier.reasoning}</p>
    </button>
  );
}

function CompetitorCompare({ myPrice, competitorPrice }: { myPrice: number; competitorPrice: number }) {
  const diff = myPrice - competitorPrice;
  const diffPct = competitorPrice > 0 ? (diff / competitorPrice) * 100 : 0;
  const cheaper = diff < 0;

  return (
    <div className="mb-4 p-3.5 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-stone-700 dark:text-stone-200">Perbandingan dengan kompetitor</p>
        <span className={cn(
          'text-xs font-semibold inline-flex items-center gap-1',
          cheaper ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-stone-500',
        )}>
          {cheaper ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
          {Math.abs(diffPct).toFixed(1)}% {cheaper ? 'lebih murah' : 'lebih mahal'}
        </span>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <p className="text-[10px] text-stone-500 mb-0.5">Kamu</p>
          <p className="text-sm font-bold tabular-nums text-stone-900 dark:text-white">Rp {myPrice.toLocaleString('id-ID')}</p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-[10px] text-stone-500 mb-0.5">Kompetitor</p>
          <p className="text-sm font-bold tabular-nums text-stone-700 dark:text-stone-200">Rp {competitorPrice.toLocaleString('id-ID')}</p>
        </div>
      </div>
      <div className="relative h-1.5 mt-3 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-stone-900 rounded-full"
          style={{ width: `${Math.min(100, (myPrice / Math.max(myPrice, competitorPrice)) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function PricingScenarios({
  basePrice, hpp, channels, taxPct,
}: {
  basePrice: number;
  hpp: number;
  channels: SalesChannel[];
  taxPct: number;
}) {
  const scenarios = [
    { name: 'Harga normal', price: basePrice, channelKey: 'normal' },
    { name: 'Harga marketplace (markup 25%)', price: Math.round(basePrice * 1.25), channelKey: 'marketplace' },
    { name: 'Harga promo (diskon 15%)', price: Math.round(basePrice * 0.85), channelKey: 'promo' },
  ];

  const activeChannels = channels.filter(c => c.enabled);
  const avgCommission = activeChannels.length > 0
    ? activeChannels.reduce((sum, c) => sum + c.commissionPct, 0) / activeChannels.length
    : 0;

  return (
    <div className="bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl p-5 md:p-6 mb-4">
      <h2 className="text-base md:text-lg font-semibold mb-1">Skenario Harga</h2>
      <p className="text-xs md:text-sm text-stone-500 mb-4">
        Profit di berbagai skenario harga (sudah dipotong komisi & pajak).
      </p>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="text-left text-[11px] font-medium text-stone-500 pb-2 pr-2">Skenario</th>
              <th className="text-right text-[11px] font-medium text-stone-500 pb-2 px-2">Harga Jual</th>
              <th className="text-right text-[11px] font-medium text-stone-500 pb-2 px-2">Net Price</th>
              <th className="text-right text-[11px] font-medium text-stone-500 pb-2 px-2">Profit/Unit</th>
              <th className="text-right text-[11px] font-medium text-stone-500 pb-2 pl-2">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {scenarios.map(s => {
              const netPrice = s.price * (1 - avgCommission / 100) * (1 - taxPct / 100);
              const profit = netPrice - hpp;
              const margin = s.price > 0 ? (profit / s.price) * 100 : 0;
              const isLoss = profit < 0;
              return (
                <tr key={s.name}>
                  <td className="py-2.5 pr-2 text-stone-700 dark:text-stone-200">{s.name}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums font-medium">Rp {s.price.toLocaleString('id-ID')}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-stone-500 dark:text-stone-400">Rp {Math.round(netPrice).toLocaleString('id-ID')}</td>
                  <td className={cn(
                    'py-2.5 px-2 text-right tabular-nums font-semibold',
                    isLoss ? 'text-red-600' : 'text-stone-900',
                  )}>
                    {isLoss ? '-' : ''}Rp {Math.abs(Math.round(profit)).toLocaleString('id-ID')}
                  </td>
                  <td className={cn(
                    'py-2.5 pl-2 text-right tabular-nums font-semibold',
                    isLoss ? 'text-red-600' : margin > 50 ? 'text-emerald-600' : 'text-stone-900',
                  )}>
                    {margin.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {avgCommission === 0 && taxPct === 0 && (
        <p className="text-[11px] text-stone-500 mt-3 italic">
          Aktifkan channel marketplace di atas untuk lihat dampak komisi pada profit.
        </p>
      )}
    </div>
  );
}

function BEPChart({
  bepUnits, maxUnits, pricePerUnit, variableCostPerUnit, fixedCost,
}: {
  bepUnits: number;
  maxUnits: number;
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCost: number;
}) {
  const w = 100; // viewBox width
  const h = 60;
  const xMax = Math.max(maxUnits, bepUnits * 1.5, 1);

  // Cost line at xMax: fixed + variable * xMax
  // Revenue line at xMax: pricePerUnit * xMax
  const yMax = Math.max(
    fixedCost + variableCostPerUnit * xMax,
    pricePerUnit * xMax,
    1,
  );

  const xScale = (x: number) => (x / xMax) * w;
  const yScale = (y: number) => h - (y / yMax) * h;

  const bepX = xScale(bepUnits);
  const bepY = yScale(pricePerUnit * bepUnits);

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-stone-700 dark:text-stone-200">Grafik BEP</p>
        <div className="flex items-center gap-3 text-[10px] text-stone-500 dark:text-stone-400">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-0.5 bg-stone-900" /> Pendapatan</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-0.5 bg-stone-400" /> Biaya total</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-0.5 bg-stone-300 border-dashed" /> Biaya tetap</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
        {/* Fixed cost line (horizontal, dashed) */}
        <line
          x1={0}
          y1={yScale(fixedCost)}
          x2={w}
          y2={yScale(fixedCost)}
          stroke="#d6d3d1"
          strokeWidth={0.4}
          strokeDasharray="1,1"
        />
        {/* Total cost line */}
        <line
          x1={0}
          y1={yScale(fixedCost)}
          x2={w}
          y2={yScale(fixedCost + variableCostPerUnit * xMax)}
          stroke="#a8a29e"
          strokeWidth={0.6}
        />
        {/* Revenue line */}
        <line
          x1={0}
          y1={yScale(0)}
          x2={w}
          y2={yScale(pricePerUnit * xMax)}
          stroke="#1c1917"
          strokeWidth={0.8}
        />
        {/* BEP intersection point */}
        <circle cx={bepX} cy={bepY} r={1.2} fill="#10b981" stroke="white" strokeWidth={0.4} />
        {/* BEP vertical guide */}
        <line
          x1={bepX}
          y1={bepY}
          x2={bepX}
          y2={h}
          stroke="#10b981"
          strokeWidth={0.3}
          strokeDasharray="0.5,0.5"
        />
      </svg>
      <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
        <span>0 unit</span>
        <span className="text-emerald-700 font-semibold">BEP: {bepUnits.toLocaleString('id-ID')} unit</span>
        <span>{Math.round(xMax).toLocaleString('id-ID')} unit</span>
      </div>
    </div>
  );
}

function SensitivitySection({
  stressMaterialPct, stressVolumePct, onMaterialChange, onVolumeChange,
  stressScenario, baseHpp, baseProfit,
}: {
  stressMaterialPct: number;
  stressVolumePct: number;
  onMaterialChange: (v: number) => void;
  onVolumeChange: (v: number) => void;
  stressScenario: { stressedHpp: number; stressedProfit: number; stressedMargin: number; stressedNetProfit: number; stressedUnits: number } | null;
  baseHpp: number;
  baseProfit: number;
}) {
  if (!stressScenario) return null;

  const hppDiff = stressScenario.stressedHpp - baseHpp;
  const profitDiff = stressScenario.stressedNetProfit - baseProfit;
  const isWorse = profitDiff < 0;

  return (
    <div className="p-4 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-xl">
      <p className="text-sm font-semibold mb-1">Sensitivity / Stress Test</p>
      <p className="text-[11px] text-stone-500 mb-3">Lihat dampak kalau harga bahan naik atau volume jualan turun</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-300">Harga bahan naik</label>
            <span className={cn(
              'text-xs font-semibold tabular-nums',
              stressMaterialPct > 0 ? 'text-red-600' : 'text-stone-500',
            )}>
              +{stressMaterialPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={stressMaterialPct}
            onChange={e => onMaterialChange(parseInt(e.target.value))}
            className="w-full accent-stone-900"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-300">Volume jualan</label>
            <span className={cn(
              'text-xs font-semibold tabular-nums',
              stressVolumePct < 0 ? 'text-red-600' : stressVolumePct > 0 ? 'text-emerald-600' : 'text-stone-500',
            )}>
              {stressVolumePct > 0 ? '+' : ''}{stressVolumePct}%
            </span>
          </div>
          <input
            type="range"
            min={-50}
            max={50}
            step={1}
            value={stressVolumePct}
            onChange={e => onVolumeChange(parseInt(e.target.value))}
            className="w-full accent-stone-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-2.5">
          <p className="text-[10px] text-stone-500 mb-0.5">HPP setelah stress</p>
          <p className="text-sm font-bold tabular-nums">Rp {Math.round(stressScenario.stressedHpp).toLocaleString('id-ID')}</p>
          {hppDiff !== 0 && (
            <p className="text-[10px] text-stone-500 mt-0.5">
              {hppDiff > 0 ? '+' : ''}Rp {Math.round(hppDiff).toLocaleString('id-ID')}
            </p>
          )}
        </div>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-2.5">
          <p className="text-[10px] text-stone-500 mb-0.5">Profit/unit baru</p>
          <p className={cn(
            'text-sm font-bold tabular-nums',
            stressScenario.stressedProfit < 0 ? 'text-red-600' : '',
          )}>
            Rp {Math.round(stressScenario.stressedProfit).toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-stone-500 mt-0.5">
            margin {stressScenario.stressedMargin.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-2.5 col-span-2 md:col-span-1">
          <p className="text-[10px] text-stone-500 mb-0.5">Laba bersih / bulan</p>
          <p className={cn(
            'text-sm font-bold tabular-nums',
            stressScenario.stressedNetProfit < 0 ? 'text-red-600' : isWorse ? 'text-amber-600' : 'text-emerald-600',
          )}>
            Rp {Math.round(stressScenario.stressedNetProfit).toLocaleString('id-ID')}
          </p>
          {profitDiff !== 0 && (
            <p className={cn(
              'text-[10px] mt-0.5',
              profitDiff < 0 ? 'text-red-600' : 'text-emerald-600',
            )}>
              {profitDiff > 0 ? '+' : ''}Rp {Math.round(profitDiff).toLocaleString('id-ID')}
            </p>
          )}
        </div>
      </div>

      {stressScenario.stressedNetProfit < 0 && (stressMaterialPct > 0 || stressVolumePct < 0) && (
        <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
          <p className="text-[11px] text-red-900 leading-relaxed">
            Skenario ini menghasilkan kerugian. Pertimbangkan kontrak supplier, lock harga bahan, atau diversifikasi channel.
          </p>
        </div>
      )}
    </div>
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
            <p className="text-xs text-stone-500 dark:text-stone-400">{history.length} tersimpan</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100">
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-8 h-8 mx-auto text-stone-300 mb-2" />
              <p className="text-sm text-stone-500 dark:text-stone-400">Belum ada perhitungan tersimpan</p>
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
        className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
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
            'w-full py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-stone-900/10',
            prefix ? 'pl-9 pr-3' : 'px-3',
          )}
        />
      </div>
    </div>
  );
}

function formatThousand(n: number): string {
  if (isNaN(n)) return '';
  return n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function parseThousand(s: string): number | null {
  const cleaned = s.replace(/[^\d]/g, '');
  if (cleaned === '') return null;
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : Math.max(0, n);
}

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
        let v = e.target.value.replace(/[^\d.]/g, '');
        if (!allowDecimal) v = v.replace(/\./g, '');
        const parsed = allowDecimal ? parseFloat(v) : parseInt(v, 10);
        onChange(isNaN(parsed) ? 0 : Math.max(0, parsed));
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

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
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-2.5">
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
  const isMass = (u: string) => u === 'g' || u === 'kg';
  const isVolume = (u: string) => u === 'ml' || u === 'L';
  const isCount = (u: string) => u === 'pcs' || u === 'pack' || u === 'box' || u === 'porsi';

  if (isMass(usageUnit) !== isMass(buyUnit) && isVolume(usageUnit) !== isVolume(buyUnit) && isCount(usageUnit) !== isCount(buyUnit)) {
    return null;
  }
  return usageBase / buyBase;
}
