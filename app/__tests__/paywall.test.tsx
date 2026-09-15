import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import Paywall from '../paywall';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { usePremiumStore } from '@/store/usePremiumStore';

function plan(identifier: string, price: number, period: string | null): PurchasesPackage {
  return {
    identifier,
    product: { priceString: `$${price.toFixed(2)}`, price, subscriptionPeriod: period },
  } as unknown as PurchasesPackage;
}

const LIFETIME = plan('$rc_lifetime', 3.99, null);
const MONTHLY = plan('$rc_monthly', 1.99, 'P1M');

function seed(over: Record<string, unknown> = {}) {
  usePremiumStore.setState({
    isPremium: false,
    isReady: true,
    packages: [],
    isPurchasing: false,
    error: null,
    refreshOfferings: jest.fn().mockResolvedValue(undefined),
    purchase: jest.fn().mockResolvedValue('purchased'),
    restore: jest.fn().mockResolvedValue('none'),
    ...over,
  } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  seed();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Paywall', () => {
  it('shows a loading state until the offering arrives', async () => {
    const { getByText } = await renderWithProviders(<Paywall />);
    expect(getByText('Loading plans…')).toBeTruthy();
  });

  it('marks the first plan as best value and buys it on tap', async () => {
    const purchase = jest.fn().mockResolvedValue('purchased');
    seed({ packages: [LIFETIME, MONTHLY], purchase });
    const { getByText } = await renderWithProviders(<Paywall />);
    expect(getByText('BEST VALUE')).toBeTruthy();
    fireEvent.press(getByText('Lifetime'));
    expect(purchase).toHaveBeenCalledWith(LIFETIME);
  });

  it('shows the saving a yearly plan offers against the monthly one', async () => {
    seed({ packages: [plan('$rc_annual', 9.99, 'P1Y'), MONTHLY] });
    const { getByText } = await renderWithProviders(<Paywall />);
    expect(getByText(/save 58%/)).toBeTruthy();
  });

  it('closes itself for a user who already owns Pro', async () => {
    seed({ isPremium: true });
    await renderWithProviders(<Paywall />);
    await waitFor(() => expect(testRouter.back).toHaveBeenCalled());
  });

  it('surfaces a purchase error', async () => {
    seed({ packages: [LIFETIME], error: 'card declined' });
    const { getByText } = await renderWithProviders(<Paywall />);
    expect(getByText('card declined')).toBeTruthy();
  });

  it('offers restore — App Review tests this path on a fresh install', async () => {
    const restore = jest.fn().mockResolvedValue('none');
    seed({ restore });
    const { getByText } = await renderWithProviders(<Paywall />);
    fireEvent.press(getByText('Restore purchases'));
    expect(restore).toHaveBeenCalled();
  });

  it('closes on the close control', async () => {
    const { getByLabelText } = await renderWithProviders(<Paywall />);
    fireEvent.press(getByLabelText('Close'));
    expect(testRouter.back).toHaveBeenCalled();
  });

  it('links to terms and privacy, which both stores require on a paywall', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByText } = await renderWithProviders(<Paywall />);
    fireEvent.press(getByText('Terms'));
    fireEvent.press(getByText('Privacy'));
    expect(open).toHaveBeenCalledTimes(2);
  });
});
