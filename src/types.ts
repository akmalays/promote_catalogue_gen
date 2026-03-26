export interface CatalogItem {
  id: string;
  brand: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage?: number;
  image: string;
  unit: string;
  isBuyXGetY?: boolean;
  buyQuantity?: number;
  getQuantity?: number;
}

export interface CatalogRow {
  id: string;
  title: string;
  items: CatalogItem[];
}

export interface CatalogData {
  brandName: string;
  promoTitle: string;
  promoSubtitle: string;
  shippingTitle: string;
  shippingValue: string;
  shippingUnit: string;
  shippingSubtitle: string;
  tagline: string;
  period: string;
  showHeadBanner?: boolean;
  headBannerImage?: string;
  headBannerTitle?: string;
  headBannerSubtitle?: string;
  rows: CatalogRow[];
  templateId: string;
  patternId: string;
}

export const DEFAULT_ITEMS: CatalogItem[] = [
  {
    id: '1',
    brand: 'CHITATO',
    name: 'LITE',
    description: 'Snack Potato Asli/Cheese 110g',
    originalPrice: 27900,
    discountedPrice: 19500,
    discountPercentage: 25,
    image: 'https://picsum.photos/seed/chitato/200/200',
    unit: 'Klg'
  },
  {
    id: '2',
    brand: 'FISHERMAN\'S',
    name: 'FRIEND',
    description: 'Candy Extra Strong Original 25g',
    originalPrice: 21500,
    discountedPrice: 17900,
    discountPercentage: 30,
    image: 'https://picsum.photos/seed/candy/200/200',
    unit: 'Pck'
  },
  {
    id: '3',
    brand: 'KRAFT',
    name: 'CHEDDAR',
    description: 'Keju Cheddar 70g',
    originalPrice: 13000,
    discountedPrice: 8900,
    discountPercentage: 30,
    image: 'https://picsum.photos/seed/cheese/200/200',
    unit: 'Pck'
  },
  {
    id: '4',
    brand: 'INDOMARET',
    name: 'MEISES',
    description: 'Chocolate Meises 80g',
    originalPrice: 6900,
    discountedPrice: 5900,
    discountPercentage: 10,
    image: 'https://picsum.photos/seed/meises/200/200',
    unit: 'Pck'
  },
  {
    id: '5',
    brand: 'MILO',
    name: 'ACTIV-GO',
    description: 'Susu Cokelat 4x22g',
    originalPrice: 10900,
    discountedPrice: 8400,
    discountPercentage: 20,
    image: 'https://picsum.photos/seed/milo/200/200',
    unit: 'Pck'
  },
  {
    id: '6',
    brand: 'INDOMIE',
    name: 'MIE GORENG',
    description: 'Jumbo Special 129g',
    originalPrice: 12600,
    discountedPrice: 11000,
    discountPercentage: 10,
    image: 'https://picsum.photos/seed/indomie/200/200',
    unit: '3 Pcs'
  }
];

export const DEFAULT_ROWS: CatalogRow[] = [
  {
    id: 'row-1',
    title: 'Kebutuhan Sehari-hari',
    items: [DEFAULT_ITEMS[0], DEFAULT_ITEMS[1], DEFAULT_ITEMS[2], DEFAULT_ITEMS[3]]
  },
  {
    id: 'row-2',
    title: 'Cemilan & Minuman',
    items: [DEFAULT_ITEMS[4], DEFAULT_ITEMS[5]]
  },
  {
    id: 'row-3',
    title: 'Perawatan Diri',
    items: [DEFAULT_ITEMS[0], DEFAULT_ITEMS[1], DEFAULT_ITEMS[2]]
  }
];

export const DEFAULT_CATALOG: CatalogData = {
  brandName: 'KLIK',
  promoTitle: 'PROMO HEMAT!',
  promoSubtitle: 'GRATIS ONGKIR',
  shippingTitle: 'GRATIS ONGKIR',
  shippingValue: '1',
  shippingUnit: 'JAM',
  shippingSubtitle: 'SAMPAI',
  tagline: 'Belanja Online Seperti di Toko',
  period: '19 MARET - 1 APRIL 2026',
  showHeadBanner: false,
  headBannerImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop',
  headBannerTitle: 'SPESIAL MINGGU INI',
  headBannerSubtitle: 'Dapatkan penawaran eksklusif untuk produk-produk pilihan terbaik kami. Jangan sampai kehabisan!',
  rows: DEFAULT_ROWS,
  templateId: 'indomaret-style',
  patternId: 'none'
};
