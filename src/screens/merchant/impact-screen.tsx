import React from 'react';
import {
  PageHeader,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import { MerchantImpactSummary } from '@/components/common/merchant-impact-summary';
import { ScreenScrollView } from '@/components/ui/primitives';

export default function MerchantImpactScreen() {
  return (
    <ScreenScrollView>
      <PageHeader
        title="Dampak Merchant"
        description="Bukti material Rescue Item milikmu, dihitung reaktif dari Material Flow Ledger."
      />
      <QueryErrorBoundary title="Dampak Merchant tidak dapat dimuat">
        <MerchantImpactSummary />
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}
