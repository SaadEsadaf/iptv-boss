const { getDb } = require('../db');
const { generateText } = require('./aiProvider');

const FALLBACK_SUGGESTIONS = [
  { keyword: 'best iptv for sports 2026', audience: 'sports fans', intent: 'commercial' },
  { keyword: 'affordable iptv subscription usa', audience: 'US budget shoppers', intent: 'commercial' },
  { keyword: 'mejor iptv para latinoamerica', audience: 'Latin American Spanish speakers', intent: 'commercial' },
  { keyword: 'iptv deutschland empfehlung', audience: 'German IPTV seekers', intent: 'commercial' },
  { keyword: 'iptv france pas cher', audience: 'French IPTV buyers', intent: 'commercial' },
  { keyword: 'melhor iptv brasil 2026', audience: 'Brazilian cord cutters', intent: 'commercial' },
  { keyword: 'best iptv service india', audience: 'Indian IPTV buyers', intent: 'commercial' },
  { keyword: 'iptv for arabic channels middle east', audience: 'Middle East Arabic speakers', intent: 'commercial' },
  { keyword: 'iptv italia canali', audience: 'Italian IPTV seekers', intent: 'commercial' },
  { keyword: 'goedkope iptv nederland', audience: 'Dutch budget shoppers', intent: 'transactional' },
];

function getLeadContext() {
  const db = getDb();
  const topLeads = db.prepare(`
    SELECT content, pain_point, opportunity, intent_score, language, source
    FROM demand_signals WHERE status != 'dismissed' AND intent_score > 0
    ORDER BY intent_score DESC LIMIT 15
  `).all()
  if (!topLeads.length) return ''
  const painSection = topLeads.filter(l => l.pain_point).map(l => `- Pain: ${l.pain_point}`).join('\n')
  const oppSection = topLeads.filter(l => l.opportunity).map(l => `- Opportunity: ${l.opportunity}`).join('\n')
  return `\n\nReal lead data from Telegram channels:\n${painSection}\n${oppSection}\n\nUse these pain points to tailor keyword suggestions and ad copy.`
}

async function runSEOAudit() {
  const db = getDb();

  const leadContext = getLeadContext();

  let suggestions = FALLBACK_SUGGESTIONS;

  try {
    const text = await generateText({
      system: 'You are an SEO strategist for an IPTV streaming service. Return ONLY a valid JSON array, no other text.',
      messages: [{
        role: 'user',
        content: 'Given an IPTV streaming service, suggest 10 high-intent SEO landing page keywords for 2026. Include keyword, target audience, and intent (informational/commercial/transactional). Return JSON array with objects: {keyword, audience, intent}.' + leadContext
      }],
      maxTokens: 2000,
      task: 'seo',
    });
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) suggestions = JSON.parse(jsonMatch[0]);
  } catch (e) {
    if (e.message !== 'AI_NOT_CONFIGURED') {
      console.error('[SEOAudit] AI error:', e);
    }
  }

  const insert = db.prepare(
    'INSERT INTO seo_log (run_type, action, keyword, details, result, status) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction(() => {
    for (const s of suggestions) {
      insert.run('suggestion', 'generated', s.keyword, JSON.stringify({ audience: s.audience, intent: s.intent }), null, 'pending');
    }
  });
  insertMany();

  regenerateSitemap();

  db.prepare(
    'INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)'
  ).run('SEOAgent', 'audit_completed', 'Weekly SEO audit complete — suggestions generated, sitemap regenerated');
}

function regenerateSitemap() {
  const db = getDb();
  const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || process.env.SITE_URL || 'http://localhost:3000';
  const pages = db.prepare('SELECT slug, updated_at, created_at FROM landing_pages WHERE active = 1').all();

  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  sitemap += `  <url><loc>${siteUrl}/</loc><priority>1.0</priority></url>\n`;

  for (const p of pages) {
    const lastmod = p.updated_at || p.created_at || new Date().toISOString().split('T')[0];
    sitemap += `  <url><loc>${siteUrl}/lp/${p.slug}</loc><lastmod>${lastmod}</lastmod><priority>0.8</priority></url>\n`;
  }

  sitemap += '</urlset>';

  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(path.join(__dirname, '..', '..', 'client', 'public', 'sitemap.xml'), sitemap);
  console.log('[SEOAgent] Sitemap regenerated with', pages.length, 'pages');
}

async function autoBuildFromLeads() {
  const db = getDb();
  const enabled = db.prepare("SELECT value FROM app_settings WHERE key = 'auto_build_enabled'").get()?.value;
  if (enabled !== '1') return;

  const threshold = Number(db.prepare("SELECT value FROM app_settings WHERE key = 'auto_build_threshold'").get()?.value) || 70;
  const maxPerRun = Number(db.prepare("SELECT value FROM app_settings WHERE key = 'auto_build_max_per_run'").get()?.value) || 5;

  const leads = db.prepare(`
    SELECT ds.*, pc.name AS provider_name, pp.id AS plan_id
    FROM demand_signals ds
    LEFT JOIN providers_catalog pc ON pc.specialty = ds.language OR pc.specialty LIKE '%' || ds.language || '%'
    LEFT JOIN provider_plans pp ON pp.provider_id = pc.id AND pp.plan_type = 'monthly'
    WHERE ds.intent_score >= ? AND ds.status NOT IN ('page_built', 'dismissed')
    ORDER BY ds.intent_score DESC
    LIMIT ?
  `).all(threshold, maxPerRun);

  if (!leads.length) { console.log('[AutoBuild] No high-intent leads to build from'); return; }

  const existingKeywords = db.prepare("SELECT keyword FROM landing_pages WHERE keyword IS NOT NULL").all().map(r => r.keyword.toLowerCase());
  const { buildPage, slugify } = require('./pageBuilder');
  let built = 0, skipped = 0;

  for (const lead of leads) {
    const keyword = (lead.pain_point || lead.opportunity || lead.content || '').slice(0, 120).trim();
    if (!keyword || keyword.length < 10) { skipped++; continue; }

    const slug = slugify(keyword);
    if (db.prepare('SELECT id FROM landing_pages WHERE slug = ?').get(slug)) { skipped++; continue; }

    const audience = lead.language ? `Users searching in ${lead.language}` : 'IPTV seekers';
    try {
      const result = await buildPage({ keyword, audience, providerId: null, planId: null, language: 'fr' });
      if (result.error) { skipped++; continue; }

      db.prepare("UPDATE demand_signals SET status = 'page_built' WHERE id = ?").run(lead.id);
      built++;
      console.log(`[AutoBuild] Built page "${keyword}" → /lp/${result.slug} (from lead #${lead.id})`);
    } catch (e) {
      console.error(`[AutoBuild] Failed for lead #${lead.id}:`, e.message);
      skipped++;
    }
  }

  if (built > 0) {
    regenerateSitemap();
    db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
      'AutoBuild', 'auto_build_completed', `Built ${built} landing pages from high-intent leads (skipped ${skipped})`
    );
  }
  console.log(`[AutoBuild] Done: ${built} built, ${skipped} skipped from ${leads.length} leads`);
}

function startSEOAgent() {
  const cron = require('node-cron');
  cron.schedule('0 0 * * 0', () => {
    console.log('[SEOAgent] Running weekly SEO audit...');
    runSEOAudit().catch(e => console.error('[SEOAgent] Error:', e));
  });
  console.log('[SEOAgent] Cron scheduled (weekly Sunday midnight)');

  const db = getDb();
  const interval = Number(db.prepare("SELECT value FROM app_settings WHERE key = 'auto_build_interval'").get()?.value) || 6;
  const autoBuildCron = `0 */${Math.min(interval, 23)} * * *`;
  cron.schedule(autoBuildCron, () => {
    autoBuildFromLeads().catch(e => console.error('[AutoBuild] Error:', e));
  });
  console.log(`[AutoBuild] Cron scheduled (every ${interval}h)`);
}

module.exports = { runSEOAudit, regenerateSitemap, startSEOAgent, autoBuildFromLeads };
