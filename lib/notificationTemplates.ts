// UI message templates for the registration/card lifecycle. Text only — no
// email/SMS sending is implemented here or anywhere in this codebase yet.

export type NotificationEvent =
  | 'registration_received'
  | 'registration_approved'
  | 'registration_requires_correction'
  | 'first_card_requested'
  | 'first_card_approved'
  | 'replacement_payment_required'
  | 'replacement_payment_confirmed'
  | 'card_in_production'
  | 'card_ready_for_pickup'
  | 'card_collected'
  | 'old_card_deactivated';

export interface NotificationTemplate {
  subject: string;
  body: string;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationEvent, NotificationTemplate> = {
  registration_received: {
    subject: 'Racer Profile registration received',
    body: 'Thanks for registering with Arctic Mini4WD. Your Racer Profile is under review — we will confirm once it is activated.',
  },
  registration_approved: {
    subject: 'Racer Profile activated',
    body: 'Your Racer Profile is now Active. You can now complete Race Check-In and redeem Loyalty rewards.',
  },
  registration_requires_correction: {
    subject: 'Racer Profile needs a correction',
    body: 'A staff member has flagged something on your Racer Profile that needs correcting before it can be activated. Please review your profile.',
  },
  first_card_requested: {
    subject: 'Racer Card request received',
    body: 'Your free physical Racer Card request has been received and is awaiting review.',
  },
  first_card_approved: {
    subject: 'Racer Card approved',
    body: 'Your physical Racer Card has been approved and will be produced soon.',
  },
  replacement_payment_required: {
    subject: 'Replacement card — payment required',
    body: 'Your replacement Racer Card request is awaiting the 25 DKK replacement fee. Production begins once payment is confirmed.',
  },
  replacement_payment_confirmed: {
    subject: 'Replacement payment confirmed',
    body: 'Your replacement card payment has been confirmed. Your previous card has been deactivated and the new one is queued for production.',
  },
  card_in_production: {
    subject: 'Racer Card in production',
    body: 'Your physical Racer Card is now in production.',
  },
  card_ready_for_pickup: {
    subject: 'Racer Card ready for pickup',
    body: 'Your physical Racer Card is ready — bring your Racer ID or digital QR to collect it at the venue.',
  },
  card_collected: {
    subject: 'Racer Card collected',
    body: 'Your physical Racer Card has been marked as collected. Welcome to the club!',
  },
  old_card_deactivated: {
    subject: 'Previous Racer Card deactivated',
    body: 'Your previous physical Racer Card has been deactivated and can no longer be used for Race Check-In or purchases.',
  },
};

export function getNotificationTemplate(event: NotificationEvent): NotificationTemplate {
  return NOTIFICATION_TEMPLATES[event];
}
