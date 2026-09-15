import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/monetization/config';
import { summarizePlan, type PlanLike } from '@/monetization/entitlements';
import { toPlanLike } from '@/monetization/purchases';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useTheme } from '@/theme';

/** What a purchase unlocks. Edited per app; the screen itself is shared. */
const BENEFITS = ["Every test type, not just the daily three","No ads, ever","Unlimited practice runs","Full history, percentile trends and export"];

export default function Paywall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();

  const packages = usePremiumStore((s) => s.packages);
  const isPremium = usePremiumStore((s) => s.isPremium);
  const isPurchasing = usePremiumStore((s) => s.isPurchasing);
  const error = usePremiumStore((s) => s.error);
  const purchase = usePremiumStore((s) => s.purchase);
  const restore = usePremiumStore((s) => s.restore);
  const refreshOfferings = usePremiumStore((s) => s.refreshOfferings);

  useEffect(() => {
    void refreshOfferings();
  }, [refreshOfferings]);

  // A user who already owns it must never be left staring at a buy button.
  useEffect(() => {
    if (isPremium) router.back();
  }, [isPremium, router]);

  const monthly = packages.map(toPlanLike).find((p: PlanLike) => p.periodUnit === 'MONTH');

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ alignItems: 'flex-end', padding: spacing.base }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          onPress={() => router.back()}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <Text variant="body" tone="muted">
            Close
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing['3xl'] }}>
        <Text variant="display">Quiktap Pro</Text>
        <Text variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
          How fast are your reflexes today? Thirty seconds to find out.
        </Text>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
              <Text variant="bodyStrong" style={{ color: colors.accent }}>
                ✓
              </Text>
              <Text variant="body" style={{ flex: 1 }}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: spacing['2xl'], gap: spacing.md }}>
          {packages.length === 0 ? (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator color={colors.textMuted} />
              <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
                Loading plans…
              </Text>
            </View>
          ) : (
            packages.map((pkg, index) => {
              const summary = summarizePlan(toPlanLike(pkg), monthly);
              const isBest = index === 0;
              return (
                <Pressable
                  key={pkg.identifier}
                  accessibilityRole="button"
                  disabled={isPurchasing}
                  onPress={() => void purchase(pkg)}
                  style={{
                    borderWidth: isBest ? 2 : 1,
                    borderColor: isBest ? colors.accent : colors.border,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                    minHeight: 64,
                    backgroundColor: colors.surface,
                    opacity: isPurchasing ? 0.6 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">{summary.title}</Text>
                      <Text variant="caption" tone="muted">
                        {summary.cadence}
                        {summary.savingsPercent ? ` · save ${summary.savingsPercent}%` : ''}
                      </Text>
                    </View>
                    <Text variant="bodyStrong">{pkg.product.priceString}</Text>
                  </View>
                  {isBest ? (
                    <Text variant="micro" style={{ color: colors.accent, marginTop: spacing.xs }}>
                      BEST VALUE
                    </Text>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>

        {error ? (
          <Text variant="caption" style={{ color: colors.danger, marginTop: spacing.base }}>
            {error}
          </Text>
        ) : null}

        <Button
          label="Restore purchases"
          variant="ghost"
          onPress={() => void restore()}
          style={{ marginTop: spacing.lg }}
        />

        <Text variant="micro" tone="faint" style={{ marginTop: spacing.xl, textAlign: 'center' }}>
          Payment is charged to your store account. Subscriptions renew unless cancelled at least
          24 hours before the period ends; manage them in your account settings.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.md }}>
          <Pressable onPress={() => void Linking.openURL(TERMS_URL)} hitSlop={12}>
            <Text variant="micro" tone="faint">
              Terms
            </Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={12}>
            <Text variant="micro" tone="faint">
              Privacy
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
