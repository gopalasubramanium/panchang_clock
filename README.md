# Vedic Panchangam Dashboard

A high-precision, browser-native Panchangam for the global Hindu diaspora — no app to install, no account to create, no server ever touches your data. Open the page, and the sky is calculated for your city, in your language, right now.

Live at **[panchang.eksaar.com](https://panchang.eksaar.com)**

---

## What is a Panchangam?

The Panchangam (Sanskrit: *pañcāṅgam*, "five limbs") is the Vedic almanac that has governed auspicious timing for millennia. Every ritual, every journey, every new beginning is rooted in the same five elements:

| Anga | Meaning | What it tells you |
|---|---|---|
| **Tithi** | Lunar day (1–30) | Phase of the Moon relative to the Sun; governs daily rites |
| **Nakshatra** | Lunar mansion (1–27) | Which star cluster the Moon occupies; guides muhurta selection |
| **Yoga** | Sun–Moon combination (1–27) | Energetic quality of the day; auspicious or to be avoided |
| **Karana** | Half-tithi (1–11) | Half-day quality used for precise muhurta |
| **Vaara** | Weekday | Planetary ruler of the day |

This dashboard computes all five — live, for any date, any city on Earth.

---

## Why this Panchangam is Different

Most digital Panchangams copy data from printed tables computed years in advance. This one uses **Drik Ganita** (Thirukanitha) — the same modern astronomical approach used by India's National Calendar Reform Committee — computing planetary positions from first principles every time you load it.

**What that means in practice:**

- Tithi and Nakshatra end-times are found by a bisection search on the actual Moon–Sun geometry, not read off a table
- Rahu Kaalam, Yamagandam, and Gulika Kaalam are sliced from your *actual* sunrise-to-sunset span for today at your exact coordinates — not from a fixed 6 AM baseline
- Abhijit Muhurta is the true local solar noon window, not an approximation
- Amrit Kaalam follows the Vedic Moon–weekday rule applied to the dynamically computed day/night length

Printed calendars often use the ancient **Vakya system** with fixed polynomial tables. If you notice small differences in end-times, that is why — and Drik Ganita is the astronomically correct result.

---

## Features

### Astronomical Calculations
- **All five Pancha Anga** with end-times and the next anga queued up
- **Vikram Samvat** year, **Masa** (lunar month), **Paksha** (fortnight), **Ritu** (season)
- **Sunrise, Sunset, and Local Noon** using the NOAA −0.833° atmospheric refraction correction
- **Moon phase** visualized as a live SVG crescent/disk
- **Ayanamsa**: Lahiri / Chitra Paksha — the standard adopted by the Indian Government in 1957

### Timings
- **Rahu Kaalam · Yamagandam · Gulika Kaalam** — the three inauspicious periods, computed from exact daily sunrise/sunset
- **Abhijit Muhurta** — the universally auspicious midday window
- **Brahma Muhurta** — the sacred pre-dawn period for meditation
- **Godhuli Lagna** — the auspicious dusk window
- **Pratah Sandhya · Sayam Sandhya** — dawn and dusk twilight windows
- **Amrit Kaalam** — the lunar nectar period computed from day/night horas
- **Graha Hora** — all 24 planetary hours for day and night, with the ruling planet for each

### Kundli Chart
North-Indian style birth chart (SVG) showing all nine Grahas — Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu — with their Rashi and degree positions. Uses the Lahiri Ayanamsa for sidereal placement.

### Festival Recognition
The dashboard automatically detects and announces 27+ major Hindu festivals, covering both solar (fixed Gregorian date) and lunar (Tithi + Masa) events: Diwali, Holi, Janmashtami, Navratri, Ganesh Chaturthi, Dussehra, Rama Navami, Maha Shivaratri, Ugadi, Baisakhi, Raksha Bandhan, Makar Sankranti, and more.

### Time Quality Indicator
A real-time at-a-glance indicator — green for auspicious periods, amber for neutral, red for inauspicious — tells you the muhurta quality of the current moment without having to read the full timing table.

---

## Supported Languages

All display text — Tithi names, Nakshatra names, Yoga names, Weekdays, Months, planet names, UI labels — is rendered in the selected language. Numeral glyphs are localized too.

| Language | Script |
|---|---|
| English | Latin |
| हिन्दी Hindi | Devanagari |
| বাংলা Bengali | Bengali |
| मराठी Marathi | Devanagari |
| తెలుగు Telugu | Telugu |
| தமிழ் Tamil | Tamil |
| ગુજરાતી Gujarati | Gujarati |
| ಕನ್ನಡ Kannada | Kannada |
| മലയാളം Malayalam | Malayalam |
| ਪੰਜਾਬੀ Punjabi | Gurmukhi |
| ଓଡ଼ିଆ Odia | Odia |
| اردو Urdu | Nastaliq (RTL) |

---

## Cities & Custom Coordinates

49 cities are pre-configured across India, Nepal, Sri Lanka, Southeast Asia, the Middle East, UK, USA, Canada, Australia, Fiji, Mauritius, Trinidad, and South Africa. Or enter any latitude, longitude, and UTC offset manually.

---

## Sharing & Export

- **Share via WhatsApp** — sends a localized summary (in the selected language) with today's Tithi, Nakshatra, Yoga, Rahu Kaalam, and Abhijit timings
- **Share as Image** — generates a shareable image card of today's Panchang
- **Add to Calendar** — downloads an `.ics` file for Abhijit Muhurta or Amrit Kaalam that opens in Google Calendar, Apple Calendar, or Outlook
- **Download as PDF** — exports a full multi-page Panchangam report including all timings, Graha Hora table, and Kundli chart (uses `html2pdf.js` loaded from CDN)

---

## JSON API

Append `?api=true` to any URL to receive a machine-readable JSON response instead of the UI. Useful for integrating Panchangam data into other applications.

```
https://panchang.eksaar.com/?api=true&date=15042026&time=06:00:00&lat=13.0827&lon=80.2707&tz=5.5
```

Parameters: `date` (DDMMYYYY or YYYY-MM-DD), `time` (HH:MM:SS), `lat`, `lon`, `tz` (UTC offset).

---

## Scientific Foundation

| Element | Method | Accuracy |
|---|---|---|
| Solar longitude | VSOP87-derived series | ~1–2 arcminutes |
| Lunar longitude | 22-term ELP-2000/82 | ~5–10 arcminutes |
| Planetary positions | Single-term Meeus approximations | Lower (visual reference only) |
| Ayanamsa | Lahiri / Chitra Paksha | Standard IAU-adopted value |
| Sunrise/Sunset | Iterative solar hour-angle with −0.833° refraction | < 1 minute |
| Tithi / Nakshatra end | Bisection search on live Moon–Sun geometry | Accurate to the computation step |

All calculations run entirely in your browser. No data ever leaves your device.

---

## Usage

No installation required. Open `index.html` in any modern browser — or visit [panchang.eksaar.com](https://panchang.eksaar.com).

To compute for a past or future date, set the Date and Time fields and press **Apply**. To return to live mode, press **Now ↻**.

To change location, select a city from the dropdown or choose **Custom…** and enter coordinates.

---

## License

Open source. See [LICENSE](LICENSE).
