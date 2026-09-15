import AsyncStorage from '@react-native-async-storage/async-storage';

import { FREE_HISTORY } from '@/logic/reaction';
import { ROUND_CACHE_KEY, useRoundStore } from '../useRoundStore';

const reset = () => useRoundStore.setState({ results: [], mode: 'targets' });

beforeEach(async () => {
  await AsyncStorage.clear();
  reset();
});

describe('mode selection', () => {
  it('lets a free player pick the free mode', () => {
    expect(useRoundStore.getState().selectMode('targets', false)).toBe('ok');
    expect(useRoundStore.getState().mode).toBe('targets');
  });

  it('refuses a paid mode for a free player and leaves the mode alone', () => {
    expect(useRoundStore.getState().selectMode('gosignal', false)).toBe('locked');
    expect(useRoundStore.getState().mode).toBe('targets');
  });

  it('allows it once bought', () => {
    expect(useRoundStore.getState().selectMode('gosignal', true)).toBe('ok');
    expect(useRoundStore.getState().mode).toBe('gosignal');
  });

  it('refuses a mode that does not exist', () => {
    expect(useRoundStore.getState().selectMode('nope', true)).toBe('unknown');
  });
});

describe('results', () => {
  it('records a round and keeps it newest-first', () => {
    useRoundStore.getState().record({ averageMs: 300, bestMs: 200, hits: 8, misses: 1 }, 1000);
    useRoundStore.getState().record({ averageMs: 280, bestMs: 190, hits: 9, misses: 0 }, 2000);
    const rows = useRoundStore.getState().history(true);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.at).toBe(2000);
  });

  it('shows a free player only their recent rounds', () => {
    for (let i = 0; i < FREE_HISTORY + 4; i += 1) {
      useRoundStore.getState().record({ averageMs: 300, bestMs: 200, hits: 5, misses: 0 }, i + 1);
    }
    expect(useRoundStore.getState().history(false)).toHaveLength(FREE_HISTORY);
    expect(useRoundStore.getState().history(true)).toHaveLength(FREE_HISTORY + 4);
  });

  it('reports the personal best across every round, not just the kept ones', () => {
    useRoundStore.getState().record({ averageMs: 500, bestMs: 410, hits: 4, misses: 0 }, 1);
    useRoundStore.getState().record({ averageMs: 240, bestMs: 150, hits: 9, misses: 0 }, 2);
    expect(useRoundStore.getState().personalBestMs()).toBe(150);
  });

  it('has no personal best before the first round', () => {
    expect(useRoundStore.getState().personalBestMs()).toBeNull();
  });
});

describe('hydrate', () => {
  it('restores what was saved', async () => {
    useRoundStore.getState().record({ averageMs: 300, bestMs: 200, hits: 5, misses: 0 }, 1);
    await useRoundStore.getState().persist();
    reset();
    await useRoundStore.getState().hydrate();
    expect(useRoundStore.getState().history(true)).toHaveLength(1);
  });

  it('starts empty rather than throwing on unreadable storage', async () => {
    await AsyncStorage.setItem(ROUND_CACHE_KEY, 'not json');
    await useRoundStore.getState().hydrate();
    expect(useRoundStore.getState().history(true)).toEqual([]);
  });

  // A stored mode the player is no longer entitled to — bought, used, refunded —
  // must not silently leave them in a paid mode.
  it('drops a stored row that is not shaped like a result', async () => {
    await AsyncStorage.setItem(
      ROUND_CACHE_KEY,
      JSON.stringify({ results: [{ at: 'yesterday' }, { at: 5, averageMs: 300, bestMs: 200, hits: 1, misses: 0, mode: 'targets' }], mode: 'targets' }),
    );
    await useRoundStore.getState().hydrate();
    expect(useRoundStore.getState().history(true)).toHaveLength(1);
  });
});
