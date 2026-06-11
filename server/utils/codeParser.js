function parseCodes(input) {
  if (!input || typeof input !== 'string') return [];
  const lines = input.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));

  return lines.map(line => {
    // Format 1: M3U URL line: http://server:port/user/pass/12345
    const m3uMatch = line.match(/^(https?:\/\/)?([^\/]+)(:\d+)?\/([^\/]+)\/([^\/]+)\/(\d+)/);
    if (m3uMatch) {
      return {
        code: m3uMatch[6] || null,
        username: m3uMatch[4] || null,
        password: m3uMatch[5] || null,
        server_url: `${m3uMatch[1] || 'http://'}${m3uMatch[2]}${m3uMatch[3] || ''}`,
        notes: `Auto-detected M3U stream URL (channel: ${m3uMatch[6]})`,
      };
    }

    // Format 2: Full M3U line with #EXTINF: http://server:port/user/pass/12345
    const extinfMatch = line.match(/#EXTINF:.*,(.+)/);
    if (extinfMatch && lines.includes(line)) {
      const channelName = extinfMatch[1].trim();
      const nextLineIndex = lines.indexOf(line) + 1;
      const streamLine = lines[nextLineIndex];
      if (streamLine) {
        const m3u = streamLine.match(/^(https?:\/\/)?([^\/]+)(:\d+)?\/([^\/]+)\/([^\/]+)\/(\d+)/);
        if (m3u) {
          return {
            code: m3u[6] || null,
            username: m3u[4] || null,
            password: m3u[5] || null,
            server_url: `${m3u[1] || 'http://'}${m3u[2]}${m3u[3] || ''}`,
            notes: `Channel: ${channelName}`,
          };
        }
      }
    }

    // Format 3: Comma-separated: code,username,password,server,mac,expires,notes
    if (line.includes(',')) {
      const parts = line.split(',');
      return {
        code: parts[0]?.trim() || null,
        username: parts[1]?.trim() || null,
        password: parts[2]?.trim() || null,
        server_url: parts[3]?.trim() || null,
        mac_address: parts[4]?.trim() || null,
        expires_at: parts[5]?.trim() || null,
        notes: parts[6]?.trim() || null,
      };
    }

    // Format 4: PIPE-separated: code|username|password|server|mac|expires
    if (line.includes('|')) {
      const parts = line.split('|');
      return {
        code: parts[0]?.trim() || null,
        username: parts[1]?.trim() || null,
        password: parts[2]?.trim() || null,
        server_url: parts[3]?.trim() || null,
        mac_address: parts[4]?.trim() || null,
        expires_at: parts[5]?.trim() || null,
        notes: parts[6]?.trim() || null,
      };
    }

    // Format 5: Tab-separated: code\tusername\tpassword\tserver
    if (line.includes('\t')) {
      const parts = line.split('\t');
      return {
        code: parts[0]?.trim() || null,
        username: parts[1]?.trim() || null,
        password: parts[2]?.trim() || null,
        server_url: parts[3]?.trim() || null,
        mac_address: parts[4]?.trim() || null,
        expires_at: parts[5]?.trim() || null,
      };
    }

    // Format 6: user:pass:server:mac (colon-separated)
    if (line.includes(':')) {
      const parts = line.split(':');
      if (parts.length === 2) {
        return { username: parts[0].trim(), password: parts[1].trim() };
      }
      if (parts.length === 3) {
        return { username: parts[0].trim(), password: parts[1].trim(), server_url: parts[2].trim() };
      }
      if (parts.length >= 4) {
        return {
          username: parts[0].trim(),
          password: parts[1].trim(),
          server_url: parts[2].trim(),
          mac_address: parts.slice(3).join(':').trim(),
        };
      }
    }

    // Format 7: Space-separated (code user pass server)
    const spaceParts = line.split(/\s+/);
    if (spaceParts.length === 4 && !isNaN(spaceParts[0])) {
      return {
        code: spaceParts[0]?.trim() || null,
        username: spaceParts[1]?.trim() || null,
        password: spaceParts[2]?.trim() || null,
        server_url: spaceParts[3]?.trim() || null,
      };
    }

    // Format 8: Single code (numeric or alphanumeric)
    if (/^[A-Za-z0-9_-]+$/.test(line) && line.length >= 4) {
      return { code: line.trim() };
    }

    // Fallback: username line (might be an email or user)
    if (line.includes('@') || line.includes('.')) {
      return { username: line.trim(), code: line.trim() };
    }

    // Last resort: treat as code
    return { code: line.trim() };
  });
}

function parseCSV(content) {
  try {
    const { parse } = require('csv-parse/sync');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });
    return records.map(r => ({
      code: r.code || r.Code || r.CODE || r.key || r.Key || r.serial || r.Serial || null,
      username: r.username || r.Username || r.user || r.User || r.login || r.Login || null,
      password: r.password || r.Password || r.pass || r.Pass || r.pwd || null,
      server_url: r.server_url || r.server || r.Server || r.url || r.Url || r.URL || r.host || r.Host || null,
      mac_address: r.mac_address || r.mac || r.Mac || r.MAC || null,
      expires_at: r.expires_at || r.expires || r.Expires || r.expiry || r.Expiry || r.expiration || null,
      notes: r.notes || r.Notes || r.comment || r.Comment || null,
    }));
  } catch {
    return [];
  }
}

// Analyze uploaded content and return format info + preview
function analyzeImport(content) {
  const lines = content.split('\n').filter(l => l.trim()).filter(l => !l.startsWith('#'));
  const sample = lines.slice(0, 5);

  let detectedFormat = 'unknown';
  let fields = [];

  if (sample.some(l => l.match(/https?:\/\/[^\/]+\/[^\/]+\/[^\/]+\/\d+/))) {
    detectedFormat = 'm3u_streams';
    fields = ['username', 'password', 'server_url', 'code'];
  } else if (sample.some(l => l.includes('|'))) {
    detectedFormat = 'pipe_separated';
    fields = ['code', 'username', 'password', 'server_url', 'mac_address', 'expires'];
  } else if (sample.some(l => l.includes('\t'))) {
    detectedFormat = 'tab_separated';
    fields = ['code', 'username', 'password', 'server_url'];
  } else if (sample.some(l => l.includes(','))) {
    detectedFormat = 'comma_separated';
    fields = ['code', 'username', 'password', 'server_url', 'mac_address', 'expires', 'notes'];
  } else if (sample.some(l => l.includes(':'))) {
    detectedFormat = 'colon_separated';
    const first = sample.find(l => l.includes(':'));
    const parts = first.split(':');
    if (parts.length === 2) fields = ['username', 'password'];
    else if (parts.length === 3) fields = ['username', 'password', 'server_url'];
    else fields = ['username', 'password', 'server_url', 'mac_address'];
  } else if (sample.every(l => /^[A-Za-z0-9_-]+$/.test(l))) {
    detectedFormat = 'single_codes';
    fields = ['code'];
  }

  return {
    totalLines: lines.length,
    detectedFormat,
    fields,
    sample: sample.slice(0, 3),
    parsed: parseCodes(content),
  };
}

module.exports = { parseCodes, parseCSV, analyzeImport };