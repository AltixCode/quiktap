# Quiktap — agent notes

Read this before changing anything. Companion docs: the portfolio playbook at
`/Volumes/ExtremePro/Dev/MOBILE-PLAYBOOK.md`, and this app's plan section in
`/Volumes/ExtremePro/Dev/next_mobile_apps/PLAN_2.md`.

## Non-negotiables

1. **TDD.** Write the failing test first, watch it fail, then write the code.
   `src/logic/` is pure and must stay at or above the coverage thresholds in
   `jest.config.js`.
2. **`src/logic/` imports nothing from `react`, `react-native`, or `expo-*`.**
   This is what lets the rules be iterated on from `npm test` alone.
3. **No secrets in the repo.** RevenueCat public SDK keys and AdMob unit ids come
   from the environment. A build without them runs free and ad-free; it does not
   crash. `npm run check:release` is what stops that reaching the stores.
4. **Ads fail closed.** No UMP consent means no ad request — an ad request made
   for an EEA user who never saw a form is what gets an AdMob account suspended.
5. `npm run verify` must pass before any commit.

## Identifiers

| | |
|---|---|
| Bundle id / package | `com.altixcode.quiktap` |
| RevenueCat entitlement | `pro` |
| Lifetime product (iOS) | `com.altixcode.quiktap.removeads` |
| Lifetime product (Android) | `remove_ads` |
| GitHub | `AltixCode/quiktap` |

App Store Connect, Play Console, AdMob and RevenueCat ids are recorded in
`docs/setup-accounts.md` as they are provisioned.

## Status

See `docs/STATUS.md`.
