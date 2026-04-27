## ADDED Requirements

### Requirement: App shell and top navigation

The application SHALL provide a sticky application shell whose header height is 56px and matches Phase 1 visual tokens (semi-transparent background, bottom border, optional backdrop blur per `spec-design.md`).

#### Scenario: Primary navigation links are reachable

- **WHEN** a logged-in user views any shell-wrapped page
- **THEN** the top navigation SHALL present center links to `/`, `/raw`, `/tasks`, `/notes`, and `/review`, and the link for the current route SHALL be visually distinct as active

#### Scenario: Upload entry is always available on desktop

- **WHEN** a logged-in user views any shell-wrapped page on a viewport classified as desktop
- **THEN** the top navigation SHALL present a primary control labeled per zh-CN i18n (概念上为「上传知识」) that navigates to `/upload`

#### Scenario: Mobile keeps upload accessible

- **WHEN** a logged-in user views any shell-wrapped page on a small viewport where center links are collapsed
- **THEN** the navigation SHALL provide a drawer or equivalent for center links AND SHALL still expose the primary upload control without requiring the drawer for upload

### Requirement: Client-side routing for Phase 1 information architecture

The SPA router SHALL register routes for `/`, `/upload`, `/raw`, `/tasks`, `/notes`, `/review`, and authentication entry paths already used by the project, such that navigation from the shell does not produce application-level 404 for these paths.

#### Scenario: Spec routes do not 404

- **WHEN** a logged-in user navigates from the shell to each of `/`, `/upload`, `/raw`, `/tasks`, `/notes`, and `/review`
- **THEN** the router SHALL render a page component for each path (placeholder content is allowed only where explicitly out of scope for this change in the proposal)

### Requirement: Upload markdown knowledge

The `/upload` page SHALL allow selecting or dropping files with `accept` limited to Markdown (e.g. `.md`), SHALL show upload progress while the request is in flight, and SHALL display success feedback that includes the created `raw_id` and a navigation affordance toward the raw library.

#### Scenario: Successful upload surfaces id and next step

- **WHEN** `POST /api/raw/upload` (or the configured raw upload endpoint) succeeds with a response containing `raw_id`
- **THEN** the UI SHALL display that identifier and SHALL offer navigation to `/raw` (or equivalent CTA copy via i18n)

#### Scenario: Failed upload retains recoverable input when still valid

- **WHEN** upload fails due to a client-validatable error or recoverable server error while the selected file remains valid
- **THEN** the UI SHALL preserve the user's ability to retry without forcing an unnecessary re-selection cycle (exact interaction MAY be drag-and-drop or picker-specific)

### Requirement: Raw library list and non-terminal polling

The `/raw` page SHALL present a filterable tabular view of raw items, row actions including process/retry where supported by the backend contract, and a detail drawer for a selected row.

#### Scenario: Polling runs only with non-terminal work

- **WHEN** the visible list contains at least one row whose processing state is non-terminal per the backend contract
- **THEN** the page SHALL periodically refetch list and/or affected detail until all such rows reach a terminal state or a timeout condition is met

#### Scenario: Polling stops at terminal or timeout

- **WHEN** every visible non-terminal row has reached a terminal state OR the polling timeout elapses
- **THEN** the page SHALL stop automatic periodic refetch and SHALL present a stable state without continuous polling

### Requirement: Tasks observability UI

The `/tasks` page SHALL present a filterable list of tasks, a detail drawer, links to a note when `note_id` is present, and retry actions aligned with the tasks API contract from Phase 1 backend specs.

#### Scenario: Task linked to note is navigable

- **WHEN** the user opens a task whose payload includes a `note_id`
- **THEN** the UI SHALL provide a navigation affordance to the corresponding note route when that route exists in the product

### Requirement: Home dashboard shortcuts

The `/` page SHALL present dashboard-style cards summarizing ingest/review-oriented shortcuts consistent with `spec-design.md`, including references to recent raw rows and recent tasks where data is available.

#### Scenario: Dashboard renders without crashing when partial data missing

- **WHEN** optional dashboard APIs return empty or are unavailable behind a feature flag
- **THEN** the home page SHALL still render shell and cards in a degraded/empty state without uncaught errors

### Requirement: Internationalization (zh-CN only)

All user-visible strings introduced or touched by this change SHALL be sourced from i18n message keys; the repository SHALL ship zh-CN messages for those keys as the Phase 1 default catalog.

#### Scenario: No English as default UI copy for new strings

- **WHEN** the UI renders strings owned by this change
- **THEN** the default resolved language for those strings SHALL be zh-CN (English bundles MAY exist for development but SHALL NOT be the shipped default)

### Requirement: Typed API clients for ingest surfaces

The frontend SHALL provide typed client modules for raw upload/list/detail operations and tasks list/detail/retry operations (`rawApi`, `tasksApi`), using the project's configured API base URL and attaching bearer authentication consistent with other API calls.

#### Scenario: API errors surface human-readable feedback

- **WHEN** the backend returns an error response for raw or tasks calls
- **THEN** the UI SHALL display an error message derived from the server payload when available, otherwise a generic zh-CN error message via i18n
