import {
  PRO_ENTITLEMENT,
  shouldShowAds,
  sortPlans,
  summarizePlan,
  type PlanLike,
} from '../entitlements';

const lifetime: PlanLike = { identifier: '$rc_lifetime', priceString: '$3.99', price: 3.99, periodUnit: null };
const yearly: PlanLike = { identifier: '$rc_annual', priceString: '$9.99', price: 9.99, periodUnit: 'YEAR' };
const monthly: PlanLike = { identifier: '$rc_monthly', priceString: '$1.99', price: 1.99, periodUnit: 'MONTH' };

describe('PRO_ENTITLEMENT', () => {
  it('matches the lookup key configured in RevenueCat', () => {
    // Renaming an entitlement in RevenueCat means recreating it, which invalidates
    // the SDK keys — so this constant is pinned by a test on purpose.
    expect(PRO_ENTITLEMENT).toBe('pro');
  });
});

describe('shouldShowAds', () => {
  it('shows ads to a resolved free user', () => {
    expect(shouldShowAds({ isPremium: false, isReady: true })).toBe(true);
  });

  it('never shows ads to a premium user', () => {
    expect(shouldShowAds({ isPremium: true, isReady: true })).toBe(false);
  });

  it('shows nothing while entitlements are still resolving', () => {
    // The damaging case: a paying user cold-starting would otherwise see one ad frame.
    expect(shouldShowAds({ isPremium: false, isReady: false })).toBe(false);
    expect(shouldShowAds({ isPremium: true, isReady: false })).toBe(false);
  });
});

describe('summarizePlan', () => {
  it('labels a non-subscription as a one-time lifetime purchase', () => {
    expect(summarizePlan(lifetime)).toEqual({
      title: 'Lifetime',
      cadence: 'One-time payment',
      isLifetime: true,
      savingsPercent: null,
    });
  });

  it('computes yearly savings against the monthly baseline', () => {
    // 9.99 vs 12 x 1.99 = 23.88 -> 58% saving.
    expect(summarizePlan(yearly, monthly).savingsPercent).toBe(58);
  });

  it('reports no savings when the yearly plan is not actually cheaper', () => {
    const expensive: PlanLike = { ...yearly, price: 40 };
    expect(summarizePlan(expensive, monthly).savingsPercent).toBeNull();
  });

  it('reports no savings when there is no monthly baseline to compare against', () => {
    expect(summarizePlan(yearly).savingsPercent).toBeNull();
  });

  it('ignores a zero-priced baseline rather than dividing by it', () => {
    expect(summarizePlan(yearly, { ...monthly, price: 0 }).savingsPercent).toBeNull();
  });

  it('labels a monthly plan', () => {
    expect(summarizePlan(monthly).title).toBe('Monthly');
  });

  it('falls back to a product-named plan for an unrecognised identifier', () => {
    const weird: PlanLike = { identifier: 'custom_pack', priceString: '$5', price: 5, periodUnit: 'WEEK' };
    const summary = summarizePlan(weird);
    expect(summary.title).toContain('Pro');
    expect(summary.cadence).toBe('Billed every week');
    expect(summary.isLifetime).toBe(false);
  });
});

describe('sortPlans', () => {
  it('orders best value first: lifetime, yearly, monthly', () => {
    expect(sortPlans([monthly, yearly, lifetime]).map((p) => p.identifier)).toEqual([
      '$rc_lifetime',
      '$rc_annual',
      '$rc_monthly',
    ]);
  });

  it('puts unrecognised plans last, cheapest first', () => {
    const a: PlanLike = { identifier: 'extra_b', priceString: '$9', price: 9, periodUnit: null };
    const b: PlanLike = { identifier: 'extra_a', priceString: '$4', price: 4, periodUnit: null };
    expect(sortPlans([a, b, monthly]).map((p) => p.identifier)).toEqual([
      '$rc_monthly',
      'extra_a',
      'extra_b',
    ]);
  });

  it('does not mutate its input', () => {
    const input = [monthly, lifetime];
    sortPlans(input);
    expect(input.map((p) => p.identifier)).toEqual(['$rc_monthly', '$rc_lifetime']);
  });

  it('handles an empty offering', () => {
    expect(sortPlans([])).toEqual([]);
  });
});
