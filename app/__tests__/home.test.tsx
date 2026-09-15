import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import Home from '../index';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { FREE_HISTORY } from '@/logic/reaction';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useRoundStore } from '@/store/useRoundStore';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
  useRoundStore.setState({ results: [], mode: 'targets' });
});

describe('Home', () => {
  it('renders the app name and routes to settings', async () => {
    const { getByText, getByLabelText } = await renderWithProviders(<Home />);
    expect(getByText(t('appName'))).toBeTruthy();
    await fireEvent.press(getByLabelText(t('settingsTitle')));
    expect(testRouter.push).toHaveBeenCalledWith('/settings');
  });

  it('shows a banner to a free user', async () => {
    const { queryByTestId } = await renderWithProviders(<Home />);
    expect(queryByTestId('banner-ad')).not.toBeNull();
  });

  it('shows no banner to a premium user', async () => {
    usePremiumStore.setState({ isPremium: true });
    const { queryByTestId } = await renderWithProviders(<Home />);
    expect(queryByTestId('banner-ad')).toBeNull();
  });

  it('invites a first round when there is no history', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('noRounds'))).toBeTruthy();
  });

  // The paid mode is the second of the four claims on the paywall, so a free
  // user pressing it must reach the paywall rather than silently stay put.
  it('sends a free user picking the paid mode to the paywall', async () => {
    const { getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('modeLocked', { name: t('modeGoSignal') })));
    expect(testRouter.push).toHaveBeenCalledWith('/paywall');
    expect(useRoundStore.getState().mode).toBe('targets');
  });

  it('lets a premium user switch to it', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true });
    const { getByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByLabelText(t('modeGoSignal')));
    await waitFor(() => expect(useRoundStore.getState().mode).toBe('gosignal'));
    expect(testRouter.push).not.toHaveBeenCalledWith('/paywall');
  });

  it('starts a round and shows the countdown', async () => {
    const { getByText, queryByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t('startCta')));
    // The start button is replaced by the countdown while the round runs.
    await waitFor(() => expect(queryByText(t('startCta'))).toBeNull());
  });

  it('lists past rounds newest first', async () => {
    useRoundStore.setState({
      results: [
        { at: 1, averageMs: 480, bestMs: 400, hits: 4, misses: 0, mode: 'targets' },
        { at: 2, averageMs: 210, bestMs: 180, hits: 9, misses: 0, mode: 'targets' },
      ],
      mode: 'targets',
    });
    const { getByText, queryByText } = await renderWithProviders(<Home />);
    expect(getByText('210 ms')).toBeTruthy();
    expect(queryByText(t('noRounds'))).toBeNull();
  });

  it('tells a free user their history is trimmed, and a paid user nothing', async () => {
    useRoundStore.setState({
      results: [{ at: 1, averageMs: 300, bestMs: 200, hits: 5, misses: 0, mode: 'targets' }],
      mode: 'targets',
    });
    const { getByText, queryByText } = await renderWithProviders(<Home />);
    expect(getByText(t('historyLocked', { n: FREE_HISTORY }))).toBeTruthy();
    // No rerender() here: it re-renders the element without the provider wrapper
    // and the screen dies on useSafeAreaInsets. The store is subscribed, so
    // setting it is what a purchase does and the screen follows on its own.
    usePremiumStore.setState({ isPremium: true });
    await waitFor(() => expect(queryByText(t('historyLocked', { n: FREE_HISTORY }))).toBeNull());
  });

  it('shows a personal best once one exists', async () => {
    useRoundStore.setState({
      results: [{ at: 1, averageMs: 300, bestMs: 188, hits: 5, misses: 0, mode: 'targets' }],
      mode: 'targets',
    });
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('personalBest', { ms: 188 }))).toBeTruthy();
  });
});
