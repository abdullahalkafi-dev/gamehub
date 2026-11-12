# Architecture

```
Browser / Flutter app ──HTTPS──▶ nginx ──▶ web  (Next.js, :3110)
        │                          └──────▶ api  (Express, :4110) ──▶ MongoDB Atlas (db gamehub)
        │                                          │  API key (server only)
        └─ iframe / WebView (play link) ◀──────────┴──▶ MiniGame Studio (wallet, rooms, rounds, leaderboard)
                                                   ▲
                                 webhooks (signed) ┘  POST /webhooks/minigame
```

## Backend (`backend/src`)
- `app.ts` builds the Express app (no listening), `server.ts` connects, seeds the admin, configures the global room, listens.
- `modules/<name>/` holds router (wiring), controller (HTTP), service (rules), model (Mongoose), validation (zod). Small modules combine files.
- `lib/minigame.ts` is the only code that talks to MiniGame Studio. Tests swap it with `FakeMiniGame` via `setMiniGame()`.
- `middleware/auth.ts` (bearer or cookie + CSRF header), `middleware/errorHandler.ts` (one JSON error shape `{error:{code,message}}`).
- Data: `User`, `Room` (owner, privacy, invite code, settings), `Purchase`, `WebhookEvent` (30-day TTL). Balances and rounds live in MiniGame Studio.
- Query design: lobby = 1 platform call per 100 rooms + 2 DB queries; history names = 1 batch query per page (no N+1). Indexes: unique user email, room key, invite code, `(userId, clientKey)`, `(userId, createdAt)`.

## Frontend (`frontend/src`)
- `app/(auth)` login/register, `app/(app)` private pages wrapped by `AppShell` (auth gate + navigation), `play/[key]` is full screen.
- One RTK Query API (`features/api/api.ts`) with cookie credentials and the CSRF header; shared state is only toasts. The store is created per provider instance.
- `features/<name>` for screens, `components/ui.tsx` for the design system.
- The game iframe accepts messages only from the play URL's origin and its own window (`needCoins` opens the quick shop, `round` refreshes balance/history, `exit` returns to the lobby).

## Add a module
Backend: create `modules/x/` with model, service, router; mount it in `app.ts`; add tests in `tests/`. Frontend: add endpoints to `features/api/api.ts`, a screen in `features/x/`, a page in `app/(app)/x/page.tsx`.
