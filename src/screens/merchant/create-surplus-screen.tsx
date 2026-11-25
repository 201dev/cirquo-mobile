import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'convex/react';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import { Calculator, ImagePlus } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { PageHeader } from '@/components/common/common-chrome';
import {
  AppButton,
  AppCard,
  AppInput,
  AppLabel,
  CheckboxOption,
  FieldError,
  ScreenScrollView,
  SelectField,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getAppError } from '@/lib/errors';
import { formatIdr } from '@/lib/format';
import { MATERIAL_TYPES, suggestRescuePrice } from '@/lib/pricing';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

const MATERIAL_OPTIONS = [
  { value: 'prepared_food', label: 'Makanan matang' },
  { value: 'bakery', label: 'Roti & pastry' },
  { value: 'produce', label: 'Sayur & buah' },
  { value: 'dairy', label: 'Produk susu' },
  { value: 'protein', label: 'Daging, ikan, atau telur' },
  { value: 'dry_goods', label: 'Bahan pangan kering' },
  { value: 'mixed', label: 'Campuran' },
] as const;

const DIETARY_OPTIONS = [
  { value: 'halal', label: 'Halal' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'dairy-free', label: 'Bebas susu' },
  { value: 'nut-free', label: 'Bebas kacang' },
] as const;

/** Parses YYYY-MM-DD HH:mm (WIB +07:00) into epoch ms UTC. */
function toTimestamp(str: string): number {
  const normalized = str.trim().replace(' ', 'T');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) return Number.NaN;
  return new Date(`${normalized}:00+07:00`).getTime();
}

function getDefaultWibDatetime(offsetHours: number): string {
  const wibMs = Date.now() + 7 * 3_600_000 + offsetHours * 3_600_000;
  const d = new Date(wibMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:00`;
}

const schema = z
  .object({
    name: z
      .string()
      .min(2, 'Nama minimal 2 karakter.')
      .max(120, 'Nama maksimal 120 karakter.'),
    description: z.string().max(500, 'Deskripsi maksimal 500 karakter.'),
    imageUrl: z.string().url('Masukkan URL gambar yang valid.').or(z.literal('')),
    materialType: z.enum(MATERIAL_TYPES),
    dietaryTags: z.array(z.string()),
    processingOnly: z.boolean(),
    quantity: z.number().int().min(1, 'Jumlah minimal 1 unit.'),
    weight: z.number().int().min(1, 'Berat minimal 1 gram.'),
    originalPrice: z.number().int().min(1, 'Harga awal minimal Rp1.'),
    floorPrice: z.number().int().min(1, 'Floor price minimal Rp1.'),
    rescuePrice: z.number().int().min(1, 'Harga rescue minimal Rp1.'),
    pickupStart: z.string().min(1, 'Waktu mulai wajib diisi.'),
    pickupEnd: z.string().min(1, 'Waktu selesai wajib diisi.'),
  })
  .refine((data) => data.rescuePrice < data.originalPrice, {
    path: ['rescuePrice'],
    message: 'Harga rescue harus lebih rendah dari harga awal.',
  })
  .refine((data) => data.floorPrice < data.originalPrice, {
    path: ['floorPrice'],
    message: 'Floor price harus lebih rendah dari harga awal.',
  })
  .refine((data) => data.rescuePrice >= data.floorPrice, {
    path: ['rescuePrice'],
    message: 'Harga rescue tidak boleh di bawah floor price.',
  })
  .refine((data) => !Number.isNaN(toTimestamp(data.pickupStart)), {
    path: ['pickupStart'],
    message: 'Gunakan format YYYY-MM-DD HH:mm (WIB).',
  })
  .refine((data) => !Number.isNaN(toTimestamp(data.pickupEnd)), {
    path: ['pickupEnd'],
    message: 'Gunakan format YYYY-MM-DD HH:mm (WIB).',
  })
  .refine(
    (data) => toTimestamp(data.pickupEnd) > toTimestamp(data.pickupStart),
    {
      path: ['pickupEnd'],
      message: 'Waktu selesai harus setelah waktu mulai.',
    },
  )
  .refine((data) => toTimestamp(data.pickupStart) > Date.now(), {
    path: ['pickupStart'],
    message: 'Waktu mulai harus setelah waktu sekarang.',
  })
  .refine(
    (data) =>
      toTimestamp(data.pickupEnd) - toTimestamp(data.pickupStart) <=
      72 * 60 * 60 * 1_000,
    {
      path: ['pickupEnd'],
      message: 'Waktu pickup maksimal 72 jam.',
    },
  );

type FormValues = z.infer<typeof schema>;
type SubmitAction = 'draft' | 'publish';

export default function CreateSurplusScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { sessionToken } = useAuth();
  const createItem = useMutation(api.surplusItems.create);
  const publishItem = useMutation(api.surplusItems.publish);
  const generateImageUploadUrl = useMutation(
    api.surplusItems.generateImageUploadUrl,
  );

  const [pickedAsset, setPickedAsset] = useState<Asset | null>(null);
  const [submitAction, setSubmitAction] = useState<SubmitAction>('publish');
  const [hasManualPrice, setHasManualPrice] = useState(false);

  const defaultValues = useMemo<FormValues>(() => {
    const pickupStart = getDefaultWibDatetime(1);
    const pickupEnd = getDefaultWibDatetime(4);
    return {
      name: '',
      description: '',
      imageUrl: '',
      processingOnly: false,
      materialType: 'bakery',
      dietaryTags: [],
      quantity: 5,
      weight: 450,
      originalPrice: 40_000,
      floorPrice: 12_000,
      rescuePrice: suggestRescuePrice({
        originalPrice: 40_000,
        floorPrice: 12_000,
        pickupStartAt: toTimestamp(pickupStart),
        pickupEndAt: toTimestamp(pickupEnd),
        now: Date.now(),
        initialQuantity: 5,
        remainingQuantity: 5,
        materialType: 'bakery',
      }).suggestedPrice,
      pickupStart,
      pickupEnd,
    };
  }, []);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const originalPrice = useWatch({ control, name: 'originalPrice' }) || 0;
  const rescuePrice = useWatch({ control, name: 'rescuePrice' }) || 0;
  const floorPrice = useWatch({ control, name: 'floorPrice' }) || 0;
  const materialType = useWatch({ control, name: 'materialType' }) ?? 'mixed';
  const quantity = useWatch({ control, name: 'quantity' }) || 0;
  const pickupStart = useWatch({ control, name: 'pickupStart' }) ?? '';
  const pickupEnd = useWatch({ control, name: 'pickupEnd' }) ?? '';

  const discount =
    originalPrice > 0 ? Math.round((1 - rescuePrice / originalPrice) * 100) : 0;

  const suggestion = useMemo(() => {
    const startTs = toTimestamp(pickupStart);
    const endTs = toTimestamp(pickupEnd);
    return suggestRescuePrice({
      originalPrice,
      floorPrice,
      pickupStartAt: Number.isNaN(startTs) ? Date.now() + 3_600_000 : startTs,
      pickupEndAt: Number.isNaN(endTs) ? Date.now() + 14_400_000 : endTs,
      now: Date.now(),
      initialQuantity: quantity,
      remainingQuantity: quantity,
      materialType,
    });
  }, [floorPrice, materialType, originalPrice, pickupEnd, pickupStart, quantity]);

  useEffect(() => {
    if (!hasManualPrice) {
      setValue('rescuePrice', suggestion.suggestedPrice, {
        shouldValidate: true,
      });
    }
  }, [hasManualPrice, setValue, suggestion.suggestedPrice]);

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.8,
    });
    if (result.assets && result.assets[0]) {
      setPickedAsset(result.assets[0]);
    }
  };

  const submitWithAction = (action: SubmitAction) => {
    setSubmitAction(action);
    void handleSubmit(async (data) => {
      try {
        let imageStorageId: Id<'_storage'> | undefined;
        if (pickedAsset?.uri) {
          const uploadUrl = await generateImageUploadUrl({
            sessionToken: sessionToken || undefined,
          });
          const fileResponse = await fetch(pickedAsset.uri);
          const blob = await fileResponse.blob();
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': pickedAsset.type || 'image/jpeg',
            },
            body: blob,
          });
          if (!uploadResponse.ok) throw new Error('IMAGE_UPLOAD_FAILED');
          const uploaded = (await uploadResponse.json()) as {
            storageId: Id<'_storage'>;
          };
          imageStorageId = uploaded.storageId;
        }

        const itemId = await createItem({
          name: data.name,
          description: data.description || undefined,
          imageUrl: data.imageUrl || undefined,
          imageStorageId,
          originalPrice: data.originalPrice,
          floorPrice: data.floorPrice,
          currentPrice: data.rescuePrice,
          initialQuantity: data.quantity,
          weightPerItemGrams: data.weight,
          pickupStartAt: toTimestamp(data.pickupStart),
          pickupEndAt: toTimestamp(data.pickupEnd),
          materialType: data.materialType,
          dietaryTags: data.dietaryTags,
          processingOnly: data.processingOnly,
          sessionToken: sessionToken || undefined,
        });

        if (action === 'publish') {
          await publishItem({
            id: itemId,
            sessionToken: sessionToken || undefined,
          });
          toast.success('Rescue Item berhasil diterbitkan.');
        } else {
          toast.success('Rescue Item disimpan sebagai draft.');
        }
        navigation.goBack();
      } catch (error: unknown) {
        const appError = getAppError(error, 'Gagal menyimpan Rescue Item.');
        toast.error(appError.message);
      }
    })();
  };

  return (
    <ScreenScrollView>
      <PageHeader
        title="Buat Rescue Item"
        description="Satu form singkat untuk memasukkan surplus hari ini ke alur Cirquo."
      />

      <AppCard style={{ gap: 16 }}>
        <Text style={styles.sectionTitle}>Informasi paket</Text>

        <View>
          <AppLabel required>Nama Rescue Item</AppLabel>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <AppInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Contoh: Roti artisan sore hari"
                hasError={Boolean(errors.name)}
              />
            )}
          />
          <FieldError message={errors.name?.message} />
        </View>

        <View>
          <AppLabel>Deskripsi isi dan kondisi</AppLabel>
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <AppInput
                multiline
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Jelaskan isi paket dan kapan makanan dibuat."
                hasError={Boolean(errors.description)}
              />
            )}
          />
          <FieldError message={errors.description?.message} />
        </View>

        <View>
          <Controller
            control={control}
            name="materialType"
            render={({ field }) => (
              <SelectField
                label="Jenis material"
                value={field.value}
                options={MATERIAL_OPTIONS}
                onChange={field.onChange}
                hasError={Boolean(errors.materialType)}
              />
            )}
          />
          <Text style={styles.helper}>
            Dipakai untuk Dynamic Rescue Pricing dan kecocokan processor.
          </Text>
          <FieldError message={errors.materialType?.message} />
        </View>

        <View>
          <AppLabel>Foto Rescue Item (opsional)</AppLabel>
          {pickedAsset?.uri ? (
            <Image
              source={{ uri: pickedAsset.uri }}
              style={styles.previewImg}
              resizeMode="cover"
            />
          ) : null}
          <AppButton
            variant="outline"
            size="sm"
            title={pickedAsset ? 'Ganti foto dari galeri' : 'Pilih foto dari galeri'}
            leftIcon={<ImagePlus size={16} color={colors.foreground} />}
            onPress={() => void pickImage()}
            style={{ marginBottom: 8 }}
          />
          <Controller
            control={control}
            name="imageUrl"
            render={({ field }) => (
              <AppInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Atau masukkan URL gambar (https://...)"
                autoCapitalize="none"
                keyboardType="url"
                hasError={Boolean(errors.imageUrl)}
              />
            )}
          />
          <FieldError message={errors.imageUrl?.message} />
        </View>

        <View>
          <AppLabel>Preferensi pangan yang dideklarasikan</AppLabel>
          <Controller
            control={control}
            name="dietaryTags"
            render={({ field }) => (
              <View style={{ gap: 8 }}>
                {DIETARY_OPTIONS.map((opt) => {
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
          <Text style={styles.helper}>
            Berdasarkan deklarasi merchant, bukan jaminan keamanan alergi.
          </Text>
        </View>

        <Controller
          control={control}
          name="processingOnly"
          render={({ field }) => (
            <CheckboxOption
              label="Langsung untuk Organic Processor"
              description="Item tidak muncul di marketplace dan langsung masuk Circular Routing."
              checked={field.value}
              onToggle={() => field.onChange(!field.value)}
            />
          )}
        />
      </AppCard>

      <AppCard style={{ marginTop: 14, gap: 14 }}>
        <Text style={styles.sectionTitle}>Jumlah, berat & harga</Text>
        <Text style={styles.helper}>
          Berat wajib akurat karena menjadi dasar Material Flow Ledger.
        </Text>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <AppLabel required>Jumlah unit</AppLabel>
            <Controller
              control={control}
              name="quantity"
              render={({ field }) => (
                <AppInput
                  value={field.value ? String(field.value) : ''}
                  onChangeText={(t) => field.onChange(Number(t.replace(/\D/g, '')) || 0)}
                  keyboardType="numeric"
                  hasError={Boolean(errors.quantity)}
                />
              )}
            />
            <FieldError message={errors.quantity?.message} />
          </View>
          <View style={{ flex: 1 }}>
            <AppLabel required>Berat/unit (gram)</AppLabel>
            <Controller
              control={control}
              name="weight"
              render={({ field }) => (
                <AppInput
                  value={field.value ? String(field.value) : ''}
                  onChangeText={(t) => field.onChange(Number(t.replace(/\D/g, '')) || 0)}
                  keyboardType="numeric"
                  hasError={Boolean(errors.weight)}
                />
              )}
            />
            <FieldError message={errors.weight?.message} />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <AppLabel required>Harga awal (IDR)</AppLabel>
            <Controller
              control={control}
              name="originalPrice"
              render={({ field }) => (
                <AppInput
                  value={field.value ? String(field.value) : ''}
                  onChangeText={(t) => field.onChange(Number(t.replace(/\D/g, '')) || 0)}
                  keyboardType="numeric"
                  hasError={Boolean(errors.originalPrice)}
                />
              )}
            />
            <FieldError message={errors.originalPrice?.message} />
          </View>
          <View style={{ flex: 1 }}>
            <AppLabel required>Floor price (IDR)</AppLabel>
            <Controller
              control={control}
              name="floorPrice"
              render={({ field }) => (
                <AppInput
                  value={field.value ? String(field.value) : ''}
                  onChangeText={(t) => field.onChange(Number(t.replace(/\D/g, '')) || 0)}
                  keyboardType="numeric"
                  hasError={Boolean(errors.floorPrice)}
                />
              )}
            />
            <FieldError message={errors.floorPrice?.message} />
          </View>
        </View>

        <View>
          <AppLabel required>Harga rescue (IDR)</AppLabel>
          <Controller
            control={control}
            name="rescuePrice"
            render={({ field }) => (
              <AppInput
                value={field.value ? String(field.value) : ''}
                onChangeText={(t) => {
                  setHasManualPrice(true);
                  field.onChange(Number(t.replace(/\D/g, '')) || 0);
                }}
                keyboardType="numeric"
                hasError={Boolean(errors.rescuePrice)}
              />
            )}
          />
          <Text style={styles.helper}>
            {hasManualPrice
              ? 'Harga manual aktif hingga kamu menekan tombol saran pricing.'
              : 'Mengikuti saran Dynamic Rescue Pricing.'}
          </Text>
          <FieldError message={errors.rescuePrice?.message} />
        </View>
      </AppCard>

      <AppCard style={{ marginTop: 14, gap: 14 }}>
        <Text style={styles.sectionTitle}>Waktu pickup (WIB)</Text>
        <View>
          <AppLabel required>Mulai (YYYY-MM-DD HH:mm)</AppLabel>
          <Controller
            control={control}
            name="pickupStart"
            render={({ field }) => (
              <AppInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="2026-11-25 17:00"
                hasError={Boolean(errors.pickupStart)}
              />
            )}
          />
          <FieldError message={errors.pickupStart?.message} />
        </View>
        <View>
          <AppLabel required>Selesai (YYYY-MM-DD HH:mm)</AppLabel>
          <Controller
            control={control}
            name="pickupEnd"
            render={({ field }) => (
              <AppInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder="2026-11-25 20:00"
                hasError={Boolean(errors.pickupEnd)}
              />
            )}
          />
          <FieldError message={errors.pickupEnd?.message} />
        </View>
      </AppCard>

      {/* Dynamic Rescue Pricing Preview */}
      <View style={styles.pricingCard}>
        <View style={styles.pricingHeader}>
          <Calculator size={16} color={colors.primary} />
          <Text style={styles.pricingHeaderText}>Pratinjau harga</Text>
        </View>
        <Text style={styles.pricingSub}>Harga tampil ke konsumen</Text>
        <Text style={styles.pricingBig}>{formatIdr(rescuePrice)}</Text>
        <Text style={styles.pricingStrike}>
          {formatIdr(originalPrice)} · hemat {Math.max(0, discount)}%
        </Text>

        <View style={styles.pricingDivider} />
        <Text style={styles.pricingSuggestion}>
          Saran awal: {formatIdr(suggestion.suggestedPrice)}
        </Text>
        <Text style={styles.pricingBreakdown}>
          {Math.round(suggestion.breakdown.base * 100)}% dasar material +{' '}
          {Math.round(suggestion.breakdown.urgency * 100)}% urgensi +{' '}
          {Math.round(suggestion.breakdown.stockPressure * 100)}% tekanan stok.
        </Text>
        {suggestion.clampedByFloor ? (
          <Text style={styles.floorNote}>
            Saran dibatasi oleh floor price merchant.
          </Text>
        ) : null}

        <AppButton
          variant="outline"
          size="sm"
          title="Gunakan saran pricing"
          disabled={floorPrice >= originalPrice}
          onPress={() => {
            setHasManualPrice(false);
            setValue('rescuePrice', suggestion.suggestedPrice, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
          style={{ marginTop: 12 }}
        />

        <View style={{ marginTop: 16, gap: 10 }}>
          <AppButton
            size="lg"
            loading={isSubmitting && submitAction === 'publish'}
            disabled={isSubmitting}
            title={
              isSubmitting && submitAction === 'publish'
                ? 'Menerbitkan...'
                : 'Terbitkan Sekarang'
            }
            onPress={() => submitWithAction('publish')}
          />
          <AppButton
            size="lg"
            variant="outline"
            loading={isSubmitting && submitAction === 'draft'}
            disabled={isSubmitting}
            title={
              isSubmitting && submitAction === 'draft'
                ? 'Menyimpan...'
                : 'Simpan Draft'
            }
            onPress={() => submitWithAction('draft')}
          />
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  helper: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedForeground,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
  previewImg: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    marginBottom: 8,
    backgroundColor: colors.muted,
  },
  pricingCard: {
    marginTop: 16,
    borderRadius: radius.xl,
    backgroundColor: colors.secondary,
    padding: 18,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pricingHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  pricingSub: {
    marginTop: 12,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  pricingBig: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  pricingStrike: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  pricingDivider: {
    height: 1,
    backgroundColor: 'rgba(16, 115, 51, 0.16)',
    marginVertical: 14,
  },
  pricingSuggestion: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  pricingBreakdown: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  floorNote: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
