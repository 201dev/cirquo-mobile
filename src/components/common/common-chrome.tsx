import React, { Component, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AlertCircle, MapPin, RefreshCw, WifiOff } from 'lucide-react-native';
import { AppButton } from '@/components/ui/primitives';
import { useCurrentLocation } from '@/features/discovery/use-current-location';
import { colors, radius } from '@/theme/tokens';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderRow}>
        <Text style={styles.pageTitle}>{title}</Text>
        {action ? <View style={styles.pageAction}>{action}</View> : null}
      </View>
      {description ? (
        <Text style={styles.pageDescription}>{description}</Text>
      ) : null}
    </View>
  );
}

export function PageLoader({ label = 'Memuat...' }: { label?: string }) {
  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loaderText}>{label}</Text>
    </View>
  );
}

export function BackendRequiredNotice() {
  return (
    <View style={styles.noticeBox}>
      <WifiOff size={28} color={colors.warningForeground} />
      <Text style={styles.noticeTitle}>Backend Convex belum terhubung</Text>
      <Text style={styles.noticeBody}>
        Tambahkan CONVEX_URL di file .env (misalnya http://10.0.2.2:3210 untuk
        emulator Android) lalu jalankan ulang Metro bundler.
      </Text>
    </View>
  );
}

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.unreadBadge}>
      <Text style={styles.unreadText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export function LocationChip({ withRadius = false }: { withRadius?: boolean }) {
  const { label, isFallback, status, refresh } = useCurrentLocation();
  const isResolving = status === 'resolving';

  return (
    <Pressable
      onPress={refresh}
      disabled={isResolving}
      accessibilityRole="button"
      accessibilityLabel="Perbarui lokasi"
      style={({ pressed }) => [styles.locationChip, pressed && { opacity: 0.75 }]}
    >
      {isResolving ? (
        <ActivityIndicator size="small" color={colors.brandGreen} />
      ) : (
        <MapPin size={14} color={colors.brandGreen} />
      )}
      <Text numberOfLines={1} style={styles.locationText}>
        {isFallback ? `${label} (perkiraan)` : label}
        {withRadius ? ' · 30 km' : ''}
      </Text>
    </Pressable>
  );
}

export function AlertBanner({
  tone = 'warning',
  title,
  body,
}: {
  tone?: 'warning' | 'destructive' | 'info' | 'success';
  title?: string;
  body: string;
}) {
  const palette =
    tone === 'destructive'
      ? {
          bg: colors.destructiveSoft,
          border: colors.destructiveBorder,
          text: colors.destructive,
        }
      : tone === 'info'
        ? {
            bg: colors.inProgressSoft,
            border: colors.inProgressBorder,
            text: '#1d5682',
          }
        : tone === 'success'
          ? {
              bg: colors.rescuedSoft,
              border: colors.rescuedBorder,
              text: colors.leaf800,
            }
          : {
              bg: colors.warning,
              border: colors.warningBorder,
              text: colors.warningForeground,
            };

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <AlertCircle size={18} color={palette.text} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {title ? (
          <Text style={[styles.bannerTitle, { color: palette.text }]}>{title}</Text>
        ) : null}
        <Text style={[styles.bannerBody, { color: palette.text }]}>{body}</Text>
      </View>
    </View>
  );
}

export class QueryErrorBoundary extends Component<
  { title: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorBoundary}>
          <AlertCircle size={24} color={colors.destructive} />
          <Text style={styles.errorTitle}>{this.props.title}</Text>
          <Text style={styles.errorSub}>
            Periksa koneksi internet dan server Convex lalu coba lagi.
          </Text>
          <AppButton
            variant="outline"
            size="sm"
            title="Coba lagi"
            leftIcon={<RefreshCw size={14} color={colors.foreground} />}
            onPress={() => this.setState({ hasError: false })}
            style={{ marginTop: 12 }}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: 16,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  pageAction: {
    flexShrink: 0,
  },
  pageDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: colors.background,
  },
  loaderText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  noticeBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warning,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.warningForeground,
    textAlign: 'center',
  },
  noticeBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.warningForeground,
    textAlign: 'center',
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 230,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(27, 172, 75, 0.45)',
    backgroundColor: colors.card,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    flexShrink: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 13,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  errorBoundary: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.destructiveBorder,
    backgroundColor: colors.card,
    padding: 20,
    alignItems: 'center',
  },
  errorTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  errorSub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
