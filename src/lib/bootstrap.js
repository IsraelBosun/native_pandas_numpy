import { initDb } from './db';
import { seedIfNeeded } from './seed';
import { syncNow } from './sync';

let bootstrapPromise = null;

// Idempotent app-startup sequence: open/create the DB, then seed any content
// cards that don't have progress yet. Screens are only mounted after this
// resolves, so their own queries never race the initial seed.
export function bootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = initDb()
      .then(() => seedIfNeeded())
      // Fire-and-forget: startup must never wait on the network (offline-first).
      // On a fresh install this restores remote progress in the background;
      // screens re-query on focus, so it appears on the next visit to Home.
      .then(() => {
        syncNow();
      });
  }
  return bootstrapPromise;
}
