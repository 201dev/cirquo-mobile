import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAction } from 'convex/react';
import { WebView } from 'react-native-webview';
import { Clock, MapPin, Store, X } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { QueryErrorBoundary } from '@/components/common/common-chrome';
import { AppButton, AppCard, AppSkeleton } from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useMyOrder } from '@/features/orders/use-consumer-orders';
import { usePaymentHold } from '@/features/orders/use-payment-hold';
import { getErrorMessage } from '@/lib/errors';
import { formatIdr, formatPickupWindow, formatWibDate } from '@/lib/format';
import {
  rescueItemImageForMaterialType,
  toReactNativeImageSource,
} from '@/lib/rescue-item-images';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

type PaymentPhase = 'idle' | 'preparing' | 'open' | 'awaiting_webhook';

function CheckoutBody({ orderId }: { orderId: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { sessionToken } = useAuth();
  const order = useMyOrder(orderId);
  const createTransaction = useAction(api.payments.createTransaction);
  const hold = usePaymentHold(order);

  const [phase, setPhase] = useState<PaymentPhase>('idle');
  const [snapRedirectUrl, setSnapRedirectUrl] = useState<string | null>(null);

  // Reactive: the verified Midtrans webhook flipping the order to `paid` moves Consumer forward.
  useEffect(() => {
    if (!order) return;
    if (order.status === 'paid' || order.status === 'picked_up') {
      setSnapRedirectUrl(null);
      navigation.replace('OrderDetail', { id: order._id });
    }
  }, [order, navigation]);

  if (order === undefined) {
    return (
      <View style={{ padding: 16, gap: 14 }}>
        <AppSkeleton height={90} borderRadius={radius.lg} />
        <AppSkeleton height={130} borderRadius={radius.lg} />
        <AppSkeleton height={130} borderRadius={radius.lg} />
      </View>
    );
  }

  if (order === null) {
    return (
      <View style={styles.emptyWrap}>
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

  const isHoldOver = hold.isExpired || order.status === 'expired';
  const isCancelled = order.status === 'cancelled';
  const isClosed = isHoldOver || isCancelled;
  const unitPrice = order.totalPrice / order.quantity;

  const handlePayment = async () => {
    if (isClosed) return;
    try {
      setPhase('preparing');
      const { redirectUrl } = await createTransaction({
        orderId: order._id as Id<'orders'>,
        sessionToken: sessionToken || undefined,
      });
      setSnapRedirectUrl(redirectUrl);
      setPhase('open');
    } catch (error) {
      setPhase('idle');
      toast.error(getErrorMessage(error, 'Gagal memulai pembayaran.'));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}
      >
        {isHoldOver ? (
          <View style={styles.expiredBox}>
            <Text style={styles.expiredTitle}>Waktu pembayaran habis</Text>
            <Text style={styles.expiredBody}>
              Reservasi dilepas otomatis dan paketnya dikembalikan ke stok.
            </Text>
            <AppButton
              variant="outline"
              size="sm"
              title="Jelajah Rescue Item"
              onPress={() =>
                navigation.navigate('ConsumerMain', { screen: 'Explore' })
              }
              style={{ marginTop: 12 }}
            />
          </View>
        ) : isCancelled ? (
          <AppCard>
            <Text style={styles.cardTitle}>Pesanan dibatalkan</Text>
            <Text style={styles.cardSub}>
              Pesanan ini sudah tidak bisa dibayar.
            </Text>
            <AppButton
              variant="outline"
              size="sm"
              title="Lihat pesanan lain"
              onPress={() =>
                navigation.navigate('ConsumerMain', { screen: 'Orders' })
              }
              style={{ marginTop: 12 }}
            />
          </AppCard>
        ) : (
          <View style={styles.holdBox}>
            <Clock size={20} color={colors.inProgress} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.holdLabel}>Selesaikan pembayaran dalam</Text>
              <Text style={styles.holdClock}>{hold.countdown ?? '--:--'}</Text>
              <Text style={styles.holdNote}>
                Setelah itu reservasi dilepas otomatis.
              </Text>
            </View>
          </View>
        )}

        <AppCard style={{ padding: 0, overflow: 'hidden' }}>
          <View style={styles.merchantHeader}>
            <Store size={15} color={colors.mutedForeground} />
            <Text style={styles.merchantHeaderText}>{order.merchantName}</Text>
          </View>
          <View style={styles.itemRow}>
            <Image
              source={toReactNativeImageSource(
                order.imageUrl ??
                  rescueItemImageForMaterialType(order.materialType),
              )}
              style={styles.itemThumb}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{order.itemName}</Text>
              <Text style={styles.cardSub}>{order.quantity} paket</Text>
              <Text style={styles.itemTotal}>{formatIdr(order.totalPrice)}</Text>
            </View>
          </View>
        </AppCard>

        <AppCard style={{ gap: 12 }}>
          <Text style={styles.cardTitle}>Informasi pengambilan</Text>
          <View style={styles.infoRow}>
            <Clock size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Waktu pengambilan</Text>
              <Text style={styles.cardSub}>
                {formatWibDate(order.pickupStartAt)},{' '}
                {formatPickupWindow(order.pickupStartAt, order.pickupEndAt)}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={16} color={colors.mutedForeground} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Lokasi merchant</Text>
              <Text style={styles.cardSub}>{order.merchantAddress}</Text>
            </View>
          </View>
        </AppCard>

        <AppCard style={{ gap: 8 }}>
          <Text style={styles.cardTitle}>Rincian pembayaran</Text>
          <View style={styles.priceLine}>
            <Text style={styles.cardSub}>Harga per paket</Text>
            <Text style={styles.priceNum}>{formatIdr(unitPrice)}</Text>
          </View>
          <View style={styles.priceLine}>
            <Text style={styles.cardSub}>Jumlah</Text>
            <Text style={styles.priceNum}>×{order.quantity}</Text>
          </View>
          <View style={[styles.priceLine, styles.totalLine]}>
            <Text style={styles.totalLabel}>Total tagihan</Text>
            <Text style={styles.totalVal}>{formatIdr(order.totalPrice)}</Text>
          </View>
          <Text style={styles.lockHint}>
            Total ini dikunci server saat reservasi dan tidak berubah di halaman
            ini.
          </Text>
        </AppCard>
      </ScrollView>

      <View
        style={[
          styles.payBar,
          { paddingBottom: Math.max(14, insets.bottom + 8) },
        ]}
      >
        <AppButton
          size="lg"
          loading={phase === 'preparing' || phase === 'awaiting_webhook'}
          disabled={isClosed || phase !== 'idle'}
          title={
            phase === 'preparing'
              ? 'Menyiapkan…'
              : phase === 'awaiting_webhook'
                ? 'Menunggu verifikasi…'
                : isHoldOver
                  ? 'Waktu habis'
                  : isCancelled
                    ? 'Pesanan dibatalkan'
                    : `Bayar ${formatIdr(order.totalPrice)}`
          }
          onPress={() => void handlePayment()}
        />
        {phase === 'awaiting_webhook' ? (
          <Text style={styles.webhookHint}>
            Kode pickup muncul otomatis setelah pembayaran terverifikasi server.
          </Text>
        ) : null}
      </View>

      {/* Midtrans Snap WebView Modal */}
      <Modal
        visible={snapRedirectUrl !== null}
        animationType="slide"
        onRequestClose={() => {
          setSnapRedirectUrl(null);
          setPhase((curr) => (curr === 'awaiting_webhook' ? curr : 'idle'));
        }}
      >
        <View style={[styles.webviewScreen, { paddingTop: insets.top }]}>
          <View style={styles.webviewHeader}>
            <Text style={styles.webviewTitle}>Pembayaran Midtrans</Text>
            <Pressable
              onPress={() => {
                setSnapRedirectUrl(null);
                setPhase((curr) =>
                  curr === 'awaiting_webhook' ? curr : 'idle',
                );
              }}
              accessibilityLabel="Tutup pembayaran"
              style={styles.webviewClose}
            >
              <X size={20} color={colors.foreground} />
            </Pressable>
          </View>
          {snapRedirectUrl ? (
            <WebView
              source={{ uri: snapRedirectUrl }}
              javaScriptEnabled
              domStorageEnabled
              onNavigationStateChange={(navState) => {
                const url = navState.url || '';
                if (
                  url.includes('/orders/') ||
                  url.includes('transaction_status=settlement') ||
                  url.includes('transaction_status=capture') ||
                  url.includes('transaction_status=pending')
                ) {
                  setSnapRedirectUrl(null);
                  setPhase('awaiting_webhook');
                }
              }}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

export default function CheckoutScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Checkout'>>();
  return (
    <QueryErrorBoundary title="Checkout tidak dapat dimuat">
      <CheckoutBody orderId={route.params.orderId} />
    </QueryErrorBoundary>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
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
    textAlign: 'center',
  },
  expiredBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.destructiveBorder,
    backgroundColor: colors.destructiveSoft,
    padding: 16,
  },
  expiredTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.destructive,
  },
  expiredBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.destructive,
  },
  holdBox: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.inProgressBorder,
    backgroundColor: colors.inProgressSoft,
    padding: 15,
  },
  holdLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  holdClock: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: 1.5,
  },
  holdNote: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.ink50,
  },
  merchantHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  itemThumb: {
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
  itemTotal: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  cardSub: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
  priceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceNum: {
    fontSize: 13,
    color: colors.foreground,
  },
  totalLine: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.foreground,
  },
  lockHint: {
    marginTop: 6,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  payBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  webhookHint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: colors.mutedForeground,
  },
  webviewScreen: {
    flex: 1,
    backgroundColor: colors.card,
  },
  webviewHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  webviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  webviewClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
