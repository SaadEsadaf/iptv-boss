# IPTV Boss — Project Map

## Tech Stack
- **Runtime**: Node.js v20.20.2 (LTS)
- **Backend**: Express.js, port 3001
- **Frontend**: React + Vite (Tailwind CSS v4)
- **Database**: SQLite via better-sqlite3
- **Auth**: JWT + bcryptjs
- **Process Manager**: PM2

## System Flow

### Providers & Plans
```
Admin → Providers tab
  ├── Provider card (stats: codes, trials, orders, revenue)
  │     └── Plans list (name, duration, price, stock badge, ✏️ edit, 🗑 delete)
  ├── + Add Provider button
  ├── + Plan button → modal (name, type, duration, price, channels, streams, sellup ID)
  └── + Codes / M3U URL / Sync / Provision buttons

Landing page → GET /api/plans
  ├── Duration toggle [3mo, 6mo, 12mo]
  ├── Shows closest plan by duration_months
  └── Checkout: planId → server re-fetches plan.price_sell → order.amount
```

### Pricing Model (since 2026-06-13)
- Each provider has 3 active plan entries with different durations:
  - "3 Mois" → 3mo, €15
  - "6 Mois" → 6mo, €30
  - "12 Mois" → 12mo, €55
- Plus optional trial plan (Essai 24h, free)
- Each plan has its own activation code pool and sellup_product_id

## Architecture

### Key Files
| File | Purpose |
|------|---------|
| `server/index.js` | Main entry, mounts all routes, schema injection for GEO |
| `server/db.js` | SQLite schema (36 tables), migrations, seed data |
| `server/services/panelManager.js` | Provider stats + plan listing |
| `server/routes/admin.js` | Admin CRUD (providers, plans, codes, orders, settings) |
| `server/routes/panelManagement.js` | Panel sync, M3U ingestion, stats |
| `server/routes/checkout.js` | Payment processing (Sellup/Stripe/PayPal) |
| `client/src/components/AdminTabs/Providers.jsx` | Admin providers UI with plan CRUD |

## Orphans & Pending

### Empty — all items resolved
