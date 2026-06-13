const axios = require('axios');
const { getDb } = require('../db');
const m3uParser = require('../services/m3uParser');

const M3U_URL = 'http://apcup26.space/get.php?username=941740798827195&password=1593574628&type=m3u&output=ts';
const PROVIDER_ID = 4;

async function parseAndSaveM3U() {
  console.log('[M3U-IMPORT] Starting M3U import...');
  console.log('[M3U-IMPORT] URL:', M3U_URL);
  
  try {
    const res = await axios.get(M3U_URL, {
      timeout: 120000,
      maxContentLength: 100 * 1024 * 1024,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    
    const content = res.data;
    console.log('[M3U-IMPORT] Downloaded:', content.length, 'chars');
    
    // Parse M3U
    const categories = m3uParser.parseM3U(content);
    const counts = m3uParser.getChannelCounts(categories);
    const sportsEvents = m3uParser.extractSportsEvents(categories.sports || []);
    const popularMovies = m3uParser.getPopularMovies(categories.movies || []);
    const popularSeries = m3uParser.getPopularSeries(categories.series || []);
    const groups = m3uParser.getGroups(m3uParser.parsedData || []);
    
    console.log('[M3U-IMPORT] Parsed stats:', counts);
    console.log('[M3U-IMPORT] Sports events:', sportsEvents.length);
    console.log('[M3U-IMPORT] Movies:', popularMovies.length);
    console.log('[M3U-IMPORT] Series:', popularSeries.length);
    console.log('[M3U-IMPORT] Groups:', groups.length);
    
    // Save M3U URL to provider
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `).run(`m3u_sample_${PROVIDER_ID}`, M3U_URL);
    
    // Save parsed data
    const contentData = {
      stats: counts,
      sportsEvents: sportsEvents.slice(0, 50),
      movies: popularMovies.slice(0, 50),
      series: popularSeries.slice(0, 50),
      groups: groups.slice(0, 100),
      lastUpdated: new Date().toISOString(),
    };
    
    db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `).run(`m3u_data_${PROVIDER_ID}`, JSON.stringify(contentData));
    
    // Save provider stats
    db.prepare(`
      UPDATE providers_catalog SET 
        specialty = ?,
        notes = ?
      WHERE id = ?
    `).run(
      `French & International - ${counts.total} channels`,
      `M3U parsed: ${counts.total} total, ${counts.live} live, ${counts.movies} movies, ${counts.series} series, ${counts.sports} sports, ${counts.news} news, ${counts.kids} kids`,
      PROVIDER_ID
    );
    
    console.log('[M3U-IMPORT] Saved to database successfully!');
    console.log('[M3U-IMPORT] Total channels:', counts.total);
    console.log('[M3U-IMPORT] Groups found:', groups.length);
    
    // Show top groups
    console.log('\n[M3U-IMPORT] Top 20 groups:');
    groups.sort((a, b) => b.count - a.count).slice(0, 20).forEach(g => {
      console.log(`  ${g.name}: ${g.count} channels`);
    });
    
    // Show sample sports
    if (sportsEvents.length > 0) {
      console.log('\n[M3U-IMPORT] Sample sports events:');
      sportsEvents.slice(0, 10).forEach(e => {
        console.log(`  ${e.title} (${e.league} / ${e.sport})`);
      });
    }
    
    // Show sample movies
    if (popularMovies.length > 0) {
      console.log('\n[M3U-IMPORT] Sample movies:');
      popularMovies.slice(0, 10).forEach(m => {
        console.log(`  ${m.title} ${m.year ? `(${m.year})` : ''} ${m.quality || ''}`);
      });
    }
    
    return { success: true, counts, groups: groups.length };
  } catch (e) {
    console.error('[M3U-IMPORT] Error:', e.message);
    return { success: false, error: e.message };
  }
}

parseAndSaveM3U().then(r => {
  console.log('\n[M3U-IMPORT] Done:', r);
  process.exit(0);
}).catch(e => {
  console.error('[M3U-IMPORT] Fatal error:', e);
  process.exit(1);
});
