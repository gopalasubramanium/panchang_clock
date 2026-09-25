# Store build preparation

Use the **Prepare store packages and screenshots** workflow. These tasks never publish an app-store release and never receive private signing keys.

- `android-screenshots`: build the app and capture original pixels on an API 36 emulator in phone and tablet layouts. Inspect every image before uploading it; passing a content check alone is not visual approval.
- `ios-screenshots`: run the SwiftUI workflow and offline-city tests on iPhone Pro Max, iPad Pro 13-inch and iPad Air 11-inch simulators; preserve XCTest results and genuine screenshots. The `ios_devices` input can target one device or both tablets. Inspect every image and use only captures from the submitted app code.
- `ios-device-archive`: build an unsigned Release archive for a physical iOS device, version 2.0.0/build 6. It is not installable and must be provisioned, signed, validated and uploaded through Apple’s supported tools.
- `mac-store-unsigned`: assemble Electron’s MAS runtime for Apple Silicon and Intel, with store-specific App Sandbox entitlements. The unsigned archive is not a distributable app and still needs a matching profile, distribution signing, installer signing and store testing.
- `windows`: create x64 and ARM64 packages using the exact identity supplied by Microsoft Partner Center. Check the package validation and restricted-capability declaration before submission.

The Mac store configuration deliberately differs from direct-download Developer ID packaging. It requests App Sandbox access and user-selected file export access, without network-client, network-server, camera, microphone, or location entitlements. Its helper processes inherit the sandbox. The application group is scoped to the verified Apple team and this app’s bundle identifier. An unsigned build does not prove that sandboxed exports or signing work; test the provisioned development/store build before release.

The normal Mac store configuration requires signing. `MAS_UNSIGNED=1` is limited to preparation; `MAS_PROVISIONING_PROFILE` supplies a local distribution profile when packaging the signed submission. Keep profiles and private keys outside the repository. Never upload a simulator app or the direct-download DMG to App Store Connect as the store build.

References: [Electron MAS guide](https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide), [Android virtual-device paths](https://developer.android.com/tools/variables), [Google asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151).
