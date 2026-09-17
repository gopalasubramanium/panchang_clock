# Project guide

Eksaar Panchang 2.0 beta is a modular Vite/JavaScript application. Read README.md and docs/ACCURACY.md before changing astronomical or calendrical behavior.

- `src/engine.js`: pure astronomical/calendar engine; absolute UTC instants.
- `src/time.js`: civil dates, IANA/fixed zones, DST resolution and formatting.
- `src/festivals.js`: declarative PREVIEW rules; never present as certified regional dates.
- `src/main.js`, `src/style.css`, `src/locales.json`: interface and inherited 12-language terminology.
- `src/calendar-worker.js`: off-main-thread monthly calculations.
- `src/export.js`, `src/platform.js`: calendar files, optional native capabilities.
- `desktop/`, `android/`, `ios/`: platform shells.
- `tests/`: independent ephemeris/solar/transition fixtures and regression/browser tests.
- `scripts/service-worker.mjs`: build-time versioned offline cache.

Use Node 24 and pnpm 11.19.0. Run `pnpm test`, `pnpm build`, serve preview, then `pnpm test:browser` for UI changes. Native projects need `pnpm exec cap sync` after a web build. Never check in signing keys or certificates.

Dates supported for user input: 1900–2100. Sunrise conventions and lunar-month types are explicit. Root-search precision is not ephemeris accuracy. No invented polar rise/set times, fixed-date solar festivals, or universal claims about auspiciousness. Extend independently sourced fixtures when changing calculations.

Original single-file app: `legacy/index-v1.html` (not shipped). The old architecture and accuracy claims are superseded.
