# Design

Dark casino look: near-black background, **gold** for money and primary calls to action, **violet** for navigation and secondary actions.

| Token | Value | Use |
|---|---|---|
| bg / surface / surface-2 | `#0a0a12` / `#13131f` / `#1b1b2b` | page, cards, inputs |
| line | `#2a2a40` | borders |
| ink / muted | `#f1f0fa` / `#a09fba` | text (muted passes 7:1 on bg) |
| gold | `#f6bd45` | coins, main buttons |
| violet | `#8467ff` | secondary buttons, selection |
| win / loss | `#3ddc97` / `#ff6b7a` | results |

Fonts: Space Grotesk (headings, numbers), Inter (text). Radius 1.1 rem cards, 0.75 rem controls. Tokens live in `frontend/src/app/globals.css`.

## Screens
Login / Register → Lobby (Global room hero, player rooms, join with code) → Create room → Play (full screen game, balance, back) → History (stats, per-room chips, expandable rounds) → Shop (5 packs, demo notice, purchases) → Leaderboard → Profile → Admin.

## Patterns
- Every list has a skeleton while loading, an empty state with an action, and an error state with Try again.
- Mobile: bottom tab bar, 44 px touch targets, no horizontal scroll (checked at 390 px). Desktop: top navigation.
- Accessibility: labelled inputs, visible gold focus ring, `aria-current`, `aria-pressed`, dialogs close with Esc, reduced-motion respected.
- Coins are shown with thousands separators; purchases say "Demo" everywhere.
