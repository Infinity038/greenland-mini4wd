// Mock event directory for the Event QR "select the current event" flow.
// Scanning an Event QR fills in the event context so a payment can never be
// recorded against the wrong event. Not wired to any live table.
import type { EventTier } from './raceEntryPricing';

export interface PosEventRecord {
  eventId: string;
  qrToken: string;
  name: string;
  date: string;
  type: 'weekly' | 'big_event' | 'practice';
  categoryOptions: string[];
  checkInClosesAt: string;
  pricingModel: EventTier;
}

export const MOCK_EVENT_DIRECTORY: PosEventRecord[] = [
  {
    eventId: 'EVT-2026-07-18',
    qrToken: 'tok_event_weekly_260718',
    name: 'Weekly Race Night',
    date: '2026-07-18',
    type: 'weekly',
    categoryOptions: ['Box Stock', 'Open Box Stock', 'B-MAX', 'Open Class'],
    checkInClosesAt: '2026-07-18T18:00:00+00:00',
    pricingModel: 'weekly',
  },
  {
    eventId: 'EVT-2026-08-15',
    qrToken: 'tok_event_bigevent_260815',
    name: 'Arctic Hustle Championship',
    date: '2026-08-15',
    type: 'big_event',
    categoryOptions: ['Box Stock', 'Open Box Stock', 'B-MAX', 'Open Class'],
    checkInClosesAt: '2026-08-15T17:00:00+00:00',
    pricingModel: 'big_event',
  },
];

export function lookupEventByQrToken(token: string, directory: PosEventRecord[] = MOCK_EVENT_DIRECTORY): PosEventRecord | null {
  return directory.find(e => e.qrToken === token) ?? null;
}

export function searchEvents(query: string, directory: PosEventRecord[] = MOCK_EVENT_DIRECTORY): PosEventRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return directory;
  return directory.filter(e => e.name.toLowerCase().includes(q) || e.eventId.toLowerCase().includes(q));
}
