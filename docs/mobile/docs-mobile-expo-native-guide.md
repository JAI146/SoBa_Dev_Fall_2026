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

Open PowerShell in the monorepo root and confirm required files:

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

Open `apps/mobile/package.json` and set:

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

```powershell
pnpm --filter @purposemint/mobile exec expo install expo-dev-client
```

This package makes debug builds into custom Expo development builds and allows arbitrary native SDKs and native configuration.

---

## 8. Install EAS CLI

Run from the monorepo root:

```powershell
pnpm --filter @purposemint/mobile add -D eas-cli
```

Verify:

```powershell
pnpm --filter @purposemint/mobile exec eas --version
```

This pins EAS CLI for the project and avoids requiring a global installation. Use `pnpm exec eas` throughout.

---

## 9. Recommended Mobile Scripts

In `apps/mobile/package.json`:

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

In the monorepo root `package.json`:

```json
{
  "scripts": {
    "dev:mobile": "pnpm --filter @purposemint/contracts build && pnpm --filter @purposemint/mobile start",
    "dev:mobile:clear": "pnpm --filter @purposemint/mobile start:clear",
    "mobile:android": "pnpm --filter @purposemint/mobile android",
    "mobile:doctor": "pnpm --filter @purposemint/mobile doctor"
  }
}
```

`packages/contracts` must be compiled before Metro starts, since the mobile app imports from its `dist` output.

---

## 11. Base Expo Configuration

Open `apps/mobile/app.json`. Preserve generated icons, plugins, Router configuration, experiments, and splash assets. Update the base identity:

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

Create `apps/mobile/.env.local`.

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

Replace the LAN IP with the computer's address (`ipconfig`). Inside a phone or emulator, `localhost` points to that device, not the computer.

```text
Android emulator -> http://10.0.2.2:<port>
Physical phone   -> http://<computer-LAN-IP>:<port>
Production       -> https://api.your-domain.com
```

An alternative to chasing the LAN IP every time you switch networks is
`adb reverse tcp:<port> tcp:<port>`, which makes the phone's `localhost:<port>`
forward to the same port on the development machine over the adb connection —
`EXPO_PUBLIC_API_URL=http://localhost:<port>` then works regardless of network.

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

Commit an example, `apps/mobile/.env.example`:

```env
APP_VARIANT=development
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

---

## 14. Configure EAS

Run from `apps/mobile`.

```powershell
cd .\apps\mobile
pnpm exec eas login
pnpm exec eas whoami
pnpm exec eas init
```

`eas init` normally adds an EAS project ID under `extra.eas.projectId`. Do not
remove that value. Because this guide also uses a dynamic `app.config.ts`, EAS
CLI may tell you it cannot edit the dynamic config automatically — in that case,
copy the project ID shown by EAS into the static `app.json`:

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

This creates `apps/mobile/eas.json`.

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

- **development** — engineering and native SDK work. Contains `expo-dev-client`, connects to Metro.
- **preview** — QA, client testing, demos. Android produces an installable APK, no Metro required.
- **production** — app stores. Android normally produces an AAB.

---

## 16. EAS Environment Variables

Run from `apps/mobile`.

```powershell
pnpm exec eas env:create `
  --name EXPO_PUBLIC_API_URL `
  --value https://dev-api.example.com `
  --environment development `
  --visibility plaintext
```

Repeat per environment (`preview`, `production`) with the matching URL.

```powershell
pnpm exec eas env:list --environment development
pnpm exec eas env:pull --environment development --path .env.local
```

EAS secret visibility does not make an `EXPO_PUBLIC_*` value private once it is embedded in the app.

---

## 17. Windows Android Toolchain

EAS cloud builds do not require Android Studio. Local Android builds require
JDK 17, Android Studio, Android SDK Platform 36, Build Tools, Platform Tools,
and an emulator or physical device.

### Install JDK 17

```powershell
choco install -y microsoft-openjdk17
```

Restart PowerShell and verify:

```powershell
java -version
javac -version
```

### Install Android Studio

During setup, include Android Studio, the Android SDK, and an Android Virtual
Device. In **Settings → Languages & Frameworks → Android SDK**, install:

- Android 16 / API 36 (plus sources)
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android Emulator
- Android SDK Command-line Tools

### Set `ANDROID_HOME`

Usual Windows path: `C:\Users\<username>\AppData\Local\Android\Sdk`

Create a user environment variable `ANDROID_HOME` with that value, and add to
`Path`:

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

Android Studio → Device Manager → Create device → choose a Pixel device →
choose/install a system image → Finish → Start.

```powershell
adb devices
```

Expected: `emulator-5554    device`

### Physical Android device

Enable Developer options → USB debugging, connect, run `adb devices`, and
accept the authorization prompt on the phone.

---

## 18. First Local Native Development Build

Start an emulator or connect a phone, then from `apps/mobile`:

```powershell
cd .\apps\mobile
pnpm exec expo run:android
```

This detects the missing Android project, runs Prebuild automatically,
generates `android/`, compiles through Gradle, installs the debug APK, starts
Metro, and opens PurposeMint Dev. Equivalent to
`npx react-native run-android` for a React Native CLI developer. No separate
Prebuild step is needed before the first `run:android`.

---

## 19. Daily Development

After the development build is installed, normal JS/TS work does not require
another native build.

```powershell
pnpm dev:mobile          # from monorepo root
pnpm start                # from apps/mobile
pnpm exec expo start --dev-client   # force dev-client mode
pnpm exec expo start --dev-client --clear   # clear Metro cache
```

Terminal controls: `A` open Android, `Shift+A` choose device, `R` reload,
`M` dev menu, `J` React Native DevTools, `S` switch Expo Go / dev build.

---

## 20. When a Native Rebuild Is Required

No rebuild needed for React components, TypeScript, styles, API calls, state
management, form validation, most navigation, or business logic.

Rebuild after: adding/removing a native package, changing permissions, changing
the Android application ID or iOS bundle identifier, changing URL schemes or
deep links, adding Apple/Google Pay, changing push notification setup,
modifying config plugins, changing Gradle/entitlements, or upgrading Expo
SDK/React Native.

```powershell
cd .\apps\mobile
pnpm exec expo prebuild --clean --platform android
pnpm exec expo run:android
```

`prebuild --clean` deletes and regenerates the native project — manual native
changes can be lost, so use app config and config plugins instead of editing
generated native files.

---

## 21. Installing Packages

**Expo SDK library** — `pnpm --filter @purposemint/mobile exec expo install <pkg>` (chooses an SDK-compatible version).

**Normal dependency** — `pnpm --filter @purposemint/mobile add <pkg>`

**Dev dependency** — `pnpm --filter @purposemint/mobile add -D <pkg>`

**Native third-party dependency:**

```powershell
pnpm --filter @purposemint/mobile add <native-package>
cd .\apps\mobile
pnpm exec expo prebuild --clean --platform android
pnpm exec expo run:android
```

Never install mobile-only libraries in the root package.

---

## 22. Shared Contracts

```powershell
pnpm --filter @purposemint/mobile add @purposemint/contracts@workspace:*
```

```ts
import { type AuthResponse, type GoalResponse } from "@purposemint/contracts";
```

Never import another application's source (`../../api/src`). If Metro cannot
resolve a shared package: confirm it's in mobile dependencies, confirm it
declares every dependency it imports, confirm its `exports` are valid, then
reinstall and clear Metro:

```powershell
pnpm install
cd .\apps\mobile
pnpm exec expo start --clear
```

Modern Expo normally requires no manual monorepo Metro hacks.

---

## 23. Build an Android APK Locally

### A. Local debug APK

```powershell
pnpm exec expo run:android
```

Output: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

Or directly with Gradle:

```powershell
cd .\apps\mobile
pnpm exec expo prebuild --clean --platform android
cd .\android
.\gradlew.bat assembleDebug
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

Debug-signed; suitable for developers, not Play Store production.

### B. EAS preview APK (recommended for QA/clients)

```powershell
pnpm exec eas build --platform android --profile preview
```

Cloud-built, signed, installable directly, independent of Metro.

### C. Fully local signed release APK

Requires a generated Android project, a private keystore, Gradle signing
configuration, and secure password management. EAS-managed signing is
recommended unless company policy requires local signing.

---

## 24. Build an Android AAB Locally

```powershell
cd .\apps\mobile
$env:APP_VARIANT = "production"
pnpm exec expo prebuild --clean --platform android
cd .\android
.\gradlew.bat app:bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

Never commit `*.jks`, `*.keystore`, or `credentials.json`.

Simpler recommended path: `pnpm exec eas build --platform android --profile production`

---

## 25. EAS Cloud Build Commands

All run from `apps/mobile`.

```powershell
pnpm exec eas build --platform android --profile development   # dev client, connects to Metro
pnpm exec eas build --platform android --profile preview         # QA/demo APK
pnpm exec eas build --platform android --profile production      # Google Play AAB
pnpm exec eas build --platform ios --profile development         # requires Apple signing
pnpm exec eas build --platform ios --profile production          # TestFlight/App Store
pnpm exec eas build --platform all --profile production          # configure/verify each platform first
```

---

## 26. Install EAS Android Builds

After a build completes, open the build link, scan the QR code, download the
APK, and install — or:

```powershell
adb install -r .\PurposeMint-preview.apk
```

Distinct application IDs let development, preview, and production coexist on
one device.

---

## 27. `eas build --local` on Windows

Windows does not have first-class local EAS Build support; WSL may work but
adds toolchain complexity. Recommended Windows workflow:

```text
Local development client  -> expo run:android
Local debug APK           -> Gradle assembleDebug
Signed preview APK        -> EAS preview cloud build
Production AAB            -> EAS production cloud build
```

Use `eas build --local` mainly on Linux/macOS or dedicated build infrastructure.

---

## 28. iOS From Windows

Windows cannot run `expo run:ios`. Local iOS compilation requires macOS and
Xcode. From Windows, use EAS cloud builds — you still need an Apple Developer
account, bundle identifier, certificates/provisioning, and App Store Connect
access. A Mac remains valuable for difficult native iOS debugging.

---

## 29. Native Folder Strategy

**Recommended initial approach: CNG.** Ignore generated folders:

```gitignore
apps/mobile/android/
apps/mobile/ios/
```

Source of truth: `app.json`, `app.config.ts`, config plugins, `package.json`.
Benefits: reproducible native generation, easier Expo SDK upgrades, fewer
accidental Gradle/CocoaPods edits, cleaner repository.

Commit native folders only when a banking SDK requires extensive unsupported
setup, the team intentionally maintains Swift/Kotlin code, config plugins
aren't a clean solution, or native build files become a deliberate source of
truth.

---

## 30. `.gitignore`

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

Do not casually commit Firebase files or native signing credentials.

---

## 31. Validation

```powershell
# monorepo root
pnpm install
pnpm --filter @purposemint/mobile doctor
pnpm --filter @purposemint/mobile exec expo config --type public

# apps/mobile
pnpm exec expo start --clear
pnpm exec expo run:android

# whole monorepo
pnpm lint
pnpm check-types
pnpm build
```

---

## 32. Common Problems

**No Android device found** — `adb devices`; start an emulator or enable USB debugging.

**SDK location not found** — check `$env:ANDROID_HOME`; if needed create
`apps/mobile/android/local.properties` with `sdk.dir=...` (never commit it).

**`adb` not recognized** — add `%ANDROID_HOME%\platform-tools` to Path, open a new terminal.

**Native package installed but unavailable at runtime** — the installed dev client doesn't include it yet:

```powershell
pnpm exec expo prebuild --clean --platform android
pnpm exec expo run:android
```

**App cannot reach NestJS** — confirm the right `EXPO_PUBLIC_API_URL` for
emulator vs. physical device, that NestJS listens on `0.0.0.0`, that Windows
Firewall allows the port, and that phone and computer share a network (or use
`adb reverse`).

**EAS cannot find workspace files** — confirm the command ran from
`apps/mobile`, `pnpm-lock.yaml` is committed, shared packages are declared in
mobile dependencies, and workspace package builds have been performed when
required.

**Wrong package manager detected** — keep only `pnpm-lock.yaml`; never commit
`package-lock.json` or `yarn.lock`.

---

## 33. PurposeMint Integration Order

Do not add every native SDK before proving the base setup. Recommended
sequence: create the Expo app, build the local Android development client,
configure EAS, produce a preview APK, connect authentication to NestJS, add
secure token storage, add a deep-link foundation, add Plaid, rebuild, add
Stripe, rebuild, add push notifications, rebuild, then add Synctera-backed
workflows through the API. Plaid, Synctera, and Stripe secret keys, along with
all banking business rules, remain in NestJS throughout.

---

## 34. Command Cheat Sheet

```powershell
# Create app — monorepo root
pnpm dlx create-expo-app@latest --template default@sdk-57 apps/mobile
pnpm install

# Install development tooling — monorepo root
pnpm --filter @purposemint/mobile exec expo install expo-dev-client
pnpm --filter @purposemint/mobile add -D eas-cli

# Daily development
pnpm dev:mobile                    # monorepo root
pnpm start                          # apps/mobile

# First/rebuilt Android client — apps/mobile
pnpm exec expo run:android

# Clean native regeneration — apps/mobile
pnpm exec expo prebuild --clean --platform android
pnpm exec expo run:android

# Local debug APK — apps/mobile
pnpm exec expo prebuild --clean --platform android
cd .\android
.\gradlew.bat assembleDebug

# EAS setup — apps/mobile
pnpm exec eas login
pnpm exec eas init
pnpm exec eas build:configure

# EAS builds
pnpm exec eas build --platform android --profile development
pnpm exec eas build --platform android --profile preview
pnpm exec eas build --platform android --profile production
pnpm exec eas build --platform ios --profile production

# Health checks
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
