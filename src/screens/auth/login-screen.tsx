import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAction } from 'convex/react';
import { Eye, EyeOff, LogIn } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import { AppLogo } from '@/components/common/app-logo';
import { BackendRequiredNotice } from '@/components/common/common-chrome';
import {
  AppButton,
  AppInput,
  AppLabel,
  FieldError,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { isConvexConfigured } from '@/lib/convex';
import { getAppError } from '@/lib/errors';
import { loginSchema } from '@/lib/validations';
import type { RootStackParamList } from '@/navigation/types';
import { colors } from '@/theme/tokens';

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const login = useAction(api.auth.login);
  const { setSession } = useAuth();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const result = await login(data);
      await setSession(result.sessionToken);
      // RootNavigator automatically switches stack based on authenticated user & role.
    } catch (error: unknown) {
      const appError = getAppError(
        error,
        'Gagal masuk. Periksa koneksi lalu coba kembali.',
      );
      setError('root.server', {
        type: 'server',
        message:
          appError.code === 'INVALID_CREDENTIALS'
            ? 'Email atau kata sandi tidak sesuai.'
            : appError.message,
      });
    }
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.container}>
      <AppLogo size={30} />

      <Text style={styles.kicker}>Selamat datang kembali</Text>
      <Text style={styles.title}>Masuk ke Cirquo</Text>
      <Text style={styles.subtitle}>
        Gunakan akunmu untuk melanjutkan pickup atau pekerjaan operasional.
      </Text>

      <View style={styles.form}>
        <View>
          <AppLabel>Email</AppLabel>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <AppInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="nama@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                hasError={Boolean(errors.email)}
              />
            )}
          />
          <FieldError message={errors.email?.message} />
        </View>

        <View>
          <View style={styles.passwordLabelRow}>
            <AppLabel>Kata sandi</AppLabel>
            <Pressable
              hitSlop={10}
              onPress={() =>
                setError('root.server', {
                  type: 'manual',
                  message:
                    'Pemulihan kata sandi belum tersedia. Hubungi tim Cirquo jika kamu tidak dapat masuk.',
                })
              }
            >
              <Text style={styles.forgotLink}>Lupa kata sandi?</Text>
            </Pressable>
          </View>
          <View style={styles.passwordWrap}>
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <AppInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  hasError={Boolean(errors.password)}
                  style={{ flex: 1, paddingRight: 46 }}
                />
              )}
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={
                showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
              }
              style={styles.eyeBtn}
            >
              {showPassword ? (
                <EyeOff size={18} color={colors.mutedForeground} />
              ) : (
                <Eye size={18} color={colors.mutedForeground} />
              )}
            </Pressable>
          </View>
          <FieldError message={errors.password?.message} />
        </View>

        <FieldError message={errors.root?.server?.message} />

        <AppButton
          size="lg"
          loading={isSubmitting}
          title={isSubmitting ? 'Masuk...' : 'Masuk'}
          leftIcon={
            !isSubmitting ? <LogIn size={18} color={colors.white} /> : undefined
          }
          onPress={handleSubmit(onSubmit)}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Belum punya akun? </Text>
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.footerLink}>Pilih peran dan daftar</Text>
        </Pressable>
      </View>
    </ScreenScrollView>
  );
}

export default function LoginScreen() {
  if (!isConvexConfigured) {
    return (
      <ScreenScrollView>
        <BackendRequiredNotice />
      </ScreenScrollView>
    );
  }
  return <LoginForm />;
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
    fontSize: 28,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  form: {
    marginTop: 26,
    gap: 16,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
  },
  passwordWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
