# Progress log

## 2026-11-12 19:30 to 22:30 (Asia/Dhaka)
**Audit and plan.** Read the MiniGame Studio docs, inspected the VPS read-only (shared host with nginx on 80/443, 11 of 16 GB RAM used, other apps on ports 3000/3002/3010/4000/5000/8080/8088). Sent 18 questions to the provider; they shipped a rounds-history API, per-option bets in webhooks, room metadata and auto-delete, `startingBalance` and a 5,000-room cap, and confirmed live balance refresh after credit.

**Built (phases 1 to 4).**
- Backend: auth (cookie + bearer, CSRF header), signup bonus, rooms, shop, history/stats, leaderboard, webhook receiver, admin. Tests: 26 passing (in-memory MongoDB + fake game platform).
- Frontend: Next.js app with all screens. Browser journey (Edge via Playwright) passed on 1280 px and 390 px: sign-in guard, create private room, play page, shop purchase (100 → 1,750 coins), history with load more, admin guard. No horizontal overflow on any screen. Fixed during review: square card corners (Tailwind 4 syntax), logo spacing, delete button icon, self-referencing font variable.
- Not verified: the real game inside the iframe (needs the Managed wallet mode, see blockers), real webhook delivery (needs secret and address saved on the API key page).

**Business rules.** No changes after approval. Decisions made on the user's behalf: admin demo email `admin@gamehub.demo`; leaderboard scope All rooms or Global room; stats read the latest 1,000 rounds.

**Blockers.**
1. The live game reports `walletMode: "demo"`, so credit calls fail with `wallet_not_enabled`. Fix: game → Settings → "Managed by my server" → Save.
2. Webhook: on the API key page set the address to `https://api.gamehub.joura.info/webhooks/minigame`, copy the signing secret and give it to us (`MINIGAME_WEBHOOK_SECRET`). History does not depend on it.
3. Security hygiene: the live API key and the Atlas password were shared in chat. Rotate the key on the API key page and use a dedicated Atlas user limited to `gamehub`.

**Next.** Deploy (phase 5), then the Flutter APK (phase 6).

## 2026-11-12 22:30 to 23:45 (Asia/Dhaka)
**Phase 5, deploy (commit `ee034f3`).** Live at https://gamehub.joura.info (web) and https://api.gamehub.joura.info (API). Container, nginx and certificate details in `docs/deploy/changes.md`. Checks run on the live site: health, web 200, http→https 301, CORS accepts only the web origin, signed-out requests return 401, register and lobby work. Atlas accepts the server's IP.

**Phase 6, Flutter app (`mobile/`).** Login/register, rooms (global, create, join by code, delete own), play (WebView with the `MiniGames` channel, out-of-coins sheet), history with stats, shop, profile. `flutter analyze`: no issues. Release APK built (about 51 MB) and uploaded to `https://gamehub.joura.info/download/gamehub.apk`. On an Android emulator against the live API: login screen, login and the lobby verified. The game WebView was **not** verified (the emulator crashed; the wallet is also not in managed mode yet).

**Cleanup.** Deleted my two smoke-test accounts from the `gamehub` database (only the admin remains). Local throwaway servers stopped.

**Still unverified / pending.** (1) Game wallet mode must be switched to Managed, then re-test signup bonus (100), shop purchase and the game itself on web and phone. (2) Webhook secret and address. (3) The APK uses the debug signing key. (4) Rotate the shared API key and Atlas password.

**Next action.** After the two dashboard settings, run a full live journey: register, see 100 coins, play a round, check history, buy a pack.

## 2026-11-12 late evening (Asia/Dhaka), wallet switched to Managed
Blocker 1 is resolved: the game now reports `walletMode: "managed"`. Live browser journey on https://gamehub.joura.info (Edge, 1280 px): signup shows **100 coins**; buying the Popular pack moves the balance **100 → 1,750** instantly; the Global room loads the real Lucky Wheel 77 in the iframe with the live balance; a private room was created and opened; history page loads (empty until a round is played). No server errors. The test account was deleted. One empty test room (`u9df0e94591df`) could not be deleted at once (a player had just left, HTTP 409) and closes by itself after 30 minutes.
Still pending: webhook address and secret; playing real rounds to see history fill; the Flutter WebView on a phone; rotate the shared API key and Atlas password; release signing for the APK.

## 2026-11-13 (Asia/Dhaka), APK install fix
A Vivo phone refused the first APK ("package appears to be invalid, missing the developer certificate"). Cause: it was signed only with the generic Android debug certificate and only the v2 scheme. Fix: created a GameHub release keystore (gitignored), signed with v1+v2+v3 (checked with apksigner, v1 verified as Android 6+), switched to a per-ABI build (arm64 is 17.8 MB instead of 51 MB) and replaced `gamehub.apk` on the server. Because the signing certificate changed, anyone who installed the first APK must uninstall it first.
