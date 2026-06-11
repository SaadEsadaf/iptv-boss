const { getDb } = require('../db');
const { getTransporter } = require('./emailService');

function trend(current, previous) {
  if (previous === 0) return current > 0 ? '🆕' : '➖';
  if (current > previous) return '📈';
  if (current < previous) return '📉';
  return '➖';
}

function pct(current, previous) {
  if (previous === 0) return current > 0 ? '+∞' : '0';
  const diff = ((current - previous) / previous * 100);
  return (diff > 0 ? '+' : '') + diff.toFixed(0) + '%';
}

async function generateReport() {
  const db = getDb();
  const now = new Date().toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date().toISOString().slice(0, 10);

  // Current period (last 2h)
  const c = {
    leads: db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE created_at > ?").get(twoHoursAgo).c,
    leadsBySource: db.prepare("SELECT source, COUNT(*) as c FROM demand_signals WHERE created_at > ? GROUP BY source ORDER BY c DESC").all(twoHoursAgo),
    orders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE created_at > ?").get(twoHoursAgo).c,
    trials: db.prepare("SELECT COUNT(*) as c FROM orders WHERE is_trial = 1 AND created_at > ?").get(twoHoursAgo).c,
    revenue: db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM orders WHERE status = 'completed' AND created_at > ?").get(twoHoursAgo).t,
    emailsSent: db.prepare("SELECT COUNT(*) as c FROM email_queue WHERE sent_at > ?").get(twoHoursAgo).c,
    trialCodesUsed: db.prepare("SELECT COUNT(*) as c FROM trial_codes WHERE status = 'used' AND assigned_at > ?").get(twoHoursAgo).c,
    outreach: db.prepare("SELECT COUNT(*) as c FROM agent_log WHERE agent = 'Outreach' AND created_at > ?").get(twoHoursAgo).c,
    campaigns: db.prepare("SELECT COUNT(*) as c FROM agent_log WHERE agent = 'EventCampaign' AND created_at > ?").get(twoHoursAgo).c,
    pendingOrders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c,
    totalLeads: db.prepare("SELECT COUNT(*) as c FROM demand_signals").get().c,
    totalOrders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'completed'").get().c,
    totalRevenue: db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM orders WHERE status = 'completed'").get().t,
    conversionRate: (() => {
      const claimed = db.prepare("SELECT COUNT(*) as c FROM orders WHERE is_trial = 1 AND status = 'completed'").get().c;
      const paid = db.prepare("SELECT COUNT(DISTINCT o.customer_email) as c FROM orders o WHERE o.is_trial = 0 AND o.status = 'completed' AND EXISTS (SELECT 1 FROM orders t WHERE t.customer_email = o.customer_email AND t.is_trial = 1 AND t.status = 'completed')").get().c;
      return claimed > 0 ? (paid / claimed * 100).toFixed(1) : '0';
    })(),
    plansAvailable: db.prepare("SELECT COUNT(*) as c FROM trial_codes WHERE provider_id = 4 AND status = 'available'").get().c,
  };

  // Previous period (2-4h ago)
  const p = {
    leads: db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE created_at BETWEEN ? AND ?").get(fourHoursAgo, twoHoursAgo).c,
    orders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE created_at BETWEEN ? AND ?").get(fourHoursAgo, twoHoursAgo).c,
    trials: db.prepare("SELECT COUNT(*) as c FROM orders WHERE is_trial = 1 AND created_at BETWEEN ? AND ?").get(fourHoursAgo, twoHoursAgo).c,
    revenue: db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM orders WHERE status = 'completed' AND created_at BETWEEN ? AND ?").get(fourHoursAgo, twoHoursAgo).t,
  };

  // Direction indicators
  const dir = {
    leads: trend(c.leads, p.leads),
    orders: trend(c.orders, p.orders),
    trials: trend(c.trials, p.trials),
    revenue: trend(c.revenue, p.revenue),
  };

  // Build report
  const report = {
    generatedAt: now,
    period: { from: twoHoursAgo, to: now },
    metrics: {
      leads: { current: c.leads, previous: p.leads, trend: dir.leads, change: pct(c.leads, p.leads) },
      trials: { current: c.trials, previous: p.trials, trend: dir.trials, change: pct(c.trials, p.trials) },
      orders: { current: c.orders, previous: p.orders, trend: dir.orders, change: pct(c.orders, p.orders) },
      revenue: { current: c.revenue, previous: p.revenue, trend: dir.revenue, change: pct(c.revenue, p.revenue) },
    },
    details: {
      emailsSent: c.emailsSent,
      outreach: c.outreach,
      campaigns: c.campaigns,
      trialCodesUsed: c.trialCodesUsed,
    },
    totals: {
      leads: c.totalLeads,
      orders: c.totalOrders,
      revenue: c.totalRevenue,
      trialCodes: c.plansAvailable,
      conversionRate: c.conversionRate + '%',
      pendingOrders: c.pendingOrders,
    },
    leadsBySource: c.leadsBySource,
    status: c.leads > 0 || c.orders > 0 || c.trials > 0 ? 'active' : 'idle',
  };

  return report;
}

function renderReportEmail(report) {
  const m = report.metrics;
  const d = report.details;
  const t = report.totals;
  const statusColor = report.status === 'active' ? '#00cc66' : '#ffaa00';
  const statusText = report.status === 'active' ? '🟢 Actif' : '🟡 En attente';

  const leadSources = report.leadsBySource.map(s => `
    <tr><td style="color:#a0a0a0;font-size:12px;padding:2px 0;">${s.source || 'inconnu'}</td><td style="color:#fff;font-size:12px;text-align:right;">${s.c}</td></tr>
  `).join('');

  return `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:40px;margin-bottom:8px;">📊</div>
      <h2 style="color:#00d4ff;margin:0 0 4px;font-size:22px;">Rapport Business — 2h</h2>
      <p style="color:#a0a0a0;margin:0 0 16px;font-size:13px;">${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
      <div style="display:inline-block;background:${statusColor}20;border:1px solid ${statusColor};border-radius:20px;padding:4px 16px;font-size:13px;font-weight:600;color:${statusColor};margin-bottom:20px;">${statusText}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="text-align:center;background:#0f0f0f;border-radius:10px;padding:12px;width:25%;">
          <div style="font-size:11px;color:#666;">Prospects</div>
          <div style="font-size:22px;font-weight:800;color:#8b5cf6;">${m.leads.current}</div>
          <div style="font-size:11px;">${m.leads.trend} ${m.leads.change}</div>
        </td>
        <td style="text-align:center;background:#0f0f0f;border-radius:10px;padding:12px;width:25%;">
          <div style="font-size:11px;color:#666;">Essais</div>
          <div style="font-size:22px;font-weight:800;color:#00d4ff;">${m.trials.current}</div>
          <div style="font-size:11px;">${m.trials.trend} ${m.trials.change}</div>
        </td>
        <td style="text-align:center;background:#0f0f0f;border-radius:10px;padding:12px;width:25%;">
          <div style="font-size:11px;color:#666;">Commandes</div>
          <div style="font-size:22px;font-weight:800;color:#ffd700;">${m.orders.current}</div>
          <div style="font-size:11px;">${m.orders.trend} ${m.orders.change}</div>
        </td>
        <td style="text-align:center;background:#0f0f0f;border-radius:10px;padding:12px;width:25%;">
          <div style="font-size:11px;color:#666;">Revenu</div>
          <div style="font-size:22px;font-weight:800;color:#00cc66;">€${m.revenue.current.toFixed(2)}</div>
          <div style="font-size:11px;">${m.revenue.trend} ${m.revenue.change}</div>
        </td>
      </tr>
    </table>

    <div style="background:#0f0f0f;border-radius:12px;padding:16px;margin-bottom:16px;">
      <h3 style="margin:0 0 10px;font-size:14px;color:#a0a0a0;">📋 Détails des actions</h3>
      <table style="width:100%;font-size:13px;">
        <tr><td style="color:#666;padding:4px 0;">Emails envoyés</td><td style="color:#fff;text-align:right;">${d.emailsSent}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Démarchage (outreach)</td><td style="color:#fff;text-align:right;">${d.outreach}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Campagnes événementielles</td><td style="color:#fff;text-align:right;">${d.campaigns}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Codes d'essai utilisés</td><td style="color:#fff;text-align:right;">${d.trialCodesUsed}</td></tr>
      </table>
    </div>

    ${leadSources ? `
    <div style="background:#0f0f0f;border-radius:12px;padding:16px;margin-bottom:16px;">
      <h3 style="margin:0 0 10px;font-size:14px;color:#a0a0a0;">🔍 Sources de prospects</h3>
      <table style="width:100%;">${leadSources}</table>
    </div>` : ''}

    <div style="background:#0f0f0f;border-radius:12px;padding:16px;margin-bottom:16px;">
      <h3 style="margin:0 0 10px;font-size:14px;color:#a0a0a0;">📈 Totaux généraux</h3>
      <table style="width:100%;font-size:13px;">
        <tr><td style="color:#666;padding:4px 0;">Total prospects</td><td style="color:#fff;text-align:right;">${t.leads}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Total commandes</td><td style="color:#fff;text-align:right;">${t.orders}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Revenu total</td><td style="color:#ffd700;text-align:right;font-weight:700;">€${t.revenue.toFixed(2)}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Taux conversion essai→payant</td><td style="color:#00d4ff;text-align:right;font-weight:700;">${t.conversionRate}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Codes essai restants</td><td style="color:#00cc66;text-align:right;font-weight:700;">${t.trialCodes}</td></tr>
        <tr><td style="color:#666;padding:4px 0;">Commandes en attente</td><td style="color:#ffaa00;text-align:right;font-weight:700;">${t.pendingOrders}</td></tr>
      </table>
    </div>

    <div style="text-align:center;color:#666;font-size:12px;">
      <p>Prochain rapport dans 2h • <a href="https://dalletek.live/admin" style="color:#00d4ff;">Admin →</a></p>
    </div>`;
}

async function sendBusinessReport(adminEmail) {
  try {
    const report = await generateReport();
    const html = renderReportEmail(report);
    const t = getTransporter();
    const db = getDb();
    const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || 'Dalletek';

    const fullHtml = `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0a0a0a;color:#fff;padding:20px;">
      <div style="max-width:560px;margin:0 auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;padding:20px;">
        ${html}
      </div>
    </div>`;

    await t.sendMail({
      from: `"${siteName}" <${t.fromEmail}>`,
      to: adminEmail || 'babilon26@gmail.com',
      subject: `📊 Rapport Business ${siteName} — ${new Date().toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      html: fullHtml,
    });

    // Log the report
    db.prepare("INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)").run('Report', 'business_report', `Report sent: ${report.metrics.leads.current} leads, ${report.metrics.trials.current} trials, €${report.metrics.revenue.current} revenue`);

    return { sent: true, report };
  } catch (e) {
    console.error('Business report error:', e.message);
    return { sent: false, error: e.message };
  }
}

module.exports = { generateReport, sendBusinessReport };