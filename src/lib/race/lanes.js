export const LANE_COUNT = 3;

export function clampLaneIndex(index) {
  return Math.min(LANE_COUNT - 1, Math.max(0, index));
}

// Center x-coordinate (px) of a lane within a track of the given width.
export function laneCenterX(laneIndex, trackWidth) {
  const laneWidth = trackWidth / LANE_COUNT;
  return laneWidth * laneIndex + laneWidth / 2;
}
