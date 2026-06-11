const fetch = require('node-fetch');

const PASTEBIN_RSS = 'https://pastebin.com/rss';
const KNOWN_PASTE_MIRRORS = [
  'https://pastebin.com/raw/',
  'https://paste.ee/rss'
];

const LEAK_KEYWORDS = [
  'iptv', 'm3u', 'xtream', 'xui', 'canal', 'canal+',
  'email:password', 'email:pass', 'combo', 'dump',
  'leak', 'breach', 'sql', 'subscriber', 'client',
  'adult', 'xxx iptv', 'v6', 'strong iptv',
  'french', 'français', 'abonné', 'client',
  'orange', 'free', 'sfr', 'bouygues',
  'netflix', 'disney+', 'canal plus',
  'hbo', 'prime video', 'molotov',
  'evasion', 'beinsport', 'rtbf',
  'tiviMate', 'OTT Navigator', 'smart iptv'
];

function extractEmails(text) {
  const found = [...new Set(
    [...text.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)]
      .map(m => m[1].toLowerCase().trim())
      .filter(e => e.length > 4 && e.length < 100 && !e.includes('example') && !e.includes('domain.com') && !e.includes('test') && e.includes('.'))
  )];
  return found;
}

function scoreRelevance(text) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of LEAK_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) score += 10;
  }
  const emailCount = (lower.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).length;
  score += Math.min(emailCount, 50);
  if (lower.includes('@') && (lower.includes(':') || lower.includes('|'))) score += 15;
  if (/\d{3,}/.test(lower)) score += 5;
  return score;
}

function extractLeakFormat(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const pairs = [];
  for (const line of lines) {
    const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (!emailMatch) continue;
    const email = emailMatch[1].toLowerCase();
    let password = '';
    const passMatch = line.match(/:([^\s|]+)/);
    if (passMatch) password = passMatch[1];
    const domain = email.split('@')[1];
    pairs.push({ email, password, domain, raw: line });
  }
  return pairs;
}

async function scrapePastebinRecent() {
  const results = [];
  try {
    const rss = await fetch('https://pastebin.com/rss', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DalletekBot/1.0)' },
      signal: AbortSignal.timeout(15000)
    }).then(r => r.text());
    
    const titleMatches = [...rss.matchAll(/<title>([^<]+)<\/title>/g)];
    const linkMatches = [...rss.matchAll(/<link>([^<]+)<\/link>/g)];
    
    for (let i = 0; i < Math.min(titleMatches.length, linkMatches.length); i++) {
      const title = titleMatches[i][1];
      const link = linkMatches[i][1];
      if (link.includes('pastebin.com') && !link.includes('rss')) {
        const id = link.split('/').pop();
        results.push({ id, title, url: link });
      }
    }
  } catch(e) {
    /* pastebin may block */
  }
  return results;
}

async function fetchRawPaste(id) {
  try {
    const text = await fetch(`https://pastebin.com/raw/${id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    }).then(r => r.ok ? r.text() : '');
    return text;
  } catch(e) {
    return '';
  }
}

async function scanPaste(id, content, db) {
  const score = scoreRelevance(content);
  if (score < 20) return { harvested: 0, score };
  
  const emails = extractEmails(content);
  if (emails.length === 0) return { harvested: 0, score };
  
  const leakData = extractLeakFormat(content);
  let harvested = 0;
  
  const existing = new Set(
    db.prepare("SELECT email FROM demand_signals WHERE email IS NOT NULL").all().map(r => r.email.toLowerCase())
  );
  
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO demand_signals (source, source_name, email, content, language, intent_score, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
  );
  
  for (const entry of emails) {
    if (existing.has(entry)) continue;
    existing.add(entry);
    const leakEntry = leakData.find(l => l.email === entry);
    const content_ = leakEntry ? leakEntry.raw : entry;
    const domain = entry.split('@')[1];
    const lang = ['.fr', '.be', '.ch'].some(s => domain.endsWith(s)) ? 'fr' : 'en';
    try {
      const info = stmt.run('leak_db', `pastebin_${id}`, entry, content_, lang, Math.min(score, 99));
      if (info.changes > 0) harvested++;
    } catch(e) {}
  }
  
  return { harvested, score, found: emails.length };
}

async function fullScan(db) {
  const results = { scanned: 0, harvested: 0, sources: [] };
  
  // 1. Scan Pastebin recent
  const recent = await scrapePastebinRecent();
  results.scanned += recent.length;
  
  for (const paste of recent.slice(0, 50)) {
    const content = await fetchRawPaste(paste.id);
    if (content.length < 20) continue;
    const r = await scanPaste(paste.id, content, db);
    results.harvested += r.harvested;
    if (r.harvested > 0) {
      results.sources.push({ id: paste.id, title: paste.title, harvested: r.harvested, score: r.score });
    }
  }
  
  // 2. Check specific known leak IDs (from past discoveries)
  const knownLeaks = ['y83esyqP', 'kCYGXnJf', 'aBcDeFgH']; // Add known IPTV-related paste IDs
  for (const id of knownLeaks) {
    const content = await fetchRawPaste(id);
    if (content.length < 20) continue;
    const r = await scanPaste(id, content, db);
    results.harvested += r.harvested;
    if (r.harvested > 0) {
      results.sources.push({ id, harvested: r.harvested, score: r.score });
    }
  }
  
  return results;
}

module.exports = { extractEmails, scoreRelevance, extractLeakFormat, scrapePastebinRecent, fetchRawPaste, scanPaste, fullScan };
