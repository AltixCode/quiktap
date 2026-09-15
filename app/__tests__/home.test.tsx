import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import Home from '../index';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { usePremiumStore } from '@/store/usePremiumStore';

beforeEach(() => {
  jest.clearAllMocks();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Home', () => {
  it('renders the app name and routes to settings', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText('Quiktap')).toBeTruthy();
    fireEvent.press(getByText('Settings'));
    expect(testRouter.push).toHaveBeenCalledWith('/settings');
  });

  it('shows a banner to a free user', async () => {
    const { queryByTestId } = await renderWithProviders(<Home />);
    expect(queryByTestId('banner-ad')).not.toBeNull();
  });

  it('shows no banner to a premium user — the whole point of the upgrade', async () => {
    usePremiumStore.setState({ isPremium: true });
    const { queryByTestId } = await renderWithProviders(<Home />);
    expect(queryByTestId('banner-ad')).toBeNull();
  });
});
