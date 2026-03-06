$token = $args[0]
$themeId = 195551363404
$baseUrl = "https://optiauto.myshopify.com/admin/api/2024-01/themes/$themeId/assets.json"
$headers = @{ "X-Shopify-Access-Token" = $token; "Content-Type" = "application/json" }
$root = "c:\OptiAutoMarket"

$files = @(
    "assets/theme.css",
    "assets/theme.js",
    "snippets/filters-data.liquid",
    "snippets/vehicle-card.liquid",
    "templates/collection.cars.liquid"
)

foreach ($f in $files) {
    $path = Join-Path $root ($f -replace '/', '\')
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    $body = @{ asset = @{ key = $f; value = $content } } | ConvertTo-Json -Depth 3 -Compress
    try {
        Invoke-RestMethod -Method Put -Uri $baseUrl -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 30
        Write-Host "[OK] $f"
    } catch {
        Write-Host "[FAIL] $f - $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds 400
}
Write-Host "`nDeploy done!"
