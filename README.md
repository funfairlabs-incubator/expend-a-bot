# Expend-a-bot 🧾

> AI-powered receipt triage for frequent travellers.  
> Scan on your phone → Drive → Claude extracts everything → file by trip → email to accounts.

**Live:** [expenses.funfairlabs.com](https://expenses.funfairlabs.com)

---

## How it works

```
📱 Phone camera
      │
      ▼
Google Drive /receipts/Pending          ← you drop receipts here
      │
      │  Drive webhook (instant push)
      ▼
Cloudflare Worker
      │
      ├─ Downloads image from Drive
      ├─ Sends to Claude Haiku (AI extraction)
      │    └─ merchant, date, time, address, customer name,
      │       nationality, items, taxes (VAT/GST/city tax/etc),
      │       payment method, card last 4, subtotal, tip, discount...
      │
      ├─ Stores as "pending" in KV
      └─ Pushover notification → your phone 📲
              │
              ▼
        expenses.funfairlabs.com  (Cloudflare Pages)
              │
              ▼
        📥 Inbox — tap receipt card
              │
              ▼
        Triage modal — review/correct AI fields, assign trip + year
              │
              ▼
        Worker moves file:
          /receipts/Pending/img.jpg
               →  /receipts/2026/Cisco Office Visit/cisco_20260115.jpg
              │
              ▼
        📋 Expenses tab — full history, grouped by trip
              │
              ▼
        ✉️ Email trip → CSV + all receipts → Gmail → accounts team
```

---

## Notification behaviour

| Event | Pushover |
|---|---|
| New receipt arrives in `/receipts/Pending` | Instant push — merchant, amount, deep link |
| Any pending receipts at 8am UTC daily | Quiet digest — count + oldest age |
| >5 pending receipts | High priority (bypasses Do Not Disturb) |

---

## Stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | React + Vite → Cloudflare Pages | Free |
| Backend | Cloudflare Worker | Free |
| Data | Cloudflare KV | Free |
| Auth | Google OAuth 2.0 | Free |
| Storage | Google Drive (`/receipts/`) | Free (your 15 GB) |
| Email | Gmail API | Free |
| AI extraction | Claude Haiku | ~£0.001/receipt |
| Notifications | Pushover | One-time ~£5 |

**Monthly cost: ~£0** for normal personal use.

---

## Folder structure

```
expend-a-bot/
├── worker/                  # Cloudflare Worker (backend)
│   ├── src/
│   │   └── index.js         # All routes, Drive webhook, AI, Pushover
│   ├── wrangler.toml        # Worker config (no secrets here — use wrangler secret)
│   └── package.json
├── frontend/                # React app (Cloudflare Pages)
│   ├── src/
│   │   ├── App.jsx          # Full UI — inbox, triage modal, expenses, email
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example         # Copy to .env, set VITE_API_URL
├── .github/
│   └── workflows/
│       ├── deploy-worker.yml    # Auto-deploy worker on push to main
│       └── deploy-frontend.yml  # Auto-deploy frontend on push to main
└── README.md
```

---

## Drive folder structure

```
My Drive/
└── receipts/
    ├── Pending/                        ← phone drops receipts here
    ├── 2025/
    │   └── Hong Kong Q4/
    │       ├── cathay_pacific_20251104.jpg
    │       └── four_seasons_20251105.jpg
    └── 2026/
        ├── Cisco Office Visit/
        │   └── cisco_canteen_20260115.jpg
        └── London Client/
            └── train_20260203.jpg
```

---

## Deploy guide

### Prerequisites

```bash
npm install -g wrangler
wrangler login
```

### 1 — Google Cloud

1. Create project **Expend-a-bot** at https://console.cloud.google.com
2. Enable **Google Drive API** and **Gmail API**
3. OAuth consent screen → External → add scopes:
   - `openid email profile`
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/gmail.send`
   - Add yourself as test user
4. Credentials → Create → OAuth client ID (Web app)
   - Redirect URI: `https://expend-a-bot.YOUR_SUBDOMAIN.workers.dev/auth/google/callback`
5. Note **Client ID** and **Client Secret**

### 2 — Pushover

1. Install Pushover app (https://pushover.net, ~£5)
2. Note your **User Key** from the home screen
3. Create an application → note **API Token**

### 3 — Cloudflare KV

```bash
cd worker
wrangler kv:namespace create KV
# Paste the returned id into wrangler.toml
```

### 4 — Secrets

```bash
cd worker
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put ANTHROPIC_API_KEY       # console.anthropic.com
wrangler secret put WEBHOOK_SECRET          # openssl rand -hex 24
wrangler secret put PUSHOVER_API_TOKEN
wrangler secret put PUSHOVER_USER_KEY
```

### 5 — Deploy worker

```bash
cd worker
npm install
wrangler deploy
# Note worker URL — update wrangler.toml APP_URL + FRONTEND_URL
```

### 6 — Deploy frontend

```bash
cd frontend
cp .env.example .env
# Edit .env: VITE_API_URL=https://your-worker.workers.dev
npm install && npm run build
wrangler pages deploy dist --project-name expend-a-bot
```

### 7 — Custom domain

In Cloudflare Pages dashboard → your project → Custom domains → add `expenses.funfairlabs.com`

### 8 — First login

Sign in → app calls `/api/subscribe` which:
- Creates `/receipts/Pending` in your Drive
- Registers the Drive webhook
- Starts the Pushover notification flow

---

## GitHub Actions (CI/CD)

Secrets to add in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `CF_API_TOKEN` | Cloudflare API token with Workers + Pages deploy permissions |
| `CF_ACCOUNT_ID` | Your Cloudflare account ID |
| `VITE_API_URL` | Your worker URL |

Push to `main` → worker and frontend deploy automatically.

---

## Local development

```bash
# Terminal 1 — Worker
cd worker && wrangler dev

# Terminal 2 — Frontend  
cd frontend
echo "VITE_API_URL=http://localhost:8787" > .env
npm run dev
```

---

## Secrets management

**Nothing sensitive is ever committed.** All secrets go through:
- `wrangler secret put` for the Worker (stored in Cloudflare, never in code)
- `.env` locally for the frontend (git-ignored)
- GitHub Actions secrets for CI/CD

The `wrangler.toml` contains only non-sensitive config vars (`APP_URL`, `FRONTEND_URL`, cron schedules).

---

## Receipt fields extracted by AI

The Claude Haiku model extracts whatever is present on each receipt:

- Merchant name, address, phone, website
- Date, time
- Customer name, address, nationality
- Room/folio number, check-in/check-out dates
- Payment method, card last 4 digits
- Line items (description, qty, unit price, total)
- Subtotal, multiple tax lines (VAT, GST, city tax, service charge, etc.)
- Tip / gratuity, discounts
- Receipt/order numbers
- Any other notes (VAT registration numbers, terms, etc.)

Fields absent from the receipt are omitted — no empty strings.
