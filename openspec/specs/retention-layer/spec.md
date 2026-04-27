## ADDED Requirements

### Requirement: Due cards API supports global and note scopes
The system SHALL consume `GET /api/cards/due` using default due semantics (`next_review <= now`) and SHALL support scoped retrieval for global review and note-specific review via explicit scope parameters.

#### Scenario: Default due query
- **WHEN** a user opens `/review` without scope parameters
- **THEN** the client requests due cards using global scope semantics and displays only cards due at request time

#### Scenario: Note-scoped due query
- **WHEN** a user opens `/review` with note scope parameters
- **THEN** the client requests due cards with the note identifier and renders only cards within that note scope

### Requirement: Review session enforces reveal-then-rate flow
The system SHALL present each card in a closed-book flow where the answer is hidden first, then revealed, and only then rated using four rating options mapped to Again/Hard/Good/Easy semantics while preserving numeric API values `1..4`.

#### Scenario: Hidden answer before reveal
- **WHEN** a card is first shown in a review session
- **THEN** the answer content is not visible until the user triggers reveal

#### Scenario: Rating controls after reveal
- **WHEN** the user reveals the answer
- **THEN** the UI enables four labeled rating actions in Chinese that map deterministically to numeric ratings 1-4

### Requirement: Review submission persists logs and next schedule
The system SHALL submit each rating to `POST /api/cards/{card_id}/review` with rating and reviewed timestamp, and SHALL update local session state from server-returned scheduling fields including `next_review`.

#### Scenario: Successful review persistence
- **WHEN** review submission succeeds for a card
- **THEN** a server-side `review_logs` record exists and the client updates card schedule data using the response payload

#### Scenario: Submission failure handling
- **WHEN** review submission fails
- **THEN** the client keeps session consistency by reverting pending local state or refetching affected card data before continuing

### Requirement: FSRS-lite scheduling remains schema-compatible
The system SHALL implement a simplified scheduling strategy that updates and persists `fsrs_state` fields compatible with Phase 1 contracts, including `stability`, `difficulty`, and `reps` (or approved subset), and SHALL compute `next_review` from that state.

#### Scenario: FSRS-lite field persistence
- **WHEN** a card receives a valid rating in review
- **THEN** the stored scheduling state contains the required FSRS-compatible fields and an updated `next_review` value

#### Scenario: Documented FSRS-lite limitations
- **WHEN** implementation details are reviewed for Phase 1
- **THEN** project documentation explicitly states limitations and non-goals relative to full FSRS behavior
