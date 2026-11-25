export type UserRole = 'consumer' | 'merchant' | 'processor' | 'admin';

export type RescueItemStatus =
  | 'draft'
  | 'active'
  | 'sold_out'
  | 'expired'
  | 'recovery_pending'
  | 'recovered'
  | 'residual'
  | 'closed'
  | 'moderated';

/**
 * Framework-agnostic image asset representation so shared `src/lib/` files
 * imported by both React Native and Convex stay free of `react-native` imports.
 */
export type ImageAssetSource = string | number | { uri: string };

export interface RescueItemPreview {
  id: string;
  name: string;
  merchantName: string;
  currentPrice: number;
  originalPrice: number;
  remainingQuantity: number;
  weightPerItemGrams: number;
  pickupWindow: string;
  status: RescueItemStatus;
  description: string;
  image: ImageAssetSource;
  address: string;
  distanceKm: number;
  dietaryTags: string[];
  pickupEndAt?: number;
}
