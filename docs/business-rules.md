# Business rules

## Roles
- **Visitor** (signed out): can open Login and Register only. Everything else returns 401 or redirects to Login.
- **Player**: own wallet, own history, rooms, shop, leaderboard.
- **Admin**: everything a player can do, plus `/admin` (counts, users, rooms, webhook log) and deleting any room. The first admin is created at startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (demo: `admin@gamehub.demo`).

## Accounts
- Email + password (8 to 72 chars, bcrypt). Display name 2 to 24 chars. No email verification, password reset or OTP in version 1.
- Login/register are limited to 10 tries per minute per IP. A wrong email and a wrong password give the same answer.
- Web: httpOnly cookie, changes need header `X-Requested-With: gamehub` (CSRF guard). Mobile: `Authorization: Bearer`, token returned when the request has `X-Client: mobile`.

## Coins
- A new account gets **100 coins** exactly once: credit reference `signup:<userId>`. If the game service is down at signup, the account is still created and the bonus is paid on the next balance read.
- The game wallet is the single source of truth for the balance. Player id in the game = our user id.
- Free refill is off. Coins come from the shop only.

## Shop (fake)
Packages: Starter 500 ($0.99), Popular 1,650 ($2.99, +10%), Value 6,000 ($7.99, +20%), Pro 25,000 ($24.99, +25%), VIP 130,000 ($99.99, +30%). Nobody is charged.
- Each press of Buy carries a `clientKey`. `(user, clientKey)` is unique and the credit reference is `buy:<purchaseId>`, so retries and double taps credit once. Reusing a key for another package is refused (409).

## Rooms
- **Global room** (`main`): always exists, open to everyone, cannot be deleted. Chips 1/5/10/25/100, max 500 per option.
- **Player rooms**: public (listed) or private (hidden, 6-character invite code, owner always allowed). Name 3 to 40 chars, capacity 2 to 50 (default 20), 2 to 5 chips from `1,5,10,25,50,100,250,500,1000`, max bet per option 10 to 5000, betting time 8 to 120 s.
- Max **3 rooms per user**. The count is race-safe (insert, count, roll back extras). Slots are freed when the platform deletes a room.
- Empty rooms are deleted by the game platform after **30 minutes** (`deleteWhenEmptyMinutes`).
- Only the owner (or an admin) can delete a room; the platform refuses while players are inside (409).
- Capacity is a soft limit on the platform ("a few extra players can slip in").
- A play link lasts 15 minutes and is requested only when a player presses Join.

## History and rankings
- History and stats are read from the platform's rounds API for the signed-in user only (the id never comes from the request). Stats use the latest 1,000 rounds.
- Leaderboard shows names, never ids. Periods: day, week, month, all. Metrics: winnings, net, biggest win, wagered.
- Webhooks (`round.settled` etc.) are verified (HMAC, 5-minute window), deduplicated by event id and logged. Events of other games on the account are ignored.

## Edge cases
- Two people press Buy twice at once with the same key: one credit.
- Game service down: login works, balance shows "—", join returns a clear error.
- Room deleted while someone holds its link: the platform moves them to the Global room.
