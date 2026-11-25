import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import { ChevronRight, Clock3, Plus } from 'lucide-react-native';
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
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { formatIdr, formatPickupWindow, formatWibDate } from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

function MerchantSurplusList({ onCreate }: { onCreate: () => void }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { sessionToken } = useAuth();
  const merchantItems = useQuery(
    api.surplusItems.listMine,
    sessionToken ? { sessionToken } : 'skip',
  );

  if (merchantItems === undefined) {
    return (
      <View style={{ gap: 10 }}>
        {[0, 1, 2].map((idx) => (
          <AppSkeleton key={idx} height={110} borderRadius={radius.lg} />
        ))}
      </View>
    );
  }

  if (merchantItems.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Belum ada Rescue Item</Text>
        <Text style={styles.emptySub}>
          Buat Rescue Item pertamamu untuk mulai menyelamatkan surplus.
        </Text>
        <AppButton
          variant="outline"
          title="Buat Rescue Item"
          leftIcon={<Plus size={16} color={colors.foreground} />}
          onPress={onCreate}
          style={{ marginTop: 14 }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {merchantItems.map((item) => (
        <Pressable
          key={item._id}
          onPress={() => navigation.navigate('SurplusDetail', { id: item._id })}
          style={({ pressed }) => [pressed && { opacity: 0.9 }]}
        >
          <AppCard style={{ padding: 14, gap: 8 }}>
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.processingOnly ? (
                  <Text style={styles.processingNote}>
                    Khusus Organic Processor
                  </Text>
                ) : null}
              </View>
              <StatusBadge status={item.status} />
            </View>

            <View style={styles.metaRow}>
              <Clock3 size={13} color={colors.mutedForeground} />
              <Text style={styles.metaText}>
                {formatWibDate(item.pickupStartAt)},{' '}
                {formatPickupWindow(item.pickupStartAt, item.pickupEndAt)}
              </Text>
            </View>

            <View style={styles.bottomRow}>
              <View style={styles.priceWrap}>
                <Text style={styles.price}>{formatIdr(item.currentPrice)}</Text>
                <Text style={styles.originalPrice}>
                  {formatIdr(item.originalPrice)}
                </Text>
              </View>
              <View style={styles.stockWrap}>
                <Text style={styles.stockText}>
                  Stok {item.remainingQuantity}/{item.initialQuantity}
                </Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </View>
            </View>
          </AppCard>
        </Pressable>
      ))}
    </View>
  );
}

export default function MerchantSurplusScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const isVerified =
    user?.profile?.type === 'merchant' &&
    user.profile.verificationStatus === 'verified';

  const openCreate = () => {
    if (!user?.profile) {
      navigation.navigate('Onboarding', { role: 'merchant' });
      return;
    }
    if (!isVerified) {
      navigation.navigate('PendingVerification');
      return;
    }
    navigation.navigate('CreateSurplus');
  };

  return (
    <ScreenScrollView>
      <PageHeader
        title="Rescue Item"
        description={`Kelola surplus yang masuk ke alur circular ${user?.name || 'merchant'}.`}
        action={
          <AppButton
            size="sm"
            title="Buat"
            leftIcon={<Plus size={15} color={colors.white} />}
            onPress={openCreate}
          />
        }
      />
      <QueryErrorBoundary title="Daftar Rescue Item tidak dapat dimuat">
        <MerchantSurplusList onCreate={openCreate} />
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
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.foreground,
  },
  emptySub: {
    marginTop: 5,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  processingNote: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  bottomRow: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.leaf700,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.ink500,
    textDecorationLine: 'line-through',
  },
  stockWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
  },
});
