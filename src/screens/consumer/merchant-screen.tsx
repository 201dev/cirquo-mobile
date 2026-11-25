import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Clock3, MapPin, Package, Store, Tag } from 'lucide-react-native';
import { QueryErrorBoundary } from '@/components/common/common-chrome';
import { RescueItemCard } from '@/components/common/rescue-item-card';
import {
  AppButton,
  AppSkeleton,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useNearbyRescueItems } from '@/features/discovery/use-nearby-rescue-items';
import { BUSINESS_TYPE_LABELS } from '@/lib/admin-review';
import { toRescueItemPreview } from '@/lib/discovery';
import { formatDistance, formatIdr, formatWibTime } from '@/lib/format';
import {
  MATERIAL_CATEGORIES,
  rescueItemImageForMaterialType,
  toReactNativeImageSource,
} from '@/lib/rescue-item-images';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function MerchantDetailBody({ merchantId }: { merchantId: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const nearbyData = useNearbyRescueItems();

  const items = useMemo(
    () => nearbyData?.results.filter((item) => item.merchant._id === merchantId),
    [merchantId, nearbyData],
  );

  const sections = useMemo(() => {
    if (items === undefined) return [];
    return MATERIAL_CATEGORIES.map((category) => ({
      label: category.label,
      type: category.type,
      previews: items
        .filter((item) => item.materialType === category.type)
        .map((item) =>
          toRescueItemPreview(
            item,
            rescueItemImageForMaterialType(item.materialType),
          ),
        ),
    })).filter((s) => s.previews.length > 0);
  }, [items]);

  if (items === undefined) {
    return (
      <View style={{ padding: 16, gap: 14 }}>
        <AppSkeleton height={150} borderRadius={radius.lg} />
        <AppSkeleton height={28} width="60%" />
        <AppSkeleton height={80} borderRadius={radius.lg} />
      </View>
    );
  }

  const first = items[0];
  if (!first) {
    return (
      <View style={{ padding: 16 }}>
        <View style={styles.emptyBox}>
          <Store size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Mitra Usaha tidak ditemukan</Text>
          <Text style={styles.emptySub}>
            Mitra ini belum punya Rescue Item aktif, atau berada di luar radius
            30 km dari lokasimu.
          </Text>
          <AppButton
            title="Kembali menjelajah"
            onPress={() =>
              navigation.navigate('ConsumerMain', { screen: 'Explore' })
            }
            style={{ marginTop: 14 }}
          />
        </View>
      </View>
    );
  }

  const coverSource = toReactNativeImageSource(
    first.imageUrl || rescueItemImageForMaterialType(first.materialType),
  );
  const businessLabel =
    BUSINESS_TYPE_LABELS[first.merchant.businessType ?? 'other'] ??
    'Mitra Usaha';

  const prices = items.map((i) => i.currentPrice);
  const cheapest = Math.min(...prices);
  const dearest = Math.max(...prices);
  const soonest = items.reduce((a, b) => Math.min(a, b.pickupStartAt), first.pickupStartAt);
  const latest = items.reduce((a, b) => Math.max(a, b.pickupEndAt), first.pickupEndAt);

  const facts = [
    { icon: MapPin, label: 'Jarak', value: formatDistance(first.distanceMeters) },
    { icon: Package, label: 'Item aktif', value: `${items.length} Rescue Item` },
    {
      icon: Tag,
      label: 'Rentang harga',
      value:
        cheapest === dearest
          ? formatIdr(cheapest)
          : `${formatIdr(cheapest)}–${formatIdr(dearest)}`,
    },
    {
      icon: Clock3,
      label: 'Window pickup',
      value: `${formatWibTime(soonest)}–${formatWibTime(latest)}`,
    },
  ];

  return (
    <View>
      <View style={styles.coverWrap}>
        <Image source={coverSource} style={styles.coverImage} resizeMode="cover" />
        <View style={styles.coverScrim} />
      </View>

      <View style={styles.headerBlock}>
        <View style={styles.avatarRow}>
          <Image source={coverSource} style={styles.avatar} resizeMode="cover" />
          <Text numberOfLines={1} style={styles.bizLabel}>
            {businessLabel} · {first.merchant.address.split(',')[0]}
          </Text>
        </View>
        <Text style={styles.merchantName}>{first.merchant.name}</Text>
        <View style={styles.addrRow}>
          <MapPin size={15} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={styles.addrText}>{first.merchant.address}</Text>
        </View>

        <View style={styles.factsGrid}>
          {facts.map(({ icon: Icon, label, value }) => (
            <View key={label} style={styles.factCell}>
              <View style={styles.factLabelRow}>
                <Icon size={13} color={colors.primary} />
                <Text style={styles.factLabel}>{label}</Text>
              </View>
              <Text style={styles.factValue}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.pickupRule}>
          Pengambilan dilakukan langsung di lokasi ini dengan kode pickup enam
          digit. Cirquo tidak melakukan pengantaran.
        </Text>

        {sections.map((section) => (
          <View key={section.type} style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.label}</Text>
              <Text style={styles.sectionCount}>{section.previews.length} item</Text>
            </View>
            <View style={styles.grid}>
              {section.previews.map((item) => (
                <RescueItemCard
                  key={item.id}
                  item={item}
                  style={styles.gridCard}
                  onPress={() =>
                    navigation.navigate('ItemDetail', { id: item.id })
                  }
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ConsumerMerchantScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ConsumerMerchant'>>();

  return (
    <ScreenScrollView contentContainerStyle={{ padding: 0, paddingBottom: 32 }}>
      <QueryErrorBoundary title="Mitra Usaha tidak dapat dimuat">
        <MerchantDetailBody merchantId={route.params.merchantId} />
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  coverWrap: {
    height: 150,
    backgroundColor: colors.ink900,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20, 26, 22, 0.35)',
  },
  headerBlock: {
    paddingHorizontal: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: -36,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.background,
    backgroundColor: colors.muted,
  },
  bizLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 42,
  },
  merchantName: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  addrRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  addrText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  factsGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  factCell: {
    width: '50%',
    padding: 12,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  factLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  factLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  factValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  pickupRule: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  sectionBlock: {
    marginTop: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  sectionCount: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '48.3%',
  },
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptySub: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
