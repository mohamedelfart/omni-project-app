# OmniRent Search - Sprint Ready Developer Handoff (Jira Template)

## Scope
- Product: OmniRent
- Surface: Property Search (Web + Mobile)
- Delivery Mode: Lean MVP
- Core Constraints:
- First meaningful result <= 3 seconds.
- Filter response <= 300ms (95th percentile) with local frontend filtering.
- Full bilingual parity (Arabic/English) with correct RTL/LTR behavior.

## Epic
- Epic Key: OR-SEARCH-EPIC
- Epic Name: OmniRent Search Experience (Global + Automated + Scalable)
- Epic Goal: Deliver production-grade property search with fast local filtering, clear recommendation cues, and bilingual native-feel UX.

## Global Definition of Done (applies to all stories)
- Performance:
- Measured first meaningful result <= 3s on target test device/profile.
- Measured filter apply/update <= 300ms (95th percentile).
- Localization:
- No hardcoded UI labels outside i18n dictionaries.
- Full RTL/LTR parity with no clipping, overlap, or broken alignment.
- UX:
- User gets immediate UI feedback for critical actions (filter, save, compare) without leaving screen.
- Engineering:
- Type-safe props/states.
- No lint/compile errors.
- QA sign-off on Mobile and Web.

---

## P0 - Must Have

### Story OR-SEARCH-001
- Priority: P0
- Title: Build SearchScreenShell with cached initial dataset
- Description: Create shell that loads cached data first and renders meaningful results quickly.
- Tasks:
- Implement local in-memory cache bootstrap.
- Implement screen state machine: loading, ready, empty, error.
- Add skeleton loading and fade-out.
- Acceptance Criteria:
- User sees first meaningful result <= 3s.
- Skeleton fade-out runs smoothly (180ms target).
- DoD (story-specific):
- Timed test evidence attached in Jira.

### Story OR-SEARCH-002
- Priority: P0
- Title: Implement frontend filtering pipeline
- Description: Query, chips, and sort must execute locally without per-change server calls.
- Tasks:
- Build memoized selector pipeline.
- Apply filter order: query -> hard filters -> availability/furnished -> sort.
- Ensure stable derived results and recommendation label mapping.
- Acceptance Criteria:
- Filter updates <= 300ms (95th percentile).
- No network call on each filter toggle.
- DoD (story-specific):
- Instrumented timing logs/screenshots attached.

### Story OR-SEARCH-003
- Priority: P0
- Title: Add SmartSearchBar with debounce typing
- Description: Debounced input to reduce recompute jitter while preserving instant feel.
- Tasks:
- Add 120-180ms debounce.
- Add clear action and focused state styling.
- Acceptance Criteria:
- No typing lag under normal dataset size.
- Query updates do not freeze UI.
- DoD (story-specific):
- QA confirms smooth typing on low-end profile.

### Story OR-SEARCH-004
- Priority: P0
- Title: Build results list and property card actions
- Description: Implement card list with details, save, compare entry points.
- Tasks:
- Use virtualization for list performance.
- Add card states: default, active, loading.
- Add callbacks: onOpenDetails, onToggleSave, onToggleCompare.
- Acceptance Criteria:
- List remains smooth up to 300-500 items.
- Card actions respond instantly.
- DoD (story-specific):
- Performance capture with long list attached.

### Story OR-SEARCH-005
- Priority: P0
- Title: Guest gating via Login Modal (no full-page redirect)
- Description: Guests can browse, but gated actions open lightweight modal.
- Tasks:
- Wire gating to save/compare.
- Resume intended action after successful login when safe.
- Acceptance Criteria:
- Guest browse remains open.
- Save/compare triggers modal, not full navigation.
- DoD (story-specific):
- Flow tested for guest and authenticated users.

### Story OR-SEARCH-006
- Priority: P0
- Title: Implement bilingual i18n + RTL/LTR parity
- Description: Ensure native Arabic and English experiences.
- Tasks:
- Move all labels to i18n dictionaries.
- Apply direction-aware layout logic.
- Verify icon/text alignment in both directions.
- Acceptance Criteria:
- Locale switch preserves filters/query/results/scroll.
- No visual regressions between LTR and RTL.
- DoD (story-specific):
- Screenshot set for ar/en and rtl/ltr attached.

### Story OR-SEARCH-007
- Priority: P0
- Title: Base states and resilience (loading, empty, error)
- Description: Render robust fallback states with clear actions.
- Tasks:
- Add empty state with reset filters CTA.
- Add error state with retry.
- Add loading skeleton placeholders.
- Acceptance Criteria:
- Each state is reachable and validated.
- Clear CTA exists for each non-ready state.
- DoD (story-specific):
- QA checklist completed for all states.

---

## P1 - Should Have

### Story OR-SEARCH-101
- Priority: P1
- Title: Recommendation badges (rules-based MVP)
- Description: Show one clear recommendation cue per card.
- Tasks:
- Define rules for Best Value, Family Fit, Fast Move-In, Near Business District.
- Localize badge labels.
- Acceptance Criteria:
- Badge appears predictably and is readable in both locales.
- DoD (story-specific):
- Rules doc linked in story.

### Story OR-SEARCH-102
- Priority: P1
- Title: Saved/Compare tray
- Description: Contextual bottom tray for saved and compare actions.
- Tasks:
- Show only when savedCount > 0.
- Enable compare when compareCount >= 2.
- Acceptance Criteria:
- Tray visibility logic is correct.
- Compare CTA disabled/enabled states are clear.
- DoD (story-specific):
- State matrix tested and attached.

### Story OR-SEARCH-103
- Priority: P1
- Title: Filter bottom sheet (mobile) and filter panel (web)
- Description: Advanced filter UX with quick apply/reset.
- Tasks:
- Build grouped controls.
- Add apply/reset interaction.
- Keep transitions 180-220ms.
- Acceptance Criteria:
- Apply updates results without full reload.
- Reset returns defaults instantly.
- DoD (story-specific):
- Timing and interaction QA approved.

### Story OR-SEARCH-104
- Priority: P1
- Title: Results toolbar enhancements
- Description: Count, sort, and list/map toggles with state persistence.
- Tasks:
- Add sort control options.
- Add list/map toggle state handling.
- Preserve current filters and context.
- Acceptance Criteria:
- Toggling view mode does not reset filters.
- Count updates accurately after every filter.
- DoD (story-specific):
- Regression test cases passed.

### Story OR-SEARCH-105
- Priority: P1
- Title: Micro-interactions and confirmations
- Description: Add subtle feedback for filter, save, and compare actions.
- Tasks:
- Implement chip active transitions.
- Implement save confirmation toast.
- Implement button press and state transitions.
- Acceptance Criteria:
- User receives immediate confirmation without page change.
- Motion timing stays within approved token range.
- DoD (story-specific):
- UX sign-off on interaction feel.

---

## P2 - Nice to Have

### Story OR-SEARCH-201
- Priority: P2
- Title: Full map mode synchronization
- Description: Keep map and list in sync with same filtered dataset.
- Acceptance Criteria:
- Selecting from map highlights corresponding card and vice versa.

### Story OR-SEARCH-202
- Priority: P2
- Title: Smart suggestions side panel (web)
- Description: Dynamic suggestion cards based on user context and filters.
- Acceptance Criteria:
- Suggestions update with filter/query context.

### Story OR-SEARCH-203
- Priority: P2
- Title: Accessibility hardening
- Description: Improve keyboard, screen reader, and touch target quality.
- Acceptance Criteria:
- Touch targets >= 44.
- Contrast meets AA for critical text/actions.

### Story OR-SEARCH-204
- Priority: P2
- Title: Analytics dashboards and funnel quality
- Description: Add reporting for search funnel and conversion points.
- Acceptance Criteria:
- Events stream correctly and are queryable by locale/platform.

---

## Required Tracking Events
- search_opened
- search_query_changed
- filter_chip_toggled
- filter_applied
- filter_reset
- property_card_opened
- property_saved_toggled
- compare_toggled
- login_modal_opened_from_gate
- locale_switched

## QA Test Matrix (Minimum)
- Platforms:
- Mobile: iOS + Android (or representative simulators)
- Web: Chrome latest + one secondary browser
- Locales:
- English (LTR)
- Arabic (RTL)
- Auth Modes:
- Guest
- Authenticated
- Data States:
- loading
- ready
- empty
- error

## Release Exit Criteria
- All P0 stories Done.
- No open critical defects in search flow.
- Performance and localization evidence attached.
- Product + UX + QA sign-off completed.
