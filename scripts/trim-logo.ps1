Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::new('c:\OptiAutoMarket\assets\logo.png')
Write-Host ("Size: " + $img.Width + "x" + $img.Height)
$minX = $img.Width; $minY = $img.Height; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $img.Height; $y++) {
  for ($x = 0; $x -lt $img.Width; $x++) {
    $p = $img.GetPixel($x, $y)
    if ($p.A -gt 20 -and ($p.R -lt 245 -or $p.G -lt 245 -or $p.B -lt 245)) {
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
Write-Host ("Bounds: $minX,$minY -> $maxX,$maxY")
$pad = 4
$minX = [Math]::Max(0, $minX - $pad)
$minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($img.Width - 1, $maxX + $pad)
$maxY = [Math]::Min($img.Height - 1, $maxY + $pad)
$w = $maxX - $minX + 1; $h = $maxY - $minY + 1
$cropped = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($cropped)
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0,0,$w,$h)), (New-Object System.Drawing.Rectangle($minX,$minY,$w,$h)), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$img.Dispose()
$cropped.Save('c:\OptiAutoMarket\assets\logo_trimmed.png', [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host ("Cropped to: ${w}x${h}")
$cropped.Dispose()
Copy-Item 'c:\OptiAutoMarket\assets\logo_trimmed.png' 'c:\OptiAutoMarket\assets\logo.png' -Force
Remove-Item 'c:\OptiAutoMarket\assets\logo_trimmed.png' -ErrorAction SilentlyContinue
Write-Host "Done - logo.png updated"
