# Password Hash Exposure Hotfix

## Summary

- Date: 2026-05-18
- Target: `https://aispeaker.cc`
- Status: deployed to AWS and verified

## Issue

The production smoke test showed that `auth.register` and `auth.login` returned a `user` object containing `passwordHash`.

Although this is a hash, it must not be exposed through any public API response.

## Fix

Added a shared auth response sanitizer in `server/routers.ts`:

- Removes `passwordHash` from returned user objects.
- Applies to:
  - `auth.register`
  - `auth.login`
  - `auth.googleLogin`

## Deployment

- Updated `/opt/aispeaker/app/server/routers.ts`
- Created a timestamped backup in `/opt/aispeaker/app/backups/`
- Ran production build successfully.
- Restarted `aispeaker.service` successfully.
- Service status after restart: active

## Verification

Updated the production smoke test to fail if any auth response contains `passwordHash`.

Result:

- 36 tests passed
- 0 tests failed
- `auth.register`: passed without `passwordHash`
- `auth.login`: passed without `passwordHash`

## Remaining

The AWS server is fixed. The GitHub PR branch still needs `server/routers.ts` synchronized before future redeploys from GitHub, otherwise this server-side hotfix can be overwritten.
