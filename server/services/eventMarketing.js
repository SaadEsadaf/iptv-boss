const { getDb } = require('../db');
const { getTransporter } = require('./emailService');

// Major sports events calendar (auto-refreshes based on current date)
function getUpcomingEvents() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const events = [];

  // World Cup 2026 (June-July 2026)
  if (year === 2026 && month >= 5 && month <= 6) {
    events.push({
      name: "Coupe du Monde FIFA 2026",
      sport: "Football",
      period: "Juin-Juillet 2026",
      icon: "🏆",
      hook: "Tous les 64 matchs en direct 4K !",
      trialMessage: "Regardez la Coupe du Monde 2026 en 4K gratuite pendant 24h ⚽",
      active: true,
      endDate: new Date(2026, 6, 19),
    });
  }

  // UEFA Champions League (Sept-May)
  if (month >= 8 || month <= 4) {
    events.push({
      name: "UEFA Champions League",
      sport: "Football",
      period: "Saison 2025-2026",
      icon: "⭐",
      hook: "Tous les matchs en direct, demi-finales et finale !",
      trialMessage: "Champions League en direct 4K — essai gratuit 24h ⭐",
      active: true,
      endDate: new Date(year, 5, 31),
    });
  }

  // Premier League (Aug-May)
  if (month >= 7 || month <= 4) {
    events.push({
      name: "Premier League",
      sport: "Football",
      period: "Saison 2025-2026",
      icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      hook: "Tous les matchs en direct chaque week-end !",
      trialMessage: "Premier League en direct — essai gratuit 24h ⚽",
      active: true,
      endDate: new Date(year, 4, 25),
    });
  }

  // NBA (Oct-June)
  if (month >= 9 || month <= 5) {
    events.push({
      name: "NBA Basketball",
      sport: "Basketball",
      period: "Playoffs en cours !",
      icon: "🏀",
      hook: "Tous les matchs NBA en direct 4K !",
      trialMessage: "NBA en direct 4K — essai gratuit 24h 🏀",
      active: true,
      endDate: new Date(year, 5, 30),
    });
  }

  // Summer events
  if (month >= 5 && month <= 7) {
    events.push({
      name: "UFC & MMA",
      sport: "Combat",
      period: "Été 2026",
      icon: "🥊",
      hook: "Tous les combats UFC en direct !",
      trialMessage: "UFC en direct — essai gratuit 24h 🥊",
      active: true,
      endDate: new Date(year, 8, 1),
    });
  }

  // Roland Garros (May-June)
  if (month >= 4 && month <= 5) {
    events.push({
      name: "Roland Garros",
      sport: "Tennis",
      period: "Mai-Juin 2026",
      icon: "🎾",
      hook: "Tout Roland Garros en direct 4K !",
      trialMessage: "Roland Garros en direct — essai gratuit 24h 🎾",
      active: true,
      endDate: new Date(year, 5, 7),
    });
  }

  // Tour de France (July)
  if (month === 6) {
    events.push({
      name: "Tour de France",
      sport: "Cyclisme",
      period: "Juillet 2026",
      icon: "🚴",
      hook: "Toutes les étapes en direct !",
      trialMessage: "Tour de France en direct — essai gratuit 24h 🚴",
      active: true,
      endDate: new Date(year, 6, 27),
    });
  }

  return events.filter(e => e.endDate > now);
}

// Get top events with countdown
function getTopEvents() {
  const events = getUpcomingEvents();
  return events.slice(0, 3).map(e => ({
    ...e,
    daysRemaining: Math.max(0, Math.ceil((e.endDate - new Date()) / (1000 * 60 * 60 * 24))),
  }));
}

// Create promotional email for an event
function createEventEmail(event, siteName, trialUrl) {
  return `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:56px;margin-bottom:8px;">${event.icon}</div>
      <h2 style="color:#ffd700;font-size:22px;margin:0 0 4px;">${event.name}</h2>
      <p style="color:#a0a0a0;font-size:14px;margin:0 0 4px;">${event.hook}</p>
      <p style="color:#00d4ff;font-size:16px;font-weight:600;margin:0 0 20px;">🎁 ${event.trialMessage}</p>
      <a href="${trialUrl}" style="display:inline-block;background:linear-gradient(135deg,#ff6b35,#ff2d92);color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">🚀 Essai Gratuit 24h</a>
      <p style="color:#666;font-size:12px;margin-top:12px;">${event.daysRemaining ? `🔥 Plus que ${event.daysRemaining} jours` : ''}</p>
    </div>`;
}

// Send event campaign to leads
async function sendEventCampaign() {
  const db = getDb();
  const s = {};
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('site_name', 'site_url')").all();
  for (const r of rows) s[r.key] = r.value;
  s.site_name ||= 'Dalletek';
  s.site_url ||= 'https://dalletek.live';

  const events = getUpcomingEvents();
  if (events.length === 0) return { sent: 0, reason: 'no_events' };

  const event = events[0]; // Send the most urgent event
  const trialUrl = `${s.site_url}/#plans`;

  // Get leads who haven't been contacted about this event
  const leads = db.prepare(`
    SELECT DISTINCT ds.id, ds.author, ds.email, ds.lead_contact, ds.language
    FROM demand_signals ds
    WHERE ds.intent_score >= 40 AND ds.status NOT IN ('converted', 'blocked')
      AND (ds.email != '' OR ds.lead_contact != '')
      AND ds.id NOT IN (
        SELECT related_id FROM agent_log 
        WHERE agent = 'EventCampaign' AND details LIKE ?
      )
    ORDER BY ds.intent_score DESC
    LIMIT 50
  `).all(`%${event.name}%`);

  let sent = 0;

  for (const lead of leads) {
    try {
      const emailBody = createEventEmail(event, s.site_name, trialUrl);

      if (lead.email) {
        const t = getTransporter();
        await t.sendMail({
          from: `"${s.site_name}" <${t.fromEmail}>`,
          to: lead.email,
          subject: `${event.icon} ${event.name} — ${event.trialMessage}`,
          html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0a;color:#fff;padding:20px;">
            <div style="max-width:560px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;padding:20px;">
              ${emailBody}
              <div style="text-align:center;padding:16px;border-top:1px solid #1a1a1a;color:#666;font-size:12px;">
                <p>${s.site_name} — <a href="${s.site_url}" style="color:#00d4ff;">${s.site_url}</a></p>
              </div>
            </div>
          </div>`,
        });
      }

      db.prepare(
        "INSERT INTO agent_log (agent, action, details, related_id) VALUES (?, ?, ?, ?)"
      ).run('EventCampaign', 'event_offer', `Sent ${event.name} offer to ${lead.email || lead.lead_contact}`, lead.id);
      sent++;
    } catch (e) {
      console.error('Event campaign error:', e.message);
    }

    if (sent >= 10) break; // Rate limit per cycle
    await new Promise(r => setTimeout(r, 1000));
  }

  return { sent, event: event.name, totalLeads: leads.length };
}

// Get trending events for brain metrics
function getTrendingEvents() {
  return getUpcomingEvents().map(e => ({
    name: e.name,
    icon: e.icon,
    hook: e.hook,
    daysRemaining: Math.max(0, Math.ceil((e.endDate - new Date()) / (1000 * 60 * 60 * 24))),
  }));
}

module.exports = { getUpcomingEvents, getTopEvents, sendEventCampaign, getTrendingEvents, createEventEmail };