export const MATERIAL_TYPES = [
  'prepared_food',
  'bakery',
  'produce',
  'dairy',
  'protein',
  'dry_goods',
  'mixed',
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];
export { PRICING_CONFIG } from './pricing-config';
import { PRICING_CONFIG } from './pricing-config';

export type PricingInput = {
  originalPrice: number;
  floorPrice: number;
  pickupStartAt: number;
  pickupEndAt: number;
  now: number;
  initialQuantity: number;
  remainingQuantity: number;
  materialType: MaterialType;
};

export type PricingResult = {
  suggestedPrice: number;
  discountPercent: number;
  breakdown: { base: number; urgency: number; stockPressure: number };
  clampedByFloor: boolean;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function suggestRescuePrice(input: PricingInput): PricingResult {
  const config = PRICING_CONFIG;
  const base = config.baseDiscountByMaterial[input.materialType];
  const windowMs = Math.max(1, input.pickupEndAt - input.pickupStartAt);
  const elapsed = clamp01((input.now - input.pickupStartAt) / windowMs);
  const urgency = config.URGENCY_MAX * elapsed ** 2;
  const sellThrough =
    input.initialQuantity > 0
      ? 1 - input.remainingQuantity / input.initialQuantity
      : 0;
  const shortfall = Math.max(0, elapsed - sellThrough);
  const stockPressure = config.STOCK_MAX * shortfall;
  const discount = Math.min(
    config.MAX_DISCOUNT,
    base + urgency + stockPressure,
  );
  const target = Math.round(input.originalPrice * (1 - discount));
  const floor = Math.max(input.floorPrice, config.MIN_PRICE_IDR);
  const suggestedPrice = Math.max(floor, target);

  return {
    suggestedPrice,
    discountPercent:
      input.originalPrice > 0
        ? (1 - suggestedPrice / input.originalPrice) * 100
        : 0,
    breakdown: { base, urgency, stockPressure },
    clampedByFloor: suggestedPrice > target,
  };
}
