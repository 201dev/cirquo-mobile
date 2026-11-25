import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAction } from 'convex/react';
import { Check, Circle, Eye, EyeOff } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
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
import { registerSchema } from '@/lib/validations';
import type { RootStackParamList } from '@/navigation/types';
import { colors } from '@/theme/tokens';

type RegisterFormValues = z.infer<typeof registerSchema>;

const COPY = {
  consumer: { title: 'Daftar sebagai Consumer', name: 'Nama lengkap' },
  merchant: { title: 'Daftar sebagai Merchant', name: 'Nama penanggung jawab' },
  processor: {
    title: 'Daftar sebagai Organic Processor',
    name: 'Nama penanggung jawab',
  },
};

function RegisterFormBody({
  role,
}: {
  role: 'consumer' | 'merchant' | 'processor';
}) {
  const [showPassword, setShowPassword] = useState(false);
  const page = COPY[role];
  const registerAccount = useAction(api.auth.register);
  const { setSession } = useAuth();

  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const password = watch('password');
  const passwordRequirements = [
    { label: '10–128 karakter', met: password.length >= 10 && password.length <= 128 },
    { label: 'Mengandung huruf', met: /[A-Za-z]/.test(password) },
    { label: 'Mengandung angka', met: /[0-9]/.test(password) },
  ];

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const result = await registerAccount({ ...data, role });
      await setSession(result.sessionToken);
    } catch (error: unknown) {
      const appError = getAppError(
        error,
        'Pendaftaran gagal. Periksa koneksi lalu coba kembali.',
      );
      if (
        appError.field === 'name' ||
        appError.field === 'email' ||
        appError.field === 'password'
      ) {
        setError(appError.field, { type: 'server', message: appError.message });
      } else {
        setError('root.server', { type: 'server', message: appError.message });
      }
    }
  };

  return (
    <ScreenScrollView>
      <Text style={styles.title}>{page.title}</Text>
      <Text style={styles.subtitle}>Isi data dasar untuk membuat akunmu.</Text>

      <View style={styles.form}>
        <View>
          <AppLabel>{page.name}</AppLabel>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <AppInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={80}
                hasError={Boolean(errors.name)}
              />
            )}
          />
          <FieldError message={errors.name?.message} />
        </View>

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
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="nama@email.com"
                hasError={Boolean(errors.email)}
              />
            )}
          />
          <FieldError message={errors.email?.message} />
        </View>

        <View>
          <AppLabel>Kata sandi</AppLabel>
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
                  maxLength={128}
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

          <View style={styles.reqList}>
            {passwordRequirements.map((req) => (
              <View key={req.label} style={styles.reqRow}>
                {req.met ? (
                  <Check size={14} color={colors.primary} />
                ) : (
                  <Circle size={14} color={colors.ink500} />
                )}
                <Text
                  style={[
                    styles.reqText,
                    req.met && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {req.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <FieldError message={errors.root?.server?.message} />

        <AppButton
          size="lg"
          loading={isSubmitting}
          title={isSubmitting ? 'Mendaftar...' : 'Lanjutkan'}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </ScreenScrollView>
  );
}

export default function RegisterFormScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'RegisterForm'>>();
  if (!isConvexConfigured) {
    return (
      <ScreenScrollView>
        <BackendRequiredNotice />
      </ScreenScrollView>
    );
  }
  return <RegisterFormBody role={route.params.role} />;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  form: {
    marginTop: 24,
    gap: 16,
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
  reqList: {
    marginTop: 8,
    gap: 4,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reqText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
