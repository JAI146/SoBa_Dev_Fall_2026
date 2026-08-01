<#
    PurposeMint - Machine Diagnostic

    Run this on the NEW laptop BEFORE cloning the repo or changing anything.
    It only READS. It changes nothing, installs nothing, deletes nothing.

    Copy the ENTIRE output and send it back.

    Usage:
        powershell -ExecutionPolicy Bypass -File .\purposemint-diagnostic.ps1
#>

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

function Section($n, $t) {
    Write-Host ""
    Write-Host "===== [$n] $t =====" -ForegroundColor Cyan
}

function Line($label, $value) {
    Write-Host ("  {0,-26} {1}" -f $label, $value)
}

function TryCmd($exe, $argList) {
    try {
        $out = & $exe @argList 2>&1 | Out-String
        return $out.Trim()
    } catch {
        return "NOT FOUND"
    }
}

Write-Host ""
Write-Host "############################################" -ForegroundColor Green
Write-Host "#   PurposeMint - Machine Diagnostic       #" -ForegroundColor Green
Write-Host "#   Read-only. Nothing will be changed.    #" -ForegroundColor Green
Write-Host "############################################"
Write-Host ("Run at: " + (Get-Date))

# ---------------------------------------------------------------------------
Section 1 "Windows and hardware"

try {
    $os = Get-CimInstance Win32_OperatingSystem
    Line "Windows"        $os.Caption
    Line "Build"          $os.BuildNumber
    Line "RAM (GB)"       ([math]::Round($os.TotalVisibleMemorySize / 1MB, 1))
} catch { Line "Windows" "could not read" }

try {
    $c = Get-PSDrive C
    Line "C: free (GB)"   ([math]::Round($c.Free / 1GB, 1))
    Line "C: used (GB)"   ([math]::Round($c.Used / 1GB, 1))
} catch { Line "C: drive" "could not read" }

Line "PowerShell"     $PSVersionTable.PSVersion.ToString()
Line "Is Admin"       ([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))

# ---------------------------------------------------------------------------
Section 2 "Node and npm"

Line "node"    (TryCmd "node" @("--version"))
Line "npm"     (TryCmd "npm"  @("--version"))

$nodeWhere = TryCmd "where.exe" @("node")
Line "node location(s)" ""
$nodeWhere -split "`n" | ForEach-Object { if ($_.Trim()) { Write-Host "      $($_.Trim())" } }

# ---------------------------------------------------------------------------
Section 3 "Corepack and pnpm"

Line "corepack" (TryCmd "corepack" @("--version"))
Line "pnpm"     (TryCmd "pnpm"     @("--version"))

$pnpmWhere = TryCmd "where.exe" @("pnpm")
Line "pnpm location(s)" ""
$pnpmWhere -split "`n" | ForEach-Object { if ($_.Trim()) { Write-Host "      $($_.Trim())" } }

# A globally npm-installed pnpm alongside Corepack causes shim conflicts.
$npmGlobal = "$env:APPDATA\npm"
if (Test-Path $npmGlobal) {
    $pnpmShims = Get-ChildItem $npmGlobal -Filter "pnpm*" -ErrorAction SilentlyContinue
    if ($pnpmShims) {
        Line "npm-global pnpm shims" "PRESENT (possible conflict)"
        $pnpmShims | ForEach-Object { Write-Host "      $($_.Name)" }
    } else {
        Line "npm-global pnpm shims" "none"
    }
} else {
    Line "npm-global pnpm shims" "npm global dir not found"
}

Line "COREPACK_ENABLE_DOWNLOAD_PROMPT" $(if ($env:COREPACK_ENABLE_DOWNLOAD_PROMPT) { $env:COREPACK_ENABLE_DOWNLOAD_PROMPT } else { "(not set)" })

$corepackCache = "$env:LOCALAPPDATA\node\corepack"
if (Test-Path $corepackCache) {
    Line "Corepack cache" "present"
    Get-ChildItem "$corepackCache\v1\pnpm" -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host "      cached pnpm: $($_.Name)" }
} else {
    Line "Corepack cache" "none yet"
}

# ---------------------------------------------------------------------------
Section 4 "Java"

Line "JAVA_HOME" $(if ($env:JAVA_HOME) { $env:JAVA_HOME } else { "(not set)" })
Write-Host "  java -version:"
$jv = TryCmd "java" @("-version")
$jv -split "`n" | ForEach-Object { if ($_.Trim()) { Write-Host "      $($_.Trim())" } }

Write-Host "  Installed JDKs found on disk:"
$jdkRoots = @(
    "C:\Program Files\Java",
    "C:\Program Files\Eclipse Adoptium",
    "C:\Program Files\Microsoft",
    "C:\Program Files\Amazon Corretto",
    "C:\Program Files\Zulu",
    "C:\Program Files\Android\Android Studio\jbr"
)
$found = $false
foreach ($r in $jdkRoots) {
    if (Test-Path $r) {
        if ($r -like "*jbr") {
            Write-Host "      $r  (Android Studio bundled)"
            $found = $true
        } else {
            Get-ChildItem $r -Directory -ErrorAction SilentlyContinue |
                ForEach-Object { Write-Host "      $($_.FullName)"; $script:found = $true }
        }
    }
}
if (-not $found) { Write-Host "      none found in the usual locations" }

# ---------------------------------------------------------------------------
Section 5 "Android SDK"

Line "ANDROID_HOME"     $(if ($env:ANDROID_HOME)     { $env:ANDROID_HOME }     else { "(not set)" })
Line "ANDROID_SDK_ROOT" $(if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { "(not set)" })
Line "ANDROID_NDK_HOME" $(if ($env:ANDROID_NDK_HOME) { $env:ANDROID_NDK_HOME } else { "(not set)" })

$sdkCandidates = @()
if ($env:ANDROID_HOME)     { $sdkCandidates += $env:ANDROID_HOME }
if ($env:ANDROID_SDK_ROOT) { $sdkCandidates += $env:ANDROID_SDK_ROOT }
$sdkCandidates += "$env:LOCALAPPDATA\Android\Sdk"
$sdkCandidates = $sdkCandidates | Select-Object -Unique

$sdk = $null
foreach ($c in $sdkCandidates) {
    if ($c -and (Test-Path $c)) { $sdk = $c; break }
}

if (-not $sdk) {
    Line "SDK folder" "NOT FOUND"
} else {
    Line "SDK folder" $sdk

    foreach ($sub in @("platforms", "build-tools", "ndk", "cmake", "platform-tools", "cmdline-tools")) {
        $p = Join-Path $sdk $sub
        if (Test-Path $p) {
            $kids = Get-ChildItem $p -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name
            if ($kids) {
                Write-Host "  $sub :"
                $kids | ForEach-Object { Write-Host "      $_" }
            } else {
                Write-Host "  $sub : (present, empty)"
            }
        } else {
            Write-Host "  $sub : MISSING"
        }
    }

    # Old-style single NDK folder used by RN CLI setups
    if (Test-Path (Join-Path $sdk "ndk-bundle")) {
        Write-Host "  ndk-bundle : PRESENT (legacy RN CLI layout)"
    }
}

# ---------------------------------------------------------------------------
Section 6 "Ninja (inside Android CMake)"

if ($sdk -and (Test-Path (Join-Path $sdk "cmake"))) {
    Get-ChildItem (Join-Path $sdk "cmake") -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $n = Join-Path $_.FullName "bin\ninja.exe"
        if (Test-Path $n) {
            $v = TryCmd $n @("--version")
            Write-Host "      cmake\$($_.Name) -> ninja $v"
        } else {
            Write-Host "      cmake\$($_.Name) -> ninja.exe MISSING"
        }
    }
} else {
    Write-Host "      no Android cmake directory found"
}

# ---------------------------------------------------------------------------
Section 7 "ADB and devices"

Line "adb" (TryCmd "adb" @("version"))
Write-Host "  adb devices:"
$dev = TryCmd "adb" @("devices")
$dev -split "`n" | ForEach-Object { if ($_.Trim()) { Write-Host "      $($_.Trim())" } }

# ---------------------------------------------------------------------------
Section 8 "Windows long path support"

try {
    $lp = Get-ItemPropertyValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -ErrorAction Stop
    Line "LongPathsEnabled" $lp
} catch {
    Line "LongPathsEnabled" "NOT SET"
}

# ---------------------------------------------------------------------------
Section 9 "Git"

Line "git" (TryCmd "git" @("--version"))
Line "git core.longpaths" (TryCmd "git" @("config", "--global", "core.longpaths"))
Line "git core.autocrlf"  (TryCmd "git" @("config", "--global", "core.autocrlf"))

# ---------------------------------------------------------------------------
Section 10 "Existing Gradle user config (RN CLI leftovers)"

$gp = "$env:USERPROFILE\.gradle\gradle.properties"
if (Test-Path $gp) {
    Write-Host "  $gp exists. Contents:"
    Get-Content $gp | ForEach-Object { Write-Host "      $_" }
} else {
    Write-Host "  No ~\.gradle\gradle.properties (clean)"
}

$gcache = "$env:USERPROFILE\.gradle\caches"
if (Test-Path $gcache) {
    try {
        $sz = (Get-ChildItem $gcache -Recurse -File -ErrorAction SilentlyContinue |
               Measure-Object -Property Length -Sum).Sum / 1GB
        Line "Gradle cache size (GB)" ([math]::Round($sz, 2))
    } catch { Line "Gradle cache" "present, size unknown" }
} else {
    Line "Gradle cache" "none"
}

$gwrap = "$env:USERPROFILE\.gradle\wrapper\dists"
if (Test-Path $gwrap) {
    Write-Host "  Gradle distributions already downloaded:"
    Get-ChildItem $gwrap -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host "      $($_.Name)" }
}

# ---------------------------------------------------------------------------
Section 11 "Relevant PATH entries"

$paths = $env:Path -split ';' | Where-Object { $_ -ne "" }
$keywords = @("node", "npm", "pnpm", "java", "jdk", "Android", "Sdk", "platform-tools", "cmdline-tools", "gradle", "ninja", "Git")
$hits = $paths | Where-Object { $p = $_; ($keywords | Where-Object { $p -like "*$_*" }).Count -gt 0 }
if ($hits) { $hits | ForEach-Object { Write-Host "      $_" } } else { Write-Host "      none matched" }

Write-Host ""
Write-Host "===== END - copy everything above and send it back =====" -ForegroundColor Green
Write-Host ""
