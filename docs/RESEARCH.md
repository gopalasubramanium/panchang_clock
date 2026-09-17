# Panchang product research and implementation priorities

Research date: 17 September 2026. Repository baseline: the public `gopalasubramanium/panchang_clock` main branch cloned on that date. Target audience: broad regional coverage, with English first, as requested by the owner.

## What people need

A Panchang serves several different jobs. A household wants today's observance and a usable time, without deciphering an astronomical table. Someone living overseas needs the answer for their own sunrise and timezone, not a date copied from India. A priest or advanced reader needs exact conventions, transitions, and precedence rules. A family wants birthdays and remembrance dates preserved by tithi. A traveller wants offline use and easy location changes. A user with a visual or motor impairment needs readable text, non-colour status indicators, focus order and touch targets.

The central product requirement is trust: people need to know what a time means, which place it belongs to, why a date differs from another calendar, and whether an answer is astronomical, traditional, or provisional. Attractive screens and a large feature count cannot substitute for those distinctions.

This is desk research, not a statistically representative user study. The review sample is small and biased toward people who post reviews. No users, priests, temples or calendar publishers were contacted. Expert sign-off and direct user interviews remain necessary before making comparative accuracy claims.

## Evidence and implications

1. **Daily values mean sunrise values to many readers.** Drik Panchang explains its end-time convention and explicitly accounts for local DST. The interface must distinguish “at sunrise” from “at this moment”, include Karana transitions, and label next-day times. Source: [reading timings](https://www.drikpanchang.com/faq/faq-ans1.html).
2. **Sunrise is a choice of convention.** Drik's geometric centre/no-refraction definition differs from an observational upper-limb sunrise. Two correct calculations can differ because they use different definitions. Make the convention visible and test both. Source: [Hindu sunrise](https://www.drikpanchang.com/faq/faq-ans2.html).
3. **Established apps set a broad functional baseline.** Drik's Play listing describes regional calendar grids, fasting/festival reminders, personal tithi events, worldwide/DST handling and multiple timing systems. Three visible reviews raised failed calendar downloads, recurring ad/subscription prompts, and pricing changes. Our priorities are reliable free exports, no advertising interruptions, regional settings and offline use; this small sample does not establish how common each complaint is. Source: [Google Play listing and reviews](https://play.google.com/store/apps/details?id=com.drikp.core&hl=en).
4. **A second product confirms the planning pattern.** Shubh Panchang describes alternative calendar views, month conventions and observance notifications. These features are a useful competitor baseline, not proof that every listed calculation is correct. Source: [App Store listing](https://apps.apple.com/us/app/shubh-panchang-hindu-calendar/id1253005792).
5. **The month system is not a language setting.** Lunar naming and intercalation require lunation/solar-ingress logic. A Hindi translation of a South Indian month convention does not make it a North Indian calendar. Source: [The Indian Calendar, archival reference hosted by IGNCA](https://ignca.gov.in/Asi_data/34958.pdf).
6. **Festival rules depend on the relevant part of the local day.** Diwali's Lakshmi Puja is associated with Amavasya in Pradosha; a tithi observed at arbitrary noon is insufficient. Sources: [Lakshmi Puja explanation](https://www.drikpanchang.com/festivals/lakshmipuja/festivals-lakshmipuja-timings.html?time-format=24hour&year=2025), [2026 Diwali comparison](https://www.drikpanchang.com/hindu-festivals/diwali/diwali.html?lang=en).
7. **Fasting requires more than “Ekadashi today”.** Parana, Hari Vasara and Smarta/Vaishnava differences are distinct decisions. An unreviewed tithi match should not be presented as a fasting instruction. Source: [Ekadashi and Parana explanation](https://www.drikpanchang.com/ekadashis/mokshada/mokshada-ekadashi-date-time.html?lang=en&year=2025).
8. **Intervals can conflict.** Choghadiya depends on daylight/night lengths, and a nominally favourable segment may overlap Rahu or other exclusions. Night ends at the next actual sunrise. The interface should show overlaps rather than a blanket green signal. Source: [Choghadiya methodology](https://www.drikpanchang.com/muhurat/choghadiya.html).
9. **Astronomy can be independently checked.** Astronomy Engine documents its models and independent validation. Its numerical search tolerance is not an accuracy guarantee for our app. We pinned the library and added separate reference comparisons. Source: [Astronomy Engine](https://github.com/cosinekitty/astronomy).
10. **Use independent phase anchors.** USNO publishes universal-time lunar phases; these are useful independent regression anchors for conjunction/full-moon logic. Source: [USNO 2026 phases](https://aa.usno.navy.mil/calculated/moon/phases?year=2026).
11. **Intercalation needs real test cases.** Chitrapur Math's 2026 publication includes Adhika Jyeshtha. This gives a regional published example alongside the numerical ingress-based implementation. Source: [May–June 2026 Sunbeam](https://chitrapurmath.net/documents/sunbeam/164_SunbeamIssueMayJune2026.pdf).
12. **Published calendars are valuable validation targets.** India's Positional Astronomy Centre publishes the Rashtriya Panchang. Access to the current site's full tables was unreliable during this research; no claim of matching its entire annual almanac is made. Sources: [PAC](https://packolkata.gov.in/), [IMD historical account](https://www.imdpune.gov.in/home/125%20years%20of%20service%20to%20the%20%20nation.pdf).

## Audit of the original application

The original was a large single HTML document with inline language dictionaries, mutable session state, rendering, calculation, export and a live clock. It was useful for a quick standalone dashboard, but duplicate function definitions and no automated checks made correctness difficult to assess.

| Finding in baseline | User consequence | Change in this beta |
|---|---|---|
| Fixed offsets for global cities | Wrong local times through DST | IANA zones, date-specific offsets and ambiguous-time choice |
| `parseFloat(...) || default` | Valid 0° latitude/longitude could become Delhi | Explicit numeric validation |
| Moon series truncated to 22 terms | Larger longitude and end-time errors | Pinned, independently compared astronomy library |
| Claimed bisection precision as timing accuracy | Misleading confidence | Separate numerical tolerance and measured differences |
| Masa from current solar sign | Wrong lunar months and festival matches | New-moon boundaries with ingress counting |
| Vikram year always Gregorian +57 | Wrong pre-Chaitra year | Chaitra-based lunisolar year convention |
| Fixed Gregorian solar festival dates | Missed ingress shifts and duplicate banners | Solved sidereal Sankranti instants |
| Lunar festival checks at the current clock time | Unstable or incorrect festival banners | Named day windows with explicit preview status |
| Day/night “Amrit Kalam” calculation | Confusion with nakshatra-based Amrit Kalam | Correctly named Amrita Choghadiya; unvalidated concept removed |
| Night assumed to be 24h minus daylight | Wrong night duration around changing sunrise/DST | Actual sunset-to-next-sunrise interval |
| Polar hour angle clamped into range | Fabricated sunrise/sunset | Null events and unavailable-period explanations |
| Time formatter wrapped at 24h | Lost next-day context | Full instants and visible dates after midnight |
| Sun sign used as ascendant | A misleading birth chart | Actual horizon/ecliptic intersection; polar limitation explicit |
| Coarse planet positions | Unreliable rashi/degree display | Geocentric positions and independent comparisons |
| CDN fonts/PDF and no service worker | Incomplete offline promise | Bundled assets, tested cache and browser print/PDF |
| Floating/local calendar-file assumptions | Reminders could shift zone/day | UTC VEVENT timestamps, escapes, folding and alarms |
| No automated validation or platform shells | Regressions and no release evidence | Unit/reference/browser tests and native build projects |

## Prioritized capability matrix

“Implemented” means code and the stated tests exist, not universal traditional certification. “Preview” means a transparent calculation suitable for review. “Pending” is deliberately not disguised as a working feature.

| Capability | Priority | Current status and acceptance condition |
|---|---|---|
| Five limbs, all transition times | P0 | Implemented; independent transition comparisons |
| Global location/DST/quarter-hour zones | P0 | Implemented; leap dates, folds, gaps, zero coordinates tested |
| Sunrise convention and polar handling | P0 | Implemented; 30 independent city/date solar comparisons |
| Accurate lunar months/intercalation | P0 | Implemented; published Adhika example; rare Kshaya rules need broader validation |
| Sunrise day vs present moment | P0 | Implemented, including pre-sunrise weekday |
| Festivals and fasting dates | P0 | Preview: 22 named festival rules plus monthly candidates and Sankranti |
| Smarta/Vaishnava, Hari Vasara/Parana | P0 | Pending independent traditional rule packs and fixtures |
| Tamil/Bengali/Malayalam/Odia civil solar calendars | P1 | Pending full regional rollover/era rules; Tamil current solar-month reference implemented |
| North/South/East regional festival sets | P1 | Pending full authority-reviewed regional packs; display convention alone does not claim coverage |
| Month navigation | P1 | Implemented in a worker; local sunrise tithis and preview observances |
| Choghadiya, Hora, Rahu/Yama/Gulika, Abhijit | P1 | Implemented; next-sunrise night and overlaps tested |
| Amrit Kalam, Varjyam, Durmuhurta, Gowri | P1 | Pending sourced rule tables and published comparisons |
| Bhadra/Panchak/Ganda Moola and special yogas | P1 | Pending actionable windows and rule validation |
| Location and language preferences | P1 | Implemented; custom coordinates and optional device location |
| Twelve fully translated interfaces | P1 | Traditional dictionaries retained; English new UI, full linguistic review pending |
| Personal tithi dates | P1 | Implemented local save/delete/backup/restore and sunrise matching; skipped/repeated-tithi policy disclosed |
| Reliable reminders | P1 | Calendar file with alarm; optional native single-event notification; platform permission/device testing pending |
| Offline installation | P1 | PWA implemented/tested; native shells bundle all calculations |
| Shareable links/images and printable reports | P1 | Implemented; precise-coordinate disclosure in guide |
| Planet positions and ascendant | P2 | Implemented reference chart; not a complete professional Jyotish suite |
| Eclipses | P2 | Astronomical lookup implemented; Sutak and full local lunar-contact rules pending |
| Wedding/housewarming/travel decision tools | P2 | Pending purpose-specific, authority-reviewed muhurta rules |
| Widgets/lock-screen/watch/voice | P2 | Pending native extensions and real-device testing |
| Cross-device encrypted sync | P2 | Pending user research; local backup first avoids unnecessary accounts |
| Public HTTP API | P2 | Pending service design; current JSON is browser generated |
| Cloud analytics/push subscriptions | P3 | Not added; require a demonstrated need and privacy design |

## Validation required for a leading accuracy claim

A competitive claim needs an agreed reference corpus, not just agreement with one website. Assemble at least ten years across India, Europe, North America, Australia and the Pacific, including DST boundaries, date-line cases, Adhika/Kshaya months and sunrise-adjacent transitions. Preserve sources, versions, location coordinates, sunrise definitions, ayanamsa and input times for every row.

Use separate acceptance gates for physical astronomy, calendar naming, traditional rules, presentation and native delivery. A disagreement must be classified before being “fixed”: different conventions can legitimately yield different answers. Have qualified reviewers sign off each tradition pack, and publish residual mismatches and uncertainty. Include women and men observing household vrats, diaspora families, priests, older users and users relying on assistive technology in usability work.

The present independent suite samples 164 ephemeris dates, 96 transition endpoints, 30 sunrise/sunset location/date pairs and twelve USNO conjunctions. It materially improves confidence over the baseline, but does not satisfy the entire corpus above.

## Distribution and sustainable growth

A PWA gives immediate low-friction access across major operating systems. Native packages offer store discovery and platform services, but a generated project or unsigned binary is not a store listing. Apple enrollment/signing and Google enrollment/testing are external prerequisites. Sources: [Apple enrollment](https://developer.apple.com/programs/enroll/), [Google personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [Capacitor](https://capacitorjs.com/docs).

Desktop packaging keeps the renderer sandboxed, with no Node integration, a local application origin, and restricted navigation. Source: [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).

Growth should follow trust and repeat usefulness: an installable daily page, meaningful personal dates, readable share cards, consistent location links, free usable exports and excellent support. The beta implements the first four sharing/retention building blocks; it does not generate unsolicited messages or manufactured endorsements.

A proposed launch sequence is: recruit a small regional review group; resolve high-severity calendar disagreements; test on real devices; publish a clearly scoped beta with reproducible methods; add regional packs with named reviewers; then seek opt-in temple/community partnerships. Measure week-four retention, successful exports, installation completion and support issues with consent-based methods if measurement becomes necessary. Virality is an outcome to learn toward, never a deliverable that can be guaranteed.
