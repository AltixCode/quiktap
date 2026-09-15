/**
 * The reaction round: scheduling, scoring, and what a purchase opens.
 *
 * Pure and dependency-free. Every function takes its inputs explicitly — the
 * seed, the index, the clock reading — so a round can be replayed exactly in a
 * test without waiting thirty seconds for one.
 */

/** The round length the store listing promises. Named so the claim and the code cannot drift. */
export const ROUND_SECONDS = 30;

/** Past rounds a free player keeps. The purchase lifts it. */
export const FREE_HISTORY = 5;

/**
 * A target may not appear sooner than this after the last one.
 *
 * Human simple-reaction time bottoms out around 150 ms, so a gap shorter than
 * this would be unreactable and would read as the game cheating rather than as
 * the player being slow.
 */
const MIN_GAP_MS = 250;
const MAX_GAP_MS = 1800;

export interface Mode {
  id: string;
  nameKey: string;
  descKey: string;
  /** Free players get this one. */
  free: boolean;
}

export const MODES: Mode[] = [
  { id: 'targets', nameKey: 'modeTargets', descKey: 'modeTargetsDesc', free: true },
  { id: 'gosignal', nameKey: 'modeGoSignal', descKey: 'modeGoSignalDesc', free: false },
];

export function canUseMode(id: string, isPremium: boolean): boolean {
  const mode = MODES.find((m) => m.id === id);
  if (!mode) return false;
  return isPremium || mode.free;
}

/**
 * A small deterministic hash. Same seed and index, same number, on every device
 * and every run — which is what makes a round replayable in a test.
 */
function hash(seed: number, index: number): number {
  let h = (seed ^ (index + 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const unit = (seed: number, index: number): number => hash(seed, index) / 0xffffffff;

/** Milliseconds to wait before target `index` appears. */
export function nextTargetAt(seed: number, index: number): number {
  return Math.round(MIN_GAP_MS + unit(seed, index) * (MAX_GAP_MS - MIN_GAP_MS));
}

/**
 * Where target `index` appears, kept a full radius inside the playfield so a
 * target is never clipped by an edge and unfairly hard to hit.
 */
export function targetPositions(
  seed: number,
  index: number,
  width: number,
  height: number,
  radius: number,
): { x: number; y: number } {
  const span = (total: number) => Math.max(0, total - radius * 2);
  return {
    x: radius + unit(seed, index * 2 + 1) * span(width),
    y: radius + unit(seed, index * 2 + 2) * span(height),
  };
}

/** A tap before the target existed. Negative reaction time is the tell. */
export function isFalseStart(reactionMs: number): boolean {
  return reactionMs < 0;
}

export interface Tap {
  reactionMs: number;
  hit: boolean;
}

export interface SessionScore {
  hits: number;
  misses: number;
  averageMs: number;
  bestMs: number;
}

export function scoreSession(taps: readonly Tap[]): SessionScore {
  const hits = taps.filter((t) => t.hit);
  if (hits.length === 0) {
    // No average exists. Returning 0 rather than NaN, which would reach the
    // results screen as "NaN ms".
    return { hits: 0, misses: taps.length, averageMs: 0, bestMs: 0 };
  }
  const total = hits.reduce((sum, t) => sum + t.reactionMs, 0);
  return {
    hits: hits.length,
    misses: taps.length - hits.length,
    averageMs: Math.round(total / hits.length),
    bestMs: Math.min(...hits.map((t) => t.reactionMs)),
  };
}

export interface Grade {
  key: string;
  rank: number;
}

/**
 * Bands are inclusive-upper and the last one is unbounded, so every possible
 * average lands in exactly one. A gap here would render a blank grade.
 */
const GRADES: { max: number; key: string }[] = [
  { max: 200, key: 'gradeLightning' },
  { max: 260, key: 'gradeSharp' },
  { max: 330, key: 'gradeQuick' },
  { max: 420, key: 'gradeSteady' },
  { max: 550, key: 'gradeRelaxed' },
  { max: Number.POSITIVE_INFINITY, key: 'gradeScenic' },
];

export function gradeFor(averageMs: number): Grade {
  const rank = GRADES.findIndex((g) => averageMs <= g.max);
  const grade = GRADES[rank] ?? GRADES[GRADES.length - 1]!;
  return { key: grade.key, rank: rank === -1 ? GRADES.length - 1 : rank };
}

export interface Result {
  at: number;
  averageMs: number;
  bestMs: number;
  hits: number;
  misses: number;
  mode: string;
}

/** Newest first, trimmed to what this player's tier keeps. */
export function summarise(results: readonly Result[], isPremium: boolean): Result[] {
  const sorted = [...results].sort((a, b) => b.at - a.at);
  return isPremium ? sorted : sorted.slice(0, FREE_HISTORY);
}
