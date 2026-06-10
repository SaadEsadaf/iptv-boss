const axios = require('axios');
const { getDb } = require('../db');

const TARGET_KEYWORDS = [
  'IPTV', 'free trial iptv', 'best iptv service', '4K IPTV',
  'live TV streaming', 'sports streaming', 'world cup 2026 streaming',
  'cut cable', 'cord cutting', 'firestick iptv', 'smart tv iptv',
  'arabic channels', 'french iptv', 'turkish iptv', 'bollywood streaming',
  'premier league streaming', 'champions league streaming', 'NBA streaming',
  'Netflix alternative', 'movie streaming service', 'TV series online',
];

const PLATFORMS = {
  reddit: {
    name: 'Reddit',
    subreddits: ['IPTV', 'cordcutters', 'FireStickHacks', 'AndroidTV', 'CutTheCord'],
    async search(keyword) {
      try {
        const res = await axios.get(`https://www.reddit.com/r/IPTV/search.json?q=${encodeURIComponent(keyword)}&sort=new&limit=10`, {
          headers: { 'User-Agent': 'IPTV-Boss-Scout/1.0' },
          timeout: 10000,
        });
        const posts = res.data?.data?.children || [];
        return posts.map(p => ({
          platform: 'reddit',
          source: `r/${p.data.subreddit}`,
          title: p.data.title,
          url: `https://reddit.com${p.data.permalink}`,
          author: p.data.author,
          body: p.data.selftext?.substring(0, 500),
          score: p.data.score,
          created: new Date(p.data.created_utc * 1000).toISOString(),
          sentiment: this.detectIntent(p.data.title + ' ' + (p.data.selftext || '')),
        }));
      } catch (e) {
        return [];
      }
    },
    detectIntent(text) {
      const lower = text.toLowerCase();
      if (lower.includes('looking for') || lower.includes('recommend') || lower.includes('best')) return 'high_intent';
      if (lower.includes('free trial') || lower.includes('test')) return 'trial_seeker';
      if (lower.includes('price') || lower.includes('cheap') || lower.includes('cost')) return 'price_sensitive';
      if (lower.includes('problem') || lower.includes('issue') || lower.includes('not working')) return 'frustrated';
      return 'general';
    },
  },
  twitter: {
    name: 'Twitter/X',
    async search(keyword) {
      // Twitter/X requires API access. For now, we'll use a placeholder
      // In production, you'd use the Twitter API v2
      return [];
    },
  },
  telegram: {
    name: 'Telegram',
    async search(keyword) {
      // Telegram search requires a bot. Placeholder for now.
      return [];
    },
  },
  youtube: {
    name: 'YouTube',
    async search(keyword) {
      try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) return [];
        const res = await axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&maxResults=10&key=${apiKey}`, {
          timeout: 10000,
        });
        const items = res.data?.items || [];
        return items.map(item => ({
          platform: 'youtube',
          source: item.snippet.channelTitle,
          title: item.snippet.title,
          url: `https://youtube.com/watch?v=${item.id.videoId}`,
          author: item.snippet.channelTitle,
          body: item.snippet.description?.substring(0, 500),
          score: 0,
          created: item.snippet.publishedAt,
          sentiment: 'general',
        }));
      } catch (e) {
        return [];
      }
    },
  },
  quora: {
    name: 'Quora',
    async search(keyword) {
      // Quora requires scraping or API. Placeholder.
      return [];
    },
  },
  forums: {
    name: 'Forums',
    async search(keyword) {
      // Generic forum search via Google custom search
      const apiKey = process.env.GOOGLE_API_KEY;
      const cx = process.env.GOOGLE_CX;
      if (!apiKey || !cx) return [];
      try {
        const res = await axios.get(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(keyword)}+forum&key=${apiKey}&cx=${cx}&num=10`, {
          timeout: 10000,
        });
        const items = res.data?.items || [];
        return items.map(item => ({
          platform: 'forum',
          source: item.displayLink,
          title: item.title,
          url: item.link,
          author: 'unknown',
          body: item.snippet?.substring(0, 500),
          score: 0,
          created: new Date().toISOString(),
          sentiment: 'general',
        }));
      } catch (e) {
        return [];
      }
    },
  },
};

class TitanCustomerScanner {
  constructor() {
    this.discovered = [];
    this.lastScan = null;
  }

  async findProspects(platform = 'all') {
    const results = {
      timestamp: new Date().toISOString(),
      platform,
      prospects: [],
      summary: {},
    };

    const platforms = platform === 'all' ? Object.keys(PLATFORMS) : [platform];
    const keywords = TARGET_KEYWORDS.slice(0, 5); // Limit to top 5 keywords per scan

    for (const p of platforms) {
      const scanner = PLATFORMS[p];
      if (!scanner || !scanner.search) continue;

      for (const keyword of keywords) {
        try {
          const prospects = await scanner.search(keyword);
          results.prospects.push(...prospects);
        } catch (e) {
          console.error(`[TITAN-SCANNER] Error scanning ${p} for "${keyword}":`, e.message);
        }
      }
    }

    // Deduplicate by URL
    const seen = new Set();
    results.prospects = results.prospects.filter(p => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    // Score and categorize
    results.prospects = results.prospects.map(p => ({
      ...p,
      priority: this.scoreProspect(p),
      action: this.recommendAction(p),
    }));

    // Sort by priority
    results.prospects.sort((a, b) => b.priority - a.priority);

    // Store in database
    await this.storeProspects(results.prospects);

    results.summary = {
      total: results.prospects.length,
      highIntent: results.prospects.filter(p => p.sentiment === 'high_intent').length,
      trialSeekers: results.prospects.filter(p => p.sentiment === 'trial_seeker').length,
      priceSensitive: results.prospects.filter(p => p.sentiment === 'price_sensitive').length,
      frustrated: results.prospects.filter(p => p.sentiment === 'frustrated').length,
    };

    this.discovered = results.prospects;
    this.lastScan = results.timestamp;

    return results;
  }

  scoreProspect(prospect) {
    let score = 0;
    if (prospect.sentiment === 'high_intent') score += 10;
    if (prospect.sentiment === 'trial_seeker') score += 8;
    if (prospect.sentiment === 'frustrated') score += 7;
    if (prospect.sentiment === 'price_sensitive') score += 5;
    if (prospect.score > 10) score += 5;
    if (prospect.score > 50) score += 10;
    if (prospect.body?.toLowerCase().includes('looking for')) score += 3;
    if (prospect.body?.toLowerCase().includes('recommend')) score += 3;
    if (prospect.body?.toLowerCase().includes('best')) score += 2;
    return score;
  }

  recommendAction(prospect) {
    if (prospect.sentiment === 'high_intent') {
      return 'Direct outreach: Offer free trial immediately via DM/comment';
    }
    if (prospect.sentiment === 'trial_seeker') {
      return 'Engage: Share trial link and highlight 4K sports';
    }
    if (prospect.sentiment === 'frustrated') {
      return 'Offer solution: "Our service has 99.9% uptime and 4K quality"';
    }
    if (prospect.sentiment === 'price_sensitive') {
      return 'Offer discount: Mention 20% yearly savings';
    }
    return 'Monitor: Add to lead list for future campaigns';
  }

  async storeProspects(prospects) {
    const db = getDb();
    try {
      // Create table if not exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS titan_prospects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          platform TEXT,
          source TEXT,
          title TEXT,
          url TEXT UNIQUE,
          author TEXT,
          body TEXT,
          score INTEGER,
          priority INTEGER,
          sentiment TEXT,
          action TEXT,
          status TEXT DEFAULT 'new',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          contacted_at TIMESTAMP,
          notes TEXT
        )
      `);

      for (const p of prospects) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO titan_prospects (platform, source, title, url, author, body, score, priority, sentiment, action, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
          `).run(p.platform, p.source, p.title, p.url, p.author, p.body, p.score, p.priority, p.sentiment, p.action);
        } catch (e) {
          // Ignore duplicates
        }
      }
    } catch (e) {
      console.error('[TITAN-SCANNER] Store error:', e.message);
    }
  }

  async getProspects(status = 'new', limit = 50) {
    const db = getDb();
    try {
      return db.prepare('SELECT * FROM titan_prospects WHERE status = ? ORDER BY priority DESC, created_at DESC LIMIT ?').all(status, limit);
    } catch (e) {
      return [];
    }
  }

  async markContacted(id, notes = '') {
    const db = getDb();
    try {
      db.prepare('UPDATE titan_prospects SET status = "contacted", contacted_at = CURRENT_TIMESTAMP, notes = ? WHERE id = ?').run(notes, id);
      return { updated: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  async generateOutreachMessage(prospect) {
    const titan = require('./titanHub').titan;
    const prompt = `Generate a personalized outreach message for this prospect:

Platform: ${prospect.platform}
Title: ${prospect.title}
Content: ${prospect.body}
Sentiment: ${prospect.sentiment}

Context:
- We are LuxStream IPTV Premium
- We offer 25,000+ channels, 10,000+ movies, 5,000+ series
- Free trial available (no credit card)
- World Cup 2026 in 4K
- 4K HDR quality

Generate a short, engaging message (max 3 sentences) that:
1. Acknowledges their need
2. Offers our solution
3. Includes a soft CTA (trial link or "DM for details")

Message:`;

    const message = await titan.generate(prompt);
    return message.trim();
  }

  async scanTrends() {
    // Analyze what topics are trending in IPTV space
    const keywords = ['IPTV', 'free trial', 'World Cup 2026', '4K streaming', 'cut cable'];
    const trends = [];
    
    for (const keyword of keywords) {
      try {
        const res = await axios.get(`https://trends.google.com/trends/trendingsearches/daily/rss?geo=US`, {
          timeout: 10000,
        });
        // Parse RSS for mentions
        if (res.data.includes(keyword)) {
          trends.push({ keyword, trending: true, source: 'Google Trends' });
        }
      } catch (e) {
        // Ignore
      }
    }

    return trends;
  }
}

const scanner = new TitanCustomerScanner();
module.exports = scanner;
