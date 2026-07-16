// Builds a Points Activity entry from a confirmed in-person payment (race entry,
// second life, practice, house-car rental, snacks, etc.). Points are only ever
// derived from a CONFIRMED payment — never from an RSVP, which has no amount and
// is not a payment at all (see lib/eventRsvp.ts).
import { calculateLoyaltyPoints } from './loyaltyPoints';
import type { PointsActivityEntry } from '@/components/racer/PointsActivityList';

export interface ConfirmedInPersonPayment {
  id: string;
  date: string;
  description: string;
  amountDkk: number;
  reference?: string;
}

export function buildConfirmedPaymentActivityEntry(payment: ConfirmedInPersonPayment): PointsActivityEntry {
  return {
    id: payment.id,
    date: payment.date,
    description: payment.description,
    channel: 'In person',
    amountDkk: payment.amountDkk,
    pointsDelta: calculateLoyaltyPoints(payment.amountDkk),
    status: 'Confirmed',
    reference: payment.reference,
  };
}
