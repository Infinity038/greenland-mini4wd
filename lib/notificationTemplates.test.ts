import { describe, expect, it } from 'vitest';
import { NOTIFICATION_TEMPLATES, getNotificationTemplate, type NotificationEvent } from './notificationTemplates';

const REQUIRED_EVENTS: NotificationEvent[] = [
  'registration_received',
  'registration_approved',
  'registration_requires_correction',
  'first_card_requested',
  'first_card_approved',
  'replacement_payment_required',
  'replacement_payment_confirmed',
  'card_in_production',
  'card_ready_for_pickup',
  'card_collected',
  'old_card_deactivated',
];

describe('NOTIFICATION_TEMPLATES', () => {
  it('has a non-empty subject and body for every required lifecycle event', () => {
    for (const event of REQUIRED_EVENTS) {
      const template = getNotificationTemplate(event);
      expect(template.subject.length).toBeGreaterThan(0);
      expect(template.body.length).toBeGreaterThan(0);
    }
  });

  it('covers exactly the required set of events, no more, no less', () => {
    expect(Object.keys(NOTIFICATION_TEMPLATES).sort()).toEqual([...REQUIRED_EVENTS].sort());
  });
});
