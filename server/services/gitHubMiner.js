const { getDb } = require('../db');
const fetch = require('node-fetch');

const GITHUB_TOKEN = ''; // Optional: add a GitHub token for higher rate limits

const SEARCH_QUERIES = [
  'iptv m3u playlist',
  'xtream iptv',
  'xui panel config',
  'canal plus iptv',
  'french iptv playlist',
  'iptv smarters config',
  'ott navigator playlist',
  'tivimate playlist',
  'iptv epic config',
  'strong iptv config',
  'v6 iptv config',
  'iptv password email',
  'iptv subscription',
  'iptv account',
  'm3u url email password'
];

function createSearchQuery() {
  const base = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const qualifiers = ['extension:m3u', 'extension:txt', 'extension:json', 'size:<10000'];
  return `${base} ${qualifiers[Math.floor(Math.random() * qualifiers.length)]}`;
}

async function searchGitHub(query, page = 1, perPage = 50) {
  const headers = {
    'User-Agent': 'DalletekBot/1.0',
    'Accept': 'application/vnd.github.v3+json'
  };
  if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;

  const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) return { error: 'rate_limited', items: [], total: 0 };
    return { error: text, items: [], total: 0 };
  }
  const data = await res.json();
  return { items: data.items || [], total: data.total_count || 0 };
}

async function fetchFileContent(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'DalletekBot/1.0',
      'Accept': 'application/vnd.github.v3.raw'
    },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) return '';
  return res.text();
}

function extractEmails(text) {
  return [...new Set(
    [...text.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)]
      .map(m => m[1].toLowerCase().trim())
      .filter(e => e.length > 4 && e.length < 100 && !e.includes('example') && e.includes('.'))
  )];
}

async function fullMine(maxPages = 1) {
  const db = getDb();
  const results = { searched: 0, filesExamined: 0, harvested: 0, errors: [] };

  const existing = new Set(
    db.prepare("SELECT email FROM demand_signals WHERE email IS NOT NULL").all().map(r => r.email.toLowerCase())
  );

  const stmt = db.prepare(
    "INSERT OR IGNORE INTO demand_signals (source, source_name, email, content, language, intent_score, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
  );

  for (const query of SEARCH_QUERIES.slice(0, 5)) {
    for (let page = 1; page <= maxPages; page++) {
      const result = await searchGitHub(query, page);
      results.searched++;

      if (result.error === 'rate_limited') {
        results.errors.push('GitHub API rate limited');
        break;
      }

      for (const item of result.items) {
        results.filesExamined++;
        const content = await fetchFileContent(item.git_url);
        if (!content) continue;

        const emails = extractEmails(content);
        for (const email of emails) {
          if (existing.has(email)) continue;
          existing.add(email);
          const domain = email.split('@')[1];
          const lang = ['.fr', '.be', '.ch'].some(s => domain.endsWith(s)) ? 'fr' : 'en';
          try {
            stmt.run('leak_db', `github_${item.repository?.full_name || 'unknown'}`, email, content.slice(0, 500), lang, 80);
            results.harvested++;
          } catch (e) {}
        }
      }
    }

    // Small delay between queries to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  return results;
}

module.exports = { searchGitHub, fetchFileContent, extractEmails, fullMine, SEARCH_QUERIES };
