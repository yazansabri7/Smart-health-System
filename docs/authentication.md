# Authentication

The frontend uses React Query mutations for account requests, React Hook Form
for form state, and the unchanged Yup schemas through yupResolver. The API
functions are in `src/api/account.js`; the shared Axios instance reads
`import.meta.env.VITE_BASE_URL`.

## Successful login

A single POST `/Account/Login` sends `{ email, password }`. The backend response
must have `success: true` and a top-level `token`.

The existing validator rejects malformed JWTs, duplicate top-level claims,
invalid or expired expiration, missing/unsupported roles, and conflicting roles.
It reads `role`, `roles`, and
`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`. String arrays and
comma-separated values are supported; duplicates of the same normalized role
are allowed, but multiple different roles are rejected.

Only after validation does the session store save the JWT as `authToken` in
localStorage and notify components. Login uses history replacement to navigate
to `/patient`, `/doctor`, or `/admin`. It never guesses a role or trusts a return
URL, query parameter, or response-level role field.

## Failed login

Both successful HTTP responses with `success: false` and Axios error response
bodies are checked for the backend's message. Invalid credentials, both lockout
messages, unconfirmed email, general failure, and network failure retain their
existing safe English text. Unconfirmed email uses a warning Alert; other login
failures use an error Alert. No raw exception details are displayed.

No automatic retry, fallback role, mock authentication, client-side attempt
counter, or alternate authentication method is used. React Query's mutation
network mode is always, preserving a single immediate network attempt even when
the browser reports offline. ASP.NET Core Identity controls lockout.

## Protected routes and error screens

The explicit createBrowserRouter routes wrap their layouts in
`<ProtectedRoute role="Patient"><PatientLayout /></ProtectedRoute>` (and the
matching Doctor/Admin variants).

The guard reads `localStorage.authToken` and uses the same validator as Login.
Invalid/missing/expired JWTs go to `/login`; a different valid role or HTTP 403
state goes to `/unauthorized`. Matching roles render children after session
synchronization. The layouts continue rendering their nested Outlet.

Unknown public URLs show the NotFound page. Each role also has its own protected
wildcard: an authorized user sees NotFound, an unauthenticated user goes to Login,
and a different role goes to Unauthorized. Wildcard screens do not render the
protected dashboard layout. Both 403/404 pages have `Go to Login` links.

The frontend 404/403 screens do not prove the hosting server returns those HTTP
status codes.

## Session and cache behavior

Refresh restores and validates the saved token before protected content renders.
Logout, expiration, invalid saved tokens, failed login, and matching HTTP 401
responses clear the token/session and shared query cache. HTTP 403 retains the
same session and cache while displaying access denied.

The application QueryClient is shared by QueryClientProvider and the existing
session store. No separate cache is cleared. Cache and mutation data are not
persisted. Session-version checks prevent stale login or HTTP responses from
changing a newer session. Window focus, visibility, pageshow, and storage events
continue keeping the session synchronized.

`useSyncExternalStore`, expiry timers, strict JWT parsing, and request-version
checks remain because they prevent stale state and unauthorized content from
appearing. These checks were not removed to shorten the guard.

## Verification boundary

Unit tests use synthetic JWTs and Axios adapters. Browser tests intercept all
external requests, including account operations. Registration, send/resend code,
and password reset are checked through real forms using synthetic responses.
No live login or backend authorization tests were performed.

Frontend JWT decoding is not signature verification. Backend signature/algorithm,
issuer/audience, expiration, role authorization, patient ownership, doctor-patient
access, and Doctor approval enforcement remain unverified backend requirements.
Do not treat a Doctor JWT role as confirmation of approval.
