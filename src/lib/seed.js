import { getDb } from './db';
import { TOPICS, getDeck } from './content';
import { todayISO } from './date';

// Inserts a default card_state row for any content card that doesn't have
// one yet. Never overwrites an existing row — new content packs add cards
// without wiping progress.
export async function seedIfNeeded() {
  const db = await getDb();
  const today = todayISO();

  const existingRows = await db.getAllAsync(`SELECT card_id FROM card_state`);
  const existingIds = new Set(existingRows.map((row) => row.card_id));

  for (const topic of TOPICS) {
    const deck = getDeck(topic.id);
    for (const card of deck.cards) {
      if (existingIds.has(card.id)) continue;
      await db.runAsync(
        `INSERT INTO card_state (card_id, ef, interval, reps, due_date) VALUES (?, 2.5, 0, 0, ?)`,
        card.id,
        today
      );
    }
  }
}
