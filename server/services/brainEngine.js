const { getDb } = require('../db');
const { gatherMetrics } = require('./brainMetrics');

// Thresholds for alerts
const THRESHOLDS = {
  trialStockMin: 5,
  activationStockMin: 5,
  conversionRateMin: 20,
  intentScoreMin: 50,
  pendingOrderHours: 2,
  dailyLeadMin: 5,
};

// Alert severity levels
const SEVERITY = { INFO: 'info', WARNING: 'warning', CRITICAL: 'critical' };

function checkThresholds(metrics, db) {
  const alerts = [];

  // 1. Trial stock check
  if (metrics.trials.available < THRESHOLDS.trialStockMin) {
    alerts.push({
      severity: SEVERITY.CRITICAL,
      type: 'low_trial_stock',
      title: 'Trial codes running out',
      message: `Only ${metrics.trials.available} trial codes remaining. Restock needed.`,
      action: 'restock_trial_codes',
    });
  }

  // 2. Activation stock check
  for (const p of metrics.lowStock) {
    alerts.push({
      severity: p.avail === 0 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
      type: 'low_activation_stock',
      title: `Low stock: ${p.pname} ${p.plname}`,
      message: `Only ${p.avail} codes remaining for ${p.pname} ${p.plname}.`,
      action: 'send_stock_alert',
    });
  }

  // 3. Conversion rate check
  if (metrics.conversion.trial_to_paid_pct < THRESHOLDS.conversionRateMin && metrics.conversion.trials_claimed > 5) {
    alerts.push({
      severity: SEVERITY.WARNING,
      type: 'low_conversion',
      title: `Conversion rate low: ${metrics.conversion.trial_to_paid_pct}%`,
      message: `Trial-to-paid conversion is ${metrics.conversion.trial_to_paid_pct}% (target: ${THRESHOLDS.conversionRateMin}%). Check follow-up sequences.`,
      action: 'behavioral_followup',
    });
  }

  // 4. Lead volume check
  if (metrics.leads.last24h < THRESHOLDS.dailyLeadMin) {
    alerts.push({
      severity: SEVERITY.INFO,
      type: 'low_lead_volume',
      title: `Low lead volume: ${metrics.leads.last24h}/day`,
      message: `Only ${metrics.leads.last24h} leads in 24h. Consider enabling more sniffers.`,
      action: 'discover_sources',
    });
  }

  // 5. Pending orders check
  const pending30d = metrics.orders.byStatus?.pending || 0;
  if (pending30d > 5) {
    alerts.push({
      severity: SEVERITY.WARNING,
      type: 'pending_orders',
      title: `${pending30d} pending orders waiting`,
      message: `${pending30d} orders are stuck in pending status. Cart recovery activated.`,
      action: 'cart_recovery',
    });
  }

  // 6. Revenue trend
  const revenue7d = metrics.orders.last7d.revenue || 0;
  const revenue30d = metrics.orders.last30d.revenue || 0;
  if (revenue30d === 0 && metrics.orders.last30d.count > 0) {
    // No revenue but orders exist — payment issues
    alerts.push({
      severity: SEVERITY.CRITICAL,
      type: 'payment_issue',
      title: 'Orders not converting to revenue',
      message: `${metrics.orders.last30d.count} orders with €0 revenue. Check payment flow.`,
      action: 'send_followup_email',
    });
  }

  return alerts;
}

function generateDecisions(metrics, db) {
  const decisions = [];

  // Decision 1: Promote best-selling plan
  const bestPlan = db.prepare(`
    SELECT pp.plan_name, pc.name as provider_name, COUNT(*) as sales
    FROM orders o
    JOIN provider_plans pp ON o.plan_id = pp.id
    JOIN providers_catalog pc ON o.provider_id = pc.id
    WHERE o.status = 'completed' AND o.created_at >= datetime('now', '-30 days')
    GROUP BY o.plan_id
    ORDER BY sales DESC
    LIMIT 1
  `).get();
  if (bestPlan) {
    decisions.push({
      type: 'promote_plan',
      title: `Best seller: ${bestPlan.plan_name}`,
      message: `${bestPlan.plan_name} from ${bestPlan.provider_name} (${bestPlan.sales} sales). Promote in Alex chat.`,
      confidence: 0.85,
      action: null,
    });
  }

  // Decision 2: Check if outreach is needed
  if (metrics.leads.last24h > 10 && (metrics.leads.bySource || []).length < 3) {
    decisions.push({
      type: 'diversify_sources',
      title: 'Leads concentrated in few sources',
      message: `${metrics.leads.bySource?.length || 0} active sources. Consider enabling reddit/twitter sniffers.`,
      confidence: 0.6,
      action: 'discover_sources',
    });
  }

  // Decision 3: Conversion improvement suggestion
  if (metrics.conversion.trial_to_paid_pct < 30 && metrics.conversion.trials_claimed > 10) {
    decisions.push({
      type: 'improve_conversion',
      title: 'Trial conversion needs improvement',
      message: `${metrics.conversion.trial_to_paid_pct}% trial-to-paid. Consider offering "1 month free" upgrade incentive.`,
      confidence: 0.7,
      action: 'behavioral_followup',
    });
  }

  return decisions;
}

async function brainCycle() {
  const db = getDb();
  const startTime = Date.now();

  // 1. Gather metrics
  const metrics = gatherMetrics();

  // 2. Check thresholds → alerts
  const alerts = checkThresholds(metrics, db);

  // 3. Generate decisions
  const decisions = generateDecisions(metrics, db);

  // 4. Save alerts + decisions to DB
  const insertNotification = db.prepare(
    "INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)"
  );
  const insertDecision = db.prepare(`
    INSERT INTO brain_decisions (decision_type, params, reasoning, confidence, outcome_score, executed, created_at)
    VALUES (?, ?, ?, ?, 0, 0, datetime('now'))
  `);

  for (const alert of alerts) {
    // Avoid duplicate alerts in last hour
    const exists = db.prepare(`
      SELECT id FROM admin_notifications WHERE type = ? AND created_at > datetime('now', '-1 hour')
    `).get(alert.type);
    if (!exists) {
      insertNotification.run(alert.type, alert.title, alert.message, 0);
    }
  }

  for (const decision of decisions) {
    const ctx = JSON.stringify({ metrics_snapshot: { orders: metrics.orders.last24h, conversion: metrics.conversion, leads: metrics.leads.last24h } });
    insertDecision.run(decision.type, JSON.stringify(decision), `${decision.title}: ${decision.message}`, decision.confidence);
  }

  // 5. Save metrics snapshot to brain_memory for trend analysis
  const snapshotKey = `funnel_${new Date().toISOString().slice(0, 13)}`; // hourly
  db.prepare(`
    INSERT OR REPLACE INTO brain_memory (memory_type, context, action_taken, outcome, score, tags, created_at)
    VALUES ('snapshot', ?, 'brain_cycle_snapshot', ?, 0.5, '["brain_cycle"]', datetime('now'))
  `).run(snapshotKey, JSON.stringify({
    trials_claimed: metrics.conversion.trials_claimed,
    trial_to_paid_pct: metrics.conversion.trial_to_paid_pct,
    revenue_7d: metrics.orders.last7d.revenue,
    revenue_30d: metrics.orders.last30d.revenue,
    leads_24h: metrics.leads.last24h,
    orders_24h: metrics.orders.last24h.count,
    pending: metrics.orders.byStatus?.pending || 0,
  }));

  // 6. Run event marketing campaign (every 6h)
  let eventCampaign = null;
  try {
    const hour = new Date().getHours();
    if (hour % 6 === 0) { // Run every 6 hours
      const { sendEventCampaign, getTopEvents } = require('./eventMarketing');
      eventCampaign = await sendEventCampaign();
      if (eventCampaign.sent > 0) {
        db.prepare("INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)").run('Brain', 'event_campaign', `Event campaign: ${eventCampaign.sent} emails sent for ${eventCampaign.event}`);
      }
    }
  } catch (e) {
    console.error('Event campaign error:', e.message);
  }

  // 7. Send business report every 2 hours
  try {
    const hour = new Date().getHours();
    if (hour % 2 === 0) { // Runs at 0,2,4,6,8,10,12,14,16,18,20,22
      const { sendBusinessReport } = require('./businessReport');
      const db2 = getDb();
      const adminEmail = (db2.prepare("SELECT value FROM app_settings WHERE key = 'admin_email'").get() || {}).value || 'babilon26@gmail.com';
      const result = await sendBusinessReport(adminEmail);
      if (result.sent) {
        db.prepare("INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)").run('Brain', 'report_sent', `Business report sent to ${adminEmail}`);
      }
    }
  } catch (e) {
    console.error('Report error:', e.message);
  }

  // 8. Run health check (every hour)
  try {
    const { sendHealthAlert } = require('./healthMonitor');
    const healthResult = await sendHealthAlert();
    if (healthResult.sent) {
      db.prepare("INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)").run('Brain', 'health_alert', `Health status: ${healthResult.check.emoji} ${healthResult.check.label} — ${healthResult.check.count.green}✅ ${healthResult.check.count.orange}⚠️ ${healthResult.check.count.red}❌`);
    }
  } catch (e) {
    console.error('Health check error:', e.message);
  }

  // 9. Run self-healing (every 6h at hour 0,6,12,18)
  try {
    const hour = new Date().getHours();
    if (hour % 6 === 0) {
      const { healAndNotify } = require('./healEngine');
      const healResult = await healAndNotify();
      if (healResult.totalFixed > 0 || healResult.totalFailed > 0) {
        db.prepare("INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)").run('Brain', 'heal_cycle', `Heal: ${healResult.totalFixed} fixed, ${healResult.totalFailed} need help`);
      }
    }
  } catch (e) {
    console.error('Heal engine error:', e.message);
  }

  // 10. Log the cycle
  const elapsed = Date.now() - startTime;
  db.prepare(
    "INSERT INTO sales_engine_log (action, lead_email, sequence_type, details, lead_id) VALUES (?, ?, ?, ?, ?)"
  ).run('brain_cycle', '', 'brain', `Brain cycle: ${alerts.length} alerts, ${decisions.length} decisions (${elapsed}ms)`, null);

  return {
    elapsed_ms: elapsed,
    alerts: alerts.length,
    decisions: decisions.length,
    metrics: {
      orders_24h: metrics.orders.last24h.count,
      revenue_24h: metrics.orders.last24h.revenue,
      conversion_rate: metrics.conversion.trial_to_paid_pct,
      pending_orders: metrics.orders.byStatus?.pending || 0,
      trial_codes: metrics.trials.available,
      leads_24h: metrics.leads.last24h,
    },
  };
}

module.exports = { brainCycle, gatherMetrics: gatherMetrics };