import { renderHook } from "@testing-library/react-native";
import { createAudioPlayer } from "expo-audio";

import { useSoundEffects } from "../useSoundEffects";

const mockedCreate = createAudioPlayer as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useSoundEffects", () => {
  it("creates one player per sound on mount", async () => {
    await renderHook(() => useSoundEffects());
    expect(mockedCreate).toHaveBeenCalledTimes(4);
  });

  it("seeks to the start and plays the requested sound", async () => {
    const { result } = await renderHook(() => useSoundEffects());
    const tapPlayer = mockedCreate.mock.results[0]?.value;

    result.current("tap");

    expect(tapPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(tapPlayer.play).toHaveBeenCalledTimes(1);
  });

  it("does not throw when asked to play after unmount", async () => {
    const { result, unmount } = await renderHook(() => useSoundEffects());
    await unmount();
    expect(() => result.current("tap")).not.toThrow();
  });

  it("does not throw when a player throws on play (torn down mid-flight)", async () => {
    mockedCreate.mockReturnValueOnce({
      play: jest.fn(() => {
        throw new Error("native player released");
      }),
      seekTo: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
    });
    const { result } = await renderHook(() => useSoundEffects());
    expect(() => result.current("tap")).not.toThrow();
  });

  it("removes every player on unmount", async () => {
    const { unmount } = await renderHook(() => useSoundEffects());
    const players = mockedCreate.mock.results.map((r) => r.value);
    expect(players).toHaveLength(4);
    await unmount();
    players.forEach((player) => expect(player.remove).toHaveBeenCalledTimes(1));
  });
});
