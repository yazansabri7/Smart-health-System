# SmartDHP healthcare frontend

SmartDHP is a React application with Patient, Doctor, and Admin workspaces.
It uses Vite, Material UI, React Router, Axios, React Hook Form, and Yup.

## Run the project

```powershell
npm install
npm run dev
```

The API base address is read from `VITE_API_BASE_URL` in `.env`. The existing
API address, endpoints, and request formats were preserved during refactoring.

## Files changed by the readability refactor

- `src/App.jsx` and `src/router.jsx`
- `src/api/client.js`
- `src/auth/jwt.js`, `session.js`, `login.js`, `ProtectedRoute.jsx`, and `useAuth.js`
- `src/layouts/DashboardLayout.jsx`
- `src/components/layout/Sidebar.jsx` and `MaterialIcon.jsx`
- `src/components/navbar/Navbar.jsx`
- `src/pages/dashboard/AccessDenied.jsx` and `DashboardPlaceholder.jsx`
- `src/pages/login/Login.jsx`
- `src/pages/register/Register.jsx`
- `src/pages/docregister/DoctorRegister.jsx`
- `src/pages/sendcode/SendCode.jsx`
- `src/pages/reset/ResetPassword.jsx`
- `src/validations/authSchemas.js`
- `scripts/auth-browser-tests.mjs` and this README

Other pre-existing working-tree changes were kept. Package files, `.env`, build
configuration, assets, and the already-simple source files were not refactored.

## Where to start reading

| File | Responsibility |
| --- | --- |
| `src/main.jsx` | Mounts the application in the browser. |
| `src/App.jsx` | Renders the router and listens for browser events that can change authentication. |
| `src/router.jsx` | Defines public pages, role guards, dashboard pages, and nested routes. |
| `src/config/navigation.js` | Lists each role's sidebar labels, icons, and paths. |
| `src/pages/login/Login.jsx` | Displays the login form, loading state, password toggle, and safe error/warning alerts. |
| `src/pages/register/Register.jsx` | Displays patient registration and its success dialog and redirect. |
| `src/pages/docregister/DoctorRegister.jsx` | Displays doctor registration, specialization selection, and its success dialog. |
| `src/pages/sendcode/SendCode.jsx` | Sends or resends a reset code and passes the email to the reset page. |
| `src/pages/reset/ResetPassword.jsx` | Handles the five code boxes, keyboard/paste behavior, new password, and reset request. |
| `src/validations/authSchemas.js` | Holds the existing Yup validation rules and their messages. |
| `src/api/client.js` | Configures Axios, API authorization headers, and HTTP 401/403 handling. |
| `src/auth/login.js` | Makes the login request, maps backend messages, and returns the correct dashboard path. |
| `src/auth/jwt.js` | Decodes token claims and validates expiration and the account's role. |
| `src/auth/session.js` | Stores the current session, saves/restores `authToken`, handles expiry and logout, and notifies React. |
| `src/auth/useAuth.js` | Gives components the latest shared authentication state. |
| `src/auth/ProtectedRoute.jsx` | Checks authentication and the required role before rendering protected pages. |
| `src/layouts/DashboardLayout.jsx` | Combines the theme, responsive sidebar, navbar, and nested page content. |
| `src/layouts/PatientLayout.jsx`, `DoctorLayout.jsx`, `AdminLayout.jsx` | Pass the appropriate role and navigation to the shared layout. |
| `src/components/layout/Sidebar.jsx` | Renders role navigation, active links, collapsed tooltips, and logout. |
| `src/components/navbar/Navbar.jsx` | Renders the page title, theme/sidebar controls, notifications, and account menu. |
| `src/components/layout/MaterialIcon.jsx` | Renders a Material Symbols icon with the existing styles. |
| `src/pages/dashboard/AccessDenied.jsx` | Displays Unauthorized access for a valid user with the wrong role. |
| `src/pages/dashboard/DashboardPlaceholder.jsx` | Displays the project's existing planned-feature pages. No feature was replaced during the refactor. |

## How login works

1. `Login.jsx` validates the form through React Hook Form and Yup.
2. `handleLogin` clears the previous error and calls `signIn` in `auth/login.js`.
3. The existing Axios client makes one POST request to `/Account/Login`.
4. A response must have `success: true` and a token. Other results are mapped to
   the existing invalid-credentials, locked-account, confirmation, or general error.
5. The token is checked for valid claims, future expiration, and one supported role.
6. The session store saves the validated token as `localStorage.authToken` and
   notifies the components that authentication has changed.
7. React Router replaces the login history entry with the role's dashboard.

| Role | Dashboard and protected route tree |
| --- | --- |
| Patient | `/patient` and `/patient/*` |
| Doctor | `/doctor` and `/doctor/*` |
| Admin | `/admin` and `/admin/*` |

After refresh, the store restores and checks the saved token before protected
content renders. Missing or invalid authentication redirects to `/login`. A valid
user visiting another role's URL sees Unauthorized. Logout, expiry, and matching
HTTP 401 responses clear the session and saved token. HTTP 403 shows forbidden
access without changing the role. No automatic login retries were added.

## What became simpler

- Long one-line JSX is expanded so the component tree is easy to follow.
- Nested alert and password-strength ternaries are ordinary `if/else` blocks.
- Form and menu actions have named handlers such as `handleLogin`,
  `handleRegisterDoctor`, `handleToggleSidebar`, and `closeProfileMenu`.
- Role extraction uses explicit loops rather than chained `flatMap` operations.
- Session operations are named functions with the same state changes as before.
- Reset-code typing, paste, and arrow-key handlers are separate named functions
  rather than functions buried inside the form renderer.
- Validation chains are consistently formatted. The rules and messages are unchanged.

Existing folders and component responsibilities stay the same. Files that were
already simple were left alone. No libraries or service layers were added.

## Why some advanced pieces remain

- **`useSyncExternalStore`:** the session lives outside React so Axios can also
  access it. This hook subscribes React components to that same session without
  making a second, potentially outdated copy.
- **Session version numbers:** an old login or API response must not replace or
  log out a newer session. Each request remembers which session it belongs to.
- **JWT parsing and duplicate checks:** conflicting claims must be rejected.
  Removing these checks would change security behavior.
- **`Object.freeze` and new snapshots:** components must see a consistent session
  and receive a new snapshot when it changes.
- **Axios interceptors:** existing requests share the same header and error rules,
  including keeping the bearer token on the configured API origin/base path.
- **React Hook Form `Controller` and `useRef`:** preserve controlled inputs,
  validation, and focus movement between reset-code boxes.
- **Theme `useMemo`:** prevents rebuilding the theme when only a menu/drawer changes.
- **The browser-test protocol code:** drives Chrome/Edge without adding a testing
  library. It is test infrastructure, not part of the frontend delivered to users.

Client-side decoding does not verify a JWT signature. The ASP.NET Core backend
must enforce authentication, role authorization, ownership, and Doctor approval.
Those backend rules were not changed or independently tested during this refactor.

## Check the project

```powershell
npm run lint
npm run build
npm test
npm run test:browser
```

Browser tests use hidden Chrome/Edge, synthetic tokens, and intercepted responses.
They do not send live login, registration, or password-reset requests. Set
`CHROME_PATH` if the browser is installed outside the runner's default locations.

The browser runner covers login results, all roles, persistence, refresh, logout,
401/403, wrong-role and history navigation, all patient links, sidebar modes,
navbar menus, theme persistence, password-strength labels, and reset-code entry.
It also supports optional local screenshot recording/comparison using the
`REFACTOR_SNAPSHOTS` folder and `REFACTOR_COMPARE=1`. Reference screenshots are
kept outside the source tree. Comparisons require the same browser/font conditions.

## Behavior deliberately preserved

This task changes code readability, including the test's password selector, not
application behavior. The current login password input starts visible and the
existing toggle expression was preserved. Existing differences between visual
password-strength checks and validation rules were also preserved.

The controlled browser tests block external fonts. With fallback icon text, the
original 320px dashboard extends to 372px; this same baseline is preserved.
Screenshot comparisons test the controlled font environment, not every OS,
loaded-font configuration, viewport, or interactive state.

Full real-backend form submissions and backend security enforcement were not
verified. See `docs/authentication.md` for the existing login behavior details.
