# Eksaar Panchang 2.0 — public beta

An offline-first Panchang for worldwide locations: daily and monthly views, 12-language traditional names, explicit calculation conventions, and shared web/desktop/mobile source.

**This is a beta, not a claim to be the most accurate or comprehensive Panchang.** Astronomical calculations have independent numerical comparisons. Festival rules are previews, and several regional/sectarian observance systems still require expert validation. See [research and scope](docs/RESEARCH.md), [accuracy](docs/ACCURACY.md), and [release status](docs/RELEASE.md).

## Run

Node 24+ and pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm test
pnpm build
pnpm preview
# In another terminal; first install a Playwright browser on Linux:
pnpm exec playwright install chromium
pnpm test:browser
```

On macOS browser tests use installed Google Chrome. Set `CHROME_PATH` to override. `TEST_URL` selects another preview URL. Open `dist/` through an HTTP server; the modular app is not intended for `file://` loading.

## What changed

- Astronomy Engine 2.1.19 replaces truncated solar/lunar and single-term planetary approximations.
- IANA time zones include historical offsets and DST. Ambiguous times have an explicit earlier/later setting; nonexistent times are rejected. Coordinates of zero remain valid.
- Tithi, Nakshatra, Yoga, and Karana have dated start/end timestamps and sunrise-day transitions. Pre-sunrise Vaara belongs to the preceding sunrise day.
- Amanta and Purnimanta month names, intercalary-month detection, a rare skipped-month warning, Chaitradi Vikram/lunisolar Shaka years, and Tamil solar-month references.
- Geometric-centre and observed-upper-limb sunrise settings; moonrise/moonset; no fabricated polar events.
- Day/night Choghadiya with Rahu/Yama/Gulika overlap notes and 24 horas ending at the next actual sunrise. Wednesday Abhijit is omitted under the stated convention.
- Preview festival rules use named local observation windows and astronomical Sankranti. The previous incorrect Amrit Kalam label is removed; Amrita Choghadiya is named distinctly.
- Actual ascendant/whole-sign reference chart, mean lunar nodes, lunar phases and eclipse lookup.
- Worker-based monthly calendar, personal lunar dates and JSON backup/restore.
- Offline PWA, light/dark modes, Urdu RTL, mobile layouts and accessible controls.
- Share text/link/image, UTC calendar exports with reminders, JSON export, and browser print/PDF without a CDN.
- Electron desktop and Capacitor Android projects; optional native sharing, location and notifications.
- A native SwiftUI iPhone/iPad target with daily and month views, saved lunar rules, Apple Calendar event editing, protected local storage and offline JavaScriptCore calculations. See [iOS workflows and scope](docs/IOS-NATIVE.md); the native target does not embed the web UI.

Traditional labels are carried over from the original twelve-language dictionary. New explanations remain English; full translation review is pending. The original implementation is preserved in `legacy/index-v1.html` and Git history, excluded from the production build.

## Calculation interface

```js
import { daily } from './src/engine.js';
const result = daily('2026-09-17',
  {name:'Singapore', lat:1.3521, lon:103.8198, zone:'Asia/Singapore', elevation:0},
  {convention:'amanta', sunriseMode:'geometric'},
  '2026-09-17T04:00:00Z');
```

All event timestamps are UTC ISO 8601 instants. Render them in the result's location zone. `?api=true&date=2026-09-17&time=12:00&lat=0&lon=0&zone=UTC` displays browser-generated JSON. It is **not an HTTP JSON API**. Legacy DDMMYYYY and numeric `tz` links are accepted as fixed-offset zones; use `zone` for DST.

## Platform builds

```sh
pnpm build
node node_modules/electron/install.js
pnpm pack:desktop
pnpm exec cap sync android
pnpm exec cap open android
# Native iPhone/iPad (requires Xcode 26+):
pnpm build:ios-native
open ios/App/App.xcodeproj
```

Native signing identities and developer accounts are not included. CI builds unsigned desktop packages, a debug Android APK/unsigned Android App Bundle, and an iOS Simulator app. A Simulator app cannot be installed on an iPhone. See `docs/RELEASE.md` before distribution.

## Privacy and licensing

No account, analytics, advertising or remote calculation service. The app stores settings and personal dates locally. Location access is optional. Sharing a link discloses the chosen coordinates. Web hosts and OS location/share services have their own data handling. Android automatic cloud backup is disabled.

MIT, including the original application. Astronomy Engine is MIT. Dependency notices are in `public/THIRD_PARTY_NOTICES.txt`. Swiss Ephemeris/PySwissEph is used only as a separately installed validation tool; it is not linked into or shipped with this application.

## September 2026 usability and privacy update

Offline city search covers 34,145 city centres. Monthly exports support category filters and advance calendar reminders. Larger text, saved places, explanations and local mismatch reports improve daily use. Sharing coordinates is an explicit choice; new calculation links use URL fragments. See [the review research](docs/USER-RESEARCH-2026-09.md), [creator credits](CREDITS.md), [privacy notice](public/privacy.html), and [security policy](SECURITY.md).

Cloudflare Workers serves the static build using `wrangler.jsonc`; run `pnpm build` before deployment. The canonical address is https://panchang.eksaar.com/. `_headers` is a hosting configuration file and is intentionally excluded from offline precaching.

Build macOS release artifacts outside an iCloud-synced output folder if Finder metadata is reintroduced during signing. A Developer ID signature must be followed by Apple notarization, stapling and Gatekeeper verification before advertising a trusted macOS download. Never commit credentials.
