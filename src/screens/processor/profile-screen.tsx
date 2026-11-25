import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from 'convex/react';
import { LogOut, Save, Settings2 } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import {
  PageHeader,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import { StatusBadge } from '@/components/common/status-badge';
import {
  AppButton,
  AppCard,
  AppInput,
  AppLabel,
  AppSkeleton,
  CheckboxOption,
  FieldError,
  ScreenScrollView,
  SelectField,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getAppError } from '@/lib/errors';
import {
  processorRoutingProfileSchema,
  timeToMinutes,
  type ProcessorRoutingProfileValues,
} from '@/lib/validations';
import { colors, radius } from '@/theme/tokens';

const FACILITY_OPTIONS = [
  { value: 'bsf_farm', label: 'Budidaya BSF' },
  { value: 'composting', label: 'Pengomposan' },
  { value: 'biogas', label: 'Biogas' },
  { value: 'animal_feed', label: 'Pakan ternak' },
] as const;

const MATERIAL_OPTIONS = [
  { value: 'prepared_food', label: 'Makanan siap saji' },
  { value: 'bakery', label: 'Roti & bakery' },
  { value: 'produce', label: 'Buah & sayur' },
  { value: 'dairy', label: 'Produk susu' },
  { value: 'protein', label: 'Protein' },
  { value: 'dry_goods', label: 'Bahan kering' },
  { value: 'mixed', label: 'Campuran' },
] as const;

const OUTPUT_OPTIONS = [
  { value: 'compost', label: 'Kompos' },
  { value: 'bsf_larvae', label: 'Larva BSF' },
  { value: 'animal_feed', label: 'Pakan ternak' },
  { value: 'biogas', label: 'Biogas' },
] as const;

function minutesToTime(minutes?: number) {
  const value = minutes ?? 0;
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function ProcessorProfileBody() {
  const toast = useToast();
  const { sessionToken, logout } = useAuth();
  const profile = useQuery(
    api.processors.getMine,
    sessionToken ? { sessionToken } : 'skip',
  );
  const updateProfile = useMutation(api.processors.updateProfile);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProcessorRoutingProfileValues>({
    resolver: zodResolver(processorRoutingProfileSchema),
    defaultValues: {
      facilityType: 'composting',
      acceptedMaterialTypes: [],
      dailyCapacityGrams: 0,
      maxPickupRadiusMeters: 15_000,
      outputTypes: [],
      operatingHoursStart: '08:00',
      operatingHoursEnd: '17:00',
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      facilityType: profile.facilityType ?? 'composting',
      acceptedMaterialTypes: profile.acceptedMaterialTypes ?? [],
      dailyCapacityGrams: profile.dailyCapacityGrams ?? 0,
      maxPickupRadiusMeters: profile.maxPickupRadiusMeters ?? 15_000,
      outputTypes: profile.outputTypes ?? [],
      operatingHoursStart: minutesToTime(profile.operatingHoursStart),
      operatingHoursEnd: minutesToTime(profile.operatingHoursEnd ?? 1_020),
    });
  }, [profile, reset]);

  if (profile === undefined) {
    return <AppSkeleton height={320} borderRadius={radius.lg} />;
  }

  if (!profile) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Profil fasilitas belum tersedia</Text>
        <Text style={styles.emptySub}>
          Lengkapi onboarding sebelum mengatur kapasitas Circular Routing.
        </Text>
      </View>
    );
  }

  const submit = async (data: ProcessorRoutingProfileValues) => {
    if (!sessionToken) return;
    try {
      await updateProfile({
        sessionToken,
        facilityType: data.facilityType,
        acceptedMaterialTypes: data.acceptedMaterialTypes,
        dailyCapacityGrams: data.dailyCapacityGrams,
        maxPickupRadiusMeters: data.maxPickupRadiusMeters,
        outputTypes: data.outputTypes,
        operatingHoursStart: timeToMinutes(data.operatingHoursStart),
        operatingHoursEnd: timeToMinutes(data.operatingHoursEnd),
      });
      reset(data);
      toast.success(
        'Profil kapasitas diperbarui. Routing berikutnya memakai pengaturan baru.',
      );
    } catch (error) {
      const appError = getAppError(error, 'Profil gagal diperbarui. Coba lagi.');
      setError('root.server', { type: 'server', message: appError.message });
      toast.error(appError.message);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <PageHeader
        title="Profil kapasitas"
        description="Berlaku untuk offer Circular Routing berikutnya; batch yang sudah diterima tidak berubah."
        action={<StatusBadge status={profile.verificationStatus} />}
      />

      <AppCard style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Settings2 size={18} color={colors.primary} />
          <Text style={styles.cardTitle}>{profile.name}</Text>
        </View>
        <Controller
          control={control}
          name="facilityType"
          render={({ field }) => (
            <SelectField
              label="Jenis fasilitas"
              value={field.value}
              options={FACILITY_OPTIONS}
              onChange={field.onChange}
              hasError={Boolean(errors.facilityType)}
            />
          )}
        />
        <FieldError message={errors.facilityType?.message} />
      </AppCard>

      <AppCard style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>Material yang diterima</Text>
        <Controller
          control={control}
          name="acceptedMaterialTypes"
          render={({ field }) => (
            <View style={{ gap: 8 }}>
              {MATERIAL_OPTIONS.map((opt) => {
                const checked = field.value.includes(opt.value);
                return (
                  <CheckboxOption
                    key={opt.value}
                    label={opt.label}
                    checked={checked}
                    onToggle={() =>
                      field.onChange(
                        checked
                          ? field.value.filter((v) => v !== opt.value)
                          : [...field.value, opt.value],
                      )
                    }
                  />
                );
              })}
            </View>
          )}
        />
        <FieldError message={errors.acceptedMaterialTypes?.message} />
      </AppCard>

      <AppCard style={{ gap: 12 }}>
        <Text style={styles.cardTitle}>Kapasitas dan jangkauan</Text>
        <Text style={styles.muted}>
          Atur kapasitas 0 gram untuk menjeda intake tanpa membatalkan batch
          yang sudah diterima.
        </Text>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <AppLabel>Kapasitas harian (g)</AppLabel>
            <Controller
              control={control}
              name="dailyCapacityGrams"
              render={({ field }) => (
                <AppInput
                  value={String(field.value ?? '')}
                  onChangeText={(t) =>
                    field.onChange(Number(t.replace(/\D/g, '')) || 0)
                  }
                  keyboardType="numeric"
                  hasError={Boolean(errors.dailyCapacityGrams)}
                />
              )}
            />
            <FieldError message={errors.dailyCapacityGrams?.message} />
          </View>
          <View style={{ flex: 1 }}>
            <AppLabel>Radius pickup (m)</AppLabel>
            <Controller
              control={control}
              name="maxPickupRadiusMeters"
              render={({ field }) => (
                <AppInput
                  value={String(field.value ?? '')}
                  onChangeText={(t) =>
                    field.onChange(Number(t.replace(/\D/g, '')) || 0)
                  }
                  keyboardType="numeric"
                  hasError={Boolean(errors.maxPickupRadiusMeters)}
                />
              )}
            />
            <FieldError message={errors.maxPickupRadiusMeters?.message} />
          </View>
        </View>
      </AppCard>

      <AppCard style={{ gap: 10 }}>
        <Text style={styles.cardTitle}>Hasil pengolahan</Text>
        <Controller
          control={control}
          name="outputTypes"
          render={({ field }) => (
            <View style={{ gap: 8 }}>
              {OUTPUT_OPTIONS.map((opt) => {
                const checked = field.value.includes(opt.value);
                return (
                  <CheckboxOption
                    key={opt.value}
                    label={opt.label}
                    checked={checked}
                    onToggle={() =>
                      field.onChange(
                        checked
                          ? field.value.filter((v) => v !== opt.value)
                          : [...field.value, opt.value],
                      )
                    }
                  />
                );
              })}
            </View>
          )}
        />
        <FieldError message={errors.outputTypes?.message} />
      </AppCard>

      <AppCard style={{ gap: 12 }}>
        <Text style={styles.cardTitle}>Jam operasional harian (WIB)</Text>
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <AppLabel>Mulai</AppLabel>
            <Controller
              control={control}
              name="operatingHoursStart"
              render={({ field }) => (
                <AppInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="08:00"
                  hasError={Boolean(errors.operatingHoursStart)}
                />
              )}
            />
            <FieldError message={errors.operatingHoursStart?.message} />
          </View>
          <View style={{ flex: 1 }}>
            <AppLabel>Selesai</AppLabel>
            <Controller
              control={control}
              name="operatingHoursEnd"
              render={({ field }) => (
                <AppInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="17:00"
                  hasError={Boolean(errors.operatingHoursEnd)}
                />
              )}
            />
            <FieldError message={errors.operatingHoursEnd?.message} />
          </View>
        </View>
      </AppCard>

      <FieldError message={errors.root?.server?.message} />

      <AppButton
        size="lg"
        loading={isSubmitting}
        title={isSubmitting ? 'Menyimpan...' : 'Simpan pengaturan'}
        leftIcon={
          !isSubmitting ? <Save size={17} color={colors.white} /> : undefined
        }
        onPress={handleSubmit(submit)}
      />

      <AppButton
        variant="ghost"
        title="Keluar dari akun"
        leftIcon={<LogOut size={16} color={colors.destructive} />}
        onPress={() => void logout()}
      />
    </View>
  );
}

export default function ProcessorProfileScreen() {
  return (
    <ScreenScrollView>
      <QueryErrorBoundary title="Profil fasilitas tidak dapat dimuat">
        <ProcessorProfileBody />
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  muted: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
});
