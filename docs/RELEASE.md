# Release and publication status

Status checked 25 September 2026. The direct-download beta is 2.0.0-beta.3; store build numbers and review states are separate. Traditional-rule and physical-device validation limitations remain explicit.

## Build outputs

| Platform | Delivery | Signing/account requirement |
|---|---|---|
| Web | Static offline PWA | HTTPS host; browser installation |
| Windows | Microsoft Store x64/ARM64 packages 2.0.1.0; separate direct-download beta | Tile-art correction resubmitted 22 September; still in certification on 25 September |
| Linux | Electron AppImage and Debian package | Distribution testing on supported distros |
| macOS | Mac App Store 2.0.0; separate notarized Apple Silicon beta DMG | App Store version approved and publicly listed; France excluded pending documentation |
| Android | Capacitor APK and signed Play bundle | Closed-test release prepared/submitted; production eligibility still needs the required consenting testers |
| iOS/iPadOS | Native SwiftUI app with bundled JavaScriptCore calculations | 2.0.0 build 5 delivered and attached to the draft; guideline 4.2 remediation testing before resubmission |

A Simulator app is not installable on a physical iPhone. An unsigned Android bundle is not ready for Play upload. Unsigned desktop packages can trigger OS trust prompts. Build success is not equivalent to real-device acceptance.

The `Verify and build all platforms` GitHub workflow first runs numerical and browser tests, then builds each native target on its own OS. Results and packages appear as workflow artifacts. No signing credentials are stored in the repository.

## Account-dependent steps

The Apple Silicon Mac installer has completed notarization using the owner’s local Keychain profile. Existing Developer ID and Mac App Store signing identities are available on the owner’s Mac; no credentials or private keys are stored in this repository. Store account access and signing are configured locally. App Store Connect has processed native iOS build 5. Microsoft certification and Google Play production eligibility remain separate steps; approval is not implied by a successful upload. For new personal Google Play accounts, current guidance requires at least 12 continuously opted-in testers for 14 days before applying for production access. Check the policy again at submission.

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

The web app is published at https://panchang.eksaar.com/ with an alternate at https://gopalasubramanium.github.io/panchang_clock/ and passed the Chromium production-URL browser suite, including offline reload. The local Electron app also passed a launch/calendar/sandbox smoke check. Initial GitHub CI successfully produced Windows, Linux, macOS and iOS Simulator outputs. The Android setup step initially failed because a setup action requested the retired SDK `tools` package; it was updated to request `platform-tools` explicitly. Final build results are recorded in the delivery report.

WebKit passed desktop/mobile UI, automated accessibility, calendar, export, language/RTL and offline calculations. Its automated offline reload returned a browser-internal error, so that capability is not claimed as verified in WebKit. Local Playwright Firefox could not start because of a profile-directory error; no Firefox pass is claimed. These limitations do not invalidate the successful Chromium tests, and remain explicit validation gaps.

## Beta 2 signing and research

The privacy and usability changes are documented in USER-RESEARCH-2026-09.md. CI prerelease publication is opt-in through the workflow’s publish_release input, depends on every platform job, identifies unsigned/test packages explicitly, and includes checksums and GitHub build attestations. The macOS local signing path uses the existing Developer ID. Apple accepted beta 3 submission `917b9752-e698-424c-b100-82b420c6a744`; the app and final installer pass strict signature verification, validated ticket stapling and Gatekeeper assessment as Notarized Developer ID. The app inside the final mounted installer was also verified. This locally signed addition has its own checksum and notarization metadata; it is separate from the original CI build attestations.

Public metadata for store submissions: name Eksaar Panchang; bundle/application ID com.eksaar.panchang; privacy URL https://panchang.eksaar.com/privacy.html; support URL https://panchang.eksaar.com/support.html; publisher Gopala Subramanium. Screenshots must match the final build and each store’s required dimensions. Declare optional location/notifications and no app-operated collection accurately; account-specific disclosures must be reviewed during submission.

## Notarized Mac download

[Download beta 3 for Apple Silicon Macs, macOS 13 or later](https://github.com/gopalasubramanium/panchang_clock/releases/download/v2.0.0-beta.3/Eksaar-Panchang-2.0.0-beta.3-macOS-AppleSilicon-NOTARIZED.dmg). This is a direct-download beta, not a Mac App Store release or an Intel build. The release includes `MACOS-NOTARIZATION.json` and `MACOS-NOTARIZED-SHA256.txt`.

Installer SHA-256: `690e5fd3f1a381ad02bd89129046c97df4050d67ed14d71d5519823b02b7d548`. Source commit: `05a419aad233999d997d5ac9f9826574f3654949`. Earlier unsigned Mac assets remain available as original CI artifacts; use the explicitly NOTARIZED installer for direct installation. The current store status is recorded separately in the table above.
