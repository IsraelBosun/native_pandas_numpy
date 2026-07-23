import { getDeck } from '@/lib/content';
import { seededShuffle } from '@/lib/shuffle';

// Any card can be presented as a fast multiple-choice quiz — even
// `fill-blank` cards already carry `distractors` alongside their `tokens`
// (see CLAUDE.md's card schema) — so this only filters out the rare card
// with no distractors rather than requiring a specific `type`.
export function buildQuizQueue(topicId, seed) {
  const cards = getDeck(topicId).cards.filter((card) => card.distractors?.length > 0);
  return seededShuffle(cards, seed);
}

export function buildOptions(card) {
  return seededShuffle([card.answer, ...card.distractors], card.id);
}
