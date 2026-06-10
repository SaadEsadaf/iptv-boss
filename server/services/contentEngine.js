const { getDb } = require('../db');
const m3uParser = require('./m3uParser');

/**
 * CONTENT ENGINE SERVICE
 * 
 * Automatically generates website content based on:
 * - M3U playlist data (channels, movies, series, sports)
 * - Provider configuration
 * - Upcoming matches
 * - Popular content
 * 
 * Creates dynamic sections for home page:
 * - Featured sports events
 * - Trending movies
 * - Popular series
 * - Channel categories
 * - App recommendations
 */

class ContentEngine {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  async generateWebsiteContent(websiteId, providerId) {
    const cacheKey = `content_${websiteId}_${providerId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const db = getDb();
    const provider = db.prepare('SELECT * FROM providers_catalog WHERE id = ?').get(providerId);
    if (!provider) return null;

    // Try to fetch M3U sample
    let m3uData = null;
    const m3uUrl = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(`m3u_sample_${providerId}`);
    if (m3uUrl?.value) {
      m3uData = await m3uParser.fetchM3U(m3uUrl.value);
    }

    // Generate content sections
    const content = {
      provider: {
        name: provider.name,
        website: provider.website,
        panelUrl: provider.panel_url,
      },
      stats: m3uData?.stats || { total: 0, live: 0, movies: 0, series: 0, sports: 0 },
      sports: this.generateSportsSection(m3uData?.sportsEvents || [], provider),
      movies: this.generateMoviesSection(m3uData?.movies || [], provider),
      series: this.generateSeriesSection(m3uData?.series || [], provider),
      apps: this.getAppRecommendations(provider),
      categories: this.generateCategoriesSection(m3uData?.stats || {}),
      lastUpdated: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { data: content, timestamp: Date.now() });
    return content;
  }

  generateSportsSection(events, provider) {
    if (events.length === 0) {
      return {
        title: 'Sports en Direct',
        subtitle: 'Tous les sports en streaming 4K',
        events: [
          { title: 'Premier League', league: 'Premier League', sport: 'Football', featured: true },
          { title: 'Champions League', league: 'Champions League', sport: 'Football', featured: true },
          { title: 'La Liga', league: 'La Liga', sport: 'Football', featured: false },
          { title: 'Bundesliga', league: 'Bundesliga', sport: 'Football', featured: false },
          { title: 'NBA', league: 'NBA', sport: 'Basketball', featured: true },
          { title: 'NFL', league: 'NFL', sport: 'American Football', featured: true },
          { title: 'UFC', league: 'UFC', sport: 'MMA', featured: false },
          { title: 'F1', league: 'Formula 1', sport: 'Motorsport', featured: false },
          { title: 'World Cup 2026', league: 'World Cup', sport: 'Football', featured: true },
        ],
      };
    }

    const featured = events.filter(e => 
      /world cup|champions league|premier league|nba|nfl|super bowl/i.test(e.title)
    ).slice(0, 5);

    return {
      title: 'Sports en Direct',
      subtitle: `${events.length} événements sportifs disponibles`,
      events: featured.length > 0 ? featured : events.slice(0, 10),
    };
  }

  generateMoviesSection(movies, provider) {
    if (movies.length === 0) {
      return {
        title: 'Films à la Demande',
        subtitle: '10,000+ films en VOD',
        movies: [
          { title: 'Dune: Part Two', year: 2024, quality: '4K', featured: true },
          { title: 'Oppenheimer', year: 2023, quality: '4K', featured: true },
          { title: 'The Batman', year: 2022, quality: '4K', featured: false },
          { title: 'Spider-Man: No Way Home', year: 2021, quality: '4K', featured: false },
          { title: 'Avatar: The Way of Water', year: 2022, quality: '4K', featured: true },
          { title: 'Top Gun: Maverick', year: 2022, quality: '4K', featured: true },
        ],
      };
    }

    const featured = movies.filter(m => m.year && m.year >= 2022).slice(0, 6);
    return {
      title: 'Films à la Demande',
      subtitle: `${movies.length} films disponibles en VOD`,
      movies: featured.length > 0 ? featured : movies.slice(0, 6),
    };
  }

  generateSeriesSection(series, provider) {
    if (series.length === 0) {
      return {
        title: 'Séries TV',
        subtitle: '5,000+ séries en streaming',
        series: [
          { title: 'The Last of Us', season: 1, featured: true },
          { title: 'House of the Dragon', season: 2, featured: true },
          { title: 'The Bear', season: 2, featured: false },
          { title: 'Severance', season: 2, featured: false },
          { title: 'Succession', season: 4, featured: true },
          { title: 'The White Lotus', season: 2, featured: true },
        ],
      };
    }

    const featured = series.slice(0, 6);
    return {
      title: 'Séries TV',
      subtitle: `${series.length} séries disponibles`,
      series: featured,
    };
  }

  getAppRecommendations(provider) {
    // Standard IPTV apps that work with most providers
    return {
      title: 'Applications Compatibles',
      subtitle: 'Installez sur tous vos appareils',
      apps: [
        {
          name: 'IPTV Smarters Pro',
          icon: 'smarters',
          platforms: ['Android', 'iOS', 'Fire TV', 'Android TV'],
          description: 'Application IPTV la plus populaire avec EPG intégré',
          url: 'https://www.iptvsmarters.com/',
        },
        {
          name: 'TiviMate',
          icon: 'tivimate',
          platforms: ['Android TV', 'Fire TV'],
          description: 'Meilleure interface pour Android TV et Fire Stick',
          url: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv',
        },
        {
          name: 'VLC Media Player',
          icon: 'vlc',
          platforms: ['Windows', 'Mac', 'Linux', 'Android', 'iOS'],
          description: 'Lecteur universel gratuit pour tous les formats',
          url: 'https://www.videolan.org/',
        },
        {
          name: 'Perfect Player',
          icon: 'perfect',
          platforms: ['Android', 'Android TV', 'Windows'],
          description: 'Lecteur IPTV simple et efficace',
          url: 'https://www.perfect-player.com/',
        },
        {
          name: 'GSE Smart IPTV',
          icon: 'gse',
          platforms: ['iOS', 'Android', 'Apple TV', 'Android TV'],
          description: 'Compatible avec Chromecast et Apple TV',
          url: 'https://gseiptv.com/',
        },
        {
          name: 'XCIPTV',
          icon: 'xciptv',
          platforms: ['Android', 'Android TV', 'Fire TV'],
          description: 'Application moderne avec design épuré',
          url: 'https://xciptv.app/',
        },
      ],
      setup: {
        title: 'Comment installer',
        steps: [
          'Téléchargez l\'application de votre choix',
          'Entrez l\'URL de votre playlist M3U ou votre code Xtream',
          'Profitez de 25,000+ chaînes en streaming',
        ],
      },
    };
  }

  generateCategoriesSection(stats) {
    return {
      title: 'Catégories de Contenu',
      categories: [
        { name: 'Sports', count: stats.sports || 0, icon: '⚽', color: '#00d4ff' },
        { name: 'Films', count: stats.movies || 0, icon: '🎬', color: '#ff6b35' },
        { name: 'Séries', count: stats.series || 0, icon: '📺', color: '#ffd700' },
        { name: 'Direct', count: stats.live || 0, icon: '📡', color: '#00ff88' },
        { name: 'News', count: stats.news || 0, icon: '📰', color: '#ff4444' },
        { name: 'Kids', count: stats.kids || 0, icon: '🎮', color: '#7b2dff' },
        { name: 'Musique', count: stats.music || 0, icon: '🎵', color: '#ff6b9d' },
        { name: 'Documentaires', count: stats.documentary || 0, icon: '🌍', color: '#00ff88' },
      ].filter(c => c.count > 0),
    };
  }

  // Save M3U sample URL for a provider
  async saveM3USample(providerId, m3uUrl) {
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `).run(`m3u_sample_${providerId}`, m3uUrl);
    
    // Clear cache
    this.cache.clear();
    
    // Fetch and generate immediately
    const data = await m3uParser.fetchM3U(m3uUrl);
    if (data) {
      db.prepare(`
        INSERT OR REPLACE INTO app_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
      `).run(`m3u_data_${providerId}`, JSON.stringify(data));
    }
    
    return { success: true, parsed: data };
  }

  // Get M3U data for provider
  getM3UData(providerId) {
    const db = getDb();
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(`m3u_data_${providerId}`);
    if (row?.value) {
      try {
        return JSON.parse(row.value);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Get content for website API
  async getWebsiteContent(websiteId, providerId) {
    const content = await this.generateWebsiteContent(websiteId, providerId);
    return content;
  }
}

module.exports = new ContentEngine();
