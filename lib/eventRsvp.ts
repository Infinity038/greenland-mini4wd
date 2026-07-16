// Free event RSVP — attendance estimation only. This module deliberately does
// NOT import anything from lib/loyalty.ts, lib/member.ts's ticket wallet, or any
// Supabase order/ticket table. An RSVP must never create a paid ticket, a
// digital ticket QR, a life, ticket inventory, loyalty points, or prize-pool
// revenue — see docs business rules ("PUBLIC EVENT FLOW").
//
// Persisted to localStorage only for this pass; once the live schema is
// reviewed, this can be mirrored into a proposed `event_rsvps` table without
// changing this module's public shape.

export interface EventRsvp {
  eventId: string;
  racerEmail: string;
  carId: string | null;
  carName: string | null;
  category: string;
  createdAt: string;
}

export interface RsvpInput {
  eventId: string;
  racerEmail: string;
  carId?: string | null;
  carName?: string | null;
  category: string;
}

const STORAGE_KEY = 'gm4wd_event_rsvps_v1';

// Pure constructor — has no side effects and touches no storage of any kind.
// Its return type intentionally has no ticket_id, points, life, or payment field.
export function createRsvp(input: RsvpInput): EventRsvp {
  return {
    eventId: input.eventId,
    racerEmail: input.racerEmail,
    carId: input.carId ?? null,
    carName: input.carName ?? null,
    category: input.category,
    createdAt: new Date().toISOString(),
  };
}

function readAll(): EventRsvp[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRsvp(rsvp: EventRsvp): void {
  if (typeof window === 'undefined') return;
  try {
    const all = readAll().filter(r => !(r.eventId === rsvp.eventId && r.racerEmail === rsvp.racerEmail));
    all.push(rsvp);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable/full — RSVP is best-effort attendance estimation only.
  }
}

export function getRsvpsForEvent(eventId: string): EventRsvp[] {
  return readAll().filter(r => r.eventId === eventId);
}

export function getRsvpForRacer(eventId: string, racerEmail: string): EventRsvp | null {
  return readAll().find(r => r.eventId === eventId && r.racerEmail === racerEmail) ?? null;
}
