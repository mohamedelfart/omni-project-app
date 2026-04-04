# QuickRent Platform Architecture

## Monorepo Layout

- apps/api: NestJS backend API
- apps/mobile: React Native (Expo) tenant mobile app
- apps/admin-web: Next.js admin SaaS dashboard
- apps/landlord-web: Next.js landlord portal
- packages/shared-types: Cross-app domain contracts
- packages/config: Environment + market rules
- packages/design-system: Shared design tokens

## Core Product Domains

- Auth and Identity
- Property Discovery
- Viewing Dispatch
- Booking and Contract Lifecycle
- Payments and Invoicing
- Tenant Services Marketplace
- Insurance Protection
- Rewards and Loyalty
- Community Feed and Moderation
- Notifications and Messaging

## Scalability Strategy

- API-first modular monolith with service boundaries and integration interfaces.
- Prisma data model aligned with multi-country and multi-currency requirements.
- Shared contracts to keep type consistency between app surfaces.
- Abstractions for payment, storage, notification, and partner integrations.
- Ready for future extraction to microservices by bounded contexts.

## Security and Governance

- JWT auth with refresh token flow.
- Role guards for tenant, landlord, provider, and admin.
- DTO validation through global ValidationPipe.
- Audit log model for governance-grade actions.

## Globalization Foundations

- Country and city entities in the data model.
- Market-level rule abstraction in packages/config.
- Arabic and English localization baseline.
- RTL support enabled on mobile.
- Currency and locale fields persisted at user and transaction levels.
