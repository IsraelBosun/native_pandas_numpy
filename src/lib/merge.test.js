import { describe, expect, it } from 'vitest';

import {
  isSyncableMetaKey,
  mergeAppMeta,
  mergeCardState,
  mergeCardStates,
  mergeMetaValue,
  remoteLogsToImport,
} from './merge';

function state(overrides = {}) {
  return {
    card_id: 'groupby_basic',
    ef: 2.5,
    interval: 0,
    reps: 0,
    due_date: '2026-07-01',
    last_grade: null,
    reviewed_at: null,
    favorite: 0,
    note: null,
    ...overrides,
  };
}

describe('mergeCardState', () => {
  it('takes the side reviewed most recently', () => {
    const local = state({ reviewed_at: '2026-07-01T10:00:00.000Z', interval: 1, reps: 1 });
    const remote = state({ reviewed_at: '2026-07-05T10:00:00.000Z', interval: 6, reps: 2 });
    expect(mergeCardState(local, remote)).toMatchObject({ interval: 6, reps: 2 });
  });

  it('keeps the local row on a tie', () => {
    const local = state({ reviewed_at: '2026-07-05T10:00:00.000Z', ef: 2.6 });
    const remote = state({ reviewed_at: '2026-07-05T10:00:00.000Z', ef: 2.1 });
    expect(mergeCardState(local, remote).ef).toBe(2.6);
  });

  it('lets a studied card beat one that was never studied', () => {
    const local = state({ reviewed_at: null, interval: 0 });
    const remote = state({ reviewed_at: '2026-07-05T10:00:00.000Z', interval: 15 });
    expect(mergeCardState(local, remote).interval).toBe(15);
  });

  it('stars the card if either side starred it', () => {
    const local = state({ favorite: 1, reviewed_at: '2026-07-01T10:00:00.000Z' });
    const remote = state({ favorite: 0, reviewed_at: '2026-07-05T10:00:00.000Z' });
    expect(mergeCardState(local, remote).favorite).toBe(1);
  });

  it('falls back to the losing side for a note the winner does not have', () => {
    const local = state({ note: 'watch the axis arg', reviewed_at: '2026-07-01T10:00:00.000Z' });
    const remote = state({ note: null, reviewed_at: '2026-07-05T10:00:00.000Z' });
    expect(mergeCardState(local, remote).note).toBe('watch the axis arg');
  });

  it('passes through when only one side has the card', () => {
    expect(mergeCardState(state({ ef: 1.9 }), null).ef).toBe(1.9);
    expect(mergeCardState(null, state({ ef: 1.9 })).ef).toBe(1.9);
  });
});

describe('mergeCardStates', () => {
  it('unions both sides by card id', () => {
    const local = [state({ card_id: 'a' }), state({ card_id: 'b' })];
    const remote = [state({ card_id: 'b' }), state({ card_id: 'c' })];
    const ids = mergeCardStates(local, remote).map((row) => row.card_id);
    expect(ids.sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('mergeMetaValue', () => {
  it('keeps the earliest unlock time for an achievement', () => {
    const merged = mergeMetaValue(
      'achievement:first_review',
      '2026-07-05T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z'
    );
    expect(merged).toBe('2026-06-01T00:00:00.000Z');
  });

  it('keeps the furthest lesson step', () => {
    expect(mergeMetaValue('lesson_step:groupby', '2', '5')).toBe('5');
    expect(mergeMetaValue('lesson_step:groupby', '7', '5')).toBe('7');
  });

  it('adopts a value present on only one side', () => {
    expect(mergeMetaValue('challenge_done:x', undefined, '1')).toBe('1');
    expect(mergeMetaValue('challenge_done:x', '1', undefined)).toBe('1');
  });
});

describe('mergeAppMeta', () => {
  it('never pulls device-local keys down from the cloud', () => {
    const merged = mergeAppMeta(
      [{ key: 'theme_preference', value: 'dark' }],
      [{ key: 'theme_preference', value: 'light' }, { key: 'reminder_notification_id', value: 'abc' }]
    );
    expect(merged.map((row) => row.key)).not.toContain('theme_preference');
    expect(merged.map((row) => row.key)).not.toContain('reminder_notification_id');
  });

  it('takes streak count and date together from the more recent side', () => {
    const merged = mergeAppMeta(
      [
        { key: 'streak_count', value: '3' },
        { key: 'last_study_date', value: '2026-07-01' },
      ],
      [
        { key: 'streak_count', value: '11' },
        { key: 'last_study_date', value: '2026-07-20' },
      ]
    );
    expect(merged).toEqual(
      expect.arrayContaining([
        { key: 'last_study_date', value: '2026-07-20' },
        { key: 'streak_count', value: '11' },
      ])
    );
  });

  it('keeps the longer run when both sides last studied the same day', () => {
    const merged = mergeAppMeta(
      [
        { key: 'streak_count', value: '3' },
        { key: 'last_study_date', value: '2026-07-20' },
      ],
      [
        { key: 'streak_count', value: '9' },
        { key: 'last_study_date', value: '2026-07-20' },
      ]
    );
    expect(merged).toContainEqual({ key: 'streak_count', value: '9' });
  });

  it('unions one-off progress flags', () => {
    const merged = mergeAppMeta(
      [{ key: 'challenge_done:sales_pipeline', value: '1' }],
      [{ key: 'lesson_seen:merge', value: '1' }]
    );
    expect(merged).toContainEqual({ key: 'challenge_done:sales_pipeline', value: '1' });
    expect(merged).toContainEqual({ key: 'lesson_seen:merge', value: '1' });
  });

  it('returns no streak rows when neither side has ever studied', () => {
    expect(mergeAppMeta([], [])).toEqual([]);
  });
});

describe('remoteLogsToImport', () => {
  it('skips rows this device already has locally', () => {
    const logs = [
      { device_id: 'device-a', client_id: 1 },
      { device_id: 'device-b', client_id: 1 },
    ];
    expect(remoteLogsToImport(logs, 'device-a')).toEqual([{ device_id: 'device-b', client_id: 1 }]);
  });
});

describe('isSyncableMetaKey', () => {
  it('excludes bookkeeping, includes progress', () => {
    expect(isSyncableMetaKey('sync_user_id')).toBe(false);
    expect(isSyncableMetaKey('schema_version')).toBe(false);
    expect(isSyncableMetaKey('streak_count')).toBe(true);
    expect(isSyncableMetaKey('achievement:first_review')).toBe(true);
  });

  // Notification permission is per-install: a second device must get its own
  // asks rather than inheriting a settled "no" from the first one.
  it('keeps reminder-prompt bookkeeping on the device', () => {
    expect(isSyncableMetaKey('reminder_prompt_count')).toBe(false);
    expect(isSyncableMetaKey('reminder_prompt_reviews')).toBe(false);
    expect(isSyncableMetaKey('reminder_prompt_settled')).toBe(false);
    expect(isSyncableMetaKey('notifications_enabled')).toBe(false);
  });
});
