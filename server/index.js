require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initializeDatabase } = require('./db');

const app = express();

const { startStockMonitor } = require('./services/stockAlert');
const { startTelegramSniffer } = require('./services/telegramSniffer');
const { startYouTubeSniffer } = require('./services/youtubeSniffer');
const { startRedditSniffer } = require('./services/redditSniffer');
const { startTwitterSniffer } = require('./services/twitterSniffer');
const { startBrain } = require('./services/businessBrain');
const { startRankChecker } = require('./services/rankTracker');
const { startSalesEngine, ensureTables } = require('./services/salesEngine');

initializeDatabase();
ensureTables();

startStockMonitor();
startTelegramSniffer();
startYouTubeSniffer();
startRedditSniffer();
startTwitterSniffer();
startRankChecker();
startBrain();
startSalesEngine();

// Panel Manager & Content Engine
const panelManager = require('./services/panelManager');
const contentEngine = require('./services/contentEngine');
const { titan } = require('./services/titanHub');

// Initialize after DB ready
setTimeout(() => {
  panelManager.init();
  titan.init();
  
  // Inventory Monitor
  const inventoryMonitor = require('./services/inventoryMonitor');
  inventoryMonitor.start();
}, 1000);

const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.SITE_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));

app.use(require('./middleware/cloakMiddleware'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.use('/api/webhooks', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(require('./middleware/websiteResolver'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'))
app.use('/api/blog', require('./routes/blog'));

// Public-facing blog pages with schema markup for SEO
const { getPublishedPosts, getPost } = require('./services/blogGenerator');
app.get('/blog', (req, res) => {
  const posts = getPublishedPosts()
  const siteUrl = 'https://dalletek.live'
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blog IPTV — Guides, Comparatifs & Astuces 2026 | Dalletek</title>
<meta name="description" content="Guide complet IPTV 2026: installation, configuration, comparatifs et astuces. Apprenez tout sur l'IPTV sur Firestick, Smart TV, Android et plus.">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Blog IPTV — Guides et Astuces",
  "description": "Articles et guides sur l'IPTV: installation, configuration, meilleurs services, applications.",
  "url": "${siteUrl}/blog",
  "about": { "@type": "Thing", "name": "IPTV" },
  "blogPost": ${JSON.stringify(posts.map(p => ({
    "@type": "BlogPosting",
    "headline": p.title,
    "url": `${siteUrl}/blog/${p.slug}`,
    "datePublished": p.created_at,
    "description": p.excerpt,
    "inLanguage": p.language || 'fr'
  })))}
}
</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d0d0d;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.7}
.container{max-width:860px;margin:0 auto;padding:40px 20px}
h1{font-size:32px;margin-bottom:8px;color:#ffd700}
.sub{color:#888;margin-bottom:32px;font-size:15px}
.post{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:16px;transition:border-color .2s}
.post:hover{border-color:#ffd70044}
.post h2{margin:0 0 6px;font-size:18px}
.post h2 a{color:#fff;text-decoration:none}
.post h2 a:hover{color:#ffd700}
.post .meta{color:#666;font-size:12px;margin-bottom:8px}
.post p{color:#999;font-size:14px}
.post .tag{display:inline-block;background:#ffd70015;color:#ffd700;padding:2px 10px;border-radius:4px;font-size:11px;margin-top:8px}
.footer{text-align:center;padding:40px 0;color:#444;font-size:13px}
</style>
</head>
<body>
<div class="container">
  <h1>📺 Blog IPTV</h1>
  <p class="sub">Guides, comparatifs et astuces pour profiter de l'IPTV en 2026</p>
  ${posts.length === 0 ? '<p style="color:#555;">Aucun article publié pour le moment. Revenez bientôt!</p>' : posts.map(p => `
  <div class="post">
    <h2><a href="/blog/${p.slug}">${p.title}</a></h2>
    <div class="meta">${new Date(p.created_at).toLocaleDateString('fr-FR')} · ${p.language === 'fr' ? 'Français' : p.language === 'en' ? 'English' : p.language}</div>
    <p>${p.excerpt}</p>
    ${(() => { try { const k = JSON.parse(p.keywords || '[]'); return Array.isArray(k) ? k.slice(0,3).map(kw => '<span class="tag">'+kw+'</span>').join(' ') : '' } catch{return ''} })()}
  </div>`).join('')}
  <div class="footer">Dalletek — <a href="/" style="color:#555;">Accueil</a></div>
</div>
</body>
</html>`)
})

app.get('/blog/:slug', (req, res) => {
  const post = getPost(req.params.slug)
  if (!post) return res.status(404).send('<h1>Article non trouvé</h1>')
  const siteUrl = 'https://dalletek.live'
  const keywords = (() => { try { const k = JSON.parse(post.keywords || '[]'); return Array.isArray(k) ? k : [] } catch { return [] } })()
  res.send(`<!DOCTYPE html>
<html lang="${post.language || 'fr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${post.title} | Dalletek</title>
<meta name="description" content="${(post.excerpt || '').replace(/"/g, '&quot;')}">
<link rel="canonical" href="${siteUrl}/blog/${post.slug}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${(post.title || '').replace(/"/g, '\\"')}",
  "description": "${(post.excerpt || '').replace(/"/g, '\\"')}",
  "url": "${siteUrl}/blog/${post.slug}",
  "datePublished": "${post.created_at}",
  "dateModified": "${post.updated_at || post.created_at}",
  "inLanguage": "${post.language || 'fr'}",
  "about": { "@type": "Thing", "name": "IPTV" },
  "keywords": "${keywords.join(', ')}",
  "mainEntityOfPage": { "@type": "WebPage", "@id": "${siteUrl}/blog/${post.slug}" },
  "publisher": { "@type": "Organization", "name": "Dalletek", "url": "${siteUrl}" }
}
</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d0d0d;color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.8}
.container{max-width:780px;margin:0 auto;padding:40px 20px}
.article{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:32px}
.article h1{font-size:28px;margin-bottom:8px;color:#ffd700}
.article .meta{color:#666;font-size:13px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #2a2a2a}
.article h2{color:#fff;font-size:20px;margin:28px 0 12px}
.article h3{color:#ccc;font-size:16px;margin:20px 0 8px}
.article p{margin-bottom:16px;color:#b0b0b0;font-size:15px}
.article ul,.article ol{margin:0 0 16px 20px;color:#b0b0b0;font-size:15px}
.article li{margin-bottom:6px}
.article a{color:#ffd700;text-decoration:none}
.article a:hover{text-decoration:underline}
.article strong{color:#fff}
.footer{text-align:center;padding:40px 0}
.footer a{color:#555;font-size:13px;text-decoration:none}
.footer a:hover{color:#ffd700}
</style>
</head>
<body>
<div class="container">
  <div class="article">
    <h1>${post.title}</h1>
    <div class="meta">Publié le ${new Date(post.created_at).toLocaleDateString('fr-FR')} · ${post.language === 'fr' ? 'Français' : post.language === 'en' ? 'English' : post.language}</div>
    ${post.content}
  </div>
  <div class="footer"><a href="/blog">← Retour au blog</a> · <a href="/">Accueil</a></div>
</div>
</body>
</html>`)
})

// XML Sitemap
app.get('/sitemap.xml', (req, res) => {
  const db = getDb()
  const siteUrl = 'https://dalletek.live'
  const posts = getPublishedPosts()
  const landingPages = db.prepare("SELECT slug, updated_at FROM landing_pages WHERE active = 1").all()
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  xml += `  <url><loc>${siteUrl}/</loc><priority>1.0</priority></url>\n`
  xml += `  <url><loc>${siteUrl}/trial</loc><priority>0.9</priority></url>\n`
  xml += `  <url><loc>${siteUrl}/blog</loc><priority>0.8</priority></url>\n`
  for (const p of posts) {
    xml += `  <url><loc>${siteUrl}/blog/${p.slug}</loc><lastmod>${(p.updated_at || p.created_at || '').split('T')[0]}</lastmod><priority>0.7</priority></url>\n`
  }
  for (const lp of landingPages) {
    xml += `  <url><loc>${siteUrl}/lp/${lp.slug}</loc><lastmod>${(lp.updated_at || '').split('T')[0]}</lastmod><priority>0.6</priority></url>\n`
  }
  xml += '</urlset>'
  res.header('Content-Type', 'application/xml').send(xml)
})
app.use('/api/scraper', require('./routes/scraper'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/orders', require('./routes/orders'));
// Unified Checkout Plugin (with failover + cloaking)
try {
  const { integrateWithIptvBoss } = require('/var/www/unified-checkout/integrations/iptv-boss')
  const { getDb } = require('./db')
  integrateWithIptvBoss(app, { getDb })
  console.log('[Checkout] Unified checkout plugin mounted at /api/checkout')
} catch (err) {
  console.warn('[Checkout] Unified checkout not available:', err.message)
  console.warn(err.stack)
}

app.use(require('./routes/checkout'));
app.use('/lp', require('./routes/pages'));
app.use('/api/demand', require('./routes/demand'));
app.use('/api/sales-engine', require('./routes/salesEngine'));
app.use('/api/titan', require('./routes/titan'));
app.use('/api/titan-templates', require('./routes/titanTemplates'));
app.use('/api/titan-growth', require('./routes/titanGrowth'));
app.use('/api/titan-intelligence', require('./routes/titanIntelligence'));
app.use('/api/panel-management', require('./routes/panelManagement'));
app.use('/api/inventory', require('./routes/inventoryManagement'));
app.use('/api/trial', require('./routes/trialManagement'));
app.use('/api/content', require('./routes/content'));
app.use('/api/activation', require('./routes/activation'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/brain', require('./routes/brainBridge'));
app.use('/api/tickets', require('./routes/tickets'));
app.use(require('./routes/account'));
app.use('/api/hero', require('./routes/hero'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/trial', require('./routes/trial'));

app.get('/api/plans', (req, res) => {
  const { getDb } = require('./db');
  const db = getDb();
  const websiteId = req.website ? req.website.id : 1;
  const plans = db.prepare(`
    SELECT pp.*, pc.name as provider_name, pc.specialty, pc.logo_url
    FROM provider_plans pp
    JOIN providers_catalog pc ON pp.provider_id = pc.id
    WHERE pp.active = 1 AND pc.active = 1 AND pp.website_id = ? AND pc.website_id = ?
    ORDER BY pc.name, pp.price_sell
  `).all(websiteId, websiteId);
  res.json(plans);
});

app.get('/_/website/:slug', (req, res) => {
  const { getDb } = require('./db');
  const db = getDb();
  const website = db.prepare('SELECT * FROM websites WHERE slug = ?').get(req.params.slug);
  if (!website) return res.status(404).send('<h1>Website not found</h1>');
  const pages = db.prepare("SELECT id, title, slug, keyword, visits, conversions, created_at FROM landing_pages WHERE website_id = ? AND active = 1 ORDER BY created_at DESC").all(website.id);
  const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || `http://localhost:${PORT}`;
  let domainList = [];
  try { domainList = JSON.parse(website.domains || '[]'); } catch {}
  const domain = domainList[0] || null;
  const baseUrl = domain ? `http://${domain}` : siteUrl;

  res.send(`<!DOCTYPE html>
<html lang="${website.language || 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${website.site_name || website.name} — Preview</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;min-height:100vh}
.container{max-width:900px;margin:0 auto;padding:40px 24px}
.header{text-align:center;padding:60px 0 40px;border-bottom:1px solid #1a1a1a;margin-bottom:40px}
.header h1{font-size:36px;color:#00d4ff;margin-bottom:8px}
.header .tagline{color:#888;font-size:18px;font-style:italic}
.header .url{color:#555;font-size:14px;margin-top:12px}
.header .url a{color:#00d4ff;text-decoration:none}
.header .domains{margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.header .domains span{background:#1a1a1a;color:#00cc66;padding:4px 12px;border-radius:6px;font-size:13px}
.stats{display:flex;gap:24px;justify-content:center;margin-bottom:40px;flex-wrap:wrap}
.stat-card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px 32px;text-align:center;min-width:120px}
.stat-card .num{font-size:28px;font-weight:700;color:#00d4ff}
.stat-card .label{color:#666;font-size:13px;margin-top:4px}
.pages{display:grid;gap:16px}
.page-card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;display:flex;justify-content:space-between;align-items:center;transition:border-color .2s}
.page-card:hover{border-color:#00d4ff44}
.page-card .info{flex:1;min-width:0}
.page-card .info h3{margin:0;font-size:16px;color:#fff}
.page-card .info p{margin:4px 0 0;color:#666;font-size:13px}
.page-card .info .keyword{display:inline-block;background:#00d4ff15;color:#00d4ff;padding:2px 8px;border-radius:4px;font-size:11px;margin-top:6px}
.page-card .stats{display:flex;gap:16px;margin:0;font-size:12px;color:#555}
.page-card .stats span{display:flex;align-items:center;gap:4px}
.page-card .visit a{display:inline-block;padding:8px 20px;background:#00d4ff;color:#000;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;transition:all .2s}
.page-card .visit a:hover{box-shadow:0 4px 20px #00d4ff44}
.empty{text-align:center;padding:80px 0;color:#555}
.empty p{font-size:16px;margin-bottom:16px}
.empty a{display:inline-block;padding:10px 24px;background:#00d4ff;color:#000;border-radius:8px;text-decoration:none;font-weight:600}
.footer{text-align:center;padding:40px 0;color:#444;font-size:13px;border-top:1px solid #1a1a1a;margin-top:60px}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${website.site_name || website.name}</h1>
    ${website.tagline ? `<p class="tagline">"${website.tagline}"</p>` : ''}
    <p class="url">${pages.length} landing page${pages.length !== 1 ? 's' : ''} — <a href="${baseUrl}" target="_blank">${baseUrl}</a></p>
    ${domainList.length > 0 ? `<div class="domains">${domainList.map(d => `<span>${d}</span>`).join('')}</div>` : ''}
  </div>

  <div class="stats">
    <div class="stat-card"><div class="num">${pages.length}</div><div class="label">Pages</div></div>
    <div class="stat-card"><div class="num">${pages.reduce((s, p) => s + (p.visits || 0), 0)}</div><div class="label">Total Visits</div></div>
    <div class="stat-card"><div class="num">${pages.reduce((s, p) => s + (p.conversions || 0), 0)}</div><div class="label">Conversions</div></div>
  </div>

  ${pages.length > 0 ? `<div class="pages">${pages.map(p => `
  <div class="page-card">
    <div class="info">
      <h3>${p.title}</h3>
      <p>/${p.slug}</p>
      <span class="keyword">${p.keyword || '—'}</span>
      <div class="stats" style="margin-top:8px">
        <span>👁 ${p.visits || 0}</span>
        <span>🔄 ${p.conversions || 0}</span>
        <span>📅 ${new Date(p.created_at).toLocaleDateString()}</span>
      </div>
    </div>
    <div class="visit"><a href="${baseUrl}/lp/${p.slug}" target="_blank">View Page</a></div>
  </div>`).join('')}</div>` : `
  <div class="empty">
    <p>No landing pages yet for this website</p>
    <a href="/">Go to Admin → Build Pages</a>
  </div>`}

  <div class="footer">
    ${website.site_name || website.name} &mdash; Powered by Dalletek
  </div>
</div>
</body>
</html>`);
});

// Emergency restore file downloads (remove after downloaded)
app.get('/restore-files/guide', (req, res) => {
  res.download('/root/full-restore-guide.sh', 'full-restore-guide.sh')
})
app.get('/restore-files/backup', (req, res) => {
  res.download('/var/backups/backup-20260612-122942.tar.gz', 'backup.tar.gz')
})
app.get('/restore-files', (req, res) => {
  res.send(`
    <h2>Emergency Restore Files</h2>
    <ul>
      <li><a href="/restore-files/guide">full-restore-guide.sh</a> (step-by-step recovery instructions)</li>
      <li><a href="/restore-files/backup">backup.tar.gz</a> (DBs, .env, nginx configs, SSL, restore.sh)</li>
    </ul>
    <p>Download both, then follow the guide on a fresh server.</p>
  `)
})

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }

  const distPath = path.join(__dirname, '..', 'client', 'dist');
  const filePath = path.join(distPath, req.path === '/' ? 'index.html' : req.path);

  if (filePath.startsWith(distPath) && require('fs').existsSync(filePath)) {
    res.setHeader('Cache-Control', filePath.endsWith('.html') ? 'no-cache, no-store, must-revalidate' : 'max-age=31536000');
    if (filePath.endsWith('.html')) {
      const fs = require('fs');
      let html = fs.readFileSync(filePath, 'utf8');
      const website = req.website || { id: 1, name: 'Default', slug: 'default', site_name: 'Dalletek', logo_url: '' };
      const siteTitle = website.site_name || website.name || 'Dalletek';
      const script = `<script>window.__WEBSITE__ = ${JSON.stringify(website)};<\/script>`;
      html = html.replace('<title>Loading...</title>', `<title>${siteTitle}</title>`);
      html = html.replace('</head>', script + '</head>');
      res.send(html);
    } else {
      res.sendFile(filePath);
    }
  } else {
    const indexPath = path.join(distPath, 'index.html');
    if (require('fs').existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      const fs = require('fs');
      let html = fs.readFileSync(indexPath, 'utf8');
      const website = req.website || { id: 1, name: 'Default', slug: 'default', site_name: 'Dalletek', logo_url: '' };
      const siteTitle = website.site_name || website.name || 'Dalletek';
      const script = `<script>window.__WEBSITE__ = ${JSON.stringify(website)};<\/script>`;
      html = html.replace('<title>Loading...</title>', `<title>${siteTitle}</title>`);
      html = html.replace('</head>', script + '</head>');
      res.send(html);
    }
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Dalletek server running on port ${PORT}`);
});


