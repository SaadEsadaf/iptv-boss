const { getDb } = require('../db');
const axios = require('axios');

/**
 * PANEL MANAGER SERVICE
 * Connects to Atlas panel and other IPTV panels to:
 * - Fetch activation codes
 * - Fetch trial codes
 * - Check stock levels
 * - Track code usage
 */

class PanelManager {
  constructor() {
    this.panels = new Map();
    this.activePanel = null;
  }

  async init() {
    await this.loadPanels();
    console.log('[PANEL-MGR] Panel manager initialized. Active panels:', this.panels.size);
  }

  async loadPanels() {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM providers_catalog WHERE active = 1').all();
    this.panels.clear();
    for (const row of rows) {
      this.panels.set(row.id, row);
    }
    // Default to Atlas if exists
    for (const [id, panel] of this.panels) {
      if (panel.name.toLowerCase().includes('atlas')) {
        this.activePanel = panel;
        break;
      }
    }
    if (!this.activePanel && this.panels.size > 0) {
      this.activePanel = this.panels.values().next().value;
    }
  }

  // Add or update a panel
  async savePanel(data) {
    const db = getDb();
    const { id, name, panel_url, panel_username, panel_password, website, notes, active } = data;
    
    if (id) {
      db.prepare(`
        UPDATE providers_catalog 
        SET name = ?, panel_url = ?, panel_username = ?, panel_password = ?, 
            website = ?, notes = ?, active = ?
        WHERE id = ?
      `).run(name, panel_url, panel_username, panel_password, website, notes, active ? 1 : 0, id);
      return { id, ...data };
    } else {
      const result = db.prepare(`
        INSERT INTO providers_catalog (name, panel_url, panel_username, panel_password, website, notes, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(name, panel_url, panel_username, panel_password, website, notes, active ? 1 : 0);
      return { id: result.lastInsertRowid, ...data };
    }
  }

  // Get all panels with stats
  getPanelsWithStats() {
    const db = getDb();
    const panels = db.prepare('SELECT * FROM providers_catalog ORDER BY id').all();
    
    return panels.map(p => {
      const stats = this.getPanelStats(p.id);
      const plans = db.prepare(`
        SELECT pp.*,
          (SELECT COUNT(*) FROM activation_codes ac WHERE ac.plan_id = pp.id AND ac.status = 'available') as codes_available
        FROM provider_plans pp WHERE pp.provider_id = ? AND pp.active = 1 ORDER BY pp.duration_days
      `).all(p.id);
      return {
        ...p,
        panel_password: p.panel_password ? '********' : '',
        ...stats,
        plans,
      };
    });
  }

  getPanelStats(providerId) {
    const db = getDb();
    
    // Activation codes
    const activationTotal = db.prepare(
      'SELECT COUNT(*) as count FROM activation_codes WHERE provider_id = ?'
    ).get(providerId).count;
    const activationSold = db.prepare(
      "SELECT COUNT(*) as count FROM activation_codes WHERE provider_id = ? AND status = 'sold'"
    ).get(providerId).count;
    const activationAvailable = db.prepare(
      "SELECT COUNT(*) as count FROM activation_codes WHERE provider_id = ? AND status = 'available'"
    ).get(providerId).count;
    
    // Trial codes
    const trialTotal = db.prepare(
      'SELECT COUNT(*) as count FROM trial_codes WHERE provider_id = ?'
    ).get(providerId).count;
    const trialSent = db.prepare(
      "SELECT COUNT(*) as count FROM trial_codes WHERE provider_id = ? AND status = 'used'"
    ).get(providerId).count;
    const trialAvailable = db.prepare(
      "SELECT COUNT(*) as count FROM trial_codes WHERE provider_id = ? AND status = 'available'"
    ).get(providerId).count;
    
    // Today's usage
    const today = new Date().toISOString().split('T')[0];
    const activationToday = db.prepare(
      `SELECT COUNT(*) as count FROM activation_codes WHERE provider_id = ? AND status = 'sold' AND assigned_at LIKE ?`
    ).get(providerId, `${today}%`).count;
    const trialToday = db.prepare(
      `SELECT COUNT(*) as count FROM trial_codes WHERE provider_id = ? AND status = 'used' AND assigned_at LIKE ?`
    ).get(providerId, `${today}%`).count;
    
    // Orders
    const ordersToday = db.prepare(
      `SELECT COUNT(*) as count FROM orders WHERE provider_id = ? AND created_at LIKE ?`
    ).get(providerId, `${today}%`).count;
    const revenueToday = db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE provider_id = ? AND created_at LIKE ? AND status = 'paid'`
    ).get(providerId, `${today}%`).total;
    
    return {
      activationCodes: {
        total: activationTotal,
        sold: activationSold,
        available: activationAvailable,
        today: activationToday,
      },
      trialCodes: {
        total: trialTotal,
        sent: trialSent,
        available: trialAvailable,
        today: trialToday,
      },
      orders: {
        today: ordersToday,
        revenueToday: revenueToday,
      },
    };
  }

  // Atlas Panel API - Connect and fetch codes
  async syncAtlasPanel(providerId) {
    const db = getDb();
    const panel = db.prepare('SELECT * FROM providers_catalog WHERE id = ?').get(providerId);
    if (!panel || !panel.panel_url || !panel.panel_username || !panel.panel_password) {
      return { success: false, error: 'Panel credentials missing' };
    }

    try {
      const baseUrl = panel.panel_url.replace(/\/$/, '');
      const credentials = { username: panel.panel_username, password: panel.panel_password };
      
      let sessionCookie = null;
      let authToken = null;
      
      // Step 1: Try login to get session/token
      const loginEndpoints = [
        { url: `${baseUrl}/api/login`, method: 'post', data: credentials },
        { url: `${baseUrl}/api/auth/login`, method: 'post', data: credentials },
        { url: `${baseUrl}/api.php?action=login`, method: 'post', data: credentials },
        { url: `${baseUrl}/login`, method: 'post', data: credentials },
        { url: `${baseUrl}/api/login`, method: 'post', data: { ...credentials, action: 'login' } },
      ];
      
      for (const login of loginEndpoints) {
        try {
          const res = await axios[login.method](login.url, login.data, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' },
            maxRedirects: 5,
          });
          
          if (res.data?.token) authToken = res.data.token;
          if (res.data?.session) sessionCookie = res.data.session;
          if (res.data?.success || res.data?.status === 'success') {
            console.log(`[PANEL-MGR] Atlas login success via ${login.url}`);
            break;
          }
          if (res.headers['set-cookie']?.length > 0) {
            sessionCookie = res.headers['set-cookie'];
          }
        } catch (e) {
          console.log(`[PANEL-MGR] Login attempt failed for ${login.url}: ${e.message}`);
        }
      }
      
      // Step 2: Try to fetch codes with auth
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (sessionCookie) headers['Cookie'] = Array.isArray(sessionCookie) ? sessionCookie.join('; ') : sessionCookie;
      
      const codeEndpoints = [
        '/api/get_codes',
        '/api/codes',
        '/api/line/list',
        '/api/lines',
        '/api/users',
        '/api/accounts',
        '/api.php?action=get_codes',
        '/api.php?action=list_codes',
        '/api.php?action=lines',
        '/api.php?action=users',
        '/api/v1/codes',
        '/api/v1/lines',
      ];
      
      let codes = [];
      let lines = [];
      let users = [];
      
      for (const endpoint of codeEndpoints) {
        try {
          const res = await axios.get(`${baseUrl}${endpoint}`, {
            headers,
            timeout: 10000,
            auth: credentials,
          });
          
          if (res.data) {
            console.log(`[PANEL-MGR] Endpoint ${endpoint} returned data`);
            if (res.data.codes) codes = res.data.codes;
            if (res.data.lines) lines = res.data.lines;
            if (res.data.users) users = res.data.users;
            if (res.data.data) {
              codes = res.data.data.codes || res.data.data.lines || res.data.data.users || res.data.data;
            }
            if (Array.isArray(res.data)) codes = res.data;
            if (codes.length > 0 || lines.length > 0 || users.length > 0) break;
          }
        } catch (e) {
          console.log(`[PANEL-MGR] Endpoint ${endpoint} failed: ${e.message}`);
        }
      }
      
      // Step 3: If no codes found, try to fetch dashboard data
      if (codes.length === 0 && lines.length === 0 && users.length === 0) {
        const dashboardEndpoints = [
          '/api/dashboard',
          '/api/stats',
          '/api/summary',
          '/api.php?action=dashboard',
          '/api.php?action=stats',
        ];
        
        for (const endpoint of dashboardEndpoints) {
          try {
            const res = await axios.get(`${baseUrl}${endpoint}`, {
              headers,
              timeout: 10000,
              auth: credentials,
            });
            if (res.data) {
              console.log(`[PANEL-MGR] Dashboard ${endpoint} returned:`, JSON.stringify(res.data).substring(0, 200));
            }
          } catch (e) {
            // Ignore
          }
        }
      }
      
      // Try to get codes from lines if available
      if (lines.length > 0) {
        codes = lines.map(l => ({
          code: l.code || l.username || l.mac || l.id,
          username: l.username || l.user || l.login,
          password: l.password || l.pass || l.pin,
          expires: l.expires || l.expire_date || l.expiration,
          status: l.status || l.active || 'active',
        }));
      }
      
      // Try to get codes from users if available
      if (users.length > 0 && codes.length === 0) {
        codes = users.map(u => ({
          code: u.code || u.username || u.id,
          username: u.username || u.user || u.login,
          password: u.password || u.pass || u.pin,
          expires: u.expires || u.expire_date || u.expiration,
          status: u.status || u.active || 'active',
        }));
      }
      
      return { 
        success: true, 
        codes: codes.length, 
        lines: lines.length,
        users: users.length,
        panel: panel.name,
        auth: authToken ? 'token' : sessionCookie ? 'session' : 'basic',
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Add activation codes manually
  async addActivationCodes(providerId, planId, codes) {
    const db = getDb();
    const added = [];
    
    for (const code of codes) {
      try {
        const result = db.prepare(`
          INSERT INTO activation_codes (provider_id, plan_id, code, status, added_at)
          VALUES (?, ?, ?, 'available', datetime('now'))
        `).run(providerId, planId, code.trim());
        added.push(result.lastInsertRowid);
      } catch (e) {
        // Duplicate code, skip
      }
    }
    
    return { added: added.length, codes: added };
  }

  // Add trial codes
  async addTrialCodes(providerId, codes, durationHours = 24) {
    const db = getDb();
    const added = [];
    
    for (const code of codes) {
      try {
        const result = db.prepare(`
          INSERT INTO trial_codes (provider_id, code, duration_hours, status, added_at)
          VALUES (?, ?, ?, 'available', datetime('now'))
        `).run(providerId, code.trim(), durationHours);
        added.push(result.lastInsertRowid);
      } catch (e) {
        // Duplicate, skip
      }
    }
    
    return { added: added.length, codes: added };
  }

  // Get available code for an order
  getAvailableCode(providerId, planId, isTrial = false) {
    const db = getDb();
    
    if (isTrial) {
      return db.prepare(
        "SELECT * FROM trial_codes WHERE provider_id = ? AND status = 'available' LIMIT 1"
      ).get(providerId);
    } else {
      return db.prepare(
        "SELECT * FROM activation_codes WHERE provider_id = ? AND plan_id = ? AND status = 'available' LIMIT 1"
      ).get(providerId, planId);
    }
  }

  // Assign code to order
  assignCode(codeId, orderId, isTrial = false) {
    const db = getDb();
    const table = isTrial ? 'trial_codes' : 'activation_codes';
    const codeCol = isTrial ? 'trial_code_id' : 'activation_code_id';
    
    db.prepare(`
      UPDATE ${table} SET status = 'sold', used_by_order_id = ?, assigned_at = datetime('now') WHERE id = ?
    `).run(orderId, codeId);
    
    db.prepare(`
      UPDATE orders SET ${codeCol} = ? WHERE id = ?
    `).run(codeId, orderId);
    
    return { assigned: true };
  }

  // Get code for customer (with credentials)
  getCodeCredentials(codeId, isTrial = false) {
    const db = getDb();
    const table = isTrial ? 'trial_codes' : 'activation_codes';
    return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(codeId);
  }

  // Get low stock alerts
  getStockAlerts() {
    const db = getDb();
    const panels = db.prepare('SELECT * FROM providers_catalog WHERE active = 1').all();
    const alerts = [];
    
    for (const panel of panels) {
      const stats = this.getPanelStats(panel.id);
      
      if (stats.activationCodes.available < 5) {
        alerts.push({
          provider: panel.name,
          type: 'activation',
          remaining: stats.activationCodes.available,
          threshold: 5,
          urgent: stats.activationCodes.available === 0,
        });
      }
      
      if (stats.trialCodes.available < 5) {
        alerts.push({
          provider: panel.name,
          type: 'trial',
          remaining: stats.trialCodes.available,
          threshold: 5,
          urgent: stats.trialCodes.available === 0,
        });
      }
    }
    
    return alerts;
  }
}

module.exports = new PanelManager();
