# QuickRent Platform

QuickRent is a production-grade rental and tenant operations platform built as a monorepo. It includes a NestJS backend, a React Native tenant app, and three Next.js operational surfaces for command center, landlord, and provider workflows.

## Platform Apps

- `apps/api`: NestJS modular monolith with auth, profiles, properties, unified requests, orchestrator, bookings, payments, services, rewards, insurance, community, notifications, and command center APIs.
- `apps/mobile`: React Native tenant app for onboarding, property search, shortlist, compare, viewing, booking, payments, rewards, insurance, services, community, and profile flows.
- `apps/admin-web`: command center dashboard for live ticket routing, interventions, assignments, offers, and analytics.
- `apps/landlord-web`: landlord portal for portfolio control, occupancy visibility, revenue tracking, contracts, and action queues.
- `apps/provider-web`: provider operations panel for assignments, SLA execution, status updates, and proof submission.

## Shared Packages

- `packages/config`: environment contracts and market configuration.
- `packages/design-system`: shared premium tokens and reusable UI primitives.
- `packages/shared-types`: cross-platform domain contracts and DTO-aligned types.

## Core Architecture

- Every tenant action is normalized into a unified request.
- Every request is routed from Core to Command Center and the assigned provider.
- Reverse operational instructions always flow from Command Center through Core before reaching tenant, provider, or external adapters.
- Payments, audit, location, and request tracking are first-class concerns across the platform.

## Getting Started

See `docs/RUNBOOK.md` for the full setup sequence. The short version is:

1. Enable pnpm via Corepack.
2. Install workspace dependencies.
3. Configure root and app `.env` files from the provided examples.
4. Generate Prisma client, run migrations, and seed the database.
5. Start the API, mobile app, and desired web surfaces.

## Current State

The repository now contains full platform scaffolding rather than an MVP. If editor diagnostics show missing JSX or Prisma types, install workspace dependencies and run Prisma generation first so TypeScript can resolve the generated/client-provided artifacts.
