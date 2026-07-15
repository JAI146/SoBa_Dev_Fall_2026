# PurposeMint Expo Native Development and Build Guide

> **Repository:** pnpm workspaces + Turborepo  
> **Mobile app:** `apps/mobile`  
> **Package:** `@purposemint/mobile`  
> **Recommended workflow:** Expo development builds + Prebuild/CNG + EAS Build  
> **Primary workstation:** Windows with PowerShell  
> **Reviewed:** July 2026

---

## 1. The Mental Model

PurposeMint remains a normal React Native app. Expo adds a framework, native configuration system, development client, and optional cloud build service around React Native.

```text
React Native
+ Expo framework
+ expo-dev-client
+ Expo Prebuild/config plugins
+ local Android builds
+ EAS cloud builds
```

This is not an Expo Go-only project.

### Expo Go

Expo Go is a generic precompiled app with a fixed list of native libraries. It is useful for experiments but not suitable as PurposeMint's main runtime because PurposeMint will require native SDKs and app-specific native configuration.

### Development build

A development build is PurposeMint's own debug app. It contains:

- PurposeMint's application ID and bundle identifier
- `expo-dev-client`
- installed native libraries
- native permissions
- deep-link configuration
- native build configuration

For a React Native CLI developer:

```text
Expo development build
≈ React Native CLI debug APK
+ Expo launcher and development tools
```

### Prebuild

Prebuild generates regular native projects:

```text
apps/mobile/android
apps/mobile/ios
```

They are normal Gradle and Xcode projects generated from:

- `app.json`
- `app.config.ts`
- installed native packages
- Expo config plugins

### EAS Build

EAS Build is Expo's optional cloud build service. It can produce:

- Android development APK
- Android preview APK
- Android production AAB
- iOS development build
- iOS production build

Local Android builds remain available and are not limited by EAS cloud quotas.

---

## 2. Target Structure

```text
purposemint-platform/
├── apps/
│   ├── api/
│   ├── dashboard/
│   └── mobile/
│       ├── app/
│       ├── assets/
│       ├── app.json
│       ├── app.config.ts
│       ├── eas.json
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env.example
│       └── .env.local
│
├── packages/
│   ├── contracts/
│   ├── eslint-config/
│   └── typescript-config/
│
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── turbo.json
```

Modern Expo detects pnpm workspaces automatically. Do not add old Metro monorepo hacks such as manual `watchFolders`, `resolver.extraNodeModules`, or custom `nodeModulesPath` unless an actual dependency proves they are required.

---

## 3. Where Commands Must Run

### Monorepo root

Example:

```text
C:\Users\hp\Desktop\Work\Techxudo\muakhaa
```

Run these from the root:

- create `apps/mobile`
- `pnpm install`
- `pnpm --filter ...`
- Turbo commands
- root package scripts

Examples:

```powershell
pnpm install
pnpm --filter @purposemint/mobile start
pnpm build
```

### Mobile app root

Path:

```text
<monorepo-root>\apps\mobile
```

Run these from `apps/mobile`:

- Expo CLI commands
- EAS commands
- Prebuild
- local native compilation
- Metro for the mobile app

Examples:

```powershell
pnpm exec expo start --dev-client
pnpm exec expo run:android
pnpm exec eas build --platform android --profile preview
```

**All EAS commands must run from `apps/mobile`, not from the monorepo root.**

---

## 4. Verify the Monorepo

Open PowerShell in the monorepo root:

```powershell
cd "C:\Users\hp\Desktop\Work\Techxudo\muakhaa"
```

Confirm location and required files:

```powershell
Get-Location
Test-Path .\package.json
Test-Path .\pnpm-workspace.yaml
Test-Path .\turbo.json
```

Confirm whether a mobile app already exists:

```powershell
Test-Path .\apps\mobile
```

- `False`: continue with creation.
- `True`: inspect it first.
- Never run the generator over an existing app containing work.

Confirm `pnpm-workspace.yaml` includes:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Check versions:

```powershell
node --version
pnpm --version
```

Use the root `packageManager` and `engines` fields as the source of truth.

---

## 5. Create the Expo Application

### Run from the monorepo root

As of July 2026, Expo's documented current template is SDK 57:

```powershell
pnpm dlx create-expo-app@latest --template default@sdk-57 apps/mobile
```

This command:

1. downloads `create-expo-app`
2. creates the app in `apps/mobile`
3. installs Expo, React, and React Native
4. creates the Expo Router starter
5. adds the app under the existing workspace

Then run from the root:

```powershell
pnpm install
pnpm -r list --depth -1
```

---

## 6. Rename the Workspace Package

Open:

```text
apps/mobile/package.json
```

Set:

```json
{
  "name": "@purposemint/mobile",
  "private": true
}
```

These identifiers are different:

```text
Workspace package:       @purposemint/mobile
Expo slug:               purpose-mint
Android application ID:  com.purposemint.app
iOS bundle identifier:   com.purposemint.app
Display name:            PurposeMint
```

Reinstall and verify:

```powershell
pnpm install
pnpm --filter @purposemint/mobile exec expo --version
```

---

## 7. Install `expo-dev-client`

### From the monorepo root

```powershell
pnpm --filter @purposemint/mobile exec expo install expo-dev-client
```

Equivalent from `apps/mobile`:

```powershell
pnpm exec expo install expo-dev-client
```

This package makes debug builds into custom Expo development builds and allows arbitrary native SDKs and native configuration.

---

## 8. Install EAS CLI

### Recommended: mobile workspace dev dependency

Run from the monorepo root:

```powershell
pnpm --filter @purposemint/mobile add -D eas-cli
```

Verify:

```powershell
pnpm --filter @purposemint/mobile exec eas --version
```

This pins EAS CLI for the project and avoids requiring a global installation.

Alternative global installation:

```powershell
pnpm add --global eas-cli
```

The rest of this guide uses the local version through:

```powershell
pnpm exec eas
```

---

## 9. Recommended Mobile Scripts

In `apps/mobile/package.json`, preserve generated dependencies and use scripts similar to:

```json
{
  "scripts": {
    "start": "expo start --dev-client",
    "start:clear": "expo start --dev-client --clear",
    "start:go": "expo start --go",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "prebuild": "expo prebuild",
    "prebuild:android": "expo prebuild --platform android",
    "prebuild:clean": "expo prebuild --clean",
    "prebuild:android:clean": "expo prebuild --clean --platform android",
    "doctor": "pnpm dlx expo-doctor@latest",
    "build:android:development": "eas build --platform android --profile development",
    "build:android:preview": "eas build --platform android --profile preview",
    "build:android:production": "eas build --platform android --profile production",
    "build:ios:development": "eas build --platform ios --profile development",
    "build:ios:production": "eas build --platform ios --profile production"
  }
}
```

---

## 10. Root Convenience Scripts

In the monorepo root `package.json`, add:

```json
{
  "scripts": {
    "dev:mobile": "pnpm --filter @purposemint/mobile start",
    "dev:mobile:clear": "pnpm --filter @purposemint/mobile start:clear",
    "mobile:android": "pnpm --filter @purposemint/mobile android",
    "mobile:doctor": "pnpm --filter @purposemint/mobile doctor"
  }
}
```

When `packages/contracts` must be compiled first:

```json
{
  "scripts": {
    "dev:mobile": "pnpm --filter @purposemint/contracts build && pnpm --filter @purposemint/mobile start"
  }
}
```

---

## 11. Base Expo Configuration

Open:

```text
apps/mobile/app.json
```

Preserve generated icons, plugins, Router configuration, experiments, and splash assets. Update the base identity:

```json
{
  "expo": {
    "name": "PurposeMint",
    "slug": "purpose-mint",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "purposemint",
    "userInterfaceStyle": "automatic",
    "ios": {
      "bundleIdentifier": "com.purposemint.app"
    },
    "android": {
      "package": "com.purposemint.app"
    }
  }
}
```

Inspect public embedded configuration:

```powershell
cd .\apps\mobile
pnpm exec expo config --type public
```

Never place secrets in `app.json` or `app.config.ts`.

---

## 12. Development, Preview, and Production Variants

Recommended identifiers:

```text
Development:
  Name:    PurposeMint Dev
  Android: com.purposemint.app.dev
  iOS:     com.purposemint.app.dev
  Scheme:  purposemint-dev

Preview:
  Name:    PurposeMint Preview
  Android: com.purposemint.app.preview
  iOS:     com.purposemint.app.preview
  Scheme:  purposemint-preview

Production:
  Name:    PurposeMint
  Android: com.purposemint.app
  iOS:     com.purposemint.app
  Scheme:  purposemint
```

Unique identifiers allow all variants to be installed at the same time.

Create `apps/mobile/app.config.ts`:

```ts
import type { ConfigContext, ExpoConfig } from "expo/config";

type AppVariant = "development" | "preview" | "production";

const appVariant = (
  process.env.APP_VARIANT ?? "development"
) as AppVariant;

const variants = {
  development: {
    name: "PurposeMint Dev",
    scheme: "purposemint-dev",
    androidPackage: "com.purposemint.app.dev",
    iosBundleIdentifier: "com.purposemint.app.dev",
  },
  preview: {
    name: "PurposeMint Preview",
    scheme: "purposemint-preview",
    androidPackage: "com.purposemint.app.preview",
    iosBundleIdentifier: "com.purposemint.app.preview",
  },
  production: {
    name: "PurposeMint",
    scheme: "purposemint",
    androidPackage: "com.purposemint.app",
    iosBundleIdentifier: "com.purposemint.app",
  },
} satisfies Record<
  AppVariant,
  {
    name: string;
    scheme: string;
    androidPackage: string;
    iosBundleIdentifier: string;
  }
>;

export default ({ config }: ConfigContext): ExpoConfig => {
  const selected = variants[appVariant];

  return {
    ...config,
    name: selected.name,
    slug: "purpose-mint",
    scheme: selected.scheme,
    android: {
      ...config.android,
      package: selected.androidPackage,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: selected.iosBundleIdentifier,
    },
    extra: {
      ...config.extra,
      appVariant,
    },
  };
};
```

When `APP_VARIANT` is absent, local builds default to `development`.


---

## 13. Local Environment Variables

Create:

```text
apps/mobile/.env.local
```

### Android emulator

```env
APP_VARIANT=development
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

### Physical Android phone on the same Wi-Fi

```env
APP_VARIANT=development
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000
```

Replace the LAN IP with the computer's address:

```powershell
ipconfig
```

Inside a phone or emulator, `localhost` points to that device, not the computer.

```text
Android emulator -> http://10.0.2.2:<port>
Physical phone   -> http://<computer-LAN-IP>:<port>
Production       -> https://api.your-domain.com
```

Anything prefixed with `EXPO_PUBLIC_` is bundled into the client and must be treated as public.

Allowed:

```env
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Never expose:

```env
PLAID_SECRET=
SYNCTERA_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
DATABASE_URL=
JWT_SECRET=
AWS_SECRET_ACCESS_KEY=
```

Those belong only in `apps/api`.

Add to `.gitignore`:

```gitignore
apps/mobile/.env.local
apps/mobile/.env.*.local
```

Commit an example:

```text
apps/mobile/.env.example
```

```env
APP_VARIANT=development
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

---

## 14. Configure EAS

### Run from `apps/mobile`

```powershell
cd .\apps\mobile
```

Log in:

```powershell
pnpm exec eas login
pnpm exec eas whoami
```

Link or create the Expo project:

```powershell
pnpm exec eas init
```

This normally adds an EAS project ID under:

```text
extra.eas.projectId
```

Do not remove that value. Because this guide also uses a dynamic `app.config.ts`, EAS CLI may tell you that it cannot edit the dynamic config automatically. In that case, copy the project ID shown by EAS into the static `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR-EAS-PROJECT-ID"
      }
    }
  }
}
```

The dynamic config spreads `config.extra`, so the project ID remains available.

Generate EAS configuration:

```powershell
pnpm exec eas build:configure
```

This creates:

```text
apps/mobile/eas.json
```

---

## 15. Recommended `eas.json`

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development",
      "env": {
        "APP_VARIANT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "env": {
        "APP_VARIANT": "preview"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "environment": "production",
      "env": {
        "APP_VARIANT": "production"
      },
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### `development`

Use for engineering and native SDK work. It contains `expo-dev-client` and connects to Metro.

### `preview`

Use for QA, client testing, and demos. Android produces an installable APK that runs without Metro.

### `production`

Use for app stores. Android normally produces an AAB.

---

## 16. EAS Environment Variables

Run from `apps/mobile`.

Development:

```powershell
pnpm exec eas env:create `
  --name EXPO_PUBLIC_API_URL `
  --value https://dev-api.example.com `
  --environment development `
  --visibility plaintext
```

Preview:

```powershell
pnpm exec eas env:create `
  --name EXPO_PUBLIC_API_URL `
  --value https://staging-api.example.com `
  --environment preview `
  --visibility plaintext
```

Production:

```powershell
pnpm exec eas env:create `
  --name EXPO_PUBLIC_API_URL `
  --value https://api.example.com `
  --environment production `
  --visibility plaintext
```

List values:

```powershell
pnpm exec eas env:list --environment development
pnpm exec eas env:list --environment preview
pnpm exec eas env:list --environment production
```

Pull development variables locally:

```powershell
pnpm exec eas env:pull --environment development --path .env.local
```

EAS secret visibility does not make an `EXPO_PUBLIC_*` value private once it is embedded in the app.

---

## 17. Windows Android Toolchain

EAS cloud builds do not require Android Studio.

Local Android builds require:

- JDK 17
- Android Studio
- Android SDK Platform 36
- Build Tools
- Platform Tools
- Android Emulator or a physical device

### Install JDK 17

With Chocolatey:

```powershell
choco install -y microsoft-openjdk17
```

Restart PowerShell and verify:

```powershell
java -version
javac -version
```

### Install Android Studio

During setup, include:

- Android Studio
- Android SDK
- Android Virtual Device

In Android Studio:

```text
Settings
-> Languages & Frameworks
-> Android SDK
```

Install:

- Android 16 / API 36
- Sources for Android 36
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android Emulator
- Android SDK Command-line Tools

### Set `ANDROID_HOME`

The usual Windows path is:

```text
C:\Users\<username>\AppData\Local\Android\Sdk
```

Create a user environment variable:

```text
Name:  ANDROID_HOME
Value: C:\Users\<username>\AppData\Local\Android\Sdk
```

Add these to the user `Path`:

```text
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
```

Open a new PowerShell window and verify:

```powershell
$env:ANDROID_HOME
adb --version
```

### Create an emulator

```text
Android Studio
-> Device Manager
-> Create device
-> choose a Pixel device
-> choose/install a system image
-> Finish
-> Start
```

Verify:

```powershell
adb devices
```

Expected:

```text
List of devices attached
emulator-5554    device
```

### Physical Android device

Enable:

```text
Developer options
USB debugging
```

Connect the device:

```powershell
adb devices
```

Accept the authorization prompt on the phone.

---

## 18. First Local Native Development Build

Start an emulator or connect a phone.

### Run from `apps/mobile`

```powershell
cd .\apps\mobile
pnpm exec expo run:android
```

This command:

1. detects the missing Android project
2. runs Android Prebuild automatically
3. generates `android/`
4. compiles through Gradle
5. installs the debug APK
6. starts Metro
7. opens PurposeMint Dev

React Native CLI comparison:

```text
npx react-native run-android
           ≈
pnpm exec expo run:android
```

You do not need to run Prebuild separately before the first `run:android`.

---

## 19. Daily Development

After the development build is installed, normal JavaScript and TypeScript work does not require another native build.

### From the monorepo root

```powershell
pnpm dev:mobile
```

### From `apps/mobile`

```powershell
pnpm start
```

Force development-client mode:

```powershell
pnpm exec expo start --dev-client
```

Clear Metro cache:

```powershell
pnpm exec expo start --dev-client --clear
```

Useful terminal controls:

```text
A         open Android
Shift+A   choose an Android device
R         reload
M         open development menu
J         open React Native DevTools
S         switch between Expo Go and development build
```

---

## 20. When a Native Rebuild Is Required

No rebuild is normally required for:

- React components
- TypeScript
- styles
- API calls
- state management
- form validation
- most navigation code
- business logic

Rebuild after:

- adding/removing a native package
- changing permissions
- changing the Android application ID
- changing the iOS bundle identifier
- changing URL schemes or deep links
- adding Apple Pay or Google Pay
- changing push notification setup
- modifying config plugins
- changing Gradle or entitlements
- upgrading Expo SDK or React Native

Recommended clean rebuild:

```powershell
cd .\apps\mobile
pnpm exec expo prebuild --clean --platform android
pnpm exec expo run:android
```

`prebuild --clean` deletes and regenerates the native project. Important manual native changes can be lost, so use app config and config plugins.

---

## 21. Installing Packages

### Expo SDK library

From the monorepo root:

```powershell
pnpm --filter @purposemint/mobile exec expo install expo-secure-store
```

Or from `apps/mobile`:

```powershell
pnpm exec expo install expo-secure-store
```

`expo install` chooses an SDK-compatible version.

### Normal JavaScript dependency

```powershell
pnpm --filter @purposemint/mobile add <package>
```

### Development dependency

```powershell
pnpm --filter @purposemint/mobile add -D <package>
```

### Native third-party dependency

```powershell
pnpm --filter @purposemint/mobile add <native-package>
cd .\apps\mobile
pnpm exec expo prebuild --clean --platform android
pnpm exec expo run:android
```

Never install mobile-only libraries in the root package.

---

## 22. Shared Contracts

Add the workspace package from the monorepo root:

```powershell
pnpm --filter @purposemint/mobile add @purposemint/contracts@workspace:*
```

Import by package name:

```ts
import {
  type AuthResponse,
  type GoalResponse,
} from "@purposemint/contracts";
```

Do not import another application's source:

```ts
// Not allowed
import { something } from "../../api/src";
```

If Metro cannot resolve a shared package:

1. confirm it is in mobile dependencies
2. confirm it declares every dependency it imports
3. confirm its `exports` are valid
4. reinstall and clear Metro

```powershell
pnpm install
cd .\apps\mobile
pnpm exec expo start --clear
```

Modern Expo normally requires no manual monorepo Metro hacks.


---

## 23. Build an Android APK Locally

“Local APK” can mean different things.

### A. Local debug APK

This is the unlimited local developer build.

From `apps/mobile`:

```powershell
pnpm exec expo run:android
```

The APK is normally generated at:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Build it directly with Gradle:

```powershell
cd .\apps\mobile
pnpm exec expo prebuild --clean --platform android
cd .\android
.\gradlew.bat assembleDebug
```

Output:

```text
app\build\outputs\apk\debug\app-debug.apk
```

Install manually:

```powershell
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

A debug APK is:

- installable
- debug-signed
- suitable for developers
- not appropriate for Play Store production

### B. EAS preview APK

This is the recommended signed APK for QA and clients.

From `apps/mobile`:

```powershell
pnpm exec eas build --platform android --profile preview
```

It is:

- cloud-built
- installable directly
- signed
- independent of Metro
- appropriate for internal testing

### C. Fully local signed release APK

A release APK requires:

- generated Android project
- private keystore
- Gradle signing configuration
- secure password management
- a release Gradle build

CNG can replace manual native changes after `prebuild --clean`, so EAS-managed signing is recommended unless company policy requires local signing.

---

## 24. Build an Android AAB Locally

Google Play normally expects an AAB.

Set the production variant and generate Android:

```powershell
cd .\apps\mobile
$env:APP_VARIANT = "production"
pnpm exec expo prebuild --clean --platform android
```

After configuring a private upload key and Gradle release signing:

```powershell
cd .\android
.\gradlew.bat app:bundleRelease
```

Output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Never commit:

```text
*.jks
*.keystore
credentials.json
```

The simpler recommended production command is:

```powershell
pnpm exec eas build --platform android --profile production
```

---

## 25. EAS Cloud Build Commands

All EAS commands run from `apps/mobile`.

### Android development client

```powershell
pnpm exec eas build --platform android --profile development
```

Install it and connect it to Metro with:

```powershell
pnpm start
```

### Android preview APK

```powershell
pnpm exec eas build --platform android --profile preview
```

Use for QA, demos, and client testing.

### Android production AAB

```powershell
pnpm exec eas build --platform android --profile production
```

Use for Google Play.

### iOS development build

```powershell
pnpm exec eas build --platform ios --profile development
```

A physical iPhone development build generally requires Apple signing and a paid Apple Developer account.

### iOS production build

```powershell
pnpm exec eas build --platform ios --profile production
```

Use for TestFlight/App Store distribution.

### Both platforms

```powershell
pnpm exec eas build --platform all --profile production
```

Configure and verify each platform separately before relying on `all`.

---

## 26. Install EAS Android Builds

After a build completes:

- open the build link
- scan the QR code
- download the APK
- install it on Android

Or use ADB:

```powershell
adb install -r .\PurposeMint-preview.apk
```

With distinct application IDs, development, preview, and production can coexist.

---

## 27. `eas build --local` on Windows

EAS supports:

```powershell
eas build --platform android --local
```

Windows does not have first-class local EAS Build support. WSL may work, but it introduces extra toolchain complexity.

Recommended Windows workflows:

```text
Local development client  -> expo run:android
Local debug APK           -> Gradle assembleDebug
Signed preview APK        -> EAS preview cloud build
Production AAB            -> EAS production cloud build
```

Use `eas build --local` mainly on Linux/macOS or dedicated build infrastructure.

---

## 28. iOS From Windows

Windows cannot run:

```powershell
pnpm exec expo run:ios
```

Local iOS compilation requires macOS and Xcode.

From Windows, use EAS cloud:

```powershell
pnpm exec eas build --platform ios --profile development
pnpm exec eas build --platform ios --profile production
```

You still need:

- Apple Developer account
- bundle identifier
- certificates/provisioning
- real-device testing
- App Store Connect access

A Mac remains valuable for difficult native iOS debugging and profiling.

---

## 29. Native Folder Strategy

### Recommended initial approach: CNG

Ignore generated folders:

```gitignore
apps/mobile/android/
apps/mobile/ios/
```

Source of truth:

```text
app.json
app.config.ts
config plugins
package.json
```

Benefits:

- reproducible native generation
- easier Expo SDK upgrades
- fewer accidental Gradle/CocoaPods edits
- cleaner repository

### When to commit native folders

Consider committing them only when:

- a banking SDK requires extensive unsupported setup
- the team intentionally maintains Swift/Kotlin code
- config plugins are not a clean solution
- native build files become a deliberate source of truth

Expo libraries and EAS remain usable even when native folders are committed.

---

## 30. `.gitignore`

Recommended root entries:

```gitignore
# Expo
apps/mobile/.expo/
apps/mobile/dist/
apps/mobile/android/
apps/mobile/ios/

# Mobile environment
apps/mobile/.env.local
apps/mobile/.env.*.local

# Native credentials
*.jks
*.keystore
credentials.json

# Dependencies/builds
node_modules/
.turbo/
.next/
coverage/
```

Do not casually commit Firebase files or native signing credentials. Decide how they will be securely delivered to EAS before adding Firebase.

---

## 31. Validation

### From the monorepo root

```powershell
pnpm install
pnpm --filter @purposemint/mobile doctor
pnpm --filter @purposemint/mobile exec expo config --type public
```

### From `apps/mobile`

```powershell
pnpm exec expo start --clear
pnpm exec expo run:android
```

### Whole monorepo

```powershell
pnpm lint
pnpm check-types
pnpm build
```

Use the actual script names defined in the repository.

---

## 32. Common Problems

### No Android device found

```powershell
adb devices
```

Start an emulator or enable USB debugging.

### SDK location not found

```powershell
$env:ANDROID_HOME
```

Expected:

```text
C:\Users\<username>\AppData\Local\Android\Sdk
```

If needed, create:

```text
apps/mobile/android/local.properties
```

```properties
sdk.dir=C:\\Users\\<username>\\AppData\\Local\\Android\\Sdk
```

Never commit `local.properties`.

### `adb` not recognized

Add:

```text
%ANDROID_HOME%\platform-tools
```

to Windows Path and open a new terminal.

### Native package installed but unavailable at runtime

The installed development client does not include it yet.

```powershell
pnpm exec expo prebuild --clean --platform android
pnpm exec expo run:android
```

### App cannot reach NestJS

Android emulator:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

Physical phone:

```env
EXPO_PUBLIC_API_URL=http://<computer-LAN-IP>:4000
```

Confirm:

- NestJS listens on `0.0.0.0`
- Windows Firewall allows the port
- phone and computer share a network
- development HTTP cleartext requirements are handled

### EAS cannot find workspace files

Confirm:

- EAS command ran from `apps/mobile`
- `pnpm-lock.yaml` is committed
- shared packages are declared in mobile dependencies
- workspace package builds are performed when required

### Wrong package manager detected

Keep only:

```text
pnpm-lock.yaml
```

Do not commit:

```text
package-lock.json
yarn.lock
```

---

## 33. PurposeMint Integration Order

Do not add every native SDK before proving the base setup.

Recommended sequence:

1. Create Expo app.
2. Build local Android development client.
3. Configure EAS.
4. Produce preview APK.
5. Connect authentication to NestJS.
6. Add secure token storage.
7. Add deep-link foundation.
8. Add Plaid.
9. Rebuild development client.
10. Add Stripe.
11. Rebuild development client.
12. Add push notifications.
13. Rebuild development client.
14. Add Synctera-backed workflows through the API.

Plaid, Synctera, Stripe secret keys, and banking business rules remain in NestJS.

---

## 34. Command Cheat Sheet

### Create app — monorepo root

```powershell
pnpm dlx create-expo-app@latest --template default@sdk-57 apps/mobile
pnpm install
```

### Install development tooling — monorepo root

```powershell
pnpm --filter @purposemint/mobile exec expo install expo-dev-client
pnpm --filter @purposemint/mobile add -D eas-cli
```

### Daily development — monorepo root

```powershell
pnpm dev:mobile
```

### Daily development — `apps/mobile`

```powershell
pnpm start
```

### First/rebuilt Android client — `apps/mobile`

```powershell
pnpm exec expo run:android
```

### Clean native regeneration — `apps/mobile`

```powershell
pnpm exec expo prebuild --clean --platform android
pnpm exec expo run:android
```

### Local debug APK — `apps/mobile`

```powershell
pnpm exec expo prebuild --clean --platform android
cd .\android
.\gradlew.bat assembleDebug
```

### EAS setup — `apps/mobile`

```powershell
pnpm exec eas login
pnpm exec eas init
pnpm exec eas build:configure
```

### EAS Android development build

```powershell
pnpm exec eas build --platform android --profile development
```

### EAS Android preview APK

```powershell
pnpm exec eas build --platform android --profile preview
```

### EAS Android production AAB

```powershell
pnpm exec eas build --platform android --profile production
```

### EAS iOS production

```powershell
pnpm exec eas build --platform ios --profile production
```

### Health checks

```powershell
pnpm doctor
pnpm exec expo config --type public
pnpm exec expo start --clear
```

---

## 35. New Developer Checklist

- [ ] Clone the monorepo.
- [ ] Install the required Node version.
- [ ] Run `pnpm install` from the root.
- [ ] Create/pull `apps/mobile/.env.local`.
- [ ] Install JDK 17.
- [ ] Install Android Studio.
- [ ] Install Android SDK Platform 36.
- [ ] Configure `ANDROID_HOME`.
- [ ] Verify `adb --version`.
- [ ] Start emulator or connect Android device.
- [ ] Run `pnpm dev:mobile`.
- [ ] Install the current development build.
- [ ] Rebuild after native dependency changes.
- [ ] Log into the correct Expo organization for EAS.
- [ ] Never expose backend/provider secrets in mobile.

---

## 36. Official References

- Expo monorepos: https://docs.expo.dev/guides/monorepos/
- EAS in monorepos: https://docs.expo.dev/build-reference/build-with-monorepos/
- Development builds: https://docs.expo.dev/develop/development-builds/introduction/
- Local app development: https://docs.expo.dev/guides/local-app-development/
- Continuous Native Generation: https://docs.expo.dev/workflow/continuous-native-generation/
- EAS build setup: https://docs.expo.dev/build/setup/
- EAS configuration: https://docs.expo.dev/build/eas-json/
- APK builds: https://docs.expo.dev/build-reference/apk/
- Local production builds: https://docs.expo.dev/guides/local-app-production/
- Android emulator: https://docs.expo.dev/workflow/android-studio-emulator/
- EAS environment variables: https://docs.expo.dev/eas/environment-variables/
- Build variants: https://docs.expo.dev/build-reference/variants/
