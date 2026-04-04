# QuickRent Runbook

## 1) Install toolchain

- Node.js 22+
- pnpm 9+
- PostgreSQL 15+
- Expo / React Native tooling if you want to run the mobile app locally

### Windows note

If `pnpm` is not available, enable it through Corepack:

```powershell
corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm -v
```

## 2) Install dependencies

```powershell
pnpm install
```

This step is required before TypeScript can resolve React JSX types in the web apps.

## 3) Configure env

Copy .env.example values into local shell or .env files per app.

## 4) Database

```powershell
pnpm --filter @quickrent/api prisma:generate
pnpm --filter @quickrent/api prisma:migrate
pnpm --filter @quickrent/api prisma:seed
```

`prisma:generate` is required before NestJS services can resolve Prisma model delegates such as `prisma.user` and `prisma.role`.

## 5) Start apps

```powershell
pnpm --filter @quickrent/api dev
pnpm --filter @quickrent/mobile dev
pnpm --filter @quickrent/admin-web dev
pnpm --filter @quickrent/landlord-web dev
pnpm --filter @quickrent/provider-web dev
```

## 6) Quality gates

```powershell
pnpm lint
pnpm typecheck
pnpm test
```

## 7) Platform structure

- API: auth, users, properties, unified requests, orchestrator, viewing, booking, payments, services, rewards, insurance, community, notifications, command center.
- Mobile: tenant auth, discovery, booking, finance, services, profile, and community flows.
- Web: command center, landlord portal, and provider panel.
- Shared packages: config, design system, shared types.

FULL PLATFORM STRUCTURE COMPLETE
