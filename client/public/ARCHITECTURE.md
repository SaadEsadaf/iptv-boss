# ARCHITECTURE — IPTV GEO Stack

## Overview
Two Node.js projects on a single VPS (Hetzner), driven by GEO (Generative
Engine Optimization) to rank in AI search results (ChatGPT, Gemini, Perplexity)
for IPTV-related queries.

---

## 1. IPTV-Boss (dalletek.live — port 3001)
Purpose: IPTV subscription sales platform + GEO-optimized public pages

### Stack
  Backend:   Express.js, SQLite (better-sqlite3), JWT + bcryptjs
  Frontend:  React 19 + Vite 8 + Tailwind CSS v4
  Payments:  Sellup.io (primary), Stripe, PayPal, Crypto, SEPA, Email links
  AI Stack:  Multi-provider gateway (Groq → Gemini → OpenAI → Anthropic → ...)

### Server Entry (server/index.js)
  1. Loads .env
  2. Initializes SQLite DB (36 tables)
  3. Starts background workers (cron):
     - stockAlert, inventoryMonitor
     - telegramSniffer, youtubeSniffer, redditSniffer, twitterSniffer
     - businessBrain (AI decisions), rankTracker, salesEngine
     - panelManager, titanHub
  4. Mounts middleware: Helmet, CORS, Morgan, rate-limit,
     cloakMiddleware, websiteResolver
  5. Mounts 27 API route files under /api/*
  6. Server-renders GEO pages (not SPA):
     - /blog, /blog/:slug (CollectionPage + Article schema)
     - /top-iptv-services (ItemList + Product schema)
     - /iptv-api (TechArticle schema)
     - /robots.txt, /sitemap.xml
  7. Catch-all * route injects JSON-LD (Organization + WebSite +
     WebPage + Product + AggregateRating) into all SPA pages before </head>

### Routes (27 files)
  auth, admin, chat, blog, checkout, orders, pages, webhooks,
  scraper, trial, trialManagement, inventoryManagement, panelManagement,
  content, activation, campaigns, demand, tracking, hero, account,
  tickets, brainBridge, salesEngine, titan, titanTemplates,
  titanGrowth, titanIntelligence

### Services (58 files)
  AI & Content:     aiProvider, blogGenerator, contentEngine, pageBuilder,
                    seoAgent, salesAgent, adminAssistant
  Sales/Payments:   salesEngine, sellupService, stripeService, paypalService,
                    cartRecovery, trialEngine, trialFollowUp, trialRestock
  Codes/Inventory:  codeAssigner, m3uParser, stockAlert, inventoryMonitor
  Sniffers:         telegramSniffer, youtubeSniffer, redditSniffer,
                    twitterSniffer, gitHubMiner, leadHarvester,
                    leakHarvester, leadOutreach, snifferUtils
  Growth/Titan:     titanHub, titanGrowth, titanIntelligence,
                    titanScanner, titanSecurity, titanTemplates
  Brain:            businessBrain, brainEngine, brainMemory,
                    brainActions, brainMetrics
  Email:            emailService, notificationService, templateInjection,
                    languageDetector
  Business:         businessReport, sourceRanker, rankTracker,
                    healthMonitor, eventMarketing, customerQuery
  Infra:            auth, credentialManager, autoProvision, safePage,
                    hostingPage, namecheapService, healEngine

### DB Tables (36)
  admin_users, websites, deploy_targets, providers_catalog, provider_plans,
  activation_codes, trial_codes, code_batches, orders, chat_sessions,
  email_templates, landing_pages, users, seo_log, agent_log, app_settings,
  stock_alerts, page_analytics, sniffer_sources, demand_signals, brain_memory,
  brain_decisions, rank_tracking, rank_history, backup_log, ai_usage_log,
  campaigns, scheduled_posts, tickets, ticket_replies, youtube_channels,
  ad_accounts, ad_campaigns, ad_sets, ads, ad_insights

### Frontend (React SPA — 11 pages)
  /                → LandingPage or LuxStreamLanding (by hostname)
  /admin/*         → AdminDashboard (20 tabs)
  /lp/:slug        → DynamicLP
  /checkout        → CheckoutPage
  /payment/success → PaymentResult
  /payment/cancel  → PaymentResult
  /activate, /setup→ ActivationPage
  /blog            → BlogPage
  /support         → SupportPage
  /downloads       → DownloadsPage
  /dashboard       → CustomerDashboard

### Middleware
  cloakMiddleware:   Traffic cloaking — serves decoy "hosting" pages to bots
                     (Google, Facebook, Stripe, PayPal, Apple, MS, Twitter,
                     LinkedIn, Pinterest) via CIDR + UA matching.
                     Never cloaks: webhooks, checkout, trial, payment, account.
  websiteResolver:   Multi-tenant — matches Host header to websites.domains JSON.

### Admin Tabs (20)
  Overview, Providers, Codes, Trials, Orders, ChatSessions, Pages, SEO,
  AgentLog, BrainHub, Websites, DeployTargets, Domains, EmailTemplates,
  Settings, SubAdmins, Campaigns, Tickets, SalesEngine, TitanHub

---

## 2. JobTools Lab (lab.jobtool.shop — port 3002)
Purpose: Marketing lead generation lab — feeds IPTV-Boss

### Stack
  Backend:   Express.js, SQLite (WAL mode), JWT auth
  Frontend:  Vanilla JS SPA (single index.html, no framework)
  AI Stack:  Groq → Gemini → Claude → Ollama (fallback chain)
  Email:     Nodemailer (SMTP) + SendGrid, Brevo daily quota (300/day)

### Server Entry (server/index.js)
  1. Loads .env
  2. Registers CORS, JSON parser (10mb), static serving of client/public/
  3. Mounts 17 route modules under /api/*
  4. Starts background scheduler (60s interval)
  5. Seeds default sniffer sources (Telegram, Twitter, Reddit, YouTube, Web)
  6. Runs sniffers every 30 min, lead enrichment every 15 min
  7. Runs marketing cycle every 6 hours
  8. Catch-all * → serves index.html (SPA)

### Routes (17 files, all /api/*)
  auth, stats, leads, campaigns, templates, brain, settings,
  automations, schedule, thesis, sniffers, marketing, whois,
  tickets (proxy to IPTV-Boss), blogs, ads, youtube

### Services (24 files)
  aiProvider, brainBridge, bulkEmailService, domainHarvester,
  emailValidator, eventMarketing, forumSniffer, leadEnrichment,
  leadFinder, marketingMailer, metaAdsService, redditSniffer,
  scheduler, sendgridService, socialPublisher, telegramAgent,
  telegramSniffer, templateInjection, twitterSniffer, webSniffer,
  whoisMiner, worldCupCampaign, youtubeManager, youtubeSniffer

### DB Tables (19)
  users, leads, sniffer_sources, campaigns, templates, injection_log,
  content_queue, brain_bridge_log, app_settings, scheduled_posts,
  ai_usage_log, websites, blog_posts, ad_platforms, ad_campaigns,
  yt_channels, yt_videos, yt_comments, demo_users, demo_comments

### Frontend (Single index.html — 13 tabs)
  Dashboard, Leads, Campaigns, Templates, Sniffers, Schedule,
  Marketing, Blog, Tickets, YouTube, Ads, Settings, Thesis
  - Vanilla JS, hash-based routing, JWT in localStorage
  - loadBlogs() with website selector in topbar
  - CRUD modals, progress bars, daily send tracking

### Background Jobs
  Sniffers:       Every 30 min (Telegram, Twitter, Reddit, YouTube, Web)
  Enrichment:     Every 15 min (AI-based lead scoring + social extraction)
  Marketing:      Every 6 hours (event-based campaigns, World Cup 2026)
  Scheduler:      Every 60s (posts due content, runs Telegram agent)

---

## 3. Unified Checkout Plugin (/var/www/unified-checkout)
External module mounted on IPTV-Boss at /api/checkout.
Failover chain: Stripe → PayPal → Sellup → Crypto → SEPA → Email link

---

## 4. Infrastructure
  PM2:           Both projects as PM2 processes
  DNS:           ~18 domains in /etc/hosts, TCP 53 → 8.8.8.8
  Backups:       Cron 0 3 * * * → /var/backups/backup-*.tar.gz (30 days)
  Monitoring:    healthMonitor.js, rankTracker.js
  GitHub repos:
    iptv-boss:       github.com/SaadEsadaf/iptv-boss (main)
    jobtools:        github.com/SaadEsadaf/jobtools (master)
    unified-checkout: github.com/SaadEsadaf/unified-checkout (master)
  OpenCode:      2 subagents (iptv-boss, jobtools-lab), deepseek-v4-flash-free

---

## 5. Data Flow

  Internet (crawlers / users)
      |
      v
  IPTV-Boss (port 3001)  <--  Unified Checkout (failover chain)
      |
      +-- GEO HTML -> AI crawlers (Google, ChatGPT, Gemini, Perplexity)
      +-- React SPA -> real users
      +-- Decoy pages -> bots (cloaking)
      |
      v
  JobTools Lab (port 3002)
      |
      +-- Sniffers -> Leads -> Enrichment -> Bridge to IPTV-Boss
      +-- Blog generation (Groq -> Gemini -> Claude -> Ollama)
      +-- Email campaigns (SMTP/SendGrid, 300/day Brevo cap)
      +-- Social publishing (Reddit, Facebook, YouTube)

---

## 6. GEO Strategy (AI Search Ranking)
  - Server-rendered HTML with JSON-LD structured data on key pages
  - Organization + WebSite + WebPage + Product + AggregateRating schema
  - ItemList schema for service comparisons (/top-iptv-services)
  - TechArticle schema for developer content (/iptv-api)
  - Article + CollectionPage schema for blog
  - Sitemap.xml with 26+ URLs
  - 31 total SEO blog articles (6 IPTV-Boss + 25 JobTools multi-website)
  - Multi-language content (fr, en, es)
  - Cloaking to avoid detection by competitors' crawlers
