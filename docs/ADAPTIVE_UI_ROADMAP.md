# Adaptive UI Roadmap

## Executive Summary

The project already has a strong adaptive-learning core:

- global skill scoring
- level progression (`Beginner`, `Intermediate`, `Advanced`)
- spaced repetition review queues
- stage progression and mastery tests
- a rich learning surface with telemetry, immersive mode, and a study copilot

What was missing was a true adaptive UI orchestration layer. The interface reacted to broad level buckets, but it did not yet continuously tune density, guidance, difficulty targeting, and coaching from live learner signals.

This document defines the roadmap to make the product feel genuinely adaptive, premium, and world-class.

## Current Gap Analysis

### What exists today

- Skill and level adaptation is already computed from recent performance.
- Learn sessions track focus-adjacent telemetry such as hints, retries, errors, and idle behavior.
- The lesson experience already supports multiple exercise formats and immersive presentation.

### What was missing before this phase

- No session-level adaptive mode engine.
- No manual learner override for support vs challenge.
- No adaptive difficulty targeting per session.
- No UI density changes driven by live performance.
- No consistent contract for how coaching, guidance, and layout should react to struggle or momentum.

## Phase 1 Delivered

This phase establishes the adaptive experience foundation in the frontend without breaking the backend API contract.

### Implemented now

- Added a dedicated adaptive session engine in `frontend/src/utils/adaptiveUI.js`.
- Added live mode resolution:
  - `support`
  - `balanced`
  - `challenge`
- Added learner override controls:
  - `Auto`
  - `Support`
  - `Flow`
  - `Challenge`
- Added adaptive lesson difficulty targeting for category sessions.
- Added a new adaptive cockpit to the Learn page showing:
  - current adaptive mode
  - target difficulty
  - support load
  - challenge readiness
  - pacing
  - layout density
  - mode reasons
- Wired the lesson experience so the UI changes by adaptive mode:
  - hints shown by default in support mode
  - step-by-step guidance enabled in support mode
  - more relaxed layout in support mode
  - more compact, sharper CTA in challenge mode
  - exercise surfaces inherit adaptive framing
- Added tests for:
  - adaptive engine decisions
  - adaptive lesson rendering
  - manual support mode affecting lesson difficulty requests

## Product Principles

The adaptive UI should follow these rules:

1. Adapt support before it adapts pressure.
2. Make adaptation legible to the learner, not mysterious.
3. Let the learner override the system at any time.
4. Increase challenge only when confidence and focus are both strong.
5. Reduce cognitive load before reducing ambition.

## Roadmap

## Phase 2: Adaptive Profile Persistence

Goal: move from session-only orchestration to cross-session intelligence.

Deliverables:

- persist adaptive preferences per user
- expose adaptive profile from the backend
- compute adaptive profile from recent attempts, not only live session telemetry
- add category-level support and challenge recommendations
- add dashboard panel for current adaptive profile

## Phase 3: Topic-Level Difficulty Intelligence

Goal: adapt by skill cluster, not just global level.

Deliverables:

- category mastery maps
- weakness pressure per topic
- difficulty recommendations by stage and category
- lesson sequencing based on weakness, confidence, and recency
- adaptive review queue prioritization

## Phase 4: Premium UX Adaptation

Goal: make the interface feel unmistakably high-end and personal.

Deliverables:

- adaptive typography scale
- adaptive motion intensity
- adaptive panel density for mobile vs desktop
- confidence-aware empty states and completion states
- adaptive audio prompts and pronunciation nudges
- high-trust coaching language tuned to struggle vs momentum

### Phase 4 Progress (Current Continuation)

Implemented in this continuation:

- adaptive typography scaling tokens (`comfort`, `balanced`, `compact`) wired into Learn and lesson surfaces
- adaptive motion intensity tokens (`soft`, `balanced`, `crisp`) wired to staggered reveals
- adaptive panel density tokens responsive to viewport (`panelDensityDesktop`, `panelDensityMobile`)
- confidence-aware completion and empty-state coaching copy
- adaptive pronunciation nudges and speech cadence (`speakRate`, `pitch`) by mode
- upgraded high-trust coach language across support/challenge/flow states

## Phase 5: Intelligent Learning Director

Goal: evolve from adaptive UI into adaptive learning direction.

Deliverables:

- next-best-session planning
- confidence bands per stage
- recovery plans after repeated struggle
- streak-aware workload planning
- mastery-readiness forecasting
- personalized learning arcs for fluency outcomes

### Phase 5 Progress (Current Continuation)

Implemented in this continuation:

- added backend learning-director engine (`backend/utils/learningDirector.js`)
- exposed `GET /api/auth/learning-director` with:
  - next-best-session planning
  - confidence bands per stage
  - recovery planning after repeated struggle
  - streak-aware workload planning
  - mastery-readiness forecasting
  - personalized learning arc narrative
- wired Dashboard to consume and render Phase 5 director signals and actionable session links
- added Learn deep-link support for `?category=` so director plans can launch targeted category sessions
- added backend and frontend tests for the new planning/forecasting contract and UI behavior

## Architecture Direction

The long-term architecture should be:

1. `attempts` and telemetry produce raw learning signals.
2. a backend adaptive-profile engine turns those signals into a durable learner model.
3. the frontend adaptive-session engine combines that durable model with live session behavior.
4. pages and components consume a single adaptive contract instead of duplicating rules.

## Recommended Next Build Order

1. Backend adaptive profile contract
2. Dashboard adaptive profile visibility
3. Topic-level mastery model
4. Adaptive sequencing engine
5. Premium motion and density polish

## Success Criteria

We should consider the adaptive UI initiative successful when:

- learners can clearly feel the interface responding to their needs
- support mode reduces hint and error pressure
- challenge mode increases accuracy retention without frustration
- difficulty changes are explainable and reversible
- the product looks deliberate, premium, and unmistakably adaptive

## Implementation Audit Snapshot (April 26, 2026)

- Phase 1: Implemented
  - adaptive session mode engine, manual mode override, adaptive lesson targeting, cockpit metrics, mode-aware lesson rendering, and tests are present in frontend.
- Phase 2: Implemented
  - adaptive preferences/profile persistence, backend adaptive profile contract, category recommendations, and dashboard visibility are present.
- Phase 3: Implemented
  - topic mastery mapping, stage-topic recommendations, sequencing plan, and adaptive review queue prioritization are integrated.
- Phase 4: Implemented
  - adaptive typography, motion intensity, panel density, confidence-aware copy, and pronunciation nudges are wired in Learn/lesson surfaces.
- Phase 5: Implemented
  - learning director contract, next-best-session planning, stage confidence bands, recovery plans, streak-aware workload planning, mastery forecasting, and learning arc guidance are exposed and shown on dashboard.

### Global Learner Assist Toggle (April 26, 2026)

- Added an always-available corner Learner Assist dock for authenticated learners.
- Dock includes:
  - Assistant chat replies with contextual next-step actions (review, learn, dashboard, leaderboard, command center)
  - Help panel with adaptive learning guidance and shortcut references
  - Quick actions for navigation and theme switching
- Dock is mounted at app-shell level so it is accessible across all learner routes.
- Accessibility polish included:
  - dialog semantics (`role="dialog"`)
  - expanded/collapsed state on toggle button
  - keyboard close via `Esc`
  - global toggle shortcut via `Ctrl/Cmd + Shift + H`
