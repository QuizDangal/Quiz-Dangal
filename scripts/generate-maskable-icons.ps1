param(
  [Parameter(Mandatory=$true)]
  [string]$InputPng,

  [Parameter(Mandatory=$true)]
  [string]$Out512,

  [Parameter(Mandatory=$true)]
  [string]$Out192,

  [ValidateRange(0.1, 1.0)]
  [double]$Scale = 0.78,

  [string]$Background = "#FFFFFF"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-MaskableIcon {
  param(
    [System.Drawing.Image]$Src,
    [int]$Size,
    [string]$OutPath,
    [double]$Scale,
    [System.Drawing.Color]$Bg
  )

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $bmp.SetResolution(96, 96) | Out-Null

  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $g.Clear($Bg)

  $target = [Math]::Floor($Size * $Scale)
  if ($target -lt 1) { $target = 1 }

  $x = [Math]::Floor(($Size - $target) / 2)
  $y = [Math]::Floor(($Size - $target) / 2)

  $rect = New-Object System.Drawing.Rectangle $x, $y, $target, $target
  $g.DrawImage($Src, $rect) | Out-Null

  $g.Dispose()

  # Use PNG encoder
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$bg = [System.Drawing.ColorTranslator]::FromHtml($Background)

$src = [System.Drawing.Image]::FromFile((Resolve-Path $InputPng))
try {
  New-MaskableIcon -Src $src -Size 512 -OutPath $Out512 -Scale $Scale -Bg $bg
  New-MaskableIcon -Src $src -Size 192 -OutPath $Out192 -Scale $Scale -Bg $bg
} finally {
  $src.Dispose()
}

Write-Host "Generated: $Out512 and $Out192 (bg=$Background, scale=$Scale)"