# Quiktap — handoff

What was actually run, and what is still unknown. **Unverified is `UNKNOWN`,
never a pass** — a green build is not a verification.

Last updated: 2026-09-15

## ⚠️ Assume this app crashes on launch until it is launched

quiktap was built and uploaded to TestFlight on 2026-09-15 **without ever having
been run, once, anywhere**. The "not run" row below was accurate when the
binary was uploaded.

Two of its five siblings built the same evening from the same template —
toppl and quandary — **do** die immediately on launch on a real device. No
one has launched this one either way, so there is no evidence it behaves
differently, and the honest reading is that it does not.

Two fixes have landed since that build, neither confirmed as the cause: an
empty `GADApplicationIdentifier` reaching the binary because `??` does not
catch the empty string that a missing CI secret expands to, and a
`check:release` that accepted a *malformed* AdMob identifier (an app id and an
ad unit id differ only by `~` versus `/`). Both make the Ads SDK abort on
startup, which presents as exactly this symptom.

See toppl's `HANDOFF.md` for the full investigation and what has been ruled
out. **Do not treat this app as shippable until it has been launched.**


## What this app is

Quiktap is a thirty-second reaction round with two modes. ROUND_SECONDS is a named constant so the code and the store listing cannot drift.

Built 2026-09-15 from an empty scaffold: before that the repo held four template
screens and no logic at all, while the tagline, the store record and the paywall
all described a game that did not exist.

## Verification state

| Gate | State | Evidence |
|---|---|---|
| Lint | ✅ | `npm run verify` 2026-09-15 |
| Typecheck | ✅ | `npm run verify` 2026-09-15 |
| Unit tests | ✅ | logic, store and screen tests |
| i18n completeness (14 locales) | ✅ | `npm run check:i18n` |
| Locale scripts (no mixed writing systems) | ✅ | `check-locale-scripts.mjs` |
| UI rules (colour tokens, `t()`) | ✅ | `npm run check:ui` |
| Paywall copy describes this app | ✅ | `check-paywall-copy.mjs` — the claims are backed by code |
| iOS + Android bundle export | ✅ | `expo export` both platforms |
| CI green | ⬜ | queued at last check |
| Builds, installs, launches on a simulator | ⬜ | **not run — belongs to dev-3a** |
| The game actually plays on hardware | ⬜ | **not run** |
| Purchase flow against a real offering | ⬜ | needs a build on hardware |
| Ads served under real consent | ⬜ | needs a build on hardware |

## Store and service state

| | State | Id |
|---|---|---|
| Bundle id registered | ✅ | `com.altixcode.quiktap` |
| App Store Connect record | ✅ | 6812275663 |
| App Store listing copy | ✅ | description, keywords and promotional text written against this app's source |
| App Store screenshots | ❌ | **none** — needs the app running on hardware |
| iOS IAP created and priced | ✅ | 6812277331 |
| Play Console app | ⛔ | blocked: account quota at 15 apps, support request filed |
| AdMob + RevenueCat | ✅ | provisioned account-wide |

## Known UNKNOWNs

- **Nothing here has run on hardware.** The game has never been played. A full
  test suite says the rules are right; it says nothing about whether the app
  launches, whether a tap lands, or whether the screen is legible at arm's
  length. Those rows stay ⬜ until dev-3a runs them.
- Screenshots and the IAP review screenshot both need that same device pass.
