const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = DELETE');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS websites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      domains TEXT NOT NULL DEFAULT '[]',
      site_name TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      language TEXT DEFAULT 'en',
      deploy_region TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deploy_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region_key TEXT UNIQUE NOT NULL,
      region_name TEXT NOT NULL,
      host TEXT NOT NULL,
      user TEXT NOT NULL DEFAULT 'root',
      path TEXT NOT NULL DEFAULT '/var/www/iptv-boss',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS providers_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id INTEGER REFERENCES websites(id) DEFAULT 1,
      name TEXT NOT NULL,
      logo_url TEXT,
      website TEXT,
      specialty TEXT,
      panel_url TEXT,
      panel_username TEXT,
      panel_password TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS provider_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id INTEGER REFERENCES websites(id) DEFAULT 1,
      provider_id INTEGER NOT NULL,
      plan_name TEXT NOT NULL,
      plan_type TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      price_cost REAL,
      price_sell REAL NOT NULL,
      channels INTEGER,
      streams INTEGER,
      sellup_product_id TEXT,
      paypal_link TEXT,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (provider_id) REFERENCES providers_catalog(id)
    );

    CREATE TABLE IF NOT EXISTS activation_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      code TEXT,
      username TEXT,
      password TEXT,
      server_url TEXT,
      mac_address TEXT,
      expires_at TEXT,
      status TEXT DEFAULT 'available',
      used_by_order_id INTEGER,
      assigned_at TEXT,
      notes TEXT,
      batch_id INTEGER,
      added_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (provider_id) REFERENCES providers_catalog(id),
      FOREIGN KEY (plan_id) REFERENCES provider_plans(id)
    );

    CREATE TABLE IF NOT EXISTS trial_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL,
      code TEXT,
      username TEXT,
      password TEXT,
      server_url TEXT,
      duration_hours INTEGER DEFAULT 72,
      status TEXT DEFAULT 'available',
      used_by_order_id INTEGER,
      assigned_at TEXT,
      expires_at TEXT,
      added_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (provider_id) REFERENCES providers_catalog(id)
    );

    CREATE TABLE IF NOT EXISTS code_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL,
      plan_id INTEGER,
      batch_name TEXT,
      total_codes INTEGER,
      import_type TEXT,
      imported_at TEXT DEFAULT (datetime('now')),
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      alert_threshold INTEGER DEFAULT 10,
      email_alert INTEGER DEFAULT 1,
      last_alert_sent TEXT,
      FOREIGN KEY (provider_id) REFERENCES providers_catalog(id),
      FOREIGN KEY (plan_id) REFERENCES provider_plans(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id INTEGER DEFAULT 1,
      session_id TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      customer_country TEXT,
      provider_id INTEGER,
      plan_id INTEGER,
      is_trial INTEGER DEFAULT 0,
      activation_code_id INTEGER,
      trial_code_id INTEGER,
      sellup_order_id TEXT,
      sellup_payment_ref TEXT,
      amount REAL,
      currency TEXT DEFAULT 'usd',
      status TEXT DEFAULT 'pending',
      source TEXT,
      payment_confirmed_at TEXT,
      credentials_sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      website_id INTEGER DEFAULT 1,
      visitor_ip TEXT,
      page_url TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT,
      messages TEXT DEFAULT '[]',
      order_id INTEGER,
      converted INTEGER DEFAULT 0,
      provider_interested TEXT,
      plan_interested TEXT,
      customer_email TEXT DEFAULT '',
      issue_summary TEXT DEFAULT '',
      ticket_status TEXT DEFAULT 'open',
      abuse_flagged INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      body_html TEXT NOT NULL DEFAULT '',
      variables TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      related_id INTEGER,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS landing_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      keyword TEXT,
      audience TEXT,
      html_content TEXT,
      provider_id INTEGER,
      plan_id INTEGER,
      visits INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS seo_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id INTEGER DEFAULT 1,
      run_type TEXT,
      action TEXT,
      details TEXT,
      keyword TEXT,
      result TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id INTEGER DEFAULT 1,
      agent TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      order_id INTEGER,
      session_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id INTEGER DEFAULT 1,
      name TEXT,
      email TEXT,
      avatar TEXT,
      password_hash TEXT,
      provider TEXT DEFAULT 'email',
      provider_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS demand_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_name TEXT,
      source_url TEXT,
      content TEXT,
      author TEXT,
      pain_point TEXT,
      opportunity TEXT,
      intent_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'new',
      lead_contact TEXT,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      groups_mentioned TEXT DEFAULT '',
      language TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sniffer_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      name TEXT NOT NULL,
      lead_count INTEGER DEFAULT 0,
      sniff_count INTEGER DEFAULT 0,
      total_intent_score REAL DEFAULT 0,
      last_sniffed TEXT,
      enabled INTEGER DEFAULT 1,
      discovered_by TEXT DEFAULT 'seed',
      first_seen TEXT DEFAULT (datetime('now')),
      UNIQUE(source_type, name)
    );

    CREATE TABLE IF NOT EXISTS page_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      visits INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      FOREIGN KEY (page_id) REFERENCES landing_pages(id),
      UNIQUE(page_id, date)
    );

    CREATE TABLE IF NOT EXISTS brain_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_type TEXT NOT NULL,
      context TEXT,
      action_taken TEXT,
      outcome TEXT,
      score REAL DEFAULT 0,
      tags TEXT DEFAULT '[]',
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rank_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id INTEGER REFERENCES landing_pages(id),
      keyword TEXT NOT NULL,
      target_url TEXT,
      search_engine TEXT DEFAULT 'google',
      locale TEXT DEFAULT 'us',
      position INTEGER,
      previous_position INTEGER,
      trend TEXT DEFAULT 'new',
      checked_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rank_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_id INTEGER NOT NULL,
      position INTEGER,
      checked_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS brain_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_type TEXT NOT NULL,
      params TEXT,
      reasoning TEXT,
      confidence REAL,
      metrics_snapshot TEXT,
      executed INTEGER DEFAULT 0,
      executed_at TEXT,
      outcome_score REAL,
      outcome_note TEXT,
      evaluated_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  try { db.exec("ALTER TABLE orders ADD COLUMN source TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE provider_plans ADD COLUMN paypal_link TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id)"); } catch (e) {}

  try { db.exec("ALTER TABLE providers_catalog ADD COLUMN website_id INTEGER DEFAULT 1"); } catch (e) {}
  try { db.exec("ALTER TABLE provider_plans ADD COLUMN website_id INTEGER DEFAULT 1"); } catch (e) {}
  try { db.exec("ALTER TABLE orders ADD COLUMN website_id INTEGER DEFAULT 1"); } catch (e) {}
  try { db.exec("ALTER TABLE chat_sessions ADD COLUMN website_id INTEGER DEFAULT 1"); } catch (e) {}
  try { db.exec("ALTER TABLE chat_sessions ADD COLUMN customer_email TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE chat_sessions ADD COLUMN issue_summary TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE chat_sessions ADD COLUMN ticket_status TEXT DEFAULT 'open'"); } catch (e) {}
  try { db.exec("ALTER TABLE chat_sessions ADD COLUMN abuse_flagged INTEGER DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE chat_sessions ADD COLUMN customer_phone TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE landing_pages ADD COLUMN website_id INTEGER DEFAULT 1"); } catch (e) {}
  try { db.exec("ALTER TABLE seo_log ADD COLUMN website_id INTEGER DEFAULT 1"); } catch (e) {}
  try { db.exec("ALTER TABLE agent_log ADD COLUMN website_id INTEGER DEFAULT 1"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN website_id INTEGER DEFAULT 1"); } catch (e) {}
  try { db.exec("ALTER TABLE websites ADD COLUMN language TEXT DEFAULT 'en'"); } catch (e) {}
  try { db.exec("ALTER TABLE websites ADD COLUMN deploy_region TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE websites ADD COLUMN deploy_status TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("ALTER TABLE websites ADD COLUMN deployed_at TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("ALTER TABLE websites ADD COLUMN tagline TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE demand_signals ADD COLUMN email TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE demand_signals ADD COLUMN phone TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE demand_signals ADD COLUMN groups_mentioned TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE demand_signals ADD COLUMN language TEXT DEFAULT ''"); } catch (e) {}
  try { db.exec("ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'super_admin'"); } catch (e) {}
  try { db.exec("ALTER TABLE admin_users ADD COLUMN permissions TEXT DEFAULT '[]'"); } catch (e) {}

  try { db.exec(`CREATE TABLE IF NOT EXISTS sniffer_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_type TEXT NOT NULL, name TEXT NOT NULL,
    lead_count INTEGER DEFAULT 0, sniff_count INTEGER DEFAULT 0, total_intent_score REAL DEFAULT 0,
    last_sniffed TEXT, enabled INTEGER DEFAULT 1, discovered_by TEXT DEFAULT 'seed',
    first_seen TEXT DEFAULT (datetime('now')), UNIQUE(source_type, name))`); } catch (e) {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS page_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT, page_id INTEGER NOT NULL, date TEXT NOT NULL,
    visits INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0,
    UNIQUE(page_id, date))`); } catch (e) {}

  const existingWebsite = db.prepare('SELECT id FROM websites LIMIT 1').get();
  if (!existingWebsite) {
    db.prepare('INSERT INTO websites (name, slug, site_name, domains) VALUES (?, ?, ?, ?)').run(
      'Default', 'default', process.env.SITE_NAME || 'IPTV Boss', '[]'
    );
  }

  const existingAdmin = db.prepare('SELECT id FROM admin_users LIMIT 1').get();
  if (!existingAdmin) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, 'super_admin');
  }

  const existingProviders = db.prepare('SELECT id FROM providers_catalog LIMIT 1').get();
  if (!existingProviders) {
    const insertProvider = db.prepare('INSERT INTO providers_catalog (name, specialty, website_id) VALUES (?, ?, 1)');
    const insertPlan = db.prepare(
      'INSERT INTO provider_plans (provider_id, plan_name, plan_type, duration_days, price_sell, channels, streams, website_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
    );

    const p1 = insertProvider.run('StreamMax', 'Sports');
    insertPlan.run(p1.lastInsertRowid, 'Trial', 'trial', 3, 0, 5000, 1);
    insertPlan.run(p1.lastInsertRowid, 'Basic', 'monthly', 30, 14.99, 10000, 1);
    insertPlan.run(p1.lastInsertRowid, 'Premium', 'monthly', 30, 24.99, 20000, 2);
    insertPlan.run(p1.lastInsertRowid, 'Ultimate', 'yearly', 365, 89.99, 25000, 4);

    const p2 = insertProvider.run('UltraTV', 'Arabic');
    insertPlan.run(p2.lastInsertRowid, 'Trial', 'trial', 3, 0, 3000, 1);
    insertPlan.run(p2.lastInsertRowid, 'Basic', 'monthly', 30, 12.99, 8000, 1);
    insertPlan.run(p2.lastInsertRowid, 'Premium', 'monthly', 30, 19.99, 15000, 2);
    insertPlan.run(p2.lastInsertRowid, 'Ultimate', 'yearly', 365, 79.99, 20000, 4);

    const p3 = insertProvider.run('ClearStream', 'General');
    insertPlan.run(p3.lastInsertRowid, 'Trial', 'trial', 3, 0, 7000, 1);
    insertPlan.run(p3.lastInsertRowid, 'Basic', 'monthly', 30, 9.99, 12000, 1);
    insertPlan.run(p3.lastInsertRowid, 'Premium', 'monthly', 30, 17.99, 18000, 2);
    insertPlan.run(p3.lastInsertRowid, 'Ultimate', 'yearly', 365, 69.99, 22000, 4);
  }

  const defaultSettings = [
    ['smtp_host', process.env.SMTP_HOST || ''],
    ['smtp_port', process.env.SMTP_PORT || ''],
    ['smtp_user', process.env.SMTP_USER || ''],
    ['smtp_pass', process.env.SMTP_PASS || ''],
    ['smtp_from_name', process.env.SMTP_FROM_NAME || ''],
    ['smtp_from_email', process.env.SMTP_FROM_EMAIL || ''],
    ['sellup_api_key', process.env.SELLUP_API_KEY || ''],
    ['sellup_store_id', process.env.SELLUP_STORE_ID || ''],
    ['sellup_webhook_secret', process.env.SELLUP_WEBHOOK_SECRET || ''],
    ['ai_key_groq', process.env.AI_KEY_GROQ || ''],
    ['ai_key_gemini', process.env.AI_KEY_GEMINI || ''],
    ['ai_key_deepseek', process.env.AI_KEY_DEEPSEEK || ''],
    ['ai_key_openai', process.env.AI_KEY_OPENAI || ''],
    ['ai_key_anthropic', process.env.ANTHROPIC_API_KEY || ''],
    ['ai_key_openrouter', process.env.AI_KEY_OPENROUTER || ''],
    ['ai_key_custom', process.env.AI_KEY_CUSTOM || ''],
    ['ai_key_kimi', process.env.AI_KEY_KIMI || ''],
    ['ai_model_groq', ''],
    ['ai_model_gemini', ''],
    ['ai_model_deepseek', ''],
    ['ai_model_kimi', ''],
    ['ai_model_openai', ''],
    ['ai_model_anthropic', ''],
    ['ai_model_openrouter', ''],
    ['ai_model_custom', ''],
    ['ai_url_custom', ''],
    ['anthropic_api_key', ''],
    ['site_name', process.env.SITE_NAME || 'IPTV Boss'],
    ['site_url', process.env.SITE_URL || 'http://localhost:3001'],
    ['support_email', process.env.SUPPORT_EMAIL || ''],
    ['paypal_email', ''],
    ['paypal_client_id', ''],
    ['paypal_client_secret', ''],
    ['paypal_mode', 'sandbox'],
    ['stripe_publishable_key', ''],
    ['stripe_secret_key', ''],
    ['payment_methods_enabled', '["paypal","crypto","email","sepa","stripe"]'],
    ['google_client_id', ''],
    ['apple_client_id', ''],
    ['namecheap_api_user', ''],
    ['namecheap_api_key', ''],
    ['namecheap_username', ''],
    ['namecheap_client_ip', ''],
    ['telegram_channels', '["iptvchat","iptvcommunity","iptv_providers","iptv_deutschland","iptv_espanol","iptvbrasil","iptv_india","arabic_iptv","iptv_france","iptv_italia","iptv_nederlands"]'],
    ['telegram_sniffer_interval', '6'],
    ['telegram_sniffer_enabled', '1'],
    ['youtube_channels', '["iptv review","best iptv 2026","iptv deutschland","iptv españa","iptv brasil","iptv india","iptv arabic","iptv france","iptv italia","iptv nederland"]'],
    ['youtube_api_key', process.env.YOUTUBE_API_KEY || ''],
    ['youtube_sniffer_interval', '12'],
    ['youtube_sniffer_enabled', '0'],
    ['reddit_channels', '["iptv","IPTVReview","cordcutters","IPTVdeutschland","IPTVespanol","IPTVBrasil","IPTVIndia","arabic_iptv","IPTVfrance","IPTVitalia","IPTVnederlands"]'],
    ['reddit_sniffer_interval', '6'],
    ['reddit_sniffer_enabled', '0'],
    ['twitter_channels', '["iptv","iptv streaming","best iptv","iptv deutschland","iptv españa","iptv brasil","iptv india","iptv arabic","iptv france","iptv italia","iptv nederland"]'],
    ['twitter_sniffer_interval', '6'],
    ['twitter_sniffer_enabled', '0'],
    ['serpapi_key', ''],
    ['rank_check_interval', '24'],
    ['auto_build_enabled', '1'],
    ['auto_build_threshold', '70'],
    ['auto_build_max_per_run', '5'],
    ['auto_build_interval', '6'],
  ];

  const upsertSetting = db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)');
  for (const [key, value] of defaultSettings) {
    upsertSetting.run(key, value);
  }

  // Seed default email templates
  const existingTemplateCount = db.prepare('SELECT COUNT(*) as c FROM email_templates').get().c;
  if (existingTemplateCount === 0) {
    const defaultTemplates = [
      {
        template_key: 'trial_default',
        name: 'Trial Credentials (Default)',
        subject: 'Your {{duration_hours}}h {{site_name}} trial is ready!',
        body_html: [
'<h2 style="color:#fff;margin:0 0 16px;">Your {{duration_hours}}h trial is ready!</h2>',
'<p style="color:#a0a0a0;margin:0 0 24px;">Hi {{customer_name}}, start watching now.</p>',
'<div style="background:#0f0f0f;border-radius:8px;padding:20px;margin:0 0 24px;font-family:monospace;">',
'{{#if username}}<p style="color:#00d4ff;margin:0 0 8px;">Username: <span style="color:#fff;">{{username}}</span></p>{{/if}}',
'{{#if password}}<p style="color:#00d4ff;margin:0 0 8px;">Password: <span style="color:#fff;">{{password}}</span></p>{{/if}}',
'{{#if server_url}}<p style="color:#00d4ff;margin:0 0 8px;">Server: <span style="color:#fff;">{{server_url}}</span></p>{{/if}}',
'</div>',
'<div style="text-align:center;margin-top:24px;">',
'  <a href="{{site_url}}/#plans" style="display:inline-block;background:#00d4ff;color:#000;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:700;">Upgrade to Full Access</a>',
'</div>',
].join('\n'),
        variables: JSON.stringify([
          'customer_name', 'customer_email', 'username', 'password', 'server_url',
          'duration_hours', 'site_name', 'site_url', 'provider_name', 'plan_name'
        ]),
      },
      {
        template_key: 'credentials_default',
        name: 'Activation Credentials (Default)',
        subject: 'Your {{site_name}} activation credentials',
        body_html: [
'<h2 style="color:#fff;margin:0 0 16px;">Your IPTV credentials</h2>',
'<p style="color:#a0a0a0;margin:0 0 24px;">Hi {{customer_name}}, here\'s everything you need to start watching.</p>',
'<div style="background:#0f0f0f;border-radius:8px;padding:20px;margin:0 0 24px;font-family:monospace;">',
'{{#if username}}<p style="color:#00d4ff;margin:0 0 8px;">Username: <span style="color:#fff;">{{username}}</span></p>{{/if}}',
'{{#if password}}<p style="color:#00d4ff;margin:0 0 8px;">Password: <span style="color:#fff;">{{password}}</span></p>{{/if}}',
'{{#if server_url}}<p style="color:#00d4ff;margin:0 0 8px;">Server: <span style="color:#fff;">{{server_url}}</span></p>{{/if}}',
'{{#if code}}<p style="color:#00d4ff;margin:0;">Code: <span style="color:#fff;">{{code}}</span></p>{{/if}}',
'</div>',
'<p style="color:#666;font-size:13px;margin:0 0 8px;">Setup instructions:</p>',
'<ol style="color:#a0a0a0;font-size:13px;margin:0;padding-left:20px;">',
'  <li>Download an IPTV player (TiviMate, IPTV Smarters, or VLC)</li>',
'  <li>Enter the server URL and your credentials</li>',
'  <li>Enjoy your channels!</li>',
'</ol>',
].join('\n'),
        variables: JSON.stringify([
          'customer_name', 'customer_email', 'username', 'password', 'server_url', 'code',
          'site_name', 'provider_name', 'plan_name'
        ]),
      },
      {
        template_key: 'payment_link_default',
        name: 'Payment Link (Default)',
        subject: 'Your {{site_name}} checkout link',
        body_html: [
'<h2 style="color:#fff;margin:0 0 16px;">Your checkout link is ready</h2>',
'<p style="color:#a0a0a0;margin:0 0 24px;">Hi {{customer_name}}, click below to complete your IPTV subscription.</p>',
'{{#if plan_name}}',
'<div style="background:#0f0f0f;border-radius:8px;padding:16px;margin:16px 0;">',
'  <p style="color:#00d4ff;margin:0 0 4px;font-size:14px;">{{plan_name}}</p>',
'  {{#if amount}}<p style="color:#fff;margin:0;font-size:20px;font-weight:700;">${{amount}}</p>{{/if}}',
'  {{#if order_id}}<p style="color:#666;margin:4px 0 0;font-size:12px;">Order #{{order_id}}</p>{{/if}}',
'</div>{{/if}}',
'<div style="text-align:center;margin:32px 0;">',
'  <a href="{{checkout_url}}" style="display:inline-block;background:#00d4ff;color:#000;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:16px;">Complete Payment</a>',
'</div>',
'<p style="color:#666;font-size:13px;margin:0;">Your credentials will arrive after payment confirmation.</p>',
].join('\n'),
        variables: JSON.stringify([
          'customer_name', 'customer_email', 'checkout_url', 'plan_name', 'amount', 'order_id', 'site_name'
        ]),
      },
    ];
    const insertTemplate = db.prepare(
      'INSERT INTO email_templates (template_key, name, subject, body_html, variables) VALUES (?, ?, ?, ?, ?)'
    );
    for (const t of defaultTemplates) {
      insertTemplate.run(t.template_key, t.name, t.subject, t.body_html, t.variables);
    }
  }

  return db;
}

module.exports = { getDb, initializeDatabase };
