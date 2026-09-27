# Server Architect Bot

A Discord bot with three jobs:

1. **`/build`** — describe any community in plain English and it uses Gemini to design and create the categories, channels and roles for it.
2. **`/setup`** — instant built-in layouts (Roblox, general gaming, study group) with no AI call needed.
3. **`/antiraid`** + **`/lockdown`** — automatic raid detection (mass-join bursts trigger a temporary verification lockdown + mod alert) and a manual panic button to freeze every text channel.

This is a real Node.js project — it needs to run continuously somewhere, it isn't a file you open in a browser.

## 1. Create the Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → **Reset Token**, copy it → this is `DISCORD_TOKEN`.
3. On the same **Bot** tab, turn on **Server Members Intent** under Privileged Gateway Intents (anti-raid needs this to see joins).
4. **OAuth2 → General** → copy the **Client ID** → this is `DISCORD_CLIENT_ID`.
5. **OAuth2 → URL Generator** → scopes: `bot`, `applications.commands` → permissions: easiest is **Administrator** (the bot needs Manage Channels, Manage Roles, Kick/Ban Members, Manage Server, and Manage Messages at minimum — Administrator just covers all of it so channel/role creation never silently fails). Open the generated URL and invite the bot to your server.

## 2. Get a Gemini API key

[Google AI Studio](https://aistudio.google.com/) → **Get API key** → copy it → this is `GEMINI_API_KEY`. Free tier is enough to try this out.

## 3. Configure

```
cp .env.example .env
```

Fill in `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `GEMINI_API_KEY`.

`DISCORD_GUILD_ID` is optional — if you set it, slash commands appear instantly on that one server (great for testing). Leave it blank once you're ready for global commands (takes up to ~1 hour to roll out everywhere, but then it's live on every server the bot joins).

## 4. Install, register commands, and run

```
npm install
npm run deploy   # registers the slash commands with Discord (run again if you edit a command)
npm start        # starts the bot
```

## 5. Try it

- `/setup preset:Roblox community` — instant, no AI call.
- `/build description: a Minecraft SMP for 20 friends` — AI-generated, tailored to what you typed.
- `/antiraid action:enable` — turns on raid protection with the defaults (6 joins in 10s).
- `/lockdown action:lock` — freezes every text channel right now, no matter what.

## Where to run this 24/7

It needs to stay running, so a static file host (Netlify, GitHub Pages — what your other projects use) won't work here. Recommended, roughly easiest → most control:

- **[Railway](https://railway.app)** — connect the GitHub repo, it detects Node.js automatically, add your `.env` values as environment variables in its dashboard. Has a small free trial credit, then a few dollars a month. This is the one I'd start with.
- **Render** — same idea as Railway, "Background Worker" service type (not "Web Service", since this bot has no web server).
- A cheap VPS (e.g. Oracle's free tier, or a $5/mo box) — most control, more setup: install Node, `pm2 start index.js` to keep it alive across restarts.

Don't use Replit's free tier for this long-term — it sleeps when idle, which means your anti-raid protection silently stops working.

## How the anti-raid detection works

Every join is logged in memory per-server. If `threshold` joins happen within `window_seconds`, the bot:
1. Raises the server's verification level to the highest setting for 15 minutes (blocks brand-new/unverified accounts from doing anything).
2. Posts an alert (pinging a role with "mod", "admin" or "staff" in its name, if one exists) to your configured log channel, or the first channel it can post in.
3. Automatically reverts the verification level after 15 minutes.

`/lockdown` is separate and manual — it doesn't touch verification level, it directly removes everyone's ability to send messages in every text channel until you `/lockdown action:unlock`. Use it if a raid is already causing damage and you want everything silent immediately.

## Limits worth knowing

- `/build` and `/setup` cap out at 8 categories, 6 channels per category, 8 roles per run — even if you ask for something huge, so one command can't blow through Discord's per-server channel/role limits or get the bot rate-limited.
- Settings (`/antiraid` config) are stored in `data/guilds.json`, a plain file next to the code. Fine for one bot on a handful of servers; move to a real database if this grows a lot.
