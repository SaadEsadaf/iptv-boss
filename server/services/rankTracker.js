const { getDb } = require('../db');

async function checkRanking(keyword, targetUrl, locale = 'us') {
  const db = getDb();
  const apiKey = db.prepare("SELECT value FROM app_settings WHERE key = 'serpapi_key'").get()?.value;
  if (!apiKey) return { position: null, error: 'No SerpAPI key configured' };

  try {
    const params = new URLSearchParams({
      q: keyword,
      api_key: apiKey,
      location: locale === 'us' ? 'United States' : locale,
      num: 20,
      output: 'json',
    });
    const res = await fetch(`https://serpapi.com/search?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { position: null, error: `SerpAPI ${res.status}` };

    const data = await res.json();
    const results = data.organic_results || [];

    let position = null;
    if (targetUrl) {
      const match = results.find(r => r.link && r.link.includes(targetUrl));
      if (match) position = match.position;
    } else {
      position = results.length > 0 ? results[0].position : null;
    }

    return { position, results: results.length };
  } catch (e) {
    return { position: null, error: e.message };
  }
}

function recordCheck(trackingId, position) {
  const db = getDb();
  const current = db.prepare('SELECT position FROM rank_tracking WHERE id = ?').get(trackingId);
  const prevPos = current?.position;

  db.prepare('INSERT INTO rank_history (tracking_id, position) VALUES (?, ?)').run(trackingId, position);

  const newPrev = position !== null ? position : prevPos;
  const trend = position === null ? 'not_found'
    : prevPos === null ? 'new'
    : position < prevPos ? 'up'
    : position > prevPos ? 'down'
    : 'stable';

  db.prepare(`
    UPDATE rank_tracking SET position = ?, previous_position = ?, trend = ?, checked_at = datetime('now')
    WHERE id = ?
  `).run(position, newPrev !== null ? newPrev : prevPos, trend, trackingId);
}

async function checkAllRanks() {
  const db = getDb();
  const trackers = db.prepare('SELECT rt.*, lp.slug, lp.title FROM rank_tracking rt LEFT JOIN landing_pages lp ON lp.id = rt.page_id').all();
  const results = [];

  for (const t of trackers) {
    const targetUrl = t.target_url || (t.slug ? t.slug : null);
    const result = await checkRanking(t.keyword, targetUrl, t.locale || 'us');
    recordCheck(t.id, result.position);
    results.push({ id: t.id, keyword: t.keyword, position: result.position, error: result.error });
  }

  return results;
}

function startRankChecker() {
  const cron = require('node-cron');
  const db = getDb();
  const interval = Number(db.prepare("SELECT value FROM app_settings WHERE key = 'rank_check_interval'").get()?.value) || 24;
  if (interval <= 0) { console.log('[RankTracker] Auto-check disabled (interval=0)'); return; }

  const cronExpr = `0 */${Math.min(interval, 23)} * * *`;
  console.log(`[RankTracker] Cron scheduled (every ${interval}h)`);

  cron.schedule(cronExpr, async () => {
    const hasKey = db.prepare("SELECT value FROM app_settings WHERE key = 'serpapi_key'").get()?.value;
    if (!hasKey) return;
    const count = db.prepare('SELECT COUNT(*) as c FROM rank_tracking').get().c;
    if (count === 0) return;
    console.log('[RankTracker] Auto-checking rankings...');
    try {
      const results = await checkAllRanks();
      console.log(`[RankTracker] Checked ${results.length} keywords`);
      const ok = results.filter(r => !r.error).length;
      if (ok < results.length) console.log(`[RankTracker] ${results.length - ok} errors`);
    } catch (e) {
      console.error('[RankTracker] Auto-check error:', e.message);
    }
  });
}

module.exports = { checkRanking, recordCheck, checkAllRanks, startRankChecker };
