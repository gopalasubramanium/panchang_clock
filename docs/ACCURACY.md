# Calculation conventions and validation

## Supported model

- User date range: Gregorian 1900–2100. Adjacent boundary days are allowed internally.
- Ephemeris: Astronomy Engine 2.1.19, bundled locally. Apparent geocentric ecliptic-of-date Sun and Moon longitudes.
- Sidereal origin: mean Lahiri approximation `23.857092 + 1.3969713*T + 0.0003086*T²` degrees, where T is TT Julian centuries from J2000. This is not every Lahiri/Chitrapaksha variant or an IAU endorsement.
- Tithi = elongation /12°; Karana = elongation /6°; Nakshatra = sidereal Moon /13⅓°; Yoga = sidereal Sun+Moon /13⅓°. All modulo 360°. The four fixed Karana endpoints are handled explicitly.
- Geometric sunrise: topocentric Sun-centre altitude 0°, no refraction. Observed sunrise: Astronomy Engine upper-limb model with standard refraction. Terrain/actual atmosphere are not modelled.
- Local dates use IANA zones. A numeric legacy `tz` becomes an explicit fixed offset. No host-machine offset arithmetic participates in the calculations.
- Lunar month: successive astronomical conjunctions with sidereal solar-ingress counting. Amanta indices are used for festival rules; Purnimanta is a display convention based on the corresponding full-moon-ending month.
- Vikram and Shaka labels are Chaitra-based lunisolar years, not Gujarati Kartikadi or Indian national civil dates.
- Graha Hora and Choghadiya nights use the next sunrise's absolute timestamp.
- Brahma Muhurta uses the disclosed fixed 96–48 minutes before sunrise rule. Abhijit uses the eighth daylight fifteenth and is omitted on Wednesday.
- Nodes are mean nodes. Ascendant is the eastern intersection of ecliptic and horizon using sidereal time and obliquity; display is suppressed at |latitude| ≥66°, pending high-latitude treatment.

## Independent checks

`tests/ephemeris-reference.json` was generated with separately installed PySwissEph 2.10.3.2, explicitly selecting Swiss Ephemeris's Moshier calculation mode. No Swiss ephemeris files were downloaded. Reference coordinates are apparent geocentric ecliptic-of-date longitudes. The reference tool is not linked into or distributed with the application.

164 dates (quarterly samples every five years from 1900 through 2100) gave these maximum absolute differences:

| Quantity | Arcminutes |
|---|---:|
| Sun | 0.0871 |
| Moon | 1.0915 |
| Mars | 0.1830 |
| Mercury | 0.1563 |
| Jupiter | 0.1351 |
| Venus | 0.1928 |
| Saturn | 0.2060 |
| Mean Lahiri ayanamsa | 0.0052 |

The exact sample producing each maximum is recorded in `docs/ephemeris-validation.json`. Tests allow <1.2 arcminutes for the Moon, <0.3 for the other listed bodies, and <0.006 for ayanamsa in this sample. These are regression limits, not guarantees for every time/location.

`tests/events-reference.json` adds 96 independently computed 2026 anga endpoints (four types on two dates per month), with a 150-second comparison threshold. Thirty geometric sunrise/sunset date/location combinations cover Delhi, New York, Sydney, Singapore, Kathmandu and London through five seasons/months, with a 60-second threshold. Twelve 2026 conjunctions are also compared with [USNO published values](https://aa.usno.navy.mil/calculated/moon/phases?year=2026), rounded to the minute, with a 90-second threshold.

Searches stop when a bracket is under 0.5 seconds. Reporting that search tolerance as “half-second astronomical accuracy” would be incorrect. Ephemeris and convention errors can move an event across sunrise even when small. For critical observances near a boundary, the event requires extra review.

## Festival limits

The rule engine is a preview, not a general Dharmashastra engine. It applies named day windows and chooses maximum overlap, later day on equal overlap. That is not universally correct for all festivals/traditions. Diwali 2026 and Rama Navami 2026 have date regressions for Delhi, not an exhaustive festival certification. Skipped/repeated tithis, Rohini/Ashtami precedence, Smarta/Vaishnava rules, fasting/Parana and regional differences need further work.

All reference metadata, tests and preview status must remain visible as the product evolves. Do not remove qualifiers merely to market the app as “most accurate”.

Measured 2026 endpoint differences in this sample were at most 8.60 seconds for Tithi/Karana, 6.84 for Nakshatra and 7.06 for Yoga. The geometric solar-event sample differed by at most 0.16 seconds. These very small sample maxima do not supersede the broader error limits or atmospheric/convention qualifications. See `event-validation.json`.

Sixteen independent ascendant checks span four locations and four UTC times, with a 0.03° threshold. The broad location sweep exercises all 51 presets through twelve months (612 calculated days), plus both geographic poles. The local numerical suite currently has 349 passing tests.
