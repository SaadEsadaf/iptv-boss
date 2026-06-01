const { generateText } = require('./aiProvider')

const FALLBACKS = {
  overview: {
    'revenue|earnings|money|how much': 'Revenue is shown on the Overview dashboard — cards for today, this week, this month, and all-time. Below you\'ll find a revenue-per-day chart and an orders-by-plan breakdown. Check it regularly to spot trends.',
    'stock|code.*low|inventory': 'Code stock is displayed at the top of Overview. If you\'re running low, set up stock alerts in Settings or import new codes from the Codes tab.',
    'chart|graph|trend': 'The Overview page has a revenue-per-day chart and a plan breakdown. These help you spot weekly trends and see which plans are most popular.',
    'default|welcome|first': 'This is the main dashboard. It shows revenue, active orders, code stock, chat conversion rate, and recent agent activity. Start by exploring each tab in the sidebar.',
  },
  providers: {
    'create|add.*provider|new.*provider': 'Go to the Providers tab and click "Add Provider". Fill in the name, specialty (e.g. Sports, Arabic), panel URL, and login credentials. Then add plans with pricing.',
    'add.*plan|create.*plan|pricing': 'After creating a provider, click "Add Plan" under it. Set trial/monthly/yearly pricing. Later you can import activation codes for each plan in the Codes tab.',
    'edit|delete|remove': 'Each provider row has Edit and Delete buttons. Editing lets you change name, specialty, panel details. Deleting removes the provider and its plans permanently.',
    'specialty|tag|categor': 'Specialty tags (e.g. Sports, Arabic, General) help match providers to customer needs during checkout. Set them when creating or editing a provider.',
    'panel|login': 'Each provider has panel_url, panel_username, and panel_password fields. These are for your internal access to the provider\'s admin panel — stored encrypted.',
  },
  codes: {
    'import|upload|add.*code|paste': 'To import codes: go to Codes tab, choose the provider and plan, then either paste codes (format: code,username,password,server_url per line) or upload a CSV file. Use batches to organize shipments.',
    'batch|group|organize': 'Batches help organize codes from different shipments. After importing, you can filter by batch name, provider, plan, or status.',
    'export|download|backup': 'Click the Export button in the Codes tab to download all codes as CSV. Great for backups or external reconciliation.',
    'available|assigned|sold|status': 'Codes have 3 statuses: available (unused), assigned (given to a customer in checkout), sold (activated/paid). Filter by any status at the top.',
    'low|alert|stock|notif': 'Stock alerts are set in Settings. You\'ll get notified when available codes for any plan drop below your threshold. Import more codes when alerted.',
  },
  settings: {
    'smtp|email|mail|send': 'To set up SMTP: go to Settings → SMTP section. Use smtp.gmail.com, port 587, your Gmail address, and an App Password (generate one at Google Account → Security → App Passwords). Then click Test Email to verify.',
    'ai.*key|groq|gemini|openai|anthropic|api.*key': 'At least one AI key is needed for sniffers, SEO, and page generator. Groq is fastest and has a free tier at console.groq.com. Enter the key in Settings → AI Keys, then click Test AI.',
    'namecheap|domain.*api': 'Namecheap API settings are in Settings → Namecheap. You need: API user (your Namecheap username), API key (from Namecheap account → API), and whitelisted IP. Then test the connection.',
    'sellup|payment|gateway': 'Sellup payment settings are in Settings → Sellup. Enter your API key, store ID, and webhook secret from your Sellup dashboard. Then test the connection.',
    'brand|logo|site.*name|social|login|google|apple': 'Branding settings include site name, logo URL, social login (Google/Apple OAuth credentials). All configurable in Settings under their respective sections.',
  },
  orders: {
    'pending|process|fulfill': 'Pending orders show in the Orders tab. Filter by "pending" status. Complete the order to auto-send credentials, or process a refund if needed.',
    'refund|return|cancel': 'To refund an order: find it in Orders, click the refund button. This frees the activation code back to the pool and marks the order as refunded.',
    'resend|email|credential': 'Use the Resend button on any completed order to re-send credentials to the customer. Useful if they lost their email or it went to spam.',
    'search|find|customer': 'Use the search bar in Orders to find orders by customer name or email. You can also filter by status and plan.',
  },
  pages: {
    'create|add.*page|new.*page': 'To create a landing page: go to Pages tab, click "Add Page", give it a title, slug (e.g. best-iptv-2026), and target keyword. The AI will generate content. Pages are served at /lp/:slug.',
    'slug|url|link': 'The slug is the URL path of your landing page, e.g. "best-iptv-2026" becomes /lp/best-iptv-2026. Keep it short and keyword-rich.',
    'ai.*generat|content|write': 'Page content is AI-generated when you create a page. It includes: hero section, features, pricing table, testimonials, FAQ, and the chat widget. Keywords come from SEO Audit suggestions.',
    'delete|remove|disable': 'Use the toggle to set a page active/inactive. Delete removes it permanently. Inactive pages return 404.',
    'track|visit|analytics|convert': 'Page visits and conversions are tracked automatically. Check SEO → Analytics sub-tab for a 30-day chart and per-page performance table with conversion rates.',
  },
  seo: {
    'audit|run|scan|check': 'Run SEO Audit from the Audit sub-tab. It pulls top leads from your demand signals and generates targeted keyword suggestions with search intent. Run it weekly.',
    'lead|signal|sniff|demand': 'Leads tab shows live signals from Telegram, Reddit, YouTube, and Twitter sniffers. Each card has pain points, opportunity, contact info, and intent score. Use filters to narrow down by source, language, or status.',
    'analytics|stats|chart': 'The Analytics sub-tab shows landing page performance: total visits, conversions, conversion rate, a 30-day bar chart, and a per-page table with 7-day trend sparkbars.',
    'source|channel|platform|discover': 'The Sources sub-tab shows per-platform performance (Telegram, Reddit, YouTube, Twitter). Click "AI Discover" to find new sources. Toggle sources on/off individually.',
    'sniff.*all|refresh|update': 'Click "Sniff All Sources" from the Leads tab to run all 4 sniffers in parallel. Or sniff individual platforms. Results appear in real-time.',
  },
  domains: {
    'check|search|availab': 'Use the domain check feature in Domains tab to see if a domain is available. Enter a name and select a TLD (.com, .net, etc.). Requires Namecheap API configured in Settings.',
    'list|view|all|manage': 'The Domains tab shows your Namecheap domains in a paginated list with expiry dates and auto-renew status. Click a domain for details.',
    'namecheap|api|config': 'You need Namecheap API credentials in Settings → Namecheap first: API user, API key, and whitelisted IP. Test the connection from Settings.',
  },
  agents: {
    'sniffer|telegram|reddit|youtube|twitter|source': 'Sniffers crawl Telegram, Reddit, YouTube, and Twitter for people asking about or recommending IPTV. Configure each in SEO → Settings sub-tab (channels, intervals, enable/disable). Results appear in Leads tab.',
    'stock|monitor|alert': 'Stock Monitor runs hourly and alerts when activation codes run low for any plan. Configure thresholds in Settings.',
    'seo.*agent|audit|keyword': 'SEO Agent runs weekly (Sunday midnight). It pulls top leads, generates keyword suggestions, and can auto-build landing pages from suggestions.',
    'error|fail|log|wrong': 'Agent Log shows all activity from sniffers, SEO agent, stock monitor, and source ranker. Check there if something isn\'t working — look for error messages.',
  },
}

const DEFAULT_FALLBACKS = [
  'I\'ll help you navigate the admin panel. Tell me what you\'d like to do — manage providers, import codes, check orders, configure settings, or something else.',
  'I\'m here for admin panel guidance. Try asking about the current tab\'s features, or ask me how to configure something.',
  'You can ask me about any tab in the admin panel: providers, codes, orders, SEO, settings, pages, domains, and more. What do you need help with?',
]

function fallbackAnswer(tab, question) {
  const tabFallbacks = FALLBACKS[tab]
  if (tabFallbacks) {
    for (const [pattern, answer] of Object.entries(tabFallbacks)) {
      if (new RegExp(pattern, 'i').test(question)) {
        return { answer, autofill: tab === 'settings' && question.toLowerCase().includes('smtp') ? [
          { key: 'smtp_host', value: 'smtp.gmail.com', label: 'Gmail SMTP' },
          { key: 'smtp_port', value: '587', label: 'Port 587 (TLS)' },
        ] : undefined }
      }
    }
  }
  // Cross-tab fallbacks
  if (/where.*tab|switch|navigate|go to/i.test(question)) {
    const tabMap = { ...TAB_CONTEXT }
    for (const [id, info] of Object.entries(tabMap)) {
      if (question.toLowerCase().includes(id) || info.name.toLowerCase().split(' ').some(w => question.toLowerCase().includes(w))) {
        return { answer: `The "${info.name}" tab is in the left sidebar. Click on it to access ${info.description.split('.')[0].toLowerCase()}.` }
      }
    }
  }

  const tabInfo = TAB_CONTEXT[tab]
  if (tabInfo) {
    const tip = tabInfo.tips[Math.floor(Math.random() * tabInfo.tips.length)]
    return { answer: `Here's a pro tip for the "${tabInfo.name}" tab: ${tip}` }
  }

  return { answer: DEFAULT_FALLBACKS[Math.floor(Math.random() * DEFAULT_FALLBACKS.length)] }
}

const TAB_CONTEXT = {
  overview: {
    name: 'Overview',
    description: 'Dashboard with revenue (today/week/month/total), order counts, code stock, chat conversion rate, revenue-per-day chart, orders-by-plan breakdown, recent agent activity, and provider stats.',
    fields: [],
    tips: [
      'Check Overview daily to track revenue and conversion trends.',
      'Low code stock shown here — set up alerts in Settings → Stock Alerts.',
    ],
  },
  providers: {
    name: 'Providers',
    description: 'Manage IPTV provider catalog. Each provider has plans (trial/monthly/yearly), specialty tags, panel login, and per-plan code stock tracking.',
    fields: [
      { key: 'name', label: 'Provider Name', tip: 'e.g. StreamMax, UltraTV' },
      { key: 'specialty', label: 'Specialty', tip: 'e.g. Sports, Arabic, General' },
      { key: 'panel_url', label: 'Panel URL', tip: 'URL to the provider admin panel' },
      { key: 'panel_username', label: 'Panel Username', tip: 'Login for the provider panel' },
      { key: 'panel_password', label: 'Panel Password', tip: 'Saved securely, shown with 👁️ toggle' },
    ],
    tips: [
      'Create a provider first, then add plans with pricing.',
      'Import activation codes per provider/plan from the Codes tab.',
      'Use specialty tags to help the checkout flow match providers to customer needs.',
    ],
  },
  codes: {
    name: 'Codes',
    description: 'Import, manage, and track activation codes. Supports paste import, CSV upload, batch management, filtering by provider/plan/status, and CSV export.',
    fields: [],
    tips: [
      'Import codes in bulk via paste or CSV — format: code,username,password,server_url.',
      'Use batches to organize large imports from different shipments.',
      'Set stock alerts in Settings so you get notified before running out.',
      'Export all codes as CSV for backup or external use.',
    ],
  },
  trials: {
    name: 'Trials',
    description: 'Manage trial/demo codes separate from paid codes. Track duration (hours), status, and assignment.',
    fields: [],
    tips: [
      'Default trial duration is 72 hours — adjust on import.',
      'Trials are assigned during checkout when a customer picks trial plan.',
      'Keep a healthy pool of trials to convert leads.',
    ],
  },
  orders: {
    name: 'Orders',
    description: 'View all customer orders with status tracking. Filter by status, search by customer name/email. View order details including chat session context. Resend credentials email or process refunds.',
    fields: [],
    tips: [
      'Completed orders have credentials auto-sent via email.',
      'Use the resend button if customer didn\'t receive credentials.',
      'Refunding an order frees the activation code back to the pool.',
      'Check the chat session linked to an order for context.',
    ],
  },
  chat: {
    name: 'Chat',
    description: 'Review past chat sessions between customers and Alex (AI sales assistant). Shows visitor info, messages, order links, and conversion status.',
    fields: [],
    tips: [
      'Chat sessions with converted=true led to a sale.',
      'Review unconverted chats to improve the sales script.',
      'Each session shows the plan/provider the customer was interested in.',
    ],
  },
  pages: {
    name: 'Pages',
    description: 'Create and manage SEO landing pages. AI-generated Netflix-style pages from keywords. Track visits, conversions, and conversion rate per page.',
    fields: [
      { key: 'title', label: 'Page Title', tip: 'Display name for the page in admin' },
      { key: 'slug', label: 'URL Slug', tip: 'e.g. "best-iptv-2026" → /lp/best-iptv-2026' },
      { key: 'keyword', label: 'Target Keyword', tip: 'The search term this page targets' },
      { key: 'audience', label: 'Target Audience', tip: 'e.g. sports fans, cord cutters, German IPTV seekers' },
    ],
    tips: [
      'Build pages from SEO Audit suggestions — they\'re AI-generated based on real leads.',
      'Each page includes: hero, features, pricing, testimonials, FAQ, and chat widget.',
      'Track page performance in SEO → Analytics tab.',
    ],
  },
  seo: {
    name: 'SEO',
    description: 'Complete SEO and lead intelligence hub with 5 sub-tabs: Audit (run weekly AI audit, view keyword suggestions, build pages), Leads (browse sniffed signals from Telegram/Reddit/YouTube/Twitter with filters), Analytics (landing page stats with 30-day chart), Sources (source performance tables, AI discovery, add/toggle), Settings (sniffer config per platform).',
    fields: [],
    tips: [
      'Run SEO Audit weekly — it pulls top leads and generates targeted keyword suggestions.',
      'Sniff Telegram/Reddit/YouTube/Twitter from the Leads tab to find potential customers.',
      'Check Sources tab to see which channels perform best — system auto-discovers new ones.',
      'Configure each sniffer in Settings sub-tab (channels, intervals, API keys).',
      'YouTube sniffer needs a YouTube Data API v3 key in Settings.',
    ],
  },
  'agent-log': {
    name: 'Agent Log',
    description: 'Activity log for all automated agents: TelegramSniffer, SEOAgent, StockMonitor, RedditSniffer, YouTubeSniffer, TwitterSniffer, SourceRanker, PageBuilder.',
    fields: [],
    tips: [
      'Filter by agent name to see specific sniffer activity.',
      'Check here if a sniffer isn\'t finding leads — look for errors.',
      'SourceRanker logs show AI discoveries and pruning events.',
    ],
  },
  websites: {
    name: 'Websites',
    description: 'Multi-site management. Each website has its own name, slug, domains, branding, language, and deploy region. Used for running multiple IPTV brands from one admin.',
    fields: [
      { key: 'name', label: 'Site Name', tip: 'Display name for internal reference' },
      { key: 'slug', label: 'URL Slug', tip: 'Unique identifier used in routing' },
      { key: 'domains', label: 'Domains', tip: 'JSON array of custom domains' },
      { key: 'site_name', label: 'Brand Name', tip: 'Shown to customers in emails and pages' },
      { key: 'logo_url', label: 'Logo URL', tip: 'URL to the site logo image' },
      { key: 'language', label: 'Default Language', tip: 'en, fr, nl, etc.' },
    ],
    tips: [
      'Switch between websites using the dropdown in sidebar.',
      'Each website has its own landing pages, orders, and settings.',
      'Website 1 is the default — cannot be deleted.',
    ],
  },
  servers: {
    name: 'Servers',
    description: 'Deploy targets for pushing landing pages and site files to production VPS servers. Each target has a region key, host, SSH user, and deploy path.',
    fields: [
      { key: 'region_key', label: 'Region Key', tip: 'e.g. eu-west, us-east' },
      { key: 'region_name', label: 'Region Name', tip: 'e.g. Europe West, US East' },
      { key: 'host', label: 'Server Host', tip: 'IP or domain of the target server' },
      { key: 'user', label: 'SSH User', tip: 'Default: root' },
      { key: 'path', label: 'Deploy Path', tip: 'Default: /var/www/iptv-boss' },
    ],
    tips: [
      'Set up a deploy target per region where you host customer-facing sites.',
      'Deploy landing pages from the Pages tab after building them.',
    ],
  },
  domains: {
    name: 'Domains',
    description: 'Namecheap domain management. View paginated domain list, check domain availability, view domain details. Requires Namecheap API credentials in Settings.',
    fields: [],
    tips: [
      'Configure Namecheap API credentials in Settings → Namecheap.',
      'Use domain check to test availability of new domain ideas.',
      'Domain details show registrar info, expiry, and DNS settings.',
    ],
  },
  settings: {
    name: 'Settings',
    description: 'Global configuration hub: AI provider keys (Groq, Gemini, DeepSeek, OpenAI, Anthropic, Custom with show/hide toggle), SMTP email config, Namecheap API, Sellup payment processing, PayPal/Stripe gateway keys, site branding, social login (Google/Apple), and admin language selector (EN/FR/NL). Test buttons for Email, Namecheap, Sellup, and AI connection.',
    fields: [
      { key: 'ai_key_groq', label: 'Groq API Key', tip: 'Fastest provider, recommended primary', group: 'AI Keys' },
      { key: 'ai_key_gemini', label: 'Gemini API Key', tip: 'Google\'s model, good fallback', group: 'AI Keys' },
      { key: 'ai_key_openai', label: 'OpenAI API Key', tip: 'ChatGPT provider', group: 'AI Keys' },
      { key: 'ai_key_anthropic', label: 'Anthropic API Key', tip: 'Claude provider', group: 'AI Keys' },
      { key: 'smtp_host', label: 'SMTP Host', tip: 'e.g. smtp.gmail.com or your mail server', group: 'SMTP' },
      { key: 'smtp_port', label: 'SMTP Port', tip: '587 (TLS) or 465 (SSL)', group: 'SMTP' },
      { key: 'smtp_user', label: 'SMTP Username', tip: 'Full email address usually', group: 'SMTP' },
      { key: 'smtp_pass', label: 'SMTP Password', tip: 'App password for Gmail', group: 'SMTP' },
      { key: 'smtp_from_email', label: 'From Email', tip: 'Shown as sender in customer emails', group: 'SMTP' },
      { key: 'namecheap_api_user', label: 'Namecheap API User', tip: 'Your Namecheap username', group: 'Namecheap' },
      { key: 'namecheap_api_key', label: 'Namecheap API Key', tip: 'From Namecheap account → API', group: 'Namecheap' },
      { key: 'namecheap_client_ip', label: 'Whitelisted IP', tip: 'IP allowed to use the Namecheap API', group: 'Namecheap' },
    ],
    tips: [
      'At least one AI key is required for sniffer enrichment, SEO audit, and page builder.',
      'Test each provider with the "Test AI" button after adding a key.',
      'SMTP is needed for sending credentials and marketing emails.',
      'Settings are stored in DB with env var fallback — survive server restarts.',
      'Admin language changes sidebar and page titles immediately.',
    ],
  },
}

async function handleQuery(tab, question, db) {
  const tabInfo = TAB_CONTEXT[tab]
  if (!tabInfo) return { answer: `I don't have info about the "${tab}" tab yet.` }

  const fieldsHelp = tabInfo.fields.length > 0
    ? `\nFields in this tab:\n${tabInfo.fields.map(f => `- ${f.label}: ${f.tip}`).join('\n')}`
    : ''

  const tipsHelp = tabInfo.tips.length > 0
    ? `\nPro tips:\n${tabInfo.tips.map(t => `- ${t}`).join('\n')}`
    : ''

  let settingsContext = ''
  if (tab === 'settings' && question.toLowerCase().includes('key') || question.toLowerCase().includes('api')) {
    const rows = db.prepare("SELECT key, value FROM app_settings WHERE key LIKE 'ai_%' OR key LIKE 'smtp_%' OR key LIKE 'namecheap_%'").all()
    const configured = rows.filter(r => r.value).map(r => r.key).join(', ')
    const missing = rows.filter(r => !r.value).map(r => r.key).join(', ')
    settingsContext = `\nConfigured: ${configured || 'none'}\nMissing: ${missing || 'none'}`
  }

  let autoFill = []
  if (question.toLowerCase().includes('smtp') && tab === 'settings') {
    autoFill = [
      { key: 'smtp_host', value: 'smtp.gmail.com', label: 'Gmail SMTP' },
      { key: 'smtp_port', value: '587', label: 'Port 587 (TLS)' },
      { key: 'smtp_from_name', value: 'Dalletek', label: 'Sender Name' },
    ]
  }

  const prompt = `You are the Dalletek AI Assistant — a helpful admin panel guide.

Current tab: "${tabInfo.name}"
Description: ${tabInfo.description}${fieldsHelp}${tipsHelp}${settingsContext}

The user asks: "${question}"

Give a clear, practical answer (2-4 sentences). If they're asking about configuration, give specific values or steps. If they need to go to another tab first, say so.
${autoFill.length > 0 ? '\nThe user is asking about SMTP setup — suggest using Gmail SMTP with port 587 and an app password.' : ''}

Return ONLY the answer text, no JSON formatting.`

  try {
    const answer = await generateText({
      system: 'You are a concise, helpful admin assistant for an IPTV business platform.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 500,
      task: 'assistant',
    })
    const clean = answer.trim()
    return { answer: clean, autofill: autoFill.length > 0 ? autoFill : undefined }
  } catch (e) {
    console.warn('[AdminAssistant] AI failed, using fallback:', e.message)
    return fallbackAnswer(tab, question)
  }
}

async function applySuggestion(key, value) {
  const db = require('../db').getDb()
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, String(value))
  db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
    'AdminAssistant', 'autofill', `Set ${key} to "${value}"`
  )
  return true
}

module.exports = { handleQuery, applySuggestion, TAB_CONTEXT }
