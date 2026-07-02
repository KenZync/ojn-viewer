/**
 * Deterministic pseudo-random number generator (LCG)
 */
function createRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Shuffles an array deterministically using a seed number
 */
export function shuffleSeeded<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  const rand = createRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Standard slot duration for each song (180 seconds / 3 minutes)
 * This leaves room for standard O2Jam tracks (typically 1.5 - 2.5 minutes)
 * and leaves the remainder of the 3-minute window as a pre-load/intermission buffer.
 */
export const SLOT_DURATION_SECONDS = 180;
export const INTERMISSION_THRESHOLD_SECONDS = 165; // Transition starts 15s before slot ends

export interface RadioState {
  currentTrackIndex: number;
  activeTrackCode: number;
  playbackOffset: number; // in seconds
  intermission: boolean;
  timeLeftInSlot: number;
}

/**
 * Calculates which track should be playing currently based on epoch time
 */
export function calculateActiveTrack(trackCodes: number[], timeOffsetMs = 0): RadioState | null {
  if (!trackCodes || trackCodes.length === 0) return null;

  // Standard epoch origin: Jan 1, 2026
  const epochOriginMs = new Date("2026-01-01T00:00:00Z").getTime();
  const currentEpochMs = Date.now() + timeOffsetMs;
  const deltaMs = currentEpochMs - epochOriginMs;
  
  if (deltaMs < 0) return null;

  const deltaSeconds = Math.floor(deltaMs / 1000);
  
  // Total slots elapsed since origin
  const totalSlotsElapsed = Math.floor(deltaSeconds / SLOT_DURATION_SECONDS);
  const currentSlotOffsetSeconds = deltaSeconds % SLOT_DURATION_SECONDS;

  // Use the total slots elapsed to determine a daily/hourly seed to randomize the track index
  const seed = Math.floor(totalSlotsElapsed / trackCodes.length) + 1;
  const shuffledCodes = shuffleSeeded(trackCodes, seed);

  const trackIndex = totalSlotsElapsed % shuffledCodes.length;
  const activeTrackCode = shuffledCodes[trackIndex];
  
  const intermission = currentSlotOffsetSeconds >= INTERMISSION_THRESHOLD_SECONDS;
  const timeLeftInSlot = SLOT_DURATION_SECONDS - currentSlotOffsetSeconds;

  return {
    currentTrackIndex: trackIndex,
    activeTrackCode,
    playbackOffset: currentSlotOffsetSeconds,
    intermission,
    timeLeftInSlot,
  };
}
