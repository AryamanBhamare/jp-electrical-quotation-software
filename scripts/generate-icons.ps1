# Generates PWA icons (icon-192.png, icon-512.png) into public/icons/.
# Pure PowerShell + System.Drawing — no external tools needed.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\public\icons'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

function New-Icon {
  param([int]$Size, [string]$Path)
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
  $lg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 14, 165, 233),
    [System.Drawing.Color]::FromArgb(255, 37, 99, 235),
    45
  )
  $g.FillRectangle($lg, $rect)

  # Bolt polygon (lightning) centered in the icon
  $f = [double]$Size / 64.0
  $p1 = New-Object System.Drawing.PointF ([double](36 * $f), [double](10 * $f))
  $p2 = New-Object System.Drawing.PointF ([double](18 * $f), [double](36 * $f))
  $p3 = New-Object System.Drawing.PointF ([double](28 * $f), [double](36 * $f))
  $p4 = New-Object System.Drawing.PointF ([double](24 * $f), [double](54 * $f))
  $p5 = New-Object System.Drawing.PointF ([double](44 * $f), [double](26 * $f))
  $p6 = New-Object System.Drawing.PointF ([double](34 * $f), [double](26 * $f))
  $pts = [System.Drawing.PointF[]]@($p1, $p2, $p3, $p4, $p5, $p6)
  $white = [System.Drawing.Brushes]::White
  $g.FillPolygon($white, $pts)

  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Generated $Path"
}

New-Icon -Size 512 -Path (Join-Path $outDir 'icon-512.png')
New-Icon -Size 192 -Path (Join-Path $outDir 'icon-192.png')
