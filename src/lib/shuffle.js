// Deterministic shuffle keyed by a string seed (e.g. a card id) so option
// order stays stable across re-renders of the same card but still varies
// from card to card.
export function seededShuffle(items, seed) {
  let state = hashSeed(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 9301 + 49297) % 233280;
    const j = Math.floor((state / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}
