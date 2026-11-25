import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowRight,
  BadgePercent,
  Bell,
  Clock3,
  Info,
  MapPin,
  Recycle,
  Search,
  ShieldCheck,
  Store,
} from 'lucide-react-native';
import { AppLogo } from '@/components/common/app-logo';
import {
  BackendRequiredNotice,
  LocationChip,
  QueryErrorBoundary,
  UnreadBadge,
} from '@/components/common/common-chrome';
import { MerchantCard } from '@/components/common/merchant-card';
import { RescueItemCard } from '@/components/common/rescue-item-card';
import {
  AppButton,
  AppSkeleton,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useNearbyRescueItems } from '@/features/discovery/use-nearby-rescue-items';
import { useUnreadNotificationCount } from '@/features/notifications/use-unread-notifications';
import { isConvexConfigured } from '@/lib/convex';
import { groupByMerchant, toRescueItemPreview } from '@/lib/discovery';
import {
  MATERIAL_CATEGORIES,
  rescueItemImageForMaterialType,
} from '@/lib/rescue-item-images';
import type { ExploreParams, RootStackParamList } from '@/navigation/types';
import { colors, radius, shadowCard, shadowRaised } from '@/theme/tokens';

const SHORTCUTS: readonly {
  label: string;
  hint: string;
  params: ExploreParams;
  icon: typeof MapPin;
}[] = [
  { label: 'Dekat saya', hint: 'maks. 2 km', params: { distance: '2000' }, icon: MapPin },
  { label: 'Paling hemat', hint: 'maks. Rp15.000', params: { price: '15000' }, icon: BadgePercent },
  { label: 'Pickup segera', hint: 'mulai ≤18.00', params: { pickup: 'before_18' }, icon: Clock3 },
  { label: 'Vegetarian', hint: 'tanpa daging', params: { dietary: 'Vegetarian' }, icon: Recycle },
];

const HOW_IT_WORKS = [
  {
    icon: ShieldCheck,
    title: 'Pickup langsung di lokasi',
    body: 'Reservasi lewat Cirquo, tunjukkan kode pickup enam digit di Mitra Usaha. Tidak ada pengantaran.',
  },
  {
    icon: BadgePercent,
    title: 'Harga turun, mutu tetap',
    body: 'Surplus dijual di bawah harga normal karena window pickup-nya pendek, bukan karena kualitasnya turun.',
  },
  {
    icon: Recycle,
    title: 'Sisanya tetap tercatat',
    body: 'Yang tidak terambil bisa masuk Circular Routing ke Mitra Pengolah, dan setiap perpindahan masuk Material Flow Ledger.',
  },
] as const;

function NearbyRescueItems() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const nearbyData = useNearbyRescueItems();

  const items = useMemo(
    () =>
      nearbyData?.results
        .slice(0, 8)
        .map((item) =>
          toRescueItemPreview(
            item,
            rescueItemImageForMaterialType(item.materialType),
          ),
        ),
    [nearbyData],
  );

  if (items === undefined) {
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
        <Search size={30} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>Belum ada Rescue Item aktif</Text>
        <Text style={styles.emptySub}>
          Semua window pickup dalam radius 30 km sudah lewat. Coba lagi saat
          Mitra Usaha menambahkan surplus.
        </Text>
        <AppButton
          variant="outline"
          size="sm"
          title="Buka halaman jelajah"
          onPress={() =>
            navigation.navigate('ConsumerMain', { screen: 'Explore' })
          }
          style={{ marginTop: 12 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <RescueItemCard
          key={item.id}
          item={item}
          style={styles.gridCard}
          onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
        />
      ))}
    </View>
  );
}

function NearbyMerchants() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const nearbyData = useNearbyRescueItems();

  const merchants = useMemo(
    () =>
      nearbyData ? groupByMerchant(nearbyData.results).slice(0, 6) : undefined,
    [nearbyData],
  );

  if (merchants === undefined) {
    return (
      <View style={{ gap: 10 }}>
        {[0, 1, 2].map((idx) => (
          <AppSkeleton key={idx} height={92} borderRadius={radius.lg} />
        ))}
      </View>
    );
  }

  if (merchants.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      {merchants.map((merchant) => (
        <MerchantCard
          key={merchant.id}
          merchant={merchant}
          onPress={() =>
            navigation.navigate('ConsumerMerchant', { merchantId: merchant.id })
          }
        />
      ))}
    </View>
  );
}

function HeaderBellButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const unreadCount = useUnreadNotificationCount();
  return (
    <Pressable
      onPress={() => navigation.navigate('Notifications')}
      accessibilityLabel="Notifikasi"
      style={styles.iconCircle}
    >
      <Bell size={19} color={colors.foreground} />
      {unreadCount > 0 ? (
        <View style={styles.badgePos}>
          <UnreadBadge count={unreadCount} />
        </View>
      ) : null}
    </Pressable>
  );
}

export default function ConsumerHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const firstName = user?.name.trim().split(/\s+/)[0]?.slice(0, 20);

  const handleSearch = () => {
    const value = query.trim();
    navigation.navigate('ConsumerMain', {
      screen: 'Explore',
      params: value ? { q: value } : undefined,
    });
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerBar}>
        <AppLogo size={24} />
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate('About')}
            accessibilityLabel="Tentang Cirquo"
            style={styles.iconCircle}
          >
            <Info size={19} color={colors.foreground} />
          </Pressable>
          {isAuthenticated && isConvexConfigured ? (
            <HeaderBellButton />
          ) : (
            <AppButton
              size="sm"
              title="Masuk"
              onPress={() => navigation.navigate('Login')}
            />
          )}
        </View>
      </View>

      <View style={{ marginBottom: 14 }}>
        <LocationChip withRadius />
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>
          {firstName ? `Halo, ${firstName}. ` : ''}Makanan baik di dekatmu, siap
          diselamatkan.
        </Text>
        <Text style={styles.heroSubtitle}>
          Pilih Rescue Item, reservasi, lalu ambil langsung di Mitra Usaha.
        </Text>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholder="Cari makanan atau Mitra Usaha"
            placeholderTextColor={colors.ink500}
            style={styles.searchInput}
          />
          <AppButton
            size="sm"
            accessibilityLabel="Cari"
            onPress={handleSearch}
            style={{ paddingHorizontal: 12 }}
          >
            <ArrowRight size={18} color={colors.white} />
          </AppButton>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lagi cari apa?</Text>
        <View style={styles.shortcutGrid}>
          {SHORTCUTS.map(({ label, hint, params, icon: Icon }) => (
            <Pressable
              key={label}
              onPress={() =>
                navigation.navigate('ConsumerMain', {
                  screen: 'Explore',
                  params,
                })
              }
              style={({ pressed }) => [
                styles.shortcutCard,
                pressed && { opacity: 0.88 },
              ]}
            >
              <View style={styles.shortcutIcon}>
                <Icon size={18} color={colors.leaf700} />
              </View>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.shortcutLabel}>
                  {label}
                </Text>
                <Text numberOfLines={1} style={styles.shortcutHint}>
                  {hint}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pilih berdasarkan kategori</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {MATERIAL_CATEGORIES.map((category) => (
            <Pressable
              key={category.type}
              onPress={() =>
                navigation.navigate('Category', { categorySlug: category.type })
              }
              style={styles.categoryItem}
            >
              <Image source={category.image} style={styles.categoryImage} />
              <Text numberOfLines={2} style={styles.categoryLabel}>
                {category.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Pilihan bagus di dekatmu</Text>
            <Text style={styles.sectionSub}>
              Rescue Item aktif yang bisa direservasi dan diambil hari ini.
            </Text>
          </View>
          <AppButton
            variant="ghost"
            size="sm"
            title="Semua"
            rightIcon={<ArrowRight size={14} color={colors.foreground} />}
            onPress={() =>
              navigation.navigate('ConsumerMain', { screen: 'Explore' })
            }
          />
        </View>
        <View style={{ marginTop: 12 }}>
          {isConvexConfigured ? (
            <QueryErrorBoundary title="Rescue Item di dekatmu tidak dapat dimuat">
              <NearbyRescueItems />
            </QueryErrorBoundary>
          ) : (
            <BackendRequiredNotice />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Mitra Usaha terdekat</Text>
            <Text style={styles.sectionSub}>
              Tempat pickup yang sedang punya surplus, diurutkan dari yang terdekat.
            </Text>
          </View>
          <AppButton
            variant="ghost"
            size="sm"
            title="Peta"
            leftIcon={<Store size={14} color={colors.foreground} />}
            onPress={() =>
              navigation.navigate('ConsumerMain', { screen: 'Explore' })
            }
          />
        </View>
        <View style={{ marginTop: 12 }}>
          {isConvexConfigured ? (
            <QueryErrorBoundary title="Daftar Mitra Usaha tidak dapat dimuat">
              <NearbyMerchants />
            </QueryErrorBoundary>
          ) : null}
        </View>
      </View>

      <View style={styles.howBox}>
        <Text style={styles.sectionTitle}>Kenapa lewat Cirquo?</Text>
        <View style={styles.howList}>
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
            <View key={title} style={styles.howRow}>
              <View style={styles.shortcutIcon}>
                <Icon size={18} color={colors.leaf700} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.howTitle}>{title}</Text>
                <Text style={styles.howBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePos: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  heroCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.brandGreen,
    padding: 18,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    color: colors.white,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.92)',
  },
  searchBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingLeft: 12,
    paddingRight: 5,
    paddingVertical: 5,
    ...shadowRaised,
  },
  searchInput: {
    flex: 1,
    minHeight: 40,
    fontSize: 14,
    color: colors.foreground,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  sectionSub: {
    marginTop: 3,
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 17,
  },
  shortcutGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutCard: {
    width: '48.4%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 11,
    ...shadowCard,
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.leaf100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  shortcutHint: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  categoryRow: {
    gap: 14,
    paddingTop: 12,
    paddingBottom: 2,
  },
  categoryItem: {
    width: 78,
    alignItems: 'center',
    gap: 6,
  },
  categoryImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
    lineHeight: 15,
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
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptySub: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 19,
  },
  howBox: {
    marginTop: 26,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.leaf200,
    backgroundColor: colors.leaf50,
    padding: 16,
  },
  howList: {
    marginTop: 14,
    gap: 14,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  howTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  howBody: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
});
