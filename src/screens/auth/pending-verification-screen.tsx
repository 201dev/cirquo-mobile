import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldX,
} from 'lucide-react-native';
import {
  AppButton,
  AppCard,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    title: 'Menunggu verifikasi',
    description:
      'Profil Anda sudah dikirim dan sedang menunggu peninjauan dari tim admin.',
    color: '#b45309',
    bgColor: colors.warning,
  },
  rejected: {
    icon: ShieldX,
    title: 'Verifikasi ditolak',
    description:
      'Perbarui profil sesuai alasan Admin, lalu ajukan kembali untuk ditinjau.',
    color: colors.destructive,
    bgColor: colors.destructiveSoft,
  },
  suspended: {
    icon: AlertTriangle,
    title: 'Akun ditangguhkan',
    description:
      'Akun Anda saat ini ditangguhkan. Silakan hubungi tim support.',
    color: colors.destructive,
    bgColor: colors.destructiveSoft,
  },
} as const;

export default function PendingVerificationScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const profile = user?.profile;
  const verificationStatus = profile?.verificationStatus ?? 'pending';

  const config =
    STATUS_CONFIG[verificationStatus as keyof typeof STATUS_CONFIG] ??
    STATUS_CONFIG.pending;
  const Icon = config.icon;

  const adminReason =
    (verificationStatus === 'rejected' || verificationStatus === 'suspended') &&
    profile?.rejectionReason
      ? profile.rejectionReason
      : null;

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: config.bgColor }]}>
        <Icon size={28} color={config.color} />
      </View>

      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.description}>{config.description}</Text>

      {adminReason ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonTitle}>Alasan dari Admin</Text>
          <Text style={styles.reasonBody}>{adminReason}</Text>
        </View>
      ) : null}

      {user ? (
        <AppCard style={{ marginTop: 20 }}>
          <Text style={styles.metaLabel}>Masuk sebagai</Text>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.metaSub}>{user.email}</Text>
          <Text style={styles.roleTag}>Peran: {user.role}</Text>
        </AppCard>
      ) : null}

      {verificationStatus === 'pending' ? (
        <View style={styles.nextBox}>
          <ShieldCheck size={20} color={colors.primary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nextTitle}>Apa selanjutnya?</Text>
            <Text style={styles.nextBody}>
              Status di halaman ini akan diperbarui otomatis setelah admin
              menyelesaikan peninjauan.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        {verificationStatus === 'rejected' &&
        (user?.role === 'merchant' || user?.role === 'processor') ? (
          <AppButton
            size="lg"
            title="Perbarui profil dan ajukan kembali"
            onPress={() => {
              const partnerRole =
                user.role === 'merchant' ? 'merchant' : 'processor';
              navigation.navigate('Onboarding', { role: partnerRole });
            }}
          />
        ) : null}

        {user?.role === 'merchant' ? (
          <AppButton
            size="lg"
            variant={verificationStatus === 'rejected' ? 'outline' : 'default'}
            title="Kembali ke ringkasan"
            onPress={() => navigation.navigate('MerchantMain')}
          />
        ) : user?.role === 'processor' ? (
          <AppButton
            size="lg"
            variant={verificationStatus === 'rejected' ? 'outline' : 'default'}
            title="Kembali ke ringkasan"
            onPress={() => navigation.navigate('ProcessorMain')}
          />
        ) : null}

        <AppButton
          size="lg"
          variant="ghost"
          title="Keluar"
          onPress={() => {
            void logout();
          }}
        />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 28,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 18,
    fontSize: 26,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.mutedForeground,
  },
  reasonBox: {
    marginTop: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.destructiveBorder,
    backgroundColor: colors.destructiveSoft,
    padding: 14,
  },
  reasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.destructive,
  },
  reasonBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.foreground,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  userName: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  metaSub: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  roleTag: {
    marginTop: 8,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  nextBox: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
    padding: 14,
  },
  nextTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  nextBody: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  actions: {
    marginTop: 24,
    gap: 10,
  },
});
