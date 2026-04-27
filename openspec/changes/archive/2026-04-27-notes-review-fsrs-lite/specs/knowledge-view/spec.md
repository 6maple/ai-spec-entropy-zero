## ADDED Requirements

### Requirement: Notes list supports retrieval and empty-state guidance
The system SHALL render a `/notes` page that consumes `GET /api/notes` and supports filtering by `raw_id`, `tag`, and `keyword` when available in the API contract. The page MUST provide a Chinese empty-state message and a clear navigation call-to-action to upload/raw entry workflows when no notes are returned.

#### Scenario: Notes list with filters
- **WHEN** a user opens `/notes` with supported filter query parameters
- **THEN** the client sends the corresponding filter values to `GET /api/notes` and renders the returned note collection

#### Scenario: Empty notes result
- **WHEN** `GET /api/notes` returns an empty collection
- **THEN** the page shows Chinese empty-state copy and at least one CTA that routes to raw upload or raw list entry points

### Requirement: Note detail presents structured reading surface
The system SHALL provide `/notes/:noteId` with note metadata, point cards, ToC navigation based on H2/H3 headings, and a sidebar summary including linked flashcard count. The page MUST support mobile layout fallback consistent with Phase 1 layout rules.

#### Scenario: Structured note detail rendering
- **WHEN** a user opens `/notes/:noteId` for an existing note
- **THEN** the page renders header metadata, point list content, and ToC anchors that navigate within the note detail content

#### Scenario: Mobile sidebar fallback
- **WHEN** a user opens `/notes/:noteId` on a narrow viewport
- **THEN** sidebar-only information is collapsed or relocated without content overlap or inaccessible controls

### Requirement: Markdown and code blocks are safe and usable
The system SHALL render point body markdown through a sanitized pipeline and SHALL render fenced code blocks with syntax highlighting, copy-to-clipboard action, success feedback, and failure notification.

#### Scenario: Successful code copy feedback
- **WHEN** a user clicks copy on a rendered code block and clipboard write succeeds
- **THEN** the UI shows a success state indicator (such as a checkmark) for that action

#### Scenario: Clipboard failure feedback
- **WHEN** a user clicks copy on a rendered code block and clipboard write fails
- **THEN** the UI shows a visible failure toast/message without breaking the current reading context

### Requirement: Note detail can enter scoped review
The system SHALL provide an entry action from note detail to `/review` with query parameters that preserve note scope for due-card retrieval.

#### Scenario: Enter review from note detail
- **WHEN** a user clicks the review entry action from `/notes/:noteId`
- **THEN** the app navigates to `/review` with parameters that indicate note-scoped review for that note
