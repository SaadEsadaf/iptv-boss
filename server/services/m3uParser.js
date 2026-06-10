const axios = require('axios');

/**
 * M3U PARSER SERVICE
 * 
 * Fetches and parses M3U playlist files to extract:
 * - Live TV channels
 * - Movies (VOD)
 * - TV Series
 * - Sports matches (upcoming events)
 * 
 * Auto-generates content for website based on parsed data
 */

class M3UParser {
  constructor() {
    this.parsedData = null;
    this.lastFetch = null;
  }

  // Fetch M3U from URL
  async fetchM3U(url) {
    try {
      const res = await axios.get(url, { timeout: 30000, maxContentLength: 50 * 1024 * 1024 });
      const content = res.data;
      this.lastFetch = new Date();
      return this.parseM3U(content);
    } catch (e) {
      console.error('[M3U] Fetch failed:', e.message);
      return null;
    }
  }

  // Parse M3U content
  parseM3U(content) {
    const lines = content.split('\n');
    const items = [];
    let currentItem = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#EXTINF')) {
        // Parse EXTINF line
        currentItem = this.parseExtInf(trimmed);
      } else if (trimmed && !trimmed.startsWith('#') && currentItem) {
        // URL line
        currentItem.url = trimmed;
        items.push(currentItem);
        currentItem = null;
      }
    }
    
    this.parsedData = items;
    return this.categorizeItems(items);
  }

  parseExtInf(line) {
    const item = {
      duration: -1,
      title: '',
      group: '',
      logo: '',
      tvgId: '',
      tvgName: '',
      url: '',
    };
    
    // Extract duration: #EXTINF:-1 or #EXTINF:0
    const durationMatch = line.match(/#EXTINF:([-\d.]+)/);
    if (durationMatch) item.duration = parseFloat(durationMatch[1]);
    
    // Extract attributes: tvg-name, group-title, tvg-logo, tvg-id
    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
    if (tvgNameMatch) item.tvgName = tvgNameMatch[1];
    
    const groupMatch = line.match(/group-title="([^"]*)"/);
    if (groupMatch) item.group = groupMatch[1];
    
    const logoMatch = line.match(/tvg-logo="([^"]*)"/);
    if (logoMatch) item.logo = logoMatch[1];
    
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    if (tvgIdMatch) item.tvgId = tvgIdMatch[1];
    
    // Extract title after the comma
    const commaIndex = line.lastIndexOf(',');
    if (commaIndex !== -1) {
      item.title = line.substring(commaIndex + 1).trim();
    } else {
      item.title = item.tvgName || 'Unknown';
    }
    
    return item;
  }

  categorizeItems(items) {
    const categories = {
      live: [],
      movies: [],
      series: [],
      sports: [],
      news: [],
      entertainment: [],
      kids: [],
      music: [],
      documentary: [],
      religious: [],
      other: [],
    };
    
    for (const item of items) {
      const group = (item.group || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      
      // Detect movies (VOD)
      if (group.includes('movie') || group.includes('film') || group.includes('vod') || 
          title.includes('movie') || item.duration > 3000) {
        categories.movies.push(item);
        continue;
      }
      
      // Detect series
      if (group.includes('series') || group.includes('tv show') || group.includes('episodes') ||
          /S\d{1,2}E\d{1,2}/i.test(item.title) || /S\d{1,2}.*E\d{1,2}/i.test(item.title)) {
        categories.series.push(item);
        continue;
      }
      
      // Detect sports
      if (group.includes('sport') || group.includes('football') || group.includes('soccer') ||
          group.includes('basketball') || group.includes('nfl') || group.includes('nba') ||
          group.includes('ufc') || group.includes('boxing') || group.includes('f1') ||
          group.includes('tennis') || group.includes('cricket') || group.includes('golf') ||
          group.includes('rugby') || group.includes('hockey') || group.includes('baseball') ||
          group.includes('mma') || group.includes('wrestling') || group.includes('motorsport')) {
        categories.sports.push(item);
        continue;
      }
      
      // Detect news
      if (group.includes('news') || title.includes('news') || group.includes('information')) {
        categories.news.push(item);
        continue;
      }
      
      // Detect kids
      if (group.includes('kids') || group.includes('children') || group.includes('cartoon') ||
          group.includes('animation') || group.includes('disney') || group.includes('nick')) {
        categories.kids.push(item);
        continue;
      }
      
      // Detect music
      if (group.includes('music') || group.includes('radio') || group.includes('mtv') ||
          group.includes('vh1')) {
        categories.music.push(item);
        continue;
      }
      
      // Detect documentary
      if (group.includes('documentary') || group.includes('discovery') || group.includes('history') ||
          group.includes('national geographic') || group.includes('nat geo')) {
        categories.documentary.push(item);
        continue;
      }
      
      // Detect religious
      if (group.includes('religious') || group.includes('islam') || group.includes('christian') ||
          group.includes('hindu') || group.includes('jewish') || group.includes('buddhist') ||
          group.includes('spiritual')) {
        categories.religious.push(item);
        continue;
      }
      
      // Detect entertainment
      if (group.includes('entertainment') || group.includes('lifestyle') || group.includes('fashion') ||
          group.includes('cooking') || group.includes('travel') || group.includes('reality') ||
          group.includes('comedy') || group.includes('drama') || group.includes('action') ||
          group.includes('thriller') || group.includes('romance')) {
        categories.entertainment.push(item);
        continue;
      }
      
      // Default to live
      categories.live.push(item);
    }
    
    return categories;
  }

  // Extract sports events from channel names
  extractSportsEvents(sportsItems) {
    const events = [];
    const leaguePatterns = [
      { pattern: /premier league|epl|english premier/i, league: 'Premier League', sport: 'Football' },
      { pattern: /la liga|spanish league/i, league: 'La Liga', sport: 'Football' },
      { pattern: /serie a|italian league/i, league: 'Serie A', sport: 'Football' },
      { pattern: /bundesliga|german league/i, league: 'Bundesliga', sport: 'Football' },
      { pattern: /ligue 1|french league/i, league: 'Ligue 1', sport: 'Football' },
      { pattern: /champions league|ucl/i, league: 'Champions League', sport: 'Football' },
      { pattern: /europa league|uel/i, league: 'Europa League', sport: 'Football' },
      { pattern: /world cup|fifa world cup/i, league: 'World Cup', sport: 'Football' },
      { pattern: /euro|european championship/i, league: 'Euro', sport: 'Football' },
      { pattern: /copa america|cop américa/i, league: 'Copa America', sport: 'Football' },
      { pattern: /nba/i, league: 'NBA', sport: 'Basketball' },
      { pattern: /nfl|super bowl/i, league: 'NFL', sport: 'American Football' },
      { pattern: /nhl/i, league: 'NHL', sport: 'Ice Hockey' },
      { pattern: /mlb|baseball/i, league: 'MLB', sport: 'Baseball' },
      { pattern: /ufc|mma/i, league: 'UFC', sport: 'MMA' },
      { pattern: /boxing|fight/i, league: 'Boxing', sport: 'Boxing' },
      { pattern: /f1|formula 1|formula one/i, league: 'Formula 1', sport: 'Motorsport' },
      { pattern: /motogp|moto gp/i, league: 'MotoGP', sport: 'Motorsport' },
      { pattern: /wimbledon|tennis/i, league: 'Tennis', sport: 'Tennis' },
      { pattern: /cricket|ipl|t20/i, league: 'Cricket', sport: 'Cricket' },
      { pattern: /rugby|six nations|world cup rugby/i, league: 'Rugby', sport: 'Rugby' },
      { pattern: /golf|masters|pga|open championship/i, league: 'Golf', sport: 'Golf' },
      { pattern: /olympics|olympic games/i, league: 'Olympics', sport: 'Multi-sport' },
    ];
    
    for (const item of sportsItems) {
      const title = item.title || '';
      for (const { pattern, league, sport } of leaguePatterns) {
        if (pattern.test(title)) {
          events.push({
            title: title,
            league: league,
            sport: sport,
            channel: title,
            logo: item.logo,
          });
          break;
        }
      }
    }
    
    // Deduplicate by title
    const seen = new Set();
    return events.filter(e => {
      if (seen.has(e.title)) return false;
      seen.add(e.title);
      return true;
    });
  }

  // Get popular movies (sorted by title quality)
  getPopularMovies(movieItems, count = 10) {
    const movies = movieItems.map(m => ({
      title: m.title,
      year: this.extractYear(m.title),
      logo: m.logo,
      group: m.group,
      quality: this.detectQuality(m.title),
    }));
    
    // Sort by: has logo, has year, quality indicator
    movies.sort((a, b) => {
      const scoreA = (a.logo ? 10 : 0) + (a.year ? 5 : 0) + (a.quality ? 3 : 0);
      const scoreB = (b.logo ? 10 : 0) + (b.year ? 5 : 0) + (b.quality ? 3 : 0);
      return scoreB - scoreA;
    });
    
    return movies.slice(0, count);
  }

  // Get popular series
  getPopularSeries(seriesItems, count = 10) {
    const series = seriesItems.map(s => ({
      title: s.title,
      logo: s.logo,
      group: s.group,
      season: this.extractSeason(s.title),
      episode: this.extractEpisode(s.title),
    }));
    
    // Sort by: has logo, has season info
    series.sort((a, b) => {
      const scoreA = (a.logo ? 10 : 0) + (a.season ? 5 : 0);
      const scoreB = (b.logo ? 10 : 0) + (b.season ? 5 : 0);
      return scoreB - scoreA;
    });
    
    return series.slice(0, count);
  }

  extractYear(title) {
    const match = title.match(/\b(19\d{2}|20\d{2})\b/);
    return match ? parseInt(match[1]) : null;
  }

  detectQuality(title) {
    if (/4k|uhd|ultra hd/i.test(title)) return '4K';
    if (/1080p|fhd|full hd/i.test(title)) return '1080p';
    if (/720p|hd/i.test(title)) return '720p';
    if (/sd|480p/i.test(title)) return 'SD';
    return null;
  }

  extractSeason(title) {
    const match = title.match(/[Ss]\s*(\d{1,2})/);
    return match ? parseInt(match[1]) : null;
  }

  extractEpisode(title) {
    const match = title.match(/[Ee]\s*(\d{1,2})/);
    return match ? parseInt(match[1]) : null;
  }

  // Get channel counts by category
  getChannelCounts(categories) {
    return {
      live: categories.live?.length || 0,
      movies: categories.movies?.length || 0,
      series: categories.series?.length || 0,
      sports: categories.sports?.length || 0,
      news: categories.news?.length || 0,
      entertainment: categories.entertainment?.length || 0,
      kids: categories.kids?.length || 0,
      music: categories.music?.length || 0,
      documentary: categories.documentary?.length || 0,
      religious: categories.religious?.length || 0,
      total: Object.values(categories).reduce((a, b) => a + (b?.length || 0), 0),
    };
  }

  // Get all groups
  getGroups(items) {
    const groups = {};
    for (const item of items) {
      const group = item.group || 'Other';
      if (!groups[group]) groups[group] = 0;
      groups[group]++;
    }
    return Object.entries(groups).map(([name, count]) => ({ name, count }));
  }

  // Generate website content from M3U
  generateContent(categories) {
    const counts = this.getChannelCounts(categories);
    const sportsEvents = this.extractSportsEvents(categories.sports || []);
    const popularMovies = this.getPopularMovies(categories.movies || []);
    const popularSeries = this.getPopularSeries(categories.series || []);
    
    return {
      stats: counts,
      sportsEvents: sportsEvents.slice(0, 15),
      movies: popularMovies,
      series: popularSeries,
      groups: this.getGroups(this.parsedData || []),
    };
  }
}

module.exports = new M3UParser();
