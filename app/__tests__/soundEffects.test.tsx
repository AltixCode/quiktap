import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent } from "@testing-library/react-native";
import React from "react";

import Home from "../index";
import { renderWithProviders } from "@/components/__tests__/renderWithProviders";
import { t } from "@/i18n";
import { useAdsConsentStore } from "@/store/useAdsConsentStore";
import { usePremiumStore } from "@/store/usePremiumStore";
import { useRoundStore } from "@/store/useRoundStore";

// The screen calls the shared sound hook directly, so it is mocked at the
// module boundary the same way toppl's and tapforge's `soundEffects.test.tsx`
// do it -- these assertions are about which name the screen calls `play`
// with, not about the native audio player, which is `useSoundEffects`'s own
// test's job.
const mockPlay = jest.fn();
jest.mock("@/hooks/useSoundEffects", () => ({
  useSoundEffects: () => mockPlay,
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({
    consent: { canServeAds: true, offerPrivacyOptions: false },
  });
  useRoundStore.setState({ results: [], mode: "targets" });
});

afterEach(() => {
  jest.useRealTimers();
});

// The gap before a target appears is at most 1800ms (see MAX_GAP_MS in
// reaction.ts); advancing well past that guarantees the target has gone live
// regardless of the round's randomly generated seed.
const PAST_ANY_GAP_MS = 2000;

describe("Home sound effects and the wait-for-green fix", () => {
  it("plays a tap and a pop sound on a correct hit", async () => {
    jest.useFakeTimers();
    const { getByText, getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t("startCta")));
    await jest.advanceTimersByTimeAsync(PAST_ANY_GAP_MS);

    await fireEvent.press(getByLabelText(t("tapNow")));
    expect(mockPlay).toHaveBeenCalledWith("tap");
    expect(mockPlay).toHaveBeenCalledWith("pop");
    expect(mockPlay).not.toHaveBeenCalledWith("fail");
  });

  it("plays a tap and a fail sound on an early (wrong) tap", async () => {
    const { getByText, getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t("startCta")));
    // Pressed immediately, before the target's gap has elapsed -- this is the
    // "too soon" / wrong-tap path.
    await fireEvent.press(getByLabelText(t("waitForTarget")));
    expect(mockPlay).toHaveBeenCalledWith("tap");
    expect(mockPlay).toHaveBeenCalledWith("fail");
    expect(mockPlay).not.toHaveBeenCalledWith("pop");
  });

  it('shows "wait for it" rather than "wait for green" in Targets mode, where no green circle is promised', async () => {
    const { getByText, queryByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t("startCta")));
    expect(queryByText(t("waitForGreen"))).toBeNull();
    expect(getByText(t("waitForTarget"))).toBeTruthy();
  });

  it("shows the wait prompt once, before the first target -- not after every tap", async () => {
    jest.useFakeTimers();
    const { getByText, getByLabelText, queryByText } =
      await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t("startCta")));
    expect(getByText(t("waitForTarget"))).toBeTruthy();

    await jest.advanceTimersByTimeAsync(PAST_ANY_GAP_MS);
    await fireEvent.press(getByLabelText(t("tapNow")));

    // Back in the waiting phase for the second target, but the prompt does
    // not repeat.
    expect(queryByText(t("waitForTarget"))).toBeNull();
  });

  it('shows the go-signal mode\'s own "wait for green" prompt, which is genuinely accurate there', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true });
    useRoundStore.setState({ results: [], mode: "gosignal" });
    const { getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t("startCta")));
    expect(getByText(t("waitForGreen"))).toBeTruthy();
  });
});
