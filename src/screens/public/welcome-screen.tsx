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
  Clock3,
  MapPin,
  Recycle,
  Search,
  ShieldCheck,
} from 'lucide-react-native';
import { AppLogo } from '@/components/common/app-logo';
import {
  LocationChip,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import { RescueItemCard } from '@/components/common/rescue-item-card';
import {
  AppButton,
  AppSkeleton,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useNearbyRescueItems } from '@/features/discovery/use-nearby-rescue-items';
import { isConvexConfigured } from '@/lib/convex';
import { toRescueItemPreview } from '@/lib/discovery';
import {
  MATERIAL_CATEGORIES,
  rescueItemImageForMaterialType,
} from '@/lib/rescue-item-images';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius, shadowRaised } from '@/theme/tokens';

const WHY_CIRQUO = [
  {
    icon: BadgePercent,
    title: 'Hemat & berkualitas',
    body: 'Dapatkan makanan enak dengan harga lebih ramah di kantong.',
  },
  {
    icon: MapPin,
    title: 'Dekat dari rumah',
    body: 'Rescue Item dalam radius 30 km, diurutkan dari yang paling dekat.',
  },
  {
    icon: ShieldCheck,
    title: 'Pickup tanpa ribet',
    body: 'Reservasi di aplikasi, tunjukkan kode pickup di Mitra Usaha. Tanpa pengantaran.',
  },
  {
    icon: Recycle,
    title: 'Tercatat sampai akhir',
    body: 'Setiap perpindahan masuk Material Flow Ledger, termasuk yang berlanjut ke Mitra Pengolah.',
  },
] as const;

function NearbyPicks() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const nearbyData = useNearbyRescueItems();

  const items = useMemo(
    () =>
      nearbyData?.results
        .slice(0, 5)
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
        {[0, 1, 2].map((i) => (
          <AppSkeleton key={i} width={215} height={295} borderRadius={radius.lg} />
        ))}
      </ScrollView>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Search size={30} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>Belum ada Rescue Item aktif</Text>
        <Text style={styles.emptySub}>
          Semua window pickup dalam radius 30 km sudah lewat. Coba lagi saat
          Mitra Usaha menambahkan surplus.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalRow}
    >
      {items.map((item) => (
        <RescueItemCard
          key={item.id}
          item={item}
          style={{ width: 215 }}
          onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
        />
      ))}
    </ScrollView>
  );
}

export default function WelcomeScreen() {
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
      <View style={styles.topBar}>
        <AppLogo size={26} />
        <View style={styles.topActions}>
          {!isAuthenticated ? (
            <>
              <AppButton
                size="sm"
                variant="outline"
                title="Masuk"
                onPress={() => navigation.navigate('Login')}
              />
              <AppButton
                size="sm"
                title="Daftar"
                onPress={() => navigation.navigate('Register')}
              />
            </>
          ) : null}
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
        <Text style={styles.heroBody}>
          Pilih Rescue Item, reservasi, lalu ambil langsung di Mitra Usaha.
        </Text>
        <View style={styles.searchBar}>
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
        <Text style={styles.sectionTitle}>Mau cari apa hari ini?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {MATERIAL_CATEGORIES.map((category) => (
            <Pressable
              key={category.type}
              onPress={() =>
                navigation.navigate('Category', { categorySlug: category.type })
              }
              style={styles.catItem}
            >
              <Image source={category.image} style={styles.catImg} />
              <Text numberOfLines={2} style={styles.catLabel}>
                {category.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Pilihan bagus di dekatmu</Text>
            <Text style={styles.sectionSub}>
              Surplus enak, aman, dan tentunya murah!
            </Text>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          {isConvexConfigured ? (
            <QueryErrorBoundary title="Rescue Item di dekatmu tidak dapat dimuat">
              <NearbyPicks />
            </QueryErrorBoundary>
          ) : (
            <View style={styles.emptyCard}>
              <Clock3 size={28} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Hubungkan backend Convex</Text>
              <Text style={styles.emptySub}>
                Konfigurasikan CONVEX_URL di .env untuk melihat Rescue Item live.
              </Text>
            </View>
          )}
        </View>
        <AppButton
          variant="secondary"
          title="Lihat semua Rescue Item"
          onPress={() =>
            navigation.navigate('ConsumerMain', { screen: 'Explore' })
          }
          style={{ marginTop: 14, borderRadius: radius.pill }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kenapa beli pakai Cirquo?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {WHY_CIRQUO.map(({ icon: Icon, title, body }) => (
            <View key={title} style={styles.whyCard}>
              <View style={styles.whyIconBox}>
                <Icon size={24} color={colors.primary} />
              </View>
              <Text style={styles.whyTitle}>{title}</Text>
              <Text style={styles.whyBody}>{body}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.footerLinks}>
        <AppButton
          variant="outline"
          title="Tentang Cirquo"
          onPress={() => navigation.navigate('About')}
        />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.brandGreen,
    padding: 20,
  },
  heroTitle: {
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 31,
    color: colors.white,
    letterSpacing: -0.5,
  },
  heroBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.92)',
  },
  searchBar: {
    marginTop: 16,
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
    marginTop: 26,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  sectionSub: {
    marginTop: 3,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  catRow: {
    gap: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  catItem: {
    width: 82,
    alignItems: 'center',
    gap: 7,
  },
  catImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
    lineHeight: 16,
  },
  horizontalRow: {
    gap: 12,
    paddingVertical: 4,
  },
  emptyCard: {
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
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 18,
  },
  whyCard: {
    width: 230,
    borderRadius: radius.xl,
    backgroundColor: colors.brandWhyCard,
    padding: 16,
    marginTop: 12,
  },
  whyIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  whyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  whyBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink700,
  },
  footerLinks: {
    marginTop: 28,
  },
});
