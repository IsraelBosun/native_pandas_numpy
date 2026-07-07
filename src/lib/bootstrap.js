import { initDb } from './db';
import { seedIfNeeded } from './seed';

let bootstrapPromise = null;

// Idempotent app-startup sequence: open/create the DB, then seed any content
// cards that don't have progress yet. Screens are only mounted after this
// resolves, so their own queries never race the initial seed.
export function bootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = initDb().then(() => seedIfNeeded());
  }
  return bootstrapPromise;
}
