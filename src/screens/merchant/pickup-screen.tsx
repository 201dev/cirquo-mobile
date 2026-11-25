import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { KeyRound, UserRound } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { PageHeader } from '@/components/common/common-chrome';
import {
  AppButton,
  AppCard,
  AppInput,
  AppLabel,
  AppSkeleton,
  FieldError,
  ScreenScrollView,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getErrorMessage } from '@/lib/errors';
import { formatIdr, formatPickupWindow, formatWibDate } from '@/lib/format';
import { pickupCodeSchema } from '@/lib/validations';
import { colors, radius } from '@/theme/tokens';

export default function MerchantPickupScreen() {
  const toast = useToast();
  const { sessionToken } = useAuth();
  const pendingPickups = useQuery(
    api.orders.listForMerchant,
    sessionToken ? { sessionToken } : 'skip',
  );
  const confirmPickup = useMutation(api.orders.confirmPickup);

  const [orderId, setOrderId] = useState<Id<'orders'> | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedOrder = pendingPickups?.find((order) => order._id === orderId);

  const submit = async () => {
    const result = pickupCodeSchema.safeParse(code);
    if (!result.success) {
      setCodeError(
        result.error.issues[0]?.message ?? 'Kode pickup tidak valid.',
      );
      return;
    }
    if (!orderId || !sessionToken) {
      toast.error('Pilih pesanan yang akan dikonfirmasi.');
      return;
    }

    setCodeError(null);
    setIsSubmitting(true);
    try {
      await confirmPickup({ orderId, pickupCode: result.data, sessionToken });
      setOrderId(null);
      setCode('');
      toast.success('Pickup dikonfirmasi dan Rescue tercatat.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Pickup gagal dikonfirmasi.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenScrollView>
      <PageHeader
        title="Konfirmasi pickup"
        description="Masukkan kode 6 digit yang ditunjukkan konsumen saat tiba di merchant."
      />

      <AppCard style={{ marginBottom: 18, gap: 10 }}>
        <AppLabel>Kode pickup</AppLabel>
        <Text style={styles.selectedInfo}>
          {selectedOrder
            ? `${selectedOrder.itemName} · ${selectedOrder.consumerName}`
            : 'Pilih pesanan dari antrean di bawah terlebih dahulu.'}
        </Text>
        <View style={styles.inputRow}>
          <AppInput
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/\D/g, '').slice(0, 6));
              setCodeError(null);
            }}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            hasError={Boolean(codeError)}
            style={styles.codeInput}
          />
          <AppButton
            loading={isSubmitting}
            disabled={!selectedOrder || isSubmitting}
            title="Konfirmasi"
            leftIcon={
              !isSubmitting ? (
                <KeyRound size={16} color={colors.white} />
              ) : undefined
            }
            onPress={() => void submit()}
          />
        </View>
        <FieldError message={codeError} />
      </AppCard>

      <Text style={styles.queueTitle}>Menunggu pickup</Text>
      <Text style={styles.queueSub}>
        Pilih pesanan yang sudah dibayar. Kode hanya diverifikasi saat konsumen
        menunjukkannya.
      </Text>

      <View style={{ marginTop: 12, gap: 10 }}>
        {pendingPickups === undefined ? (
          [0, 1].map((idx) => (
            <AppSkeleton key={idx} height={96} borderRadius={radius.lg} />
          ))
        ) : pendingPickups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Belum ada pesanan berbayar yang menunggu pickup.
            </Text>
          </View>
        ) : (
          pendingPickups.map((order) => {
            const active = orderId === order._id;
            return (
              <Pressable
                key={order._id}
                onPress={() => setOrderId(order._id)}
                style={[styles.orderCard, active && styles.orderCardActive]}
              >
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderTitle}>{order.itemName}</Text>
                    <View style={styles.consumerRow}>
                      <UserRound size={14} color={colors.mutedForeground} />
                      <Text style={styles.consumerName}>
                        {order.consumerName}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.orderPrice}>
                    {formatIdr(order.totalPrice)}
                  </Text>
                </View>
                <Text style={styles.orderMeta}>
                  {order.quantity} paket · {formatWibDate(order.pickupStartAt)},{' '}
                  {formatPickupWindow(order.pickupStartAt, order.pickupEndAt)}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  selectedInfo: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  queueTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.foreground,
  },
  queueSub: {
    marginTop: 3,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  orderCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
  },
  orderCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.leaf50,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  consumerRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  consumerName: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  orderMeta: {
    marginTop: 10,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
