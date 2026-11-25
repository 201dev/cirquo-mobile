import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from 'convex/react';
import {
  Bell,
  ChevronRight,
  Info,
  LogOut,
  MapPin,
  UserRound,
} from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import { PageHeader, UnreadBadge } from '@/components/common/common-chrome';
import {
  AppButton,
  AppCard,
  AppInput,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getDeviceCoordinates } from '@/features/discovery/use-current-location';
import { useUnreadNotificationCount } from '@/features/notifications/use-unread-notifications';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

export default function ConsumerProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { user, logout, sessionToken } = useAuth();
  const unreadCount = useUnreadNotificationCount();
  const updateLocation = useMutation(api.users.updateConsumerLocation);

  const [city, setCity] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSaveLocation = async () => {
    setSavingLocation(true);
    try {
      const coords = await getDeviceCoordinates();
      await updateLocation({
        sessionToken: sessionToken ?? undefined,
        city,
        latitude: coords.latitude,
        longitude: coords.longitude,
        notificationRadiusMeters: 5_000,
      });
      toast.success('Lokasi notifikasi diperbarui.');
    } catch {
      toast.error('Izin lokasi tidak diberikan atau lokasi gagal disimpan.');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  return (
    <ScreenScrollView>
      <PageHeader
        title="Profil"
        description="Atur preferensi untuk membuat pengalaman menjelajah lebih relevan."
      />

      <View style={styles.accountBanner}>
        <View style={styles.avatar}>
          <UserRound size={24} color={colors.white} />
        </View>
        {user ? (
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.userName}>
              {user.name}
            </Text>
            <Text numberOfLines={1} style={styles.userEmail}>
              {user.email}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>Belum masuk</Text>
            <Text style={styles.userEmail}>
              Masuk untuk memulihkan sesi dan melihat akunmu.
            </Text>
          </View>
        )}
      </View>

      {!user ? (
        <View style={styles.guestActions}>
          <AppButton
            title="Masuk"
            onPress={() => navigation.navigate('Login')}
            style={{ flex: 1 }}
          />
          <AppButton
            variant="outline"
            title="Buat akun"
            onPress={() => navigation.navigate('Register')}
            style={{ flex: 1 }}
          />
        </View>
      ) : (
        <AppCard style={{ marginTop: 16, gap: 10 }}>
          <Text style={styles.cardTitle}>Lokasi notifikasi</Text>
          <Text style={styles.cardSub}>
            Dipakai hanya untuk notifikasi Rescue Item baru dalam radius 5 km.
          </Text>
          <AppInput
            value={city}
            onChangeText={setCity}
            placeholder="Kota (mis. Semarang)"
          />
          <AppButton
            loading={savingLocation}
            title={
              savingLocation ? 'Menyimpan lokasi...' : 'Gunakan lokasi saya'
            }
            leftIcon={
              !savingLocation ? <MapPin size={16} color={colors.white} /> : undefined
            }
            onPress={() => void handleSaveLocation()}
          />
        </AppCard>
      )}

      <AppCard style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        {user ? (
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            style={[styles.menuRow, styles.menuDivider]}
          >
            <Bell size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Notifikasi</Text>
              <Text style={styles.menuSub}>Pickup & Rescue Item baru</Text>
            </View>
            <UnreadBadge count={unreadCount} />
            <ChevronRight size={18} color={colors.mutedForeground} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => navigation.navigate('About')}
          style={styles.menuRow}
        >
          <Info size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuTitle}>Tentang Cirquo</Text>
            <Text style={styles.menuSub}>
              Cara kerja circular food recovery & Material Flow Ledger
            </Text>
          </View>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </Pressable>
      </AppCard>

      {user ? (
        <AppButton
          variant="ghost"
          loading={isLoggingOut}
          title={isLoggingOut ? 'Keluar...' : 'Keluar dari akun'}
          leftIcon={
            !isLoggingOut ? (
              <LogOut size={16} color={colors.destructive} />
            ) : undefined
          }
          onPress={() => void handleLogout()}
          style={{ marginTop: 18 }}
        />
      ) : null}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  accountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.secondary,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  userEmail: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  guestActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  cardSub: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  menuRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  menuSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
