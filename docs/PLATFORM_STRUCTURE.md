# QuickRent Platform Structure

## Applications

- `apps/api`: NestJS modular monolith with unified request engine, service orchestrator, auth, payments, bookings, profiles, command center APIs, and provider adapters.
- `apps/mobile`: React Native tenant super app for auth, property discovery, booking, services, rewards, insurance, and community.
- `apps/admin-web`: Next.js command center dashboard for global operations, live ticket monitoring, overrides, offers, and analytics.
- `apps/landlord-web`: Next.js landlord portal for inventory, bookings, contracts, payouts, and tenant engagement.
- `apps/provider-web`: Next.js provider panel for assignments, fleet/service dispatch, proofs, and SLA management.

## Shared Packages

- `packages/config`: environment parsing and country-market rules.
- `packages/design-system`: QuickRent premium design tokens and React Native UI primitives.
- `packages/shared-types`: platform-wide domain contracts, enums, DTO-ready interfaces, and geo-aware request models.

## Core Backend Layers

- `modules/auth`: authentication, tokens, OTP, password reset, verification, session lifecycle.
- `modules/users`: users, roles, tenant/landlord/provider profiles.
- `modules/properties`: property catalog, media, search, maps, and favorites.
- `modules/unified-requests`: normalized ticket model used by all service and operational flows.
- `modules/orchestrator`: vendor selection, command center routing, reverse command dispatch, and failover orchestration.
- `modules/viewing`: shortlist, compare, viewing requests, and trip assignments.
- `modules/bookings`: reservation and property lifecycle transitions.
- `modules/payments`: payment orchestration, invoices, payment visibility, and webhooks.
- `modules/services`: free and paid service request orchestration.
- `modules/rewards`: wallet, transactions, offers, and discounts.
- `modules/insurance`: plans, subscriptions, claims.
- `modules/community`: posts, comments, moderation, and reports.
- `modules/notifications`: in-app and external notification routing.
- `modules/command-center`: global monitoring and command APIs.

## Integration Principles

- Every tenant-originated service action is normalized into a unified request.
- Every unified request is routed from Core to both Command Center and Provider.
- Reverse instructions always flow from Command Center to Core before reaching tenant, provider, or external adapter.
- Location, audit, payment, and status tracking are first-class across all modules.