import { CampaignProduct, PromoCampaign } from '../types';

/**
 * Promo math + resolver helpers shared by POS, Inventory, Catalogue,
 * and reporting code so behaviour stays consistent everywhere.
 */

export type PromoType = 'price_cut' | 'b1g1' | 'b2g1' | 'buy_x_get_y';

export interface ResolvedPromo extends CampaignProduct {
  campaign: PromoCampaign;
}

/** A single promo offer for a product, normalised for UI rendering. */
export interface PromoOffer {
  campaignId: string;
  campaignName: string;
  campaignProductId: string;
  promoType: PromoType;
  promoPrice?: number | null;
  buyQty: number;
  getQty: number;
  priority: number;
  stackable: boolean;
  minMarginPct?: number | null;
  maxQtyPerTrx?: number | null;
  stockCap?: number | null;
  color?: string | null;
}

/** Convert raw join rows into a clean offer list, sorted by priority. */
export function buildOffersForProduct(
  productId: string,
  campaigns: PromoCampaign[],
  campaignProducts: CampaignProduct[],
): PromoOffer[] {
  const campaignsById = new Map(campaigns.map(c => [c.id, c]));
  return campaignProducts
    .filter(cp => cp.product_id === productId)
    .map(cp => {
      const c = campaignsById.get(cp.campaign_id);
      if (!c) return null;
      const buyQty = cp.promo_type === 'b1g1' ? 1 : cp.promo_type === 'b2g1' ? 2 : (cp.buy_qty || 1);
      const getQty = cp.promo_type === 'b1g1' ? 1 : cp.promo_type === 'b2g1' ? 1 : (cp.get_qty || 1);
      const offer: PromoOffer = {
        campaignId: c.id,
        campaignName: c.name,
        campaignProductId: cp.id,
        promoType: cp.promo_type,
        promoPrice: cp.promo_price ?? null,
        buyQty,
        getQty,
        priority: c.priority ?? 100,
        stackable: c.stackable ?? false,
        minMarginPct: cp.min_margin_pct ?? null,
        maxQtyPerTrx: cp.max_qty_per_trx ?? null,
        stockCap: cp.stock_cap ?? null,
        color: c.color ?? null,
      };
      return offer;
    })
    .filter((o): o is PromoOffer => o !== null)
    .sort((a, b) => a.priority - b.priority);
}

/** Pick a default offer when multiple campaigns target the same product. */
export function pickPrimaryOffer(offers: PromoOffer[]): PromoOffer | null {
  if (offers.length === 0) return null;
  return offers[0]; // already sorted by priority asc
}

/** Returns campaigns whose date window contains `now` AND is_active. */
export function filterLiveCampaigns(
  campaigns: PromoCampaign[],
  now: Date = new Date(),
): PromoCampaign[] {
  return campaigns.filter(c => {
    if (!c.is_active) return false;
    const start = c.start_date ? new Date(c.start_date) : null;
    const end = c.end_date ? new Date(c.end_date) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  });
}

/** Per-line effective amounts after applying a promo offer once. */
export interface LineEffective {
  unitPriceNormal: number;
  unitPriceAfter: number;
  qtyPaid: number;
  qtyFree: number;
  discountAmount: number;
}

/**
 * Calculate the financial impact of one promo bundle (i.e. one application).
 * `basePrice` should be the master price stored on `products.price`.
 */
export function calculateLineEffective(
  basePrice: number,
  offer: PromoOffer | null,
): LineEffective {
  if (!offer) {
    return {
      unitPriceNormal: basePrice,
      unitPriceAfter: basePrice,
      qtyPaid: 1,
      qtyFree: 0,
      discountAmount: 0,
    };
  }

  if (offer.promoType === 'price_cut') {
    const after = offer.promoPrice ?? basePrice;
    return {
      unitPriceNormal: basePrice,
      unitPriceAfter: after,
      qtyPaid: 1,
      qtyFree: 0,
      discountAmount: Math.max(0, basePrice - after),
    };
  }

  // Volume promos: buy X get Y (b1g1 / b2g1 / buy_x_get_y)
  return {
    unitPriceNormal: basePrice,
    unitPriceAfter: basePrice, // paid units stay at full price
    qtyPaid: offer.buyQty,
    qtyFree: offer.getQty,
    discountAmount: basePrice * offer.getQty,
  };
}

/** Effective margin percent of a single bundle, in the [0..100] range (can be negative). */
export function calculateMarginPct(
  basePrice: number,
  costPrice: number,
  offer: PromoOffer | null,
): number {
  const eff = calculateLineEffective(basePrice, offer);
  const revenue = eff.unitPriceAfter * eff.qtyPaid;
  const cogs = costPrice * (eff.qtyPaid + eff.qtyFree);
  if (revenue <= 0) return 0;
  return ((revenue - cogs) / revenue) * 100;
}

/** Bundle size = paying units + free units. Useful for stock projection. */
export function bundleSize(offer: PromoOffer | null): number {
  if (!offer) return 1;
  if (offer.promoType === 'price_cut') return 1;
  return offer.buyQty + offer.getQty;
}

/**
 * Days of stock left given an average daily sale rate. Returns Infinity if no rate.
 * `avgDailyUnits` is items moved per day (from sales history).
 */
export function projectStockDays(
  currentStock: number,
  avgDailyUnits: number,
  offer: PromoOffer | null,
): number {
  if (avgDailyUnits <= 0) return Infinity;
  // For volume promos one transaction can pull `bundleSize` units.
  // We assume the avg already accounts for that historically.
  return currentStock / avgDailyUnits;
}

/** Short, human-friendly label e.g. "B1G1", "B2G1", "B3G2", "-25%". */
export function offerLabel(offer: PromoOffer, basePrice?: number): string {
  if (offer.promoType === 'b1g1') return 'B1G1';
  if (offer.promoType === 'b2g1') return 'B2G1';
  if (offer.promoType === 'buy_x_get_y') return `B${offer.buyQty}G${offer.getQty}`;
  if (basePrice && offer.promoPrice && basePrice > 0) {
    const pct = Math.round((1 - offer.promoPrice / basePrice) * 100);
    return `-${pct}%`;
  }
  return 'Promo';
}
