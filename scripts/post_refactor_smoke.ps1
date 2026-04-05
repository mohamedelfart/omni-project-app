$ErrorActionPreference = "Stop"
$base = "http://localhost:4000/api/v1"

function U($r) {
  if ($null -ne $r -and $r.PSObject.Properties.Name -contains "data") { return $r.data }
  return $r
}

function Login([string]$e, [string]$p) {
  $body = @{ email = $e; password = $p } | ConvertTo-Json
  $res = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 20
  return (U $res).accessToken
}

$tenant = Login "tenant@quickrent.com" "Tenant@1234"
$provider = Login "dispatch@quickrent-move.com" "Provider@1234"
$admin = Login "ops@quickrent.com" "Admin@1234"

$th = @{ Authorization = "Bearer $tenant" }
$ph = @{ Authorization = "Bearer $provider" }
$ah = @{ Authorization = "Bearer $admin" }

$viewBody = @{
  preferredDateISO = (Get-Date).AddDays(1).ToString("o")
  pickupLat = 25.2854
  pickupLng = 51.531
  notes = "orchestrator-purity-check"
} | ConvertTo-Json

$view = U (Invoke-RestMethod -Uri "$base/viewing/requests" -Method Post -Headers $th -ContentType "application/json" -Body $viewBody -TimeoutSec 20)
$vu = $view.unifiedRequest.id

foreach ($s in @("accepted", "on the way", "arrived", "completed")) {
  $statusBody = @{ status = $s } | ConvertTo-Json
  $null = U (Invoke-RestMethod -Uri "$base/vendor/tickets/$vu/status" -Method Patch -Headers $ph -ContentType "application/json" -Body $statusBody -TimeoutSec 20)
}

$viewFinal = U (Invoke-RestMethod -Uri "$base/viewing/requests/$($view.id)" -Method Get -Headers $th -TimeoutSec 20)

$moveBody = @{
  moveDate = (Get-Date).AddDays(2).ToString("o")
  pickupAddress = "Doha"
  dropoffAddress = "Lusail"
  estimatedCostMinor = 53000
} | ConvertTo-Json

$move = U (Invoke-RestMethod -Uri "$base/services/move-in" -Method Post -Headers $th -ContentType "application/json" -Body $moveBody -TimeoutSec 20)
$mu = $move.unifiedRequestId

foreach ($s in @("accepted", "on the way", "arrived", "completed")) {
  try {
    $statusBody = @{ status = $s } | ConvertTo-Json
    $null = U (Invoke-RestMethod -Uri "$base/vendor/tickets/$mu/status" -Method Patch -Headers $ph -ContentType "application/json" -Body $statusBody -TimeoutSec 20)
  } catch {}
}

$mine = U (Invoke-RestMethod -Uri "$base/unified-requests/me" -Method Get -Headers $th -TimeoutSec 20)
$moveReq = @($mine | Where-Object { $_.id -eq $mu } | Select-Object -First 1)
$awaitingEvent = [bool](@($moveReq.trackingEvents | Where-Object { $_.title -eq "Awaiting tenant payment" }).Count -gt 0)

$ops = U (Invoke-RestMethod -Uri "$base/command-center/operations?serviceType=move-in" -Method Get -Headers $ah -TimeoutSec 20)
$analysis = U (Invoke-RestMethod -Uri "$base/command-center/analysis" -Method Get -Headers $ah -TimeoutSec 20)
$reports = U (Invoke-RestMethod -Uri "$base/command-center/reports" -Method Get -Headers $ah -TimeoutSec 20)

[pscustomobject]@{
  viewingFinalStatus = $viewFinal.unifiedRequest.status
  moveStatus = $moveReq.status
  awaitingPaymentEventPresent = $awaitingEvent
  operationsVisible = [bool]$ops.policyContext
  analysisSignals = [bool]$analysis.recommendationSignals
  reportsAiReadiness = [bool]$reports.aiReadiness
  lifecycleNotBroken = [bool]($viewFinal.unifiedRequest.status -eq "COMPLETED")
} | ConvertTo-Json -Depth 6
