const { getDb } = require('../db');

// App-specific credential formats
const APP_CONFIGS = {
  tivimate: {
    name: 'TiviMate',
    icon: '🔥',
    download: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv',
    store: 'Google Play',
    platforms: 'Firestick, Android TV',
    credentialType: 'xtream',
    setup: [
      'Download TiviMate from Google Play',
      'Open app → Settings → Playlists → Add playlist',
      'Choose "Xtream Codes API"',
      'Enter Server URL, Username, and Password from below',
      'Done! Your channels load automatically',
    ],
  },
  smarters: {
    name: 'IPTV Smarters',
    icon: '📱',
    download: 'https://www.iptvsmarters.com/',
    store: 'Website / App Store',
    platforms: 'Android, iOS, PC',
    credentialType: 'xtream',
    setup: [
      'Download IPTV Smarters from their website or app store',
      'Open app → "Add New User"',
      'Choose "Xtream Codes API"',
      'Enter Server URL, Username, and Password from below',
      'Done! Start watching instantly',
    ],
  },
  gse: {
    name: 'GSE Smart IPTV',
    icon: '🍎',
    download: 'https://apps.apple.com/app/gse-smart-iptv/id1028734683',
    store: 'App Store',
    platforms: 'iPhone, iPad, Apple TV',
    credentialType: 'xtream',
    setup: [
      'Download GSE Smart IPTV from the App Store',
      'Open app → "Remote Playlists" → "Add Playlist"',
      'Choose "Xtream Codes API"',
      'Enter Server URL, Username, and Password from below',
      'Done! Your channels appear',
    ],
  },
  vlc: {
    name: 'VLC Media Player',
    icon: '💻',
    download: 'https://www.videolan.org/vlc/',
    store: 'Official website',
    platforms: 'PC, Mac, Linux, Mobile',
    credentialType: 'm3u',
    setup: [
      'Download VLC Media Player from videolan.org',
      'Open VLC → Media → Open Network Stream',
      'Paste the M3U link below and click Play',
      'Done! All channels load in your playlist',
    ],
  },
  m3u: {
    name: 'M3U Link (Universal)',
    icon: '🔗',
    download: null,
    store: null,
    platforms: 'Any IPTV player',
    credentialType: 'm3u',
    setup: [
      'Copy the M3U link below',
      'Open your preferred IPTV player app',
      'Paste the link as an M3U playlist',
      'Done! All channels are loaded',
    ],
  },
};

// Validate credentials against Xtream Codes API
async function validateCredentials(serverUrl, username, password) {
  const urls = [];
  
  // Try various URL formats
  const base = serverUrl?.replace(/\/+$/, '');
  if (base) {
    if (base.startsWith('http')) {
      urls.push(`${base}/player_api.php?username=${username}&password=${password}&action=user`);
    } else {
      urls.push(`http://${base}/player_api.php?username=${username}&password=${password}&action=user`);
      urls.push(`https://${base}/player_api.php?username=${username}&password=${password}&action=user`);
    }
  }
  urls.push(`http://${serverUrl}/player_api.php?username=${username}&password=${password}&action=user`);

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.user_info) {
        return {
          valid: data.user_info.auth === 1 || data.user_info.auth === "1",
          status: data.user_info.status,
          expiresAt: data.user_info.exp_date ? new Date(parseInt(data.user_info.exp_date) * 1000).toISOString() : null,
          isTrial: data.user_info.is_trial === "1" || data.user_info.is_trial === 1,
          activeCons: parseInt(data.user_info.active_cons || '0'),
          maxConnections: parseInt(data.user_info.max_connections || '1'),
          serverInfo: data.server_info,
          raw: data,
        };
      }
    } catch {}
  }
  return { valid: false, status: 'unreachable', error: 'Could not reach server' };
}

// Generate M3U URL from credentials
function generateM3uUrl(serverUrl, username, password, format = 'm3u_plus') {
  const base = serverUrl?.replace(/\/+$/, '');
  const proto = base?.startsWith('http') ? '' : 'http://';
  return `${proto}${base}/get.php?username=${username}&password=${password}&type=${format}&output=ts`;
}

// Generate the right credential object for a specific app
function getCredentialsForApp(appKey, serverUrl, username, password) {
  const app = APP_CONFIGS[appKey] || APP_CONFIGS.tivimate;
  const base = app.credentialType === 'xtream' ? serverUrl?.replace(/\/+$/, '') : serverUrl;

  return {
    appName: app.name,
    appIcon: app.icon,
    credentialType: app.credentialType,
    downloadUrl: app.download,
    setupSteps: app.setup,
    store: app.store,
    platforms: app.platforms,
    credentials: app.credentialType === 'xtream' ? {
      server_url: base,
      username,
      password,
      m3u_url: generateM3uUrl(serverUrl, username, password),
    } : {
      m3u_url: generateM3uUrl(serverUrl, username, password),
    },
  };
}

// Bulk import trial codes
async function importTrialCodes(codes, providerId, durationHours = 24) {
  const db = getDb();
  const provider = db.prepare('SELECT id, panel_url, panel_username, panel_password FROM providers_catalog WHERE id = ?').get(providerId);
  if (!provider) throw new Error('Provider not found');

  let imported = 0;
  const insert = db.prepare(`
    INSERT INTO trial_codes (provider_id, code, username, password, server_url, duration_hours, expires_at, status)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+' || ? || ' hours'), 'available')
  `);

  for (const code of codes) {
    const codeStr = typeof code === 'string' ? code : code.code;
    const user = code.username || provider.panel_username || '';
    const pass = code.password || provider.panel_password || '';
    const server = code.server_url || provider.panel_url || '';

    insert.run(providerId, codeStr, user, pass, server, durationHours, durationHours);
    imported++;
  }

  return imported;
}

// Import activation codes (paid plans)
async function importActivationCodes(codes, providerId, planId) {
  const db = getDb();
  const provider = db.prepare('SELECT id, panel_url, panel_username, panel_password FROM providers_catalog WHERE id = ?').get(providerId);
  if (!provider) throw new Error('Provider not found');

  let imported = 0;
  const insert = db.prepare(`
    INSERT INTO activation_codes (provider_id, plan_id, code, username, password, server_url, status)
    VALUES (?, ?, ?, ?, ?, ?, 'available')
  `);

  for (const code of codes) {
    const codeStr = typeof code === 'string' ? code : code.code;
    const user = code.username || provider.panel_username || '';
    const pass = code.password || provider.panel_password || '';
    const server = code.server_url || provider.panel_url || '';

    insert.run(providerId, planId, codeStr, user, pass, server);
    imported++;
  }

  return imported;
}

module.exports = {
  APP_CONFIGS,
  validateCredentials,
  generateM3uUrl,
  getCredentialsForApp,
  importTrialCodes,
  importActivationCodes,
};