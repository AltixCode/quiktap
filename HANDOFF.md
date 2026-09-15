# Quiktap — handoff

> Written 2026-09-15. **Unverified is UNKNOWN, never a pass** — a green build is
> not a verification. Every row below says what was actually run.

**Quiktap** — a thirty-second daily reaction and focus test.
Plan: `/Volumes/ExtremePro/Dev/next_mobile_apps/PLAN_2.md` (PLAN_2.md §6).
Portfolio rules: `Dev/AGENTS.md`, then `Dev/docs/agents/18-app-lifecycle.md`.

## State at a glance

| | |
|---|---|
| Stage | **Scaffold only** — the game is not written |
| Tests | 186 passing |
| Device pass | ⬜ never run |
| Released | ⬜ no |

## Verification state

| Gate | State |
|---|---|
| Lint | ✅ |
| Typecheck | ✅ |
| Unit tests (186) | ✅ |
| i18n completeness — 14 locales | ✅ |
| UI rules — colour tokens, `t()` | ✅ |
| iOS + Android bundle export | ✅ |
| CI on a self-hosted runner | 🔨 running when this was written — re-check with `gh run list` |
| `check:release` with real identifiers | ✅ passes in CI |
| Builds / launches on the iOS simulator | ⬜ |
| Interaction driven on the Android emulator | ⬜ |
| Light **and** dark checked on device | ⬜ |
| Purchase flow against a real offering | ⬜ no store product exists yet |
| Ads served under real consent | ⬜ no consent message published yet |

## What is built

**Only the shared scaffold. No game exists yet.**

What the scaffold already gives you, working and tested (186 tests):

- expo-router shell: home placeholder, settings, paywall
- 14 locales with plural and RTL handling, and `check-i18n` / `check-ui-rules`
  failing the build on a partial locale or a hard-coded string
- theme tokens with both appearances, AA contrast asserted by unit test
- RevenueCat behind the single `remove_ads` entitlement, lifetime-only
- AdMob banner, interstitial and rewarded, gated on UMP consent and iOS ATT,
  failing closed
- `npm run check:release`, CI, and the release identifiers already in repo
  secrets

## What is left

1. **Write the game.** Nothing of it exists yet — reaction timing, test types, percentile history.
   The plan for this app is `next_mobile_apps/PLAN_2.md` (PLAN_2.md §6).
   Follow the pattern the five finished apps use — pure logic in `src/logic/`
   with no React import, generated content verified by a solver, then screens.
2. **Game copy in all fourteen locales.** Use
   `next_mobile_apps/scripts/add_i18n_keys.py` with a keys JSON, the same way
   the finished apps did it; `npm run check:i18n` enforces completeness.
3. **Free tier**, as planned: the daily three; every test type behind the unlock.
4. **Tests** to the coverage thresholds in `jest.config.js`. CI enforces them
   and a local `jest` run does not — use `npm run test:ci`.
5. **Device pass** — `npm run verify:device`.
6. **Screenshots**, then store records (below), then submit.

## Identifiers — already provisioned, do not recreate

Changing a bundle id means deleting and recreating the RevenueCat app, which
**invalidates its public SDK keys**. These are settled.

| | |
|---|---|
| Bundle id / package | `com.altixcode.quiktap` |
| Scheme | `quiktap://` |
| GitHub | `AltixCode/quiktap` |
| RevenueCat project | `projbfd3d198` |
| RevenueCat iOS app | `app528d9230a9` |
| RevenueCat Android app | `appa1bdfcd36c` |
| Entitlement | `remove_ads` (`entlff28912fc2`) |
| Offering / package | `default` (`ofrngc7fcc009da`) / `$rc_lifetime` (`pkge6ea9e1c2a9`) |
| AdMob app (iOS) | `ca-app-pub-2504845459806550~8277513017` |
| AdMob app (Android) | `ca-app-pub-2504845459806550~9134852002` |
| AdMob banner (iOS / Android) | `ca-app-pub-2504845459806550/7793850174` / `ca-app-pub-2504845459806550/9975581378` |
| AdMob interstitial (iOS / Android) | `ca-app-pub-2504845459806550/6936511187` / `ca-app-pub-2504845459806550/1771367300` |
| AdMob rewarded (iOS / Android) | `ca-app-pub-2504845459806550/5623429516` / `ca-app-pub-2504845459806550/9458285637` |

All ten release identifiers plus `EXPO_TOKEN` are already GitHub repo secrets.
Locally they come from `/Volumes/ExtremePro/Dev/.admob-ids/quiktap.env` —
never commit that file.

## Blocked on a person — cannot be scripted

These three have no write API at all. Browser sessions live in the Playwright
MCP profile (`~/Library/Caches/ms-playwright-mcp/`).

1. **App Store Connect record** — the session was expired on 2026-09-15 and
   **needs a sign-in**. Then:
   `asc iris apps create --name "Quiktap" --bundle-id com.altixcode.quiktap --sku quiktap-ios`
   The bundle id is already registered. Everything after the record — IAP,
   pricing, localisations — is scriptable.
2. **Play Console app.** A Play app has **no package name until its first bundle
   is uploaded**, so the order is: create app → upload an AAB to internal testing
   → *then* create the `remove_ads` product. Build that first AAB from a
   **non-production** profile so testers generate no live ad impressions.
3. **AdMob GDPR + US-states consent messages.** The apps and all six ad units
   exist, but **no consent message is published**. The SDK can only present a
   message that exists, and this app fails closed — so in the EEA it currently
   shows **no ads at all**. Publish both under Privacy & messaging.

Also expect **"Requires review — limited ad serving"** on every new AdMob app
for a few days. That is normal, not an integration fault.

## Decisions that are the owner's, not an agent's

- Publish on altixcode.com and itsata.com? **Not yet asked.** Procedure:
  `docs/agents/14-portfolio-demos.md`.
- App Store name. Casual and puzzle names are heavily contested; budget several
  attempts. Apple checks the whole title string, so `Name: Descriptor` often
  clears when the bare name does not. ASC names stay editable until first release.

## Traps already paid for — do not rediscover

- `npm run test:ci` enforces coverage thresholds; a plain `jest` run does not.
  CI has caught this twice.
- **A coverage shortfall in CI may not be about coverage.** Jest's default worker
  count exhausted the shared runner's file descriptors — `ENFILE: file table
  overflow` — and three suites failed to LOAD, so their files went uncovered and
  the job blamed the thresholds. `test:ci` runs `--runInBand` for this reason;
  do not remove it.
- **`package-lock.json` must be committed.** Without it every job dies at
  setup-node with "Dependencies lock file is not found", and `npm ci` cannot run
  at all. Generate one without installing: `npm install --package-lock-only`.
- RNTL 14: `render` and `fireEvent` are async — **await both**. Put each
  screen's tests in its own file, and never call `jest.restoreAllMocks()` in a
  screen test: it restores spies the renderer relies on and the next test's tree
  is torn down as it renders.
- Reset a board by **remounting a keyed component**, never by setState in an
  effect — otherwise one frame shows the previous puzzle on the new board.
- Keep gesture hit-testing on the JS thread. A worklet calling a plain JS helper
  throws *"Tried to synchronously call a Remote Function"* on first touch:
  invisible to Jest, fatal on device.
- `expo run:android` wants the **AVD name**, not the adb serial, and can fail in
  seconds leaving the previous APK installed. Always check its exit code.
- iOS verification stops at build / install / launch / render: Simulator.app is
  missing from this Xcode install, so the ATT prompt cannot be dismissed. **Drive
  interaction on Android.**
- Export `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`
  for any Android build, or Gradle silently falls back to JDK 25 and CMake dies.
- Shared code is generated. Fix it in `AltixCode/next-mobile-apps` (`_template/`)
  and re-run `node scripts/bootstrap.mjs quiktap`, never in this copy —
  otherwise the next regeneration reverts it.
