import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from 'convex/react';
import {
  ChevronRight,
  Clock3,
  Info,
  MapPin,
  ShieldCheck,
  Store,
} from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { QueryErrorBoundary } from '@/components/common/common-chrome';
import { RescueItemCard } from '@/components/common/rescue-item-card';
import { ReserveSheet } from '@/components/common/reserve-sheet';
import { StatusBadge } from '@/components/common/status-badge';
import { AppButton, AppSkeleton } from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useCurrentLocation } from '@/features/discovery/use-current-location';
import { useNearbyRescueItems } from '@/features/discovery/use-nearby-rescue-items';
import { toRescueItemPreview } from '@/lib/discovery';
import { getErrorMessage } from '@/lib/errors';
import {
  formatDistance,
  formatIdr,
  formatPickupWindow,
  formatWeight,
  formatWibDay,
} from '@/lib/format';
import { calculateHaversineDistanceMeters } from '@/lib/geo';
import {
  rescueItemImageForMaterialType,
  toReactNativeImageSource,
} from '@/lib/rescue-item-images';
import { generateIdempotencyKey } from '@/lib/uuid';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function MoreFromMerchant({
  merchantId,
  merchantName,
  excludeItemId,
}: {
  merchantId: string;
  merchantName: string;
  excludeItemId: string;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const nearbyData = useNearbyRescueItems();

  const previews = useMemo(
    () =>
      (nearbyData?.results ?? [])
        .filter(
          (item) =>
            item.merchant._id === merchantId && item._id !== excludeItemId,
        )
        .slice(0, 4)
        .map((item) =>
          toRescueItemPreview(
            item,
            rescueItemImageForMaterialType(item.materialType),
          ),
        ),
    [excludeItemId, merchantId, nearbyData],
  );

  if (previews.length === 0) return null;

  return (
    <View style={styles.moreSection}>
      <View style={styles.moreHeader}>
        <Text style={styles.moreTitle}>Lainnya dari {merchantName}</Text>
        <Pressable
          onPress={() =>
            navigation.navigate('ConsumerMerchant', { merchantId })
          }
        >
          <Text style={styles.moreLink}>Lihat semua</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
      >
        {previews.map((item) => (
          <RescueItemCard
            key={item.id}
            item={item}
            style={{ width: 205 }}
            onPress={() => navigation.push('ItemDetail', { id: item.id })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ItemDetailBody({ id }: { id: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { sessionToken, isAuthenticated } = useAuth();
  const item = useQuery(api.discovery.getListing, {
    id: id as Id<'surplusItems'>,
  });
  const reserve = useMutation(api.orders.reserve);
  const { latitude, longitude } = useCurrentLocation();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isReserving, setIsReserving] = useState(false);

  const distanceMeters =
    item === undefined || item === null
      ? null
      : calculateHaversineDistanceMeters(
          latitude,
          longitude,
          item.merchant.latitude,
          item.merchant.longitude,
        );

  if (item === undefined) {
    return (
      <View style={{ padding: 16, gap: 14 }}>
        <AppSkeleton height={240} borderRadius={radius.xl} />
        <AppSkeleton height={24} width="40%" />
        <AppSkeleton height={34} width="85%" />
        <AppSkeleton height={90} borderRadius={radius.lg} />
      </View>
    );
  }

  if (item === null) {
    return (
      <View style={styles.notFoundBox}>
        <Text style={styles.notFoundTitle}>
          Rescue Item tidak ditemukan atau sudah tidak aktif
        </Text>
        <AppButton
          title="Kembali menjelajah"
          onPress={() =>
            navigation.navigate('ConsumerMain', { screen: 'Explore' })
          }
          style={{ marginTop: 14 }}
        />
      </View>
    );
  }

  const hasStock = item.remainingQuantity > 0;

  const handleReserveClick = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login', { returnTo: `/item/${item._id}` });
      return;
    }
    setIsSheetOpen(true);
  };

  const handleReserve = async (quantity: number) => {
    if (!hasStock || quantity < 1 || quantity > item.remainingQuantity) return;

    try {
      setIsReserving(true);
      const idempotencyKey = generateIdempotencyKey();
      const orderId = await reserve({
        surplusItemId: item._id,
        quantity,
        idempotencyKey,
        sessionToken: sessionToken || undefined,
      });
      setIsSheetOpen(false);
      toast.success('Berhasil direservasi. Selesaikan pembayaran sekarang.');
      navigation.navigate('Checkout', { orderId });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal melakukan reservasi.'));
      setIsReserving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
      >
        <Image
          source={toReactNativeImageSource(
            item.imageUrl || rescueItemImageForMaterialType(item.materialType),
          )}
          style={styles.heroImage}
          resizeMode="cover"
        />

        <View style={styles.badgeRow}>
          <StatusBadge status={hasStock ? 'active' : 'sold_out'} />
          <View style={styles.discountPill}>
            <Text style={styles.discountPillText}>
              Hemat {item.discountPercentage}%
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() =>
            navigation.navigate('ConsumerMerchant', {
              merchantId: item.merchant._id,
            })
          }
          style={styles.merchantLink}
        >
          <Store size={15} color={colors.primary} />
          <Text numberOfLines={1} style={styles.merchantLinkText}>
            {item.merchant.name}
          </Text>
          <ChevronRight size={16} color={colors.primary} />
        </Pressable>

        <Text style={styles.itemTitle}>{item.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>{formatIdr(item.currentPrice)}</Text>
          <Text style={styles.originalPrice}>
            {formatIdr(item.originalPrice)}
          </Text>
        </View>

        <Text style={styles.description}>
          {item.description || 'Makanan surplus berkualitas dari merchant ini.'}
        </Text>

        <View style={styles.infoPanel}>
          <View style={styles.infoItem}>
            <Clock3 size={18} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {formatWibDay(item.pickupStartAt)}
              </Text>
              <Text style={styles.infoSub}>
                {formatPickupWindow(item.pickupStartAt, item.pickupEndAt)}
              </Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <MapPin size={18} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Ambil di merchant</Text>
              <Text style={styles.infoSub}>
                {item.merchant.address}
                {distanceMeters !== null
                  ? ` · ${formatDistance(distanceMeters)} dari lokasimu`
                  : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Preferensi pangan</Text>
          <View style={styles.tagsWrap}>
            {item.dietaryTags.length > 0 ? (
              item.dietaryTags.map((tag: string) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.mutedText}>Tidak ada tag.</Text>
            )}
          </View>
          <View style={styles.disclaimerRow}>
            <Info size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
            <Text style={styles.disclaimerText}>
              Informasi ini membantu penyaringan preferensi, bukan jaminan
              keamanan alergi.
            </Text>
          </View>
        </View>

        <View style={styles.stockBox}>
          <Text style={styles.sectionLabel}>Ketersediaan</Text>
          <Text style={styles.mutedText}>
            {hasStock
              ? `${item.remainingQuantity} paket tersisa · ${formatWeight(item.weightPerItemGrams)} per paket`
              : 'Semua paket sudah habis direservasi.'}
          </Text>
        </View>

        <MoreFromMerchant
          merchantId={item.merchant._id}
          merchantName={item.merchant.name}
          excludeItemId={item._id}
        />
      </ScrollView>

      {/* Sticky Thumb-Reachable Action Bar */}
      <View
        style={[
          styles.stickyBar,
          { paddingBottom: Math.max(14, insets.bottom + 8) },
        ]}
      >
        <View>
          <Text style={styles.stickyLabel}>Harga per paket</Text>
          <Text style={styles.stickyPrice}>{formatIdr(item.currentPrice)}</Text>
        </View>
        <AppButton
          size="lg"
          disabled={!hasStock || isReserving}
          title={hasStock ? 'Reservasi' : 'Stok habis'}
          leftIcon={<ShieldCheck size={18} color={colors.white} />}
          onPress={handleReserveClick}
          style={{ minWidth: 160 }}
        />
      </View>

      <ReserveSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        isSubmitting={isReserving}
        onConfirm={handleReserve}
        item={{
          name: item.name,
          merchantName: item.merchant.name,
          merchantAddress: item.merchant.address,
          currentPrice: item.currentPrice,
          remainingQuantity: item.remainingQuantity,
          weightPerItemGrams: item.weightPerItemGrams,
          pickupStartAt: item.pickupStartAt,
          pickupEndAt: item.pickupEndAt,
        }}
      />
    </View>
  );
}

export default function ItemDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ItemDetail'>>();
  return (
    <QueryErrorBoundary title="Detail Rescue Item tidak dapat dimuat">
      <ItemDetailBody id={route.params.id} />
    </QueryErrorBoundary>
  );
}

const styles = StyleSheet.create({
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.xl,
    backgroundColor: colors.muted,
  },
  badgeRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountPill: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  discountPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  merchantLink: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  merchantLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 1,
  },
  itemTitle: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  priceRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  originalPrice: {
    fontSize: 15,
    color: colors.ink500,
    textDecorationLine: 'line-through',
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: colors.mutedForeground,
  },
  infoPanel: {
    marginTop: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
    padding: 14,
    gap: 14,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  infoSub: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  sectionBlock: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  tagsWrap: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  disclaimerRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 6,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedForeground,
  },
  stockBox: {
    marginTop: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  mutedText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  moreSection: {
    marginTop: 24,
  },
  moreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  moreTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  moreLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  stickyLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  stickyPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
  },
  notFoundBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
});
