import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery } from 'convex/react';
import {
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Scale,
  XCircle,
} from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  AlertBanner,
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
import { getErrorMessage } from '@/lib/errors';
import {
  formatDistance,
  formatKg,
  formatPickupWindow,
  formatWibDate,
  formatWibTime,
} from '@/lib/format';
import {
  intakeSchema,
  outcomeSchema,
  recoveryNoteSchema,
} from '@/lib/validations';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

type DeclineReason =
  | 'capacity'
  | 'material_mismatch'
  | 'distance'
  | 'schedule'
  | 'other';
type OutputType = 'compost' | 'bsf_larvae' | 'animal_feed' | 'biogas';

const OUTPUT_LABELS: Record<OutputType, string> = {
  compost: 'Kompos',
  bsf_larvae: 'Larva BSF',
  animal_feed: 'Pakan ternak',
  biogas: 'Biogas',
};

const DECLINE_OPTIONS = [
  { value: 'capacity', label: 'Kapasitas tidak cukup' },
  { value: 'material_mismatch', label: 'Material tidak sesuai' },
  { value: 'distance', label: 'Jarak terlalu jauh' },
  { value: 'schedule', label: 'Jadwal tidak sesuai' },
  { value: 'other', label: 'Alasan lain' },
] as const;

function parseWibTimestamp(str: string): number | undefined {
  const clean = str.trim().replace(' ', 'T');
  if (!clean) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)) return undefined;
  const ts = new Date(`${clean}:00+07:00`).getTime();
  return Number.isNaN(ts) ? undefined : ts;
}

function RecoveryDetailBody({ id }: { id: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { sessionToken } = useAuth();

  const batch = useQuery(
    api.recoveryBatches.get,
    sessionToken
      ? { batchId: id as Id<'recoveryBatches'>, sessionToken }
      : 'skip',
  );
  const accept = useMutation(api.recoveryBatches.accept);
  const decline = useMutation(api.recoveryBatches.decline);
  const logIntake = useMutation(api.recoveryBatches.logIntake);
  const logOutcome = useMutation(api.recoveryBatches.logOutcome);

  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const [note, setNote] = useState('');
  const [estimatedCollectionAt, setEstimatedCollectionAt] = useState('');
  const [declineReason, setDeclineReason] = useState<DeclineReason>('capacity');
  const [measured, setMeasured] = useState('');
  const [outputType, setOutputType] = useState<OutputType>('compost');
  const [outputWeight, setOutputWeight] = useState('');
  const [residualWeight, setResidualWeight] = useState('');
  const [zeroResidualConfirmed, setZeroResidualConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const first = batch?.allowedOutputTypes[0];
    if (first) setOutputType(first);
  }, [batch?.allowedOutputTypes]);

  if (batch === undefined) {
    return (
      <View style={{ gap: 14 }}>
        <AppSkeleton height={160} borderRadius={radius.lg} />
        <AppSkeleton height={220} borderRadius={radius.lg} />
      </View>
    );
  }

  const runAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    setSubmitting(true);
    setMutationError('');
    try {
      await fn();
      setNote('');
      toast.success(successMsg);
      return true;
    } catch (error) {
      const msg = getErrorMessage(error, 'Tindakan gagal. Coba lagi.');
      setMutationError(msg);
      toast.error(msg);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const validateNote = () => {
    const result = recoveryNoteSchema.safeParse(note);
    if (!result.success) {
      setErrors({ note: result.error.issues[0]?.message ?? 'Catatan tidak valid' });
      return false;
    }
    setErrors({});
    return true;
  };

  const submitAccept = async () => {
    if (!validateNote() || !sessionToken) return;
    await runAction(
      () =>
        accept({
          batchId: batch._id,
          sessionToken,
          estimatedCollectionAt: parseWibTimestamp(estimatedCollectionAt),
          note: note || undefined,
        }),
      'Offer diterima. Catat berat terukur saat batch tiba.',
    );
  };

  const submitDecline = async () => {
    if (!validateNote() || !sessionToken) return;
    const ok = await runAction(
      () =>
        decline({
          batchId: batch._id,
          sessionToken,
          reason: declineReason,
          note: note || undefined,
        }),
      'Offer ditolak dan dikirim kembali ke Circular Routing.',
    );
    if (ok) navigation.goBack();
  };

  const submitIntake = async () => {
    const parsed = intakeSchema.safeParse({
      acceptedWeightGrams: Number(measured),
      note,
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    setErrors({});
    if (!sessionToken) return;
    await runAction(
      () =>
        logIntake({
          batchId: batch._id,
          sessionToken,
          acceptedWeightGrams: parsed.data.acceptedWeightGrams,
          note: parsed.data.note || undefined,
        }),
      'Intake terukur berhasil dicatat.',
    );
  };

  const submitOutcome = async () => {
    const parsed = outcomeSchema.safeParse({
      outputType,
      outputWeightGrams: Number(outputWeight),
      residualWeightGrams: Number(residualWeight),
      note,
    });
    const nextErrors: Record<string, string> = parsed.success
      ? {}
      : Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        );
    if (outputWeight === '') nextErrors.outputWeightGrams = 'Berat output harus diisi';
    if (residualWeight === '') nextErrors.residualWeightGrams = 'Berat residual harus diisi';
    if (residualWeight === '0' && !zeroResidualConfirmed) {
      nextErrors.residualWeightGrams = 'Konfirmasi Residual 0 gram terlebih dahulu';
    }
    if (
      batch.acceptedWeightGrams !== undefined &&
      Number(outputWeight) + Number(residualWeight) > batch.acceptedWeightGrams
    ) {
      nextErrors.outputWeightGrams =
        'Total output dan residual melebihi berat intake';
    }
    setErrors(nextErrors);
    if (!parsed.success || Object.keys(nextErrors).length || !sessionToken) return;

    await runAction(
      () =>
        logOutcome({
          batchId: batch._id,
          sessionToken,
          ...parsed.data,
          zeroResidualConfirmed,
          note: parsed.data.note || undefined,
        }),
      'Outcome tersimpan dan Material Flow Ledger diperbarui.',
    );
  };

  const variance =
    batch.acceptedWeightGrams === undefined
      ? undefined
      : batch.acceptedWeightGrams - batch.offeredWeightGrams;

  return (
    <View style={{ gap: 14 }}>
      <PageHeader
        title={batch.itemName}
        description={`Dari ${batch.merchantName}`}
        action={<StatusBadge status={batch.status} />}
      />

      <AppCard style={{ gap: 12 }}>
        <Text style={styles.sectionTitle}>Rincian batch</Text>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.metaLabel}>Berat deklarasi Merchant</Text>
            <Text style={styles.bigVal}>{formatKg(batch.offeredWeightGrams)}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.metaLabel}>Material</Text>
            <Text style={styles.val}>
              {batch.materialType.replace(/_/g, ' ')}
            </Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.metaLabel}>Jadwal</Text>
            <Text style={styles.val}>
              {formatPickupWindow(batch.pickupStartAt, batch.pickupEndAt)}
            </Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.metaLabel}>Jarak</Text>
            <Text style={styles.val}>
              {batch.distanceMeters === null
                ? 'Belum tersedia'
                : formatDistance(batch.distanceMeters)}
            </Text>
          </View>
        </View>

        <View style={styles.addrRow}>
          <MapPin size={15} color={colors.primary} style={{ marginTop: 2 }} />
          <Text style={styles.val}>{batch.pickupAddress}</Text>
        </View>
        <Text style={styles.muted}>
          Circular Routing · Percobaan {batch.routingAttempts}
        </Text>

        {batch.acceptedWeightGrams !== undefined && variance !== undefined ? (
          <View style={styles.varianceBox}>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Text style={styles.metaLabel}>Dinyatakan Merchant</Text>
                <Text style={styles.val}>{formatKg(batch.offeredWeightGrams)}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.metaLabel}>Terukur di timbangan</Text>
                <Text style={styles.val}>{formatKg(batch.acceptedWeightGrams)}</Text>
              </View>
            </View>
            <Text style={styles.muted}>
              Variansi {variance >= 0 ? '+' : ''}
              {formatKg(variance)} (
              {Math.round((variance / batch.offeredWeightGrams) * 1000) / 10}%).
              Dicatat untuk rekonsiliasi, bukan kesalahan intake.
            </Text>
          </View>
        ) : null}

        {batch.status === 'processed' ? (
          <View style={styles.processedBox}>
            <CheckCircle2 size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Outcome final tercatat</Text>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Text style={styles.metaLabel}>Output usable</Text>
                <Text style={styles.val}>{formatKg(batch.outputWeightGrams ?? 0)}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.metaLabel}>Residual</Text>
                <Text style={styles.val}>{formatKg(batch.residualWeightGrams ?? 0)}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.metaLabel}>Process loss</Text>
                <Text style={styles.val}>{formatKg(batch.processLossGrams ?? 0)}</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.metaLabel}>Konversi</Text>
                <Text style={styles.val}>{batch.conversionRatePercent ?? 0}%</Text>
              </View>
            </View>
          </View>
        ) : null}
      </AppCard>

      <View style={styles.actionPanel}>
        {mutationError ? (
          <AlertBanner tone="destructive" body={mutationError} />
        ) : null}

        {batch.status === 'offered' ? (
          <View style={{ gap: 12 }}>
            <ClipboardCheck size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Respons offer</Text>
            <Text style={styles.muted}>
              Berlaku sampai{' '}
              {batch.offerExpiresAt
                ? `${formatWibDate(batch.offerExpiresAt)}, ${formatWibTime(batch.offerExpiresAt)} WIB`
                : 'waktu tidak tersedia'}
              .
            </Text>
            <View>
              <AppLabel>Estimasi pengambilan WIB (opsional)</AppLabel>
              <AppInput
                value={estimatedCollectionAt}
                onChangeText={setEstimatedCollectionAt}
                placeholder="YYYY-MM-DD HH:mm"
              />
            </View>
            <View>
              <AppLabel>Catatan (opsional)</AppLabel>
              <AppInput
                multiline
                value={note}
                onChangeText={setNote}
                maxLength={500}
              />
              <FieldError message={errors.note} />
            </View>
            <AppButton
              size="lg"
              loading={submitting}
              title={submitting ? 'Menyimpan...' : 'Terima offer'}
              leftIcon={
                !submitting ? (
                  <CheckCircle2 size={18} color={colors.white} />
                ) : undefined
              }
              onPress={() => void submitAccept()}
            />

            <View style={styles.divider} />
            <SelectField
              label="Alasan penolakan"
              value={declineReason}
              options={DECLINE_OPTIONS}
              onChange={(v) => setDeclineReason(v as DeclineReason)}
            />
            <AppButton
              variant="outline"
              disabled={submitting}
              title="Tolak dan routing ulang"
              leftIcon={<XCircle size={17} color={colors.foreground} />}
              onPress={() => void submitDecline()}
            />
          </View>
        ) : null}

        {batch.status === 'accepted' ? (
          <View style={{ gap: 12 }}>
            <Scale size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Catat intake terukur</Text>
            <Text style={styles.muted}>
              Masukkan berat aktual dari timbangan fisik, bukan estimasi
              Merchant.
            </Text>
            <View>
              <AppLabel required>Berat dari timbangan (gram)</AppLabel>
              <AppInput
                value={measured}
                onChangeText={(t) => setMeasured(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                hasError={Boolean(errors.acceptedWeightGrams)}
              />
              <FieldError message={errors.acceptedWeightGrams} />
            </View>
            <View>
              <AppLabel>Catatan (opsional)</AppLabel>
              <AppInput
                multiline
                value={note}
                onChangeText={setNote}
                maxLength={500}
              />
              <FieldError message={errors.note} />
            </View>
            <AppButton
              size="lg"
              loading={submitting}
              title={submitting ? 'Menyimpan...' : 'Simpan intake'}
              onPress={() => void submitIntake()}
            />
          </View>
        ) : null}

        {batch.status === 'collected' ? (
          <View style={{ gap: 12 }}>
            <ClipboardCheck size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Catat outcome</Text>
            <Text style={styles.muted}>
              Output usable, residual, dan process loss tetap dipisahkan.
            </Text>
            {batch.allowedOutputTypes.length > 0 ? (
              <SelectField
                label="Jenis output"
                value={outputType}
                options={batch.allowedOutputTypes.map((type) => ({
                  value: type,
                  label: OUTPUT_LABELS[type],
                }))}
                onChange={(v) => setOutputType(v as OutputType)}
              />
            ) : (
              <AlertBanner
                tone="destructive"
                body="Profil fasilitas belum memiliki jenis output yang didukung."
              />
            )}

            <View>
              <AppLabel required>Output usable (gram)</AppLabel>
              <AppInput
                value={outputWeight}
                onChangeText={(t) => setOutputWeight(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                hasError={Boolean(errors.outputWeightGrams)}
              />
              <FieldError message={errors.outputWeightGrams} />
            </View>
            <View>
              <AppLabel required>Residual (gram)</AppLabel>
              <AppInput
                value={residualWeight}
                onChangeText={(t) => setResidualWeight(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                hasError={Boolean(errors.residualWeightGrams)}
              />
              <FieldError message={errors.residualWeightGrams} />
            </View>

            {outputWeight !== '' &&
            residualWeight !== '' &&
            batch.acceptedWeightGrams !== undefined ? (
              <View style={styles.lossPill}>
                <Text style={styles.muted}>
                  Process loss:{' '}
                  {formatKg(
                    Math.max(
                      0,
                      batch.acceptedWeightGrams -
                        Number(outputWeight) -
                        Number(residualWeight),
                    ),
                  )}
                </Text>
              </View>
            ) : null}

            {residualWeight === '0' ? (
              <CheckboxOption
                label="Saya memastikan timbangan menunjukkan Residual 0 gram."
                checked={zeroResidualConfirmed}
                onToggle={() => setZeroResidualConfirmed((v) => !v)}
              />
            ) : null}

            <View>
              <AppLabel>Catatan (opsional)</AppLabel>
              <AppInput
                multiline
                value={note}
                onChangeText={setNote}
                maxLength={500}
              />
              <FieldError message={errors.note} />
            </View>

            <AppButton
              size="lg"
              loading={submitting}
              disabled={submitting || !batch.allowedOutputTypes.length}
              title={submitting ? 'Menyimpan...' : 'Simpan outcome final'}
              onPress={() => void submitOutcome()}
            />
          </View>
        ) : null}

        {batch.status === 'processed' ? (
          <View style={{ gap: 6 }}>
            <CheckCircle2 size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Batch selesai diproses</Text>
            <Text style={styles.muted}>
              Catatan terminal bersifat immutable. Koreksi memerlukan event
              kompensasi.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function RecoveryDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'RecoveryDetail'>>();
  return (
    <ScreenScrollView>
      <QueryErrorBoundary title="Detail batch tidak dapat dimuat">
        <RecoveryDetailBody id={route.params.id} />
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    width: '46%',
  },
  metaLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  bigVal: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
  },
  val: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  addrRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  muted: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  varianceBox: {
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    padding: 12,
    gap: 8,
  },
  processedBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.leaf300,
    backgroundColor: colors.leaf50,
    padding: 14,
    gap: 8,
  },
  actionPanel: {
    borderRadius: radius.xl,
    backgroundColor: colors.secondary,
    padding: 16,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  lossPill: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 10,
  },
});
