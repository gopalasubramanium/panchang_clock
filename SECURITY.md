# Security policy

Please report vulnerabilities privately using GitHub's “Report a vulnerability” on this repository. Do not put secrets or personal data in public issues. Include the affected version, platform, minimal reproduction and impact. No response-time guarantee is offered for this independent project.

The app calculates locally. It contains no advertising, tracking, account or payment SDK. Optional device location is requested on demand. Local storage and exported files are not application-encrypted. Users control backups and sharing.

The desktop renderer is sandboxed, has context isolation and no Node access, denies network requests and device permissions, rejects embedded webviews and external navigation, and opens only listed HTTPS reference sites in the system browser. Packaged Electron fuses disable Node execution and debugging environment switches. Android native calculations use a private, unattached WebView with network loads, file/content access and remote navigation blocked. It exposes no JavaScript-to-native interface, loads only the bundled scientific code and has no INTERNET permission. Backup import/export uses the system file picker; bounded and validated JSON merges personal dates without replacing current preferences. Atomic on-device storage and backup exclusions are configured. Notifications and approximate foreground location require explicit user actions. Calendar insertion opens the system editor without calendar-read/write permissions. Native iOS uses JavaScriptCore and protected local storage. Web deployment sets CSP, framing, referrer, transport and permissions headers; static fallback CSP is also present in HTML.

These controls reduce exposure; they do not establish perfect security. Dependency audits detect known advisories only. Native backup, notification delivery and store releases need physical-device validation. Signed software still needs timely updates; this beta has no automatic native updater.

Supported testing target: latest 2.0 beta source. Older releases should be updated; do not mistake an unsigned test package or an Apple-signed but unnotarized package for a store-approved app.
