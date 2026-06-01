const { getDb } = require('../db');

async function executeAction({ type, params }) {
  const db = getDb();
  switch (type) {
    case 'send_stock_alert':
      return sendStockAlertAction(params, db);
    case 'auto_adjust_price':
      return autoAdjustPrice(params, db);
    case 'toggle_sniffer':
      return toggleSniffer(params, db);
    case 'discover_sources':
      return discoverSources(params);
    case 'build_landing_page':
      return buildLandingPage(params);
    case 'send_followup_email':
      return sendFollowupEmail(params);
    case 'enrich_stale_leads':
      return enrichStaleLeads(params, db);
    case 'rebalance_codes':
      return rebalanceCodes(params, db);
    case 'flag_abuse_pattern':
      return flagAbusePattern(params, db);
    case 'optimize_provider_priority':
      return optimizeProviderPriority(params, db);
    case 'restock_trial_codes':
      return restockTrialCodes(params, db);
    default:
      logAction('brain_unknown', `Unknown action: ${type}`, db);
      return { error: `Unknown action: ${type}` };
  }
}

function logAction(action, details, db) {
  db.prepare(
    "INSERT INTO agent_log (agent, action, details) VALUES ('Brain', ?, ?)"
  ).run(action, details);
}

async function sendStockAlertAction(params, db) {
  const { provider_id, plan_id } = params;
  const row = db.prepare(`
    SELECT pc.name as pname, pp.plan_name, (SELECT COUNT(*) FROM activation_codes ac WHERE ac.provider_id = pp.provider_id AND ac.plan_id = pp.id AND ac.status = 'available') as avail
    FROM provider_plans pp JOIN providers_catalog pc ON pp.provider_id = pc.id WHERE pp.id = ?
  `).get(plan_id);
  if (!row) return { error: 'plan not found' };
  logAction('stock_alert', `Low stock: ${row.pname} ${row.plan_name} — ${row.avail} remaining`, db);
  return { alert: true, provider: row.pname, plan: row.plan_name, remaining: row.avail };
}

async function autoAdjustPrice(params, db) {
  const { plan_id, adjustment_pct } = params;
  const plan = db.prepare('SELECT * FROM provider_plans WHERE id = ?').get(plan_id);
  if (!plan) return { error: 'plan not found' };
  const clamp = Math.max(-10, Math.min(10, Number(adjustment_pct) || 5));
  const newPrice = Math.round((plan.price_sell * (1 + clamp / 100)) * 100) / 100;
  if (newPrice < 1) return { error: 'price too low' };
  db.prepare('UPDATE provider_plans SET price_sell = ? WHERE id = ?').run(newPrice, plan_id);
  logAction('price_adjust', `${plan.plan_name}: $${plan.price_sell} → $${newPrice} (${clamp}%)`, db);
  return { plan_id, old_price: plan.price_sell, new_price: newPrice, adjustment: clamp };
}

async function toggleSniffer(params, db) {
  const { source_type, name, enabled } = params;
  const existing = db.prepare('SELECT id FROM sniffer_sources WHERE source_type = ? AND name = ?').get(source_type, name);
  if (!existing) return { error: 'source not found' };
  db.prepare('UPDATE sniffer_sources SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, existing.id);
  logAction('sniffer_toggle', `${source_type}/${name} → ${enabled ? 'enabled' : 'disabled'}`, db);
  return { source_type, name, enabled };
}

async function discoverSources(params) {
  try {
    const { discoverNewSources } = require('./sourceRanker');
    const result = await discoverNewSources(params.platform || 'telegram');
    logAction('source_discover', `Discovered ${result?.length || 0} new sources`, getDb());
    return { discovered: result?.length || 0 };
  } catch (e) {
    return { error: e.message };
  }
}

async function buildLandingPage(params) {
  try {
    const { buildPage } = require('./pageBuilder');
    const result = await buildPage({ keyword: params.keyword, audience: params.audience, providerId: params.providerId, planId: params.planId, language: 'fr' });
    if (result.error) return { error: result.error };
    logAction('page_built', `Landing page "${result.title}" (${result.slug})`, getDb());
    return { page_id: result.id, slug: result.slug, title: result.title };
  } catch (e) {
    return { error: e.message };
  }
}

async function sendFollowupEmail(params) {
  try {
    const { sendTrial, sendPaymentLink } = require('./emailService');
    const db = getDb();
    if (params.type === 'trial_expiring') {
      const orders = db.prepare(`
        SELECT o.*, tc.expires_at FROM orders o
        JOIN trial_codes tc ON tc.id = o.trial_code_id
        WHERE o.is_trial = 1 AND o.status = 'completed' AND tc.expires_at > datetime('now')
        AND tc.expires_at < datetime('now', '+24 hours') AND o.customer_email IS NOT NULL
      `).all();
      for (const o of orders) {
        try {
          await sendPaymentLink({ email: o.customer_email, name: o.customer_name, checkoutUrl: '/', planName: 'Premium', amount: 19.99, orderId: o.id });
          logAction('followup_email', `Trial expiring email sent to ${o.customer_email}`, db);
        } catch (e) { /* skip */ }
      }
      return { sent: orders.length };
    }
    if (params.type === 'abandoned_cart') {
      const orders = db.prepare("SELECT * FROM orders WHERE status = 'pending' AND customer_email IS NOT NULL AND created_at < datetime('now','-2 hours')").all();
      for (const o of orders) {
        try {
          await sendPaymentLink({ email: o.customer_email, name: o.customer_name, checkoutUrl: '/', planName: 'Premium', amount: 19.99, orderId: o.id });
          logAction('followup_email', `Abandoned cart email sent to ${o.customer_email}`, db);
        } catch (e) { /* skip */ }
      }
      return { sent: orders.length };
    }
    return { error: 'unknown followup type' };
  } catch (e) {
    return { error: e.message };
  }
}

async function enrichStaleLeads(params, db) {
  const limit = Math.min(params.limit || 10, 50);
  const leads = db.prepare(`
    SELECT id, content FROM demand_signals
    WHERE (intent_score IS NULL OR intent_score = 0) AND content IS NOT NULL
    ORDER BY created_at DESC LIMIT ?
  `).all(limit);
  if (leads.length === 0) return { enriched: 0 };
  let enriched = 0;
  for (const lead of leads) {
    try {
      const { generateText } = require('./aiProvider');
      const analysis = await generateText({
        system: 'Extract pain_point, opportunity, intent_score (0-100), email, phone, language from the lead text. Return JSON.',
        messages: [{ role: 'user', content: lead.content }],
        maxTokens: 300,
      });
      const data = tryParse(analysis);
      if (data) {
        db.prepare('UPDATE demand_signals SET pain_point = ?, opportunity = ?, intent_score = ?, email = ?, phone = ?, language = ? WHERE id = ?')
          .run(data.pain_point || '', data.opportunity || '', data.intent_score || 0, data.email || '', data.phone || '', data.language || '', lead.id);
        enriched++;
      }
    } catch (e) { /* skip single lead failure */ }
  }
  logAction('enrich_leads', `Enriched ${enriched}/${leads.length} stale leads`, db);
  return { attempted: leads.length, enriched };
}

async function rebalanceCodes(params, db) {
  const expired = db.prepare("UPDATE activation_codes SET status = 'expired' WHERE expires_at IS NOT NULL AND expires_at < datetime('now') AND status = 'available'").run();
  if (expired.changes > 0) {
    logAction('rebalance_codes', `Expired ${expired.changes} activation codes`, db);
  }
  return { expired: expired.changes };
}

async function flagAbusePattern(params, db) {
  const sessions = db.prepare(`
    SELECT cs.id, cs.customer_email, COUNT(*) as trial_count FROM chat_sessions cs
    WHERE cs.customer_email IS NOT NULL AND cs.customer_email != ''
    AND cs.abuse_flagged = 0
    GROUP BY cs.customer_email
    HAVING trial_count >= 3
  `).all();
  let flagged = 0;
  for (const s of sessions) {
    db.prepare("UPDATE chat_sessions SET abuse_flagged = 1 WHERE customer_email = ?").run(s.customer_email);
    flagged++;
  }
  if (flagged > 0) {
    logAction('flag_abuse', `Flagged ${flagged} customers with 3+ sessions`, db);
  }
  return { flagged };
}

async function optimizeProviderPriority(params, db) {
  const providerSales = db.prepare(`
    SELECT pc.id, pc.name, COUNT(*) as sales, COALESCE(SUM(o.amount),0) as revenue
    FROM orders o JOIN providers_catalog pc ON o.provider_id = pc.id
    WHERE o.status = 'completed' AND o.created_at >= datetime('now','-30 days')
    GROUP BY pc.id ORDER BY revenue DESC
  `).all();
  logAction('provider_priority', `Top providers: ${providerSales.map(p => `${p.name}($${p.revenue})`).join(', ')}`, db);
  return { providers: providerSales };
}

async function restockTrialCodes(params, db) {
  const providerId = params.provider_id;
  const count = params.count || 10;
  if (providerId) {
    const provider = db.prepare('SELECT name FROM providers_catalog WHERE id = ?').get(providerId);
    logAction('restock_trials', `Restock alert: need ${count} trial codes for ${provider ? provider.name : 'provider #'+providerId}`, db);
    db.prepare(
      "INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)"
    ).run('restock_alert', 'Trial codes restock needed',
      `Brain recommends adding ${count} trial codes for ${provider ? provider.name : 'provider #'+providerId}. Pending requests waiting.`,
      providerId);
    return { alerted: true, providerId, count };
  }
  // No specific provider — alert for all exhausted
  const exhausted = db.prepare(
    "SELECT DISTINCT provider_id FROM trial_codes WHERE status = 'used'"
  ).all();
  for (const e of exhausted) {
    db.prepare(
      "INSERT INTO admin_notifications (type, title, message, related_id) VALUES (?, ?, ?, ?)"
    ).run('restock_alert', 'Trial codes restock needed',
      `Brain recommends restocking trial codes for provider #${e.provider_id}.`,
      e.provider_id);
  }
  logAction('restock_trials', `Restock alert for ${exhausted.length} providers`, db);
  return { alerted: true, providers: exhausted.map(e => e.provider_id) };
}

function tryParse(text) {
  try {
    const jsonMatch = text.match(/\{.*\}/s);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch { return null; }
}

module.exports = { executeAction };
