# OmniRent Architecture

## Core Principles
- Core / Orchestrator as single hub
- Request-based system design
- Modular structure (tenant, property, vendor, services)
- Shared models for status and requests
- Config-driven policies
- Adapter-ready integrations for future scaling
- Real-time updates via events (e.g. sockets)
- Command Center connected to core, not isolated

## Ticket Architecture (Phase 1)

- ServiceTicket model introduced as an additive wrapper around ServiceRequest
- No breaking changes to existing request flows, UI, or Brain logic
- ServiceManager supports parallel ticket creation and management
- ServiceTicket contains: unique ticket id, reference to ServiceRequest, status, assignedTo, assignedTeam, assignedAt, createdAt, updatedAt, escalationLevel, escalationReason, previousAssignees, handoff history, audit fields
- All ticket logic is orchestrator-only, no business logic in UI
- Foundation for future ticket-driven distribution, reassignment, escalation, and auditability







### Migration Plan
- Phase 1: Additive ServiceTicket foundation (no breaking changes)
- Phase 2: Ticket-driven Distribution Engine (assignment, escalation, fallback, audit; no UI/Brain changes)
- Phase 3: Ticket-aware Command Center (unified operational view, safe migration) — Completed
- Phase 4: Ticket-driven Command Center actions (assignment MVP complete)
- Phase 5: TicketAction MVP & Action Engine Foundation
- Phase 6: Escalation as TicketAction (no escalation fields on Ticket)
- Phase 7: Reassign as TicketAction (Core-controlled, audit-driven)
- Phase 8: Full UI/Brain integration with ticket-driven orchestration

## Reassign as TicketAction (Core-Controlled)

- Reassign is a distinct TicketAction (actionType: 'reassign'), processed only by the Core
- Only assignment fields (assignedTo, assignedTeam, assignedAt) are updated if changed
- No unrelated fields (priority, status, etc.) are touched
- All context, reason, and audit history are captured in TicketAction
- No UI or direct mutation; no over-engineering

## Escalation as TicketAction (Action-Driven)

- Escalation is represented only as a TicketAction (actionType: 'escalation')
- No escalation-specific fields (level, reason) are added to Ticket model
- Core interprets escalation by updating priority and/or assignment fields only
- All escalation context, reason, and history are stored in TicketAction log
- Model remains clean, extensible, and lifecycle is action-driven

## TicketAction & Action Engine Foundation

- All ticket mutations now go through TicketAction and ServiceManager.handleTicketAction
- TicketAction logs mutation, decision, and state snapshots
- Assignment flow and future actions (escalation, priority change, etc.) are centralized and auditable
- No UI or business logic changes required

## Ticket-driven Command Center Actions

- Assignment action in Command Center now operates on ServiceTicket via Core
- UI prefers ticket-driven actions, with safe fallback for legacy requests
- All business logic remains in Core; UI only triggers actions
- Escalation, resolve, and advanced actions to follow in next steps

## Ticket-aware Command Center (Unified Operational View)

- Main Command Center screens now consume and render UnifiedOperationalItem
- Prefer rendering ServiceTicket when available, fallback to request otherwise
- All operational actions target ticket-driven Core operations where applicable (next step)
- Legacy request-based flows remain supported for non-ticketed cases
- No business logic in UI; all mutations routed through Core
- Migration is gradual, safe, and preserves legacy behavior

## Ticket-aware Command Center (Unified Operational View)

- Command Center screens now consume a unified operational view model
- Prefer rendering ServiceTicket when available, fallback to request otherwise
- All operational actions target ticket-driven Core operations where applicable
- Legacy request-based flows remain supported for non-ticketed cases
- No business logic in UI; all mutations routed through Core
- Migration is gradual, safe, and preserves legacy behavior

## Distribution Engine (Phase 2 MVP)

- Centralized, orchestrator-only component for ticket-driven assignment and distribution
- Accepts ServiceTicket as input, consumes Brain/routing/SLA outputs as needed
- Makes assignment/distribution decisions (assignedTo, assignedTeam, assignedVendor, adapterRoute)
- Supports escalation and fallback hooks
- All actions are logged for audit and traceability
- No business logic in UI; no direct vendor/provider communication outside Core
- Foundation for advanced distribution, escalation, and adapter integration in future phases

## Brain System: Routing Engine (Level 2)

- The Routing Engine is a centralized, read-only module in the Brain system that evaluates each ServiceRequest and recommends routing paths (target team, vendor type, operator level, escalation, and reason).
- Routing recommendations are exposed to the orchestrator and Command Center for operational decision-making, but do not mutate canonical state directly.
- All routing logic is centralized for maintainability, auditability, and future extensibility (e.g., skill matching, load balancing, SLA-based routing, geography-aware routing, multi-country policy routing).
- The orchestrator remains responsible for actual assignment and state mutation, ensuring clean separation of concerns.
- Routing Engine is designed to be config-driven and adapter-ready for future integrations and policy changes.

## Brain System: SLA Engine (Level 3)

- The SLA Engine is a centralized, read-only module in the Brain system that evaluates each ServiceRequest for SLA timing, breach risk, escalation readiness, and urgency upgrades.
- SLA evaluation outputs include SLA target, elapsed time, time remaining, breach risk, breach status, escalation and urgency recommendations, and reason.
- All SLA logic is centralized for maintainability, auditability, and future extensibility (e.g., country/service/vendor-specific SLAs, config files, dynamic tuning).
- The orchestrator remains responsible for actual state mutation and escalation, ensuring clean separation of concerns.
- SLA Engine is designed to be config-driven and adapter-ready for future policy changes and integrations.
