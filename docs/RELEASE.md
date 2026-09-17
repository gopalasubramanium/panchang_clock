# Release and publication status

Version: 2.0.0-beta.1. This is a tested development beta with explicit remaining traditional-rule and platform-validation work.

## Build outputs

| Platform | Delivery | Signing/account requirement |
|---|---|---|
| Web | Static offline PWA | HTTPS host; browser installation |
| Windows | Electron NSIS installer and portable executable | Unsigned beta; Authenticode certificate recommended before broad release |
| Linux | Electron AppImage and Debian package | Distribution testing on supported distros |
| macOS | Electron DMG and ZIP | Developer ID signing and notarization for normal public distribution |
| Android | Capacitor debug APK and unsigned release AAB | Google Play account, upload key, Play App Signing and store submission |
| iOS/iPadOS | Capacitor project and Simulator build | Apple Developer Program, team/provisioning, archive, TestFlight and App Review |

A Simulator app is not installable on a physical iPhone. An unsigned Android bundle is not ready for Play upload. Unsigned desktop packages can trigger OS trust prompts. Build success is not equivalent to real-device acceptance.

The `Verify and build all platforms` GitHub workflow first runs numerical and browser tests, then builds each native target on its own OS. Results and packages appear as workflow artifacts. No signing credentials are stored in the repository.

## Account-dependent steps

The owner confirmed no developer accounts. Apple enrollment, identity verification and membership terms require the owner's participation. Google Play enrollment also requires owner details. For new personal Google Play accounts, current guidance requires at least 12 continuously opted-in testers for 14 days before applying for production access. Check the policy again at submission.

- [Apple enrollment](https://developer.apple.com/programs/enroll/)
- [Google testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

No identity, legal agreement, payment, signing key or review approval has been fabricated or bypassed.

## Before a production store release

1. Complete the P0 traditional-rule validation in RESEARCH.md, or constrain the store listing explicitly to the supported scope.
2. Test physical Android/iOS devices for permission denial, offline first launch after install, share sheets, exported calendar import, reminder delivery, font shaping, rotation, suspend/resume and OS updates.
3. Verify keyboard/VoiceOver/TalkBack and larger text. Automated axe checks alone do not establish full accessibility conformance.
4. Choose support contact/URL, age rating, content declarations, privacy disclosures and screenshots. The app's lack of remote data collection should be verified against the final native dependencies and host before completing store forms.
5. Create signing identities, set final version/build numbers, run signed release builds and retain keys securely.
6. Conduct a small closed beta with real users, resolve crash and calendar issues, then submit to the stores.

## Proposed public listing copy

Eksaar Panchang — your day, in rhythm. Explore daily Panchang, local sunrise and lunar transitions, a monthly calendar, traditional timing periods and your family's lunar dates. Calculations run on your device, with offline access and no advertising. Select Amanta or Purnimanta and your sunrise convention. Share a daily card or export timing periods to your calendar.

Beta limitations: festival dates are previews; advanced regional and fasting rules are still being reviewed. New explanatory text is currently in English, with traditional names in twelve languages.

## Growth plan

Start with a transparent beta and a readable methods page. Recruit regional reviewers and an opt-in group of diaspora families. Use their mismatch reports to improve rule packs before promotion. Shareable cards and persistent date/location links support organic discovery. No claim of guaranteed virality, no purchased reviews, no unsolicited bulk outreach.

## Verified during this implementation

The web beta is published at https://gopalasubramanium.github.io/panchang_clock/ and passed the Chromium production-URL browser suite, including offline reload. The local Electron app also passed a launch/calendar/sandbox smoke check. Initial GitHub CI successfully produced Windows, Linux, macOS and iOS Simulator outputs. The Android setup step initially failed because a setup action requested the retired SDK `tools` package; it was updated to request `platform-tools` explicitly. Final build results are recorded in the delivery report.

WebKit passed desktop/mobile UI, automated accessibility, calendar, export, language/RTL and offline calculations. Its automated offline reload returned a browser-internal error, so that capability is not claimed as verified in WebKit. Local Playwright Firefox could not start because of a profile-directory error; no Firefox pass is claimed. These limitations do not invalidate the successful Chromium tests, and remain explicit validation gaps.
