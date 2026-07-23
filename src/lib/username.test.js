import { describe, expect, it } from 'vitest';

import { validateUsername } from './username';

describe('validateUsername', () => {
  it('accepts a plain alphanumeric name and trims it', () => {
    expect(validateUsername('  ada_lovelace ')).toEqual({ value: 'ada_lovelace' });
  });

  it('accepts letters, digits and underscores together', () => {
    expect(validateUsername('Panda_42')).toEqual({ value: 'Panda_42' });
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(validateUsername('')).toHaveProperty('error');
    expect(validateUsername('   ')).toHaveProperty('error');
    expect(validateUsername(null)).toHaveProperty('error');
    expect(validateUsername(undefined)).toHaveProperty('error');
  });

  it('rejects names shorter than 3 characters', () => {
    expect(validateUsername('ab')).toHaveProperty('error');
  });

  it('rejects names longer than 20 characters', () => {
    expect(validateUsername('a'.repeat(21))).toHaveProperty('error');
  });

  it('accepts names at the 3 and 20 character boundaries', () => {
    expect(validateUsername('abc')).toEqual({ value: 'abc' });
    expect(validateUsername('a'.repeat(20))).toEqual({ value: 'a'.repeat(20) });
  });

  it('rejects spaces and punctuation inside the name', () => {
    expect(validateUsername('ada lovelace')).toHaveProperty('error');
    expect(validateUsername('ada.lovelace')).toHaveProperty('error');
    expect(validateUsername('ada-lovelace')).toHaveProperty('error');
    expect(validateUsername('ada!')).toHaveProperty('error');
  });
});
