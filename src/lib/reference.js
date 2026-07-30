import { getAllCards } from './content';

// One reference entry per card — the closest available proxy to "one entry
// per method" given the existing Q&A card schema, with no new content fields.
// title falls back to subtopic when a card has no curated relatedMethods.
export function cardToEntry(card) {
  return {
    id: card.id,
    title: card.relatedMethods[0] || card.subtopic,
    topic: card.topic,
    subtopic: card.subtopic,
    tags: card.tags,
    purpose: card.whenToUse,
    syntax: card.answer,
    why: card.why,
    commonMistake: card.commonMistake,
    example: card.example,
    chart: card.chart,
    relatedMethods: card.relatedMethods,
  };
}

export function getReferenceEntries() {
  return getAllCards().map(cardToEntry);
}

export function filterEntries(entries, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return entries;

  return entries.filter((entry) => {
    const haystack = [entry.title, entry.topic, entry.subtopic, ...entry.tags, ...entry.relatedMethods]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}
