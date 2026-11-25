import React, { type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConvexProvider } from 'convex/react';
import {
  AuthProvider,
  AuthUnavailableProvider,
} from '@/contexts/auth-context';
import { ToastProvider } from '@/contexts/toast-context';
import { convexClient } from '@/lib/convex';

export function AppProviders({ children }: { children: ReactNode }) {
  const inner = <ToastProvider>{children}</ToastProvider>;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {convexClient ? (
          <ConvexProvider client={convexClient}>
            <AuthProvider>{inner}</AuthProvider>
          </ConvexProvider>
        ) : (
          <AuthUnavailableProvider>{inner}</AuthUnavailableProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
