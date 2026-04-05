$base='http://localhost:4000/api/v1'

function Login([string]$Email,[string]$Password){
  $body=@{ email=$Email; password=$Password } | ConvertTo-Json
  $resp=Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 20
  if($resp.data){return $resp.data.accessToken}else{return $resp.accessToken}
}

function Unwrap($resp){
  if($resp.data){return $resp.data}else{return $resp}
}

# STEP A: Tenant creates viewing request
"=== STEP A: Tenant creates viewing request ==="
$tenantToken=Login 'tenant@quickrent.com' 'Tenant@1234'
$tenantHeaders=@{ Authorization="Bearer $tenantToken" }
$ts=(Get-Date -Format 'yyyyMMddHHmmss')
$createBody=@{ preferredDateISO=(Get-Date).AddDays(1).ToString('o'); pickupLat=25.2854; pickupLng=51.531; notes="e2e-fix-$ts" } | ConvertTo-Json
$viewing=Unwrap (Invoke-RestMethod -Uri "$base/viewing/requests" -Method Post -ContentType 'application/json' -Body $createBody -Headers $tenantHeaders -TimeoutSec 20)
$unifiedId=$viewing.unifiedRequest.id
$viewingId=$viewing.id
"PASSED: Viewing request created - ViewingID=$viewingId, UnifiedID=$unifiedId"
""

# STEP B: Command-center sees ticket
"=== STEP B: Command-Center sees ticket ==="
$adminTickets=Invoke-RestMethod -Uri 'http://localhost:3001/api/requests?serviceType=viewing-transport' -Method Get -TimeoutSec 20
$adminTicket=@($adminTickets | Where-Object { $_.id -eq $unifiedId }) | Select-Object -First 1
if($adminTicket){
  "PASSED: Admin sees unified request with status=$($adminTicket.status)"
} else {
  "FAILED: Admin did not see ticket"
  exit 1
}
""

# STEP C: Vendor receives ticket
"=== STEP C: Vendor receives ticket ==="
$providerTickets=Invoke-RestMethod -Uri 'http://localhost:3003/api/tickets' -Method Get -TimeoutSec 20
$providerTicket=@($providerTickets | Where-Object { $_.ticketId -eq $unifiedId }) | Select-Object -First 1
if($providerTicket){
  "PASSED: Vendor received ticket with status=$($providerTicket.status)"
} else {
  "FAILED: Vendor did not receive ticket"
  exit 1
}
""

# STEP D: Vendor updates status through all transitions
"=== STEP D: Vendor updates status ==="
$statuses=@('accepted', 'on the way', 'arrived', 'completed')
$passCount=0
$failCount=0

foreach($status in $statuses){
  $statusBody=@{ status=$status } | ConvertTo-Json
  try {
    $result=Invoke-RestMethod -Uri "http://localhost:3003/api/tickets/$unifiedId/status" -Method Patch -ContentType 'application/json' -Body $statusBody -TimeoutSec 20
    $resultStatus=if($result.status){$result.status}else{$result.data.status}
    "  PASSED: Status '$status' returned HTTP 200 with result status=$resultStatus"
    $passCount++
  } catch {
    $errorCode=$_.Exception.Response.StatusCode
    "  FAILED: Status '$status' returned HTTP $errorCode"
    $failCount++
  }
}
"Summary: $passCount passed, $failCount failed"
""

# STEP E: Tenant re-reads backend to verify final status
"=== STEP E: Tenant re-reads backend ==="
Start-Sleep -Milliseconds 1000
$finalTenant=Unwrap (Invoke-RestMethod -Uri "$base/viewing/requests?userId=$($viewing.tenantId)" -Method Get -Headers $tenantHeaders -TimeoutSec 20)
$finalUnified=@($finalTenant | Where-Object { $_.unifiedRequest.id -eq $unifiedId }) | Select-Object -First 1
if($finalUnified){
  $finalStatus=$finalUnified.unifiedRequest.status
  "PASSED: Tenant re-read backend, final status=$finalStatus"
  if($finalStatus -eq 'COMPLETED'){
    "PASSED: Final status is COMPLETED"
  } else {
    "WARNING: Final status is not COMPLETED (got $finalStatus)"
  }
} else {
  "FAILED: Tenant could not retrieve updated request"
  exit 1
}
""

# Final verification across all three surfaces
"=== FINAL VERIFICATION ==="
$admin=Unwrap (Invoke-RestMethod -Uri 'http://localhost:3001/api/requests?serviceType=viewing-transport' -Method Get -TimeoutSec 20)
$adminFinal=@($admin | Where-Object { $_.id -eq $unifiedId }) | Select-Object -First 1
$vendor=Invoke-RestMethod -Uri 'http://localhost:3003/api/tickets' -Method Get -TimeoutSec 20
$vendorFinal=@($vendor | Where-Object { $_.ticketId -eq $unifiedId }) | Select-Object -First 1

"Admin surface final status: $($adminFinal.status)"
"Vendor surface final status: $($vendorFinal.status)"
""

if($passCount -eq 4 -and $finalStatus -eq 'COMPLETED' -and $adminFinal.status -eq 'COMPLETED' -and $vendorFinal.status -eq 'COMPLETED'){
  Write-Host "VIEWING FLOW RUNTIME FULLY VERIFIED" -ForegroundColor Green
} else {
  Write-Host "VERIFICATION INCOMPLETE" -ForegroundColor Yellow
}
