# Warehouse Rush — play it live

A 60-second warehouse memory + route puzzle for GameCraft 2026.

- **Play:** https://warehouse-rush.vercel.app/ (Vercel, always-on) or https://Swamy-ERP.github.io/warehouse-rush/ (GitHub Pages).
- Enter your name, read the instructions, hit **Start**, and complete as many shifts as you can before the bay closes.
- Works on desktop and mobile (touch). Sound starts after you enter your name; press **M** to mute.
- **Shared leaderboard:** the Vercel deployment serves a shared Top-10 via `/api/leaderboard` — visible on the results screen at the end of each game, auto-detected by the game. It persists in the connected Vercel Redis database (`REDIS_URL`), so scores survive cold starts and are shared across all players.

