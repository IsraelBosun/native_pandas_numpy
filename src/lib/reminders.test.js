import { describe, expect, it } from 'vitest';

import { bucketDueByDate, DEFAULT_HOUR, planReminders, preferredHour, PLAN_DAYS } from './reminders';

const TODAY = '2026-08-15';

function plan(overrides = {}) {
  return planReminders({
    dueDates: [],
    reviewHours: [],
    streak: 0,
    lastStudyDate: null,
    today: TODAY,
    ...overrides,
  });
}

describe('bucketDueByDate', () => {
  it('rolls overdue cards onto today, matching what the queue shows', () => {
    const buckets = bucketDueByDate(['2026-08-01', '2026-08-14', TODAY], TODAY);
    expect(buckets.get(TODAY)).toBe(3);
  });

  it('ignores dates past the planning horizon', () => {
    const buckets = bucketDueByDate(['2026-09-30'], TODAY);
    expect(buckets.size).toBe(0);
  });

  it('counts the last day of the window as inside it', () => {
    const buckets = bucketDueByDate(['2026-08-21'], TODAY); // today + 6, PLAN_DAYS = 7
    expect(buckets.get('2026-08-21')).toBe(1);
  });

  it('survives null and missing input', () => {
    expect(bucketDueByDate(undefined, TODAY).size).toBe(0);
    expect(bucketDueByDate([null], TODAY).size).toBe(0);
  });
});

describe('preferredHour', () => {
  it('falls back to the default until there is enough history', () => {
    expect(preferredHour([20, 20, 20, 20])).toBe(DEFAULT_HOUR);
  });

  it('learns the modal hour and fires an hour early', () => {
    expect(preferredHour([20, 20, 20, 20, 20])).toBe(19);
  });

  it('is not dragged off by a single outlier session', () => {
    expect(preferredHour([20, 20, 20, 20, 20, 3])).toBe(19);
  });

  it('never lands in the middle of the night', () => {
    expect(preferredHour([2, 2, 2, 2, 2])).toBe(8);
  });

  it('ignores malformed hours', () => {
    expect(preferredHour([99, -4, null, 20, 20, 20, 20, 20])).toBe(19);
  });
});

describe('planReminders', () => {
  it('says nothing when nothing is due — the whole point', () => {
    expect(plan()).toEqual([]);
  });

  it('schedules only the days that actually have cards', () => {
    const result = plan({ dueDates: ['2026-08-17', '2026-08-17', '2026-08-19'] });
    expect(result.map((entry) => entry.date)).toEqual(['2026-08-17', '2026-08-19']);
  });

  it('states the real due count in the copy', () => {
    const [entry] = plan({ dueDates: [TODAY, TODAY, TODAY] });
    expect(`${entry.title} ${entry.body}`).toContain('3 cards');
  });

  it('singularises a lone card', () => {
    const [entry] = plan({ dueDates: [TODAY] });
    expect(`${entry.title} ${entry.body}`).toContain('1 card ');
  });

  it('varies copy across consecutive days so it does not go blind', () => {
    const result = plan({ dueDates: ['2026-08-16', '2026-08-17'] });
    expect(result[0].title).not.toBe(result[1].title);
  });

  it('never books more than one reminder per day', () => {
    const dueDates = Array.from({ length: 40 }, () => TODAY);
    const dates = plan({ dueDates }).map((entry) => entry.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('stays inside the pending-notification budget', () => {
    const dueDates = [];
    for (let offset = 0; offset < 60; offset += 1) {
      dueDates.push(`2026-08-${String(15 + (offset % 16)).padStart(2, '0')}`);
    }
    expect(plan({ dueDates }).length).toBeLessThanOrEqual(PLAN_DAYS);
  });

  it('returns entries in ascending date order', () => {
    const result = plan({ dueDates: ['2026-08-20', '2026-08-16', '2026-08-18'] });
    expect(result.map((e) => e.date)).toEqual(['2026-08-16', '2026-08-18', '2026-08-20']);
  });

  describe('streak rescue', () => {
    const yesterday = '2026-08-14';

    it('warns late when a live streak has not been renewed today', () => {
      const [entry] = plan({ streak: 30, lastStudyDate: yesterday, dueDates: [TODAY] });
      expect(entry.date).toBe(TODAY);
      expect(entry.title).toContain('30 day');
      expect(entry.hour).toBeGreaterThanOrEqual(20);
    });

    it('replaces the ordinary reminder rather than doubling up', () => {
      const result = plan({ streak: 30, lastStudyDate: yesterday, dueDates: [TODAY, TODAY] });
      expect(result.filter((entry) => entry.date === TODAY)).toHaveLength(1);
    });

    it('stays quiet once today has already been studied', () => {
      const result = plan({ streak: 30, lastStudyDate: TODAY, dueDates: [TODAY] });
      expect(result[0].title).not.toContain('streak');
    });

    it('does not resurrect a streak that already lapsed', () => {
      const result = plan({ streak: 30, lastStudyDate: '2026-08-01', dueDates: [TODAY] });
      expect(result[0].title).not.toContain('streak');
    });

    it('does not fire for a one-day streak — nothing at stake yet', () => {
      const result = plan({ streak: 1, lastStudyDate: yesterday, dueDates: [TODAY] });
      expect(result[0].title).not.toContain('streak');
    });

    it('warns even on a day with no cards due, since the deadline is real', () => {
      const result = plan({ streak: 5, lastStudyDate: yesterday, dueDates: [] });
      expect(result[0].title).toContain('streak');
    });
  });

  describe('lapse ladder', () => {
    // The case the due-day window alone cannot cover: someone studies once and
    // never opens the app again, so nothing ever reschedules.
    const studiedToday = TODAY;

    function lapseOnly(result) {
      return result.filter((entry) => entry.date > addDaysISO(TODAY, 6));
    }

    function addDaysISO(dateISO, days) {
      const [y, m, d] = dateISO.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    }

    it('books win-back reminders beyond the due-day window', () => {
      const result = plan({ lastStudyDate: studiedToday, dueDates: [TODAY] });
      expect(lapseOnly(result).length).toBeGreaterThan(0);
    });

    it('reaches about a month out, so silence is not permanent', () => {
      const result = plan({ lastStudyDate: studiedToday, dueDates: [] });
      expect(result.at(-1).date).toBe('2026-09-14'); // today + 30
    });

    it('stays few — a nudge, not a drip', () => {
      const result = plan({ lastStudyDate: studiedToday, dueDates: [] });
      expect(result.length).toBeLessThanOrEqual(4);
    });

    it('dates the ladder from the last study day, not from today', () => {
      // Opened the app today but last studied 2 days ago: the 3-day rung is
      // tomorrow, not 3 days from now.
      const result = plan({ lastStudyDate: '2026-08-13', dueDates: [] });
      expect(result[0].date).toBe('2026-08-16');
    });

    it('drops rungs that are already in the past', () => {
      const result = plan({ lastStudyDate: '2026-08-01', dueDates: [] });
      expect(result.every((entry) => entry.date > TODAY)).toBe(true);
    });

    it('says nothing to someone who has never studied', () => {
      expect(plan({ lastStudyDate: null, dueDates: [] })).toEqual([]);
    });

    it('never books two notifications on the same day', () => {
      const dueDates = Array.from({ length: 30 }, (_, i) => addDaysISO(TODAY, i % 7));
      const dates = plan({ lastStudyDate: studiedToday, dueDates }).map((e) => e.date);
      expect(new Set(dates).size).toBe(dates.length);
    });

    it('stays well inside the 64-slot pending budget', () => {
      const dueDates = Array.from({ length: 200 }, (_, i) => addDaysISO(TODAY, i % 40));
      expect(plan({ lastStudyDate: studiedToday, dueDates }).length).toBeLessThanOrEqual(11);
    });

    it('keeps the whole plan in date order', () => {
      const result = plan({ lastStudyDate: studiedToday, dueDates: ['2026-08-17', TODAY] });
      const dates = result.map((e) => e.date);
      expect([...dates].sort()).toEqual(dates);
    });

    it('mentions the ended streak only when there was a real one', () => {
      const withStreak = plan({ lastStudyDate: studiedToday, streak: 12, dueDates: [] });
      const withoutStreak = plan({ lastStudyDate: studiedToday, streak: 0, dueDates: [] });
      expect(withStreak.some((e) => e.title.includes('streak'))).toBe(true);
      expect(withoutStreak.some((e) => e.title.includes('streak'))).toBe(false);
    });

    it('opens gently rather than with stakes', () => {
      const [first] = plan({ lastStudyDate: studiedToday, streak: 12, dueDates: [] });
      expect(first.title).toBe('Pick up where you left off');
    });

    // Found by printing a plan and reading it, not by a test: a rung fired on
    // elapsed days alone, so a user mid-schedule got "pick up where you left
    // off" on a day that still had a due-day reminder coming.
    it('never win-backs a user who still has due-day reminders ahead', () => {
      const result = plan({
        lastStudyDate: studiedToday,
        dueDates: ['2026-08-17', '2026-08-20'],
      });
      const lastDue = '2026-08-20';
      const early = result.filter((e) => e.date <= lastDue && e.title.includes('Pick up'));
      expect(early).toEqual([]);
    });

    it('still ladders once the due days run out', () => {
      const result = plan({ lastStudyDate: studiedToday, dueDates: ['2026-08-17'] });
      expect(result.some((e) => e.date > '2026-08-17')).toBe(true);
    });

    it('respects quiet hours like every other reminder', () => {
      const result = plan({
        lastStudyDate: studiedToday,
        dueDates: [],
        reviewHours: [2, 2, 2, 2, 2],
      });
      expect(result.every((entry) => entry.hour >= 8 && entry.hour <= 21)).toBe(true);
    });
  });
});
