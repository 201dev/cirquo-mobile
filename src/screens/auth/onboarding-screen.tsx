import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from 'convex/react';
import { MapPin, ShieldCheck } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import { BackendRequiredNotice } from '@/components/common/common-chrome';
import {
  AppButton,
  AppInput,
  AppLabel,
  CheckboxOption,
  FieldError,
  ScreenScrollView,
  SelectField,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { getDeviceCoordinates } from '@/features/discovery/use-current-location';
import { isConvexConfigured } from '@/lib/convex';
import { getAppError } from '@/lib/errors';
import {
  merchantOnboardingSchema,
  processorOnboardingSchema,
  timeToMinutes,
  type MerchantOnboardingValues,
  type ProcessorOnboardingValues,
} from '@/lib/validations';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

const BUSINESS_TYPE_OPTIONS = [
  { value: 'bakery', label: 'Toko roti' },
  { value: 'restaurant', label: 'Restoran' },
  { value: 'cafe', label: 'Kafe' },
  { value: 'grocery', label: 'Toko bahan pangan' },
  { value: 'catering', label: 'Katering' },
  { value: 'warung', label: 'Warung' },
  { value: 'other', label: 'Lainnya' },
] as const;

const FACILITY_TYPE_OPTIONS = [
  { value: 'bsf_farm', label: 'Peternakan BSF' },
  { value: 'composting', label: 'Pengomposan' },
  { value: 'biogas', label: 'Biogas' },
  { value: 'animal_feed', label: 'Pakan ternak' },
] as const;

const MATERIAL_TYPE_OPTIONS = [
  { value: 'prepared_food', label: 'Makanan siap santap' },
  { value: 'bakery', label: 'Roti dan pastry' },
  { value: 'produce', label: 'Buah dan sayur' },
  { value: 'dairy', label: 'Produk susu' },
  { value: 'protein', label: 'Protein' },
  { value: 'dry_goods', label: 'Bahan kering' },
  { value: 'mixed', label: 'Campuran' },
] as const;

const OUTPUT_TYPE_OPTIONS = [
  { value: 'compost', label: 'Kompos' },
  { value: 'bsf_larvae', label: 'Larva BSF' },
  { value: 'animal_feed', label: 'Pakan ternak' },
  { value: 'biogas', label: 'Biogas' },
] as const;

function LocationPickerBox({
  onPosition,
}: {
  onPosition: (lat: number, lng: number) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = async () => {
    setLocating(true);
    setError(null);
    try {
      const coords = await getDeviceCoordinates();
      onPosition(coords.latitude, coords.longitude);
    } catch {
      setError(
        'Lokasi tidak dapat diakses. Izinkan akses lokasi perangkat lalu coba lagi.',
      );
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.locationBox}>
      <View style={styles.locationHeader}>
        <MapPin size={20} color={colors.primary} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationTitle}>Koordinat lokasi</Text>
          <Text style={styles.locationDesc}>
            Gunakan GPS perangkat untuk mengisi koordinat otomatis. Dipakai
            untuk jarak pickup dan Circular Routing.
          </Text>
        </View>
      </View>
      <AppButton
        variant="outline"
        loading={locating}
        title={locating ? 'Mengambil posisi...' : 'Gunakan posisi sekarang'}
        leftIcon={
          !locating ? <MapPin size={16} color={colors.foreground} /> : undefined
        }
        onPress={detect}
        style={{ marginTop: 12 }}
      />
      <FieldError message={error} />
    </View>
  );
}

function MerchantOnboardingForm() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sessionToken } = useAuth();
  const createProfile = useMutation(api.merchants.createProfile);
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MerchantOnboardingValues>({
    resolver: zodResolver(merchantOnboardingSchema),
    defaultValues: {
      name: '',
      city: 'Semarang',
      address: '',
      phone: '',
    },
  });

  const onSubmit = async (data: MerchantOnboardingValues) => {
    if (!sessionToken) {
      setError('root.server', {
        type: 'server',
        message: 'Sesi tidak tersedia. Silakan masuk kembali.',
      });
      return;
    }

    try {
      await createProfile({
        sessionToken,
        ...data,
        phone: data.phone || undefined,
      });
      navigation.replace('PendingVerification', { profileSubmitted: true });
    } catch (error: unknown) {
      const appError = getAppError(
        error,
        'Profil gagal disimpan. Periksa koneksi lalu coba kembali.',
      );
      setError('root.server', { type: 'server', message: appError.message });
    }
  };

  return (
    <ScreenScrollView>
      <View style={styles.iconBadge}>
        <ShieldCheck size={22} color={colors.primary} />
      </View>
      <Text style={styles.title}>Lengkapi profil usaha</Text>
      <Text style={styles.subtitle}>
        Data ini menjadi dasar verifikasi dan Circular Routing. Pastikan lokasi
        sesuai kondisi sebenarnya.
      </Text>

      <View style={styles.form}>
        <View>
          <AppLabel required>Nama usaha</AppLabel>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <AppInput
                value={field.value}
                onChangeText={field.onChange}
                maxLength={120}
                hasError={Boolean(errors.name)}
              />
            )}
          />
          <FieldError message={errors.name?.message} />
        </View>

        <View>
          <Controller
            control={control}
            name="businessType"
            render={({ field }) => (
              <SelectField
                label="Jenis usaha"
                value={field.value ?? ''}
                options={BUSINESS_TYPE_OPTIONS}
                placeholder="Pilih jenis usaha"
                onChange={field.onChange}
                hasError={Boolean(errors.businessType)}
              />
            )}
          />
          <FieldError message={errors.businessType?.message} />
        </View>

        <View>
          <AppLabel required>Alamat lengkap</AppLabel>
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <AppInput
                multiline
                value={field.value}
                onChangeText={field.onChange}
                maxLength={250}
                hasError={Boolean(errors.address)}
              />
            )}
          />
          <FieldError message={errors.address?.message} />
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <AppLabel required>Kota</AppLabel>
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <AppInput
                  value={field.value}
                  onChangeText={field.onChange}
                  maxLength={100}
                  hasError={Boolean(errors.city)}
                />
              )}
            />
            <FieldError message={errors.city?.message} />
          </View>
          <View style={{ flex: 1 }}>
            <AppLabel>Telepon (opsional)</AppLabel>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <AppInput
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="phone-pad"
                  maxLength={30}
                  hasError={Boolean(errors.phone)}
                />
              )}
            />
            <FieldError message={errors.phone?.message} />
          </View>
        </View>

        <LocationPickerBox
          onPosition={(lat, lng) => {
            setLatText(String(lat));
            setLngText(String(lng));
            setValue('latitude', lat, { shouldDirty: true, shouldValidate: true });
            setValue('longitude', lng, { shouldDirty: true, shouldValidate: true });
          }}
        />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <AppLabel required>Latitude</AppLabel>
            <AppInput
              value={latText}
              onChangeText={(text) => {
                setLatText(text);
                setValue('latitude', Number(text), { shouldValidate: true });
              }}
              keyboardType="numbers-and-punctuation"
              placeholder="-6.9667"
              hasError={Boolean(errors.latitude)}
            />
            <FieldError message={errors.latitude?.message} />
          </View>
          <View style={{ flex: 1 }}>
            <AppLabel required>Longitude</AppLabel>
            <AppInput
              value={lngText}
              onChangeText={(text) => {
                setLngText(text);
                setValue('longitude', Number(text), { shouldValidate: true });
              }}
              keyboardType="numbers-and-punctuation"
              placeholder="110.4167"
              hasError={Boolean(errors.longitude)}
            />
            <FieldError message={errors.longitude?.message} />
          </View>
        </View>

        <FieldError message={errors.root?.server?.message} />

        <AppButton
          size="lg"
          loading={isSubmitting}
          title={isSubmitting ? 'Menyimpan...' : 'Kirim untuk verifikasi'}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </ScreenScrollView>
  );
}

function ProcessorOnboardingForm() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sessionToken } = useAuth();
  const createProfile = useMutation(api.processors.createProfile);
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [capacityText, setCapacityText] = useState('100000');
  const [radiusText, setRadiusText] = useState('15000');

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProcessorOnboardingValues>({
    resolver: zodResolver(processorOnboardingSchema),
    defaultValues: {
      name: '',
      city: 'Semarang',
      acceptedMaterialTypes: [],
      dailyCapacityGrams: 100_000,
      maxPickupRadiusMeters: 15_000,
      outputTypes: [],
      operatingHoursStart: '08:00',
      operatingHoursEnd: '17:00',
    },
  });

  const onSubmit = async (data: ProcessorOnboardingValues) => {
    if (!sessionToken) {
      setError('root.server', {
        type: 'server',
        message: 'Sesi tidak tersedia. Silakan masuk kembali.',
      });
      return;
    }

    try {
      await createProfile({
        sessionToken,
        name: data.name,
        facilityType: data.facilityType,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        acceptedMaterialTypes: data.acceptedMaterialTypes,
        dailyCapacityGrams: data.dailyCapacityGrams,
        maxPickupRadiusMeters: data.maxPickupRadiusMeters,
        outputTypes: data.outputTypes,
        operatingHoursStart: timeToMinutes(data.operatingHoursStart),
        operatingHoursEnd: timeToMinutes(data.operatingHoursEnd),
      });
      navigation.replace('PendingVerification', { profileSubmitted: true });
    } catch (error: unknown) {
      const appError = getAppError(
        error,
        'Profil gagal disimpan. Periksa koneksi lalu coba kembali.',
      );
      setError('root.server', { type: 'server', message: appError.message });
    }
  };

  return (
    <ScreenScrollView>
      <View style={styles.iconBadge}>
        <ShieldCheck size={22} color={colors.primary} />
      </View>
      <Text style={styles.title}>Lengkapi profil fasilitas</Text>
      <Text style={styles.subtitle}>
        Data ini menjadi dasar verifikasi dan Circular Routing. Pastikan
        kapasitas serta jenis material sesuai kondisi sebenarnya.
      </Text>

      <View style={styles.form}>
        <View>
          <AppLabel required>Nama fasilitas</AppLabel>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <AppInput
                value={field.value}
                onChangeText={field.onChange}
                maxLength={120}
                hasError={Boolean(errors.name)}
              />
            )}
          />
          <FieldError message={errors.name?.message} />
        </View>

        <View>
          <Controller
            control={control}
            name="facilityType"
            render={({ field }) => (
              <SelectField
                label="Jenis fasilitas"
                value={field.value ?? ''}
                options={FACILITY_TYPE_OPTIONS}
                placeholder="Pilih jenis fasilitas"
                onChange={field.onChange}
                hasError={Boolean(errors.facilityType)}
              />
            )}
          />
          <FieldError message={errors.facilityType?.message} />
        </View>

        <View>
          <AppLabel required>Kota</AppLabel>
          <Controller
            control={control}
            name="city"
            render={({ field }) => (
              <AppInput
                value={field.value}
                onChangeText={field.onChange}
                maxLength={100}
                hasError={Boolean(errors.city)}
              />
            )}
          />
          <FieldError message={errors.city?.message} />
        </View>

        <LocationPickerBox
          onPosition={(lat, lng) => {
            setLatText(String(lat));
            setLngText(String(lng));
            setValue('latitude', lat, { shouldDirty: true, shouldValidate: true });
            setValue('longitude', lng, { shouldDirty: true, shouldValidate: true });
          }}
        />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <AppLabel required>Latitude</AppLabel>
            <AppInput
              value={latText}
              onChangeText={(text) => {
                setLatText(text);
                setValue('latitude', Number(text), { shouldValidate: true });
              }}
              keyboardType="numbers-and-punctuation"
              placeholder="-6.9667"
              hasError={Boolean(errors.latitude)}
            />
            <FieldError message={errors.latitude?.message} />
          </View>
          <View style={{ flex: 1 }}>
            <AppLabel required>Longitude</AppLabel>
            <AppInput
              value={lngText}
              onChangeText={(text) => {
                setLngText(text);
                setValue('longitude', Number(text), { shouldValidate: true });
              }}
              keyboardType="numbers-and-punctuation"
              placeholder="110.4167"
              hasError={Boolean(errors.longitude)}
            />
            <FieldError message={errors.longitude?.message} />
          </View>
        </View>

        <View>
          <AppLabel required>Material yang diterima</AppLabel>
          <Controller
            control={control}
            name="acceptedMaterialTypes"
            render={({ field }) => (
              <View style={styles.checkGrid}>
                {MATERIAL_TYPE_OPTIONS.map((opt) => {
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
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <AppLabel required>Kapasitas harian (gram)</AppLabel>
            <AppInput
              value={capacityText}
              onChangeText={(text) => {
                setCapacityText(text);
                setValue('dailyCapacityGrams', Number(text), {
                  shouldValidate: true,
                });
              }}
              keyboardType="numeric"
              hasError={Boolean(errors.dailyCapacityGrams)}
            />
            <FieldError message={errors.dailyCapacityGrams?.message} />
          </View>
          <View style={{ flex: 1 }}>
            <AppLabel required>Radius pickup (meter)</AppLabel>
            <AppInput
              value={radiusText}
              onChangeText={(text) => {
                setRadiusText(text);
                setValue('maxPickupRadiusMeters', Number(text), {
                  shouldValidate: true,
                });
              }}
              keyboardType="numeric"
              hasError={Boolean(errors.maxPickupRadiusMeters)}
            />
            <FieldError message={errors.maxPickupRadiusMeters?.message} />
          </View>
        </View>

        <View>
          <AppLabel required>Hasil pengolahan</AppLabel>
          <Controller
            control={control}
            name="outputTypes"
            render={({ field }) => (
              <View style={styles.checkGrid}>
                {OUTPUT_TYPE_OPTIONS.map((opt) => {
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
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <AppLabel required>Mulai operasional (WIB)</AppLabel>
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
            <AppLabel required>Selesai operasional (WIB)</AppLabel>
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

        <FieldError message={errors.root?.server?.message} />

        <AppButton
          size="lg"
          loading={isSubmitting}
          title={isSubmitting ? 'Menyimpan...' : 'Kirim untuk verifikasi'}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </ScreenScrollView>
  );
}

export default function OnboardingScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Onboarding'>>();
  const { user } = useAuth();
  if (!isConvexConfigured) {
    return (
      <ScreenScrollView>
        <BackendRequiredNotice />
      </ScreenScrollView>
    );
  }
  const role = route.params?.role ?? (user?.role === 'processor' ? 'processor' : 'merchant');
  return role === 'merchant' ? <MerchantOnboardingForm /> : <ProcessorOnboardingForm />;
}

const styles = StyleSheet.create({
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    fontSize: 26,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  form: {
    marginTop: 22,
    gap: 16,
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  locationBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
    padding: 14,
  },
  locationHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  locationDesc: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  checkGrid: {
    gap: 8,
  },
});
