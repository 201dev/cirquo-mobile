import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MapPin, Package } from 'lucide-react-native';
import type { MerchantGroup } from '@/lib/discovery';
import { formatDistance, formatIdr } from '@/lib/format';
import {
  rescueItemImageForMaterialType,
  toReactNativeImageSource,
} from '@/lib/rescue-item-images';
import { colors, radius, shadowCard } from '@/theme/tokens';

export function MerchantCard({
  merchant,
  onPress,
}: {
  merchant: MerchantGroup;
  onPress: () => void;
}) {
  const imageSource = toReactNativeImageSource(
    merchant.imageUrl || rescueItemImageForMaterialType(merchant.materialType),
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <Image source={imageSource} style={styles.thumb} resizeMode="cover" />
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>
          {merchant.name}
        </Text>
        <Text numberOfLines={1} style={styles.address}>
          {merchant.address}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={12} color={colors.primary} />
            <Text style={styles.metaText}>
              {formatDistance(merchant.distanceMeters)}
            </Text>
          </View>
          <Text style={styles.dot}>·</Text>
          <View style={styles.metaItem}>
            <Package size={12} color={colors.mutedForeground} />
            <Text style={styles.metaText}>{merchant.itemCount} item</Text>
          </View>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>
            mulai <Text style={styles.price}>{formatIdr(merchant.cheapestPrice)}</Text>
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 12,
    ...shadowCard,
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  address: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  dot: {
    fontSize: 12,
    color: colors.ink400,
  },
  price: {
    fontWeight: '700',
    color: colors.foreground,
  },
});
