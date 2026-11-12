# Changes made on the server

All changes are limited to GameHub. Nothing belonging to other apps was touched.

## 2026-11-12 (Asia/Dhaka), first release, commit `ee034f3`
- Created `/opt/gamehub` (git clone of `abdullahalkafi-dev/gamehub`, detached at the deployed commit).
- Wrote `/opt/gamehub/backend/.env` (mode 600) with a freshly generated `JWT_SECRET` and admin password.
- `docker compose up -d --build`: containers `gamehub-api-1`, `gamehub-web-1`, network `gamehub_default`, localhost ports 4110 and 3110.
- nginx: added `gamehub.joura.info` and `api.gamehub.joura.info` (sites-available + sites-enabled symlinks); reloaded after `nginx -t`. A temporary port-80 file used for validation was removed.
- certbot: issued certificate `gamehub.joura.info` (both names). Existing certificates untouched.
- Created `/var/www/gamehub/download/` and uploaded `gamehub.apk`; added the `/download/gamehub.apk` location to the web vhost.
- Memory before/after the deploy: about 11.1 GB used of 16 GB before; the two containers are capped at 704 MB total.

## Verification run after the release
HTTPS health, web 200, http to https 301, CORS preflight accepts only the web origin, signed-out access returns 401, register and lobby work on the live API, Android app login and lobby work against the live API.

## Not yet verified
Real coin credit, the game inside the iframe or WebView, and real webhook delivery, because the game's wallet mode is still "demo" and the webhook secret is not set (see README, one-time dashboard settings).
