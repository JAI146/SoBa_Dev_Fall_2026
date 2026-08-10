# PurposeMint — Windows Local Build Runbook

Condensed from the full troubleshooting log
(`PURPOSEMINT_EXPO_NATIVE_DEVELOPMENT_GUIDE.md`). That document is a decision history; this
one is the operational procedure. Keep the original outside the project as an archive.

**Platform:** Windows. All commands are PowerShell, run from `C:\PM` unless stated.

---

## 1. Environment Requirements

```text
Repo path      C:\PM                    (short by design — do not move)
Node           22.17.1                  (Expo SDK 57 requires >= 22.13)
Java           OpenJDK 17
pnpm           10.34.5
Android SDK    installed, ADB on PATH
Ninja          >= 1.12.0                (bundled version is 1.10.2 — must be replaced)
Windows        LongPathsEnabled = 1
```

Verify long paths:

```powershell
Get-ItemPropertyValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled"
```

If missing, set it in an elevated shell and **restart Windows**:

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
    -Name "LongPathsEnabled" -PropertyType DWord -Value 1 -Force
```

Long paths alone are not sufficient — the tool must also be long-path-aware, which is why
Ninja still has to be upgraded.

---

## 2. Required `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"

nodeLinker: hoisted

allowBuilds:
  bcrypt: true
  sharp: false
  unrs-resolver: false
```

`nodeLinker: hoisted` is mandatory. pnpm's isolated layout produces paths like
`node_modules/.pnpm/react-native-worklets@0.10._<hash>/node_modules/react-native-worklets/...`
which, once CMake appends `android/.cxx/Debug/<arch>/CMakeFiles/worklets.dir/Common/cpp/...`,
exceed the native toolchain's object-path limit. Hoisting flattens this to
`C:\PM\node_modules\react-native-worklets`.

**Do not** re-add `virtualStoreDir`. It was tried — it cut the object directory from ~225 to
~186 characters, which was still too long — and it is redundant under a hoisted layout.

Trade-off accepted: hoisting allows phantom dependencies. Mitigate by keeping every
`package.json` accurate and testing CI from a clean install.

---

## 3. Recovery Procedure — Full Clean Reinstall

Use this when Expo CLI fails to resolve, after a linker change, or when the install state is
suspect.

**First close:** VS Code, Android Studio, Metro, Gradle terminals, any Node process holding
the repo, and Explorer windows inside `node_modules`.

### Phase 1 — wipe

```powershell
cd C:\PM

if (Test-Path .\apps\mobile\android\gradlew.bat) {
    .\apps\mobile\android\gradlew.bat --stop
}

$nodeModulesDirectories = @("C:\PM\node_modules")

$nodeModulesDirectories += Get-ChildItem "C:\PM\apps" -Directory |
    ForEach-Object { Join-Path $_.FullName "node_modules" }

$nodeModulesDirectories += Get-ChildItem "C:\PM\packages" -Directory |
    ForEach-Object { Join-Path $_.FullName "node_modules" }

$nodeModulesDirectories |
    Where-Object { Test-Path $_ } |
    ForEach-Object {
        Write-Host "Removing: $_"
        Remove-Item -LiteralPath $_ -Recurse -Force
    }

Remove-Item -LiteralPath C:\.pm-vstore-purposemint -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath C:\PM\apps\mobile\android -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath C:\PM\.turbo -Recurse -Force -ErrorAction SilentlyContinue
```

Deleting only the **root** `node_modules` is the mistake that caused the current Expo CLI
failure — a stale `apps/mobile/node_modules/.bin/expo.cmd` survived and kept pointing at a
path that no longer exists. Confirm:

```powershell
Test-Path C:\PM\apps\mobile\node_modules   # must return False
```

### Phase 2 — reinstall

```powershell
pnpm install --force
```

`--force` is correct here because the node-linker layout changed; pnpm must recreate
dependency directories, links, shims and workspace links from scratch.

### Phase 3 — verify mobile resolution

```powershell
pnpm --filter @purposemint/mobile list expo --depth 0

pnpm --filter @purposemint/mobile exec node -p "require.resolve('expo/package.json')"
pnpm --filter @purposemint/mobile exec node -p "require.resolve('react-native-worklets/package.json')"

pnpm --filter @purposemint/mobile exec expo --version
```

Expected resolution root: `C:\PM\node_modules\...`. `expo --version` must succeed before
going further.

If Expo is missing from `apps/mobile/package.json`:

```powershell
pnpm --filter @purposemint/mobile add expo@^57.0.0
```

### Phase 4 — align Expo packages

```powershell
pnpm --filter @purposemint/mobile exec expo install --fix
pnpm --filter @purposemint/mobile exec expo-doctor
```

Use `expo install --fix`, **not** `pnpm update --latest` — the latter installs versions
outside the SDK's compatibility range.

### Phase 5 — prebuild

```powershell
pnpm --filter @purposemint/mobile exec expo prebuild --clean --platform android
```

This regenerates `C:\PM\apps\mobile\android`. Prebuild does not compile C++, so Ninja is
irrelevant at this step — the ordering matters:

```text
Expo CLI -> Prebuild -> Android project -> Gradle -> CMake -> Ninja -> object files -> APK
```

### Phase 6 — upgrade Ninja

```powershell
$Sdk = "$env:LOCALAPPDATA\Android\Sdk"
$BundledNinja = "$Sdk\cmake\3.22.1\bin\ninja.exe"

& $BundledNinja --version          # currently 1.10.2
Copy-Item $BundledNinja "$BundledNinja.backup" -Force
Copy-Item "C:\Tools\ninja\ninja.exe" $BundledNinja -Force
& $BundledNinja --version          # must be >= 1.12.0
```

Ninja 1.12.0 added Windows support for paths beyond 260 characters. 1.10.2 predates it,
which is why moving the repo and enabling long paths were not enough on their own.

This is a **local machine change**. Never commit it. Document it for any other Windows
developer. An Android SDK update can overwrite it — recheck if the path error returns.

### Phase 7 — clear native caches

CMake and Gradle cache absolute paths, so stale `.cxx` state can reproduce an already-fixed
error.

```powershell
cd C:\PM
.\apps\mobile\android\gradlew.bat --stop

Remove-Item -Recurse -Force .\apps\mobile\android\.cxx -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\apps\mobile\android\app\.cxx -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\apps\mobile\android\.gradle -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\node_modules\react-native-worklets\android\.cxx -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\node_modules\react-native-reanimated\android\.cxx -ErrorAction SilentlyContinue
```

### Phase 8 — build

```powershell
adb devices     # expect: ZY22F4PXXG    device
pnpm --filter @purposemint/mobile exec expo run:android --device
```

---

## 4. Error → Cause Reference

| Symptom | Cause | Action |
| --- | --- | --- |
| `ninja: error: manifest 'build.ninja' still dirty after 100 tries` | Object paths exceed what Ninja 1.10.2 handles on Windows | §3 Phase 6 |
| `The object file directory has N characters` (CMake warning) | Path depth from repo + linker + native source hierarchy | Hoisted linker + short repo path; if still failing see §5 |
| `Cannot find module 'C:\PM\apps\mobile\node_modules\expo\bin\cli'` | Stale workspace-level `.bin` shim from the isolated install | §3 Phase 1–2, wipe **all** `node_modules` |
| `Failed to create bin at ...\.bin\node` / `@types\node\node.exe` | Suspected bad `"node": "npm:@types/node@..."` alias or stale `.bin` in `apps/api` | See §6 |
| `Deprecated Gradle features ... incompatible with Gradle 10` | Forward-compatibility warning only | Ignore until the next Expo/RN/AGP upgrade |

---

## 5. Fallbacks, in Order of Preference

Only if the procedure above still fails.

1. **Lower `CMAKE_OBJECT_PATH_MAX`** (e.g. 180, never below 128) so CMake hashes object paths sooner. Awkward to plumb through Expo-generated Gradle, and it affects all native modules. Never *raise* it — that hides the warning while making the underlying failure more likely.
2. **Install a newer Android CMake package** so CMake and Ninja upgrade together. Cleaner and more reproducible than swapping one binary, but must stay compatible with Expo, RN and AGP.
3. **EAS Build** — Linux-based, sidesteps Windows path behaviour entirely. Right answer for preview APKs, production AABs and CI. Not a substitute for day-to-day local native debugging.
4. **WSL2 / Linux / macOS** — solves the class of problem but adds ADB and USB forwarding complexity with a physical device.
5. **`subst` drive** mapping `C:\PM` to `P:\` — saves only a few characters now that the repo is already near the drive root. Emergency use only.
6. **Patch `react-native-worklets`** to shorten target and output paths. Last resort: patches vanish on reinstall, need `patch-package` or pnpm patches, and break on upgrade. Treats a toolchain problem as an application problem.

Rejected outright: switching to npm or yarn (breaks the single-package-manager rule for a
benefit hoisting already provides), and splitting mobile into its own repo (loses shared
contracts; revisit only if native issues persist after all of the above).

---

## 6. Outstanding: `apps/api` bin-link warning

pnpm repeatedly warns that it cannot create a `node` bin in `apps/api`, resolving to
`@types/node/node.exe`. `@types/node` ships TypeScript declarations and should provide no
binary at all. Installation still completes, and this is unrelated to the mobile build.

Investigate before changing anything:

```powershell
pnpm --filter @purposemint/api why node

$packageFiles = @("C:\PM\package.json")
$packageFiles += Get-ChildItem "C:\PM\apps" -Directory | ForEach-Object { Join-Path $_.FullName "package.json" }
$packageFiles += Get-ChildItem "C:\PM\packages" -Directory | ForEach-Object { Join-Path $_.FullName "package.json" }

Select-String -Path $packageFiles -Pattern '"node"\s*:'
```

`"engines": { "node": ">=22" }` is valid. A `dependencies` entry of
`"node": "npm:@types/node@..."` is the bug. If present:

```powershell
pnpm --filter @purposemint/api remove node
pnpm --filter @purposemint/api add -D @types/node
```

---

## 7. `allowBuilds`

`allowBuilds` controls whether a dependency's lifecycle scripts (`preinstall`, `install`,
`postinstall`) may run. It has no effect on CMake object paths and is unrelated to the
native build failure.

It can cause separate problems: `sharp` normally relies on its install script to fetch
platform-specific binaries, and `unrs-resolver` may need to build a native binding. Current
denials are intentional but untested. After a clean install, review pnpm's ignored-build
output, confirm which app actually needs each package, and approve only what is required —
per package, not globally.

---

## 8. Rules

**Never revert:**
- Repo location `C:\PM`
- `nodeLinker: hoisted`

**Never do:**
- Re-add `virtualStoreDir` as the primary fix
- Raise `CMAKE_OBJECT_PATH_MAX`
- Commit the replaced `ninja.exe`
- Introduce a second lockfile or package manager
