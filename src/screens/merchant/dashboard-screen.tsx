import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import {
  AlertBanner,
  PageHeader,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import { MerchantImpactSummary } from '@/components/common/merchant-impact-summary';
import { AppButton, ScreenScrollView } from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import type { RootStackParamList } from '@/navigation/types';
import { colors } from '@/theme/tokens';

export default function MerchantDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const merchantName =
    user?.profile?.type === 'merchant' ? user.profile.name : 'Merchant';
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
        title={`Ringkasan ${merchantName}`}
        description="Lacak setiap Rescue Item dari material tercatat hingga pickup atau outcome pengolahan."
        action={
          <AppButton
            size="sm"
            title="Buat"
            leftIcon={<Plus size={15} color={colors.white} />}
            onPress={openCreate}
          />
        }
      />

      {!isVerified ? (
        <View style={{ marginBottom: 14 }}>
          <AlertBanner
            tone="warning"
            title="Profil usaha belum terverifikasi"
            body="Pembuatan Rescue Item dan konfirmasi pickup terbuka setelah Admin memverifikasi akun Merchant."
          />
        </View>
      ) : null}

      <QueryErrorBoundary title="Dampak Merchant tidak dapat dimuat">
        <MerchantImpactSummary onCreateSurplus={openCreate} />
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}
