$token = $args[0]
$themeId = 195551363404
$baseUrl = "https://optiauto.myshopify.com/admin/api/2024-01/themes/$themeId/assets.json"
$headers = @{ "X-Shopify-Access-Token" = $token; "Content-Type" = "application/json" }

$textFiles = @(
    "assets/theme.css",
    "assets/theme.js",
    "config/settings_schema.json",
    "layout/theme.liquid",
    "locales/fr.default.json",
    "sections/features.liquid",
    "sections/footer.liquid",
    "sections/header.liquid",
    "sections/hero.liquid",
    "sections/stats.liquid",
    "sections/testimonials.liquid",
    "sections/vehicle-grid.liquid",
    "snippets/vehicle-card.liquid",
    "snippets/filters-data.liquid",
    "templates/collection.cars.liquid",
    "templates/index.json",
    "templates/product.liquid"
)

$root = "c:\OptiAutoMarket"

foreach ($f in $textFiles) {
    $path = Join-Path $root ($f -replace '/', '\')
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    $body = @{ asset = @{ key = $f; value = $content } } | ConvertTo-Json -Depth 3 -Compress
    try {
        $r = Invoke-RestMethod -Method Put -Uri $baseUrl -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 30
        Write-Host "[OK] $f"
    } catch {
        Write-Host "[FAIL] $f - $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds 500
}

$logoPath = Join-Path $root "assets\logo.png"
$logoBytes = [System.IO.File]::ReadAllBytes($logoPath)
$logoB64 = [Convert]::ToBase64String($logoBytes)
$body = @{ asset = @{ key = "assets/logo.png"; attachment = $logoB64 } } | ConvertTo-Json -Depth 3 -Compress
try {
    Invoke-RestMethod -Method Put -Uri $baseUrl -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 60
    Write-Host "[OK] assets/logo.png"
} catch {
    Write-Host "[FAIL] assets/logo.png - $($_.Exception.Message)"
}

Write-Host "`nDeploy termine!"
