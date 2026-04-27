param(
    [string]$SiteRoot = (Join-Path $PSScriptRoot "..")
)

$ErrorActionPreference = "Stop"

$regexFlags = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor `
    [System.Text.RegularExpressions.RegexOptions]::Singleline

$siteRootPath = (Resolve-Path $SiteRoot).Path
$outFile = Join-Path $PSScriptRoot "search-index.js"

function Get-MatchValue([string]$Text, [string]$Pattern) {
    $match = [regex]::Match($Text, $Pattern, $regexFlags)
    if ($match.Success) {
        return $match.Groups[1].Value
    }

    return ""
}

function Strip-Html([string]$Html) {
    if ([string]::IsNullOrWhiteSpace($Html)) {
        return ""
    }

    $text = $Html
    $text = [regex]::Replace($text, "<script[\s\S]*?</script>", " ", $regexFlags)
    $text = [regex]::Replace($text, "<style[\s\S]*?</style>", " ", $regexFlags)
    $text = [regex]::Replace($text, "<br\s*/?>", " ", $regexFlags)
    $text = [regex]::Replace($text, "</(p|div|li|tr|td|th|h1|h2|h3|h4|section|article|table|thead|tbody|ul|ol|pre|code)>", " ", $regexFlags)
    $text = [regex]::Replace($text, "<[^>]+>", " ", $regexFlags)
    $text = [System.Net.WebUtility]::HtmlDecode($text)
    $text = [regex]::Replace($text, "\s+", " ")
    return $text.Trim()
}

function Shorten([string]$Text, [int]$MaxLength = 220) {
    if ([string]::IsNullOrWhiteSpace($Text)) {
        return ""
    }

    if ($Text.Length -le $MaxLength) {
        return $Text.Trim()
    }

    return ($Text.Substring(0, $MaxLength).TrimEnd() + "...")
}

$entries = New-Object System.Collections.Generic.List[object]
$htmlFiles = Get-ChildItem $siteRootPath -Filter *.html |
    Where-Object { $_.Name -ne "index.html" } |
    Sort-Object Name

foreach ($file in $htmlFiles) {
    $raw = Get-Content $file.FullName -Raw
    $pageTitle = Strip-Html (Get-MatchValue $raw '<h1 class="page-title">([\s\S]*?)</h1>')
    if (-not $pageTitle) {
        $pageTitle = Strip-Html (Get-MatchValue $raw '<title>([\s\S]*?)</title>')
    }

    $group = Strip-Html (Get-MatchValue $raw '<p class="eyebrow">([\s\S]*?)</p>')
    $lead = Strip-Html (Get-MatchValue $raw '<p class="lead">([\s\S]*?)</p>')
    $article = Get-MatchValue $raw '<article class="article-card">([\s\S]*?)</article>'
    $pageText = Strip-Html $article

    $entries.Add([PSCustomObject]([ordered]@{
        href = $file.Name
        title = $pageTitle
        page = $pageTitle
        group = $group
        kind = "page"
        summary = $lead
        text = $pageText
    }))

    $sectionMatches = [regex]::Matches($raw, '<section id="([^"]+)" class="section">([\s\S]*?)</section>', $regexFlags)
    foreach ($sectionMatch in $sectionMatches) {
        $sectionId = $sectionMatch.Groups[1].Value
        $sectionHtml = $sectionMatch.Groups[2].Value
        $sectionTitle = Strip-Html (Get-MatchValue $sectionHtml '<h2>([\s\S]*?)</h2>')
        if (-not $sectionTitle) {
            continue
        }

        $sectionBody = [regex]::Replace($sectionHtml, '^\s*<h2>[\s\S]*?</h2>', ' ', $regexFlags)
        $sectionText = Strip-Html $sectionBody

        $entries.Add([PSCustomObject]([ordered]@{
            href = "$($file.Name)#$sectionId"
            title = $sectionTitle
            page = $pageTitle
            group = $group
            kind = "section"
            summary = (Shorten $sectionText 220)
            text = $sectionText
        }))
    }
}

$json = $entries | ConvertTo-Json -Depth 6 -Compress
$content = @(
    "window.NAPPGUI_SEARCH_INDEX = $json;"
    ""
) -join "`n"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($outFile, $content, $utf8NoBom)
Write-Output "Generated $outFile with $($entries.Count) entries."
