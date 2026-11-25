import { useEffect, useState } from 'react';
import {
  formatHoldCountdown,
  formatHoldCountdownLabel,
  holdRemainingMs,
  paymentHoldExpiresAt,
} from '@/lib/payment-hold';

type HoldSource = {
  status: string;
  paymentHoldExpiresAt?: number | null;
  createdAt: number;
};

export function usePaymentHold(order: HoldSource | null | undefined) {
  const isReserved = order?.status === 'reserved';
  const expiresAt = order && isReserved ? paymentHoldExpiresAt(order) : null;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (expiresAt === null) return;

    setNow(Date.now());
    if (expiresAt <= Date.now()) return;

    const timer = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (tick >= expiresAt) clearInterval(timer);
    }, 1_000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (expiresAt === null) {
    return { remainingMs: null, isExpired: false, countdown: null, label: null };
  }

  const remainingMs = holdRemainingMs(expiresAt, now);

  return {
    remainingMs,
    isExpired: remainingMs === 0,
    countdown: formatHoldCountdown(remainingMs),
    label: formatHoldCountdownLabel(remainingMs),
  };
}
