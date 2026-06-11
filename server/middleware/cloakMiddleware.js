const fs = require('fs');
const path = require('path');
const { generateSafePage } = require('../services/safePage');
const { generateHostingPage } = require('../services/hostingPage');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'cloak.json');

let config = null;
let configMtime = 0;

function loadConfig() {
  try {
    const stats = fs.statSync(CONFIG_PATH);
    if (config && stats.mtimeMs === configMtime) return config;
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(raw);
    configMtime = stats.mtimeMs;
    console.log('[Cloak] Config loaded');
    return config;
  } catch (e) {
    console.error('[Cloak] Failed to load config:', e.message);
    return null;
  }
}

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function ipInCIDR(ip, cidr) {
  try {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);
    const ipNum = ipToInt(ip);
    const rangeNum = ipToInt(range);
    const mask = bits === 0 ? 0 : ~(2 ** (32 - bits) - 1) >>> 0;
    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

function matchIP(ip, ranges) {
  if (!ip || !ranges || ranges.length === 0) return false;
  return ranges.some(cidr => ipInCIDR(ip, cidr));
}

function matchUA(ua, patterns) {
  if (!ua || !patterns || patterns.length === 0) return false;
  const lower = ua.toLowerCase();
  return patterns.some(p => {
    if (p.includes('*')) {
      const regex = new RegExp('^' + p.replace(/\*/g, '.*').replace(/[.+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
      return regex.test(ua);
    }
    return lower.includes(p.toLowerCase());
  });
}

function cloakMiddleware(req, res, next) {
  const cfg = loadConfig();
  if (!cfg || !cfg.enabled) return next();

  // NEVER cloak webhooks or checkout API — payment processors must reach these
  const safePaths = ['/api/webhooks/', '/api/checkout/', '/api/trial/', '/payment/', '/api/account/'];
  if (safePaths.some(p => req.path.startsWith(p))) return next();

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';

  let matched = false;
  let matchedPlatform = null;

  for (const [platform, rules] of Object.entries(cfg.platforms)) {
    if (matchIP(ip, rules.ip_ranges)) {
      matched = true;
      matchedPlatform = platform;
      break;
    }
    if (matchUA(ua, rules.user_agents)) {
      matched = true;
      matchedPlatform = platform;
      break;
    }
  }

  if (matched) {
    console.log(`[Cloak] ${matchedPlatform} detected — IP: ${ip}, UA: ${ua.slice(0, 80)}`);
    res.setHeader('X-Cloak', matchedPlatform);
    const pageType = cfg.platforms[matchedPlatform]?.page_type || 'default';
    if (pageType === 'hosting') {
      res.send(generateHostingPage());
    } else {
      res.send(generateSafePage(cfg));
    }
    return;
  }

  req.isRealUser = true;
  next();
}

module.exports = cloakMiddleware;
