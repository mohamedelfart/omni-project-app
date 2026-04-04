Write-Host "Starting QuickRent local infra..."
docker compose up -d

Write-Host "Run the following after installing pnpm and Node 22+:"
Write-Host "pnpm install"
Write-Host "pnpm --filter @quickrent/api prisma:generate"
Write-Host "pnpm --filter @quickrent/api prisma:migrate"
Write-Host "pnpm --filter @quickrent/api prisma:seed"
