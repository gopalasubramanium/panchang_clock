# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-file HTML/JS Vedic Panchangam (Hindu Astronomical Calendar) dashboard. All astronomical computations run client-side using Jean Meeus's *Astronomical Algorithms*. No build step, no package manager. The only runtime external dependency is `html2pdf.js` (loaded from CDN) used exclusively for PDF export.

There are two HTML files:
- **`index.html`** — The production version (V6). Full-featured with SEO metadata, fixed header/footer, Cinzel/Cormorant Garamond fonts from Google Fonts, collapsible sections, Kundli chart, and API mode.
- **`pclock.html`** — An earlier/simpler version with a different visual style (Segoe UI font, single card layout). Kept as a reference/alternative.

## Development

No build tooling. Open either HTML file directly in a browser — no local server needed.

To test changes: open the file in a browser and reload. Use browser DevTools console for debugging.

To use the JSON API mode (index.html only), append `?api=true&lat=28.61&lon=77.21&tz=5.5&date=2024-04-11` to the URL. This hides the UI and outputs raw JSON.

## Architecture (index.html)

Everything is in one file, structured in clear comment-delimited sections within the `<script>` block:

### Global State
- `S` — mutable session state: `{ lat, lon, tz, date, lang, liveMode }`
- `D` — computed results populated by `compute()`, consumed by `render()`
- `L` — i18n dictionary object for 12 languages (large inline JSON-like object)

### Computation Pipeline
`compute()` → `render()` called on load and every minute in live mode (via `tickClock()` rAF loop).

**`compute()`** calculates all astronomical and calendrical values into `D`:
- Julian Date via `toJD()`, `getT()` (Julian centuries from J2000.0)
- Solar position: `getSunLong()` using VSOP87-derived equations
- Lunar position: `getMoonLong()` using 22-term ELP-2000/82 perturbations
- Lahiri Ayanamsa: `getLahiriAyanamsa()` for tropical→sidereal conversion
- Sunrise/sunset: `getSunTimes()` using `-0.833°` refraction correction
- Tithi, Nakshatra, Yoga endpoints found by bisection search (`findTithiEnd`, `findNakEnd`, `findYogaEnd`)
- Kaalam timings (Rahu, Yama, Gulika) split daylight into 8 equal segments
- Muhurta timings (Abhijit, Brahma, Godhuli), Graha Hora, Amrit Kaalam

**`render()`** is the main entry point that delegates to several specialized sub-renderers:
- `renderStaticLocalizedUi()` — updates all static labels, lang/theme selects, consent banner, footer
- `renderTimeQuality()` — updates the "time quality" / muhurta quality section
- `renderKB()` — updates the Knowledge Base (KB) section dynamic text and its static content
- `renderFestivalBar()` — shows/hides the festival banner based on `getFestivals()`
- `renderKundli()` — draws the North-Indian style Kundli SVG chart using `getPlanetLong()`

**`getPlanetLong(T)`** returns approximate sidereal longitudes for Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu using single-term Meeus approximations.

### Clock
`tickClock()` runs via `requestAnimationFrame`, updating clock hands and digital display. When `S.liveMode` is true, triggers `compute()` + `render()` each minute.

### Language/i18n
`setLang(v)` sets `S.lang` and calls `render()`. Urdu (`ur`) sets `dir="rtl"` on `<body>`. All display strings come from the `L` object keyed by language code.

### Share & Export
- **`shareWhatsApp()`** — builds a localized summary string and opens `wa.me` with it pre-filled.
- **`downloadICS(type)`** — generates an `.ics` calendar file for `abhijit` or `amrit` muhurta and triggers download.
- **`downloadPanchangPDF()`** — async function that populates the hidden `#eksaar-pdf-template` DOM element with current computed data, then calls `html2pdf()` to render it as a multi-page PDF. The PDF template (`#eksaar-pdf-sheet`) uses block-flow CSS that overrides all flex/grid layouts to ensure `html2pdf` can measure heights correctly. The function is defined in a separate `<script>` block (after the main script) to allow the main engine to load independently.

### Festival Detection
`getFestivals(date, masaIdx, ti)` returns an array of festival name strings for the given date based on tithi and masa. `renderFestivalBar()` calls this and shows/hides `#festival-bar`.

### API Mode
`checkAPI()` runs on load — if `?api=true` in URL, it hides the UI and outputs JSON to `<pre id="api-output">`.

### Key Constants
```javascript
// Coordinate defaults (Noida/NCR)
const LAT = 28.5355;
const LON = 77.3910;
const TZ_OFFSET = 5.5;  // IST = UTC+5:30
```
Location presets are hardcoded in the `<select id="sel-location">` dropdown covering 40+ cities across India, Nepal, SE Asia, Middle East, UK, US, Canada, Australia. Domain is `panchang.eksaar.com`.

### Astronomical Data Arrays
- `YOGA_EN[27]`, `KARANA_EN[11]`, `SAMVAT_NAMES[60]` — English-only fallback constants (render() uses `tArr('yogas')` / `tArr('karanas')` with `||YOGA_EN` / `||KARANA_EN` fallback)
- `RASHI_EN[12]`, `RASHI_SYM[12]` — English fallback; `renderKundli()` uses `tArr('rashis')[p.rashi]||RASHI_EN[p.rashi]`
- Each `L` language entry has 86 keys including: `tithis[16]`, `nakshatras[27]`, `masa[12]`, `weekdays[7]`, `months[12]`, `planets[9]` (Sun–Saturn + Rahu/Ketu), `yogas[27]`, `karanas[11]`, `rashis[12]`, `disha` (object), `paksha[2]`, `rituNames[6]`, plus all UI label strings

### i18n Implementation Details
- `t(key)` — single string lookup from `L[S.lang]`, falls back to `L.en`
- `tArr(key)` — array lookup, falls back to `L.en`
- `tN(s)` — converts ASCII digits to locale numerals using `LD` lookup table
- Language preference persists via `localStorage` key `panchangam_lang`; restored by `restoreSavedLang()` in `init()` and synced to `<select id="lang-select">` and `<select id="mo-lang">`
- Urdu sets `dir="rtl"` on `<body>` and `<html>`
- `LANGUAGE_NATIVE_LABELS` maps lang codes to their native-script display names used in the selector UI

## Accuracy Notes
- Sun: ~1–2 arcminutes (VSOP87-derived)
- Moon: ~5–10 arcminutes (22-term ELP-2000/82)
- Planetary positions: simplified single-term Meeus approximations (lower accuracy)
- Ayanamsa: Lahiri/Chitrapaksha (adopted by India's Calendar Reform Committee 1957)
