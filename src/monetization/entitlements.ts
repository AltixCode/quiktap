/**
 * Pure freemium rules.
 *
 * Deliberately free of RevenueCat types and native calls so the gating that decides whether a
 * user sees a paywall or an ad can be unit tested exhaustively — this is the code most likely
 * to cost money or a store rejection if it is wrong.
 */

/** The RevenueCat entitlement one purchase grants. */
export const PRO_ENTITLEMENT = 'pro';

export type PaywallReason = 'levels' | 'remove-ads' | 'archive' | 'hints' | 'generic';

/**
 * Ads are shown only once we positively know the user is NOT premium. Rendering ads while
 * entitlements are still loading would flash an ad at a paying user on every cold start — the
 * single most damaging bug this feature can have.
 */
export function shouldShowAds({ isPremium, isReady }: { isPremium: boolean; isReady: boolean }): boolean {
  return isReady && !isPremium;
}

/* ------------------------------------------------------------------- plans */

/** The subset of a RevenueCat package the UI actually needs. */
export interface PlanLike {
  identifier: string;
  priceString: string;
  price: number;
  /** `MONTH` | `YEAR` | `WEEK` | `DAY`, or null for a non-subscription. */
  periodUnit: string | null;
}

export interface PlanSummary {
  title: string;
  cadence: string;
  isLifetime: boolean;
  /** Whole-percent saving against a monthly baseline, or null when unknown. */
  savingsPercent: number | null;
}

function isLifetimeIdentifier(identifier: string): boolean {
  return /lifetime/i.test(identifier);
}

function isAnnualIdentifier(identifier: string, periodUnit: string | null): boolean {
  return periodUnit === 'YEAR' || /annual|yearly/i.test(identifier);
}

function isMonthlyIdentifier(identifier: string, periodUnit: string | null): boolean {
  return periodUnit === 'MONTH' || /monthly/i.test(identifier);
}

export function summarizePlan(plan: PlanLike, monthlyBaseline?: PlanLike): PlanSummary {
  if (isLifetimeIdentifier(plan.identifier)) {
    return { title: 'Lifetime', cadence: 'One-time payment', isLifetime: true, savingsPercent: null };
  }

  if (isAnnualIdentifier(plan.identifier, plan.periodUnit)) {
    let savingsPercent: number | null = null;
    if (monthlyBaseline && monthlyBaseline.price > 0) {
      const yearOfMonthly = monthlyBaseline.price * 12;
      if (plan.price < yearOfMonthly) {
        savingsPercent = Math.round((1 - plan.price / yearOfMonthly) * 100);
      }
    }
    return { title: 'Yearly', cadence: 'Billed once a year', isLifetime: false, savingsPercent };
  }

  if (isMonthlyIdentifier(plan.identifier, plan.periodUnit)) {
    return { title: 'Monthly', cadence: 'Billed monthly', isLifetime: false, savingsPercent: null };
  }

  return {
    title: 'Quiktap Pro',
    cadence: plan.periodUnit ? `Billed every ${plan.periodUnit.toLowerCase()}` : 'One-time payment',
    isLifetime: plan.periodUnit === null,
    savingsPercent: null,
  };
}

const PLAN_RANK: ((plan: PlanLike) => boolean)[] = [
  (p) => isLifetimeIdentifier(p.identifier),
  (p) => isAnnualIdentifier(p.identifier, p.periodUnit),
  (p) => isMonthlyIdentifier(p.identifier, p.periodUnit),
];

function rankOf(plan: PlanLike): number {
  const index = PLAN_RANK.findIndex((matches) => matches(plan));
  return index === -1 ? PLAN_RANK.length : index;
}

/** Orders plans best-value first: lifetime, yearly, then monthly. */
export function sortPlans(plans: readonly PlanLike[]): PlanLike[] {
  return [...plans].sort((a, b) => rankOf(a) - rankOf(b) || a.price - b.price);
}
