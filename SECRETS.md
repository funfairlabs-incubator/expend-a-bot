# Secrets Management

This project follows a strict **no-secrets-in-code** policy.  
This repo is public — treat every file as publicly visible.

---

## Worker secrets

Set via Wrangler CLI — stored encrypted in Cloudflare, never in this repo:

```bash
cd worker

wrangler secret put GOOGLE_CLIENT_ID        # Google OAuth client ID
wrangler secret put GOOGLE_CLIENT_SECRET    # Google OAuth client secret
wrangler secret put ANTHROPIC_API_KEY       # From console.anthropic.com
wrangler secret put WEBHOOK_SECRET          # Random string: openssl rand -hex 24
wrangler secret put PUSHOVER_API_TOKEN      # From pushover.net → Your Applications
wrangler secret put PUSHOVER_USER_KEY       # From pushover.net home screen
```

To view currently set secrets (names only, not values):
```bash
wrangler secret list
```

---

## Frontend secrets

The frontend has **no secrets** — it only needs the worker URL, which is not sensitive.

```bash
cd frontend
cp .env.example .env
# Edit .env: set VITE_API_URL to your worker URL
```

`.env` is git-ignored. The `.env.example` file shows the shape with no real values.

---

## GitHub Actions secrets

For automated CI/CD deployment, add these in:  
**GitHub → Settings → Secrets and variables → Actions**

| Secret name | What it is |
|---|---|
| `CF_API_TOKEN` | Cloudflare API token — create at https://dash.cloudflare.com/profile/api-tokens with `Workers Scripts:Edit` + `Cloudflare Pages:Edit` permissions |
| `CF_ACCOUNT_ID` | Your Cloudflare account ID (shown in dashboard sidebar) |
| `VITE_API_URL` | Your deployed worker URL e.g. `https://expend-a-bot.xyz.workers.dev` |

---

## What's safe to commit

✅ `wrangler.toml` — contains only non-sensitive config (`APP_URL`, `FRONTEND_URL`, cron schedules, KV namespace ID)  
✅ `.env.example` — template with no real values  
✅ All source code  

❌ `.env` — git-ignored  
❌ `.dev.vars` — git-ignored  
❌ Any file containing API keys, tokens, passwords, or OAuth secrets  
