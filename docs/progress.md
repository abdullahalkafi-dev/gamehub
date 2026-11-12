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
