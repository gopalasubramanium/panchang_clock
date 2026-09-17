# User pain points and product response — 18 September 2026

## Method and limits

Reviewed public Apple customer-review feeds for Drik Panchang, Shubh Panchang and Hindu Calendar across US, India, UK, Australia and Singapore storefronts, with a fourth candidate returning no usable reviews. Deduplication by review ID yielded 397 reviews. A 24-month window beginning 18 September 2024 contained 142 reviews: 86 Drik, 54 Shubh, 2 Hindu Calendar. The 62 reviews rated 1–3 stars in that window were read for qualitative themes, alongside positive reviews and the initial product research. The empty Shubh Singapore feed was not counted. This is an accessible, self-selected sample, not a representative survey or a statistically ranked measure of the market. Reports of errors or billing failures were not independently verified and are not accusations against competing developers.

Primary review feeds:
- [Drik, US](https://itunes.apple.com/us/rss/customerreviews/id=1321271821/sortby=mostrecent/json), [India](https://itunes.apple.com/in/rss/customerreviews/id=1321271821/sortby=mostrecent/json), [UK](https://itunes.apple.com/gb/rss/customerreviews/id=1321271821/sortby=mostrecent/json), [Australia](https://itunes.apple.com/au/rss/customerreviews/id=1321271821/sortby=mostrecent/json), [Singapore](https://itunes.apple.com/sg/rss/customerreviews/id=1321271821/sortby=mostrecent/json).
- [Shubh, US](https://itunes.apple.com/us/rss/customerreviews/id=1253005792/sortby=mostrecent/json), [India](https://itunes.apple.com/in/rss/customerreviews/id=1253005792/sortby=mostrecent/json), [UK](https://itunes.apple.com/gb/rss/customerreviews/id=1253005792/sortby=mostrecent/json), [Australia](https://itunes.apple.com/au/rss/customerreviews/id=1253005792/sortby=mostrecent/json).
- [Hindu Calendar, India](https://itunes.apple.com/in/rss/customerreviews/id=412690898/sortby=mostrecent/json).
- [Drik Android listing](https://play.google.com/store/apps/details?hl=en-US&id=com.drikp.core), [Shubh iOS listing](https://apps.apple.com/us/app/shubh-panchang-hindu-calendar/id1253005792).

No full review corpus is redistributed. Store feeds change, and individual reviews describe the version and experience at their publication date.

## Findings and implementation

| Recurring concern | Evidence examples (paraphrased) | Response in this release | Remaining limitation |
|---|---|---|---|
| Ads interrupt a basic daily check | Drik US, 21 May 2026; Shubh US, 1 and 4 August 2026 | No ads, analytics, account, payment or subscription code | Hosting still sees normal web requests |
| Location changes fail or overseas settings are hard | Drik US, 3 January 2026 | Offline search of 34,145 cities, IANA zones, saved places and manual overrides | City-centre coordinates; smaller places and elevation may need adjustment |
| Month names and values appear inconsistent | Drik India, 29 December 2025 and 15 March 2026 | Explicit Amanta/Purnimanta and sunrise settings, local-time/DST handling, contextual term help, reproducible links | A mean Lahiri approximation and preview observance rules are disclosed |
| Calendar export does not work reliably | Drik India, 13 November 2025; UK, 31 August 2025 | Free monthly ICS export, selected categories, valid UTC timestamps and reminder lead times | Import and alert behavior depends on the calendar app |
| Reminder arrives too late | Drik Australia, 1 November 2025 | No alarm, one-hour, 12-hour or one-day advance reminder choices for monthly exports | No guarantee of background web alarms; no complete fasting/Parana engine |
| Redesigns make text or daily information harder to use | Shubh India, October 2024; US, October 2024 | Equal-sized controls, larger text choices, simple daily view, light/dark and reduced-motion support | Human accessibility testing with assistive technologies remains useful |
| Too much unrelated calendar content | Shubh US, 11 September 2025 | Separate festival, monthly tithi, ingress and personal-date filters | More regional rule packs require review |
| Different platforms crash or behave differently | Drik US, March/August 2026/2025; Hindu Calendar India, November 2024 | Shared calculation engine, automated reference tests, browser tests and platform builds | Build success is not physical-device certification |
| Regional languages and sectarian rules are missing | Drik India, June 2026; US, February 2026; Shubh US, August 2025 | 12 traditional-label languages, English explanations, explicit coverage limits | Full translations, regional civil calendars and Smarta/Vaishnava rules are unfinished |
| Widgets, watch support and richer specialist features | Drik India, July/December 2026/2025 | Recorded as unmet needs rather than adding unverified features | Widgets/watch apps and advanced astrology are not implemented |

A short local report draft helps users describe mismatches without automatically sending location or personal dates. Sharing now distinguishes a summary from a coordinate-bearing calculation link; new coordinate links use URL fragments. Backup imports are bounded, validated and deduplicated. Sensitive vulnerability reports can be sent privately through the repository.

## Fair credit and sustainable distribution

A small creator credit and a brief explanation of the project's purpose are proportionate and fair. The app explains its own commitment to free, quiet daily use; it does not imply that charging for another product is inherently immoral. No sign-up, social sharing, rating prompt or donation is required to use it.

Useful organic-distribution foundations are present: an installable web app, shareable summaries, accessible public help/privacy pages and clear source/release links. Virality and becoming everyone's default cannot be guaranteed. No fake ratings, unsolicited outreach or manipulative prompts are used.

## Evidence for technical decisions

- [GeoNames data](https://download.geonames.org/export/dump/) and [license/about](https://www.geonames.org/about.html): city data is transformed and attributed under CC BY 4.0; archive hash is retained in the bundled dataset.
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security): sandboxing, navigation restrictions, permission handling and current runtime.
- [Android backup controls](https://developer.android.com/identity/data/autobackup): explicit backup and transfer exclusions.
- [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution): a Developer ID signature alone is not notarization or store approval.
- [Windows signing choices](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options): checksums and unsigned packages are not platform trust.

The original numerical and calendar research remains in RESEARCH.md and ACCURACY.md. Research-informed fixes above do not establish that every user pain point has been eliminated or that this beta is the most accurate Panchang available.
