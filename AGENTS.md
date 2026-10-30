# Codex Project Instructions

## Project overview
This is an existing React application. Work within its current architecture and conventions. Before implementing a task, inspect the relevant files, dependencies, components, routes, styles, and API patterns. Treat the existing codebase as the source of truth; do not assume a library is already installed.

## UI and design system
- Use Material UI (MUI) for new UI and changes to existing UI.
- Preserve the established visual identity. Inspect similar existing pages and shared components before building anything new.
- Match existing theme tokens, palette, typography, spacing, border radii, shadows, layout, form controls, navigation, and interaction patterns.
- Reuse the existing MUI theme, shared components, and styling approach (`sx`, `styled`, etc.) instead of inventing a second design system.
- Make pages responsive and accessible, and preserve the project's current LTR/RTL behavior where applicable.
- Do not redesign existing screens or introduce new colors, fonts, component libraries, or visual patterns unless explicitly requested.

## Preferred libraries and responsibilities
- **Zustand:** use for shared client-side/global state when appropriate. Do not move local component state into Zustand without a reason.
- **TanStack React Query:** use for server state, API fetching, caching, mutations, invalidation, and loading/error states when appropriate. Prefer existing query hooks and query-key conventions.
- **React Hook Form:** use for form state, submission, and field registration.
- **Yup:** use for form validation, integrated with React Hook Form via `yupResolver`; reuse existing validation schemas where possible.
- **Axios:** use existing Axios clients, interceptors, authorization handling, and API conventions. Avoid duplicating HTTP configuration.
- **React Router:** follow the project's existing router configuration and navigation conventions.
- Check `package.json` and current code before using a dependency. Do not install, upgrade, or replace packages without approval.

## Preserve existing behavior
- Do not change existing API endpoints, request/response payloads, authentication, authorization, token storage, routes, or business logic unless the task explicitly requires it.
- Never silently change backend contracts to accommodate a UI change.
- Keep unrelated files and behavior untouched. Prefer small, focused modifications over broad rewrites.
- Do not remove existing features, validations, or error handling.
- Do not expose credentials, secrets, tokens, or environment variable values in output or commits.

## Implementation workflow
1. Read the relevant code and find the closest existing implementation or design pattern.
2. Briefly explain the intended changes for complex or potentially breaking tasks; ask for approval before changing architecture, dependencies, APIs, authentication, or unrelated behavior.
3. For ordinary requested changes, edit the project files directly; do not just provide code snippets.
4. Reuse existing components, hooks, utilities, schemas, and conventions before creating new ones.
5. Handle loading, error, empty, and success states consistently with the existing UI.
6. Run relevant available checks (such as lint, build, or tests) when feasible; do not claim checks passed unless they actually ran.
7. Summarize modified files, what changed, and any checks or remaining issues.

## Code quality
- Use readable, maintainable React functional components and hooks.
- Keep hooks dependencies correct and avoid stale closures, race conditions, and unnecessary effects.
- Use React Query for remote/server data instead of duplicating it in Zustand without a specific need.
- Avoid unnecessary abstractions, dependencies, and premature optimization.
- Respect existing JavaScript/TypeScript, naming, folder structure, and import conventions.
- Do not replace a working pattern merely because a different pattern is preferred.

## Communication
- Explain significant decisions and any conflict with existing conventions.
- If a request is ambiguous and could affect important behavior, ask a focused question before implementing.
- When the user requests a specific change, implement it directly within the authorized scope and report the result concisely.
