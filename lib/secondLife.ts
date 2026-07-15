// Reference implementation of Second Life eligibility rules. Pure predicate
// functions only — not wired into any live purchase/race-entry flow yet.

export interface SecondLifeEventState {
  checkInClosed: boolean;
  racerEliminated: boolean;
  finalBracketAnnounced: boolean;
  prizePoolAnnounced: boolean;
  raceStarted: boolean;
}

export interface SecondLifePurchaseEligibility {
  eligible: boolean;
  reason?: string;
}

// A Second Life may only be purchased before check-in closes, and never once the
// racer is eliminated, the final bracket is announced, the prize pool has been
// announced, or the race has begun — whichever comes first.
export function canPurchaseSecondLife(state: SecondLifeEventState): SecondLifePurchaseEligibility {
  if (state.checkInClosed) return { eligible: false, reason: 'Check-in has closed.' };
  if (state.racerEliminated) return { eligible: false, reason: 'Racer has already been eliminated.' };
  if (state.finalBracketAnnounced) return { eligible: false, reason: 'The final bracket has been announced.' };
  if (state.prizePoolAnnounced) return { eligible: false, reason: 'The final prize pool has been announced.' };
  if (state.raceStarted) return { eligible: false, reason: 'The race has already begun.' };
  return { eligible: true };
}

export interface SecondLifeScope {
  racerId: string;
  carId: string;
  category: string;
  eventDate: string;
}

// A Second Life is valid only for the exact racer + car + category + event date it
// was purchased for — it cannot be transferred, moved to another car, or carried
// to another event.
export function isSecondLifeUsableFor(purchased: SecondLifeScope, attempted: SecondLifeScope): boolean {
  return (
    purchased.racerId === attempted.racerId &&
    purchased.carId === attempted.carId &&
    purchased.category === attempted.category &&
    purchased.eventDate === attempted.eventDate
  );
}

// A Second Life expires the moment its event ends, regardless of whether it was used.
export function isSecondLifeExpired(eventEndedAt: string, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(eventEndedAt).getTime();
}
