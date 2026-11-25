import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowRight,
  Recycle,
  ShoppingBag,
  Store,
} from 'lucide-react-native';
import { AppLogo } from '@/components/common/app-logo';
import { ScreenScrollView } from '@/components/ui/primitives';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius, shadowCard } from '@/theme/tokens';

const ROLES = [
  {
    role: 'consumer' as const,
    title: 'Consumer',
    description: 'Temukan makanan surplus dan ambil langsung di merchant.',
    icon: ShoppingBag,
  },
  {
    role: 'merchant' as const,
    title: 'Merchant',
    description: 'Catat surplus, terima reservasi, dan pulihkan nilainya.',
    icon: Store,
  },
  {
    role: 'processor' as const,
    title: 'Organic Processor',
    description: 'Terima Circular Routing dan catat outcome pengolahan.',
    icon: Recycle,
  },
];

export default function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <AppLogo size={30} />
      <Text style={styles.kicker}>Mulai di Cirquo</Text>
      <Text style={styles.title}>Kamu akan menggunakan Cirquo sebagai apa?</Text>
      <Text style={styles.subtitle}>
        Pilih satu peran utama. Merchant juga tetap dapat menjelajah sebagai
        consumer.
      </Text>

      <View style={styles.list}>
        {ROLES.map(({ role, title, description, icon: Icon }) => (
          <Pressable
            key={role}
            onPress={() => navigation.navigate('RegisterForm', { role })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.roleCard, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.iconBox}>
              <Icon size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roleTitle}>{title}</Text>
              <Text style={styles.roleDesc}>{description}</Text>
            </View>
            <ArrowRight size={20} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Sudah punya akun? </Text>
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerLink}>Masuk</Text>
        </Pressable>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
  },
  kicker: {
    marginTop: 24,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  title: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  list: {
    marginTop: 24,
    gap: 12,
  },
  roleCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    ...shadowCard,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  roleDesc: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  footerRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
