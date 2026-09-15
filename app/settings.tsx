import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Screen, Text } from '@/components/ui';
import { showPrivacyOptionsForm } from '@/monetization/ads';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/monetization/config';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useTheme, type ThemePreference } from '@/theme';

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

function Row({ label, detail, onPress }: { label: string; detail?: string; onPress: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        minHeight: 48,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text variant="body">{label}</Text>
      {detail ? (
        <Text variant="caption" tone="muted">
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const { colors, spacing, radius, preference, setPreference } = useTheme();
  const isPremium = usePremiumStore((s) => s.isPremium);
  const restore = usePremiumStore((s) => s.restore);
  const offerPrivacyOptions = useAdsConsentStore((s) => s.consent.offerPrivacyOptions);

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen scroll>
        <Text variant="micro" tone="faint" style={{ marginTop: spacing.lg }}>
          APPEARANCE
        </Text>
        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing.sm,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radius.md,
            padding: spacing.xs,
          }}
        >
          {THEME_OPTIONS.map((option) => {
            const selected = preference === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setPreference(option.key)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.sm,
                  backgroundColor: selected ? colors.surface : 'transparent',
                }}
              >
                <Text variant="callout" tone={selected ? 'default' : 'muted'}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="micro" tone="faint" style={{ marginTop: spacing.xl }}>
          Quiktap PRO
        </Text>
        {isPremium ? (
          <View style={{ paddingVertical: spacing.md }}>
            <Text variant="body">Pro is active. Thank you.</Text>
          </View>
        ) : (
          <Row label="Unlock Pro — remove ads" onPress={() => router.push('/paywall')} />
        )}
        <Row
          label="Restore purchases"
          onPress={() => {
            void restore().then((result) => {
              Alert.alert(
                result === 'purchased' ? 'Restored' : 'Nothing to restore',
                result === 'purchased'
                  ? 'Your purchase is active again.'
                  : 'No previous purchase was found on this account.',
              );
            });
          }}
        />

        {offerPrivacyOptions ? (
          <>
            <Text variant="micro" tone="faint" style={{ marginTop: spacing.xl }}>
              PRIVACY
            </Text>
            <Row label="Ad privacy settings" onPress={() => void showPrivacyOptionsForm()} />
          </>
        ) : null}

        <Text variant="micro" tone="faint" style={{ marginTop: spacing.xl }}>
          ABOUT
        </Text>
        <Row label="Privacy policy" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} />
        <Row label="Terms of use" onPress={() => void Linking.openURL(TERMS_URL)} />
        <Row
          label="Contact support"
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
        <Row label="Version" detail={version} onPress={() => {}} />
      </Screen>
      <BannerAdSlot />
    </View>
  );
}
