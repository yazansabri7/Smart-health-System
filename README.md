# SmartDHP healthcare frontend

React + Vite, Material UI, React Router, Axios, TanStack React Query,
React Hook Form, and Yup. The Patient, Doctor, and Admin workspaces share
one responsive dashboard layout.

## Run

```powershell
npm install
npm run dev
```

`.env` uses `VITE_BASE_URL` for the existing API address. Restart Vite after
changing an environment variable. The API address itself was not changed.

## Important files

| File | What it does |
| --- | --- |
| `src/router.jsx` | Lists every public, dashboard, wildcard, and Unauthorized route explicitly. |
| `src/auth/ProtectedRoute.jsx` | Reads `authToken`, validates it, compares roles, and renders its children only when allowed. |
| `src/auth/jwt.js` | Shared JWT structure, expiration, and role checks used by Login and the route guard. |
| `src/auth/login.js` | Validates the login response, maps safe backend errors, saves the session, and returns its dashboard path. |
| `src/auth/session.js` | Keeps the session synchronized with localStorage, handles logout/expiration, and clears the actual QueryClient. |
| `src/auth/useAuth.js` | Subscribes React components to the same session that Axios uses. |
| `src/api/client.js` | One Axios instance with the API base URL, JWT header, and HTTP 401/403 handling. |
| `src/api/account.js` | Five short account API functions with visible methods and endpoint paths. |
| `src/api/queryClient.js` | The shared React Query client; automatic retries are disabled. |
| `src/main.jsx` | Provides that QueryClient to the application. |
| `src/pages/login/Login.jsx` | Existing login design, form validation, mutation, loading state, and safe alerts. |
| `src/pages/register/Register.jsx` | Patient registration form and its existing success dialog/redirect. |
| `src/pages/docregister/DoctorRegister.jsx` | Doctor registration form, specialization, and success dialog. |
| `src/pages/sendcode/SendCode.jsx` | Sends/resends reset codes and carries the email to Reset Password. |
| `src/pages/reset/ResetPassword.jsx` | Handles code entry, keyboard/paste behavior, and the password-reset mutation. |
| `src/validations/authSchemas.js` | Existing Yup schemas and messages, unchanged. |
| `src/layouts/DashboardLayout.jsx` | Existing sidebar, navbar, responsive drawers, theme controls, and nested Outlet. |
| `src/config/navigation.js` | Role-specific sidebar items; these no longer generate routes. |
| `src/config/theme.js` | Existing dashboard theme, reused by the 403/404 screens. |
| `src/pages/NotFound.jsx` | Frontend 404 screen for unknown URLs. |
| `src/pages/dashboard/AccessDenied.jsx` | Public `/unauthorized` screen, containing no protected dashboard content. |
| `src/components/layout/ErrorPage.jsx` | The small shared MUI presentation for both error screens. |

## Login and route protection

1. The form validates with `useForm`, `yupResolver`, and the existing Yup schema.
2. Its `useMutation` calls the login logic with form data.
3. `loginUser` sends one POST to `/Account/Login` through the Axios instance.
4. Login requires `success: true` and a structurally valid, unexpired token with
   exactly one supported role. It saves only that validated token as `authToken`.
5. Login navigates with `replace: true` to `/patient`, `/doctor`, or `/admin`.

`ProtectedRoute` uses the same JWT validator. It reads the stored token, then
uses ordinary conditions:

- No valid token: `/login`.
- Valid token, wrong required role: `/unauthorized`.
- Valid token and matching role: render the supplied children.

A small synchronization effect keeps the existing session store and Axios in
agreement with storage before rendering dashboard content. Role claims support
ASP.NET Core's URI claim, `role`, `roles`, arrays, and comma-separated strings.
Missing, malformed, unsupported, conflicting, and expired claims remain rejected.

Refresh restores the saved session. Logout, expiry, and a matching HTTP 401
response clear authentication and the query cache. HTTP 403 shows Unauthorized
without changing the user's role. Existing version checks keep old requests from
changing a newer user's session.

Invalid credentials and locked accounts use error alerts; unconfirmed email uses
a warning. Unknown failures and network errors use the existing safe messages.
There are no client-side attempt counters or automatic login retries.

## React Query and Yup have different jobs

- React Query manages requests through `useMutation` and `mutateAsync`.
- React Hook Form manages fields, errors, and submission state.
- Yup validates exactly the same fields and rules as before.
- The form's existing `isSubmitting` stays active while `mutateAsync` is awaited,
  preserving button disabling, loading indicators, dialogs, and try/catch handling.

There are currently no implemented GET/data-fetching pages. No artificial GET
request was added to a placeholder just to use `useQuery`. Future real GET
features should use `useQuery` with this same QueryClient.

Mutation retries are disabled. Offline requests still attempt once and show the
existing network error rather than being silently queued. Request/cache state
is not persisted to browser storage. Only the existing JWT and theme preference
use localStorage.

## Real account endpoints

All functions below are in `src/api/account.js` and use the same Axios instance.

| Function | Method and endpoint | Consumer |
| --- | --- | --- |
| `loginUser(data)` | POST `/Account/Login` | `auth/login.js`, called by `Login.jsx` |
| `registerPatient(data)` | POST `/Account/RegisterPatient` | `Register.jsx` |
| `registerDoctor(data)` | POST `/Account/RegisterDoctor` | `DoctorRegister.jsx` |
| `sendCode(data)` | POST `/Account/SendCode` | `SendCode.jsx`, including resend |
| `resetPassword(data)` | PATCH `/Account/ResetPassword` | `ResetPassword.jsx` |

## 404 and 403 screens

Unknown top-level URLs show `404 — Page Not Found` and keep their URL. Unknown
Patient/Doctor/Admin child routes check authentication and role first. Only an
authorized user sees that role's wildcard 404; no dashboard shell is displayed.
A wrong-role visitor goes to `/unauthorized`, and an unauthenticated visitor goes
to Login.

`/unauthorized` shows `403 — Access Denied`. Both error pages have a working
`Go to Login` link and use the existing light/dark theme. These are frontend
screens, not evidence of HTTP status codes returned by the hosting server.

## Checks

```powershell
npm run lint
npm run build
npm test
npm run test:browser
```

Tests use synthetic JWTs, Axios adapters, and intercepted browser responses.
No live backend login, registration, or password-reset requests are sent. Browser
tests require Chrome/Edge or `CHROME_PATH`. Optional screenshot comparisons use
`REFACTOR_SNAPSHOTS` and `REFACTOR_COMPARE=1` under matching browser/font conditions.

The existing visible-password toggle behavior and page-local styling are
preserved. Yup was not replaced with Zod. No new dashboard features or backend
changes are included.

JWT signature verification, server-side roles/ownership, account lockout rules,
and Doctor approval remain backend responsibilities, not client-side guarantees.
A Doctor role alone does not confirm approval. See `docs/authentication.md` for
additional authentication details.

React Query references: [mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations),
[QueryClient](https://tanstack.com/query/latest/docs/reference/QueryClient).
