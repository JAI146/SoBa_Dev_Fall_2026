<#
    PurposeMint - Android native build pre-flight

    Answers "will this build fail on path length?" WITHOUT running the build.

    Simulates the object-file paths CMake will generate for every native package
    in node_modules, and checks the other two things that have to be true before
    a native compile can succeed on Windows.

    Run from anywhere. Read-only - changes nothing.
#>

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Repo root - derived from this script's own location.
#
# Expected layout:  <repo>\scripts\preflight-native-build.ps1
#
# Deriving it rather than hardcoding matters: if you run this through a
# junction (C:\PM -> the real folder), $PSScriptRoot keeps the SHORT path,
# which is exactly the path Gradle and CMake will see. A hardcoded value
# would measure the long path and give a false failure.
#
# Override only if you move the script out of scripts\ :
#   $Repo = "C:\PM"
# ---------------------------------------------------------------------------
$Repo = Split-Path -Path $PSScriptRoot -Parent

$CMakeLimit = 250    # CMAKE_OBJECT_PATH_MAX default
$MaxPath    = 260    # Win32 MAX_PATH

# Worst-case segment CMake + the Android Gradle Plugin insert between the
# package root and the source-relative object path. Pattern taken from this
# project's own build output, with Debug swapped for the longer RelWithDebInfo
# and a long target name, so this errs pessimistic:
#   \android\.cxx\RelWithDebInfo\<hash8>\arm64-v8a\CMakeFiles\<target>.dir
$OverheadSample = "\android\.cxx\RelWithDebInfo\0a1b2c3d\arm64-v8a\CMakeFiles\react-native-reanimated.dir"
$Overhead = $OverheadSample.Length

Write-Host ""
Write-Host "=== PurposeMint native build pre-flight ===" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# 1. Repo root
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath (Join-Path $Repo "pnpm-workspace.yaml"))) {
    throw "No pnpm-workspace.yaml at $Repo - this script expects to live in <repo>\scripts\."
}

Write-Host "[1] Repo root" -ForegroundColor Yellow
Write-Host "    $Repo"
Write-Host "    $($Repo.Length) characters"
Write-Host ""

$nm = Join-Path $Repo "node_modules"
if (-not (Test-Path -LiteralPath $nm)) {
    throw "node_modules not found. Run 'pnpm install' first - there is nothing to measure yet."
}

# Confirm the hoisted layout is actually in effect
$hoistProbe = Join-Path $nm "react-native-worklets"
if (Test-Path -LiteralPath $hoistProbe) {
    Write-Host "    Hoisted layout confirmed (react-native-worklets at root)" -ForegroundColor Green
} else {
    Write-Host "    WARNING: react-native-worklets is NOT at the root of node_modules." -ForegroundColor Red
    Write-Host "    nodeLinker: hoisted may not be active. Paths below will be optimistic." -ForegroundColor Red
}
Write-Host ""

# ---------------------------------------------------------------------------
# 2. Worst-case object paths
# ---------------------------------------------------------------------------
Write-Host "[2] Simulating CMake object paths..." -ForegroundColor Yellow

# Build the package list, unwrapping @scoped/ directories one level
$pkgDirs = [System.Collections.Generic.List[object]]::new()

Get-ChildItem -LiteralPath $nm -Directory | ForEach-Object {
    if ($_.Name.StartsWith("@")) {
        Get-ChildItem -LiteralPath $_.FullName -Directory | ForEach-Object { $pkgDirs.Add($_) }
    }
    elseif ($_.Name -ne ".pnpm" -and $_.Name -ne ".bin") {
        $pkgDirs.Add($_)
    }
}

$results = [System.Collections.Generic.List[object]]::new()
$nativePkgCount = 0

foreach ($pkg in $pkgDirs) {

    # Only packages that ship an android/ folder get compiled natively
    if (-not (Test-Path -LiteralPath (Join-Path $pkg.FullName "android"))) { continue }

    $sources = Get-ChildItem -LiteralPath $pkg.FullName -Recurse -File -ErrorAction SilentlyContinue |
               Where-Object { $_.Extension -in ".cpp", ".cc", ".c", ".cxx" }

    if (-not $sources) { continue }
    $nativePkgCount++

    foreach ($s in $sources) {
        $rel   = $s.FullName.Substring($pkg.FullName.Length)   # keeps the leading backslash
        $total = $pkg.FullName.Length + $Overhead + $rel.Length + 2   # +2 for the ".o" suffix

        $results.Add([pscustomobject]@{
            Length  = $total
            Package = $pkg.Name
            Source  = $rel.TrimStart('\')
        })
    }
}

Write-Host "    $nativePkgCount native package(s), $($results.Count) source file(s) examined"
Write-Host ""

if ($results.Count -eq 0) {
    Write-Host "    No native sources found. Nothing to check." -ForegroundColor Green
    Write-Host "    (If you expected some, node_modules may be incomplete.)"
    return
}

Write-Host "    Ten longest projected object paths:" -ForegroundColor Yellow
$results |
    Sort-Object Length -Descending |
    Select-Object -First 10 |
    Format-Table Length, Package, Source -AutoSize

$max = ($results | Measure-Object -Property Length -Maximum).Maximum

# ---------------------------------------------------------------------------
# 3. Verdict
# ---------------------------------------------------------------------------
Write-Host "[3] Verdict" -ForegroundColor Yellow
Write-Host "    Worst projected object path : $max characters"
Write-Host "    CMAKE_OBJECT_PATH_MAX       : $CMakeLimit"
Write-Host "    Win32 MAX_PATH              : $MaxPath"
Write-Host "    Headroom                    : $($CMakeLimit - $max) characters"
Write-Host ""

if ($max -lt 230) {
    Write-Host "    PASS - comfortable margin. Path length is not your blocker." -ForegroundColor Green
}
elseif ($max -lt $CMakeLimit) {
    Write-Host "    TIGHT - under the limit, but with little room." -ForegroundColor Yellow
    Write-Host "    Expect CMake warnings. Adding another native package could push it over." -ForegroundColor Yellow
}
else {
    Write-Host "    FAIL - the build will hit the object path limit." -ForegroundColor Red
    Write-Host "    Shorten the effective path before building (junction or subst)." -ForegroundColor Red
}
Write-Host ""

# ---------------------------------------------------------------------------
# 4. Windows long paths
# ---------------------------------------------------------------------------
Write-Host "[4] Windows long path support" -ForegroundColor Yellow
try {
    $lp = Get-ItemPropertyValue `
            -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
            -Name "LongPathsEnabled" -ErrorAction Stop
    if ($lp -eq 1) {
        Write-Host "    LongPathsEnabled = 1" -ForegroundColor Green
    } else {
        Write-Host "    LongPathsEnabled = $lp  (should be 1)" -ForegroundColor Red
    }
}
catch {
    Write-Host "    LongPathsEnabled is not set (should be 1)" -ForegroundColor Red
}
Write-Host "    Note: this only helps tools that declare themselves long-path aware." -ForegroundColor DarkGray
Write-Host ""

# ---------------------------------------------------------------------------
# 5. Ninja
# ---------------------------------------------------------------------------
Write-Host "[5] Ninja version" -ForegroundColor Yellow
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$cmakeRoot = Join-Path $sdk "cmake"

if (Test-Path -LiteralPath $cmakeRoot) {
    Get-ChildItem -LiteralPath $cmakeRoot -Directory | ForEach-Object {
        $ninja = Join-Path $_.FullName "bin\ninja.exe"
        if (Test-Path -LiteralPath $ninja) {
            $v = (& $ninja --version) 2>$null
            $parts = $v.Split('.')
            $ok = ([int]$parts[0] -gt 1) -or ([int]$parts[0] -eq 1 -and [int]$parts[1] -ge 12)
            if ($ok) {
                Write-Host "    cmake\$($_.Name): ninja $v" -ForegroundColor Green
            } else {
                Write-Host "    cmake\$($_.Name): ninja $v  - TOO OLD, needs >= 1.12.0" -ForegroundColor Red
                Write-Host "      Windows long-path support landed in Ninja 1.12.0." -ForegroundColor DarkGray
            }
        }
    }
} else {
    Write-Host "    No Android SDK cmake directory found at $cmakeRoot" -ForegroundColor Red
}
Write-Host ""

# ---------------------------------------------------------------------------
# 6. Device
# ---------------------------------------------------------------------------
Write-Host "[6] Connected devices" -ForegroundColor Yellow
try {
    $devices = & adb devices 2>$null | Select-Object -Skip 1 | Where-Object { $_ -match "\S" }
    if ($devices) {
        $devices | ForEach-Object { Write-Host "    $_" -ForegroundColor Green }
    } else {
        Write-Host "    No device detected. Connect by USB and authorise debugging." -ForegroundColor Red
    }
}
catch {
    Write-Host "    adb not on PATH" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== end ===" -ForegroundColor Cyan
Write-Host ""
