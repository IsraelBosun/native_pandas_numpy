import { createAudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

// Placeholder tones synthesized in scripts, not designed SFX — swap the wav
// files under assets/sounds when real audio is ready; this module's API
// won't need to change.
const SOURCES = {
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  combo: require('../../assets/sounds/combo.wav'),
  boost: require('../../assets/sounds/boost.wav'),
  crash: require('../../assets/sounds/crash.wav'),
};

let players = null;

function getPlayers() {
  if (players) return players;
  players = {};
  for (const key of Object.keys(SOURCES)) {
    try {
      players[key] = createAudioPlayer(SOURCES[key]);
    } catch {
      // Player creation can fail in unsupported environments (e.g. some web
      // targets) — sound is decoration, never let it block a review.
    }
  }
  return players;
}

// Mirrors triggerHaptic: fire-and-forget, never throws, no-op on web where
// autoplay-without-gesture policies make it unreliable anyway.
export function playSound(kind) {
  if (Platform.OS === 'web') return;
  const player = getPlayers()[kind];
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // Decoration — swallow and move on.
  }
}
