# AI Speaker AWS Deployment Report

## Summary

- Date: 2026-05-18
- Target: AWS Lightsail Ubuntu instance, `52.76.85.132`
- Domain: `https://aispeaker.cc`
- Service: `aispeaker.service`
- Scope: Login, signup, Google login/signup routing, session cookie, database connection stability

## Deployment Status

Deployment to the AWS Lightsail server was completed.

- Application path: `/opt/aispeaker/app`
- Service status: active
- Build status: completed successfully with `pnpm build`
- Restart status: `aispeaker.service` restarted successfully
- Backup created before edits: `/opt/aispeaker/app/backups/codex-20260518_121126`

## Issues Found

### 1. `/signup` returned 404

The production site had `/register` and `/login`, but user-facing links and OAuth flows also reached `/signup` and `/signin`.

Impact:

- Signup page could show `404 Page Not Found`.
- Google signup/login redirect flow could land on an unsupported route.

### 2. Login and Google login failed with database query errors

The login page showed a query failure around user lookup by Google ID.

Impact:

- Google login could fail even when the Google account was valid.
- Normal login/signup reliability was affected by database connection handling.

### 3. Session cookie options were not production-safe behind HTTPS proxy

The app runs behind Nginx/HTTPS. Cookie security settings needed to respect `x-forwarded-proto`.

Impact:

- Auth session cookie could be rejected or behave inconsistently in browser login flows.

## Changes Applied

### Frontend routes

Updated production routing to support both route names:

- `/login`
- `/signin`
- `/register`
- `/signup`

Changed file on server:

- `/opt/aispeaker/app/client/src/App.tsx`

### Auth redirect exceptions

Updated the auth hook so public auth pages do not immediately redirect as unauthenticated pages.

Changed file on server:

- `/opt/aispeaker/app/client/src/_core/hooks/useAuth.ts`

### Session cookie handling

Changed cookie options to detect HTTPS requests through `x-forwarded-proto`.

Applied behavior:

- HTTPS request: `secure: true`, `sameSite: "none"`
- Local/non-HTTPS request: `secure: false`, `sameSite: "lax"`
- Always: `httpOnly: true`, `path: "/"`

Changed file on server:

- `/opt/aispeaker/app/server/_core/cookies.ts`

### Database connection handling

Updated database connection handling to use a MySQL pool with longer connection timeout and keepalive behavior.

Also normalized auth identity input:

- Email is trimmed and lowercased before lookup/create.
- Name is trimmed before registration.

Changed files on server:

- `/opt/aispeaker/app/server/db.ts`
- `/opt/aispeaker/app/server/routers.ts`

### Environment configuration

Updated production environment files to use the confirmed external MySQL database endpoint.

Changed files on server:

- `/opt/aispeaker/app/prod.env`
- `/opt/aispeaker/app/.env.production`

Sensitive values are intentionally not included in this report.

## Verification

### Build

Result:

- `pnpm build` completed successfully on the AWS server.

### Service

Result:

- `aispeaker.service` is active after restart.
- Recent logs no longer show the previous database access-denied failure.

### Public routes

Verified after deployment:

- `https://aispeaker.cc/` returns 200
- `https://aispeaker.cc/login` returns 200
- `https://aispeaker.cc/signin` returns 200
- `https://aispeaker.cc/register` returns 200
- `https://aispeaker.cc/signup` returns 200

The original 404 on `/signup` is resolved.

### Auth route test

A direct server-side auth verification script was run against the deployed app code.

Verified:

- Register flow succeeded.
- Login flow succeeded.
- Session cookie options were generated correctly for HTTPS.

Note:

- This created temporary test users using `codex-prod-auth-...@example.com`.

## GitHub Status

The active GitHub PR is:

- `https://github.com/alphabag2026/aispeaker/pull/1`

The production server has been patched and deployed first. The deployed patch files have been preserved locally under:

- `server-deploy-files/`

## Remaining Recommendations

1. Rotate exposed credentials before formal launch.
   Several API keys and database credentials were shared in chat. Even if the site is not officially open, these should be rotated before production launch.

2. Close external MySQL port `3306` after testing.
   Keep it open only for the exact test IP range if continued direct database access is required.

3. Remove or mark temporary test accounts.
   Search for `codex-prod-auth-` users in the database after final QA.

4. Keep server and GitHub source synchronized.
   The auth route and session cookie fixes have been reflected in the PR. The deployed database pool hardening should be reconciled before future redeploys if the PR branch still differs from the server source.
