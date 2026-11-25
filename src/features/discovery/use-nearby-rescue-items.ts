import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';
import { isConvexConfigured } from '@/lib/convex';
import { useCurrentLocation } from './use-current-location';

export type MaterialType = Doc<'surplusItems'>['materialType'];

export function useNearbyRescueItems(options?: {
  materialType?: MaterialType;
  radiusMeters?: number;
}) {
  const { latitude, longitude } = useCurrentLocation();

  return useQuery(
    api.discovery.listNearby,
    isConvexConfigured
      ? {
          latitude,
          longitude,
          radiusMeters: options?.radiusMeters ?? 30_000,
          materialType: options?.materialType,
        }
      : 'skip',
  );
}
