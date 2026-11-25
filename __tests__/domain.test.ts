import { suggestRescuePrice, type MaterialType } from '@/lib/pricing';
import { calculateHaversineDistanceMeters } from '@/lib/geo';
import { summariseLedger } from '@/lib/impact';
import { checkItemLedgerIntegrity } from '@/lib/ledger-integrity';
import {
  formatHoldCountdown,
  holdRemainingMs,
  isHoldExpired,
  PAYMENT_HOLD_MS,
} from '@/lib/payment-hold';
import {
  formatDistance,
  formatIdr,
  formatKg,
  formatPickupWindow,
  formatWeight,
} from '@/lib/format';
import { groupOrdersByActivity } from '@/lib/orders';
import { rankEligibleProcessors } from '@/lib/routing';
import { intakeResult, outcomeResult } from '@/lib/recovery';
import { reviewReasonError } from '@/lib/admin-review';
import { parseHrefToRoute } from '@/navigation/types';
import { generateIdempotencyKey } from '@/lib/uuid';

describe('Cirquo mobile migrated domain logic', () => {
  test('Dynamic Rescue Pricing respects floor price and urgency', () => {
    const HOUR = 3_600_000;
    const START = 1_770_000_000_000;
    const baseInput = {
      originalPrice: 20_000,
      floorPrice: 5_000,
      pickupStartAt: START,
      pickupEndAt: START + 4 * HOUR,
      initialQuantity: 10,
      materialType: 'prepared_food' as MaterialType,
    };

    const startRes = suggestRescuePrice({
      ...baseInput,
      now: START,
      remainingQuantity: 10,
    });
    expect(startRes.suggestedPrice).toBe(10_000);
    expect(startRes.discountPercent).toBe(50);

    const floorRes = suggestRescuePrice({
      ...baseInput,
      floorPrice: 15_000,
      now: START + 4 * HOUR,
      remainingQuantity: 10,
    });
    expect(floorRes.suggestedPrice).toBe(15_000);
    expect(floorRes.clampedByFloor).toBe(true);
  });

  test('Haversine distance computes Semarang coordinates accurately', () => {
    const meters = calculateHaversineDistanceMeters(
      -7.052,
      110.44,
      -6.9932,
      110.4203,
    );
    expect(meters).toBeGreaterThan(6_000);
    expect(meters).toBeLessThan(8_000);
  });

  test('Material Flow Ledger conservation and integrity check', () => {
    const entries = [
      {
        surplusItemId: 'item_1',
        eventType: 'LISTED',
        weightDeltaGrams: 1_000,
        occurredAt: 1_000,
      },
      {
        surplusItemId: 'item_1',
        orderId: 'order_1',
        eventType: 'PAID',
        weightDeltaGrams: 0,
        occurredAt: 2_000,
      },
      {
        surplusItemId: 'item_1',
        orderId: 'order_1',
        eventType: 'RESCUED',
        weightDeltaGrams: -1_000,
        occurredAt: 3_000,
        metadata: JSON.stringify({
          quantity: 2,
          totalPrice: 20_000,
          originalPriceSnapshot: 20_000,
        }),
      },
    ];
    const summary = summariseLedger(entries);
    expect(summary.rescuedGrams).toBe(1_000);
    expect(summary.consumerSavingsIdr).toBe(20_000);
    expect(summary.integrity.isValid).toBe(true);
    expect(checkItemLedgerIntegrity('closed', entries, summary)).toHaveLength(0);
  });

  test('Payment hold countdown & order activity grouping', () => {
    const now = 1_700_000_000_000;
    const rem = holdRemainingMs(now + PAYMENT_HOLD_MS, now);
    expect(formatHoldCountdown(rem)).toBe('15:00');
    expect(isHoldExpired(now - 1, now)).toBe(true);

    const grouped = groupOrdersByActivity([
      { status: 'reserved' },
      { status: 'paid' },
      { status: 'picked_up' },
      { status: 'cancelled' },
    ]);
    expect(grouped.active).toHaveLength(2);
    expect(grouped.past).toHaveLength(2);
  });

  test('Circular routing ranks nearest eligible verified processor', () => {
    const ranked = rankEligibleProcessors(
      {
        offeredWeightGrams: 5_000,
        attemptedProcessorIds: [],
        declinedByProcessorIds: [],
      },
      { materialType: 'bakery' },
      { latitude: -7.052, longitude: 110.44 },
      [
        {
          id: 'p_far',
          verificationStatus: 'verified',
          acceptedMaterialTypes: ['bakery'],
          latitude: -6.99,
          longitude: 110.42,
          maxPickupRadiusMeters: 20_000,
          dailyCapacityGrams: 50_000,
          committedGrams: 0,
        },
        {
          id: 'p_near',
          verificationStatus: 'verified',
          acceptedMaterialTypes: ['bakery'],
          latitude: -7.055,
          longitude: 110.442,
          maxPickupRadiusMeters: 20_000,
          dailyCapacityGrams: 50_000,
          committedGrams: 0,
        },
      ],
    );
    expect(ranked[0]?.processorId).toBe('p_near');
  });

  test('Processor intake & outcome reconciliation', () => {
    const intake = intakeResult(4_800, 5_000);
    expect(intake?.varianceGrams).toBe(-200);
    const outcome = outcomeResult({
      acceptedWeightGrams: 4_800,
      outputWeightGrams: 3_600,
      residualWeightGrams: 400,
    });
    expect(outcome?.processLossGrams).toBe(800);
    expect(outcome?.conversionRatePercent).toBe(75);
  });

  test('Format helpers render Indonesian IDR, weight, distance, and WIB times', () => {
    expect(formatIdr(22_000)).toBe('Rp22.000');
    expect(formatKg(1_500)).toBe('1,5 kg');
    expect(formatWeight(480)).toBe('480 g');
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(2_400)).toBe('2,4 km');
    // 10:00 UTC = 17:00 WIB, 12:00 UTC = 19:00 WIB
    const startUtc = Date.UTC(2026, 7, 27, 10, 0);
    const endUtc = Date.UTC(2026, 7, 27, 12, 0);
    expect(formatPickupWindow(startUtc, endUtc)).toBe('17.00-19.00 WIB');
  });

  test('Admin review validation, href routing, and UUID generator', () => {
    expect(reviewReasonError('kurang')).not.toBeNull();
    expect(reviewReasonError('Alasan penolakan lengkap dan jelas')).toBeNull();
    expect(parseHrefToRoute('/orders/abc123', 'consumer')).toEqual({
      name: 'OrderDetail',
      params: { id: 'abc123' },
    });
    expect(parseHrefToRoute('/processor/recovery/batch_9', 'processor')).toEqual({
      name: 'RecoveryDetail',
      params: { id: 'batch_9' },
    });
    expect(generateIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
