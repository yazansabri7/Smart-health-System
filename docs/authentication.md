# Login and authentication

The existing login form and MUI design are preserved. No authentication libraries
were added. The existing Axios client, JWT helper, session store and role guards
are reused.

`POST /Account/Login` sends email and password once. A response must contain
`success: true` and a valid `token`. The existing JWT helper checks expiration
and requires one recognized role: Patient, Doctor, or Admin. Only then is the
JWT saved to localStorage as `authToken`, and React Router navigates to the
matching dashboard using `replace: true`.

Both HTTP 200 failure responses and Axios HTTP 400 response bodies are handled
by their backend `message`:

| Backend message | Alert |
| --- | --- |
| Invalid email or password | Invalid email or password. |
| Account is locked out , please try again later | Your account is temporarily locked. Please try again later. |
| Account is locked duo to multiple failed login attempts | Your account is temporarily locked. Please try again later. |
| Email is not confirmed , please confirm your email | Please confirm your email before logging in. (warning) |
| Login failed or an unknown error | Login failed. Please try again. |
| No HTTP response | Unable to connect to the server. |

Errors clear when a new request starts. The submit button is disabled and shows
loading while submitting. There are no automatic retries or React login-attempt
counters. ASP.NET Core Identity is responsible for lockout. Login only requires
a nonempty password; registration password rules do not restrict existing logins.

Authentication restores from `authToken` before protected routes render. An
invalid or expired saved token is removed. Logout, expiry, failed login, and
HTTP 401 clear authentication and the saved token. HTTP 403 shows forbidden
access without changing the user's role. Other tabs respond to storage changes.
Only the token's validated role determines access:

- `/patient/*`: Patient
- `/doctor/*`: Doctor
- `/admin/*`: Admin

A missing valid token redirects to `/login`; a wrong role shows Unauthorized.
Other role values in storage, query strings, or return URLs are ignored.

Run `npm test`, `npm run test:browser`, `npm run lint`, and `npm run build`.
Browser tests require Chrome/Edge (or `CHROME_PATH`). They use synthetic tokens
and intercept every external request, so no live login attempts are made.

Frontend JWT decoding is not signature verification. Backend JWT validation,
role authorization, resource ownership checks, and Doctor approval rules remain
backend responsibilities and have not been independently verified here.
