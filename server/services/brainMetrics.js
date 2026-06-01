const { getDb } = require('../db');

function gatherMetrics() {
  const db = getDb();
  const wid = 1;

  const codesTotal = db.prepare('SELECT COUNT(*) as c FROM activation_codes').get().c || 0;
  const codesAvailable = db.prepare("SELECT COUNT(*) as c FROM activation_codes WHERE status = 'available'").get().c || 0;
  const codesUsed = db.prepare("SELECT COUNT(*) as c FROM activation_codes WHERE status = 'used'").get().c || 0;
  const codesExpired = db.prepare("SELECT COUNT(*) as c FROM activation_codes WHERE status = 'expired'").get().c || 0;

  const trialsTotal = db.prepare('SELECT COUNT(*) as c FROM trial_codes').get().c || 0;
  const trialsAvailable = db.prepare("SELECT COUNT(*) as c FROM trial_codes WHERE status = 'available'").get().c || 0;
  const trialsUsed = db.prepare("SELECT COUNT(*) as c FROM trial_codes WHERE status = 'used'").get().c || 0;

  const orders24h = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as r FROM orders WHERE created_at >= datetime('now','-24 hours')").get();
  const orders7d = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as r FROM orders WHERE created_at >= datetime('now','-7 days')").get();
  const orders30d = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as r FROM orders WHERE created_at >= datetime('now','-30 days')").get();

  const orderStatuses = db.prepare("SELECT status, COUNT(*) as c FROM orders GROUP BY status").all();
  const statusMap = {};
  for (const s of orderStatuses) statusMap[s.status] = s.c;

  const trialsClaimed = db.prepare("SELECT COUNT(*) as c FROM orders WHERE is_trial = 1 AND status = 'completed'").get().c || 0;
  const paidAfterTrial = db.prepare(`
    SELECT COUNT(DISTINCT o.customer_email) as c FROM orders o
    WHERE o.is_trial = 0 AND o.status = 'completed'
    AND EXISTS (SELECT 1 FROM orders t WHERE t.customer_email = o.customer_email AND t.is_trial = 1 AND t.status = 'completed')
  `).get().c || 0;
  const trialConvRate = trialsClaimed > 0 ? (paidAfterTrial / trialsClaimed * 100) : 0;

  const leads24h = db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE created_at >= datetime('now','-24 hours')").get().c || 0;
  const leads7d = db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE created_at >= datetime('now','-7 days')").get().c || 0;
  const leadsBySource = db.prepare("SELECT source, COUNT(*) as c FROM demand_signals WHERE created_at >= datetime('now','-7 days') GROUP BY source").all();
  const avgIntent = db.prepare("SELECT COALESCE(AVG(intent_score),0) as avg FROM demand_signals WHERE created_at >= datetime('now','-7 days')").get().avg || 0;

  const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM orders WHERE status = 'completed'").get().t;

  const lowStockPlans = db.prepare(`
    SELECT * FROM (
      SELECT pc.name as pname, pp.plan_name as plname, (SELECT COUNT(*) FROM activation_codes ac WHERE ac.provider_id = pp.provider_id AND ac.plan_id = pp.id AND ac.status = 'available') as avail
      FROM provider_plans pp JOIN providers_catalog pc ON pp.provider_id = pc.id
    ) WHERE avail < 10 ORDER BY avail
  `).all();

  const aiPerf = db.prepare("SELECT agent, COUNT(*) as c FROM agent_log WHERE agent LIKE 'aiProvider%' AND created_at >= datetime('now','-7 days') GROUP BY agent").all();

  const pendingDecisions = db.prepare("SELECT COUNT(*) as c FROM brain_decisions WHERE outcome_score IS NULL AND executed = 1 AND executed_at IS NOT NULL").get().c || 0;
  const pendingTrialRequests = db.prepare("SELECT COUNT(*) as c FROM admin_notifications WHERE type = 'trial_stockout' AND read = 0").get().c || 0;

  const codesByProvider = db.prepare(`
    SELECT pc.name, pp.plan_name, (SELECT COUNT(*) FROM activation_codes ac WHERE ac.provider_id = pp.provider_id AND ac.plan_id = pp.id AND ac.status = 'available') as avail
    FROM provider_plans pp JOIN providers_catalog pc ON pp.provider_id = pc.id
    ORDER BY pc.name, pp.plan_name
  `).all();

  return {
    timestamp: new Date().toISOString(),
    codes: { total: codesTotal, available: codesAvailable, used: codesUsed, expired: codesExpired, byProvider: codesByProvider },
    trials: { total: trialsTotal, available: trialsAvailable, used: trialsUsed },
    orders: {
      last24h: { count: orders24h.c, revenue: orders24h.r },
      last7d: { count: orders7d.c, revenue: orders7d.r },
      last30d: { count: orders30d.c, revenue: orders30d.r },
      byStatus: statusMap,
    },
    conversion: {
      trials_claimed: trialsClaimed,
      paid_after_trial: paidAfterTrial,
      trial_to_paid_pct: Math.round(trialConvRate * 10) / 10,
    },
    leads: {
      last24h: leads24h,
      last7d: leads7d,
      bySource: leadsBySource,
      avgIntent: Math.round(avgIntent * 10) / 10,
    },
    revenue: { total: totalRevenue },
    lowStock: lowStockPlans,
    aiProviderPerf: aiPerf,
    pendingDecisions,
    pendingTrialRequests,
  };
}

function getMetricsSnapshot() {
  const m = gatherMetrics();
  return JSON.stringify(m, null, 2);
}

module.exports = { gatherMetrics, getMetricsSnapshot };
