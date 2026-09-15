import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert, Linking } from 'react-native';

import Settings from '../settings';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import * as ads from '@/monetization/ads';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { usePremiumStore } from '@/store/usePremiumStore';

jest.mock('@/monetization/ads');

beforeEach(() => {
  jest.clearAllMocks();
  usePremiumStore.setState({
    isPremium: false,
    isReady: true,
    restore: jest.fn().mockResolvedValue('none'),
  });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Settings', () => {
  it('offers the upgrade to a free user and routes to the paywall', async () => {
    const { getByText } = await renderWithProviders(<Settings />);
    fireEvent.press(getByText('Unlock Pro — remove ads'));
    expect(testRouter.push).toHaveBeenCalledWith('/paywall');
  });

  it('thanks a premium user instead of selling to them again', async () => {
    usePremiumStore.setState({ isPremium: true });
    const { queryByText, getByText } = await renderWithProviders(<Settings />);
    expect(queryByText('Unlock Pro — remove ads')).toBeNull();
    expect(getByText('Pro is active. Thank you.')).toBeTruthy();
  });

  it('reports a successful restore', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const restore = jest.fn().mockResolvedValue('purchased');
    usePremiumStore.setState({ restore });
    const { getByText } = await renderWithProviders(<Settings />);
    fireEvent.press(getByText('Restore purchases'));
    expect(restore).toHaveBeenCalled();
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Restored', expect.any(String)));
  });

  it('says so plainly when there is nothing to restore', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText } = await renderWithProviders(<Settings />);
    fireEvent.press(getByText('Restore purchases'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Nothing to restore', expect.any(String)),
    );
  });

  it('hides the ad privacy entry where UMP does not require one', async () => {
    const { queryByText } = await renderWithProviders(<Settings />);
    expect(queryByText('Ad privacy settings')).toBeNull();
  });

  it('reopens the consent form where Google requires that entry point', async () => {
    useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: true } });
    const { getByText } = await renderWithProviders(<Settings />);
    fireEvent.press(getByText('Ad privacy settings'));
    expect(ads.showPrivacyOptionsForm).toHaveBeenCalled();
  });

  it('switches the theme preference', async () => {
    const { getByText } = await renderWithProviders(<Settings />);
    fireEvent.press(getByText('Dark'));
    await waitFor(() => expect(getByText('Dark')).toBeTruthy());
  });

  it('opens the legal and support links', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByText } = await renderWithProviders(<Settings />);
    fireEvent.press(getByText('Privacy policy'));
    fireEvent.press(getByText('Terms of use'));
    fireEvent.press(getByText('Contact support'));
    expect(open).toHaveBeenCalledTimes(3);
    expect(open).toHaveBeenCalledWith(expect.stringContaining('mailto:'));
  });
});
