import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import { WebView } from 'react-native-webview';
import {
  AlertCircle,
  List,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
} from 'lucide-react-native';
import { MAPBOX_ACCESS_TOKEN } from '@env';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  AlertBanner,
  BackendRequiredNotice,
  LocationChip,
  PageHeader,
} from '@/components/common/common-chrome';
import { RescueItemCard } from '@/components/common/rescue-item-card';
import {
  AppButton,
  AppSkeleton,
  BottomSheetModal,
  SegmentedTabs,
  SelectField,
} from '@/components/ui/primitives';
import { useCurrentLocation } from '@/features/discovery/use-current-location';
import { isConvexConfigured } from '@/lib/convex';
import { toRescueItemPreview } from '@/lib/discovery';
import { formatDistance, formatIdr, formatPickupWindow } from '@/lib/format';
import type { MaterialType } from '@/lib/pricing';
import {
  MATERIAL_CATEGORIES,
  rescueItemImageForMaterialType,
  toReactNativeImageSource,
} from '@/lib/rescue-item-images';
import type {
  ConsumerTabParamList,
  ExploreParams,
  RootStackParamList,
} from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

const CATEGORIES: readonly { value: MaterialType | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  ...MATERIAL_CATEGORIES.map(({ type, label }) => ({ value: type, label })),
];

const DISTANCE_OPTIONS = [
  { value: '30000', label: 'Semua jarak (30 km)' },
  { value: '2000', label: 'Maks. 2 km' },
  { value: '3000', label: 'Maks. 3 km' },
  { value: '5000', label: 'Maks. 5 km' },
] as const;

const PRICE_OPTIONS = [
  { value: 'all', label: 'Semua harga' },
  { value: '15000', label: 'Maks. Rp15 ribu' },
  { value: '20000', label: 'Maks. Rp20 ribu' },
  { value: '30000', label: 'Maks. Rp30 ribu' },
] as const;

const PICKUP_OPTIONS = [
  { value: 'all', label: 'Semua waktu' },
  { value: 'before_18', label: 'Mulai ≤18.00' },
  { value: 'after_18', label: 'Mulai >18.00' },
] as const;

const DIETARY_OPTIONS = [
  { value: 'all', label: 'Semua preferensi' },
  { value: 'Vegetarian', label: 'Vegetarian' },
  { value: 'Vegan', label: 'Vegan' },
  { value: 'Tanpa babi', label: 'Tanpa babi' },
] as const;

const DIETARY_NOTICE =
  'Preferensi berasal dari deklarasi merchant, bukan jaminan keamanan alergi atau bebas kontaminasi silang.';

function buildMapboxHtml(
  token: string,
  centerLat: number,
  centerLng: number,
  markers: readonly { id: string; lat: number; lng: number; name: string }[],
) {
  const geojson = JSON.stringify({
    type: 'FeatureCollection',
    features: markers.map((m) => ({
      type: 'Feature',
      properties: { id: m.id, name: m.name },
      geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
    })),
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link href="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}</style>
</head>
<body>
<div id="map"></div>
<script>
try {
  mapboxgl.accessToken = ${JSON.stringify(token)};
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [${centerLng}, ${centerLat}],
    zoom: 13,
    attributionControl: false
  });
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
  map.on('load', () => {
    map.addSource('rescue-items', {
      type: 'geojson',
      data: ${geojson},
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'rescue-items',
      filter: ['has', 'point_count'],
      paint: { 'circle-color': '#1BAC4B', 'circle-radius': ['step', ['get', 'point_count'], 20, 10, 28, 50, 36] }
    });
    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'rescue-items',
      filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
      paint: { 'text-color': '#272727' }
    });
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'rescue-items',
      filter: ['!', ['has', 'point_count']],
      paint: { 'circle-color': '#1BAC4B', 'circle-radius': 9, 'circle-stroke-width': 2.5, 'circle-stroke-color': '#ffffff' }
    });
    map.on('click', 'unclustered-point', (e) => {
      const id = e.features && e.features[0] && e.features[0].properties && e.features[0].properties.id;
      if (id && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', id }));
      }
    });
  });
  map.on('error', () => {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
  });
} catch (err) {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
}
</script>
</body>
</html>`;
}

function ExploreConnectedScreen() {
  const route = useRoute<RouteProp<ConsumerTabParamList, 'Explore'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const initialParams: ExploreParams = route.params ?? {};

  const [query, setQuery] = useState(initialParams.q ?? '');
  const [category, setCategory] = useState<MaterialType | 'all'>(
    initialParams.category ?? 'all',
  );
  const [maxDistance, setMaxDistance] = useState(
    initialParams.distance ?? '30000',
  );
  const [maxPrice, setMaxPrice] = useState(initialParams.price ?? 'all');
  const [pickupWindow, setPickupWindow] = useState(
    initialParams.pickup ?? 'all',
  );
  const [dietary, setDietary] = useState(initialParams.dietary ?? 'all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [filterOpen, setFilterOpen] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<Id<'surplusItems'> | null>(
    null,
  );

  // Sync incoming shortcut params when navigating from Home
  useEffect(() => {
    if (!route.params) return;
    if (route.params.q !== undefined) setQuery(route.params.q);
    if (route.params.category !== undefined) setCategory(route.params.category);
    if (route.params.distance !== undefined) setMaxDistance(route.params.distance);
    if (route.params.price !== undefined) setMaxPrice(route.params.price);
    if (route.params.pickup !== undefined) setPickupWindow(route.params.pickup);
    if (route.params.dietary !== undefined) setDietary(route.params.dietary);
  }, [route.params]);

  const {
    latitude,
    longitude,
    label: locationLabel,
    isFallback: locationDenied,
  } = useCurrentLocation();

  const dietaryTags = dietary === 'all' ? undefined : [dietary];

  const nearbyData = useQuery(
    api.discovery.listNearby,
    isConvexConfigured
      ? {
          latitude,
          longitude,
          radiusMeters: Number(maxDistance),
          materialType: category === 'all' ? undefined : category,
          dietaryTags,
          maxPrice: maxPrice === 'all' ? undefined : Number(maxPrice),
        }
      : 'skip',
  );

  const filtered = useMemo(() => {
    if (!nearbyData) return [];
    let results = nearbyData.results.filter((item) =>
      `${item.name} ${item.merchant.name}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    );
    if (pickupWindow !== 'all') {
      results = results.filter((item) => {
        const wibHour = new Date(item.pickupStartAt + 7 * 3_600_000).getUTCHours();
        return pickupWindow === 'before_18' ? wibHour <= 18 : wibHour > 18;
      });
    }
    return results;
  }, [nearbyData, query, pickupWindow]);

  const selectedItemDetails = useQuery(
    api.discovery.getListing,
    selectedItemId && isConvexConfigured ? { id: selectedItemId } : 'skip',
  );

  const selectedDistanceMeters = filtered.find(
    (item) => item._id === selectedItemId,
  )?.distanceMeters;

  const sheetFilterCount = [
    maxDistance !== '30000',
    maxPrice !== 'all',
    pickupWindow !== 'all',
    dietary !== 'all',
  ].filter(Boolean).length;

  const activeFilterCount =
    sheetFilterCount + (query.trim() ? 1 : 0) + (category !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
    setMaxDistance('30000');
    setMaxPrice('all');
    setPickupWindow('all');
    setDietary('all');
  };

  const mapboxToken = MAPBOX_ACCESS_TOKEN?.trim() ?? '';
  const mapHtml = useMemo(
    () =>
      mapboxToken
        ? buildMapboxHtml(
            mapboxToken,
            latitude,
            longitude,
            filtered.map((item) => ({
              id: item._id,
              lat: item.merchant.latitude,
              lng: item.merchant.longitude,
              name: item.name,
            })),
          )
        : '',
    [mapboxToken, latitude, longitude, filtered],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.topControls}>
        <View style={styles.headerLine}>
          <PageHeader title="Jelajah Rescue Item" />
          <LocationChip />
        </View>

        {locationDenied ? (
          <View style={{ marginBottom: 10 }}>
            <AlertBanner
              tone="warning"
              title="Menampilkan area pilot"
              body={`Jarak dihitung dari ${locationLabel}. Ketuk chip lokasi untuk memakai GPS perangkat.`}
            />
          </View>
        ) : null}

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cari makanan atau merchant"
              placeholderTextColor={colors.ink500}
              style={styles.searchInput}
            />
          </View>
          <AppButton
            variant="outline"
            size="sm"
            onPress={() => setFilterOpen(true)}
            style={{ paddingHorizontal: 12 }}
          >
            <SlidersHorizontal size={15} color={colors.foreground} />
            <Text style={styles.filterBtnText}>Filter</Text>
            {sheetFilterCount > 0 ? (
              <View style={styles.filterCountPill}>
                <Text style={styles.filterCountText}>{sheetFilterCount}</Text>
              </View>
            ) : null}
          </AppButton>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
        >
          {CATEGORIES.map((item) => {
            const active = category === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => setCategory(item.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.metaBar}>
          <Text style={styles.countText}>
            {nearbyData === undefined
              ? 'Memuat Rescue Item...'
              : `${filtered.length} Rescue Item · ${activeFilterCount} filter aktif`}
          </Text>
          <View style={{ width: 156 }}>
            <SegmentedTabs
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'list', label: 'Daftar' },
                { value: 'map', label: 'Peta' },
              ]}
            />
          </View>
        </View>
      </View>

      {viewMode === 'list' ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {nearbyData === undefined ? (
            <View style={{ gap: 12 }}>
              {[0, 1, 2].map((idx) => (
                <AppSkeleton key={idx} height={152} borderRadius={radius.lg} />
              ))}
            </View>
          ) : filtered.length > 0 ? (
            <View style={{ gap: 12 }}>
              {filtered.map((item) => (
                <RescueItemCard
                  key={item._id}
                  horizontal
                  item={toRescueItemPreview(
                    item,
                    rescueItemImageForMaterialType(item.materialType),
                  )}
                  onPress={() =>
                    navigation.navigate('ItemDetail', { id: item._id })
                  }
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Search size={30} color={colors.mutedForeground} />
              <Text style={styles.emptyTitle}>Belum ada yang cocok</Text>
              <Text style={styles.emptySub}>
                Coba ubah filter lokasi atau kriteria lainnya.
              </Text>
              <AppButton
                variant="outline"
                title="Atur ulang filter"
                onPress={resetFilters}
                style={{ marginTop: 14 }}
              />
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.mapWrap}>
          {!mapboxToken || mapError ? (
            <View style={styles.mapFallback}>
              <AlertCircle size={32} color={colors.destructive} />
              <Text style={styles.emptyTitle}>Peta tidak tersedia</Text>
              <Text style={styles.emptySub}>
                Gunakan tampilan daftar Rescue Item untuk melanjutkan pencarian.
              </Text>
              <AppButton
                variant="outline"
                title="Buka Daftar"
                leftIcon={<List size={16} color={colors.foreground} />}
                onPress={() => setViewMode('list')}
                style={{ marginTop: 12 }}
              />
            </View>
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: mapHtml }}
              javaScriptEnabled
              domStorageEnabled
              onError={() => setMapError(true)}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data) as {
                    type?: string;
                    id?: string;
                  };
                  if (data.type === 'select' && data.id) {
                    setSelectedItemId(data.id as Id<'surplusItems'>);
                  } else if (data.type === 'error') {
                    setMapError(true);
                  }
                } catch {
                  // Ignore malformed bridge messages
                }
              }}
              style={{ flex: 1 }}
            />
          )}
          <Pressable
            onPress={() => setViewMode('list')}
            style={styles.mapFloatingHint}
          >
            <MapIcon size={14} color={colors.primary} />
            <Text style={styles.mapHintText}>
              Ketuk pin hijau untuk melihat detail item
            </Text>
          </Pressable>
        </View>
      )}

      {/* Filter Bottom Sheet */}
      <BottomSheetModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter Rescue Item"
        description="Sesuaikan jarak, harga, waktu pickup, dan preferensi pangan."
      >
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
          <SelectField
            label="Jarak"
            value={maxDistance}
            options={DISTANCE_OPTIONS}
            onChange={(v) => setMaxDistance(v as ExploreParams['distance'] & string)}
          />
          <SelectField
            label="Harga"
            value={maxPrice}
            options={PRICE_OPTIONS}
            onChange={(v) => setMaxPrice(v as ExploreParams['price'] & string)}
          />
          <SelectField
            label="Waktu pickup"
            value={pickupWindow}
            options={PICKUP_OPTIONS}
            onChange={(v) => setPickupWindow(v as ExploreParams['pickup'] & string)}
          />
          <SelectField
            label="Preferensi pangan"
            value={dietary}
            options={DIETARY_OPTIONS}
            onChange={(v) => setDietary(v as ExploreParams['dietary'] & string)}
          />
          {dietary !== 'all' ? (
            <Text style={styles.dietaryNotice}>{DIETARY_NOTICE}</Text>
          ) : null}
          <View style={styles.sheetActions}>
            <AppButton
              variant="outline"
              title="Reset"
              onPress={resetFilters}
              style={{ flex: 1 }}
            />
            <AppButton
              title="Lihat hasil"
              onPress={() => setFilterOpen(false)}
              style={{ flex: 2 }}
            />
          </View>
        </ScrollView>
      </BottomSheetModal>

      {/* Map Pin Preview Sheet */}
      <BottomSheetModal
        visible={selectedItemId !== null}
        onClose={() => setSelectedItemId(null)}
        title={selectedItemDetails?.name ?? 'Detail Rescue Item'}
        description={
          selectedItemDetails
            ? `Dari ${selectedItemDetails.merchant.name}`
            : undefined
        }
      >
        {selectedItemDetails === undefined ? (
          <View style={{ gap: 10 }}>
            <AppSkeleton height={160} borderRadius={radius.lg} />
            <AppSkeleton height={24} width="60%" />
            <AppSkeleton height={70} borderRadius={radius.lg} />
          </View>
        ) : selectedItemDetails === null ? (
          <Text style={styles.emptySub}>
            Item tidak ditemukan atau sudah tidak tersedia.
          </Text>
        ) : (
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
            <Image
              source={toReactNativeImageSource(
                selectedItemDetails.imageUrl ||
                  rescueItemImageForMaterialType(
                    selectedItemDetails.materialType,
                  ),
              )}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <View style={styles.previewPriceRow}>
              <View>
                <Text style={styles.strikePrice}>
                  {formatIdr(selectedItemDetails.originalPrice)}
                </Text>
                <Text style={styles.previewPrice}>
                  {formatIdr(selectedItemDetails.currentPrice)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.previewSmall}>Tersedia</Text>
                <Text style={styles.previewStrong}>
                  {selectedItemDetails.remainingQuantity} porsi
                </Text>
              </View>
            </View>
            {selectedItemDetails.description ? (
              <Text style={styles.previewDesc}>
                {selectedItemDetails.description}
              </Text>
            ) : null}
            <View style={styles.previewMetaCard}>
              <View style={styles.previewMetaRow}>
                <Text style={styles.previewSmall}>Pickup</Text>
                <Text style={styles.previewStrong}>
                  {formatPickupWindow(
                    selectedItemDetails.pickupStartAt,
                    selectedItemDetails.pickupEndAt,
                  )}
                </Text>
              </View>
              <View style={styles.previewMetaRow}>
                <Text style={styles.previewSmall}>Lokasi</Text>
                <Text
                  numberOfLines={1}
                  style={[styles.previewStrong, { maxWidth: '65%' }]}
                >
                  {selectedItemDetails.merchant.address}
                </Text>
              </View>
              {selectedDistanceMeters !== undefined ? (
                <View style={styles.previewMetaRow}>
                  <Text style={styles.previewSmall}>Jarak</Text>
                  <Text style={styles.previewStrong}>
                    {formatDistance(selectedDistanceMeters)}
                  </Text>
                </View>
              ) : null}
            </View>
            <AppButton
              size="lg"
              title="Pilih jumlah dan reservasi"
              onPress={() => {
                const targetId = selectedItemId;
                setSelectedItemId(null);
                if (targetId) {
                  navigation.navigate('ItemDetail', { id: targetId });
                }
              }}
            />
          </ScrollView>
        )}
      </BottomSheetModal>
    </View>
  );
}

export default function ExploreScreen() {
  if (!isConvexConfigured) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <PageHeader title="Jelajah Rescue Item" />
        <BackendRequiredNotice />
      </View>
    );
  }
  return <ExploreConnectedScreen />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topControls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    paddingVertical: 8,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  filterCountPill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  categoryChips: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  chipTextActive: {
    color: colors.white,
  },
  metaBar: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  countText: {
    flex: 1,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 19,
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 6,
  },
  mapFloatingHint: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mapHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  dietaryNotice: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedForeground,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    height: 175,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  previewPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  strikePrice: {
    fontSize: 13,
    color: colors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  previewPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  previewSmall: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  previewStrong: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  previewDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  previewMetaCard: {
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    padding: 12,
    gap: 8,
  },
  previewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
});
