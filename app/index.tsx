import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button, Card, Text } from '@/components/ui';
import { t, type TranslationKey } from '@/i18n';
import {
  FREE_HISTORY,
  MODES,
  ROUND_SECONDS,
  canUseMode,
  gradeFor,
  nextTargetAt,
  scoreSession,
  targetPositions,
  type Tap,
} from '@/logic/reaction';
import { noteGameFinished } from '@/monetization/pacing';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useRoundStore } from '@/store/useRoundStore';
import { MIN_TOUCH_TARGET, useTheme, withAlpha } from '@/theme';

const TARGET_RADIUS = 38;
/** The playfield redraws at this rate while a round is running. */
const TICK_MS = 100;

type Phase = 'idle' | 'waiting' | 'live' | 'over';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const isReady = usePremiumStore((s) => s.isReady);
  const mode = useRoundStore((s) => s.mode);
  const selectMode = useRoundStore((s) => s.selectMode);
  const record = useRoundStore((s) => s.record);
  const hydrate = useRoundStore((s) => s.hydrate);
  const history = useRoundStore((s) => s.history);
  const personalBestMs = useRoundStore((s) => s.personalBestMs);

  const [phase, setPhase] = useState<Phase>('idle');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [index, setIndex] = useState(0);
  const [taps, setTaps] = useState<Tap[]>([]);
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [tooSoon, setTooSoon] = useState(false);
  const [field, setField] = useState({ width: 300, height: 380 });

  // The moment the current target became tappable. A ref rather than state
  // because writing it must not cause a render — the render is what draws the
  // target, and re-rendering on the appearance would restart the animation.
  const appearedAt = useRef(0);

  // The taps so far, mirrored into a ref so the round can be scored from inside
  // the ticker callback. Reading state there would close over the value from the
  // render that started the interval, which is the empty array.
  const tapsRef = useRef<Tap[]>([]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const running = phase === 'waiting' || phase === 'live';

  // One ticker drives both the countdown and the end of the round.
  //
  // The round is finished here, inside the interval callback, rather than in an
  // effect that watches the clock: setState in an effect body is a cascading
  // render, and the React Compiler lint refuses it. A callback is an event, and
  // ending a round genuinely is one.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (at < endsAt) return;
      clearInterval(id);
      setPhase('over');
      record(scoreSession(tapsRef.current));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // `at` rather than a second Date.now(): the policy and the record must
      // agree on when the round ended.
      void noteGameFinished(at);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, endsAt, record, isPremium, isReady]);

  // A target becomes live after its scheduled gap.
  useEffect(() => {
    if (phase !== 'waiting') return;
    const gap = nextTargetAt(seed, index);
    const id = setTimeout(() => {
      appearedAt.current = Date.now();
      setPhase('live');
    }, gap);
    return () => clearTimeout(id);
  }, [phase, seed, index]);

  const start = useCallback(() => {
    setSeed(Math.floor(Math.random() * 1e9));
    setIndex(0);
    setTaps([]);
    tapsRef.current = [];
    setTooSoon(false);
    setEndsAt(Date.now() + ROUND_SECONDS * 1000);
    setNow(Date.now());
    setPhase('waiting');
  }, []);

  const hit = () => {
    const reaction = Date.now() - appearedAt.current;
    tapsRef.current = [...tapsRef.current, { reactionMs: reaction, hit: true }];
    setTaps(tapsRef.current);
    setIndex((i) => i + 1);
    setTooSoon(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('waiting');
  };

  const early = () => {
    // A tap before the target exists. Recorded as a miss so the average cannot
    // be gamed by hammering the screen.
    tapsRef.current = [...tapsRef.current, { reactionMs: -1, hit: false }];
    setTaps(tapsRef.current);
    setTooSoon(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const pickMode = (id: string) => {
    if (selectMode(id, isPremium) === 'locked') router.push('/paywall');
  };

  const score = scoreSession(taps);
  const best = personalBestMs();
  const rows = history(isPremium);
  const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const position = targetPositions(seed, index, field.width, field.height, TARGET_RADIUS);
  const isGoSignal = mode === 'gosignal';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.base,
          paddingHorizontal: spacing.base,
          paddingBottom: spacing.xl,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text variant="title" style={styles.grow}>
            {t('appName')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsTitle')}
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={styles.iconSlot}
          >
            <Feather name="settings" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {running ? (
          <Text variant="display">{secondsLeft}</Text>
        ) : (
          <View style={[styles.chipRow, { gap: spacing.sm }]}>
            {MODES.map((m) => {
              const allowed = canUseMode(m.id, isPremium);
              const name = t(m.nameKey as TranslationKey);
              const chosen = m.id === mode;
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityLabel={allowed ? name : t('modeLocked', { name })}
                  accessibilityState={{ selected: chosen, disabled: !allowed }}
                  onPress={() => pickMode(m.id)}
                  style={[
                    styles.chip,
                    {
                      borderRadius: radius.full,
                      paddingHorizontal: spacing.base,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: chosen ? colors.accent : colors.border,
                      backgroundColor: chosen ? withAlpha(colors.accent, 0.16) : colors.surface,
                    },
                  ]}
                >
                  {/* A locked mode is something you can buy, not a dead control.
                      It was dimmed twice over -- opacity 0.55 AND a muted tone,
                      taking the name to 2.40:1 -- while the lock icon beside it
                      already said everything the dimming was trying to say. */}
                  <Text variant="body">{name}</Text>
                  {allowed ? null : <Feather name="lock" size={14} color={colors.textMuted} />}
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={phase === 'live' ? t('tapNow') : t('waitForGreen')}
          disabled={!running}
          onPress={phase === 'live' ? hit : early}
          onLayout={(e) =>
            setField({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
          style={[
            styles.field,
            {
              borderRadius: radius.lg,
              backgroundColor: phase === 'live' && isGoSignal ? colors.success : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {phase === 'live' && !isGoSignal ? (
            <View
              style={[
                styles.target,
                {
                  left: position.x - TARGET_RADIUS,
                  top: position.y - TARGET_RADIUS,
                  borderRadius: radius.full,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          ) : null}
          {!running ? (
            <Text variant="body" tone="muted">
              {t(MODES.find((m) => m.id === mode)?.descKey as TranslationKey)}
            </Text>
          ) : phase === 'waiting' ? (
            <Text variant="body" tone="muted">
              {tooSoon ? t('tooSoon') : t('waitForGreen')}
            </Text>
          ) : isGoSignal ? (
            <Text variant="heading">{t('tapNow')}</Text>
          ) : null}
        </Pressable>

        {phase === 'over' ? (
          <Card>
            <Text variant="heading">{t('roundOver')}</Text>
            <Text variant="display">{t(gradeFor(score.averageMs).key as TranslationKey)}</Text>
            <Text variant="body">
              {t('averageLabel')}: {score.averageMs} ms
            </Text>
            <Text variant="body">
              {t('bestLabel')}: {score.bestMs} ms
            </Text>
            <Text variant="caption" tone="muted">
              {t('hitsLabel')}: {score.hits} · {t('missesLabel')}: {score.misses}
            </Text>
          </Card>
        ) : null}

        {running ? null : (
          <Button
            label={phase === 'over' ? t('againCta') : t('startCta')}
            icon="zap"
            onPress={start}
          />
        )}

        {best === null ? null : (
          <Text variant="caption" tone="muted">
            {t('personalBest', { ms: best })}
          </Text>
        )}

        <Text variant="heading" style={{ marginTop: spacing.base }}>
          {t('historyTitle')}
        </Text>
        {rows.length === 0 ? (
          <Text variant="body" tone="muted">
            {t('noRounds')}
          </Text>
        ) : (
          rows.slice(0, 10).map((r) => (
            <Card key={r.at}>
              <View style={styles.row}>
                <Text variant="body" style={styles.grow}>
                  {t(gradeFor(r.averageMs).key as TranslationKey)}
                </Text>
                <Text variant="body" tone="muted">
                  {r.averageMs} ms
                </Text>
              </View>
            </Card>
          ))
        )}
        {isPremium ? null : (
          <Text variant="caption" tone="muted">
            {t('historyLocked', { n: FREE_HISTORY })}
          </Text>
        )}
      </ScrollView>
      <BannerAdSlot />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  iconSlot: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: MIN_TOUCH_TARGET },
  field: {
    // Square, sized from the width it is given. A fixed height left a dead band
    // below the controls on a large screen, and the targets are positioned from
    // the measured layout so they follow whatever size it ends up.
    aspectRatio: 1,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  target: { position: 'absolute', width: TARGET_RADIUS * 2, height: TARGET_RADIUS * 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
