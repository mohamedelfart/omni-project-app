# Notifications Architecture

## Goals

- Deliver reliable push, SMS, and email notifications.
- Support market-specific providers and routing.
- Keep a complete delivery and retry audit trail.

## Core Concepts

- Notification intent event emitted by domain modules.
- Policy engine decides channel, priority, and locale.
- Provider abstraction layer dispatches by market.
- Delivery outcome persisted to NotificationLog.

## Future-ready Enhancements

- Queue workers for retries and rate limiting.
- User-level communication preferences.
- Template localization with fallback strategy.
- A/B notification experiments and analytics hooks.
