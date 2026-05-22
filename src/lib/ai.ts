import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export const isAIAvailable = () => !!API_KEY;

let genAI: GoogleGenerativeAI | null = null;

function getClient() {
  if (!API_KEY) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(API_KEY);
  return genAI;
}

export interface PriceTier {
  tier: 'kompetitif' | 'standar' | 'premium';
  price: number;
  profit: number;
  margin: number;
  reasoning: string;
}

/**
 * Get 3-tier AI price suggestion (kompetitif, standar, premium)
 */
export async function suggestPriceTiers(input: {
  productName: string;
  hpp: number;
  category?: string;
  competitorPrice?: number;
}): Promise<PriceTier[] | null> {
  const client = getClient();
  if (!client) return null;

  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Anda adalah konsultan bisnis UMKM Indonesia. Berikan 3 tingkatan saran harga jual untuk produk berikut:

Produk: ${input.productName}
HPP per unit: Rp ${input.hpp.toLocaleString('id-ID')}
${input.category ? `Kategori: ${input.category}` : ''}
${input.competitorPrice ? `Harga kompetitor: Rp ${input.competitorPrice.toLocaleString('id-ID')}` : ''}

Berikan rekomendasi 3 tier dalam format JSON array:
[
  {
    "tier": "kompetitif",
    "price": <angka>,
    "profit": <profit per unit>,
    "margin": <persentase margin>,
    "reasoning": "<alasan 1 kalimat singkat>"
  },
  {
    "tier": "standar",
    "price": <angka>,
    "profit": <profit per unit>,
    "margin": <persentase margin>,
    "reasoning": "<alasan 1 kalimat singkat>"
  },
  {
    "tier": "premium",
    "price": <angka>,
    "profit": <profit per unit>,
    "margin": <persentase margin>,
    "reasoning": "<alasan 1 kalimat singkat>"
  }
]

Aturan:
- Kompetitif: margin 25-35% (untuk menarik pelanggan baru, harga terjangkau)
- Standar: margin 50-65% (harga ideal untuk profit berkelanjutan)
- Premium: margin 75-100% (untuk kualitas premium, layanan eksklusif)
- Gunakan harga psikologis (akhir 500/900/000)
- Pertimbangkan daya beli UMKM Indonesia
- Profit harus = price - hpp (hitung benar)
- Reasoning dalam bahasa Indonesia santai

Hanya kembalikan JSON array, tanpa penjelasan tambahan.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('AI price suggestion failed:', e);
    return null;
  }
}

/**
 * Analyze HPP breakdown and suggest cost optimization
 */
export async function analyzeHPP(items: Array<{ name: string; cost: number; qty: number; unit: string }>): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const itemsList = items.map(i => `- ${i.name}: ${i.qty} ${i.unit} = Rp ${(i.qty * i.cost).toLocaleString('id-ID')}`).join('\n');
  const total = items.reduce((sum, i) => sum + i.cost * i.qty, 0);

  const prompt = `Anda adalah konsultan UMKM Indonesia. Analisis breakdown biaya berikut:

${itemsList}

Total HPP: Rp ${total.toLocaleString('id-ID')}

Berikan analisis singkat (maksimal 3 paragraf, 1 paragraf 2-3 kalimat) dalam bahasa Indonesia santai, mencakup:
1. Komponen biaya terbesar dan apakah wajar
2. Saran optimasi atau penghematan biaya
3. Tips strategis untuk UMKM

Tulis dalam format text biasa, tanpa heading, tanpa bullet points. Jangan terlalu formal.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error('AI HPP analysis failed:', e);
    return null;
  }
}

/**
 * Project sales target to achieve net profit goal
 */
export async function projectSalesTarget(input: {
  productName: string;
  hpp: number;
  sellingPrice: number;
  netProfitTarget: number;
  fixedCostPerMonth?: number;
}): Promise<{
  unitsToSell: number;
  revenueTarget: number;
  dailyTarget: number;
  reasoning: string;
} | null> {
  const client = getClient();
  if (!client) return null;

  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `Anda adalah konsultan bisnis UMKM Indonesia. Hitung target penjualan:

Produk: ${input.productName}
HPP per unit: Rp ${input.hpp.toLocaleString('id-ID')}
Harga jual: Rp ${input.sellingPrice.toLocaleString('id-ID')}
Target laba bersih per bulan: Rp ${input.netProfitTarget.toLocaleString('id-ID')}
${input.fixedCostPerMonth ? `Biaya tetap: Rp ${input.fixedCostPerMonth.toLocaleString('id-ID')}` : ''}

JSON format:
{
  "unitsToSell": <unit per bulan>,
  "revenueTarget": <omzet bulanan>,
  "dailyTarget": <unit per hari, asumsi 26 hari>,
  "reasoning": "<analisis 2-3 kalimat realistis dalam bahasa Indonesia santai>"
}

Hanya kembalikan JSON.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('AI sales projection failed:', e);
    return null;
  }
}

/**
 * Backwards-compat wrapper for single price suggestion
 */
export async function suggestPrice(input: {
  productName: string;
  hpp: number;
  category?: string;
  competitorPrice?: number;
}): Promise<{ suggestedPrice: number; reasoning: string; margin: number } | null> {
  const tiers = await suggestPriceTiers(input);
  if (!tiers || tiers.length === 0) return null;
  const standar = tiers.find(t => t.tier === 'standar') || tiers[0];
  return {
    suggestedPrice: standar.price,
    reasoning: standar.reasoning,
    margin: standar.margin,
  };
}
