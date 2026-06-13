const cron = require('node-cron');
const { getDb } = require('../db');
const { generateText } = require('./aiProvider');
const { gatherMetrics } = require('./brainMetrics');
const {
  storeInsight, recallSimilar, getActiveRules, scoreDecision,
  getPendingEvaluations, storeDecision, markExecuted, pruneMemories,
} = require('./brainMemory');
const { executeAction } = require('./brainActions');

let cycleRunning = false;
let lastCycleAt = null;
let lastDecision = null;

function getSiteName() {
  const db = getDb();
  return (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || process.env.SITE_NAME || 'Dalletek';
}

function buildMetricsSummary(m) {
  return [
    `Time: ${m.timestamp}`,
    `Codes: ${m.codes.available} available / ${m.codes.total} total (used: ${m.codes.used}, expired: ${m.codes.expired})`,
    `Trials: ${m.trials.available} available / ${m.trials.total} total`,
    `Sales (24h): ${m.orders.last24h.count} orders — $${m.orders.last24h.revenue}`,
    `Sales (7d): ${m.orders.last7d.count} orders — $${m.orders.last7d.revenue}`,
    `Conversion: ${m.conversion.trial_to_paid_pct}% trial→paid`,
    `Leads (24h): ${m.leads.last24h} (avg intent: ${m.leads.avgIntent})`,
    `Leads by source: ${m.leads.bySource.map(s => `${s.source}(${s.c})`).join(', ')}`,
    `Total revenue: $${m.revenue.total}`,
    `Low stock plans: ${m.lowStock.map(s => `${s.pname} ${s.plname}(${s.avail})`).join(', ') || 'none'}`,
    `Pending evaluations: ${m.pendingDecisions}`,
    `Pending trial requests (out of stock): ${m.pendingTrialRequests || 0}`,
    `Engine health: ${(m.engine_health || []).slice(0,3).map(e => `${e.engine}=${e.status}`).join(', ') || 'no data'}`,
    `Websites: ${m.websites || 1}, Landing pages: ${m.landing_pages || 0}`,
  ].join('\n');
}

function buildRulesSummary(rules) {
  if (rules.length === 0) return 'No established patterns yet.';
  return rules.map((r, i) =>
    `${i + 1}. "${r.action_taken}" — ${r.outcome || ''} (score: ${r.score})`
  ).join('\n');
}

function buildBrainPrompt(siteName, metrics, rules) {
  return `You are the autonomous CEO of "${siteName}". Your ONLY goal is to maximize revenue and profit.

ARCHITECTURE (V2 — 3 Engines):
You live on the Business Engine (port 3001), the central brain:
- Business Engine (3001): Orders, codes, fulfillment, trials, AI chat, tickets, email
- Marketing Engine (3002): Lead gen, SEO, landing pages, blog, campaigns, sniffers
- Payment Engine (3004): Payments, credits, cloaking, landing page faces for redirection

Check engine_health in metrics — if Marketing or Payment is down, avoid actions that depend on them.

RULES:
1. You can adjust prices, manage inventory, trigger marketing, build landing pages (via Marketing Engine API), and trigger engine health checks.
2. Act BEFORE stock runs out — if any plan has < 10 codes available, flag it.
3. Always trial small adjustments (5-10%) before making big changes.
4. Choose exactly ONE action per cycle. Prioritize the biggest leverage point.
5. If you have a pending evaluation from a previous decision, check it first.
6. If there are pending trial requests (trial_stockout notifications), prioritize restocking trial codes or acknowledge the issue.
7. If engine_health shows any engine down for >2h, trigger a watcher check.
8. Output ONLY valid JSON with no markdown or extra text.

Known patterns from memory:
${buildRulesSummary(rules)}

Current metrics:
${buildMetricsSummary(metrics)}

Respond with JSON:
{"action": "action_name", "params": {...}, "reasoning": "why now", "confidence": 0.0-1.0}

Valid actions:
- auto_adjust_price: {"plan_id": N, "adjustment_pct": -10 to 10}
- toggle_sniffer: {"source_type": "telegram"|"reddit"|"youtube"|"twitter", "name": "...", "enabled": true|false}
- discover_sources: {"platform": "telegram"|"reddit"}
- build_landing_page: {"keyword": "...", "audience": "...", "providerId": N, "website_id": 1}
- send_followup_email: {"type": "trial_expiring"|"abandoned_cart"}
- enrich_stale_leads: {"limit": 10}
- rebalance_codes: {}
- flag_abuse_pattern: {}
- optimize_provider_priority: {}
- send_stock_alert: {"provider_id": N, "plan_id": N}
- restock_trial_codes: {"provider_id": N, "count": N}
- trigger_watcher: {} — force immediate engine health check
- check_engine_health: {} — report latest status of all 3 engines`;
}

function parseDecision(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const json = JSON.parse(match[0]);
    if (!json.action) return null;
    return {
      action: json.action,
      params: json.params || {},
      reasoning: json.reasoning || 'No reasoning given',
      confidence: typeof json.confidence === 'number' ? Math.max(0, Math.min(1, json.confidence)) : 0.5,
    };
  } catch {
    return null;
  }
}

async function evaluatePending() {
  try {
    const pending = getPendingEvaluations();
    if (pending.length === 0) return;
    const metrics = gatherMetrics();
    for (const dec of pending) {
      if (!dec.metrics_snapshot) continue;
      try {
        const snapshot = JSON.parse(dec.metrics_snapshot);
        const oldRevenue = snapshot.orders?.last7d?.revenue || 0;
        const newRevenue = metrics.orders.last7d.revenue || 0;
        const oldConv = snapshot.conversion?.trial_to_paid_pct || 0;
        const newConv = metrics.conversion.trial_to_paid_pct || 0;
        const scoreDelta = 0;
        const revChange = newRevenue - oldRevenue;
        const convChange = newConv - oldConv;
        let score = 0;
        if (revChange > 0) score += 2;
        else if (revChange < 0) score -= 2;
        if (convChange > 0) score += 1;
        else if (convChange < 0) score -= 1;
        score = Math.max(-5, Math.min(5, score));
        const note = `Revenue: ${revChange > 0 ? '+' : ''}$${revChange.toFixed(0)}, Conversion: ${convChange > 0 ? '+' : ''}${convChange.toFixed(1)}%`;
        scoreDecision(dec.id, score, note);
        storeInsight({ type: 'outcome', context: dec.decision_type, action: dec.params, outcome: note, score, tags: [dec.decision_type] });
      } catch (e) { /* skip evaluation errors */ }
    }
  } catch (e) {
    console.error('[Brain] Evaluation error:', e.message);
  }
}

async function brainCycle() {
  if (cycleRunning) return;
  cycleRunning = true;
  try {
    await evaluatePending();
    const siteName = getSiteName();
    const metrics = gatherMetrics();
    const rules = getActiveRules();
    const prompt = buildBrainPrompt(siteName, metrics, rules);

    let decision;
    try {
      const result = await generateText({
        system: prompt,
        messages: [{ role: 'user', content: 'What action do you recommend for this cycle?' }],
        maxTokens: 600,
        task: 'chat',
      });
      decision = parseDecision(result);
    } catch (e) {
      console.error('[Brain] LLM error:', e.message);
      decision = null;
    }

    if (!decision) {
      const db = getDb();
      const lowStock = db.prepare(`
        SELECT sa.provider_id, sa.plan_id FROM stock_alerts sa
        WHERE (SELECT COUNT(*) FROM activation_codes ac WHERE ac.provider_id = sa.provider_id AND ac.plan_id = sa.plan_id AND ac.status = 'available') <= sa.alert_threshold
        LIMIT 1
      `).get();
      if (lowStock) {
        decision = {
          action: 'send_stock_alert',
          params: { provider_id: lowStock.provider_id, plan_id: lowStock.plan_id },
          reasoning: 'Fallback: stock below threshold, sending alert',
          confidence: 1.0,
        };
      } else {
        decision = {
          action: 'rebalance_codes',
          params: {},
          reasoning: 'Fallback: no LLM decision available, running maintenance',
          confidence: 0.5,
        };
      }
    }

    lastDecision = decision;
    lastCycleAt = new Date().toISOString();
    const metricsSnapshot = JSON.stringify(metrics);
    const decisionId = storeDecision({
      decisionType: decision.action,
      params: decision.params,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      metricsSnapshot,
    });

    try {
      const result = await executeAction({ type: decision.action, params: decision.params });
      markExecuted(decisionId);
      storeInsight({
        type: 'experiment',
        context: decision.action,
        action: JSON.stringify(decision.params),
        outcome: JSON.stringify(result),
        score: 0,
        tags: [decision.action],
      });
      console.log(`[Brain] ✅ ${decision.action} — ${decision.reasoning}`);
    } catch (e) {
      console.error(`[Brain] ❌ ${decision.action} failed:`, e.message);
    }
  } catch (e) {
    console.error('[Brain] Cycle error:', e.message);
  } finally {
    cycleRunning = false;
  }
}

function startBrain() {
  console.log('[Brain] Starting autonomous business brain...');
  setTimeout(() => brainCycle(), 5000);
  cron.schedule('*/30 * * * *', () => {
    brainCycle();
  });
}

function getStatus() {
  return {
    running: cycleRunning,
    lastCycleAt,
    lastDecision,
  };
}

module.exports = { startBrain, brainCycle, getStatus };
