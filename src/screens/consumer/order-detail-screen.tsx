import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import { Check, Clock3, Copy, MapPin, Package } from 'lucide-react-native';
import { QueryErrorBoundary } from '@/components/common/common-chrome';
import { StatusBadge } from '@/components/common/status-badge';
import {
  AppButton,
  AppCard,
  AppSkeleton,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useToast } from '@/contexts/toast-context';
import {
  useCancelReservation,
  useMyOrder,
  type ConsumerOrderDetail,
} from '@/features/orders/use-consumer-orders';
import { usePaymentHold } from '@/features/orders/use-payment-hold';
import {
  formatIdr,
  formatKg,
  formatPickupWindow,
  formatWibDate,
} from '@/lib/format';
import {
  rescueItemImageForMaterialType,
  toReactNativeImageSource,
} from '@/lib/rescue-item-images';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function PaymentPendingPanel({ order }: { order: ConsumerOrderDetail }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const hold = usePaymentHold(order);
  const isOver = hold.isExpired;

  return (
    <View style={styles.pendingBox}>
      <Text style={styles.panelTitle}>
        {isOver ? 'Waktu pembayaran habis' : 'Menunggu pembayaran'}
      </Text>
      <Text style={styles.panelBody}>
        {isOver
          ? 'Reservasi sedang dilepas dan paketnya kembali ke stok.'
          : 'Pesanan ini belum dibayar. Kode pickup baru muncul setelah pembayaran terverifikasi.'}
      </Text>
      {!isOver ? (
        <>
          <Text style={styles.countdown}>{hold.countdown}</Text>
          <AppButton
            title="Bayar sekarang"
            onPress={() => navigation.navigate('Checkout', { orderId: order._id })}
            style={{ marginTop: 12 }}
          />
        </>
      ) : null}
    </View>
  );
}

function PickupCodePanel({ code }: { code: string }) {
  const toast = useToast();

  const copyCode = () => {
    Clipboard.setString(code);
    toast.success('Kode pickup disalin.');
  };

  return (
    <View style={styles.codeCard}>
      <StatusBadge status="paid" inverted />
      <Text style={styles.codeHeading}>Kode pickup</Text>
      <Text style={styles.codeSub}>
        Tunjukkan kode ini ke merchant saat mengambil. Jangan bagikan sebelum
        kamu tiba di lokasi.
      </Text>
      <View style={styles.codeWhiteBox}>
        <Text style={styles.codeLabel}>KODE</Text>
        <Text selectable style={styles.codeDigits}>
          {code}
        </Text>
        <AppButton
          variant="ghost"
          size="sm"
          title="Salin"
          leftIcon={<Copy size={15} color={colors.foreground} />}
          onPress={copyCode}
          style={{ marginTop: 6 }}
        />
      </View>
    </View>
  );
}

function CompletedPanel({ order }: { order: ConsumerOrderDetail }) {
  return (
    <View style={styles.completedBox}>
      <View style={styles.completedIcon}>
        <Check size={24} color={colors.leaf800} />
      </View>
      <Text style={styles.completedTitle}>Sudah diambil</Text>
      <Text style={styles.completedBody}>
        {order.pickedUpAt
          ? `Diambil pada ${formatWibDate(order.pickedUpAt)}.`
          : 'Pickup sudah dikonfirmasi merchant.'}{' '}
        {formatKg(order.rescuedWeightGrams)} material tercatat sebagai Rescued.
      </Text>
    </View>
  );
}

function OrderTimeline({ order }: { order: ConsumerOrderDetail }) {
  const steps = [
    {
      label: 'Reservasi diterima',
      done: true,
      note: formatWibDate(order.createdAt),
    },
    {
      label: 'Pembayaran terverifikasi',
      done: order.status === 'paid' || order.status === 'picked_up',
      note: 'Diverifikasi server, bukan dari perangkat.',
    },
    {
      label: 'Pickup selesai',
      done: order.status === 'picked_up',
      note: order.pickedUpAt
        ? formatWibDate(order.pickedUpAt)
        : 'Menunggu konfirmasi merchant.',
    },
  ];

  return (
    <View style={{ marginTop: 22 }}>
      <Text style={styles.timelineHeading}>Status pesanan</Text>
      <View style={{ marginTop: 12 }}>
        {steps.map((step, idx) => (
          <View key={step.label} style={styles.stepRow}>
            <View style={styles.stepRail}>
              <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
                {step.done ? <Check size={14} color={colors.white} /> : null}
              </View>
              {idx < steps.length - 1 ? (
                <View
                  style={[
                    styles.stepLine,
                    step.done && { backgroundColor: colors.leaf300 },
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepLabel,
                  !step.done && { color: colors.mutedForeground },
                ]}
              >
                {step.label}
              </Text>
              <Text style={styles.stepNote}>{step.note}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function OrderDetailBody({ id }: { id: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const order = useMyOrder(id);
  const cancelReservation = useCancelReservation();

  if (order === undefined) {
    return (
      <View style={{ gap: 14 }}>
        <AppSkeleton height={150} borderRadius={radius.lg} />
        <AppSkeleton height={170} borderRadius={radius.lg} />
      </View>
    );
  }

  if (order === null) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Pesanan tidak ditemukan</Text>
        <Text style={styles.emptySub}>
          Pesanan ini tidak ada atau bukan milikmu.
        </Text>
        <AppButton
          title="Kembali ke pesanan"
          onPress={() =>
            navigation.navigate('ConsumerMain', { screen: 'Orders' })
          }
          style={{ marginTop: 14 }}
        />
      </View>
    );
  }

  const refundMessage = {
    pending:
      'Refund Sandbox sedang diproses. Status ini akan diperbarui otomatis.',
    succeeded: 'Refund Sandbox telah berhasil diproses.',
    failed:
      'Refund Sandbox belum berhasil diproses. Tim Cirquo akan menindaklanjuti.',
  }[order.refundStatus ?? 'pending'];

  return (
    <View style={{ gap: 14 }}>
      {order.status === 'reserved' ? <PaymentPendingPanel order={order} /> : null}
      {order.status === 'paid' && order.pickupCode ? (
        <PickupCodePanel code={order.pickupCode} />
      ) : null}
      {order.status === 'picked_up' ? <CompletedPanel order={order} /> : null}
      {order.status === 'expired' && order.refundStatus ? (
        <View style={styles.pendingBox}>
          <Text style={styles.panelTitle}>Pickup tidak dilakukan</Text>
          <Text style={styles.panelBody}>
            Window pickup telah berakhir sehingga pesanan tidak dapat diambil.{' '}
            {refundMessage}
          </Text>
        </View>
      ) : null}
      {order.status === 'cancelled' ||
      (order.status === 'expired' && !order.refundStatus) ? (
        <AppCard>
          <StatusBadge status={order.status} />
          <Text style={[styles.panelBody, { marginTop: 10 }]}>
            Pesanan ini sudah ditutup, jadi tidak ada kode pickup untuk
            ditampilkan.
          </Text>
        </AppCard>
      ) : null}

      <AppCard style={{ gap: 14 }}>
        <View style={styles.itemRow}>
          <Image
            source={toReactNativeImageSource(
              order.imageUrl ??
                rescueItemImageForMaterialType(order.materialType),
            )}
            style={styles.thumb}
            resizeMode="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{order.itemName}</Text>
            <Text style={styles.itemSub}>
              {order.merchantName} · {order.quantity} paket
            </Text>
            <Text style={styles.itemPrice}>{formatIdr(order.totalPrice)}</Text>
          </View>
        </View>

        <View style={styles.detailsList}>
          <View style={styles.detailRow}>
            <Clock3 size={17} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Waktu pickup</Text>
              <Text style={styles.detailVal}>
                {formatWibDate(order.pickupStartAt)},{' '}
                {formatPickupWindow(order.pickupStartAt, order.pickupEndAt)}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={17} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Lokasi merchant</Text>
              <Text style={styles.detailVal}>{order.merchantAddress}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Package size={17} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Berat tercatat</Text>
              <Text style={styles.detailVal}>
                {formatKg(order.rescuedWeightGrams)} · dikunci saat reservasi
              </Text>
            </View>
          </View>
        </View>
      </AppCard>

      {order.status === 'reserved' ? (
        <AppButton
          variant="outline"
          title="Batalkan reservasi"
          onPress={() => {
            void cancelReservation(order._id)
              .then(() =>
                toast.success('Reservasi dibatalkan dan stok dikembalikan.'),
              )
              .catch(() => toast.error('Reservasi tidak dapat dibatalkan.'));
          }}
        />
      ) : null}

      <OrderTimeline order={order} />
    </View>
  );
}

export default function OrderDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'OrderDetail'>>();
  return (
    <ScreenScrollView>
      <QueryErrorBoundary title="Detail pesanan tidak dapat dimuat">
        <OrderDetailBody id={route.params.id} />
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  pendingBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.inProgressBorder,
    backgroundColor: colors.inProgressSoft,
    padding: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  panelBody: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  countdown: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: 1.5,
  },
  codeCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.foreground,
    padding: 20,
  },
  codeHeading: {
    marginTop: 14,
    fontSize: 26,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: -0.5,
  },
  codeSub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(247,250,248,0.75)',
  },
  codeWhiteBox: {
    marginTop: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.mutedForeground,
    letterSpacing: 1,
  },
  codeDigits: {
    marginTop: 4,
    fontSize: 36,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: 6,
  },
  completedBox: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.rescuedBorder,
    backgroundColor: colors.rescuedSoft,
    padding: 20,
    alignItems: 'center',
  },
  completedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.leaf200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  completedBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  itemSub: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  itemPrice: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  detailsList: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  detailVal: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  timelineHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepRail: {
    alignItems: 'center',
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: colors.border,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 18,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  stepNote: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
