import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { MAPBOX_ACCESS_TOKEN } from '@env';

export type LocationStatus = 'resolving' | 'ready' | 'denied' | 'unsupported';

export interface CurrentLocation {
  latitude: number;
  longitude: number;
  label: string;
  isFallback: boolean;
  status: LocationStatus;
}

const FALLBACK = {
  latitude: -7.052,
  longitude: 110.44,
  label: 'Tembalang, Semarang',
} as const;

const CACHE_KEY = 'cirquo.location.v1';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

let state: CurrentLocation = {
  ...FALLBACK,
  isFallback: true,
  status: 'resolving',
};

const listeners = new Set<() => void>();

function setState(next: CurrentLocation) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function readCache(): Promise<CurrentLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { latitude, longitude, label, savedAt } = parsed as Record<string, unknown>;
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      typeof label !== 'string' ||
      typeof savedAt !== 'number' ||
      Date.now() - savedAt > CACHE_MAX_AGE_MS
    ) {
      return null;
    }
    return { latitude, longitude, label, isFallback: false, status: 'resolving' };
  } catch {
    return null;
  }
}

async function writeCache(location: CurrentLocation) {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        label: location.label,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Ignore storage errors
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Izin Lokasi Cirquo',
          message:
            'Cirquo memerlukan lokasi perangkat untuk menghitung jarak pickup dan menampilkan Rescue Item terdekat.',
          buttonPositive: 'Izinkan',
          buttonNegative: 'Nanti',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }
  return true;
}

export function getDeviceCoordinates(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    void requestLocationPermission().then((granted) => {
      if (!granted) {
        reject(new Error('PERMISSION_DENIED'));
        return;
      }
      Geolocation.getCurrentPosition(
        ({ coords }) => {
          resolve({ latitude: coords.latitude, longitude: coords.longitude });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    });
  });
}

async function fetchLabel(
  latitude: number,
  longitude: number,
  signal: AbortSignal,
): Promise<string | null> {
  const token = MAPBOX_ACCESS_TOKEN?.trim();
  if (!token) return null;

  const url =
    `https://api.mapbox.com/search/geocode/v6/reverse` +
    `?latitude=${encodeURIComponent(String(latitude))}` +
    `&longitude=${encodeURIComponent(String(longitude))}` +
    `&types=neighborhood,locality,place&language=id&limit=1` +
    `&access_token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const feature = (body as { features?: { properties?: unknown }[] }).features?.[0];
    const properties = feature?.properties as
      | {
          name?: string;
          context?: Record<string, { name?: string } | undefined>;
        }
      | undefined;
    if (properties === undefined) return null;

    const area = properties.name;
    const city = properties.context?.place?.name;
    const parts = [area, city].filter(
      (part): part is string => typeof part === 'string' && part.length > 0,
    );
    const unique = [...new Set(parts)];
    return unique.length > 0 ? unique.join(', ') : null;
  } catch {
    return null;
  }
}

let inFlight: AbortController | null = null;

async function resolveLocation() {
  inFlight?.abort();
  const controller = new AbortController();
  inFlight = controller;

  const cached = await readCache();
  if (cached && state.isFallback && !controller.signal.aborted) {
    setState(cached);
  } else {
    setState({ ...state, status: 'resolving' });
  }

  const granted = await requestLocationPermission();
  if (controller.signal.aborted) return;

  if (!granted) {
    setState({ ...FALLBACK, isFallback: true, status: 'denied' });
    return;
  }

  Geolocation.getCurrentPosition(
    ({ coords }) => {
      if (controller.signal.aborted) return;
      const { latitude, longitude } = coords;
      setState({
        latitude,
        longitude,
        label: state.isFallback ? 'Lokasi kamu' : state.label,
        isFallback: false,
        status: 'ready',
      });
      void fetchLabel(latitude, longitude, controller.signal).then((label) => {
        if (controller.signal.aborted) return;
        const next: CurrentLocation = {
          latitude,
          longitude,
          label: label ?? 'Lokasi kamu',
          isFallback: false,
          status: 'ready',
        };
        setState(next);
        void writeCache(next);
      });
    },
    (error) => {
      if (controller.signal.aborted) return;
      setState({
        ...FALLBACK,
        isFallback: true,
        status: error.code === 1 ? 'denied' : 'unsupported',
      });
    },
    { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
  );
}

let started = false;

export function useCurrentLocation() {
  const location = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );

  useEffect(() => {
    if (started) return;
    started = true;
    void resolveLocation();
  }, []);

  const refresh = useCallback(() => {
    started = true;
    void resolveLocation();
  }, []);

  return { ...location, refresh };
}
