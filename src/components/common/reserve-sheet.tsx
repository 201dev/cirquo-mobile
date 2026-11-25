import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Minus, Plus, ShieldCheck } from 'lucide-react-native';
import { AppButton, BottomSheetModal } from '@/components/ui/primitives';
import {
  formatIdr,
  formatKg,
  formatPickupWindow,
  formatWibDay,
} from '@/lib/format';
import { PAYMENT_HOLD_MS } from '@/lib/payment-hold';
import { colors, radius } from '@/theme/tokens';

const HOLD_MINUTES = PAYMENT_HOLD_MS / 60_000;

export type ReserveSheetItem = {
  name: string;
  merchantName: string;
  merchantAddress: string;
  currentPrice: number;
  remainingQuantity: number;
  weightPerItemGrams: number;
  pickupStartAt: number;
  pickupEndAt: number;
};

export function ReserveSheet({
  open,
  onClose,
  item,
  isSubmitting,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  item: ReserveSheetItem;
  isSubmitting: boolean;
  onConfirm: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const maxQuantity = item.remainingQuantity;
  const isUnavailable = maxQuantity <= 0;

  useEffect(() => {
    if (open) setQuantity(1);
  }, [open]);

  useEffect(() => {
    setQuantity((value) => Math.min(value, Math.max(1, maxQuantity)));
  }, [maxQuantity]);

  const subtotal = item.currentPrice * quantity;
  const weightGrams = item.weightPerItemGrams * quantity;

  return (
    <BottomSheetModal
      visible={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Reservasi Rescue Item"
      description={`Reservasi menahan porsi untukmu. Kamu punya ${HOLD_MINUTES} menit untuk membayar setelah ini.`}
    >
      <View style={styles.content}>
        <View>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.merchantMeta}>
            {item.merchantName} · {item.merchantAddress}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Waktu pickup</Text>
            <Text style={styles.infoValue}>
              {formatWibDay(item.pickupStartAt)},{' '}
              {formatPickupWindow(item.pickupStartAt, item.pickupEndAt)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Harga per paket</Text>
            <Text style={styles.infoValue}>{formatIdr(item.currentPrice)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Berat per paket</Text>
            <Text style={styles.infoValue}>
              {formatKg(item.weightPerItemGrams)}
            </Text>
          </View>
        </View>

        <View style={styles.stepperSection}>
          <View>
            <Text style={styles.stepperTitle}>Jumlah paket</Text>
            <Text style={styles.stepperHint}>
              {isUnavailable
                ? 'Stok sudah habis'
                : `${maxQuantity} tersisa saat ini`}
            </Text>
          </View>
          <View style={styles.stepperControls}>
            <AppButton
              variant="outline"
              size="icon"
              accessibilityLabel="Kurangi jumlah paket"
              disabled={quantity <= 1 || isSubmitting || isUnavailable}
              onPress={() => setQuantity((v) => Math.max(1, v - 1))}
            >
              <Minus size={18} color={colors.foreground} />
            </AppButton>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <AppButton
              variant="outline"
              size="icon"
              accessibilityLabel="Tambah jumlah paket"
              disabled={quantity >= maxQuantity || isSubmitting || isUnavailable}
              onPress={() => setQuantity((v) => Math.min(maxQuantity, v + 1))}
            >
              <Plus size={18} color={colors.foreground} />
            </AppButton>
          </View>
        </View>

        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total reservasi</Text>
            <Text style={styles.totalPrice}>{formatIdr(subtotal)}</Text>
          </View>
          <Text style={styles.totalWeight}>Berat total {formatKg(weightGrams)}</Text>
        </View>

        <AppButton
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting || isUnavailable}
          onPress={() => onConfirm(quantity)}
          title={
            isSubmitting
              ? 'Memproses reservasi…'
              : 'Reservasi & lanjut bayar'
          }
          leftIcon={
            !isSubmitting ? (
              <ShieldCheck size={18} color={colors.primaryForeground} />
            ) : undefined
          }
        />
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  merchantMeta: {
    marginTop: 3,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  infoBox: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    padding: 14,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'right',
    flexShrink: 1,
  },
  stepperSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stepperTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  stepperHint: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyValue: {
    width: 28,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.foreground,
  },
  totalWeight: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
