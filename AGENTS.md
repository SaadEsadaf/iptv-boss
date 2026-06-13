# IPTV Boss

## Owner
- **Email**: babilon26@gmail.com
- When the owner says "send me", send credentials/emails to this address.

Full-stack IPTV business management platform. Sells subscriptions, manages providers/activation codes, deploys landing pages, sniffs the web for leads, runs SEO audits, and tracks inventory.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (built to `client/dist/`) |
| Backend | Express.js, port **3001** |
| Database | SQLite via `better-sqlite3`, file at `server/data.db` |
| Scheduler | `node-cron` |
| Auth | `jsonwebtoken` + `bcryptjs` |
| Misc | helmet, cors, morgan, multer, dotenv |

## How to Run

```bash
cd /path/to/iptv-boss
npm run build          # build frontend
node server/index.js   # start server on :3001
```

Admin login: `/api/admin/login` — default `admin / admin123` (from `admin_users` table, seeded via env or hardcoded).

## Project Structure

```
server/
├── index.js                  # entry: mounts routes, starts cron jobs
├── db.js                     # SQLite init, table creation, migrations, seeds
├── routes/                   # Express routers
│   ├── auth.js               # user signup/login (frontend-facing, users table)
│   ├── admin.js              # admin login (admin_users table) + SEO + settings
│   ├── demand.js             # signals CRUD, stats, sniff triggers, sources API
│   ├── orders.js, checkout.js, webhooks.js, chat.js, pages.js
├── services/                 # business logic
│   ├── aiProvider.js         # multi-provider LLM with per-task priority (chat/seo/page). Providers: Groq, Gemini, OpenRouter, DeepSeek, OpenAI, Anthropic, Custom. Also `generateTextWithImages()` for vision support.
│   ├── salesAgent.js         # Alex — multilingual 3-state IPTV sales + technical support agent. Uses KB, language detection, customer data injection.
│   ├── languageDetector.js   # keyword-based language detection (16 languages in map, 11 with keyword lists). Returns code, name, text direction (rtl for Arabic).
│   ├── customerQuery.js      # Email-based customer lookup: orders, codes, trial count, abuse status, past sessions.
│   ├── snifferUtils.js       # shared: LEAD_KEYWORDS (9 langs), extractors, detectLanguage, dedupAndSave
│   ├── sourceRanker.js       # ** self-optimizing source discovery system **
│   ├── telegramSniffer.js    # scrapes t.me/s/{channel}
│   ├── redditSniffer.js      # Reddit JSON API
│   ├── youtubeSniffer.js     # YouTube Data API v3
│   ├── twitterSniffer.js     # scrapes Nitter instances
│   ├── seoAgent.js           # weekly SEO audit + AI keyword generation
│   ├── stockAlert.js         # hourly low-stock monitor
│   ├── namecheapService.js   # Namecheap API for domain management
│   ├── emailService.js       # SMTP with DB/env fallback
│   ├── adminAssistant.js     # Admin panel AI assistant (tab-aware, per-tab context map)
│   └── auth.js               # token sign/verify, Google/Apple OAuth
├── data/                     # static data
│   └── iptvKnowledge.js      # IPTV knowledge base: app setup guides (11 apps), troubleshooting (8 categories), device guides (7 device types)
├── middleware/
└── data.db
client/src/
├── api.js                    # axios instance
├── pages/
│   └── AdminDashboard.jsx    # sidebar with 🎯 SEO tab (merged Demand)
├── components/AdminTabs/
│   ├── SEO.jsx               # 6 sub-tabs: Audit, Rankings, Leads, Analytics, Sources, Settings
│   ├── Websites.jsx          # Website CRUD cards with public URL, visit link, deploy status, AI assist
│   ├── Settings.jsx          # AI keys, SMTP, Namecheap, Sellup
│   └── Domains.jsx           # Namecheap domain list, check availability, DNS record editor
```

## The Sniffers — Lead Intelligence System

4 sniffers crawl public sources for people asking about/recommending IPTV. All write to `demand_signals` table.

| Sniffer | Method | Auth Required |
|---------|--------|-------------|
| **Telegram** | Scrapes public `t.me/s/{channel}` pages | None |
| **Reddit** | `https://www.reddit.com/r/{sub}/hot.json` | None (may be blocked from WSL IP) |
| **YouTube** | YouTube Data API v3 search + comment threads | API key in Settings → YouTube |
| **Twitter/X** | Scrapes Nitter instances (`nitter.net` + fallbacks) | None |

### Enriched Fields Per Signal

All sniffers produce signals with these fields enriched by AI:

| Field | Description |
|-------|-------------|
| `pain_point` | What the user is struggling with |
| `opportunity` | How your service could help them |
| `intent_score` | 0–100, how ready to buy |
| `email` | Extracted email address |
| `phone` | Extracted phone number |
| `groups_mentioned` | Other Telegram groups mentioned |
| `language` | Detected language (en/fr/es/pt/hi/de/it/nl/ar) |
| `lead_contact` | Username or handle |
| `source_url` | Direct link to the message/post |

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/demand/signals` | List signals (paginated, filterable) |
| `GET` | `/api/demand/signals/stats` | Aggregated stats (by source, language, intent, contacts) |
| `POST` | `/api/demand/signals/sniff` | Sniff Telegram only |
| `POST` | `/api/demand/signals/sniff-all` | Sniff all 4 sources in parallel |
| `PUT` | `/api/demand/signals/:id/enrich` | Re-analyze a single signal with AI |
| `GET` | `/api/demand/signals/sources` | Source performance table (all 4 platforms) |
| `POST` | `/api/demand/signals/sources/discover` | AI-discover new sources for a platform |
| `POST` | `/api/demand/signals/sources/add` | Manually add a source |
| `POST` | `/api/demand/signals/sources/toggle` | Enable/disable a source |
| `GET` | `/api/demand/settings` | Read sniffer settings |
| `PUT` | `/api/demand/settings` | Update sniffer settings |

### Self-Optimizing Source Discovery

**Instead of hardcoded channel lists**, `server/services/sourceRanker.js` treats source selection as an **explore/exploit problem**:

1. **Source Pool** — All sources live in `sniffer_sources` table with performance metrics
2. **Each Cycle** — Selects **10 top performers** (by lead_rate × 0.6 + avg_intent × 0.4) + **5 least-sniffed** (exploration)
3. **AI Discovery** — Every 4 cycles: LLM suggests 5 new sources targeting under-covered regions
4. **Auto-Discovery** — Telegram sniffer extracts `t.me/xxx` links from messages and adds them
5. **Pruning** — Every 4 cycles: disables low-performers (0 leads after 3 sniffs, or lead_rate < 0.1)
6. **Seed Protection** — Default sources are 🛡️-marked and never pruned

### Regional Targeting Priority

```
Europe → USA → Latin America → India → Middle East → Africa
```

Keyword lists cover 11 languages: EN, FR, ES, PT, HI, DE, IT, NL, AR, TR, PL, RU. Language map totals 16 including ZH, JA, KO.

## SEO System

- Runs weekly (Sunday midnight) via `node-cron`
- Pulls top 15 leads from `demand_signals`
- Injects pain points and opportunities into AI prompt for keyword generation
- Can auto-build landing pages from AI-suggested keywords
- Suggestions stored in `seo_log` table

### Landing Page Analytics (Phase 3)

Every landing page served at `/lp/:slug` auto-increments `visits` in two places:
- `landing_pages.visits` — total counter
- `page_analytics` table — daily breakdown (page_id, date, visits, conversions)

Conversion tracking via `POST /admin/pages/:id/track-conversion` (admin-triggered when a page leads to a sale).

**Analytics API** (`GET /admin/pages/analytics`):
- `total_visits`, `total_conversions`
- `perPage` array — each page with visits, conversions, conversion_rate
- `daily` array — last 30 days aggregated
- `topPages` — last 7 days top 10

**UI** — Analytics sub-tab in SEO.jsx:
- Summary cards (total visits, conversions, rate, page count)
- 30-day bar chart (daily visits, hover values)
- Per-page table with conversion rate badges, 7-day trend sparkbars

## Cron Jobs

| Job | Schedule | What it does |
|-----|----------|-------------|
| StockMonitor | Every hour | Alerts when codes run low |
| SEOAgent | Sunday midnight | Runs SEO audit, generates keyword suggestions |
| AutoBuild | Configurable (default 6h) | Builds landing pages from high-intent demand signals |
| RankTracker | Configurable (default 24h) | Checks SERP rankings for tracked keywords via SerpAPI |
| TelegramSniffer | Every 6h | Sniffs Telegram channels when enabled |
| RedditSniffer | Every 6h | Sniffs subreddits when enabled |
| YouTubeSniffer | Every 12h | Sniffs YouTube comments when enabled |
| TwitterSniffer | Every 6h | Sniffs Nitter when enabled |

## Settings

All settings stored in `app_settings` key-value table. Most have `process.env` fallbacks.

| Category | Settings |
|----------|----------|
| **SMTP** | `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_from_name`, `smtp_from_email` |
| **AI** | `ai_key_groq`, `ai_key_gemini`, `ai_key_deepseek`, `ai_key_openrouter`, `ai_key_openai`, `ai_key_anthropic`, `ai_key_custom` (+ model and URL) |
| **Namecheap** | `namecheap_api_user`, `namecheap_api_key`, `namecheap_username`, `namecheap_client_ip` |
| **Sellup** | `sellup_api_key`, `sellup_store_id`, `sellup_webhook_secret` |
| **Sniffers** | Per-source: channels/queries, interval (hours), enabled toggle |
| **YouTube** | `youtube_api_key` (required for YouTube sniffer) |
| **SerpAPI** | `serpapi_key` (rank tracking), `rank_check_interval` (auto-check frequency) |
| **AutoBuild** | `auto_build_enabled`, `auto_build_threshold` (default 70), `auto_build_max_per_run` (default 5), `auto_build_interval` (default 6h) |

## Admin Frontend

Single-page React app served by Express. Sidebar tabs:

| Tab | Content |
|-----|---------|
| 🎯 SEO | 6 sub-tabs: **Audit** (run SEO, view suggestions), **📈 Rankings** (SERP position tracking, manual entry, bulk check), **Leads** (signal cards, filters, sniff buttons), **Analytics** (landing page stats, bar chart, per-page table), **Sources** (performance tables per platform, AI discover, add/toggle), **Settings** (sniffer config + rank tracking + auto-build config) |
| 🌐 Websites | Website CRUD cards with public URL, Visit Site link, Manage button, deploy status, AI Assist content generation |
| 📧 Email | SMTP config, test send |
| 🌐 Domains | Namecheap domain list + search/check availability + DNS record editor |
| ⚙️ Settings | AI keys (with show/hide 👁️/🙈), SMTP, Namecheap, Sellup, payment gateways |

## Database Notes

- `journal_mode = DELETE` is **required on WSL/Windows** — WAL mode corrupts on `/mnt/c/` drives
- Works with WAL on production Linux VPS (DELETE is safe everywhere)
- Migration strategy: `ALTER TABLE ... ADD COLUMN` wrapped in `try/catch` for existing databases

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **DELETE journal mode** | WAL on WSL Windows drive causes lockups and data loss. DELETE works on both WSL and Linux VPS. |
| **Telegram scraping vs API** | `t.me/s/` is public, no auth, no rate limits. Avoids Telegram bot API restrictions. |
| **Single `demand_signals` table** | Unifies all 4 sniffer sources into one schema — future sniffers just add `source: 'newtype'`. |
| **Multi-provider AI** | `generateText()` tries providers in priority order per task (chat/seo/page). Available: Groq, Gemini, OpenRouter, DeepSeek, OpenAI, Anthropic, Custom. OpenRouter (`openai` SDK, free tier) sits between Gemini and OpenAI in chat/seo fallback. Also `generateTextWithImages()` for vision support across OpenAI/Gemini/Anthropic. |
| **Namecheap DNS management** | `getDnsRecords()` + `setDnsRecords()` in `namecheapService.js`. Namecheap's `setHosts` replaces the entire zone atomically — frontend collects all records and PUTs them in one call. Editable table UI in Domains.jsx with add/delete rows, type selector (A/AAAA/CNAME/MX/TXT/NS/SRV), and priority/TTL fields. |
| **Shared `snifferUtils.js`** | Centralized keywords (11 languages), regex extractors, language detection, dedup-save. Each sniffer only contains source-specific fetch logic. |
| **Bandit-style `sourceRanker.js`** | Continuous explore/exploit — tests new candidates, ranks by yield+quality, prunes failures. Seeds are protected safety net. |
| **Show/hide on password fields** | 👁️/🙈 toggle instead of fighting browser autofill. Users can visually confirm saved API keys. |
| **`Saving...` on Save buttons** | Matches `⏳ Testing...` pattern on test buttons — consistent UX across the app. |
| **Alex Chat Agent** | `server/services/salesAgent.js` — 3-state (new/info-collected/existing) multilingual IPTV sales + technical support agent. Language detection via `languageDetector.js` (16 languages with keywords for 11). Knowledge base in `iptvKnowledge.js` (15 topics: app setups, troubleshooting, device guides). Vision support: users can upload screenshots → AI analyzes them. Fallback replies in 6 languages (EN, FR, ES, AR, DE, NL). Visitor email lookup in `customerQuery.js` detects abuse (max 2 trials, active trial check, past flagged sessions). Chat sessions have ticket system (`ticket_status`, `issue_summary`, `abuse_flagged` columns). `callProviderWithImages()` in aiProvider.js supports vision for OpenAI/Gemini/Anthropic. |
| **Demand Signals → SEO merge** | Leads tab inside SEO.jsx. Standalone DemandSignals.jsx deleted. One unified 🎯 tab in sidebar. |
| **Admin Notifications** | `admin_notifications` table for in-app alerts (trial stockouts, restock needs). API: `GET /api/admin/notifications?limit=N&type=X`, `POST /api/admin/notifications/read` (mark all or by id). Automatically created when trial codes run out (both via chat and trial form). Brain can create via `restock_trial_codes` action. Frontend poll/display TBD. |
| **IP geo-language detection** | On chat POST, server does a free `ip-api.com` lookup on visitor IP (3s timeout, cached, private IP filtered). Country mapped to language code (30+ countries), used as hint alongside browser language for `languageDetector.js`. |
| **Alex info-first sales flow** | Alex now collects email (required), name (optional), WhatsApp (optional) before acting. `send_trial` guarded by: (1) `hasTrialIntent()` — multi-language keyword check, (2) `collectedInfoThisBatch` — prevents same-batch collect_info+send_trial, (3) `order.customer_email` required. AI-generated action JSON is stripped from visible reply text (parsed server-side only). |
| **Trial form fields** | ChatWidget trial form: Email *required, Name optional, WhatsApp optional, Provider *required. `/api/trial/claim` endpoint accepts `{ name?, email!, phone?, providerId! }`. Chat also extracts phone numbers via regex from natural language. |
| **Email Templates** | `email_templates` table stores editable HTML templates with `{{variable}}` placeholders and `{{#if var}}...{{/if}}` conditional blocks. Template keys: `trial_default`, `credentials_default`, `payment_link_default`. Per-plan overrides: `trial_plan_{id}`, `credentials_plan_{id}`. API: `GET /api/admin/email-templates` (lists templates + plans), `GET|PUT /api/admin/email-templates/:key`, `POST /api/admin/email-templates/:key/reset`. Frontend: "Emails" tab in admin panel with type/scope selectors, subject/body editor, variable reference, and preview. Fallback: if no template found in DB, the hardcoded HTML in `emailService.js` is used. |
| **SERP Rank Tracking** | `rank_tracking` + `rank_history` tables. `server/services/rankTracker.js` checks Google positions via SerpAPI with trend tracking (up/down/stable/not_found). Admin API: CRUD on `/api/admin/seo/ranks`, `GET history`, `POST check-all`, `POST :id/check`. Frontend: 📈 Rankings sub-tab in SEO tab with keyword/page/locale selectors, inline manual position entry, trend icons, per-row locale switching. Cron auto-checks at configurable interval. |
| **Auto-Build from Leads** | `autoBuildFromLeads()` in `seoAgent.js` runs on configurable cron. Queries `demand_signals` where `intent_score >= threshold` (default 70), dedups against existing landing pages by slug, calls `buildPage()` for each eligible lead, updates signal status to `page_built`, logs to `seo_log` and `agent_log`, and regenerates sitemap. Settings in SEO → Settings: enabled toggle, min intent score, max per run, interval. Manual trigger via `POST /api/admin/seo/auto-build`. |
| **Website Cards** | Websites tab shows cards with: public URL (first domain or site_url/slug), "Visit Site" link (opens in new tab), "Manage" button (sets website context), deploy status badge (🟡 Pending / 🟢 Deployed / 🔴 Error), language flag, region tag, domain pills, deployment timestamp. "AI Assist" button in create modal generates site_name, tagline, and logo_url from website name using AI. Slug auto-generated from name. `deploy_status` and `deployed_at` columns track deployment lifecycle; setting status to `deployed` auto-timestamps `deployed_at`. |

# Atlas Pro IPTV Knowledge (persistent)

## Official Apps
- **Android TV / Fire TV**: Atlas Pro ONTV (also called Atlas 9X) — activation code only, no URLs. Available on Amazon Appstore or APK.
- **Apple (iOS, iPadOS, Apple TV)**: Atlas Pro IPTV Ontv GSE — from App Store, enter subscriber code.

## Third-Party Apps (Xtream Codes)
- Use Server URL + Username + Password when official apps aren't available.
- Best apps: TiviMate (Firestick/Android TV), IPTV Smarters (universal), IBO Player/Smart IPTV (Samsung/LG TV).
- Always use "Xtream Codes API" option (not M3U) for EPG support.

## IPTV in France — Key Tips
- French ISPs (Orange, SFR, Bouygues, Free) block/throttle IPTV, especially during football (Ligue 1, UCL). **VPN fixes this instantly**.
- Minimum bandwidth: 5 Mbps (SD), 10-15 Mbps (HD), 25+ Mbps (4K).
- Always test with free trial before buying long-term.
- Use Ethernet over Wi-Fi for stability.

## Sales Agent
- `salesAgent.js` — French fallbacks updated to mention Atlas Pro IPTV. Keyword `atlas` triggers an Atlas-specific fallback reply.
- Knowledge base at `server/data/iptvKnowledge.js` has topic `atlas_pro_setup` with full setup guide in French + troubleshooting for ISP blocking, activation codes, and EPG.

## Critical: Atlas Trial Credentials Format
- Atlas trial usernames must be **15-digit numbers only** (e.g. `446813353907907`)
- Password is always `1593574628` for all Atlas trial codes
- `code` = `username` = the same 15-digit number
- NEVER generate usernames with letters or fewer digits — `wc-user-003`, `Atlas_001_XXXX`, `WC2026-*` formats are WRONG
- Trial activation codes are **always imported by the owner** via Admin → Import — never auto-generate codes
- Panel resets at 00:00 daily — all unused trial codes are wiped. Only use **same-day imports** (fresh codes).
- Once a user activates a trial on the panel, the 24h starts from **their first use** (not from assignment time).

