import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Home screen.
 *
 * Scaffolded placeholder — replaced by the real hub when the game layer lands.
 * It exists from the first commit so the navigation shell, theming, paywall and
 * ad slot are wired and testable before any game logic is written.
 */
export default function Home() {
  const router = useRouter();
  const { spacing, colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen scroll>
        <Text variant="display" style={{ marginTop: spacing['3xl'] }}>
          Quiktap
        </Text>
        <Text variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
          How fast are your reflexes today? Thirty seconds to find out.
        </Text>
        <Button
          label="Settings"
          variant="secondary"
          onPress={() => router.push('/settings')}
          style={{ marginTop: spacing['2xl'] }}
        />
      </Screen>
      <BannerAdSlot />
    </View>
  );
}
