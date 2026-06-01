const { parse } = require('csv-parse/sync');

function parseCodes(input) {
  if (!input || typeof input !== 'string') return [];
  const lines = input.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  return lines.map(line => {
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
          mac_address: parts[3].trim(),
        };
      }
    }
    if (/^[A-Z0-9-]+$/i.test(line)) {
      return { code: line.trim() };
    }
    return { code: line.trim() };
  });
}

function parseCSV(content) {
  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    return records.map(r => ({
      code: r.code || null,
      username: r.username || r.user || null,
      password: r.password || r.pass || null,
      server_url: r.server_url || r.server || r.url || null,
      mac_address: r.mac_address || r.mac || null,
      expires_at: r.expires_at || r.expires || null,
      notes: r.notes || null,
    }));
  } catch {
    return [];
  }
}

module.exports = { parseCodes, parseCSV };
