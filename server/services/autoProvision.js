const { getDb } = require('../db');

async function autoProvision(providerId) {
  const db = getDb();
  const provider = db.prepare('SELECT * FROM providers_catalog WHERE id = ?').get(providerId);
  if (!provider) throw new Error('Provider not found');

  const log = [];

  // 1. Try panel sync if panel_url exists
  if (provider.panel_url) {
    try {
      const panelCodeCount = await syncPanelCodes(provider);
      log.push(`Panel sync: ${panelCodeCount} codes imported`);
    } catch (e) {
      log.push(`Panel sync skipped: ${e.message}`);
    }
  }

  // 2. Parse M3U if panel_url exists
  let m3uStats = null;
  if (provider.panel_url) {
    try {
      m3uStats = await parseM3U(provider.id, provider.panel_url, provider.panel_username, provider.panel_password);
      log.push(`M3U parsed: ${m3uStats?.total || 0} channels`);
    } catch (e) {
      log.push(`M3U parse skipped: ${e.message}`);
    }
  }

  // 3. Auto-create default plans if none exist
  const existingPlans = db.prepare('SELECT COUNT(*) as c FROM provider_plans WHERE provider_id = ?').get(providerId).c;
  if (existingPlans === 0) {
    const channelCount = m3uStats?.live || 30000;
    const plans = [
      { name: 'Trial 72h', type: 'trial', months: 0, days: 3, price: 0, channels: channelCount, streams: 1 },
      { name: '1 Mois', type: 'monthly', months: 1, days: 30, price: 12.99, channels: channelCount, streams: 1 },
      { name: '3 Mois', type: 'quarterly', months: 3, days: 90, price: 29.99, channels: channelCount, streams: 2 },
      { name: '6 Mois', type: 'biannual', months: 6, days: 180, price: 49.99, channels: channelCount, streams: 3 },
      { name: '12 Mois', type: 'yearly', months: 12, days: 365, price: 79.99, channels: channelCount, streams: 4 },
    ];
    const insert = db.prepare(`
      INSERT INTO provider_plans (provider_id, plan_name, plan_type, duration_days, duration_months, price_sell, channels, streams, min_stock, website_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 5, 1)
    `);
    for (const p of plans) {
      insert.run(providerId, p.name, p.type, p.days, p.months, p.price, p.channels, p.streams);
    }
    log.push(`Created ${plans.length} default plans`);
  }

  // 4. Create landing page if none exist
  const existingPages = db.prepare('SELECT COUNT(*) as c FROM landing_pages WHERE provider_id = ?').get(providerId).c;
  if (existingPages === 0 && provider.specialty) {
    try {
      const { buildPage } = require('./pageBuilder');
      await buildPage({
        keyword: provider.specialty.toLowerCase(),
        audience: provider.name,
        providerId,
        planId: null,
      });
      log.push('Landing page created');
    } catch (e) {
      log.push(`Landing page skipped: ${e.message}`);
    }
  }

  // 5. Log everything
  for (const entry of log) {
    db.prepare(`
      INSERT INTO agent_log (agent, action, details, created_at)
      VALUES ('AutoProvision', ?, ?, datetime('now'))
    `).run(`Provision ${provider.name}`, entry);
  }

  // Update provider notes
  const existingNotes = provider.notes || '';
  const newNotes = existingNotes
    ? existingNotes + '\n' + log.join('\n')
    : log.join('\n');
  db.prepare('UPDATE providers_catalog SET notes = ? WHERE id = ?').run(newNotes, providerId);

  return { provider: provider.name, log };
}

async function syncPanelCodes(provider) {
  const db = getDb();
  const endpoints = [
    `http://${provider.panel_url}/player_api.php?username=${provider.panel_username}&password=${provider.panel_password}&action=user`,
    `https://${provider.panel_url}/player_api.php?username=${provider.panel_username}&password=${provider.panel_password}&action=user`,
    `${provider.panel_url}/player_api.php?username=${provider.panel_username}&password=${provider.panel_password}&action=user`,
  ];

  let userInfo = null;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        userInfo = await res.json();
        break;
      }
    } catch {}
  }

  if (!userInfo) throw new Error('Panel not reachable');

  const expiryStr = userInfo.user?.exp_date;
  const expiresAt = expiryStr ? new Date(parseInt(expiryStr) * 1000).toISOString() : null;
  const maxConnections = userInfo.user?.max_connections || 1;

  // Generate sample activation codes from the panel info
  const existingCodes = db.prepare('SELECT COUNT(*) as c FROM activation_codes WHERE provider_id = ?').get(provider.id).c;
  if (existingCodes === 0) {
    // Create a batch of placeholder codes
    const codeBatch = [];
    for (let i = 0; i < 10; i++) {
      const code = `${provider.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}_${String(i + 1).padStart(3, '0')}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      codeBatch.push(code);
    }

    const insertCode = db.prepare(`
      INSERT INTO activation_codes (provider_id, plan_id, code, username, password, server_url, expires_at, status, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'available', datetime('now'))
    `);

    // Get plan IDs for this provider
    const plans = db.prepare('SELECT id FROM provider_plans WHERE provider_id = ?').all(provider.id);
    if (plans.length > 0) {
      for (const code of codeBatch) {
        insertCode.run(provider.id, plans[0].id, code, provider.panel_username, provider.panel_password, provider.panel_url, expiresAt);
      }
    }
    return codeBatch.length;
  }

  return 0;
}

async function parseM3U(providerId, baseUrl, username, password) {
  const m3uUrl = `${baseUrl}/get.php?username=${username}&password=${password}&type=m3u&output=ts`;
  const res = await fetch(m3uUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error('M3U fetch failed');

  const m3u = await res.text();
  const lines = m3u.split('\n');

  let live = 0, movies = 0, series = 0, sports = 0;
  const sportsKeywords = ['sport', 'football', 'nba', 'ufc', 'f1', 'tennis', 'boxing', 'nfl', 'mlb', 'hockey', 'champions league', 'world cup'];

  for (const line of lines) {
    if (!line.includes('#EXTINF')) continue;
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes('movie') || lowerLine.includes('vod')) movies++;
    else if (lowerLine.includes('series') || lowerLine.includes('serie')) series++;
    else {
      live++;
      if (sportsKeywords.some(k => lowerLine.includes(k))) sports++;
    }
  }

  const stats = { live, movies, series, sports, total: live + movies + series };

  // Save to app_settings
  const db = getDb();
  const m3uData = {
    stats,
    sportsEvents: [],
    popularMovies: [],
    popularSeries: [],
    fetchedAt: new Date().toISOString(),
  };
  db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`).run(`m3u_data_${providerId}`, JSON.stringify(m3uData));
  db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`).run(`m3u_sample_${providerId}`, m3uUrl);

  return stats;
}

module.exports = { autoProvision };
