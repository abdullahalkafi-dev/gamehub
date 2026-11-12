# GameHub API

Base URL `https://api.gamehub.joura.info`. JSON in and out. Errors: `{ "error": { "code", "message" } }`.
Auth: cookie `gh_token` (web, changes need `X-Requested-With: gamehub`) or `Authorization: Bearer <token>` (mobile; send `X-Client: mobile` on login/register to receive `token`).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | no | liveness |
| POST | `/auth/register` | no | `{email,password,displayName}` → user (201), +100 coins |
| POST | `/auth/login` | no | `{email,password}` |
| POST | `/auth/logout` | no | clears cookie |
| GET | `/auth/me` | yes | `{user, balance}` (`balance` null if game service is down) |
| PATCH | `/auth/me` | yes | `{displayName}` |
| POST | `/auth/change-password` | yes | `{currentPassword,newPassword}` |
| GET | `/rooms` | yes | lobby: global room, public rooms, own private rooms |
| POST | `/rooms` | yes | create `{name,visibility,capacity,chips,maxPerTarget,timing}` (max 3 per user) |
| GET | `/rooms/by-code/:code` | yes | look up a private room by code |
| POST | `/rooms/:key/join` | yes | `{inviteCode?}` → `{playUrl, expiresIn, room}` (use `main` for global) |
| POST | `/rooms/join-by-code` | yes | `{code}` → same as join |
| DELETE | `/rooms/:key` | owner/admin | delete (409 `room_busy` if players inside) |
| GET | `/shop/packages` | no | five demo packs |
| POST | `/shop/purchase` | yes | `{packageId, clientKey}` → credits coins (idempotent per clientKey) |
| GET | `/shop/purchases` | yes | own purchases |
| GET | `/history` | yes | `?limit&before&room` own rounds, newest first, with `roomName` |
| GET | `/history/stats` | yes | totals, win rate, biggest win, per room |
| GET | `/leaderboard` | yes | `?period=day|week|month|all&metric=winnings|net|biggest_win|wagered&room=main` |
| GET | `/admin/overview`, `/admin/users?page`, `/admin/rooms` | admin | |
| POST | `/webhooks/minigame` | HMAC | MiniGame Studio events (raw body, `X-Minigame-Signature`) |

Common codes: `validation_error` 400, `invalid_credentials` 401, `csrf_blocked` 403, `invalid_invite_code` 403/404, `room_limit` 409, `room_full` 409, `email_taken` 409, `game_service_unreachable` 502.
