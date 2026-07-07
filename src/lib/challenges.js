import cleanSalesLog from '@/content/challenges/clean-sales-log.json';

// Workflow challenges: multi-step real-world pipelines (CLAUDE.md §7). Like
// decks in content.js, Metro can't scan a directory — every challenge is
// listed here by hand. Table states inside each challenge JSON are verified
// against real pandas by scripts/verify_challenges.py.
export const CHALLENGES = [cleanSalesLog];

export function getChallenge(id) {
  return CHALLENGES.find((challenge) => challenge.id === id);
}
