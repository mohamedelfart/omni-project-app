# QuickRent Enterprise Platform

This repository now contains an enterprise-grade monorepo foundation for QuickRent:

- Mobile super app (React Native + Expo + TypeScript)
- Backend API (NestJS + Prisma + PostgreSQL)
- Admin dashboard (Next.js)
- Landlord portal (Next.js)
- Provider panel (Next.js)
- Shared types, global market rules, and design tokens

## Product Modules Included

- Auth system with email/password + phone OTP + refresh flow contracts
- Property discovery
- Viewing requests
- Booking lifecycle
- Payments
- Tenant services
- Insurance
- Rewards
- Community
- Notifications

## Enterprise Readiness Built In

- Role-aware architecture (tenant, landlord, admin, provider)
- Multi-country and multi-currency data model
- i18n and RTL baseline in mobile app
- Integration abstractions (payment, storage, notifications)
- Swagger setup for API documentation
- Audit log data model

## Next Implementation Phases

1. Complete each module's production business logic and repository layer.
2. Add comprehensive integration/unit tests and CI pipeline.
3. Add queue workers and idempotency strategy.
4. Integrate real payment, SMS, and map providers per market.
5. Build analytics events taxonomy and data warehouse feeds.
