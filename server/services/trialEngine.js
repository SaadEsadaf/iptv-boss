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
    this.serverUrl = 'http://appley.site';
    this.portalUrl = 'http://appley.site/c/';
    this.apiUrl = 'http://appley.site/player_api.php';
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
    return `${this.serverUrl}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u&output=ts`;
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
    const expiresAt = new Date(Date.now() + (code.duration_hours || 24) * 60 * 60 * 1000).toISOString();
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
    
    // Send welcome email
    await this.sendTrialWelcome(email, name, code, m3uUrl);
    
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

  // Send trial welcome email
  async sendTrialWelcome(email, name, code, m3uUrl) {
    const durationH = code.duration_hours || 24;
    const subject = `${name || 'Bienvenue'} — Votre essai LuxStream est ACTIF (${durationH}h)`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:30px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="font-size:48px;margin-bottom:10px;">⚽</div>
          <h1 style="color:#00d4ff;margin:0;font-size:28px;">Votre essai est ACTIF</h1>
          <p style="color:#888;margin:5px 0;">${durationH}h pour découvrir 179,915 chaînes</p>
        </div>
        
        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#00d4ff;margin:0 0 15px;">🔑 Vos identifiants de connexion</h3>
          <div style="background:#0f0f0f;padding:15px;border-radius:8px;font-family:monospace;font-size:14px;">
            <div style="color:#888;margin-bottom:5px;">👤 Utilisateur:</div>
            <div style="color:#fff;margin-bottom:12px;font-size:16px;">${code.username}</div>
            <div style="color:#888;margin-bottom:5px;">🔒 Mot de passe:</div>
            <div style="color:#fff;margin-bottom:12px;font-size:16px;">${code.password}</div>
            <div style="color:#888;margin-bottom:5px;">🔗 URL M3U:</div>
            <div style="color:#00d4ff;font-size:12px;word-break:break-all;margin-bottom:5px;">${m3uUrl}</div>
          </div>
        </div>

        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#00d4ff;margin:0 0 15px;">📺 Accès par application</h3>
          <p style="color:#888;font-size:13px;margin:0 0 12px;">Utilisez ces identifiants dans votre application IPTV préférée :</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            ${this.apps.filter(a => a.name !== 'MAG Box').map(app => `
              <a href="${app.url}" style="background:#0f0f0f;padding:10px;border-radius:8px;text-decoration:none;color:#fff;display:block;text-align:center;font-size:12px;font-weight:600;">
                ${app.name}
              </a>
            `).join('')}
          </div>
        </div>

        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#00d4ff;margin:0 0 15px;">🖥️ Accès via Portail Client</h3>
          <p style="color:#888;font-size:13px;margin:0 0 8px;">Connectez-vous directement depuis votre navigateur :</p>
          <div style="background:#0f0f0f;padding:12px;border-radius:8px;">
            <a href="${this.portalUrl}" style="color:#00d4ff;font-size:14px;">${this.portalUrl}</a>
            <div style="color:#666;font-size:12px;margin-top:4px;">Utilisez les identifiants ci-dessus</div>
          </div>
        </div>
        
        <div style="background:linear-gradient(135deg,#00d4ff15,#ff6b3515);border:1px solid #00d4ff;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
          <h3 style="color:#00d4ff;margin:0 0 10px;">🏆 Coupe du Monde 2026</h3>
          <p style="color:#fff;margin:0 0 15px;">Tous les 64 matchs en 4K HDR — inclus dans votre essai !</p>
          <div style="font-size:24px;font-weight:700;color:#ffd700;">${durationH}h restantes</div>
        </div>
        
        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#00d4ff;margin:0 0 15px;">📱 Instructions par appareil</h3>
          <div style="color:#a0a0a0;font-size:13px;">
            <div style="margin-bottom:10px;">
              <strong style="color:#fff;">📱 Smart TV / Android TV :</strong> Téléchargez TiviMate ou IPTV Smarters → Entrez l'URL M3U et vos identifiants
            </div>
            <div style="margin-bottom:10px;">
              <strong style="color:#fff;">💻 PC / Mac :</strong> Ouvrez VLC → Media → Open Network Stream → Collez l'URL M3U
            </div>
            <div style="margin-bottom:10px;">
              <strong style="color:#fff;">📱 iPhone / iPad :</strong> Téléchargez GSE Smart IPTV → Ajoutez playlist M3U
            </div>
            <div>
              <strong style="color:#fff;">📦 MAG Box :</strong> Allez dans Paramètres → Portail → Entrez ${this.portalUrl} → Redémarrez
            </div>
          </div>
        </div>
        
        <div style="text-align:center;">
          <a href="https://dalletek.live/#plans" style="display:inline-block;background:#00d4ff;color:#000;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">PASSER PREMIUM →</a>
          <p style="color:#888;font-size:12px;margin-top:15px;">Essai gratuit • Sans engagement • Annulation à tout moment</p>
        </div>
        
        <div style="border-top:1px solid #2a2a2a;margin-top:30px;padding-top:20px;text-align:center;color:#666;font-size:12px;">
          <p>Besoin d'aide ? Répondez à cet email</p>
          <p>LuxStream — Dalletek</p>
        </div>
      </div>
    `;
    
    try {
      const transporter = emailService.getTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: '"LuxStream" <noreply@dalletek.live>',
          to: email,
          subject,
          html,
        });
      }
    } catch (e) {
      console.error('[TRIAL-ENGINE] Email failed:', e.message);
    }
  }

  // Send conversion email (after 12h)
  async sendConversionEmail(email, name, offer = '20%') {
    const subject = `${name || 'Dernière chance'} — Votre essai expire dans 12h`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:30px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="font-size:48px;margin-bottom:10px;">⏰</div>
          <h1 style="color:#ff4444;margin:0;font-size:28px;">Votre essai expire bientôt</h1>
          <p style="color:#888;margin:5px 0;">12 heures restantes pour profiter de 179,915 chaînes</p>
        </div>
        
        <div style="background:linear-gradient(135deg,#ff444415,#ffd70015);border:1px solid #ff4444;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
          <h3 style="color:#ff4444;margin:0 0 10px;">🔥 OFFRE EXCLUSIVE</h3>
          <div style="font-size:32px;font-weight:700;color:#ffd700;margin:10px 0;">${offer} DE RÉDUCTION</div>
          <p style="color:#fff;margin:0 0 15px;">Valable uniquement pendant votre essai</p>
          <div style="font-size:14px;color:#888;">Au lieu de <span style="text-decoration:line-through;">€14.99</span> → <span style="color:#00d4ff;font-weight:700;">€${(14.99 * (1 - parseInt(offer)/100)).toFixed(2)}</span></div>
        </div>

        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#00d4ff;margin:0 0 15px;">📊 Plans disponibles pour vous</h3>
          <div style="display:grid;gap:8px;">
            <div style="background:#0f0f0f;padding:12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
              <div><strong style="color:#fff;">Premium 3 Mois</strong><div style="color:#888;font-size:12px;">179,915 chaînes • 4 écrans</div></div>
              <div style="text-align:right;"><span style="color:#00d4ff;font-weight:700;">€29.99</span><div style="color:#888;font-size:11px;">€9.99/mois</div></div>
            </div>
            <div style="background:#0f0f0f;padding:12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
              <div><strong style="color:#fff;">Semestre 6 Mois</strong><div style="color:#888;font-size:12px;">179,915 chaînes • 4 écrans</div></div>
              <div style="text-align:right;"><span style="color:#00d4ff;font-weight:700;">€49.99</span><div style="color:#888;font-size:11px;">€8.33/mois</div></div>
            </div>
            <div style="background:#0f0f0f;padding:12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
              <div><strong style="color:#fff;">Annuel 12 Mois</strong><div style="color:#888;font-size:12px;">179,915 chaînes • 4 écrans</div></div>
              <div style="text-align:right;"><span style="color:#ffd700;font-weight:700;">€69.99</span><div style="color:#888;font-size:11px;">€5.83/mois</div></div>
            </div>
          </div>
        </div>
        
        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#00d4ff;margin:0 0 15px;">⚽ Ce que vous perdez si vous ne passez pas Premium :</h3>
          <div style="display:grid;gap:8px;">
            <div style="display:flex;align-items:center;gap:10px;">❌ Coupe du Monde 2026 en 4K</div>
            <div style="display:flex;align-items:center;gap:10px;">❌ 179,915 chaînes (dont 34,000+ françaises)</div>
            <div style="display:flex;align-items:center;gap:10px;">❌ 10,000+ films VOD</div>
            <div style="display:flex;align-items:center;gap:10px;">❌ 144,000+ épisodes de séries</div>
            <div style="display:flex;align-items:center;gap:10px;">❌ BeIN Sports, Canal+, RMC Sport...</div>
            <div style="display:flex;align-items:center;gap:10px;">❌ 4 écrans simultanés</div>
            <div style="display:flex;align-items:center;gap:10px;">❌ Support 24/7</div>
          </div>
        </div>
        
        <div style="text-align:center;margin:30px 0;">
          <a href="https://dalletek.live/#plans" style="display:inline-block;background:#00d4ff;color:#000;padding:18px 50px;border-radius:8px;text-decoration:none;font-weight:700;font-size:18px;margin-bottom:10px;">PASSER PREMIUM MAINTENANT</a>
          <div style="margin-top:10px;">
            <a href="https://dalletek.live" style="color:#888;font-size:12px;text-decoration:underline;">Prolonger mon essai de 24h</a>
          </div>
        </div>
        
        <div style="border-top:1px solid #2a2a2a;margin-top:30px;padding-top:20px;text-align:center;color:#666;font-size:12px;">
          <p>Offre valable 24h • Sans engagement • 30 jours satisfait ou remboursé</p>
          <p>Besoin d'aide ? Répondez à cet email</p>
        </div>
      </div>
    `;
    
    try {
      const transporter = emailService.getTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: '"LuxStream" <noreply@dalletek.live>',
          to: email,
          subject,
          html,
        });
      }
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
