import { describe, expect, it } from 'vitest';

import { parseRecoveryLink } from './recovery-link';

const ACCESS = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.header.sig';
const REFRESH = 'v1-refresh-token_abc-DEF';

describe('parseRecoveryLink', () => {
  it('reads tokens from the fragment of a recovery link', () => {
    const url = `nativepandas://auth/reset-password#access_token=${ACCESS}&expires_in=3600&refresh_token=${REFRESH}&token_type=bearer&type=recovery`;
    expect(parseRecoveryLink(url)).toEqual({
      type: 'recovery',
      accessToken: ACCESS,
      refreshToken: REFRESH,
    });
  });

  it('also reads tokens when they arrive as query params', () => {
    const url = `nativepandas://auth/reset-password?type=recovery&access_token=${ACCESS}&refresh_token=${REFRESH}`;
    expect(parseRecoveryLink(url)).toEqual({
      type: 'recovery',
      accessToken: ACCESS,
      refreshToken: REFRESH,
    });
  });

  it('surfaces an expired/invalid link as a decoded error message', () => {
    const url =
      'nativepandas://auth/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    expect(parseRecoveryLink(url)).toEqual({
      type: 'error',
      message: 'Email link is invalid or has expired',
    });
  });

  it('returns null for a plain app launch with no auth params', () => {
    expect(parseRecoveryLink('nativepandas://')).toBeNull();
    expect(parseRecoveryLink('nativepandas://practice/challenge/groupby_pipeline')).toBeNull();
  });

  it('returns null for a recovery type missing its tokens', () => {
    expect(parseRecoveryLink('nativepandas://auth/reset-password#type=recovery')).toBeNull();
  });

  it('is null-safe on empty or non-string input', () => {
    expect(parseRecoveryLink('')).toBeNull();
    expect(parseRecoveryLink(null)).toBeNull();
    expect(parseRecoveryLink(undefined)).toBeNull();
  });
});
