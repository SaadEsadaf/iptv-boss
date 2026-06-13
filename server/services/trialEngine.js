const { getDb } = require('../db');
const emailService = require('./emailService');
const panelManager = require('./panelManager');

/**
 * TRIAL CONVERSION ENGINE
 * 
 * Handles the complete trial-to-paid flow:
 * 1. Capture lead (email + name)
 * 2. Assign trial code (24h)
 * 3. Send welcome email (credentials + setup)
 * 4. Track trial behavior (engagement score)
 * 5. Send conversion emails (test/buy buttons)
 * 6. Convert to paid (assign activation code)
 * 7. Track everything in dashboard
 */

class TrialEngine {
  constructor() {
    this.providerId = 4; // Atlas
    this._loadProviderUrl();
  }

  _loadProviderUrl() {
    const { getDb } = require('../db');
    const db = getDb();
    const provider = db.prepare('SELECT panel_url FROM providers_catalog WHERE id = ?').get(this.providerId);
    const base = provider?.panel_url ? provider.panel_url.replace(/\/+$/, '') : 'http://apcup26.space';
    this.serverUrl = base;
    this.portalUrl = base + '/c/';
    this.apiUrl = base + '/player_api.php';
    this.apps = [
      { name: 'IPTV Smarters Pro', url: 'https://www.iptvsmarters.com/', icon: 'smarters' },
      { name: 'TiviMate', url: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv', icon: 'tivimate' },
      { name: 'VLC', url: 'https://www.videolan.org/', icon: 'vlc' },
      { name: 'Perfect Player', url: 'https://www.perfect-player.com/', icon: 'perfect' },
      { name: 'GSE Smart IPTV', url: 'https://gseiptv.com/', icon: 'gse' },
      { name: 'XCIPTV', url: 'https://xciptv.app/', icon: 'xciptv' },
      { name: 'MAG Box', url: '#mag-setup', icon: 'mag' },
    ];
  }

  buildM3uUrl(username, password) {
    return `${this.serverUrl}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`;
  }

  buildApiUrl(username, password) {
    return `${this.apiUrl}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  }

  // Capture a trial lead
  async createTrial(data) {
    const db = getDb();
    const { name, email, phone, source, country } = data;
    
    // Check if email already has trial
    const existing = db.prepare("SELECT * FROM trial_codes WHERE email = ? AND status = 'used'").get(email);
    if (existing) {
      return { success: false, error: 'You already have an active trial' };
    }
    
    // Get available trial code
    const code = panelManager.getAvailableCode(this.providerId, null, true);
    if (!code) {
      return { success: false, error: 'No trial codes available' };
    }
    
    // Assign code to this user
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare("UPDATE trial_codes SET email = ?, status = 'used', assigned_at = datetime('now'), expires_at = ? WHERE id = ?")
      .run(email, expiresAt, code.id);
    
    // Store lead
    db.prepare(`
      INSERT INTO growth_leads (source, platform, username, email, language, intent_score, sentiment, action, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `).run('website', 'trial', name || email.split('@')[0], email, 'fr', 8, 'trial_seeker', 'request_trial');
    
    // Build credentials with actual username/password from the trial code
    const m3uUrl = this.buildM3uUrl(code.username, code.password);
    const apiUrl = this.buildApiUrl(code.username, code.password);

    // Generate account password for dashboard
    let accountPassword = null;
    try {
      const bcrypt = require('bcrypt');
      accountPassword = Math.random().toString(36).slice(-8) + String(Math.floor(Math.random() * 100));
      const passwordHash = await bcrypt.hash(accountPassword, 10);
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (user) {
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
      } else {
        db.prepare(
          'INSERT INTO users (name, email, provider, website_id, password_hash) VALUES (?, ?, ?, ?, ?)'
        ).run(name || email.split('@')[0], email, 'email', 1, passwordHash);
      }
    } catch (e) {
      console.error('[TrialEngine] Account password error:', e);
    }
    
    // Send welcome email
    await this.sendTrialWelcome(email, name, code, m3uUrl, data.preferredApp, accountPassword);
    
    return { 
      success: true, 
      code: code.code,
      username: code.username,
      password: code.password,
      expires: expiresAt,
      m3uUrl,
      portalUrl: this.portalUrl,
      apiUrl,
    };
  }

  // Send trial welcome email using DB templates
  async sendTrialWelcome(email, name, code, m3uUrl, preferredApp, accountPassword) {
    try {
      await emailService.sendTrial({
        email,
        name: name || 'Client',
        credentials: {
          username: code.username,
          password: code.password,
          server_url: this.serverUrl,
        },
        durationHours: 24,
        providerName: 'Atlas',
        planName: 'Essai Gratuit',
        preferredApp: preferredApp || '',
        accountPassword,
      });
    } catch (e) {
      console.error('[TRIAL-ENGINE] Email failed:', e.message);
    }
  }

  // Send conversion email (after 12h)
  async sendConversionEmail(email, name, offer = '20%') {
    try {
      const transporter = emailService.getTransporter();
      if (!transporter) return;
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#ff4444,#cc0000);padding:40px 30px;text-align:center;">
            <div style="font-size:56px;margin-bottom:10px;">⏰</div>
            <h1 style="color:#fff;margin:0 0 8px;font-size:28px;font-weight:800;">Votre essai expire bientot</h1>
            <p style="color:rgba(255,255,255,0.9);margin:0;font-size:16px;">12 heures restantes pour profiter de 179,915 chaines</p>
          </div>
          
          <div style="padding:30px;">
            <p style="color:#a0a0a0;font-size:15px;margin:0 0 25px;"><strong style="color:#fff;">${name || 'Bonjour'}</strong>, ne laissez pas votre essai expirer sans profiter de nos offres exclusives.</p>
            
            <div style="background:linear-gradient(135deg,#1a0f0f,#2a1a0a);border:2px solid #ffd700;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
              <span style="background:#ff4444;color:#fff;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;">Offre limitee</span>
              <div style="font-size:42px;font-weight:800;color:#ffd700;margin:12px 0;">${offer}</div>
              <div style="color:#fff;font-size:14px;margin-bottom:4px;">DE REDUCTION</div>
              <div style="color:#888;font-size:13px;">Sur tous les plans Premium • Valable uniquement pendant votre essai</div>
            </div>
            
            <div style="background:#121212;border:1px solid #1e1e1e;border-radius:12px;padding:20px;margin-bottom:24px;">
              <h3 style="color:#00d4ff;margin:0 0 15px;font-size:16px;">📊 Nos offres</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr style="background:#0a0a0a;">
                  <td style="padding:12px;border-bottom:1px solid #1a1a1a;"><span style="color:#fff;font-weight:600;">Premium 1 Mois</span><div style="color:#888;font-size:11px;">179,915 chaines</div></td>
                  <td style="padding:12px;text-align:right;border-bottom:1px solid #1a1a1a;"><span style="color:#00d4ff;font-weight:700;">€14.99</span><div style="color:#888;font-size:11px;">€14.99/mois</div></td>
                </tr>
                <tr style="background:#0a0a0a;">
                  <td style="padding:12px;border-bottom:1px solid #1a1a1a;"><span style="color:#fff;font-weight:600;">Premium 3 Mois</span><div style="color:#888;font-size:11px;">179,915 chaines • 4 ecrans</div></td>
                  <td style="padding:12px;text-align:right;border-bottom:1px solid #1a1a1a;"><span style="color:#00d4ff;font-weight:700;">€29.99</span><div style="color:#888;font-size:11px;">€9.99/mois</div></td>
                </tr>
                <tr style="background:#0a0a0a;">
                  <td style="padding:12px;border-bottom:1px solid #1a1a1a;"><span style="color:#fff;font-weight:600;">Semestre 6 Mois</span><div style="color:#888;font-size:11px;">179,915 chaines • 4 ecrans</div></td>
                  <td style="padding:12px;text-align:right;border-bottom:1px solid #1a1a1a;"><span style="color:#00d4ff;font-weight:700;">€49.99</span><div style="color:#888;font-size:11px;">€8.33/mois</div></td>
                </tr>
                <tr style="background:#0a0a0a;">
                  <td style="padding:12px;"><span style="color:#fff;font-weight:600;">Annuel 12 Mois</span><div style="color:#888;font-size:11px;">179,915 chaines • 4 ecrans</div></td>
                  <td style="padding:12px;text-align:right;"><span style="color:#ffd700;font-weight:700;">€69.99</span><div style="color:#888;font-size:11px;">€5.83/mois</div></td>
                </tr>
              </table>
            </div>
            
            <div style="background:#121212;border:1px solid #1e1e1e;border-radius:12px;padding:20px;margin-bottom:24px;">
              <h3 style="color:#ff4444;margin:0 0 12px;font-size:15px;"> Ce que vous perdez sans abonnement :</h3>
              <table width="100%" cellpadding="0" cellspacing="4">
                <tr><td style="color:#a0a0a0;font-size:13px;padding:4px 8px;">❌ Coupe du Monde 2026 en 4K</td></tr>
                <tr><td style="color:#a0a0a0;font-size:13px;padding:4px 8px;">❌ 179,915 chaines (dont 34,000+ francaises)</td></tr>
                <tr><td style="color:#a0a0a0;font-size:13px;padding:4px 8px;">❌ 10,000+ films VOD + 144,000+ episodes series</td></tr>
                <tr><td style="color:#a0a0a0;font-size:13px;padding:4px 8px;">❌ BeIN Sports, Canal+, RMC Sport, DAZN</td></tr>
                <tr><td style="color:#a0a0a0;font-size:13px;padding:4px 8px;">❌ 4 ecrans simultanes + Support 24/7</td></tr>
              </table>
            </div>
            
            <div style="text-align:center;margin:30px 0;">
              <a href="https://dalletek.live/#plans" style="display:inline-block;background:linear-gradient(135deg,#ff4444,#cc0000);color:#fff;padding:18px 50px;border-radius:10px;text-decoration:none;font-weight:800;font-size:16px;">🚀 PASSER PREMIUM MAINTENANT</a>
              <p style="color:#666;font-size:12px;margin-top:14px;">💳 Paiement securise • 30 jours satisfait ou rembourse</p>
            </div>
            
            <div style="border-top:1px solid #1e1e1e;padding-top:20px;text-align:center;color:#666;font-size:12px;">
              <p>Besoin d''aide ? Contactez-nous sur WhatsApp</p>
              <p style="margin:5px 0;">L''equipe {{site_name}}</p>
            </div>
          </div>
        </div>
      `;
      await transporter.sendMail({
        from: '"Dalletek" <support@dalletek.live>',
        to: email,
        subject: `${name || 'Derniere chance'} — Votre essai expire dans 12h`,
        html,
      });
    } catch (e) {
      console.error('[TRIAL-ENGINE] Conversion email failed:', e.message);
    }
  }

  // Get trial stats
  getTrialStats() {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    
    return {
      totalTrials: db.prepare("SELECT COUNT(*) as count FROM trial_codes WHERE status = 'used'").get().count,
      activeTrials: db.prepare("SELECT COUNT(*) as count FROM trial_codes WHERE status = 'used' AND expires_at > datetime('now')").get().count,
      expiredTrials: db.prepare("SELECT COUNT(*) as count FROM trial_codes WHERE status = 'used' AND expires_at < datetime('now')").get().count,
      todayTrials: db.prepare("SELECT COUNT(*) as count FROM trial_codes WHERE status = 'used' AND assigned_at LIKE ?").get(`${today}%`).count,
      available: db.prepare("SELECT COUNT(*) as count FROM trial_codes WHERE status = 'available'").get().count,
    };
  }

  // Get conversion stats
  getConversionStats() {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    
    const totalTrials = db.prepare("SELECT COUNT(*) as count FROM trial_codes WHERE status = 'used'").get().count;
    const totalPaid = db.prepare("SELECT COUNT(*) as count FROM orders WHERE is_trial = 0 AND status = 'paid'").get().count;
    
    return {
      totalTrials,
      totalPaid,
      conversionRate: totalTrials > 0 ? ((totalPaid / totalTrials) * 100).toFixed(2) : 0,
      todayRevenue: db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid' AND created_at LIKE ?").get(`${today}%`).total,
      todayOrders: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'paid' AND created_at LIKE ?").get(`${today}%`).count,
    };
  }
}

module.exports = new TrialEngine();
