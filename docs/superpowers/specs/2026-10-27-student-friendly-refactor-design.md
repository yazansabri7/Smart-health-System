# Student-friendly frontend refactor

## Intent

Make the existing frontend easier for an intermediate React student to read,
debug, and explain. This is an in-place code simplification. The current runtime
behavior, including existing quirks, is the baseline. No feature or design changes
are included.

## Constraints supplied by the user

- Preserve every route, page, feature, style value, breakpoint, UI string, and flow.
- Preserve authentication, JWT checks, role guards, localStorage keys, restoration,
  logout, expiry, stale-response handling, and HTTP 401/403 behavior.
- Preserve Axios endpoints, methods, bodies, authorization, loading, and retries.
- Preserve React Hook Form/Yup rules, validation timing, and controlled fields.
- No new libraries, backend changes, file moves, generic layers, or new placeholders.
- Leave simple files alone. Preserve unrelated uncommitted work.
- Inspect first, refactor in small groups, and test after each affected group.

## Current project

React/Vite, JavaScript/JSX, Material UI, React Hook Form, Yup, Axios, and React
Router's existing RouterProvider/createBrowserRouter configuration. There is no
TanStack Query dependency or application QueryClient.

The five authentication pages contain roughly 4,600 nonblank lines, mainly
explicit MUI layout and styles. The shared dashboard, navbar, sidebar, and
placeholder/Unauthorized pages have dense JSX compressed onto long lines.

Authentication is held in a shared session store and read through a small
useSyncExternalStore hook. The JWT is persisted as authToken. The store restores
and validates it before guarded pages render. Session versions prevent old login
or HTTP responses from changing a newer session. Existing JWT code rejects
duplicate claims, malformed expiration, and ambiguous or unsupported roles.

The working tree already contains modified and untracked source, tests, and
documentation from ongoing work. No reset, checkout, cleanup, automatic staging,
or commit of that work is part of this task. The current files, not Git HEAD, are
the starting point.

## Approaches

1. Formatting only: low risk but leaves the difficult logic and nested expressions.
2. In-place readable code: expand dense JSX, replace nested expressions with named
   values/handlers and if/else blocks, and retain the current mechanisms and paths.
   This is the approach specified by the user's detailed request.
3. Replace state management or reorganize the app: excluded by the user's
   behavior-preservation and simple-structure requirements.

## Planned scope and groups

### 1. Capture the baseline and protect ongoing work

Record Git status and the starting contents of every file before editing it in
the implementation phase. Run current checks. Record pre-existing failures and
quirks separately from refactor regressions. Use temporary files outside the
source tree for comparisons and screenshots, without storing real credentials.

Current baseline measured on October 27, 2026:

- npm run lint: exit 0, three React Hook Form watch compatibility warnings.
- npm test: 72 passing unit tests.
- npm run build: exit 0, existing large-bundle warning.
- npm run test:browser: fails during first login because the test focuses
  input[type="password"] while the current login password input starts as text.
  Its current expression is showPassword ? "password" : "text". Preserve that
  expression and its toggle/labels for this task. Update only the test's field
  lookup to its stable name="password" attribute and document the baseline quirk.

### 2. Authentication and API readability

Target src/auth/jwt.js, session.js, login.js, ProtectedRoute.jsx, src/api/client.js,
and src/App.jsx where the change makes code clearer.

- Use named functions, descriptive variable names, full blocks, and explicit
  intermediate values for the role-claim loops and session transitions.
- Preserve exports, public method names, call order, error codes/messages, and
  every security condition. Preserve duplicate-claim detection and UTF-8 decoding.
- Preserve the session-version counter, timers, event subscription cleanup, and
  token persistence timing. Keep the existing store/hook instead of switching to
  Context or copying session state into useEffect.
- Keep the Axios interceptors, request-version markers, public-login exclusion,
  timeout, and configured-origin/base-path restriction. Expand their dense code.
- Keep optional queryClient clearing and injected clock/storage test seams; do
  not add a QueryClient or replace them with a new abstraction.

Run auth tests and the synthetic browser auth suite after this group.

### 3. Shared dashboard, navigation, and routes

Target DashboardLayout.jsx, Sidebar.jsx, Navbar.jsx, MaterialIcon.jsx,
AccessDenied.jsx, DashboardPlaceholder.jsx, router.jsx, and navigation.js only
where readability improves.

- Expand JSX, style objects, imports, and conditionals into readable blocks.
- Use named toggle/menu handlers and explicit derived values for current title,
  collapse state, tooltips, and mode labels. Preserve all props and DOM structure.
- Make nested route construction readable without decoupling navigation from the
  routes or altering index, relative, absolute, or wildcard behavior.
- Keep exactly the same MUI components, element ordering, sx values, theme colors,
  selection behavior, and desktop/mobile drawer mounting behavior.
- Retain theme useMemo if it prevents unnecessary theme recreation; document its
  purpose. Do not remove hooks just to reduce their count.
- Leave simple role wrappers, Outlet wrappers, Footer, Home, main entrypoint,
  assets, empty CSS files, and simple configuration unchanged unless a concrete
  readability need is found.

Run route/auth tests. Exercise sidebar, menus, theme, nested rendering, and all
three roles. Compare layout measurements and same-environment screenshots at
320, 375, 768, 1024, and 1440px in light and dark modes.

### 4. Pages, forms, and validation

Review Login.jsx, Register.jsx, DoctorRegister.jsx, SendCode.jsx,
ResetPassword.jsx, and authSchemas.js end to end during implementation.

- Rename local handlers where useful and replace nested strength/alert ternaries
  with clearly named values computed using if/else.
- Expand compressed helper returns without replacing normal TextFields with a
  generic field factory. Keep small existing form helpers when they reduce noise.
- Preserve all MUI trees, sx values, page-local icon differences, font imports,
  UI wording, validation messages, and accessibility labels.
- For ResetPassword, move OTP event logic to plainly named functions at the
  nearest safe scope. Keep Controller integration, ref-based focus, digit filtering,
  five-character padding/trimming, paste, arrows, Backspace, and blur behavior
  exactly. If moving a handler changes closures or timing, retain and explain it.
- Preserve password-strength indicators independently from Yup validation. Do not
  reconcile existing differences between visual checks and schema requirements.
- Preserve registration success dialogs and the existing 10-second redirect;
  preserve resend behavior, request counts, and email passed through router state.
- Reformat schemas only; no change to ranges, regexes, required fields, date
  interpretation, defaults, or any validation message.

Run relevant tests after each form-related batch. Add characterization tests
where existing tests cannot protect a refactored path. Use intercepted synthetic
responses only. No real login, registration, or password-reset requests.

## Necessary advanced code that stays

- useSyncExternalStore: keeps all auth consumers in sync without delayed copying
  of session state. Explain it in the final student guide.
- Session versions/listeners and expiry timer: prevent stale responses and expired
  sessions from restoring protected content.
- Strict JWT parsing, duplicate-claim checks, and role normalization: security
  behavior that cannot be removed for brevity. Prefer loops over chained flatMap.
- Axios interceptors: ensure every existing API call has consistent auth handling.
- React Hook Form Controller/useRef: preserve select/OTP state, validation, and focus.
- Stable theme memoization and hook dependencies where identity/timing matters.

## Verification and acceptance

After each group, inspect imports/exports and run targeted checks. At completion
run npm run lint, npm run build, npm test, and npm run test:browser.

Exercise synthetic success/failure login, both lockout messages, unconfirmed-email
warning, HTTP 200/400 failures, no retries, persistence, refresh, invalid saved
token rejection, logout, stale requests, 401/403, all role dashboards, cross-role
denial, direct/wildcard routes, Back/Forward, and OTP/form behavior where touched.

Add checks for all eight patient navigation links, active highlighting, collapse
tooltips, mobile drawer close, navbar menus, theme persistence, and responsive
geometry. Use screenshots before/after under the same fonts/browser conditions;
do not claim visual equivalence for states that were not compared.

No new library is required. Existing Node tests and the existing hidden Chrome/Edge
runner are available. Test-only synthetic tokens and intercepted responses do not
verify backend authorization; report that boundary plainly.

Acceptance means the source is more readable and all measured current behavior
is unchanged. Unexpected differences stop that batch until resolved. Existing
bugs are recorded, not silently fixed as part of this refactor.

## Deliverables and implementation discretion

Provide a changed-file list and a short student guide explaining the important
files, login/API flow, removed complexity, necessary advanced pieces, actual
check results, and unverified behavior. Keep existing project folders and file
names. Minor local variable names and formatting choices are left to the
implementer as long as they preserve the above contract.

This document is a concrete refactor design for review. Application code has not
been refactored yet. The Superpowers brainstorming workflow requires approval
of this design before implementation.
