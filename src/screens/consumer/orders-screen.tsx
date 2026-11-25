import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, Clock3, MapPin } from 'lucide-react-native';
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
import {
  useMyOrders,
  type ConsumerOrderSummary,
} from '@/features/orders/use-consumer-orders';
import { usePaymentHold } from '@/features/orders/use-payment-hold';
import { formatIdr, formatPickupWindow, formatWibDate } from '@/lib/format';
import { groupOrdersByActivity } from '@/lib/orders';
import {
  rescueItemImageForMaterialType,
  toReactNativeImageSource,
} from '@/lib/rescue-item-images';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function OrderCard({ order }: { order: ConsumerOrderSummary }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const hold = usePaymentHold(order);
  const needsPayment = order.status === 'reserved' && !hold.isExpired;

  return (
    <AppCard style={{ padding: 14, gap: 10 }}>
      <View style={styles.topRow}>
        <Image
          source={toReactNativeImageSource(
            order.imageUrl ?? rescueItemImageForMaterialType(order.materialType),
          )}
          style={styles.thumb}
          resizeMode="cover"
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.badgeRow}>
            <StatusBadge status={order.status} />
            <Text style={styles.qtyText}>{order.quantity} paket</Text>
          </View>
          <Text numberOfLines={1} style={styles.itemName}>
            {order.itemName}
          </Text>
          <View style={styles.metaRow}>
            <MapPin size={12} color={colors.mutedForeground} />
            <Text numberOfLines={1} style={styles.metaText}>
              {order.merchantName}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Clock3 size={12} color={colors.mutedForeground} />
            <Text numberOfLines={1} style={styles.metaText}>
              {formatWibDate(order.pickupStartAt)},{' '}
              {formatPickupWindow(order.pickupStartAt, order.pickupEndAt)}
            </Text>
          </View>
        </View>
      </View>

      {order.status === 'reserved' ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            {needsPayment
              ? `Belum dibayar · sisa waktu ${hold.countdown}`
              : 'Waktu pembayaran habis. Reservasi sedang dilepas.'}
          </Text>
        </View>
      ) : null}

      {order.status === 'expired' && order.refundStatus ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Pickup tidak dilakukan ·{' '}
            {order.refundStatus === 'succeeded'
              ? 'refund Sandbox telah diproses.'
              : order.refundStatus === 'failed'
                ? 'refund Sandbox perlu ditindaklanjuti.'
                : 'refund Sandbox sedang diproses.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.price}>{formatIdr(order.totalPrice)}</Text>
        {needsPayment ? (
          <AppButton
            size="sm"
            title="Bayar sekarang"
            onPress={() => navigation.navigate('Checkout', { orderId: order._id })}
          />
        ) : (
          <AppButton
            variant="ghost"
            size="sm"
            title="Detail"
            rightIcon={<ArrowRight size={14} color={colors.foreground} />}
            onPress={() => navigation.navigate('OrderDetail', { id: order._id })}
          />
        )}
      </View>
    </AppCard>
  );
}

function OrdersBody() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const orders = useMyOrders();
  const [tab, setTab] = useState<'active' | 'past'>('active');

  if (orders === undefined) {
    return (
      <View style={{ gap: 12 }}>
        {[0, 1, 2].map((idx) => (
          <AppSkeleton key={idx} height={140} borderRadius={radius.lg} />
        ))}
      </View>
    );
  }

  const { active, past } = groupOrdersByActivity(orders);
  const currentList = tab === 'active' ? active : past;

  return (
    <View style={{ gap: 14 }}>
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          {
            value: 'active',
            label: `Aktif${active.length > 0 ? ` (${active.length})` : ''}`,
          },
          { value: 'past', label: 'Riwayat' },
        ]}
      />

      {currentList.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {tab === 'active'
              ? 'Belum ada pesanan aktif.'
              : 'Riwayat pesananmu masih kosong.'}
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
      ) : (
        <View style={{ gap: 12 }}>
          {currentList.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function OrdersScreen() {
  return (
    <ScreenScrollView>
      <PageHeader
        title="Pesananmu"
        description="Bayar reservasi sebelum waktunya habis, lalu ambil langsung di merchant. Kode pickup ada di detail pesanan."
      />
      <QueryErrorBoundary title="Daftar pesanan tidak dapat dimuat">
        <OrdersBody />
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumb: {
    width: 78,
    height: 78,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  itemName: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  metaRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  infoBanner: {
    borderRadius: radius.md,
    backgroundColor: colors.inProgressSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
