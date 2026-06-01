const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_random_string';

const APPLE_PUBLIC_KEYS_URL = 'https://appleid.apple.com/auth/keys';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function verifyGoogleToken(idToken) {
  const { OAuth2Client } = require('google-auth-library');
  const { getDb } = require('../db');
  const db = getDb();
  const clientId = (db.prepare("SELECT value FROM app_settings WHERE key = 'google_client_id'").get() || {}).value;
  if (!clientId) throw new Error('Google sign-in not configured (google_client_id missing)');
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  return {
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    avatar: payload.picture || null,
    provider: 'google',
    providerId: payload.sub,
  };
}

async function verifyAppleToken(idToken) {
  const { getDb } = require('../db');
  const db = getDb();
  const clientId = (db.prepare("SELECT value FROM app_settings WHERE key = 'apple_client_id'").get() || {}).value;
  if (!clientId) throw new Error('Apple sign-in not configured (apple_client_id missing)');
  const res = await fetch(APPLE_PUBLIC_KEYS_URL);
  const { keys } = await res.json();
  let payload = null;
  for (const key of keys) {
    try {
      const publicKey = `-----BEGIN PUBLIC KEY-----\n${key.n}\n-----END PUBLIC KEY-----`;
      payload = jwt.verify(idToken, publicKey, { algorithms: ['RS256'], issuer: 'https://appleid.apple.com', audience: clientId });
      break;
    } catch {}
  }
  if (!payload) throw new Error('Invalid Apple token');
  return {
    email: payload.email || `${payload.sub}@apple.private`,
    name: payload.email ? payload.email.split('@')[0] : 'Apple User',
    avatar: null,
    provider: 'apple',
    providerId: payload.sub,
  };
}

async function findOrCreateUser({ email, name, avatar, provider, providerId }) {
  const { getDb } = require('../db');
  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user && providerId) {
    user = db.prepare("SELECT * FROM users WHERE provider = ? AND provider_id = ?").get(provider, providerId);
  }
  if (!user) {
    const result = db.prepare(
      'INSERT INTO users (name, email, avatar, provider, provider_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, avatar, provider, providerId || null);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  } else {
    db.prepare('UPDATE users SET name = ?, avatar = COALESCE(?, avatar) WHERE id = ?').run(name, avatar, user.id);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }
  return user;
}

function getUserSubscriptions(userId) {
  const { getDb } = require('../db');
  const db = getDb();
  return db.prepare(`
    SELECT o.id as order_id, o.amount, o.status, o.created_at as purchased_at,
           pp.plan_name, pp.duration_days, pp.price_sell,
           pc.name as provider_name,
           datetime(o.created_at, '+' || pp.duration_days || ' days') as expires_at
    FROM orders o
    JOIN provider_plans pp ON o.plan_id = pp.id
    JOIN providers_catalog pc ON o.provider_id = pc.id
    WHERE o.user_id = ? AND o.status IN ('completed', 'active')
    ORDER BY o.created_at DESC
  `).all(userId);
}

module.exports = { signToken, authMiddleware, verifyGoogleToken, verifyAppleToken, findOrCreateUser, getUserSubscriptions };
