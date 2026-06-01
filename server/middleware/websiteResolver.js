const { getDb } = require('../db');

function websiteResolver(req, res, next) {
  const host = req.get('Host') || '';
  const domain = host.split(':')[0].toLowerCase();

  const db = getDb();
  let website = null;

  const allWebsites = db.prepare('SELECT * FROM websites WHERE active = 1').all();

  for (const w of allWebsites) {
    let domains = [];
    try { domains = JSON.parse(w.domains || '[]'); } catch {}
    if (domains.some(d => d.toLowerCase() === domain)) {
      website = w;
      break;
    }
  }

  if (!website) {
    website = allWebsites.find(w => w.id === 1) || allWebsites[0] || null;
  }

  if (!website) {
    website = { id: 1, name: 'Default', slug: 'default', site_name: 'IPTV Boss', logo_url: '' };
  }

  req.website = website;
  next();
}

module.exports = websiteResolver;
