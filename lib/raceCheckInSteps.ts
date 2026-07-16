// Beginner-facing explanation of the Race Check-In process. Pure/static content —
// no schema or payment dependency. Kept separate from lib/raceEntryPricing.ts
// because this text is specific to the Race Check-In page's walkthrough.

export interface RaceCheckInStep {
  step: number;
  title: string;
  desc: string;
}

export const RACE_CHECK_IN_STEPS: RaceCheckInStep[] = [
  { step: 1, title: 'Create your Racer Profile', desc: 'Register once for free to get your Racer ID. This is required before you can race.' },
  { step: 2, title: 'Register your car', desc: 'Add your car in the Garage and wait for staff approval and a Club Car ID.' },
  { step: 3, title: 'RSVP (optional)', desc: 'Let the club know you plan to attend. This is free and is not a paid entry.' },
  { step: 4, title: 'Arrive at the venue', desc: 'Bring your registered car and your Racer ID, Racer Card, or QR code.' },
  { step: 5, title: 'Go to Race Check-In', desc: 'Find the Race Check-In table at the venue before racing begins.' },
  { step: 6, title: 'Show your Racer identity', desc: 'Staff scan your QR code or look up your Racer ID, name, or Club Car ID.' },
  { step: 7, title: 'Pay your race entry in person', desc: 'Pay the first-entry fee at the venue — never online.' },
  { step: 8, title: 'Add a Second Life (optional)', desc: 'Pay the Second Life fee before check-in closes, for the same car, category, and event only.' },
  { step: 9, title: 'Staff confirms your entry', desc: 'Staff mark your category and confirm you are checked in to race.' },
  { step: 10, title: 'Race!', desc: 'Your results and points are recorded to your Racer Profile after the event.' },
];

export const RACE_CHECK_IN_NOTICE =
  'Race entry is paid in person during Race Check-In. The website does not sell digital race tickets.';
