/**
 * Rounds played, and which mode is selected.
 *
 * Both paid claims are enforced here — the second mode, and keeping more than
 * the recent rounds — and each takes `isPremium` explicitly at the call site
 * rather than reading it from another store, so a screen cannot forget to pass it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { FREE_HISTORY, canUseMode, summarise, type Result } from '@/logic/reaction';

export const ROUND_CACHE_KEY = 'quiktap.state.v1';

/** A ceiling so storage cannot grow without bound on a device played daily for years. */
const MAX_RESULTS = 500;

interface RoundState {
  results: Result[];
  mode: string;

  selectMode: (id: string, isPremium: boolean) => 'ok' | 'locked' | 'unknown';
  record: (
    score: { averageMs: number; bestMs: number; hits: number; misses: number },
    at?: number,
  ) => void;
  history: (isPremium: boolean) => Result[];
  personalBestMs: () => number | null;
  persist: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function validResults(value: unknown): Result[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (r): r is Result =>
      !!r &&
      typeof r === 'object' &&
      typeof (r as Result).at === 'number' &&
      typeof (r as Result).averageMs === 'number' &&
      typeof (r as Result).bestMs === 'number' &&
      typeof (r as Result).hits === 'number' &&
      typeof (r as Result).misses === 'number',
  );
}

export const useRoundStore = create<RoundState>((set, get) => ({
  results: [],
  mode: 'targets',

  selectMode(id, isPremium) {
    if (!canUseMode(id, true) && !canUseMode(id, false)) return 'unknown';
    if (!canUseMode(id, isPremium)) return 'locked';
    set({ mode: id });
    void get().persist();
    return 'ok';
  },

  record(score, at = Date.now()) {
    const row: Result = { at, mode: get().mode, ...score };
    set((s) => ({ results: [...s.results, row].slice(-MAX_RESULTS) }));
    void get().persist();
  },

  history(isPremium) {
    return summarise(get().results, isPremium);
  },

  /**
   * The best across every round ever played, not only the ones a free player
   * can see. Hiding someone's own record behind the paywall would be a mean
   * trick, and the number is already on their device.
   */
  personalBestMs() {
    const best = get().results.map((r) => r.bestMs).filter((ms) => ms > 0);
    return best.length ? Math.min(...best) : null;
  },

  async persist() {
    try {
      const { results, mode } = get();
      await AsyncStorage.setItem(ROUND_CACHE_KEY, JSON.stringify({ results, mode }));
    } catch {
      // A lost history is survivable; a failed launch is not.
    }
  },

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(ROUND_CACHE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const record = parsed as Record<string, unknown>;
      set({
        results: validResults(record.results),
        mode: typeof record.mode === 'string' ? record.mode : 'targets',
      });
    } catch {
      // Unreadable storage starts empty rather than preventing launch.
    }
  },
}));

export { FREE_HISTORY };
