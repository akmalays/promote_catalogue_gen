import type { LucideIcon } from 'lucide-react';
import { Calculator, Percent, Tag } from 'lucide-react';

export type ToolCategory = 'kalkulator' | 'generator';
export type BusinessType = 'retail' | 'fnb' | 'umum';

export interface ToolMeta {
  /** URL slug under /tools/<slug> */
  slug: string;
  /** Display title */
  title: string;
  /** Short description */
  description: string;
  /** Icon used on the hub card */
  icon: LucideIcon;
  /** Category badge */
  category: ToolCategory;
  /** Which business types this tool is most useful for (just a hint badge) */
  forBusiness: BusinessType[];
  /** When false, shown as "Segera hadir" and not navigable */
  available: boolean;
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'hpp',
    title: 'Kalkulator HPP & Harga Jual',
    description:
      'Hitung modal produk lengkap dengan susut, packaging, komisi marketplace, dan proyeksi target penjualan.',
    icon: Calculator,
    category: 'kalkulator',
    forBusiness: ['fnb', 'umum'],
    available: true,
  },
  {
    slug: 'margin',
    title: 'Kalkulator Margin & Markup',
    description:
      'Versi simpel: input harga beli + margin atau markup, langsung dapat harga jual ideal. Cocok untuk reseller & retail.',
    icon: Percent,
    category: 'kalkulator',
    forBusiness: ['retail', 'umum'],
    available: true,
  },
  {
    slug: 'promo-impact',
    title: 'Kalkulator Dampak Promo',
    description:
      'Lihat dampak diskon atau buy-1-get-1 ke margin dan profit sebelum promo dijalankan.',
    icon: Tag,
    category: 'kalkulator',
    forBusiness: ['retail', 'fnb'],
    available: true,
  },
];

export const getTool = (slug: string) => TOOLS.find(t => t.slug === slug);

export const businessLabel: Record<BusinessType, string> = {
  retail: 'Retail',
  fnb: 'F&B',
  umum: 'Umum',
};

export const categoryLabel: Record<ToolCategory, string> = {
  kalkulator: 'Kalkulator',
  generator: 'Generator',
};
