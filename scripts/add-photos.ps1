$token = $args[0]
$headers = @{ "X-Shopify-Access-Token" = $token; "Content-Type" = "application/json" }
$baseUrl = "https://optiauto.myshopify.com/admin/api/2024-01"

$carPhotos = @{
    "15613700833612" = @("https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800","https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800","https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800","https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800")
    "15613700669772" = @("https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800","https://images.unsplash.com/photo-1520050206274-a1ae44613e6d?w=800","https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=800","https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800")
    "15613701062988" = @("https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=800","https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800","https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800","https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800")
    "15613701194060" = @("https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800","https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800","https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800","https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800")
    "15613701226828" = @("https://images.unsplash.com/photo-1595787142268-0927baa20a2a?w=800","https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800","https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800","https://images.unsplash.com/photo-1542362567-b07e54358753?w=800")
    "15613701325132" = @("https://images.unsplash.com/photo-1551830820-330a71b99659?w=800","https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800","https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800","https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800")
    "15613701390668" = @("https://images.unsplash.com/photo-1619767886558-efdc259b6e09?w=800","https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800","https://images.unsplash.com/photo-1493238792000-8113da705763?w=800","https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800")
    "15613701521740" = @("https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800","https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800","https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800","https://images.unsplash.com/photo-1486496146582-9a0914b3896a?w=800")
    "15613700768076" = @("https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800","https://images.unsplash.com/photo-1563720223185-11003d516935?w=800","https://images.unsplash.com/photo-1609520505218-7421df70f1e3?w=800","https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=800")
    "15613700342092" = @("https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=800","https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800","https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=800","https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800")
    "15613700473164" = @("https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800","https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800","https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800","https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800")
    "15613701620044" = @("https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800","https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800","https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800","https://images.unsplash.com/photo-1542362567-b07e54358753?w=800")
    "15613700997452" = @("https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800","https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800","https://images.unsplash.com/photo-1571987502227-9231b837d92a?w=800","https://images.unsplash.com/photo-1554744512-d6c603f27c54?w=800")
    "15613700931916" = @("https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800","https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800","https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800","https://images.unsplash.com/photo-1486496146582-9a0914b3896a?w=800")
    "15613700571468" = @("https://images.unsplash.com/photo-1619767886558-efdc259b6e09?w=800","https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800","https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800","https://images.unsplash.com/photo-1493238792000-8113da705763?w=800")
    "15613701718348" = @("https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800","https://images.unsplash.com/photo-1563720223185-11003d516935?w=800","https://images.unsplash.com/photo-1609520505218-7421df70f1e3?w=800","https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800")
}

foreach ($productId in $carPhotos.Keys) {
    $urls = $carPhotos[$productId]
    foreach ($url in $urls) {
        $body = @{ image = @{ src = $url } } | ConvertTo-Json -Depth 3 -Compress
        try {
            Invoke-RestMethod -Method Post -Uri "$baseUrl/products/$productId/images.json" -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 30 | Out-Null
            Write-Host "[OK] $productId +photo"
        } catch {
            Write-Host "[FAIL] $productId - $($_.Exception.Message)"
        }
        Start-Sleep -Milliseconds 600
    }
}
Write-Host "`nPhotos ajoutees!"
