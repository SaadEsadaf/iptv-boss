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
    this.m3uUrl = 'http://appley.site/get.php?username=994023355135879&password=1593574628&type=m3u&output=ts';
    this.apps = [
      { name: 'IPTV Smarters Pro', url: 'https://www.iptvsmarters.com/', icon: 'smarters' },
      { name: 'TiviMate', url: 'https://play.google.com/store/apps/details?id=ar.tvplayer.tv', icon: 'tivimate' },
      { name: 'VLC', url: 'https://www.videolan.org/', icon: 'vlc' },
      { name: 'Perfect Player', url: 'https://www.perfect-player.com/', icon: 'perfect' },
      { name: 'GSE Smart IPTV', url: 'https://gseiptv.com/', icon: 'gse' },
      { name: 'XCIPTV', url: 'https://xciptv.app/', icon: 'xciptv' },
    ];
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
    db.prepare("UPDATE trial_codes SET email = ?, username = ?, status = 'used', assigned_at = datetime('now'), expires_at = ? WHERE id = ?")
      .run(email, name || email.split('@')[0], expiresAt, code.id);
    
    // Store lead
    db.prepare(`
      INSERT INTO growth_leads (source, platform, username, email, language, intent_score, sentiment, action, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `).run('website', 'trial', name || email.split('@')[0], email, 'fr', 8, 'trial_seeker', 'request_trial');
    
    // Send welcome email
    await this.sendTrialWelcome(email, name, code);
    
    return { 
      success: true, 
      code: code.code,
      username: code.username,
      password: code.password,
      expires: expiresAt,
      m3uUrl: this.m3uUrl,
    };
  }

  // Send trial welcome email
  async sendTrialWelcome(email, name, code) {
    const subject = `${name || 'Bonjour'} — Votre essai LuxStream est ACTIF (24h)`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:30px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="font-size:48px;margin-bottom:10px;">⚽</div>
          <h1 style="color:#00d4ff;margin:0;font-size:28px;">Votre essai est ACTIF</h1>
          <p style="color:#888;margin:5px 0;">24 heures pour découvrir 179,915 chaînes</p>
        </div>
        
        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#00d4ff;margin:0 0 15px;">📺 Vos identifiants</h3>
          <div style="background:#0f0f0f;padding:15px;border-radius:8px;font-family:monospace;font-size:14px;">
            <div style="color:#00d4ff;margin-bottom:8px;">URL M3U: <a href="${this.m3uUrl}" style="color:#00d4ff;text-decoration:none;">${this.m3uUrl}</a></div>
            <div style="color:#ffd700;">Code: ${code.code}</div>
          </div>
        </div>
        
        <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:20px;">
          <h3 style="color:#00d4ff;margin:0 0 15px;">📱 Applications recommandées</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${this.apps.map(app => `
              <a href="${app.url}" style="background:#0f0f0f;padding:12px;border-radius:8px;text-decoration:none;color:#fff;display:block;text-align:center;">
                <div style="font-size:20px;margin-bottom:5px;">📱</div>
                <div style="font-size:12px;font-weight:600;">${app.name}</div>
              </a>
            `).join('')}
          </div>
        </div>
        
        <div style="background:linear-gradient(135deg,#00d4ff15,#ff6b3515);border:1px solid #00d4ff;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
          <h3 style="color:#00d4ff;margin:0 0 10px;">🏆 Coupe du Monde 2026</h3>
          <p style="color:#fff;margin:0 0 15px;">Tous les 64 matchs en 4K HDR — inclus dans votre essai !</p>
          <div style="font-size:24px;font-weight:700;color:#ffd700;">24h restantes</div>
        </div>
        
        <div style="text-align:center;">
          <a href="https://dalletek.live/pricing" style="display:inline-block;background:#00d4ff;color:#000;padding:15px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">PASSER PREMIUM →</a>
          <p style="color:#888;font-size:12px;margin-top:15px;">Essai gratuit • Sans engagement • Annulation à tout moment</p>
        </div>
        
        <div style="border-top:1px solid #2a2a2a;margin-top:30px;padding-top:20px;text-align:center;color:#666;font-size:12px;">
          <p>Besoin d'aide ? Répondez à cet email ou WhatsApp +212612345678</p>
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
          <div style="font-size:14px;color:#888;">Au lieu de <span style="text-decoration:line-through;">€12.99</span> → <span style="color:#00d4ff;font-weight:700;">€${(12.99 * (1 - parseInt(offer)/100)).toFixed(2)}</span></div>
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
          <a href="https://dalletek.live/checkout?plan=monthly&discount=${offer}" style="display:inline-block;background:#00d4ff;color:#000;padding:18px 50px;border-radius:8px;text-decoration:none;font-weight:700;font-size:18px;margin-bottom:10px;">PASSER PREMIUM MAINTENANT</a>
          <div style="margin-top:10px;">
            <a href="https://dalletek.live/trial?extend=24h" style="color:#888;font-size:12px;text-decoration:underline;">Prolonger mon essai de 24h</a>
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
