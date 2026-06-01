function lookupByEmail(email, db) {
  if (!email || !email.includes('@')) return null

  const orders = db.prepare(`
    SELECT o.*, pc.name as provider_name, pp.plan_name,
           ac.code as activation_code, ac.server_url,
           tc.code as trial_code, tc.server_url as trial_server_url,
           tc.duration_hours, tc.expires_at as trial_expires_at
    FROM orders o
    LEFT JOIN providers_catalog pc ON pc.id = o.provider_id
    LEFT JOIN provider_plans pp ON pp.id = o.plan_id
    LEFT JOIN activation_codes ac ON ac.id = o.activation_code_id
    LEFT JOIN trial_codes tc ON tc.id = o.trial_code_id
    WHERE o.customer_email = ?
    ORDER BY o.created_at DESC
  `).all(email)

  const pastSessions = db.prepare(`
    SELECT id, started_at as created_at, issue_summary, ticket_status, abuse_flagged, converted
    FROM chat_sessions
    WHERE customer_email = ?
    ORDER BY started_at DESC
  `).all(email)

  const trialCount = db.prepare(`
    SELECT COUNT(*) as c FROM orders
    WHERE customer_email = ? AND is_trial = 1 AND status = 'completed'
  `).get(email).c

  const hasPaidOrder = db.prepare(`
    SELECT COUNT(*) as c FROM orders
    WHERE customer_email = ? AND is_trial = 0 AND status = 'completed'
  `).get(email).c

  const activeTrial = db.prepare(`
    SELECT o.id FROM orders o
    JOIN trial_codes tc ON tc.id = o.trial_code_id
    WHERE o.customer_email = ? AND o.is_trial = 1 AND o.status = 'completed'
    AND tc.expires_at > datetime('now')
  `).get(email)

  const abuseFlagged = pastSessions.some(s => s.abuse_flagged)

  return {
    email,
    orders,
    pastSessions,
    trialCount,
    hasPaidOrder: hasPaidOrder > 0,
    activeTrial: !!activeTrial,
    abuseFlagged,
    isExisting: hasPaidOrder > 0,
    // Group completed orders for quick access
    completedOrders: orders.filter(o => o.status === 'completed'),
    // Get the most recent activation credentials
    latestCredentials: orders.find(o => o.activation_code || o.trial_code),
  }
}

module.exports = { lookupByEmail }
