import { Platform } from 'react-native';

import { getStoreReviewState, getTotalReviewCount, recordStoreReviewAsk } from './cards';
import { todayISO } from './date';
import { shouldRequestReview } from './review-prompt';

// Thin layer over expo-store-review: policy lives in review-prompt.js, this
// only reads state and performs the request.

// Loaded on demand for the same reason as expo-notifications — keep native
// modules off the app's import graph so startup stays clean.
function loadStoreReview() {
  return require('expo-store-review');
}

/**
 * Ask for a Play Store rating, if this is a good moment.
 *
 * Fire-and-forget and always safe to call: it decides for itself, and does
 * nothing on web, when unavailable, or when the policy says no.
 *
 * Worth knowing when testing: Google's In-App Review API only works for builds
 * installed FROM Play. On a sideloaded or dev APK `isAvailableAsync()` may
 * resolve true and the dialog still never appears — that is the API silently
 * no-op'ing, not a bug here. It also enforces its own quota, so even a live
 * build will not show it every time we ask.
 */
export async function maybeRequestStoreReview({ perfectSession, today = todayISO() } = {}) {
  if (Platform.OS === 'web') return false;
  if (!perfectSession) return false; // cheap exit before touching the DB

  const [{ attempts, lastAskDate }, totalReviews] = await Promise.all([
    getStoreReviewState(),
    getTotalReviewCount(),
  ]);

  if (!shouldRequestReview({ perfectSession, totalReviews, attempts, lastAskDate, today })) {
    return false;
  }

  const StoreReview = loadStoreReview();
  const available = await StoreReview.isAvailableAsync().catch(() => false);
  if (!available) return false;

  // Record before requesting: if the native call throws halfway we still want
  // the attempt counted rather than retrying on the very next perfect session.
  await recordStoreReviewAsk(today);
  await StoreReview.requestReview().catch(() => {});
  return true;
}
