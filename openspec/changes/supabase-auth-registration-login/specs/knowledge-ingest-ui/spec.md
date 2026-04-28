## MODIFIED Requirements

### Requirement: Client-side routing for Phase 1 information architecture

The SPA router SHALL register routes for `/`, `/upload`, `/raw`, `/tasks`, `/notes`, `/review`, and authentication entry paths already used by the project. Routes for ingest and knowledge workflow pages MUST be protected by authentication guards, such that unauthenticated access is redirected to `/auth/login`, while authenticated access to `/auth/login` is redirected to the default in-app page.

#### Scenario: Spec routes do not 404

- **WHEN** a logged-in user navigates from the shell to each of `/`, `/upload`, `/raw`, `/tasks`, `/notes`, and `/review`
- **THEN** the router SHALL render a page component for each path (placeholder content is allowed only where explicitly out of scope for this change in the proposal)

#### Scenario: Guard redirects unauthenticated route access

- **WHEN** an unauthenticated user navigates directly to `/upload`, `/raw`, `/tasks`, `/notes`, or `/review`
- **THEN** the router SHALL redirect to `/auth/login` instead of rendering protected page content
