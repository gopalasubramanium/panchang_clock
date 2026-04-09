# panchang_clock
A zero-dependency, single-file HTML/JS Panchangam dashboard providing high-precision astrological calculations (Tithi, Nakshatra, Choghadiya) using Jean Meeus's algorithms. Features 12 Indian languages, dark/light modes, and a real-time astronomical clock. Built for 100% offline reliability.

# High-Precision Local Panchangam Dashboard

## Overview
A fully self-contained, offline-capable Panchangam (Hindu Astronomical Calendar) dashboard. This project delivers real-time, highly accurate astrological computations directly within the browser, requiring absolutely no external API calls, libraries, or data dependencies. 

## Key Features
* **Zero Dependencies:** Operates entirely locally using native vanilla JavaScript. No external libraries (like jQuery or moment.js) or astrological REST APIs are required.
* **Multilingual Localization:** Native support for 12 major Indian languages (Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Urdu, Kannada, Odia, Malayalam, Punjabi) alongside English, utilizing built-in JSON dictionaries and the native `Intl.DateTimeFormat` API.
* **Real-Time Astronomical Clock:** Features a smooth, CSS/JS-driven analog clock synchronized with local machine time, plotting precise Sunrise, Sunset, and Local Noon relative to coordinates.
* **Dynamic Theme Engine:** Includes System, Dark, and Light theme toggles with CSS variable-driven styling.
* **Fully Responsive:** Adapts seamlessly to desktop and mobile form factors using CSS Grid and Flexbox.

## Scientific Foundation & Accuracy
This dashboard does not rely on static approximations. It utilizes an embedded mathematical engine based on **Jean Meeus's *Astronomical Algorithms*** to calculate orbital mechanics dynamically:
* **Solar Mechanics:** Calculates the Julian Date, Mean Solar Anomaly, Equation of Center, and True Longitude to derive highly precise Sunrise, Sunset, and Local Noon times tailored to exact geographic coordinates. It incorporates the NOAA standard `-0.833°` adjustment for atmospheric refraction.
* **Lunar Approximations:** Computes the Moon's Mean Longitude and applies primary perturbation formulas to approximate the current Tithi and Nakshatra dynamically. 
* **Kaalam/Muhurta Segments:** Dynamically slices the precise daylight duration (Sunset minus Sunrise) into 8 mathematical segments to accurately position Rahu Kaalam, Yamagandam, and Gulika Kaalam according to Vedic day-of-the-week rules.

## Installation & Usage
1. Clone or download the repository.
2. Ensure the file is saved with an `.html` extension (e.g., `panchangam.html`).
3. Open the file in any modern web browser (Chrome, Edge, Safari, Firefox). No local server environment is necessary.

### Configuring Coordinates
By default, the mathematical engine calculates celestial data based on standard coordinates (Noida, India: LAT `28.5355`, LON `77.3910`). To modify this for a specific locale, update the following constants in the `` section of the JavaScript:
```javascript
const LAT = 28.5355;   // Latitude
const LON = 77.3910;   // Longitude
const TZ_OFFSET = 5.5; // Timezone offset from UTC (e.g., 5.5 for IST)
