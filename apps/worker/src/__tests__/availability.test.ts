import { describe, expect, it } from 'vitest';
import { buildAvailabilitySlots } from '@salon-harness/salon-domain';

describe('availability', () => {
  it('excludes overlapping reservations and keeps 15 minute starts', () => {
    const slots = buildAvailabilitySlots({
      date: '2026-05-15',
      durationMin: 60,
      businessHours: { open_time: '10:00', close_time: '13:00', is_closed: 0 },
      override: null,
      now: new Date('2026-05-14T00:00:00+09:00'),
      reservations: [
        {
          start_at: '2026-05-15T11:00:00+09:00',
          end_at: '2026-05-15T12:00:00+09:00',
          status: 'confirmed'
        }
      ]
    });

    expect(slots.map((s) => s.start_at)).toEqual([
      '2026-05-15T10:00:00+09:00',
      '2026-05-15T12:00:00+09:00'
    ]);
  });
});
