import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Clock3, MapPin, Timer } from 'lucide-react-native';
import { pickupUrgencyLabel } from '@/lib/discovery';
import { formatIdr, formatWeight } from '@/lib/format';
import { toReactNativeImageSource } from '@/lib/rescue-item-images';
import { colors, radius, shadowCard } from '@/theme/tokens';
import type { RescueItemPreview } from '@/types/domain';

export function RescueItemCard({
  item,
  horizontal = false,
  onPress,
  style,
}: {
  item: RescueItemPreview;
  horizontal?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const discount =
    item.originalPrice > 0
      ? Math.max(0, Math.round((1 - item.currentPrice / item.originalPrice) * 100))
      : 0;
  const unavailable = item.status !== 'active';
  const urgency =
    item.pickupEndAt !== undefined
      ? pickupUrgencyLabel(item.pickupEndAt, Date.now())
      : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} dari ${item.merchantName}, ${formatIdr(item.currentPrice)}`}
      style={({ pressed }) => [
        styles.card,
        horizontal && styles.cardHorizontal,
        pressed && { opacity: 0.92 },
        style,
      ]}
    >
      <View
        style={[
          styles.imageWrap,
          horizontal ? styles.imageWrapHorizontal : styles.imageWrapVertical,
        ]}
      >
        <Image
          source={toReactNativeImageSource(item.image)}
          style={[styles.image, unavailable && { opacity: 0.45 }]}
          resizeMode="cover"
        />
        {discount > 0 ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        ) : null}
        {urgency !== null && !unavailable ? (
          <View style={styles.urgencyBadge}>
            <Timer size={11} color={colors.warningForeground} />
            <Text style={styles.urgencyText}>{urgency}</Text>
          </View>
        ) : null}
        {unavailable ? (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>Sudah habis</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.merchant}>
          {item.merchantName}
        </Text>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          <MapPin size={12} color={colors.mutedForeground} />
          <Text numberOfLines={1} style={styles.metaText}>
            {String(item.distanceKm).replace('.', ',')} km ·{' '}
            {formatWeight(item.weightPerItemGrams)} / paket
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>{formatIdr(item.currentPrice)}</Text>
          <Text style={styles.originalPrice}>{formatIdr(item.originalPrice)}</Text>
        </View>
        <View style={styles.pickupBox}>
          <View style={styles.pickupRow}>
            <Clock3 size={12} color={colors.primary} />
            <Text numberOfLines={1} style={styles.pickupWindow}>
              {item.pickupWindow}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.stockText}>
            {item.remainingQuantity} paket tersisa
            {item.dietaryTags[0] ? ` · ${item.dietaryTags[0]}` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadowCard,
  },
  cardHorizontal: {
    flexDirection: 'row',
  },
  imageWrap: {
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  imageWrapVertical: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  imageWrapHorizontal: {
    width: 118,
    minHeight: 150,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.brandYellow,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandCharcoal,
  },
  urgencyBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.warning,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warningForeground,
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(39,39,39,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    padding: 11,
    gap: 4,
  },
  merchant: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    flex: 1,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  currentPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.leaf700,
  },
  originalPrice: {
    fontSize: 11,
    color: colors.ink500,
    textDecorationLine: 'line-through',
  },
  pickupBox: {
    marginTop: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.ink200,
    backgroundColor: colors.ink50,
    gap: 2,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pickupWindow: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
  },
  stockText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
