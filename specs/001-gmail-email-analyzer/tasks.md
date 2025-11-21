---

description: "Task list for TrustEmail: Gmail Email Analyzer feature implementation"
---

# Tasks: TrustEmail: Gmail Email Analyzer

**Input**: Design documents from `/specs/001-gmail-email-analyzer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The feature specification does not explicitly request test tasks, but the plan.md indicates that unit and integration tests will be included. Therefore, test tasks are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per implementation plan
- [X] T002 Initialize Vite project with TypeScript in `src/`
- [X] T003 [P] Configure `vite.config.ts` for Chrome extension (Manifest V3) in `vite.config.ts`
- [X] T004 [P] Install `vite-plugin-web-extension`
- [X] T005 [P] Install `@types/chrome`
- [X] T006 [P] Install `Vitest` and configure for testing in `vite.config.ts` and `package.json`
- [X] T007 Create `manifest.json` with basic permissions and `default_locale` in `public/manifest.json`
- [X] T008 Create `_locales/en/messages.json` and `_locales/es/messages.json` in `public/_locales/`
- [X] T009 Create `src/service-worker/index.ts` (entry point for service worker)
- [X] T010 Create `src/content/index.ts` (entry point for content script)
- [X] T011 Create `src/ui/index.ts` (entry point for UI injection)
- [X] T012 Create `src/shared/types.ts` for shared interfaces (e.g., `EmailAnalysis`, `UserSettings`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T013 Implement basic message passing between `src/content/index.ts` and `src/service-worker/index.ts`
- [X] T014 Implement `chrome.identity.getAuthToken()` for Gmail API authentication in `src/service-worker/auth.ts`
- [X] T015 Load Google API JS Client (`gapi`) in `src/service-worker/gmail-api.ts`
- [X] T016 Install `postal-mime` and implement parsing in `src/service-worker/email-parser.ts`
- [X] T017 Implement `UserSettings` storage and retrieval using `chrome.storage.local` in `src/shared/user-settings.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Core Email Analysis (Priority: P1) 🎯 MVP

**Goal**: As a user, I want to see a clear risk summary of the email I'm currently viewing in Gmail, so that I can quickly assess its legitimacy.

**Independent Test**: Can be tested by opening an email in Gmail and verifying that the extension displays a risk score and a summary of authentication results (SPF, DKIM, DMARC).

### Implementation for User Story 1

- [X] T018 [US1] Implement `EmailAnalysis` data model in `src/shared/types.ts`
- [X] T019 [US1] Implement `AuthenticationResults` parsing (SPF, DKIM, DMARC, ARC) in `src/service-worker/analysis/authentication.ts`
- [X] T020 [US1] Implement `HeaderAnalysis` (Received chain, From/Sender/Reply-To consistency) in `src/service-worker/analysis/headers.ts`
- [X] T021 [US1] Implement `DomainAnalysis` (reputation heuristics, punycode) in `src/service-worker/analysis/domain.ts`
- [X] T022 [US1] Implement `ContentAnalysis` (IBAN detection, suspicious links) in `src/service-worker/analysis/content.ts`
- [X] T023 [US1] Implement overall risk scoring logic in `src/service-worker/analysis/risk-score.ts`
- [X] T024 [US1] Integrate analysis modules into `src/service-worker/email-analyzer.ts`
- [X] T025 [US1] Develop UI component for compact risk summary banner in `src/ui/components/RiskSummaryBanner.ts`
- [X] T026 [US1] Inject `RiskSummaryBanner` into Gmail UI via `src/content/index.ts`
- [X] T027 [US1] Display loading spinner (FR-004) in `src/ui/components/RiskSummaryBanner.ts`
- [X] T028 [US1] Handle missing `Authentication-Results` header (Clarification) in `src/service-worker/analysis/authentication.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Detailed Analysis View (Priority: P2)

**Goal**: As a user, I want to be able to expand the extension's UI to view detailed evidence for the risk assessment, so that I can understand why an email was flagged.

**Independent Test**: Can be tested by clicking the "expand" button on the risk summary banner and verifying that a detailed panel with "Authentication," "Headers," "Domain," and "Content" sections is displayed.

### Implementation for User Story 2

- [X] T029 [US2] Develop UI component for expandable detailed analysis panel in `src/ui/components/DetailedAnalysisPanel.ts`
- [X] T030 [US2] Integrate `DetailedAnalysisPanel` with `RiskSummaryBanner` in `src/ui/components/RiskSummaryBanner.ts`
- [X] T031 [US2] Implement "Copy report" functionality (FR-013) in `src/service-worker/report-generator.ts` and `src/content/index.ts`
- [X] T032 [US2] Implement "Ignore this thread" functionality (FR-013) using `chrome.storage.local` in `src/shared/user-settings.ts` and `src/service-worker/index.ts`
- [X] T033 [US2] Implement "Reanalyze" functionality (FR-013) using messaging API in `src/content/index.ts` and `src/service-worker/index.ts`
- [X] T034 [US2] Ensure UI accessibility (FR-014) for `RiskSummaryBanner` and `DetailedAnalysisPanel` in `src/ui/components/`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Optional Online Lookups (Priority: P3)

**Goal**: As a security-conscious user, I want the option to enable online lookups for more in-depth analysis, with the understanding that this will send some data to external services.

**Independent Test**: Can be tested by enabling the "online lookup" option in the extension's settings and verifying that links are resolved to their final destination.

### Implementation for User Story 3

- [X] T035 [US3] Add `enableOnlineLookups` to `UserSettings` in `src/shared/user-settings.ts`
- [X] T036 [US3] Develop UI for extension settings (e.g., popup or options page) in `src/ui/settings/SettingsPage.ts`
- [X] T037 [US3] Implement logic for safe resolution of shortened links (FR-012) in `src/service-worker/analysis/content.ts`, respecting `enableOnlineLookups`
- [X] T038 [US3] Update `ContentAnalysis` to include `finalUrl` for resolved links in `src/shared/types.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T039 Implement internationalization for English and Spanish (FR-015) across all UI components and messages in `public/_locales/`
- [X] T040 Refine error handling and logging across the extension
- [X] T041 Write comprehensive unit tests for core analysis logic in `tests/unit/`
- [X] T042 Write integration tests for message passing and API interactions in `tests/integration/`
- [X] T043 Optimize extension for performance (memory, CPU usage) based on research
- [X] T044 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
# (No explicit test tasks for US1, but unit/integration tests will be written in the final phase)

# Launch all models for User Story 1 together:
Task: "Implement EmailAnalysis data model in src/shared/types.ts"
Task: "Implement AuthenticationResults parsing (SPF, DKIM, DMARC, ARC) in src/service-worker/analysis/authentication.ts"
Task: "Implement HeaderAnalysis (Received chain, From/Sender/Reply-To consistency) in src/service-worker/analysis/headers.ts"
Task: "Implement DomainAnalysis (reputation heuristics, punycode) in src/service-worker/analysis/domain.ts"
Task: "Implement ContentAnalysis (IBAN detection, suspicious links) in src/service-worker/analysis/content.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
