# Install mcw-skills into ~/.claude/skills (Windows PowerShell 5.1+)
#   irm https://raw.githubusercontent.com/michallryska-sys/mcw-skills/main/install.ps1 | iex
# Only some skills:
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/michallryska-sys/mcw-skills/main/install.ps1))) trial review-replies
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Skills)
$ErrorActionPreference = 'Stop'
$Repo = 'https://github.com/michallryska-sys/mcw-skills'
$All = @('trial', 'council', 'review-replies', 'instagram-post')
if (-not $Skills -or $Skills.Count -eq 0) { $Skills = $All }
$Dest = if ($env:CLAUDE_SKILLS_DIR) { $env:CLAUDE_SKILLS_DIR } else { Join-Path $HOME '.claude\skills' }

$Tmp = Join-Path ([IO.Path]::GetTempPath()) ('mcw-skills-' + [guid]::NewGuid())
New-Item -ItemType Directory -Force $Tmp | Out-Null
try {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        git clone --quiet --depth 1 $Repo (Join-Path $Tmp 'repo')
        if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
        $Src = Join-Path $Tmp 'repo'
    } else {
        $Zip = Join-Path $Tmp 'repo.zip'
        Invoke-WebRequest "$Repo/archive/refs/heads/main.zip" -OutFile $Zip -UseBasicParsing
        Expand-Archive $Zip -DestinationPath $Tmp
        $Src = Join-Path $Tmp 'mcw-skills-main'
    }
    New-Item -ItemType Directory -Force $Dest | Out-Null
    foreach ($s in $Skills) {
        if ($All -notcontains $s) { throw "unknown skill '$s' (available: $($All -join ', '))" }
        $Target = Join-Path $Dest $s
        $EnvFile = Join-Path $Target '.env'
        $Saved = Join-Path $Tmp "$s.env"
        if (Test-Path $EnvFile) { Copy-Item $EnvFile $Saved }
        if (Test-Path $Target) { Remove-Item -Recurse -Force $Target }
        Copy-Item -Recurse (Join-Path $Src "skills\$s") $Target
        if (Test-Path $Saved) { Copy-Item $Saved $EnvFile }
        Write-Host "installed /$s -> $Target"
    }
    Write-Host 'Done. Restart Claude Code (or open a new session) and type / to see the skills.'
} finally {
    Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue
}
