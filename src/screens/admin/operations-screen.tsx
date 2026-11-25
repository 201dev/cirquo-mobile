import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { PageHeader } from '@/components/common/common-chrome';
import {
  AppButton,
  AppCard,
  AppInput,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { formatWeight } from '@/lib/format';
import { colors, radius } from '@/theme/tokens';

export default function AdminOperationsScreen() {
  const toast = useToast();
  const { sessionToken: rawSessionToken } = useAuth();
  const sessionToken = rawSessionToken ?? undefined;

  const batches = useQuery(
    api.recoveryBatches.adminListReroutable,
    sessionToken ? { sessionToken } : 'skip',
  );
  const disputes = useQuery(
    api.admin.listDisputes,
    sessionToken ? { sessionToken, status: 'open' } : 'skip',
  );

  const reroute = useMutation(api.recoveryBatches.adminReroute);
  const openDispute = useMutation(api.admin.openDispute);
  const resolveDispute = useMutation(api.admin.resolveDispute);

  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submitDispute = async (resolve: boolean) => {
    if (!orderId.trim() || reason.trim().length < 10 || busy) {
      toast.error('Order ID dan alasan (min. 10 karakter) wajib diisi.');
      return;
    }
    setBusy(true);
    try {
      const id = orderId.trim() as Id<'orders'>;
      if (resolve) {
        await resolveDispute({
          sessionToken,
          orderId: id,
          resolution: reason.trim(),
        });
      } else {
        await openDispute({
          sessionToken,
          orderId: id,
          reason: reason.trim(),
        });
      }
      toast.success(resolve ? 'Dispute ditutup.' : 'Dispute dibuka.');
      setOrderId('');
      setReason('');
    } catch {
      toast.error('Operasi dispute gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScrollView>
      <PageHeader
        title="Operasi Admin"
        description="Dispute order dan Circular Routing manual."
      />

      <AppCard style={{ gap: 12 }}>
        <Text style={styles.sectionTitle}>Manual reroute</Text>
        {batches?.length ? (
          batches.map((batch) => (
            <View key={batch._id} style={styles.batchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{batch.itemName}</Text>
                <Text style={styles.tiny}>
                  {batch.status} · {formatWeight(batch.offeredWeightGrams)}
                </Text>
              </View>
              <AppButton
                size="sm"
                title="Reroute"
                onPress={() => {
                  void reroute({
                    sessionToken,
                    batchId: batch._id,
                    reason:
                      'Reroute manual oleh Admin untuk tindak lanjut operasional.',
                  })
                    .then(() => toast.success('Batch dirutekan ulang.'))
                    .catch(() => toast.error('Reroute gagal.'));
                }}
              />
            </View>
          ))
        ) : (
          <Text style={styles.muted}>
            Tidak ada batch yang perlu dirutekan ulang.
          </Text>
        )}
      </AppCard>

      <AppCard style={{ marginTop: 14, gap: 10 }}>
        <Text style={styles.sectionTitle}>Dispute order</Text>
        <AppInput
          placeholder="Order ID"
          value={orderId}
          onChangeText={setOrderId}
        />
        <AppInput
          multiline
          placeholder="Alasan / keputusan (min. 10 karakter)"
          value={reason}
          onChangeText={setReason}
        />
        <View style={styles.btnRow}>
          <AppButton
            size="sm"
            loading={busy}
            title="Buka dispute"
            onPress={() => void submitDispute(false)}
            style={{ flex: 1 }}
          />
          <AppButton
            size="sm"
            variant="outline"
            disabled={busy || !orderId.trim()}
            title="Tutup dispute"
            onPress={() => void submitDispute(true)}
            style={{ flex: 1 }}
          />
        </View>

        {disputes?.length ? (
          <View style={{ gap: 8, marginTop: 6 }}>
            <Text style={styles.tiny}>Dispute terbuka (ketuk untuk memilih):</Text>
            {disputes.map((dispute) => (
              <Pressable
                key={dispute._id}
                onPress={() => setOrderId(dispute.orderId)}
                style={styles.disputeBtn}
              >
                <Text style={styles.itemTitle}>Order {dispute.orderId}</Text>
                <Text style={styles.tiny}>{dispute.reason}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </AppCard>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  muted: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  tiny: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  disputeBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 3,
  },
});
