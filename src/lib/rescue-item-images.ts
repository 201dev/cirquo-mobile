import type { ImageSourcePropType } from 'react-native';
import type { ImageAssetSource } from '@/types/domain';

const bakeryImage = require('@/assets/rescue-bakery.webp') as ImageSourcePropType;
const dryGoodsImage = require('@/assets/categories/rescue-dry-goods.webp') as ImageSourcePropType;
const mealImage = require('@/assets/rescue-meal.webp') as ImageSourcePropType;
const mixedImage = require('@/assets/categories/rescue-mixed.webp') as ImageSourcePropType;
const produceImage = require('@/assets/rescue-produce.webp') as ImageSourcePropType;
const proteinImage = require('@/assets/categories/rescue-protein.webp') as ImageSourcePropType;

export const HERO_LANDING_IMAGE = require('@/assets/landing/hero.png') as ImageSourcePropType;
export const HERO_CONSUMER_IMAGE = require('@/assets/cirquo-hero.webp') as ImageSourcePropType;
export const MASCOT_LEDGER_IMAGE = require('@/assets/mascot/mascot-ledger.webp') as ImageSourcePropType;

export const MATERIAL_CATEGORIES = [
  {
    type: 'prepared_food',
    label: 'Siap santap',
    blurb: 'Nasi box, lauk, dan menu matang',
    image: mealImage,
  },
  {
    type: 'bakery',
    label: 'Roti & pastry',
    blurb: 'Roti, kue, dan pastry akhir hari',
    image: bakeryImage,
  },
  {
    type: 'produce',
    label: 'Sayur & buah',
    blurb: 'Hasil sortir yang masih segar',
    image: produceImage,
  },
  {
    type: 'protein',
    label: 'Protein',
    blurb: 'Ayam, daging, dan olahan',
    image: proteinImage,
  },
  {
    type: 'dairy',
    label: 'Susu & olahan',
    blurb: 'Susu, yogurt, dan keju',
    image: mealImage,
  },
  {
    type: 'dry_goods',
    label: 'Bahan kering',
    blurb: 'Beras, bumbu, dan sembako',
    image: dryGoodsImage,
  },
  {
    type: 'mixed',
    label: 'Paket campur',
    blurb: 'Kombinasi beberapa material',
    image: mixedImage,
  },
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

const byType = new Map<string, MaterialCategory>(
  MATERIAL_CATEGORIES.map((category) => [category.type, category]),
);

export function materialCategory(materialType: string) {
  return byType.get(materialType);
}

export function rescueItemImageForMaterialType(materialType: string): ImageAssetSource {
  return (byType.get(materialType)?.image ?? mixedImage) as ImageAssetSource;
}

export function toReactNativeImageSource(
  source: ImageAssetSource,
): ImageSourcePropType {
  if (typeof source === 'string') {
    return { uri: source };
  }
  return source as ImageSourcePropType;
}
