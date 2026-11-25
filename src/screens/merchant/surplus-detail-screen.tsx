import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery } from 'convex/react';
import { Clock3, RotateCcw, Scale, ShieldAlert } from 'lucide-react-native';
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
  AppSkeleton,
  ScreenScrollView,
  SelectField,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getErrorMessage } from '@/lib/errors';
import {
  formatDistance,
  formatIdr,
  formatKg,
  formatPickupWindow,
  formatWibDate,
  formatWibTime,
} from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function ProcessorPicker({
  batchId,
  sessionToken,
}: {
  batchId: Id<'recoveryBatches'>;
  sessionToken: string;
}) {
  const toast = useToast();
  const [now] = useState(Date.now);
  const processors = useQuery(api.recoveryBatches.listEligibleProcessors, {
    batchId,
    sessionToken,
    now,
  });
  const selectProcessor = useMutation(api.recoveryBatches.selectProcessor);
  const [processorId, setProcessorId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (processors === undefined) {
    return <AppSkeleton height={110} borderRadius={radius.lg} />;
  }

  const submit = async () => {
    if (!processorId) {
      toast.error('Pilih Organic Processor terlebih dahulu.');
      return;
    }
    setIsSubmitting(true);
    try {
      await selectProcessor({
        batchId,
        processorId: processorId as Id<'processors'>,
        sessionToken,
      });
      toast.success('Organic Processor berhasil dipilih.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Organic Processor gagal dipilih.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppCard style={{ gap: 10 }}>
      <Text style={styles.sectionTitle}>Pilih Organic Processor</Text>
      <Text style={styles.muted}>
        Pilihan berikut sudah sesuai jenis material, jarak pickup, dan kapasitas
        harian.
      </Text>
      {processors.length > 0 ? (
        <>
          <SelectField
            label="Organic Processor"
            value={processorId}
            placeholder="Pilih fasilitas"
            options={processors.map((p) => ({
              value: p.processorId,
              label: p.name,
              subtitle: `${formatDistance(p.distanceMeters)} · sisa ${formatKg(p.remainingCapacityGrams)}`,
            }))}
            onChange={setProcessorId}
          />
          <AppButton
            loading={isSubmitting}
            disabled={!processorId || isSubmitting}
            title={isSubmitting ? 'Mengirim...' : 'Kirim ke Processor'}
            onPress={() => void submit()}
          />
        </>
      ) : (
        <Text style={styles.muted}>
          Belum ada Organic Processor yang memenuhi syarat untuk batch ini.
        </Text>
      )}
    </AppCard>
  );
}

function SurplusDetailBody({ id }: { id: string }) {
  const toast = useToast();
  const { sessionToken } = useAuth();
  const publishItem = useMutation(api.surplusItems.publish);
  const [publishing, setPublishing] = useState(false);

  const item = useQuery(
    api.surplusItems.getMine,
    sessionToken ? { id: id as Id<'surplusItems'>, sessionToken } : 'skip',
  );
  const recoveryBatches = useQuery(
    api.recoveryBatches.listForMerchant,
    sessionToken ? { sessionToken } : 'skip',
  );

  if (item === undefined || recoveryBatches === undefined) {
    return (
      <View style={{ gap: 12 }}>
        <AppSkeleton height={160} borderRadius={radius.lg} />
        <AppSkeleton height={110} borderRadius={radius.lg} />
      </View>
    );
  }

  if (item === null) {
    return <PageHeader title="Rescue Item tidak ditemukan" />;
  }

  const recoveryBatch = recoveryBatches.find(
    (batch) => batch.surplusItemId === item._id,
  );
  const pickupWindow = `${formatWibDate(item.pickupStartAt)} · ${formatPickupWindow(item.pickupStartAt, item.pickupEndAt)}`;

  const handlePublishDraft = async () => {
    if (!sessionToken) return;
    setPublishing(true);
    try {
      await publishItem({ id: item._id, sessionToken });
      toast.success('Rescue Item berhasil diterbitkan.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Gagal menerbitkan draf.'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <PageHeader
        title={item.name}
        description={
          item.processingOnly
            ? 'Rescue Item khusus Organic Processor.'
            : 'Rescue Item yang dikelola Merchant.'
        }
      />

      {item.status === 'moderated' && item.moderationReason ? (
        <AlertBanner
          tone="destructive"
          title="Rescue Item dimoderasi"
          body={item.moderationReason}
        />
      ) : null}

      <AppCard style={{ gap: 12 }}>
        <StatusBadge status={item.status} />
        <View>
          <Text style={styles.priceBig}>{formatIdr(item.currentPrice)}</Text>
          <Text style={styles.strikePrice}>{formatIdr(item.originalPrice)}</Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Stok tersisa</Text>
            <Text style={styles.metaVal}>
              {item.remainingQuantity} dari {item.initialQuantity} unit
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Diterbitkan</Text>
            <Text style={styles.metaVal}>
              {item.publishedAt ? formatWibDate(item.publishedAt) : 'Masih draf'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryStrip}>
          <View style={styles.stripRow}>
            <Scale size={16} color={colors.primary} />
            <Text style={styles.stripText}>
              {item.remainingQuantity} unit tersedia
            </Text>
          </View>
          <View style={styles.stripRow}>
            <Clock3 size={16} color={colors.primary} />
            <Text style={styles.stripText}>{pickupWindow}</Text>
          </View>
        </View>

        {item.status === 'draft' ? (
          <AppButton
            loading={publishing}
            title={publishing ? 'Menerbitkan...' : 'Terbitkan Draf Sekarang'}
            onPress={() => void handlePublishDraft()}
          />
        ) : null}
      </AppCard>

      {item.pickedUpOrderCount > 0 ? (
        <View style={styles.rescuedBox}>
          <StatusBadge status="picked_up" />
          <Text style={styles.boxTitle}>Pickup berhasil dikonfirmasi</Text>
          <Text style={styles.muted}>
            {item.pickedUpOrderCount} pesanan · {formatKg(item.rescuedWeightGrams)}{' '}
            material tercatat sebagai Rescued.
          </Text>
        </View>
      ) : null}

      {recoveryBatch ? (
        <>
          <AppCard style={{ gap: 8 }}>
            <StatusBadge status={recoveryBatch.status} />
            <Text style={styles.boxTitle}>
              {recoveryBatch.status === 'pending'
                ? 'Window pickup telah berakhir'
                : recoveryBatch.status === 'offered'
                  ? recoveryBatch.routingAttempts > 1
                    ? 'Circular Routing sedang mencoba kembali'
                    : 'Material ditawarkan ke Organic Processor'
                  : recoveryBatch.status === 'unroutable'
                    ? 'Circular Routing belum berhasil'
                    : recoveryBatch.status === 'accepted'
                      ? 'Organic Processor menerima batch'
                      : recoveryBatch.status === 'collected'
                        ? 'Intake terukur telah dicatat'
                        : 'Material selesai diproses'}
            </Text>
            <Text style={styles.muted}>
              {recoveryBatch.processorName ? `${recoveryBatch.processorName}. ` : ''}
              Berat deklarasi {formatKg(recoveryBatch.offeredWeightGrams)}.
              {recoveryBatch.acceptedWeightGrams !== undefined
                ? ` Terukur ${formatKg(recoveryBatch.acceptedWeightGrams)}.`
                : ''}
              {recoveryBatch.status === 'offered'
                ? ` Percobaan ${recoveryBatch.routingAttempts} dari 3.`
                : ''}
              {recoveryBatch.status === 'offered' && recoveryBatch.offerExpiresAt
                ? ` Berlaku sampai ${formatWibDate(recoveryBatch.offerExpiresAt)}, ${formatWibTime(recoveryBatch.offerExpiresAt)} WIB.`
                : ''}
            </Text>
            {recoveryBatch.status === 'processed' ? (
              <Text style={styles.outcomeLine}>
                Recovered {formatKg(recoveryBatch.outputWeightGrams ?? 0)} ·
                Residual {formatKg(recoveryBatch.residualWeightGrams ?? 0)} ·
                Process loss {formatKg(recoveryBatch.processLossGrams ?? 0)}
              </Text>
            ) : null}
          </AppCard>

          {recoveryBatch.status === 'pending' && sessionToken ? (
            <ProcessorPicker
              batchId={recoveryBatch._id}
              sessionToken={sessionToken}
            />
          ) : null}
        </>
      ) : item.status === 'recovery_pending' ? (
        <View style={styles.infoBox}>
          <RotateCcw size={18} color={colors.inProgress} />
          <Text style={styles.muted}>
            Window pickup berakhir. Batch recovery sedang disiapkan.
          </Text>
        </View>
      ) : item.status === 'closed' && item.pickedUpOrderCount === 0 ? (
        <AppCard style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <ShieldAlert size={18} color={colors.mutedForeground} />
          <Text style={styles.muted}>Rescue Item ini sudah ditutup.</Text>
        </AppCard>
      ) : null}
    </View>
  );
}

export default function SurplusDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'SurplusDetail'>>();
  return (
    <ScreenScrollView>
      <QueryErrorBoundary title="Status Rescue Item tidak dapat dimuat">
        <SurplusDetailBody id={route.params.id} />
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
  priceBig: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.foreground,
  },
  strikePrice: {
    fontSize: 13,
    color: colors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaCell: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  metaVal: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  summaryStrip: {
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    padding: 12,
    gap: 8,
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stripText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  rescuedBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.rescuedBorder,
    backgroundColor: colors.rescuedSoft,
    padding: 14,
    gap: 6,
  },
  infoBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.inProgressBorder,
    backgroundColor: colors.inProgressSoft,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  boxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  muted: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  outcomeLine: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
});
