# Warehouse Rush — play it live

A 60-second warehouse memory + route puzzle for GameCraft 2026.

- **Play:** https://warehouse-rush.vercel.app/ (Vercel, always-on) or https://Swamy-ERP.github.io/warehouse-rush/ (GitHub Pages).
- Enter your name, read the instructions, hit **Start**, and complete as many shifts as you can before the bay closes.
- Works on desktop and mobile (touch). Sound starts after you enter your name; press **M** to mute.
- **Shared leaderboard:** the Vercel deployment serves a shared Top-10 via `/api/leaderboard` — visible on the results screen at the end of each game, auto-detected by the game. Link a free Vercel KV database in the dashboard (Storage → Create Database → KV) for durable scores across cold starts. Without KV the board falls back to per-device Top 10.

<!-- deploy-marker-002 -->
