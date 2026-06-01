const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { parseCodes, parseCSV } = require('../utils/codeParser');
const multer = require('multer');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_random_string';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function parsePermissions(user) {
  if (user.role === 'super_admin') return null;
  try { return JSON.parse(user.permissions || '[]'); } catch { return []; }
}

const PATH_PERM_MAP = [
  ['/overview', 'overview'],
  ['/providers', 'providers'],
  ['/codes', 'codes'],
  ['/trials', 'trials'],
  ['/orders', 'orders'],
  ['/chat', 'chat'],
  ['/pages', 'pages'],
  ['/seo', 'seo'],
  ['/agent-log', 'agent-log'],
  ['/settings', 'settings'],
  ['/namecheap', 'domains'],
  ['/alerts', 'providers'],
  ['/assistant', 'settings'],
  ['/websites', 'websites'],
  ['/deploy-targets', 'servers'],
  ['/brain', 'brain'],
];

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const publicPaths = ['/login'];
  if (publicPaths.includes(req.path)) return next();
  if (!decoded.role) {
    const db = getDb();
    const user = db.prepare('SELECT role, permissions FROM admin_users WHERE id = ?').get(decoded.id);
    if (user) {
      decoded.role = user.role || 'super_admin';
      decoded.permissions = parsePermissions(user);
    }
  }
  req.admin = decoded;
  if (req.admin.role === 'super_admin') return next();
  const entry = PATH_PERM_MAP.find(([prefix]) => req.path.startsWith(prefix));
  if (entry) {
    const required = entry[1];
    if (!(req.admin.permissions || []).includes(required)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
  }
  next();
}

function requirePermission(...perms) {
  return (req, res, next) => {
    if (req.admin.role === 'super_admin') return next();
    const userPerms = req.admin.permissions || [];
    const has = perms.some(p => userPerms.includes(p));
    if (!has) return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    next();
  };
}

function websiteId(req) {
  return parseInt(req.query.website_id) || (req.website ? req.website.id : 1);
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const permissions = parsePermissions(user);
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, permissions },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, username: user.username, role: user.role, permissions });
});

const PERMISSION_GROUPS = {
  overview: 'Dashboard overview & stats',
  providers: 'Manage providers & plans',
  codes: 'Manage activation codes',
  trials: 'Manage trial codes',
  orders: 'View & manage orders',
  chat: 'View chat sessions',
  pages: 'Manage landing pages',
  seo: 'SEO audits, leads, sources, analytics',
  'agent-log': 'View agent activity log',
  websites: 'Manage websites',
  servers: 'Manage deploy targets',
  domains: 'Manage DNS & domains',
  settings: 'View & edit all settings',
  brain: 'Business brain status & control',
};

router.get('/permissions', authMiddleware, (req, res) => {
  res.json(PERMISSION_GROUPS);
});

router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT username, role, permissions FROM admin_users WHERE id = ?').get(req.admin.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const permissions = parsePermissions(user);
  res.json({ username: user.username, role: user.role || 'super_admin', permissions });
});

/* ── Subadmin Management (super_admin only) ── */
function requireSuperAdmin(req, res, next) {
  if (req.admin.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden: super_admin only' });
  next();
}

router.get('/subadmins', authMiddleware, requireSuperAdmin, (req, res) => {
  const db = getDb();
  const list = db.prepare("SELECT id, username, role, permissions, created_at FROM admin_users WHERE role = 'subadmin' ORDER BY created_at DESC").all();
  res.json(list.map(u => ({ ...u, permissions: parsePermissions(u) })));
});

router.post('/subadmins', authMiddleware, requireSuperAdmin, (req, res) => {
  const { username, password, permissions } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const db = getDb();
  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username already exists' });
  const validPerms = Object.keys(PERMISSION_GROUPS);
  const filtered = (permissions || []).filter(p => validPerms.includes(p));
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO admin_users (username, password_hash, role, permissions) VALUES (?, ?, ?, ?)').run(username, hash, 'subadmin', JSON.stringify(filtered));
  res.json({ id: result.lastInsertRowid, username, role: 'subadmin', permissions: filtered });
});

router.put('/subadmins/:id', authMiddleware, requireSuperAdmin, (req, res) => {
  const { username, password, permissions } = req.body;
  const db = getDb();
  const user = db.prepare("SELECT * FROM admin_users WHERE id = ? AND role = 'subadmin'").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Subadmin not found' });
  const validPerms = Object.keys(PERMISSION_GROUPS);
  const filtered = permissions ? (permissions || []).filter(p => validPerms.includes(p)) : parsePermissions(user);
  if (username && username !== user.username) {
    const existing = db.prepare('SELECT id FROM admin_users WHERE username = ? AND id != ?').get(username, req.params.id);
    if (existing) return res.status(409).json({ error: 'Username already exists' });
  }
  const updates = [];
  const params = [];
  if (username) { updates.push('username = ?'); params.push(username); }
  if (password) { updates.push('password_hash = ?'); params.push(bcrypt.hashSync(password, 10)); }
  if (permissions) { updates.push('permissions = ?'); params.push(JSON.stringify(filtered)); }
  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  const updated = db.prepare("SELECT id, username, role, permissions FROM admin_users WHERE id = ?").get(req.params.id);
  res.json({ ...updated, permissions: parsePermissions(updated) });
});

router.delete('/subadmins/:id', authMiddleware, requireSuperAdmin, (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM admin_users WHERE id = ? AND role = 'subadmin'").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Subadmin not found' });
  res.json({ success: true });
});

router.get('/overview', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);

  const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'completed' AND website_id = ?").get(wid).total;
  const revenueToday = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'completed' AND website_id = ? AND date(created_at) = date('now')").get(wid).total;
  const revenueWeek = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'completed' AND website_id = ? AND created_at >= datetime('now', '-7 days')").get(wid).total;
  const revenueMonth = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'completed' AND website_id = ? AND created_at >= datetime('now', '-30 days')").get(wid).total;

  const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE website_id = ?").get(wid).count;
  const ordersToday = db.prepare("SELECT COUNT(*) as count FROM orders WHERE website_id = ? AND date(created_at) = date('now')").get(wid).count;
  const completedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE website_id = ? AND status = 'completed'").get(wid).count;

  const availableCodes = db.prepare("SELECT COUNT(*) as count FROM activation_codes ac JOIN providers_catalog pc ON ac.provider_id = pc.id WHERE ac.status = 'available' AND pc.website_id = ?").get(wid).count;
  const availableTrials = db.prepare("SELECT COUNT(*) as count FROM trial_codes tc JOIN providers_catalog pc ON tc.provider_id = pc.id WHERE tc.status = 'available' AND pc.website_id = ?").get(wid).count;

  const chatToday = db.prepare("SELECT COUNT(*) as count FROM chat_sessions WHERE website_id = ? AND date(started_at) = date('now')").get(wid).count;
  const convertedChats = db.prepare("SELECT COUNT(*) as count FROM chat_sessions WHERE website_id = ? AND converted = 1").get(wid).count;
  const totalChats = db.prepare("SELECT COUNT(*) as count FROM chat_sessions WHERE website_id = ?").get(wid).count;
  const conversionRate = totalChats > 0 ? Math.round((convertedChats / totalChats) * 100) : 0;

  const providers = db.prepare(`
    SELECT pc.*,
      (SELECT COUNT(*) FROM activation_codes ac WHERE ac.provider_id = pc.id AND ac.status = 'available') as codes_available,
      (SELECT COUNT(*) FROM activation_codes ac WHERE ac.provider_id = pc.id AND ac.status = 'used') as codes_used,
      (SELECT COUNT(*) FROM trial_codes tc WHERE tc.provider_id = pc.id AND tc.status = 'available') as trials_available
    FROM providers_catalog pc WHERE pc.website_id = ? ORDER BY pc.name
  `).all(wid);

  const revenueByDay = db.prepare(`
    SELECT date(created_at) as day, COALESCE(SUM(amount), 0) as revenue
    FROM orders WHERE status = 'completed' AND website_id = ? AND created_at >= datetime('now', '-30 days')
    GROUP BY date(created_at) ORDER BY day
  `).all(wid);

  const ordersByPlan = db.prepare(`
    SELECT pp.plan_name, COUNT(*) as count
    FROM orders o JOIN provider_plans pp ON o.plan_id = pp.id
    WHERE o.website_id = ?
    GROUP BY pp.plan_name ORDER BY count DESC
  `).all(wid);

  const recentActivity = db.prepare('SELECT * FROM agent_log WHERE website_id = ? ORDER BY created_at DESC LIMIT 10').all(wid);

  res.json({
    revenue: { today: revenueToday, week: revenueWeek, month: revenueMonth, total: totalRevenue },
    orders: { total: totalOrders, today: ordersToday, completed: completedOrders },
    codes: { available: availableCodes, used: totalOrders },
    trials: { available: availableTrials },
    chat: { today: chatToday, total: totalChats, conversionRate },
    revenueByDay,
    ordersByPlan,
    providers,
    recentActivity,
  });
});

router.get('/providers', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);
  const providers = db.prepare(`
    SELECT pc.*,
      (SELECT COUNT(*) FROM activation_codes ac WHERE ac.provider_id = pc.id AND ac.status = 'available') as codes_available,
      (SELECT COUNT(*) FROM activation_codes ac WHERE ac.provider_id = pc.id) as codes_total,
      (SELECT COUNT(*) FROM trial_codes tc WHERE tc.provider_id = pc.id AND tc.status = 'available') as trials_available,
      (SELECT COALESCE(SUM(o.amount), 0) FROM orders o WHERE o.provider_id = pc.id AND o.status = 'completed') as revenue
    FROM providers_catalog pc WHERE pc.website_id = ? ORDER BY pc.name
  `).all(wid);
  res.json(providers);
});

router.post('/providers', authMiddleware, (req, res) => {
  const { name, logo_url, website, specialty, panel_url, panel_username, panel_password, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const wid = websiteId(req);
  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO providers_catalog (name, logo_url, website, specialty, panel_url, panel_username, panel_password, notes, website_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(name, logo_url, website, specialty, panel_url, panel_username, panel_password, notes, wid);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/providers/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { name, logo_url, website, specialty, panel_url, panel_username, panel_password, notes, active } = req.body;
  db.prepare(
    'UPDATE providers_catalog SET name = COALESCE(?, name), logo_url = COALESCE(?, logo_url), website = COALESCE(?, website), specialty = COALESCE(?, specialty), panel_url = COALESCE(?, panel_url), panel_username = COALESCE(?, panel_username), panel_password = COALESCE(?, panel_password), notes = COALESCE(?, notes), active = COALESCE(?, active) WHERE id = ?'
  ).run(name, logo_url, website, specialty, panel_url, panel_username, panel_password, notes, active ?? null, req.params.id);
  res.json({ success: true });
});

router.delete('/providers/:id', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM providers_catalog WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/providers/:id/stats', authMiddleware, (req, res) => {
  const db = getDb();
  const provider = db.prepare('SELECT * FROM providers_catalog WHERE id = ?').get(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Not found' });
  const plans = db.prepare(`
    SELECT pp.*,
      (SELECT COUNT(*) FROM activation_codes ac WHERE ac.plan_id = pp.id AND ac.status = 'available') as codes_available,
      (SELECT COUNT(*) FROM activation_codes ac WHERE ac.plan_id = pp.id) as codes_total,
      (SELECT COUNT(*) FROM orders o WHERE o.plan_id = pp.id AND o.status = 'completed') as order_count,
      (SELECT COALESCE(SUM(o.amount), 0) FROM orders o WHERE o.plan_id = pp.id AND o.status = 'completed') as revenue
    FROM provider_plans pp WHERE pp.provider_id = ? ORDER BY pp.price_sell
  `).all(req.params.id);
  res.json({ ...provider, plans });
});

router.get('/providers/:id/plans', authMiddleware, (req, res) => {
  const db = getDb();
  const plans = db.prepare('SELECT * FROM provider_plans WHERE provider_id = ? ORDER BY price_sell').all(req.params.id);
  res.json(plans);
});

router.post('/providers/:id/plans', authMiddleware, (req, res) => {
  const { plan_name, plan_type, duration_days, price_cost, price_sell, channels, streams, sellup_product_id, paypal_link } = req.body;
  if (!plan_name || !plan_type || !duration_days || !price_sell) return res.status(400).json({ error: 'Missing required fields' });
  const db = getDb();
  const wid = websiteId(req);
  const result = db.prepare(
    'INSERT INTO provider_plans (provider_id, plan_name, plan_type, duration_days, price_cost, price_sell, channels, streams, sellup_product_id, paypal_link, website_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, plan_name, plan_type, duration_days, price_cost, price_sell, channels, streams, sellup_product_id, paypal_link, wid);
  res.json({ id: result.lastInsertRowid });
});

router.put('/plans/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { plan_name, plan_type, duration_days, price_cost, price_sell, channels, streams, sellup_product_id, paypal_link, active } = req.body;
  db.prepare(
    'UPDATE provider_plans SET plan_name = COALESCE(?, plan_name), plan_type = COALESCE(?, plan_type), duration_days = COALESCE(?, duration_days), price_cost = COALESCE(?, price_cost), price_sell = COALESCE(?, price_sell), channels = COALESCE(?, channels), streams = COALESCE(?, streams), sellup_product_id = COALESCE(?, sellup_product_id), paypal_link = COALESCE(?, paypal_link), active = COALESCE(?, active) WHERE id = ?'
  ).run(plan_name, plan_type, duration_days, price_cost, price_sell, channels, streams, sellup_product_id, paypal_link, active ?? null, req.params.id);
  res.json({ success: true });
});

router.delete('/plans/:id', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM provider_plans WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/codes', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);
  let sql = 'SELECT ac.*, pc.name as provider_name, pp.plan_name FROM activation_codes ac JOIN providers_catalog pc ON ac.provider_id = pc.id JOIN provider_plans pp ON ac.plan_id = pp.id WHERE pc.website_id = ?';
  const params = [wid];
  if (req.query.provider_id) { sql += ' AND ac.provider_id = ?'; params.push(req.query.provider_id); }
  if (req.query.plan_id) { sql += ' AND ac.plan_id = ?'; params.push(req.query.plan_id); }
  if (req.query.status) { sql += ' AND ac.status = ?'; params.push(req.query.status); }
  if (req.query.search) { sql += ' AND (ac.code LIKE ? OR ac.username LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
  sql += ' ORDER BY ac.added_at DESC';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, (page - 1) * limit);
  const codes = db.prepare(sql).all(...params);
  res.json(codes);
});

router.get('/codes/stats', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);
  const stats = db.prepare(`
    SELECT ac.status, COUNT(*) as count FROM activation_codes ac
    JOIN providers_catalog pc ON ac.provider_id = pc.id
    WHERE pc.website_id = ?
    GROUP BY ac.status
  `).all(wid);
  const result = { total: 0, available: 0, used: 0, expired: 0 };
  for (const s of stats) {
    result[s.status] = s.count;
    result.total += s.count;
  }
  res.json(result);
});

router.post('/codes/import', authMiddleware, (req, res) => {
  const { provider_id, plan_id, codes: input, batch_name, notes } = req.body;
  if (!provider_id || !plan_id || !input) return res.status(400).json({ error: 'provider_id, plan_id, and codes are required' });
  const db = getDb();
  const parsed = parseCodes(input);
  if (parsed.length === 0) return res.status(400).json({ error: 'No valid codes found' });

  const insert = db.prepare(
    'INSERT INTO activation_codes (provider_id, plan_id, code, username, password, server_url, mac_address, expires_at, notes, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const batchId = db.prepare('INSERT INTO code_batches (provider_id, plan_id, batch_name, total_codes, import_type, notes) VALUES (?, ?, ?, ?, ?, ?)').run(provider_id, plan_id, batch_name || null, parsed.length, 'paste', notes || null).lastInsertRowid;

  const insertMany = db.transaction(() => {
    for (const c of parsed) {
      insert.run(provider_id, plan_id, c.code || null, c.username || null, c.password || null, c.server_url || null, c.mac_address || null, c.expires_at || null, c.notes || null, batchId);
    }
  });
  insertMany();
  res.json({ imported: parsed.length, batch_id: batchId });
});

router.post('/codes/import-csv', authMiddleware, upload.single('file'), (req, res) => {
  const { provider_id, plan_id } = req.body;
  if (!provider_id || !plan_id || !req.file) return res.status(400).json({ error: 'provider_id, plan_id, and file are required' });
  const db = getDb();
  const content = req.file.buffer.toString('utf-8');
  const parsed = parseCSV(content);
  if (parsed.length === 0) return res.status(400).json({ error: 'No valid codes found in CSV' });

  const insert = db.prepare(
    'INSERT INTO activation_codes (provider_id, plan_id, code, username, password, server_url, mac_address, expires_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction(() => {
    for (const c of parsed) {
      insert.run(provider_id, plan_id, c.code || null, c.username || null, c.password || null, c.server_url || null, c.mac_address || null, c.expires_at || null, c.notes || null);
    }
  });
  insertMany();
  res.json({ imported: parsed.length });
});

router.put('/codes/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { code, username, password, server_url, mac_address, expires_at, status, notes } = req.body;
  db.prepare(
    'UPDATE activation_codes SET code = COALESCE(?, code), username = COALESCE(?, username), password = COALESCE(?, password), server_url = COALESCE(?, server_url), mac_address = COALESCE(?, mac_address), expires_at = COALESCE(?, expires_at), status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE id = ?'
  ).run(code, username, password, server_url, mac_address, expires_at, status, notes, req.params.id);
  res.json({ success: true });
});

router.delete('/codes/:id', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM activation_codes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/codes/export', authMiddleware, (req, res) => {
  const db = getDb();
  const codes = db.prepare(`
    SELECT ac.code, ac.username, ac.password, ac.server_url, ac.mac_address, ac.expires_at, ac.status, ac.notes,
      pc.name as provider_name, pp.plan_name
    FROM activation_codes ac
    JOIN providers_catalog pc ON ac.provider_id = pc.id
    JOIN provider_plans pp ON ac.plan_id = pp.id
    ORDER BY ac.added_at DESC
  `).all();
  const header = 'provider,plan,code,username,password,server_url,mac_address,expires_at,status,notes';
  const rows = codes.map(c =>
    `${c.provider_name},${c.plan_name},${c.code || ''},${c.username || ''},${c.password || ''},${c.server_url || ''},${c.mac_address || ''},${c.expires_at || ''},${c.status},${c.notes || ''}`
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=codes-export.csv');
  res.send([header, ...rows].join('\n'));
});

router.get('/trials', authMiddleware, (req, res) => {
  const db = getDb();
  let sql = 'SELECT tc.*, pc.name as provider_name FROM trial_codes tc JOIN providers_catalog pc ON tc.provider_id = pc.id WHERE 1=1';
  const params = [];
  if (req.query.provider_id) { sql += ' AND tc.provider_id = ?'; params.push(req.query.provider_id); }
  if (req.query.status) { sql += ' AND tc.status = ?'; params.push(req.query.status); }
  sql += ' ORDER BY tc.added_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/trials/stats', authMiddleware, (req, res) => {
  const db = getDb();
  const stats = db.prepare("SELECT status, COUNT(*) as count FROM trial_codes GROUP BY status").all();
  const result = { total: 0, available: 0, used: 0, expired: 0 };
  for (const s of stats) { result[s.status] = s.count; result.total += s.count; }
  res.json(result);
});

router.post('/trials/import', authMiddleware, (req, res) => {
  const { provider_id, codes: input, duration_hours } = req.body;
  if (!provider_id || !input) return res.status(400).json({ error: 'provider_id and codes are required' });
  const db = getDb();
  const parsed = parseCodes(input);
  if (parsed.length === 0) return res.status(400).json({ error: 'No valid codes found' });
  const insert = db.prepare(
    'INSERT INTO trial_codes (provider_id, code, username, password, server_url, duration_hours) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction(() => {
    for (const c of parsed) {
      insert.run(provider_id, c.code || null, c.username || null, c.password || null, c.server_url || null, duration_hours || 72);
    }
  });
  insertMany();
  res.json({ imported: parsed.length });
});

router.get('/orders', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);
  let sql = `SELECT o.*, pc.name as provider_name, pp.plan_name
    FROM orders o
    LEFT JOIN providers_catalog pc ON o.provider_id = pc.id
    LEFT JOIN provider_plans pp ON o.plan_id = pp.id
    WHERE o.website_id = ?`;
  const params = [wid];
  if (req.query.status) { sql += ' AND o.status = ?'; params.push(req.query.status); }
  if (req.query.search) { sql += ' AND (o.customer_name LIKE ? OR o.customer_email LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
  if (req.query.provider_id) { sql += ' AND o.provider_id = ?'; params.push(req.query.provider_id); }
  sql += ' ORDER BY o.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/orders/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const order = db.prepare(`SELECT o.*, pc.name as provider_name, pp.plan_name
    FROM orders o
    LEFT JOIN providers_catalog pc ON o.provider_id = pc.id
    LEFT JOIN provider_plans pp ON o.plan_id = pp.id
    WHERE o.id = ?`).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  let chatSession = null;
  if (order.session_id) {
    chatSession = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(order.session_id);
    if (chatSession) chatSession.messages = JSON.parse(chatSession.messages || '[]');
  }
  res.json({ ...order, chat_session: chatSession });
});

router.post('/orders/:id/resend-email', authMiddleware, async (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  const { sendCredentials } = require('../services/emailService');
  const credentials = {};
  if (order.activation_code_id) {
    const code = db.prepare('SELECT * FROM activation_codes WHERE id = ?').get(order.activation_code_id);
    if (code) Object.assign(credentials, code);
  }
  const sent = await sendCredentials({
    email: order.customer_email,
    name: order.customer_name,
    credentials,
  });
  res.json({ sent });
});

router.post('/orders/:id/refund', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").run(req.params.id);
  if (req.params.id) {
    db.prepare("UPDATE activation_codes SET status = 'available', used_by_order_id = NULL, assigned_at = NULL WHERE used_by_order_id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

router.get('/chat/sessions', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);
  const sessions = db.prepare('SELECT * FROM chat_sessions WHERE website_id = ? ORDER BY started_at DESC LIMIT 100').all(wid).map(s => ({
    ...s,
    messages: JSON.parse(s.messages || '[]'),
  }));
  res.json(sessions);
});

router.get('/chat/sessions/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  session.messages = JSON.parse(session.messages || '[]');
  res.json(session);
});

router.get('/agent-log', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);
  let sql = 'SELECT * FROM agent_log WHERE website_id = ?';
  const params = [wid];
  if (req.query.agent) { sql += ' AND agent = ?'; params.push(req.query.agent); }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  res.json(db.prepare(sql).all(...params));
});

router.get('/settings', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM app_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

router.put('/settings', authMiddleware, (req, res) => {
  const db = getDb();
  const upsert = db.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')");
  const updateMany = db.transaction(() => {
    for (const [key, value] of Object.entries(req.body)) {
      upsert.run(key, String(value));
    }
  });
  updateMany();
  res.json({ success: true });
});

router.post('/settings/test-email', authMiddleware, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const { sendThankYou } = require('../services/emailService');
    await sendThankYou({ email, name: 'Test User' });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.post('/settings/test-sellup', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    let apiKey = (db.prepare("SELECT value FROM app_settings WHERE key = 'sellup_api_key'").get() || {}).value || process.env.SELLUP_API_KEY || '';
    if (!apiKey || apiKey === 'your_sellup_api_key_here') {
      return res.json({ success: false, error: 'Sellup test: configure your API key in Settings to enable' });
    }
    const response = await fetch('https://api.sellup.io/v1/products', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (response.ok) {
      const data = await response.json();
      const count = Array.isArray(data) ? data.length : (data?.data?.length || 'unknown');
      return res.json({ success: true, message: `✅ Connected — ${count} product(s) found` });
    } else if (response.status === 404) {
      // products endpoint might not exist, try another
      const meRes = await fetch('https://api.sellup.io/v1/me', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (meRes.ok) return res.json({ success: true, message: '✅ Connected (API key valid)' });
      const text = await meRes.text();
      return res.json({ success: true, message: `✅ API key valid (${meRes.status})` });
    } else {
      const text = await response.text();
      return res.json({ success: false, error: `Sellup API error ${response.status}: ${text}` });
    }
  } catch (e) {
    return res.json({ success: false, error: e.message });
  }
});

router.post('/settings/test-paypal', authMiddleware, async (req, res) => {
  try {
    const { isConfigured, getPaypalConfig } = require('../services/paypalService');
    if (!isConfigured()) {
      return res.json({ success: false, error: 'PayPal test: configure Client ID and Secret in Settings to enable' });
    }
    const { clientId, clientSecret, baseUrl } = getPaypalConfig();
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (response.ok) {
      const data = await response.json();
      if (data.access_token) {
        return res.json({ success: true, message: '✅ PayPal connected — API credentials valid' });
      }
    }
    const text = await response.text();
    return res.json({ success: false, error: `PayPal auth error ${response.status}: ${text}` });
  } catch (e) {
    return res.json({ success: false, error: e.message });
  }
});

router.post('/settings/test-namecheap', authMiddleware, async (req, res) => {
  try {
    const { testConnection } = require('../services/namecheapService');
    const result = await testConnection();
    res.json(result);
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

router.get('/namecheap/domains', authMiddleware, async (req, res) => {
  try {
    const { getDomains } = require('../services/namecheapService');
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 100;
    const result = await getDomains(page, pageSize);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/namecheap/domains/:name', authMiddleware, async (req, res) => {
  try {
    const { getDomainInfo } = require('../services/namecheapService');
    const info = await getDomainInfo(req.params.name);
    res.json(info);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/namecheap/domains/:name/dns', authMiddleware, async (req, res) => {
  try {
    const { getDnsRecords } = require('../services/namecheapService');
    const dns = await getDnsRecords(req.params.name);
    res.json(dns);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/namecheap/domains/:name/dns', authMiddleware, async (req, res) => {
  try {
    const { setDnsRecords } = require('../services/namecheapService');
    const { records } = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'records array required' });
    const result = await setDnsRecords(req.params.name, records);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/namecheap/domains/check', authMiddleware, async (req, res) => {
  try {
    const { checkDomains } = require('../services/namecheapService');
    const { domains } = req.body;
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({ error: 'domains array required' });
    }
    const result = await checkDomains(domains);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/settings/test-ai', authMiddleware, async (req, res) => {
  try {
    const { generateText, PROVIDERS, getAvailableProviders } = require('../services/aiProvider');
    const db = getDb();
    const available = getAvailableProviders(db);
    if (available.length === 0) {
      return res.json({ success: false, error: 'No AI providers configured. Add at least one API key in Settings → AI Providers.' });
    }
    const names = available.map(k => PROVIDERS[k].name).join(', ');
    await generateText({
      system: 'Reply with exactly: OK',
      messages: [{ role: 'user', content: 'Say OK' }],
      maxTokens: 10,
    });
    res.json({ success: true, message: `Available: ${names} — OK` });
  } catch (e) {
    if (e.message === 'AI_NOT_CONFIGURED') {
      res.json({ success: false, error: 'No AI providers configured. Add at least one API key in Settings → AI Providers.' });
    } else {
      res.json({ success: false, error: e.message });
    }
  }
});

router.post('/settings/test-ai/:provider', authMiddleware, async (req, res) => {
  const { provider } = req.params;
  const db = getDb();
  const { PROVIDERS } = require('../services/aiProvider');
  if (!PROVIDERS[provider]) return res.json({ success: false, error: `Unknown provider: ${provider}` });
  try {
    const { getProviderKey, getProviderModel, getProviderUrl } = require('../services/aiProvider');
    const apiKey = getProviderKey(db, provider);
    if (!apiKey) return res.json({ success: false, error: `No API key saved for ${PROVIDERS[provider].name}` });
    const model = getProviderModel(db, provider);
    const apiUrl = getProviderUrl(db, provider);
    const prov = PROVIDERS[provider];

    if (prov.sdk === 'openai') {
      const { default: OpenAI } = require('openai');
      const client = new OpenAI({ apiKey, baseURL: apiUrl });
      await client.chat.completions.create({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return res.json({ success: true, message: `${PROVIDERS[provider].name} — Connected` });
    }

    if (prov.sdk === 'gemini') {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model });
      await geminiModel.generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] });
      return res.json({ success: true, message: `${PROVIDERS[provider].name} — Connected` });
    }

    if (prov.sdk === 'anthropic') {
      const { Anthropic } = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      await client.messages.create({ model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] });
      return res.json({ success: true, message: `${PROVIDERS[provider].name} — Connected` });
    }

    res.json({ success: false, error: `SDK not supported: ${prov.sdk}` });
  } catch (e) {
    const msg = e.message || '';
    const isQuota = /\b429\b|quota|rate.limit|Too Many Requests/i.test(msg);
    if (isQuota) {
      return res.json({ success: true, message: `${PROVIDERS[provider].name} — Connected (quota exceeded)` });
    }
    res.json({ success: false, error: `${PROVIDERS[provider].name}: ${msg}` });
  }
});

router.get('/alerts', authMiddleware, (req, res) => {
  const db = getDb();
  const alerts = db.prepare(`
    SELECT sa.*, pc.name as provider_name, pp.plan_name,
      (SELECT COUNT(*) FROM activation_codes ac WHERE ac.provider_id = sa.provider_id AND ac.plan_id = sa.plan_id AND ac.status = 'available') as current_stock
    FROM stock_alerts sa
    JOIN providers_catalog pc ON sa.provider_id = pc.id
    JOIN provider_plans pp ON sa.plan_id = pp.id
  `).all();
  res.json(alerts);
});

router.post('/alerts', authMiddleware, (req, res) => {
  const { provider_id, plan_id, alert_threshold, email_alert } = req.body;
  if (!provider_id || !plan_id) return res.status(400).json({ error: 'provider_id and plan_id required' });
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO stock_alerts (provider_id, plan_id, alert_threshold, email_alert) VALUES (?, ?, ?, ?)'
  ).run(provider_id, plan_id, alert_threshold || 10, email_alert ?? 1);
  res.json({ id: result.lastInsertRowid });
});

router.put('/alerts/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { alert_threshold, email_alert } = req.body;
  db.prepare(
    'UPDATE stock_alerts SET alert_threshold = COALESCE(?, alert_threshold), email_alert = COALESCE(?, email_alert) WHERE id = ?'
  ).run(alert_threshold, email_alert ?? null, req.params.id);
  res.json({ success: true });
});

router.post('/assistant/query', authMiddleware, async (req, res) => {
  const db = getDb();
  const { tab, question } = req.body;
  if (!tab || !question) return res.status(400).json({ error: 'tab and question required' });
  try {
    const { handleQuery, applySuggestion } = require('../services/adminAssistant');
    const result = await handleQuery(tab, question, db);
    res.json(result);
  } catch (e) {
    res.json({ answer: `Error: ${e.message}` });
  }
});

router.post('/assistant/apply', authMiddleware, async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' });
  try {
    const { applySuggestion } = require('../services/adminAssistant');
    await applySuggestion(key, value);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/logout', authMiddleware, (req, res) => {
  res.json({ success: true });
});

router.get('/pages', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);
  const pages = db.prepare('SELECT * FROM landing_pages WHERE website_id = ? ORDER BY created_at DESC').all(wid);
  res.json(pages);
});

router.post('/pages', authMiddleware, (req, res) => {
  const { title, slug, keyword, audience, html_content, provider_id, plan_id } = req.body;
  if (!title || !slug) return res.status(400).json({ error: 'title and slug required' });
  const wid = websiteId(req);
  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO landing_pages (title, slug, keyword, audience, html_content, provider_id, plan_id, website_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(title, slug, keyword, audience, html_content, provider_id, plan_id, wid);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/pages/build', authMiddleware, async (req, res) => {
  const { keyword, audience, provider_id, plan_id } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });
  try {
    const { buildPage } = require('../services/pageBuilder');
    const lang = req.website?.language || 'en';
    const result = await buildPage({ keyword, audience, providerId: provider_id, planId: plan_id, language: lang });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/pages/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const { title, keyword, audience, html_content, provider_id, plan_id, active } = req.body;
  db.prepare(
    'UPDATE landing_pages SET title = COALESCE(?, title), keyword = COALESCE(?, keyword), audience = COALESCE(?, audience), html_content = COALESCE(?, html_content), provider_id = COALESCE(?, provider_id), plan_id = COALESCE(?, plan_id), active = COALESCE(?, active), updated_at = datetime(\'now\') WHERE id = ?'
  ).run(title, keyword, audience, html_content, provider_id, plan_id, active ?? null, req.params.id);
  res.json({ success: true });
});

router.post('/pages/:id/track-conversion', authMiddleware, (req, res) => {
  const db = getDb();
  const page = db.prepare('SELECT id, slug FROM landing_pages WHERE id = ?').get(req.params.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  const today = new Date().toISOString().slice(0, 10);
  db.prepare('UPDATE landing_pages SET conversions = conversions + 1 WHERE id = ?').run(page.id);
  db.prepare(`INSERT INTO page_analytics (page_id, date, visits, conversions)
    VALUES (?, ?, 0, 1) ON CONFLICT(page_id, date) DO UPDATE SET conversions = conversions + 1`).run(page.id, today);
  res.json({ success: true });
});

router.delete('/pages/:id', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM landing_pages WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM page_analytics WHERE page_id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/pages/analytics', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);

  const totals = db.prepare(`
    SELECT COALESCE(SUM(visits), 0) as total_visits, COALESCE(SUM(conversions), 0) as total_conversions
    FROM landing_pages WHERE website_id = ?
  `).get(wid);

  const perPage = db.prepare(`
    SELECT id, title, slug, keyword, visits, conversions,
      CASE WHEN visits > 0 THEN ROUND(CAST(conversions AS REAL) / visits * 100, 1) ELSE 0 END as conversion_rate,
      created_at
    FROM landing_pages WHERE website_id = ?
    ORDER BY visits DESC
  `).all(wid);

  const daily = db.prepare(`
    SELECT pa.date, COALESCE(SUM(pa.visits), 0) as visits, COALESCE(SUM(pa.conversions), 0) as conversions
    FROM page_analytics pa
    JOIN landing_pages lp ON pa.page_id = lp.id
    WHERE lp.website_id = ? AND pa.date >= date('now', '-30 days')
    GROUP BY pa.date ORDER BY pa.date
  `).all(wid);

  const topPages = db.prepare(`
    SELECT lp.title, lp.slug, COALESCE(SUM(pa.visits), 0) as visits, COALESCE(SUM(pa.conversions), 0) as conversions
    FROM page_analytics pa
    JOIN landing_pages lp ON pa.page_id = lp.id
    WHERE lp.website_id = ? AND pa.date >= date('now', '-7 days')
    GROUP BY pa.page_id ORDER BY visits DESC LIMIT 10
  `).all(wid);

  res.json({ ...totals, perPage, daily, topPages });
});

router.get('/seo/log', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);
  const logs = db.prepare('SELECT * FROM seo_log WHERE website_id = ? ORDER BY created_at DESC LIMIT 200').all(wid);
  res.json(logs);
});

router.get('/seo/suggestions', authMiddleware, (req, res) => {
  const db = getDb();
  const wid = websiteId(req);
  const suggestions = db.prepare("SELECT * FROM seo_log WHERE website_id = ? AND run_type = 'suggestion' ORDER BY created_at DESC LIMIT 50").all(wid);
  res.json(suggestions);
});

router.post('/seo/run', authMiddleware, async (req, res) => {
  try {
    const { runSEOAudit } = require('../services/seoAgent');
    await runSEOAudit();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/seo/build-suggestion/:id', authMiddleware, async (req, res) => {
  const db = getDb();
  const suggestion = db.prepare('SELECT * FROM seo_log WHERE id = ?').get(req.params.id);
  if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });

  let details = {};
  try { details = JSON.parse(suggestion.details || '{}'); } catch {}
  const audience = details.audience || 'general';

  try {
    const { buildPage } = require('../services/pageBuilder');
    const lang = req.website?.language || 'en';
    const result = await buildPage({ keyword: suggestion.keyword, audience, language: lang });
    if (result.id) {
      db.prepare("UPDATE seo_log SET status = 'completed', result = ? WHERE id = ?").run(JSON.stringify({ page_id: result.id, slug: result.slug }), req.params.id);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===== Rank Tracking ===== */
router.get('/seo/ranks', authMiddleware, (req, res) => {
  const db = getDb();
  const ranks = db.prepare(`
    SELECT rt.*, lp.title AS page_title, lp.slug AS page_slug
    FROM rank_tracking rt
    LEFT JOIN landing_pages lp ON lp.id = rt.page_id
    ORDER BY rt.created_at DESC
  `).all();
  res.json(ranks);
});

router.post('/seo/ranks', authMiddleware, (req, res) => {
  const { page_id, keyword, target_url, search_engine, locale } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword required' });
  const db = getDb();
  const existing = db.prepare('SELECT id FROM rank_tracking WHERE keyword = ? AND page_id IS ?').get(keyword, page_id || null);
  if (existing) return res.status(400).json({ error: 'Keyword already tracked for this page' });
  const r = db.prepare(
    'INSERT INTO rank_tracking (page_id, keyword, target_url, search_engine, locale) VALUES (?, ?, ?, ?, ?)'
  ).run(page_id || null, keyword, target_url || null, search_engine || 'google', locale || 'us');
  res.json({ id: r.lastInsertRowid });
});

router.put('/seo/ranks/:id', authMiddleware, (req, res) => {
  const { position, target_url, locale } = req.body;
  const db = getDb();
  const { recordCheck } = require('../services/rankTracker');
  if (position !== undefined && position !== null) {
    recordCheck(Number(req.params.id), Number(position));
  }
  if (target_url !== undefined) {
    db.prepare('UPDATE rank_tracking SET target_url = ? WHERE id = ?').run(target_url, req.params.id);
  }
  if (locale !== undefined) {
    db.prepare('UPDATE rank_tracking SET locale = ? WHERE id = ?').run(locale, req.params.id);
  }
  res.json({ success: true });
});

router.delete('/seo/ranks/:id', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM rank_history WHERE tracking_id = ?').run(req.params.id);
  db.prepare('DELETE FROM rank_tracking WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/seo/ranks/check-all', authMiddleware, async (req, res) => {
  try {
    const { checkAllRanks } = require('../services/rankTracker');
    const results = await checkAllRanks();
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/seo/ranks/:id/check', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const t = db.prepare('SELECT * FROM rank_tracking WHERE id = ?').get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const { checkRanking, recordCheck } = require('../services/rankTracker');
    const lp = t.page_id ? db.prepare('SELECT slug FROM landing_pages WHERE id = ?').get(t.page_id) : null;
    const result = await checkRanking(t.keyword, t.target_url || lp?.slug, t.locale);
    recordCheck(t.id, result.position);
    res.json({ position: result.position, error: result.error });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/seo/ranks/:id/history', authMiddleware, (req, res) => {
  const db = getDb();
  const history = db.prepare(
    'SELECT * FROM rank_history WHERE tracking_id = ? ORDER BY checked_at DESC LIMIT 50'
  ).all(req.params.id);
  res.json(history);
});

router.post('/seo/auto-build', authMiddleware, async (req, res) => {
  try {
    const { autoBuildFromLeads } = require('../services/seoAgent');
    const result = await autoBuildFromLeads();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/websites', authMiddleware, (req, res) => {
  const db = getDb();
  const websites = db.prepare(`
    SELECT w.*, (SELECT COUNT(*) FROM landing_pages lp WHERE lp.website_id = w.id) as page_count
    FROM websites w ORDER BY w.id
  `).all();
  res.json(websites);
});

router.post('/websites', authMiddleware, (req, res) => {
  const { name, slug, domains, site_name, logo_url, language, deploy_region } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });
  const db = getDb();
  const existing = db.prepare('SELECT id FROM websites WHERE slug = ?').get(slug);
  if (existing) return res.status(400).json({ error: 'slug already exists' });
  const domainsJson = JSON.stringify(domains || []);
  const deployStatus = deploy_region ? 'pending' : null;
  const result = db.prepare('INSERT INTO websites (name, slug, domains, site_name, logo_url, language, deploy_region, deploy_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    name, slug, domainsJson, site_name || name, logo_url || '', language || 'en', deploy_region || '', deployStatus
  );
  res.json({ id: result.lastInsertRowid, slug, deploy_status: deployStatus });
});

router.put('/websites/:id', authMiddleware, (req, res) => {
  let { name, domains, site_name, logo_url, active, language, deploy_region, deploy_status, tagline } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT id, deploy_region FROM websites WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Website not found' });
  const domainsJson = domains ? JSON.stringify(domains) : undefined;
  if (deploy_region && !existing.deploy_region && !deploy_status) {
    deploy_status = 'pending';
  }
  if (deploy_status === 'deployed') {
    db.prepare("UPDATE websites SET deployed_at = datetime('now') WHERE id = ? AND (deploy_status != 'deployed' OR deployed_at IS NULL)").run(req.params.id);
  }
  db.prepare(`
    UPDATE websites SET
      name = COALESCE(?, name),
      domains = COALESCE(?, domains),
      site_name = COALESCE(?, site_name),
      logo_url = COALESCE(?, logo_url),
      active = COALESCE(?, active),
      language = COALESCE(?, language),
      deploy_region = COALESCE(?, deploy_region),
      deploy_status = COALESCE(?, deploy_status),
      tagline = COALESCE(?, tagline)
    WHERE id = ?
  `).run(
    name || null, domainsJson || null, site_name || null, logo_url || null,
    active !== undefined ? (active ? 1 : 0) : null, language || null, deploy_region || null,
    deploy_status || null, tagline || null, req.params.id
  );
  const updated = db.prepare('SELECT * FROM websites WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/websites/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (id === 1) return res.status(400).json({ error: 'Cannot delete default website' });
  const existing = db.prepare('SELECT id FROM websites WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Website not found' });
  db.prepare('DELETE FROM websites WHERE id = ?').run(id);
  res.json({ success: true });
});

router.post('/websites/ai-assist', authMiddleware, async (req, res) => {
  const { name, language } = req.body;
  if (!name) return res.status(400).json({ error: 'Website name required' });
  try {
    const { generateText } = require('../services/aiProvider');
    const result = await generateText({
      system: 'You are a creative branding expert. Generate professional website content suggestions. Return ONLY valid JSON, no markdown.',
      messages: [{
        role: 'user',
        content: `Generate branding content for a website called "${name}"${language ? ` in ${language}` : ''}.
Return this exact JSON structure:
{
  "site_name": "A professional display name derived from the input name (e.g., if name is 'My Store', return 'MyStore Premium')",
  "tagline": "A compelling one-line tagline (max 12 words)",
  "logo_suggestion": "A text-based logo concept description (what the logo could look like, e.g. 'A sleek streaming icon with brand colors')"
}`
      }],
      maxTokens: 1000,
      task: 'page',
    });
    let parsed;
    try {
      parsed = JSON.parse(result.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(500).json({ error: 'AI returned invalid JSON' });
    }
    res.json(parsed);
  } catch (e) {
    if (e.message === 'AI_NOT_CONFIGURED') {
      return res.json({
        site_name: name.charAt(0).toUpperCase() + name.slice(1),
        tagline: 'Premium streaming service for everyone',
        logo_suggestion: 'A gradient play-button icon with the brand name in bold sans-serif',
      });
    }
    res.status(500).json({ error: e.message });
  }
});

router.get('/deploy-targets', authMiddleware, (req, res) => {
  const db = getDb();
  const targets = db.prepare('SELECT * FROM deploy_targets ORDER BY region_name').all();
  res.json(targets);
});

router.post('/deploy-targets', authMiddleware, (req, res) => {
  const { region_key, region_name, host, user, path } = req.body;
  if (!region_key || !region_name || !host) return res.status(400).json({ error: 'region_key, region_name, and host required' });
  const db = getDb();
  const existing = db.prepare('SELECT id FROM deploy_targets WHERE region_key = ?').get(region_key);
  if (existing) return res.status(400).json({ error: 'region_key already exists' });
  const result = db.prepare('INSERT INTO deploy_targets (region_key, region_name, host, user, path) VALUES (?, ?, ?, ?, ?)').run(
    region_key, region_name, host, user || 'root', path || '/var/www/iptv-boss'
  );
  res.json({ id: result.lastInsertRowid });
});

router.put('/deploy-targets/:id', authMiddleware, (req, res) => {
  const { region_key, region_name, host, user, path } = req.body;
  const db = getDb();
  const existing = db.prepare('SELECT id FROM deploy_targets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Deploy target not found' });
  db.prepare(`
    UPDATE deploy_targets SET
      region_key = COALESCE(?, region_key),
      region_name = COALESCE(?, region_name),
      host = COALESCE(?, host),
      user = COALESCE(?, user),
      path = COALESCE(?, path)
    WHERE id = ?
  `).run(region_key || null, region_name || null, host || null, user || null, path || null, req.params.id);
  const updated = db.prepare('SELECT * FROM deploy_targets WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/deploy-targets/:id', authMiddleware, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM deploy_targets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Deploy target not found' });
  db.prepare('DELETE FROM deploy_targets WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/brain/status', authMiddleware, (req, res) => {
  const { getStatus } = require('../services/businessBrain');
  res.json(getStatus());
});

router.post('/brain/cycle', authMiddleware, async (req, res) => {
  const { brainCycle } = require('../services/businessBrain');
  try {
    await brainCycle();
    const { getStatus } = require('../services/businessBrain');
    res.json({ success: true, ...getStatus() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Notifications
router.get('/notifications', authMiddleware, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const type = req.query.type || null;
  let rows;
  if (type) {
    rows = db.prepare('SELECT * FROM admin_notifications WHERE type = ? ORDER BY created_at DESC LIMIT ?').all(type, limit);
  } else {
    rows = db.prepare('SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT ?').all(limit);
  }
  const unreadCount = db.prepare('SELECT COUNT(*) as c FROM admin_notifications WHERE read = 0').get().c;
  res.json({ notifications: rows, unreadCount });
});

router.post('/notifications/read', authMiddleware, (req, res) => {
  const db = getDb();
  const { id } = req.body;
  if (id) {
    db.prepare('UPDATE admin_notifications SET read = 1 WHERE id = ?').run(id);
  } else {
    db.prepare('UPDATE admin_notifications SET read = 1').run();
  }
  res.json({ success: true });
});

// Email templates
router.get('/email-templates', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM email_templates ORDER BY name').all();
  const plans = db.prepare(`
    SELECT pp.id, pc.name as provider_name, pp.plan_name FROM provider_plans pp
    JOIN providers_catalog pc ON pc.id = pp.provider_id WHERE pp.active = 1 ORDER BY pc.name, pp.plan_name
  `).all();
  res.json({ templates: rows, plans });
});

router.get('/email-templates/:key', authMiddleware, (req, res) => {
  const db = getDb();
  const t = db.prepare('SELECT * FROM email_templates WHERE template_key = ?').get(req.params.key);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  res.json(t);
});

router.put('/email-templates/:key', authMiddleware, (req, res) => {
  const db = getDb();
  const { subject, body_html } = req.body;
  const existing = db.prepare('SELECT * FROM email_templates WHERE template_key = ?').get(req.params.key);
  if (!existing) {
    // Create new (for per-plan templates)
    db.prepare(
      'INSERT INTO email_templates (template_key, name, subject, body_html, variables) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.key, req.body.name || req.params.key, subject || '', body_html || '', JSON.stringify(req.body.variables || []));
  } else {
    db.prepare('UPDATE email_templates SET subject = ?, body_html = ?, updated_at = datetime(\'now\') WHERE template_key = ?')
      .run(subject ?? existing.subject, body_html ?? existing.body_html, req.params.key);
  }
  const updated = db.prepare('SELECT * FROM email_templates WHERE template_key = ?').get(req.params.key);
  res.json(updated);
});

router.post('/email-templates/:key/reset', authMiddleware, (req, res) => {
  // Reset to default — delete custom template (the seed will remain)
  const db = getDb();
  const isPlanTemplate = req.params.key.includes('plan_');
  if (isPlanTemplate) {
    db.prepare('DELETE FROM email_templates WHERE template_key = ?').run(req.params.key);
    return res.json({ success: true, message: 'Plan template reset, will use default' });
  }
  // For defaults, re-insert the hardcoded fallback by clearing the DB row
  db.prepare('UPDATE email_templates SET subject = \'\', body_html = \'\' WHERE template_key = ?').run(req.params.key);
  res.json({ success: true, message: 'Template reset to system default' });
});

module.exports = router;
