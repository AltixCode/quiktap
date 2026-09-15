import {
  ROUND_SECONDS,
  FREE_HISTORY,
  MODES,
  canUseMode,
  gradeFor,
  isFalseStart,
  nextTargetAt,
  scoreSession,
  summarise,
  targetPositions,
  type Tap,
} from '../reaction';

describe('round shape', () => {
  it('is thirty seconds, which is what the store listing says', () => {
    expect(ROUND_SECONDS).toBe(30);
  });
});

describe('target scheduling', () => {
  it('is deterministic for a seed, so a replay is the same round', () => {
    const a = [0, 1, 2, 3].map((i) => nextTargetAt(42, i));
    const b = [0, 1, 2, 3].map((i) => nextTargetAt(42, i));
    expect(a).toEqual(b);
  });

  it('differs between seeds', () => {
    const a = [0, 1, 2, 3].map((i) => nextTargetAt(1, i));
    const b = [0, 1, 2, 3].map((i) => nextTargetAt(2, i));
    expect(a).not.toEqual(b);
  });

  it('never schedules two targets closer than the reaction floor', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(nextTargetAt(7, i)).toBeGreaterThanOrEqual(250);
      expect(nextTargetAt(7, i)).toBeLessThanOrEqual(1800);
    }
  });

  it('places targets inside the playfield with a full margin', () => {
    for (let i = 0; i < 100; i += 1) {
      const p = targetPositions(9, i, 300, 500, 40);
      expect(p.x).toBeGreaterThanOrEqual(40);
      expect(p.x).toBeLessThanOrEqual(260);
      expect(p.y).toBeGreaterThanOrEqual(40);
      expect(p.y).toBeLessThanOrEqual(460);
    }
  });
});

describe('false starts', () => {
  it('is a tap before the target appeared', () => {
    expect(isFalseStart(-1)).toBe(true);
    expect(isFalseStart(0)).toBe(false);
    expect(isFalseStart(180)).toBe(false);
  });
});

describe('scoring', () => {
  const taps: Tap[] = [
    { reactionMs: 300, hit: true },
    { reactionMs: 200, hit: true },
    { reactionMs: 400, hit: true },
  ];

  it('averages only the hits', () => {
    const s = scoreSession([...taps, { reactionMs: 0, hit: false }]);
    expect(s.hits).toBe(3);
    expect(s.misses).toBe(1);
    expect(s.averageMs).toBe(300);
  });

  it('reports the best single reaction', () => {
    expect(scoreSession(taps).bestMs).toBe(200);
  });

  // A session with nothing to average must not produce NaN, which would render
  // as "NaN ms" on the results screen.
  it('survives a session with no hits at all', () => {
    const s = scoreSession([{ reactionMs: 0, hit: false }]);
    expect(s.hits).toBe(0);
    expect(s.averageMs).toBe(0);
    expect(s.bestMs).toBe(0);
  });

  it('is empty-safe', () => {
    expect(scoreSession([]).averageMs).toBe(0);
  });
});

describe('grades', () => {
  it('improves as the average falls', () => {
    const fast = gradeFor(180);
    const slow = gradeFor(600);
    expect(fast.rank).toBeLessThan(slow.rank);
  });

  it('covers every reaction time without a gap', () => {
    for (let ms = 0; ms < 2000; ms += 7) {
      expect(gradeFor(ms).key).toBeTruthy();
    }
  });
});

describe('history', () => {
  it('keeps five for a free player and everything for a paid one', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      at: i,
      averageMs: 300,
      bestMs: 200,
      hits: 5,
      misses: 0,
      mode: 'targets',
    }));
    expect(summarise(many, false)).toHaveLength(FREE_HISTORY);
    expect(summarise(many, true)).toHaveLength(12);
  });

  it('shows the newest first', () => {
    const rows = summarise(
      [
        { at: 1, averageMs: 300, bestMs: 200, hits: 5, misses: 0, mode: 'targets' },
        { at: 2, averageMs: 300, bestMs: 200, hits: 5, misses: 0, mode: 'targets' },
      ],
      true,
    );
    expect(rows[0]?.at).toBe(2);
  });
});

describe('modes', () => {
  it('has two, and the free tier has one', () => {
    expect(MODES).toHaveLength(2);
    expect(canUseMode('targets', false)).toBe(true);
    expect(canUseMode('gosignal', false)).toBe(false);
    expect(canUseMode('gosignal', true)).toBe(true);
  });

  it('refuses a mode that does not exist, paid or not', () => {
    expect(canUseMode('nonsense', true)).toBe(false);
  });
});
