# Deploying GameHub

## Where it runs
- Server: the shared VPS (Ubuntu 24.04, Docker, host nginx on 80/443). Repo at `/opt/gamehub` (detached at the deployed commit).
- Compose project `gamehub`: `gamehub-api-1` (127.0.0.1:4110, 320 MB limit) and `gamehub-web-1` (127.0.0.1:3110, 384 MB limit). MongoDB is Atlas (database `gamehub`), nothing stored on the server except the APK.
- nginx: `/etc/nginx/sites-available/{gamehub,api.gamehub}.joura.info` (copies of `scripts/nginx/`). One Let's Encrypt certificate `gamehub.joura.info` covering both names, auto-renewed by certbot.
- Secrets: `/opt/gamehub/backend/.env` (mode 600, never in git). Variable names are in `backend/.env.example`. The web build gets `NEXT_PUBLIC_API_URL` from `compose.yaml` (default `https://api.gamehub.joura.info`).
- Android app: `https://gamehub.joura.info/download/gamehub.apk` (file in `/var/www/gamehub/download/`).

## Update to the latest main
```
ssh root@<server>
cd /opt/gamehub && scripts/deploy.sh            # or: scripts/deploy.sh <commit>
```
The script fetches, checks out the ref, runs `docker compose up -d --build`, checks both health URLs and appends the commit to `deployed.log`.

## Roll back
`cd /opt/gamehub && scripts/deploy.sh <previous-commit>` (see `deployed.log`). Data is in Atlas and the game platform, so rolling back code does not lose data.

## Back up
- Database: Atlas backups / `mongodump` of database `gamehub` (users, rooms, purchases, webhook log).
- Configuration: copy `/opt/gamehub/backend/.env` somewhere safe.
- Balances, rounds and rankings live in MiniGame Studio.

## New APK
```
cd mobile && flutter build apk --release --split-per-abi
scp build/app/outputs/flutter-apk/app-arm64-v8a-release.apk root@<server>:/var/www/gamehub/download/gamehub.apk
```
- The release is signed with our own certificate (CN=GameHub) using v1, v2 and v3 signatures. Some phones (e.g. Vivo) refuse APKs signed only with the generic Android debug certificate ("package appears to be invalid, missing the developer certificate").
- Signing files are **not in git**: `mobile/android/gamehub-release.jks` and `mobile/android/key.properties` (store/key password, alias `gamehub`). **Back both up somewhere safe.** If they are lost, phones will refuse to update an installed app and everyone must uninstall first. Without `key.properties` the build falls back to the debug key.
- The phone build is arm64 (almost every phone since 2017). A 32-bit phone needs `app-armeabi-v7a-release.apk`.

## One-time dashboard settings (game provider)
1. Game → Settings → Where do coins come from → **Managed by my server** → Save.
2. API key page → Webhooks → address `https://api.gamehub.joura.info/webhooks/minigame`, copy the signing secret into `MINIGAME_WEBHOOK_SECRET` in the server `.env`, then `docker compose up -d` and press "Send test".
3. Game → Settings → Allowed websites → add `https://gamehub.joura.info` (does not affect the app).
4. Rotate the API key (it was shared in chat) and update `MINIGAME_API_KEY`.

## Operate
`docker compose -f /opt/gamehub/compose.yaml ps | logs -f api | restart api`
