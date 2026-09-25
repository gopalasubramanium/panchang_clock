# Native iPhone and iPad app

The iOS target uses SwiftUI navigation, lists, forms, date/time controls and a selectable month calendar. Its scientific calculations run in a private JavaScriptCore context using the same Astronomy Engine implementation and Panchang rules as the other platforms. The iOS target does not link Capacitor, instantiate a web view, load HTML, or expose a network or native capability bridge to JavaScript.

## Build and verify

Requires Xcode 26 or later and the iOS 26 SDK for App Store uploads. The deployment target is iOS 17, which supports the system calendar editor without requesting access to read a person's calendar database.

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Build bundled scientific resources, the offline city directory and license notices with `pnpm build:ios-native`.
3. Open `ios/App/App.xcodeproj`, select the App scheme and an iPhone or iPad destination.
4. Run the App scheme's XCTest UI tests, or run `python3 scripts/ios-native-tests.py` on a Mac with the supported simulator runtimes installed. The script captures genuine app screens and preserves test results.
5. Run `pnpm test` for numerical, date-boundary, time-zone and bridge regressions.

Use Capacitor only for the Android target. Do not run `cap sync ios` against the native iOS project. App Store signing occurs locally after the unsigned device archive has been checked; signing keys are not uploaded to CI.

## Native workflows

- **Today:** select a date and time, return to sunrise/current time, inspect the five Panchang elements, and open detailed transitions. The selected location's IANA time zone governs displays and calculation inputs.
- **Month:** choose a date in the native calendar, browse observance previews and identify saved lunar dates. At accessibility text sizes the grid becomes a readable date list.
- **Timings:** inspect traditional daily periods, Hora and Choghadiya, then review a chosen event in Apple's calendar editor or request a one-time local notification.
- **My dates:** save a named Amanta month/tithi rule and calculate its next local-sunrise occurrence within 400 days. Skipped/repeated tithis and unsupported dates are explained instead of fabricated.
- **Settings:** choose calculation conventions, traditional names, appearance and time display; search the bundled worldwide city directory; enter manual coordinates/time zone; export a backup and merge valid lunar rules from another backup.

## Privacy and limitations

Saved state uses atomic writes and complete file protection in Application Support, excluded from automatic cloud backup. A user-initiated export can be saved to a chosen Files provider. Imports validate the schema, file size, location bounds, calendar conventions, lunar rules and unique IDs before merging. Corrupt existing state is retained rather than overwritten silently.

Optional location permission is requested only after choosing current position. It is not used for tracking; no reverse-geocoding service is contacted. The user checks the time zone before applying coordinates. Calendar insertion uses EKEventEditViewController and requires the person to review/save; the app does not request calendar read access. Notifications require permission and are local, one-time occurrences; location/rule changes require rechecking or rescheduling.

The app has no account, advertising or app-operated analytics. No guarantee of universal accuracy, complete regional rules or review approval is made. Astronomy Engine 2.1.19, mean Lahiri approximation, Amanta/Purnimanta choice and sunrise conventions are disclosed in the app. Festival/fasting outputs remain previews; advanced Parana and sect-specific rules are not provided. Native iOS screenshots and store claims must reflect this implementation, not the earlier web-shell build.

## Review remediation

Apple rejected iOS 2.0.0 (4) under guideline 4.2 on 23 September 2026. Build 5 replaced the web-shell experience with the native workflows above. Build 6 also keeps city search visible when opening the iPad location picker. It must pass simulator tests and be delivered, attached and resubmitted before its status can be described as submitted. macOS and Android packaging are separate and unchanged by this iOS redesign.
