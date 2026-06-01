# IPTV Boss — Complete Documentation & Playbook

**Version:** 1.0.0  
**Platform:** Node.js + React (Vite)  
**Database:** SQLite (better-sqlite3)  
**Payment Gateway:** Sellup.io  
**AI Providers:** Groq, Gemini, DeepSeek, OpenAI, Anthropic, Custom API  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [System Requirements](#2-system-requirements)
3. [Quick Start Installation](#3-quick-start-installation)
4. [VPS Deployment](#4-vps-deployment)
5. [Environment Configuration](#5-environment-configuration)
6. [Admin Panel](#6-admin-panel)
7. [Provider & Plan Management](#7-provider--plan-management)
8. [Activation & Trial Codes](#8-activation--trial-codes)
9. [Sales Flow & Payment Integration](#9-sales-flow--payment-integration)
10. [AI Sales Agent — "Alex"](#10-ai-sales-agent--alex)
11. [Email Configuration](#11-email-configuration)
12. [AI Landing Page Builder](#12-ai-landing-page-builder)
13. [SEO Agent & Sitemap](#13-seo-agent--sitemap)
14. [Multi-Website / Multi-Tenant](#14-multi-website--multi-tenant)
15. [Stock Monitoring](#15-stock-monitoring)
16. [Chat System & Embeddable Widget](#16-chat-system--embeddable-widget)
17. [Embedded Chat Widget for Third-Party Sites](#17-embedded-chat-widget-for-third-party-sites)
18. [User Accounts (Auth)](#18-user-accounts-auth)
19. [API Reference](#19-api-reference)
20. [Troubleshooting](#20-troubleshooting)
21. [Production Checklist](#21-production-checklist)

---

## 1. Product Overview

**IPTV Boss** is a complete reseller platform for IPTV services. It provides:

- A **customer-facing sales page** (landing page) with pricing plans, features, testimonials, and FAQ
- An **AI-powered sales agent** ("Alex") that chats with visitors, recommends plans, and processes sales
- A **full admin panel** for managing providers, plans, activation codes, orders, and customers
- **Automated order fulfillment** — assigns activation codes and sends credentials via email when payment is confirmed
- **AI-powered landing page builder** for SEO-optimized content pages
- **Built-in SEO agent** that generates keyword suggestions and sitemaps
- **Multi-website / multi-tenant** support — run multiple IPTV brands from one installation
- **Stock monitoring** with low-inventory email alerts
- **Embeddable chat widget** for third-party websites

### Core Workflow

```
Customer visits landing page
  → Views plans, starts chat with Alex, or claims a free trial
  → Alex recommends provider/plan via AI conversation
  → Customer provides details → AI creates order → sends payment link
  → Payment confirmed via Sellup webhook
  → Activation code automatically assigned from inventory
  → Credentials emailed to customer
```

---

## 2. System Requirements

### Minimum VPS Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Ubuntu 20.04+ / Debian 11+ |
| **CPU** | 1 vCPU |
| **RAM** | 1 GB |
| **Storage** | 10 GB |
| **Node.js** | v18.x – v20.x |
| **npm** | 9.x+ |
| **PM2** | Latest (process manager) |

### Local Development

| Component | Version |
|-----------|---------|
| **Node.js** | v18+ |
| **npm** | 9+ |
| **OS** | Any (Windows, macOS, Linux) |

---

## 3. Quick Start Installation

### 3.1 Local Development Setup

```bash
# 1. Clone or upload the project
cd /path/to/iptv-boss

# 2. Copy and configure environment
cp .env.example .env
nano .env   # Edit with your settings

# 3. Install dependencies (root + client)
npm run setup

# 4. Build the React frontend
npm run build

# 5. Start the server (production mode)
node server/index.js

# 6. For development (hot-reload both server + client)
npm run dev
```

The server starts on **port 3001** by default.

### 3.2 Development Mode (with Hot Reload)

```bash
# Terminal 1: Start the server with nodemon
npm run server

# Terminal 2: Start the Vite dev server (port 3000)
npm run client
```

In development, the Vite dev server proxies `/api` requests to `http://localhost:3001`.

### 3.3 Accessing the Application

| Page | URL |
|------|-----|
| **Customer Landing Page** | `http://localhost:3001/` |
| **Admin Panel** | `http://localhost:3001/admin` |
| **AI Landing Pages** | `http://localhost:3001/lp/{slug}` |

---

## 4. VPS Deployment

### 4.1 One-Click Deploy Script

```bash
# 1. Configure VPS details in .env
VPS_USER=root
VPS_HOST=your.server.ip
VPS_PATH=/var/www/iptv-boss

# 2. Build frontend and deploy
npm run deploy
```

The deploy script:
1. Builds the React frontend (`npm run build`)
2. Rsyncs all files to the VPS (excluding `node_modules`, `.env`, `.git`, `*.db`)
3. Installs production dependencies on the VPS
4. Starts the server with **PM2** under the name `iptv-boss`
5. Saves the PM2 process list

### 4.2 Manual VPS Setup

```bash
# On the VPS
ssh root@your.server.ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

# Install PM2
npm install -g pm2

# Upload project files
# (use SCP, rsync, or git)

# Install dependencies
cd /var/www/iptv-boss
npm run setup
npm run build

# Start with PM2
pm2 start server/index.js --name iptv-boss
pm2 save
pm2 startup   # Auto-start on reboot
```

### 4.3 Nginx Reverse Proxy (Recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then set up **SSL with Certbot**:
```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

---

## 5. Environment Configuration

The `.env` file contains all configuration. Copy `.env.example` to `.env` and edit:

### 5.1 Required Settings

```env
# Admin login
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=change_this_to_random_string   # Use a random 32+ character string

# Business info
SITE_NAME=IPTV Boss
SITE_URL=http://localhost:3000   # Your public URL
SUPPORT_EMAIL=your@gmail.com

# Server
PORT=3001
```

### 5.2 Payment Gateway — Sellup.io

```env
SELLUP_API_KEY=your_sellup_api_key_here        # From Sellup.io dashboard
SELLUP_STORE_ID=your_sellup_store_id_here      # Your store ID
SELLUP_WEBHOOK_SECRET=your_webhook_secret_here # For payment confirmation
```

Sellup.io provides:
- **Checkout pages** — hosted payment pages for credit cards, PayPal, crypto
- **Webhooks** — instant payment confirmation that triggers code assignment
- **Global coverage** — supports multiple currencies and payment methods

### 5.3 Email (SMTP)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password_here   # Gmail App Password (not regular password)
SMTP_FROM_NAME=IPTV Boss
SMTP_FROM_EMAIL=your@gmail.com
```

### 5.4 AI Provider Keys

Set at least one AI provider for the sales agent and page builder:

```env
AI_KEY_GROQ=          # Fast, free tier available
AI_KEY_GEMINI=        # Google Gemini (good for SEO)
AI_KEY_OPENAI=        # OpenAI GPT-4 / GPT-3.5
AI_KEY_ANTHROPIC=     # Claude (best for page building)
AI_KEY_DEEPSEEK=      # DeepSeek alternative
```

Alternatively, set via the Admin Panel → Settings → AI Providers.

---

## 6. Admin Panel

Access: `http://yourdomain.com/admin`

### 6.1 Login

Default credentials (change immediately):
- **Username:** admin
- **Password:** admin123

### 6.2 Dashboard Tabs

| Tab | Purpose |
|-----|---------|
| **Overview** | KPIs, revenue charts, order distribution, stock levels, activity log |
| **Providers** | Manage upstream IPTV providers and their plans |
| **Codes** | Import, export, and manage activation codes |
| **Trials** | Import and manage trial codes |
| **Orders** | View orders, resend credentials, process refunds |
| **Chat** | View chat session transcripts |
| **Pages** | Manage AI-generated SEO landing pages |
| **SEO** | Run SEO audits, view keyword suggestions |
| **Agent Log** | View all AI agent activity |
| **Websites** | Manage multiple websites/tenants |
| **Servers** | Configure regional VPS deploy targets |
| **Settings** | Configure everything (SMTP, payments, AI, business info) |

### 6.3 Multi-Website Selection

If you have multiple websites configured, use the dropdown in the admin sidebar to switch between them. All data is scoped per website.

---

## 7. Provider & Plan Management

### 7.1 Adding a Provider

In **Admin → Providers**:

1. Click **"Add Provider"**
2. Fill in:
   - **Name** — Provider name (e.g., "StreamMax", "UltraTV")
   - **Specialty** — Content focus (e.g., "Sports", "Arabic", "General")
   - **Website** — Provider's website (optional)
   - **Panel URL** — Upstream provider panel URL (e.g., Xtream UI)
   - **Panel Username/Password** — Your reseller login at the upstream provider
   - **Notes** — Internal notes
3. Click Save

### 7.2 Adding Plans to a Provider

1. Click **"Add Plan"** on a provider card
2. Fill in:
   - **Plan Name** — e.g., "Trial", "Basic", "Premium", "Ultimate"
   - **Plan Type** — `monthly`, `yearly`, or `trial`
   - **Duration (Days)** — e.g., 30 for monthly, 365 for yearly
   - **Cost Price** — Your cost from the upstream provider
   - **Sell Price** — Price charged to customers (your margin = sell - cost)
   - **Channels** — Number of channels included (displayed on landing page)
   - **Streams** — Number of simultaneous connections
   - **PayPal Link** — Optional direct PayPal payment link
3. Plans can be toggled active/inactive

### 7.3 Provider API Integration (Panel URL)

The `panel_url`, `panel_username`, and `panel_password` fields are for connecting to upstream provider systems (typically **Xtream UI** or similar IPTV management panels). These credentials are stored for your reference and may be used in future API integrations.

---

## 8. Activation & Trial Codes

### 8.1 Activation Codes (Paid Subscriptions)

Codes are obtained from your upstream IPTV provider and imported into IPTV Boss. When a customer pays, the system automatically assigns an available code and emails the credentials.

#### Import Methods

**Method 1: Paste Mode**
In **Admin → Codes → Import → Paste**:
```
username1:password1:server1:mac1
username2:password2:server2
code12345
```
Supports formats:
- `username:password`
- `username:password:server`
- `username:password:server:mac`
- Bare alphanumeric codes
- CSV-style lines: `code,username,password,server,expires`

**Method 2: CSV Upload**
Upload a CSV file with columns:
- `code`, `username`/`user`, `password`/`pass`, `server_url`/`server`, `mac_address`/`mac`, `expires_at`/`expires`, `notes`

Drag-and-drop or click to select.

**Method 3: Manual Entry**
Enter one code at a time with all fields.

#### Code Lifecycle

```
available → used → (order completed, credentials sent)
          → expired
```

- **Available:** Ready to assign
- **Used:** Assigned to an order
- **Expired:** Past expiration date

#### Export

Click **"Export CSV"** to download all codes as a CSV file.

### 8.2 Trial Codes

Trial codes follow the same pattern but are simpler (username:password format). Import in **Admin → Trials → Import** with a duration selector (24/48/72 hours).

---

## 9. Sales Flow & Payment Integration

### 9.1 Supported Payment Methods

Configured in **Admin → Settings → Payment Methods**:

| Method | Description | Setup Required |
|--------|-------------|----------------|
| **PayPal** | PayPal checkout (iframe, PayPal.me, or Friends & Family) | PayPal email/client ID |
| **Stripe** | Credit card payments | Stripe publishable + secret keys |
| **Crypto** | USDT TRC20 + BTC addresses | Wallet addresses |
| **Email Link** | Sellup.io payment link sent via email | Sellup API key + store ID |
| **SEPA** | Bank transfer (European customers) | IBAN, BIC, bank name |

### 9.2 Sellup.io Integration (Primary Payment Gateway)

Sellup.io is the primary automated payment gateway:

1. **Create a product** on Sellup.io for each plan
2. **Set the product ID** in the plan settings (or in Admin → Providers → Add Plan → sellup_product_id field)
3. **Configure webhook** in Sellup.io dashboard → point to `https://yourdomain.com/api/webhooks/sellup`
4. **Set webhook secret** in Admin → Settings or `.env`

When a customer clicks "Subscribe Now":
1. System creates a Sellup order with `internal_order_id` in metadata
2. Customer is redirected to Sellup's hosted checkout page
3. On payment confirmation, Sellup sends a webhook
4. Webhook verifies HMAC-SHA256 signature
5. System assigns an activation code from inventory
6. Credentials are emailed to the customer after a 3-minute delay

### 9.3 Complete Purchase Flow

```
1. Customer views plans on landing page
2. Clicks "Subscribe Now" or "Get Started"
3. Checkout modal opens → payment method selection
4. If PayPal: redirect to PayPal iframe or PayPal.me
5. If Crypto: show wallet addresses, customer pays manually
6. If Email Link: customer enters email, system sends Sellup checkout link
7. If SEPA: show bank transfer details
8. Payment confirmed:
   a. For Sellup: automatic via webhook
   b. For manual methods: admin marks as completed
9. Activation code assigned from inventory
10. Credentials emailed to customer
11. Order marked as 'completed'
```

### 9.4 Free Trial Flow

Customers can claim a free trial via:
- **Direct form** — click "Free Trial" button on landing page → fill name, email, select provider
- **Chat with Alex** — Alex guides them through the trial signup

On trial claim:
1. Trial code is assigned from inventory
2. Trial credentials are emailed immediately
3. Trial has a configurable duration (24/48/72 hours)
4. Chat message includes an "Upgrade to Full Plan" button

---

## 10. AI Sales Agent — "Alex"

### 10.1 Overview

Alex is an AI-powered sales agent embedded in the chat widget. It:
- Greets visitors and asks about their needs
- Recommends providers/plans based on preferences (sports, Arabic, European, etc.)
- Collects customer information (name, email, phone, country)
- Creates orders and sends payment links
- Processes trial signups

### 10.2 How It Works

1. Visitor opens the chat widget (or it auto-opens after 5 seconds)
2. Each visitor gets a unique session ID (stored in localStorage)
3. Messages are sent to `/api/chat` with `{ sessionId, message, pageUrl }`
4. Backend fetches available providers/plans and builds context
5. AI generates a reply with optional action commands:
   - `recommend_plan` — Suggests a provider+plan to the customer
   - `collect_info` — Collects name/email/phone/country
   - `create_sellup_order` — Creates a Sellup payment link
   - `send_trial` — Assigns and sends trial credentials
6. Actions are executed server-side
7. Reply is returned to the chat widget

### 10.3 AI Provider Priority

For the chat task, AI providers are tried in this order:
```
Groq → Gemini → OpenAI → DeepSeek → Anthropic → Custom
```

If the first provider is unavailable/unconfigured, the system falls back to the next.

### 10.4 Fallback Mode (No AI Key)

If no AI provider is configured, Alex uses a rule-based fallback that recognizes keywords:
- "trial" → Sends trial credentials
- "sports" / "arabic" / "europe" → Recommends matching providers
- "price" / "cost" → Shows plan pricing
- Full name + email → Triggers payment link creation

### 10.5 Conversation Flow (AI Prompt)

The AI system prompt defines a strict conversation flow:
1. **Greeting** — "Hey there! 👋 Thanks for stopping by."
2. **Ask trial or subscribe**
3. **Ask content preferences** — sports, Arabic, European, general
4. **Recommend** — Best provider + plan for their needs
5. **Collect info** — Name, email, phone, country
6. **Process** — Generate payment link or assign trial

---

## 11. Email Configuration

### 11.1 SMTP Setup

Configure in **Admin → Settings → SMTP** or in `.env`:

| Field | Description |
|-------|-------------|
| **SMTP Host** | e.g., `smtp.gmail.com` |
| **SMTP Port** | `587` (TLS) or `465` (SSL) |
| **SMTP Username** | Your full email address |
| **SMTP Password** | App password (not your regular password) |
| **From Name** | Sender name (e.g., "IPTV Boss") |
| **From Email** | Sender email address |

**Gmail App Password:**
1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate an app password for "Mail"
4. Use that 16-character password in SMTP_PASS

### 11.2 Email Templates

The system sends these automated emails:

| Email Type | Trigger | Content |
|------------|---------|---------|
| **Payment Link** | Admin sends link via chat | Plan details, amount, checkout button |
| **Thank You** | Payment confirmed | Receipt + activation credentials |
| **Credentials** | Activation code assigned | Username, password, server URL, setup instructions |
| **Trial Credentials** | Trial claimed | Login credentials, trial duration, upgrade link |
| **Stock Alert** | Low inventory | Provider, plan, remaining count |

All emails use a dark-themed HTML template with the site name and branding.

### 11.3 Testing Email

In **Admin → Settings → SMTP**, click **"Test Email"** to send a test message to the support email address.

---

## 12. AI Landing Page Builder

### 12.1 How It Works

1. Go to **Admin → Pages**
2. Click **"Build New Page"**
3. Enter a **keyword** (e.g., "best iptv for sports 2026")
4. Enter a **target audience** (e.g., "sports fans looking for affordable streaming")
5. Optionally select a **featured provider** and **plan**
6. Click **"Generate Page"**
7. AI builds a complete HTML landing page with:
   - Hero section with headline
   - Features grid
   - Pricing section
   - Testimonials
   - FAQ accordion
   - Stats row
   - Call-to-action
8. Page is saved to the database and accessible at `/lp/{slug}`

### 12.2 Page Management

In **Admin → Pages** you can:
- View all built pages with visit/conversion stats
- Toggle pages active/inactive
- Delete pages
- See the best-performing page

### 12.3 AI Provider Priority for Page Building

```
Anthropic (Claude) → OpenAI → Gemini → Groq → DeepSeek → Custom
```

If AI is unavailable, a comprehensive built-in HTML template is used as fallback.

---

## 13. SEO Agent & Sitemap

### 13.1 SEO Agent

The SEO agent runs automatically every **Sunday at midnight** (via node-cron) and:
1. Uses AI (Gemini priority) to generate 10 high-intent SEO keyword suggestions
2. Each suggestion includes: keyword, target audience, and search intent
3. Saves suggestions to the database
4. Regenerates the sitemap

### 13.2 Example Keyword Suggestions

The AI generates keywords like:
- "best iptv for sports 2026"
- "affordable iptv subscription"
- "iptv for arabic channels"
- "4k iptv subscription"
- "iptv for firestick 2026"

### 13.3 Running SEO Audit Manually

In **Admin → SEO**, click **"Run SEO Audit"** to trigger keyword generation on demand.

### 13.4 Building Pages from Suggestions

Each pending suggestion has a **"Build Page"** button that opens the page builder with the keyword pre-filled.

### 13.5 Sitemap

The sitemap is automatically regenerated at `/client/public/sitemap.xml` and includes:
- Homepage (priority 1.0)
- All active landing pages (priority 0.8)

---

## 14. Multi-Website / Multi-Tenant

### 14.1 Overview

Run multiple IPTV brands from a single installation. Each website has:
- Its own branding (logo, site name)
- Its own domain(s)
- Its own providers and plans
- Its own landing pages
- Its own orders and chat sessions
- Scoped admin data
- Its own **store language** (English, French, or Dutch)
- Its own **deploy region** for multi-server deployments

### 14.2 Managing Websites

In **Admin → Websites**:
1. Click **"New Website"**
2. Set **Name**, **Slug**, **Site Name**, **Logo URL**
3. Choose **Store Language** — English, Français, or Nederlands
4. Choose **Deploy Region** — assign to a configured server (optional)
5. Add **Domains** (one per line) — e.g., `iptvboss.com`, `www.iptvboss.com`
6. Toggle active/inactive

Websites display language and region badges on their cards for quick identification.

### 14.3 Admin Dashboard Language

The admin panel supports English, French, and Dutch. To change the admin UI language:

1. Go to **Admin → Settings → Dashboard Language**
2. Select your language (🇬🇧 English, 🇫🇷 Français, or 🇳🇱 Nederlands)
3. Click **Save** — the sidebar nav, page titles, and buttons update immediately

The language preference is stored in the database (`app_settings.admin_language`) and persists across sessions.

### 14.4 Store Language

Each website has a default language that controls:
- Landing page text (features, FAQ, hero, buttons, footer)
- Email notifications sent to customers
- AI sales agent ("Alex") conversation language
- Checkout modal labels and instructions
- The language is stored per-website in the database and is used as the default when visitors land on that website's domain

### 14.5 Deploy Region & Multi-Server Support

Each website can be assigned to a **deploy region** (US, Europe, Asia, etc.). This allows you to:

1. Configure multiple VPS servers in **Admin → Servers**:
   - Region key (e.g., `us`, `eu`, `asia`)
   - Region name (e.g., "United States")
   - Server host/IP
   - SSH user
   - Deploy path

2. Deploy to a specific region:
   ```bash
   bash deploy.sh us     # Deploy to US server
   bash deploy.sh eu     # Deploy to Europe server
   bash deploy.sh asia   # Deploy to Asia server
   ```

3. Or use the default deployment (VPS_HOST from `.env`):
   ```bash
   bash deploy.sh
   ```

The `deploy_targets` table stores all server configurations, accessible via the **Admin → Servers** panel.

### 14.6 Domain Resolution

The `websiteResolver` middleware automatically detects which website to serve based on the `Host` header of incoming requests. It matches against the `domains` JSON array stored in the database.

---

## 15. Stock Monitoring

### 15.1 How It Works

The stock monitor runs **every hour** (via node-cron) and:
1. Checks all configured stock alerts
2. Counts available activation codes for each provider/plan
3. If count ≤ threshold, sends an email alert
4. Alerts are rate-limited to once per 24 hours per alert

### 15.2 Configuring Alerts

In **Admin → Settings → Stock Alerts** or via the API:
- Set a threshold (e.g., 10 remaining)
- Enable/disable email alerts
- Configured per provider + plan combination

---

## 16. Chat System & Embeddable Widget

### 16.1 Built-in Chat Widget

The landing page includes a floating chat widget in the bottom-right corner:
- Circular cyan button expands into a 380×560px chat panel
- Auto-opens after 5 seconds on first visit
- Shows "Alex" AI sales agent avatar and status
- Typing indicator during AI response
- Session persistence across page refreshes
- Inline plan recommendations with "Select" buttons
- Trial activation with upgrade link

### 16.2 Chat Sessions in Admin

**Admin → Chat** shows:
- Today's chat count, total chats, conversion rate
- Session table with message count, conversion status, start time
- Click any session to view the full transcript

### 16.3 Programmatic Chat

The chat widget exposes:
```javascript
window.openChatWithMessage("I'd like a sports plan")
// Opens the chat and sends the message to Alex
```

```javascript
window.__showTrialForm()
// Opens the trial claim form directly
```

---

## 17. Embedded Chat Widget for Third-Party Sites

The standalone embeddable widget (`client/public/chat-widget.js`) allows you to add the Alex chat agent to any website.

### 17.1 Installation

Add this script to any HTML page:

```html
<script src="https://yourdomain.com/chat-widget.js"></script>
```

The widget will automatically:
- Create a floating chat button (bottom-right)
- Open a chat panel on click
- Communicate with the backend AI agent
- No framework dependencies — pure vanilla JavaScript

### 17.2 How It Works

- Generates a random session ID stored in `localStorage`
- Each message sends a POST to `/api/chat` with the session ID
- Displays messages in styled bubbles (user = cyan right, assistant = dark left)
- Handles Enter key and Send button
- Auto-scrolls to latest message
- Error handling with fallback text

---

## 18. User Accounts (Auth)

### 18.1 Customer Accounts

Customers can create accounts via:
- **Email/Password** — Sign up form in the AuthModal
- **Google OAuth** — One-click sign-in with Google
- **Apple Sign-In** — One-click sign-in with Apple

Account features:
- View active subscriptions
- Track subscription expiry dates
- Quick re-subscription

### 18.2 Auth Configuration

In **Admin → Settings → Business Info**:
- **Google Client ID** — From Google Cloud Console (OAuth 2.0)
- **Apple Service ID** — From Apple Developer Portal

---

## 19. API Reference

### 19.1 Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plans` | List all active plans with provider info |
| GET | `/api/providers/active` | List providers with trial plans |
| GET | `/api/checkout/settings` | Public checkout config |
| POST | `/api/checkout/direct` | Initiate direct purchase |
| POST | `/api/trial/claim` | Claim free trial |
| POST | `/api/checkout/send-link` | Send payment link via email |
| POST | `/api/chat` | Send chat message to Alex AI |
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/google` | Google OAuth login |
| POST | `/api/auth/apple` | Apple Sign-In |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/orders` | Create order programmatically |

### 19.2 Admin Endpoints (require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/overview` | Dashboard stats |
| CRUD | `/api/admin/providers` | Provider management |
| CRUD | `/api/admin/codes` | Activation code management |
| GET | `/api/admin/codes/export` | Export codes as CSV |
| POST | `/api/admin/codes/import` | Import codes (text) |
| POST | `/api/admin/codes/import-csv` | Import codes (CSV) |
| CRUD | `/api/admin/trials` | Trial code management |
| GET | `/api/admin/orders` | List/search orders |
| POST | `/api/admin/orders/:id/resend-email` | Resend credentials |
| POST | `/api/admin/orders/:id/refund` | Process refund |
| GET | `/api/admin/chat/sessions` | Chat session list |
| CRUD | `/api/admin/pages` | Landing page management |
| POST | `/api/admin/pages/build` | AI build new page |
| GET | `/api/admin/seo/log` | SEO activity log |
| POST | `/api/admin/seo/run` | Run SEO audit |
| CRUD | `/api/admin/websites` | Multi-website management |
| GET/PUT | `/api/admin/settings` | App settings |
| POST | `/api/admin/settings/test-email` | Test email config |
| POST | `/api/admin/settings/test-ai` | Test AI provider |

### 19.3 Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/sellup` | Sellup payment confirmation (HMAC-signed) |

### 19.4 Public Pages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lp/:slug` | Rendered AI landing page |

---

## 20. Troubleshooting

### 20.1 Server Won't Start

**Symptom:** Process exits immediately or hangs

**Solutions:**
1. Check the log for errors: `cat /tmp/server_final.log`
2. Ensure SQLite database is not locked: `rm -f server/data.db-shm server/data.db-wal`
3. Verify Node.js version: `node --version` (must be v18+)
4. Check port availability: `lsof -i :3001`
5. Run with stderr: `node server/index.js 2>&1`

### 20.2 Chat/AI Not Responding

**Symptom:** Alex doesn't reply or returns errors

**Solutions:**
1. Check AI provider configuration in Admin → Settings → AI Providers
2. Verify API keys are valid and have credits
3. Test the AI provider: click "Test AI" button in Settings
4. Alex will use fallback mode if no AI is configured

### 20.3 Emails Not Sending

**Symptom:** Customers don't receive credentials or payment links

**Solutions:**
1. Test SMTP: Admin → Settings → SMTP → "Test Email"
2. For Gmail: ensure App Password is used, not regular password
3. Check spam/junk folders
4. Verify SMTP credentials in both `.env` and Admin settings
5. Check server logs for email errors

### 20.4 Sellup Webhook Not Working

**Symptom:** Orders marked as pending after payment

**Solutions:**
1. Verify webhook URL: `https://yourdomain.com/api/webhooks/sellup`
2. Check webhook secret matches in Sellup dashboard and Admin settings
3. View Sellup webhook logs in Sellup dashboard
4. Ensure server is accessible from the internet (not behind firewall)

### 20.5 Codes Not Being Assigned

**Symptom:** Payment confirmed but no credentials sent

**Solutions:**
1. Check code inventory in Admin → Codes
2. Ensure codes exist for the purchased provider+plan
3. Verify codes are in "available" status
4. Check email configuration (credentials are sent via email)

### 20.6 Database Issues

**Symptom:** Server hangs or crashes on startup

**Solutions:**
1. Clear stale SQLite locks: `rm -f server/data.db-shm server/data.db-wal`
2. Backup and reset: `cp server/data.db server/data.db.backup && rm server/data.db`
3. The database will be recreated with default data on restart

---

## 21. Production Checklist

### Before Going Live

- [ ] Change default admin password
- [ ] Set a strong JWT_SECRET (32+ random characters)
- [ ] Configure SSL certificate (Let's Encrypt via Certbot)
- [ ] Set up Nginx reverse proxy
- [ ] Configure Sellup.io webhook
- [ ] Set up SMTP and test email delivery
- [ ] Configure at least one AI provider
- [ ] Upload your provider's activation codes
- [ ] Set your site name and logo
- [ ] Update sitemap for your domain
- [ ] Test the complete purchase flow
- [ ] Test the trial signup flow
- [ ] Test chat with Alex
- [ ] Configure stock alerts

### Security Checklist

- [ ] Run on HTTPS only
- [ ] Set strong admin credentials
- [ ] Use Gmail App Passwords, not account passwords
- [ ] Keep `.env` file secure (never commit to git)
- [ ] Regular database backups
- [ ] Monitor server logs for suspicious activity

### Performance Tips

- The SQLite database works well for single-server deployments (up to thousands of orders)
- For high-traffic sites, consider using PM2 cluster mode
- Enable CloudFlare or similar CDN for static assets
- The `dist/` folder contains all built frontend assets

---

## Database Schema Overview

The application uses SQLite with these tables:

| Table | Purpose |
|-------|---------|
| `admin_users` | Admin login credentials (bcrypt-hashed) |
| `websites` | Multi-tenant website configuration (includes `language` and `deploy_region`) |
| `deploy_targets` | Regional server deployment targets |
| `providers_catalog` | Upstream IPTV providers |
| `provider_plans` | Plans per provider (pricing, channels, streams) |
| `activation_codes` | Paid subscription credentials |
| `trial_codes` | Trial credentials |
| `code_batches` | Import batch tracking |
| `orders` | Customer orders |
| `chat_sessions` | AI chat sessions with message history |
| `landing_pages` | AI-generated SEO pages |
| `seo_log` | SEO audit history |
| `agent_log` | All AI agent actions |
| `app_settings` | Key-value configuration store |
| `users` | Customer accounts |
| `stock_alerts` | Low-stock alert configuration |

---

## File Structure

```
iptv-boss/
├── .env                          # Environment configuration
├── .env.example                  # Example env template
├── package.json                  # Root package (server deps)
├── deploy.sh                     # One-click VPS deploy script
├── server/
│   ├── index.js                  # Main Express server entry point
│   ├── db.js                     # SQLite database setup + schema
│   ├── data.db                   # SQLite database file
│   ├── middleware/
│   │   └── websiteResolver.js    # Multi-tenant domain resolver
│   ├── routes/
│   │   ├── auth.js               # User authentication
│   │   ├── admin.js              # Full admin API (660+ lines)
│   │   ├── chat.js               # AI sales agent chat endpoint
│   │   ├── checkout.js           # Checkout & trial claim
│   │   ├── orders.js             # Order creation
│   │   ├── pages.js              # Landing page renderer
│   │   └── webhooks.js           # Sellup payment webhook
│   ├── services/
│   │   ├── aiProvider.js         # Multi-AI gateway with failover
│   │   ├── auth.js               # JWT + OAuth verification
│   │   ├── codeAssigner.js       # Activation code assignment
│   │   ├── emailService.js       # Nodemailer email sending
│   │   ├── pageBuilder.js        # AI landing page generator
│   │   ├── salesAgent.js         # "Alex" conversational AI
│   │   ├── sellupService.js      # Sellup.io payment integration
│   │   ├── seoAgent.js           # Automated SEO + sitemap
│   │   └── stockAlert.js         # Inventory monitoring
│   └── utils/
│       └── codeParser.js         # Code import parser (text + CSV)
├── client/
│   ├── package.json              # React + Vite dependencies
│   ├── vite.config.js            # Vite configuration
│   ├── index.html                # HTML entry point
│   ├── public/
│   │   ├── chat-widget.js        # Embeddable standalone chat widget
│   │   ├── favicon.svg           # Site favicon
│   │   ├── icons.svg             # SVG icons
│   │   └── sitemap.xml           # Auto-generated XML sitemap
│   ├── src/
│   │   ├── main.jsx              # React entry point
│   │   ├── App.jsx               # Route definitions
│   │   ├── api.js                # Axios HTTP client
│   │   ├── index.css             # Tailwind CSS + custom styles
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   # Main customer-facing sales page
│   │   │   ├── AdminDashboard.jsx# Full admin panel
│   │   │   └── DynamicLP.jsx     # Dynamic landing page renderer
│   │   └── components/
│   │       ├── AuthModal.jsx     # Sign in / Sign up modal
│   │       ├── ChatWidget.jsx    # AI chat widget
│   │       ├── CheckoutModal.jsx # Multi-payment checkout
│   │       ├── UserMenu.jsx      # Logged-in user dropdown
│   │       └── AdminTabs/
│   │           ├── Overview.jsx  # Dashboard KPIs + charts
│   │           ├── Providers.jsx # Provider CRUD
│   │           ├── Codes.jsx     # Activation code management
│   │           ├── Trials.jsx    # Trial code management
│   │           ├── Orders.jsx    # Order management
│   │           ├── ChatSessions.jsx # Chat transcript viewer
│   │           ├── Pages.jsx     # Landing page management
│   │           ├── SEO.jsx       # SEO audit management
│   │           ├── AgentLog.jsx      # AI agent activity log
│   │           ├── Websites.jsx      # Multi-tenant management (with language & region)
│   │           ├── DeployTargets.jsx # Server deployment targets
│   │           └── Settings.jsx      # Full app configuration
│   └── dist/                     # Built frontend (auto-generated)
└── tests/
    └── trial_codes.csv           # Sample trial codes for testing
```
