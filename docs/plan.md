# Plan (approved 2026-11-12)

Goal: web + API (and a simple Flutter APK) where players sign up with email and password, get 100 demo coins, play Lucky Wheel in the Global room or in player-made public/private rooms, see their full history, rankings, and buy demo coin packs.

Scope decisions: see `business-rules.md`. Hosting: shared VPS, Docker Compose project `gamehub`, nginx on the host, domains `gamehub.joura.info` and `api.gamehub.joura.info`, MongoDB Atlas database `gamehub`.

| Phase | Content | Done when | Status |
|---|---|---|---|
| 1 | Backend foundation: auth, wallet bonus, MiniGame client | API tests pass | done |
| 2 | Rooms: global, create, private codes, limits | room tests (limit, privacy, race) pass | done |
| 3 | Shop, webhook, history, leaderboard, admin | shop concurrency + webhook + history tests pass | done |
| 4 | Web UI | typecheck, build, browser journey on desktop 1280 and mobile 390 | done (journey passed with the fake game platform) |
| 5 | Deploy to the VPS | https health ok, register works on the live site | done (see `deploy/changes.md`) |
| 6 | Flutter APK | `flutter analyze` clean, APK builds, login and join work against the live API | built; login and lobby verified, game WebView pending (see `progress.md`) |

Open dependency on the game provider side: the game must be set to **Managed** wallet mode and the webhook address/secret saved on the API key page (see `progress.md`).
