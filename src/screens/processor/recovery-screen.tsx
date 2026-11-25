import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import { Clock3, MapPin, Recycle } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import {
  PageHeader,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import { StatusBadge } from '@/components/common/status-badge';
import {
  AppButton,
  AppCard,
  AppSkeleton,
  ScreenScrollView,
  SegmentedTabs,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { formatDistance, formatKg, formatPickupWindow } from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

type QueueTab = 'offered' | 'accepted' | 'collected';

const MATERIAL_LABELS: Record<string, string> = {
  prepared_food: 'Makanan siap saji',
  bakery: 'Roti & bakery',
  produce: 'Buah & sayur',
  dairy: 'Produk susu',
  protein: 'Protein',
  dry_goods: 'Bahan kering',
  mixed: 'Campuran',
};

function OfferCountdown({ expiresAt }: { expiresAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.max(0, expiresAt - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  const urgent = remaining < 3_600_000;

  return (
    <View style={styles.metaRow}>
      <Clock3
        size={14}
        color={urgent ? colors.destructive : colors.mutedForeground}
      />
      <Text
        style={[
          styles.metaText,
          urgent && { color: colors.destructive, fontWeight: '700' },
        ]}
      >
        {remaining === 0
          ? 'Offer telah kedaluwarsa'
          : `Sisa ${hours ? `${hours} jam ` : ''}${minutes} menit ${seconds} detik`}
      </Text>
    </View>
  );
}

function RecoveryQueueBody() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sessionToken, user } = useAuth();
  const [tab, setTab] = useState<QueueTab>('offered');
  const isVerified = user?.profile?.verificationStatus === 'verified';

  const batches = useQuery(
    api.recoveryBatches.listQueue,
    sessionToken && isVerified ? { sessionToken, tab } : 'skip',
  );

  if (!isVerified) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Verifikasi fasilitas masih diperlukan</Text>
        <Text style={styles.emptySub}>
          Antrean recovery tersedia setelah profil Organic Processor
          terverifikasi.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'offered', label: 'Ditawarkan' },
          { value: 'accepted', label: 'Diterima' },
          { value: 'collected', label: 'Ditimbang' },
        ]}
      />

      {batches === undefined ? (
        <View style={{ gap: 12 }}>
          {[0, 1].map((idx) => (
            <AppSkeleton key={idx} height={210} borderRadius={radius.lg} />
          ))}
        </View>
      ) : batches.length === 0 ? (
        <View style={styles.emptyBox}>
          <Recycle size={30} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>Belum ada batch pada tahap ini</Text>
          <Text style={styles.emptySub}>
            Perubahan dari Circular Routing akan muncul otomatis di sini.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {batches.map((batch) => (
            <AppCard key={batch._id} style={{ gap: 10 }}>
              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <Recycle size={20} color={colors.primary} />
                </View>
                <StatusBadge status={batch.status} />
              </View>

              <View>
                <Text style={styles.itemName}>{batch.itemName}</Text>
                <Text style={styles.subText}>
                  {batch.merchantName} · {MATERIAL_LABELS[batch.materialType]}
                </Text>
              </View>

              <View>
                <Text style={styles.weightBig}>
                  {formatKg(batch.offeredWeightGrams)}
                </Text>
                <Text style={styles.tinyLabel}>
                  Berat yang dinyatakan Merchant
                </Text>
              </View>

              <View style={styles.metaBlock}>
                <View style={styles.metaRow}>
                  <MapPin size={14} color={colors.primary} />
                  <Text style={styles.metaText}>{batch.pickupAddress}</Text>
                </View>
                <Text style={styles.metaText}>
                  {formatPickupWindow(batch.pickupStartAt, batch.pickupEndAt)} ·{' '}
                  {batch.distanceMeters === null
                    ? 'Jarak belum tersedia'
                    : formatDistance(batch.distanceMeters)}
                </Text>
                <Text style={styles.metaText}>
                  Percobaan routing {batch.routingAttempts} ·{' '}
                  {batch.declinedProcessorCount} penolakan
                </Text>
                {batch.offerExpiresAt ? (
                  <OfferCountdown expiresAt={batch.offerExpiresAt} />
                ) : null}
              </View>

              <AppButton
                variant={batch.status === 'offered' ? 'default' : 'outline'}
                title={
                  batch.status === 'offered'
                    ? 'Tinjau offer'
                    : batch.status === 'accepted'
                      ? 'Catat intake'
                      : batch.status === 'processed'
                        ? 'Lihat hasil'
                        : 'Catat outcome'
                }
                onPress={() =>
                  navigation.navigate('RecoveryDetail', { id: batch._id })
                }
              />
            </AppCard>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ProcessorRecoveryScreen() {
  return (
    <ScreenScrollView>
      <PageHeader
        title="Antrean recovery"
        description="Batch Circular Routing yang ditugaskan ke fasilitasmu."
      />
      <QueryErrorBoundary title="Antrean recovery tidak dapat dimuat">
        <RecoveryQueueBody />
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
    backgroundColor: colors.card,
    padding: 28,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  subText: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  weightBig: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.foreground,
  },
  tinyLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  metaBlock: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
  },
});
