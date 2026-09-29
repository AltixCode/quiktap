import { useCallback, useEffect, useRef } from "react";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";

/**
 * Short, generic feedback tones every game in this portfolio can reuse instead of shipping
 * silent taps and wins -- exactly what several TestFlight testers asked for ("sound effects
 * would be nice", "folding sound effect when a fold is made would be great").
 *
 * Four sounds cover every game's needs without becoming a per-app asset pipeline: a neutral
 * `tap` for any move, `pop` for a small positive result, `fail` for an invalid move or a lost
 * game, and `success` for completing a level or the whole game.
 */
const SOUND_FILES = {
  tap: require("../../assets/sounds/tap.wav"),
  pop: require("../../assets/sounds/pop.wav"),
  fail: require("../../assets/sounds/fail.wav"),
  success: require("../../assets/sounds/success.wav"),
} as const;

export type SoundEffectName = keyof typeof SOUND_FILES;

/**
 * Plays short local sound effects, muted correctly alongside the system silent switch.
 *
 * `playsInSilentMode: false` is deliberate: a game making noise through a ringer switch a
 * player deliberately flipped to silent is the one sound behaviour that reliably annoys
 * people, and every native audio API treats this as opt-in for exactly that reason.
 *
 * One `AudioPlayer` per sound, created once and replayed with `seekTo(0)` before each play --
 * creating a fresh player per tap works but leaks a native object every time and audibly stutters
 * on rapid repeats (e.g. quick consecutive taps), which is exactly the case this hook exists for.
 */
export function useSoundEffects() {
  const players = useRef<Partial<Record<SoundEffectName, AudioPlayer>>>({});

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: false });
    const created = Object.fromEntries(
      (Object.keys(SOUND_FILES) as SoundEffectName[]).map((name) => [
        name,
        createAudioPlayer(SOUND_FILES[name]),
      ]),
    ) as Record<SoundEffectName, AudioPlayer>;
    players.current = created;

    return () => {
      Object.values(created).forEach((player) => {
        try {
          player.remove();
        } catch {
          // Already torn down by the native side (e.g. a fast-refresh reload in dev).
        }
      });
      players.current = {};
    };
  }, []);

  const play = useCallback((name: SoundEffectName) => {
    const player = players.current[name];
    if (!player) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // A player torn down mid-flight (screen unmounted right as a sound fired) is a no-op,
      // not a crash -- sound is decoration, never something a game's logic depends on.
    }
  }, []);

  return play;
}
