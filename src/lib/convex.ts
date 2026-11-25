import { ConvexReactClient } from 'convex/react';
import { CONVEX_URL } from '@env';

const convexUrl = CONVEX_URL?.trim();

export const convexClient = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;

export const isConvexConfigured = convexClient !== null;

if (__DEV__ && !convexClient) {
  console.info('Cirquo mobile berjalan tanpa CONVEX_URL di .env.');
}
