import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Store } from 'lucide-react-native';
import { QueryErrorBoundary } from '@/components/common/common-chrome';
import { MerchantCard } from '@/components/common/merchant-card';
import { RescueItemCard } from '@/components/common/rescue-item-card';
import {
  AppButton,
  AppSkeleton,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useCurrentLocation } from '@/features/discovery/use-current-location';
import {
  type MaterialType,
  useNearbyRescueItems,
} from '@/features/discovery/use-nearby-rescue-items';
import { groupByMerchant, toRescueItemPreview } from '@/lib/discovery';
import {
  materialCategory,
  rescueItemImageForMaterialType,
} from '@/lib/rescue-item-images';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function CategoryResults({
  materialType,
  label,
}: {
  materialType: MaterialType;
  label: string;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const nearbyData = useNearbyRescueItems({ materialType });
  const fallbackImage = rescueItemImageForMaterialType(materialType);

  const items = useMemo(
    () =>
      (nearbyData?.results ?? []).map((item) =>
        toRescueItemPreview(item, fallbackImage),
      ),
    [fallbackImage, nearbyData],
  );

  const merchants = useMemo(
    () => groupByMerchant(nearbyData?.results ?? []),
    [nearbyData],
  );

  if (nearbyData === undefined) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((idx) => (
          <AppSkeleton key={idx} height={240} style={styles.gridCard} />
        ))}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Store size={32} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>
          Belum ada {label.toLowerCase()} aktif
        </Text>
        <Text style={styles.emptySub}>
          Window pickup di kategori ini sudah lewat semua. Coba kategori lain
          atau buka jelajah.
        </Text>
        <AppButton
          variant="outline"
          title="Jelajahi Rescue Item"
          onPress={() =>
            navigation.navigate('ConsumerMain', { screen: 'Explore' })
          }
          style={{ marginTop: 14 }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Text style={styles.sectionTitle}>{items.length} Rescue Item aktif</Text>
        <Text style={styles.sectionSub}>
          dari {merchants.length} Mitra Usaha · diurutkan dari yang terdekat
        </Text>
        <View style={[styles.grid, { marginTop: 12 }]}>
          {items.map((item) => (
            <RescueItemCard
              key={item.id}
              item={item}
              style={styles.gridCard}
              onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
            />
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}>
          Mitra Usaha dengan {label.toLowerCase()}
        </Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          {merchants.map((merchant) => (
            <MerchantCard
              key={merchant.id}
              merchant={merchant}
              onPress={() =>
                navigation.navigate('ConsumerMerchant', {
                  merchantId: merchant.id,
                })
              }
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function CategoryScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Category'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { label: locationLabel } = useCurrentLocation();
  const category = materialCategory(route.params.categorySlug);

  if (!category) {
    return (
      <ScreenScrollView>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Kategori tidak ditemukan</Text>
          <Text style={styles.emptySub}>Alamat kategori ini tidak dikenali.</Text>
          <AppButton
            title="Kembali ke beranda"
            onPress={() => navigation.navigate('ConsumerMain')}
            style={{ marginTop: 14 }}
          />
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView contentContainerStyle={{ padding: 0, paddingBottom: 32 }}>
      <View style={styles.heroWrap}>
        <Image source={category.image} style={styles.heroImage} resizeMode="cover" />
        <View style={styles.heroScrim} />
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>{category.label}</Text>
          <Text style={styles.heroSub}>
            {category.blurb} · radius 30 km dari {locationLabel}
          </Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <QueryErrorBoundary title="Daftar kategori tidak dapat dimuat">
          <CategoryResults
            materialType={category.type}
            label={category.label}
          />
        </QueryErrorBoundary>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    height: 168,
    position: 'relative',
    backgroundColor: colors.ink900,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20, 26, 22, 0.52)',
  },
  heroTextWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.4,
  },
  heroSub: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255,255,255,0.86)',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  sectionSub: {
    marginTop: 2,
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
    lineHeight: 19,
  },
});
