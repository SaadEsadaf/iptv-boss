const { getDb } = require('../db')
const { generateText } = require('./aiProvider')
const { sendEmail } = require('./emailService')
const { getTransporter } = require('./emailService')

const SEQUENCE_TYPES = {
  HOT_LEAD: 'hot_lead',       // High intent, has email/phone → 5 emails over 7 days
  WARM_LEAD: 'warm_lead',     // Medium intent, has email → 4 emails over 6 days
  COLD_LEAD: 'cold_lead',     // Low intent or no contact → 3 emails over 5 days
  TRIAL_TO_PAID: 'trial_to_paid', // Someone claimed trial → 4 emails over 4 days
  ABANDONED_CART: 'abandoned_cart', // Started checkout but didn't pay → 3 emails over 3 days
}

const EMAIL_TEMPLATES = {
  hot_lead: [
    {
      day: 0,
      subject: 'Ready to cut the cord and save on IPTV?',
      body: `Hi {{name}},

I noticed you're exploring IPTV options. Here's what most people don't tell you:

✅ 25,000+ channels (sports, movies, Arabic, European, Asian)
✅ 4K quality, no buffering on most connections
✅ Works on Firestick, Android TV, iPhone, Smart TV
✅ First month from $9.99

Most of our customers wish they'd switched sooner. We offer a free trial so you can test everything risk-free.

Ready to see what you've been missing?

👉 [Start Free Trial Now]

Best,
Alex`,
    },
    {
      day: 2,
      subject: 'Still thinking about it? Let me help',
      body: `Hi {{name}},

I wanted to follow up. Choosing an IPTV service can feel overwhelming with so many options.

Here's what makes us different:
🔹 Real customer support (not a bot)
🔹 99.9% uptime guarantee
🔹 25,000+ channels including sports in 4K
🔹 Works on all your devices

We also offer a free trial so you can test before committing.

👉 [Try Free for 24h]

Let me know if you have questions!

Alex`,
    },
    {
      day: 4,
      subject: '⏰ Last chance for this deal',
      body: `Hi {{name}},

Quick question — did the free trial work for you?

We're running low on trial codes this week, and I wanted to make sure you got a spot.

Current pricing: starting at $9.99/month for 25,000+ channels.

But if you sign up today, I'll personally make sure you get:
🎁 1 month free
🎁 Priority setup support
🎁 30-day money-back guarantee

👉 [Claim Your Spot]

This offer expires Friday midnight.

Alex`,
    },
    {
      day: 6,
      subject: 'Final notice: trial code expiring',
      body: `Hi {{name}},

This is your final heads up.

We've allocated you a free trial code, but it's set to expire in 24 hours.

After that, you'll need to subscribe to get access.

Here's what you get with our paid plans:
✅ 25,000+ channels
✅ 4K streaming
✅ All sports (World Cup, Premier League, NBA, etc.)
✅ Arabic, French, Spanish, African content
✅ Works on Firestick, Android, iOS, Smart TV

👉 [Claim Free Trial Now] (expires tomorrow)

Alex`,
    },
    {
      day: 8,
      subject: 'From the founder: why we exist',
      body: `Hi {{name}},

I'll keep this short.

We started this because we were tired of paying $100+ for cable that barely worked. And the IPTV market was full of scams and sketchy services.

So we built something different: reliable IPTV at a price that makes sense.

Today we serve 10,000+ customers across Europe, Middle East, Africa, and the Americas.

If you've been on the fence, here's my personal guarantee:

- Not satisfied in 30 days? Full refund.
- Setup doesn't work? We help you live.
- Anything breaks? Real human support.

Try us for free and decide for yourself.

👉 [Start Free Trial]({{trial_url}})

— The Founder`,
    },
  ],
  warm_lead: [
    {
      day: 0,
      subject: 'Hi {{name}}, quick question',
      body: `Hi {{name}},

You recently checked out our IPTV service. I wanted to reach out personally to answer any questions.

We offer 25,000+ channels starting at $9.99/month. That includes sports, movies, Arabic, European, African, and Asian content — all in 4K.

And you can test risk-free with our free trial.

Any questions I can help with?

Alex`,
    },
    {
      day: 3,
      subject: 'What would you watch tonight?',
      body: `Hi {{name}},

Genuine question — if you had access to 25,000+ channels right now, what would you watch first?

Sports? Movies? Your favorite international content?

We have all of it, and you can start with a free trial to test everything before committing.

👉 [Try Free for 24 Hours]

Let me know what content you're looking for — I can point you to the right plan.

Alex`,
    },
    {
      day: 5,
      subject: 'Our offer ends Sunday',
      body: `Hi {{name}},

I wanted to let you know — we're offering 20% off all plans this week.

That's $2 off every month, forever. So instead of $9.99, you'd pay $7.99/month for 25,000+ channels.

This includes:
✅ All sports (World Cup, Premier League, UFC, etc.)
✅ All movies and series
✅ International content in 20+ languages
✅ 4K quality, no buffering

👉 [Claim 20% Discount] (expires Sunday)

Alex`,
    },
    {
      day: 8,
      subject: 'One more chance',
      body: `Hi {{name}},

Last email from me (I promise).

Our 20% discount ends this week. After that, pricing goes back to regular.

If you're still interested, now's the time. If not, no hard feelings — I'll stop emailing.

Either way, you're always welcome to try our free trial.

👉 [Claim 20% Off]({{checkout_url}})

Alex`,
    },
  ],
  cold_lead: [
    {
      day: 0,
      subject: 'Best IPTV for {{country}} in 2026',
      body: `Hi,

I wanted to share something that might interest you.

We offer one of the largest IPTV libraries online — 25,000+ channels, 4K quality, starting at $9.99/month.

And right now, you can test completely free for 24 hours.

No credit card needed. Just pick a plan, get your credentials, and start watching.

👉 [Try Free Now]({{trial_url}})

Alex`,
    },
    {
      day: 5,
      subject: 'Quick update on our service',
      body: `Hi,

Just a quick note — we upgraded our server infrastructure last week. Things are faster than ever.

If you tried us before and had issues, I'd love a second chance. Our support team is now available 24/7.

Free trial still available: {{trial_url}}

Alex`,
    },
    {
      day: 10,
      subject: 'Are you still looking for IPTV?',
      body: `Hi,

I'll be direct: we're offering something special this month.

For a limited time, new customers get 1 month free when they sign up for 3 months or more.

That's 3 months for the price of 2.

If you're still in the market for IPTV, this is the best deal you'll find.

👉 [Claim 1 Month Free]({{checkout_url}})

Valid while codes last.

Alex`,
    },
  ],
  trial_to_paid: [
    {
      day: 1,
      subject: 'How was your trial?',
      body: `Hi {{name}},

I wanted to check in — did you get a chance to try the free trial?

I'm genuinely curious what you thought. Our goal is to make the switching process as smooth as possible.

If you ran into any issues, let me know and I'll personally help you sort it out.

If everything worked great, here's a special offer just for trial users:

🎁 30% off your first 3 months
🎁 Priority setup support
🎁 Extended 48-hour trial extension if you need more time

To claim: {{checkout_url}}

Alex`,
    },
    {
      day: 2,
      subject: 'Quick question about your trial',
      body: `Hi {{name}},

I noticed you've been using our trial (that's awesome! 🎉).

I wanted to ask — what did you think of the channel selection? Any categories missing?

We're always improving, and your feedback helps us serve you better.

Also, as a trial user, you get exclusive pricing: 30% off your first 3 months.

👉 [View Plans with Trial Discount]({{checkout_url}})

Let me know if you have any questions!

Alex`,
    },
    {
      day: 3,
      subject: 'Trial ending soon — here\'s what to do',
      body: `Hi {{name}},

Heads up: your free trial is coming to an end in the next 24 hours.

After that, you'll lose access unless you subscribe.

Here's what past trial users have done:
1️⃣ Subscribe for 3 months — get 1 month free (best value)
2️⃣ Subscribe for 1 month — regular price, no commitment
3️⃣ Do nothing — keep us in mind for next time

If you enjoyed the service, I'd recommend not waiting. We often sell out of certain plans.

👉 [Subscribe Now — 30% off for you]({{checkout_url}})

Alex`,
    },
    {
      day: 4,
      subject: 'Last day of your trial',
      body: `Hi {{name}},

This is it — today is your last day of free access.

After midnight tonight, your trial credentials will stop working.

If you've been on the fence, here's my final offer:

✅ 30% off your first 3 months
✅ 25,000+ channels in 4K
✅ Money-back guarantee
✅ Setup help if you need it

This is the best deal I can offer. After today, the trial discount expires.

👉 [Subscribe Now]({{checkout_url}})

No pressure. If you decide IPTV isn't for you, I respect that. But if it is — now's the time.

Alex`,
    },
  ],
  abandoned_cart: [
    {
      day: 0,
      subject: 'Complete your order?',
      body: `Hi {{name}},

You started checkout earlier but didn't complete your order.

No worries — it happens. But I wanted to reach out in case you had questions.

Here's what you were looking at:
📦 {{plan_name}} — \${{amount}}/month

Your spot is still reserved. Complete your order using the link below:

👉 [Complete Your Order]({{checkout_url}})

If you decided to go a different direction, no hard feelings. But if you were just stuck on something, I'm here to help.

Alex`,
    },
    {
      day: 1,
      subject: 'Still there? Let me help',
      body: `Hi {{name}},

Just a quick follow-up. Your order for {{plan_name}} is still waiting.

If you ran into any issues during checkout, I can help personally:
- Payment problems
- Plan questions
- Setup help after purchase

Just reply to this email and I'll get back to you within the hour.

Otherwise, here's your checkout link: [{{checkout_url}}]({{checkout_url}})

Alex`,
    },
    {
      day: 2,
      subject: 'Special offer: 15% off + bonus',
      body: `Hi {{name}},

I don't want to bother you, but I also don't want you to miss out.

Since you were interested in {{plan_name}}, I wanted to offer you something special:

🎁 15% off your order (one-time)
🎁 Bonus: 1 week free
🎁 Priority support for 30 days

This expires in 48 hours. After that, the offer disappears.

👉 [Claim Your Discount]({{checkout_url}})

If you've already purchased somewhere else, ignore this email. If not — I'd love to have you as a customer.

Alex`,
    },
  ],
}

function scoreLead(lead) {
  let score = 50

  if (lead.intent_score) {
    score = lead.intent_score
  }

  if (lead.email && lead.email.includes('@')) score += 20
  if (lead.phone && lead.phone.length > 7) score += 15
  if (lead.source === 'telegram') score += 5
  if (lead.language === 'ar' || lead.language === 'fr' || lead.language === 'de') score += 5

  if (score >= 80) return 'hot'
  if (score >= 60) return 'warm'
  return 'cold'
}

function getSequenceForLead(lead, type = null) {
  if (type) return EMAIL_TEMPLATES[type] || EMAIL_TEMPLATES.cold_lead

  const category = scoreLead(lead)
  const typeMap = {
    hot: SEQUENCE_TYPES.HOT_LEAD,
    warm: SEQUENCE_TYPES.WARM_LEAD,
    cold: SEQUENCE_TYPES.COLD_LEAD,
  }
  return EMAIL_TEMPLATES[typeMap[category]] || EMAIL_TEMPLATES.cold_lead
}

async function enrollLeadInSequence(lead, sequenceType = null) {
  const db = getDb()
  const sequence = getSequenceForLead(lead, sequenceType)

  db.prepare('DELETE FROM email_queue WHERE lead_email = ? AND sequence_type = ?').run(
    lead.email, sequenceType || 'auto'
  )

  const insert = db.prepare(`
    INSERT INTO email_queue (lead_email, lead_name, sequence_type, template_index, scheduled_at, status, lead_id, source, language)
    VALUES (?, ?, ?, ?, datetime('now', '+' || ? || ' days'), 'pending', ?, ?, ?)
  `)

  const insertLog = db.prepare(`
    INSERT INTO sales_engine_log (action, lead_email, lead_name, sequence_type, details, lead_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  let enrolled = 0
  const leadName = extractName(lead)

  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i]
    insert.run(
      lead.email,
      leadName,
      sequenceType || 'auto',
      i,
      step.day,
      lead.id || null,
      lead.source || 'unknown',
      lead.language || 'en'
    )
    enrolled++
  }

  insertLog.run(
    'enrolled',
    lead.email,
    leadName,
    sequenceType || 'auto',
    `Enrolled in ${sequence.length}-step sequence`,
    lead.id || null
  )

  return enrolled
}

function extractName(lead) {
  if (lead.customer_name && lead.customer_name.trim()) return lead.customer_name.trim()
  if (lead.lead_contact && lead.lead_contact.startsWith('@')) {
    return lead.lead_contact.replace('@', '').replace(/_/g, ' ').replace(/[^a-zA-Z0-9 ]/g, '')
  }
  if (lead.email) {
    const part = lead.email.split('@')[0]
    return part.split(/[0-9._-]/)[0].replace(/[._-]/g, ' ').trim() || 'there'
  }
  return 'there'
}

async function enrollTrialUser(orderId, customerEmail, customerName, trialPlan) {
  const db = getDb()
  const sequence = EMAIL_TEMPLATES[SEQUENCE_TYPES.TRIAL_TO_PAID]

  db.prepare('DELETE FROM email_queue WHERE lead_email = ? AND sequence_type = ?').run(
    customerEmail, SEQUENCE_TYPES.TRIAL_TO_PAID
  )

  const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || 'http://localhost:3000'
  const checkoutUrl = `${siteUrl}/#plans`
  const extraData = JSON.stringify({ checkout_url: checkoutUrl, trial_url: `${siteUrl}/#trial` })

  const insert = db.prepare(`
    INSERT INTO email_queue (lead_email, lead_name, sequence_type, template_index, scheduled_at, status, lead_id, source, language, extra_data)
    VALUES (?, ?, ?, ?, datetime('now', '+' || ? || ' days'), 'pending', ?, ?, ?, ?)
  `)

  const insertLog = db.prepare(`
    INSERT INTO sales_engine_log (action, lead_email, lead_name, sequence_type, details, lead_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  let enrolled = 0
  const name = customerName || 'there'

  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i]
    insert.run(
      customerEmail,
      name,
      SEQUENCE_TYPES.TRIAL_TO_PAID,
      i,
      step.day,
      orderId,
      'trial',
      'en',
      extraData
    )
    enrolled++
  }

  insertLog.run(
    'enrolled',
    customerEmail,
    name,
    SEQUENCE_TYPES.TRIAL_TO_PAID,
    `Trial-to-paid sequence (${sequence.length} emails)`,
    orderId
  )

  return enrolled
}

async function enrollAbandonedCart(customerEmail, customerName, planName, amount, checkoutUrl) {
  const db = getDb()
  const sequence = EMAIL_TEMPLATES[SEQUENCE_TYPES.ABANDONED_CART]

  db.prepare('DELETE FROM email_queue WHERE lead_email = ? AND sequence_type = ?').run(
    customerEmail, SEQUENCE_TYPES.ABANDONED_CART
  )

  const insert = db.prepare(`
    INSERT INTO email_queue (lead_email, lead_name, sequence_type, template_index, scheduled_at, status, source, language, extra_data)
    VALUES (?, ?, ?, ?, datetime('now', '+' || ? || ' days'), 'pending', 'checkout', 'en', ?)
  `)

  const insertLog = db.prepare(`
    INSERT INTO sales_engine_log (action, lead_email, lead_name, sequence_type, details)
    VALUES (?, ?, ?, ?, ?)
  `)

  const name = customerName || 'there'
  const extraData = JSON.stringify({ plan_name: planName, amount, checkout_url: checkoutUrl })

  let enrolled = 0
  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i]
    insert.run(
      customerEmail,
      name,
      SEQUENCE_TYPES.ABANDONED_CART,
      i,
      step.day,
      extraData
    )
    enrolled++
  }

  insertLog.run(
    'enrolled',
    customerEmail,
    name,
    SEQUENCE_TYPES.ABANDONED_CART,
    `Abandoned cart sequence (${sequence.length} emails) for ${planName}`
  )

  return enrolled
}

async function processEmailQueue() {
  const db = getDb()
  const transporter = getTransporter()

  const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || 'Dalletek'
  const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || 'http://localhost:3000'

  const pending = db.prepare(`
    SELECT eq.*, ss.intent_score, ss.source, ss.language as lead_language, ss.pain_point, ss.opportunity
    FROM email_queue eq
    LEFT JOIN demand_signals ss ON eq.lead_id = ss.id
    WHERE eq.status = 'pending' AND eq.scheduled_at <= datetime('now')
    ORDER BY eq.scheduled_at ASC
    LIMIT 20
  `).all()

  for (const job of pending) {
    try {
      let template
      const sequenceType = job.sequence_type

      if (sequenceType === SEQUENCE_TYPES.TRIAL_TO_PAID || sequenceType === SEQUENCE_TYPES.ABANDONED_CART) {
        template = EMAIL_TEMPLATES[sequenceType]?.[job.template_index]
      } else {
        const category = scoreLead({ intent_score: job.intent_score })
        const typeMap = { hot: SEQUENCE_TYPES.HOT_LEAD, warm: SEQUENCE_TYPES.WARM_LEAD, cold: SEQUENCE_TYPES.COLD_LEAD }
        template = EMAIL_TEMPLATES[typeMap[category]]?.[job.template_index]
      }

      if (!template) continue

      let body = template.body
      let subject = template.subject

      const replacements = {
        name: job.lead_name || 'there',
        country: 'your area',
        trial_url: `${siteUrl}/#trial`,
        checkout_url: job.extra_data ? JSON.parse(job.extra_data)?.checkout_url || `${siteUrl}/#plans` : `${siteUrl}/#plans`,
        plan_name: job.extra_data ? JSON.parse(job.extra_data)?.plan_name || 'our IPTV service' : 'our IPTV service',
        amount: job.extra_data ? JSON.parse(job.extra_data)?.amount || '9.99' : '9.99',
      }

      for (const [k, v] of Object.entries(replacements)) {
        body = body.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
        subject = subject.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
      }

      const emailHtml = renderEmail(body, siteName)

      await transporter.sendMail({
        from: `"${siteName}" <${transporter.fromEmail || 'noreply@iptvboss.com'}>`,
        to: job.lead_email,
        subject,
        html: emailHtml,
      })

      db.prepare("UPDATE email_queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?").run(job.id)

      db.prepare(`
        INSERT INTO sales_engine_log (action, lead_email, sequence_type, details)
        VALUES ('sent', ?, ?, ?)
      `).run(job.lead_email, job.sequence_type, `Email ${job.template_index + 1} sent: ${subject}`)

    } catch (e) {
      console.error(`[SalesEngine] Failed to send email to ${job.lead_email}:`, e.message)
      db.prepare("UPDATE email_queue SET status = 'failed' WHERE id = ?").run(job.id)
    }
  }

  return pending.length
}

function renderEmail(body, siteName) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;padding:40px;">
<div style="text-align:center;margin-bottom:32px;">
<h1 style="color:#00d4ff;font-size:24px;margin:0;">${siteName}</h1>
</div>
<div style="color:#e0e0e0;font-size:15px;line-height:1.7;white-space:pre-wrap;">${body}</div>
</div>
<div style="text-align:center;margin-top:24px;color:#666;font-size:13px;">
<p>${siteName} — Want to unsubscribe? <a href="{{unsubscribe}}" style="color:#666;">Click here</a></p>
</div>
</div>
</body></html>`
}

async function sendWhatsApp(phone, message) {
  const db = getDb()
  const whatsappApiKey = (db.prepare("SELECT value FROM app_settings WHERE key = 'whatsapp_api_key'").get() || {}).value
  const whatsappApiUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'whatsapp_api_url'").get() || {}).value || 'https://graph.facebook.com/v18.0/me/messages'

  if (!whatsappApiKey) {
    console.log('[SalesEngine] WhatsApp API key not configured')
    return { success: false, error: 'whatsapp_not_configured' }
  }

  try {
    const phoneNumber = phone.replace(/[^0-9+]/g, '')
    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message },
      }),
    })

    const result = await response.json()
    if (result.messages?.[0]?.id) {
      db.prepare(`
        INSERT INTO sales_engine_log (action, details, source)
        VALUES ('whatsapp_sent', ?, ?)
      `).run(`WhatsApp to ${phone}: ${message.substring(0, 50)}...`, phone)
      return { success: true }
    }
    return { success: false, error: result }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function outreachToHotLeads() {
  const db = getDb()
  const hotLeads = db.prepare(`
    SELECT ds.*, o.id as order_id, o.status as order_status
    FROM demand_signals ds
    LEFT JOIN orders o ON o.customer_email = ds.email AND o.status = 'completed'
    WHERE ds.status = 'new'
      AND ds.email != ''
      AND ds.email IS NOT NULL
      AND ds.intent_score >= 60
      AND ds.email NOT IN (SELECT lead_email FROM email_queue WHERE status = 'sent')
    ORDER BY ds.intent_score DESC, ds.created_at DESC
    LIMIT 50
  `).all()

  let enrolled = 0
  for (const lead of hotLeads) {
    if (lead.order_id) continue
    const count = await enrollLeadInSequence(lead)
    enrolled += count > 0 ? 1 : 0
  }

  return enrolled
}

async function convertTrialUsers() {
  const db = getDb()
  const recentlyCompletedTrials = db.prepare(`
    SELECT o.*, pp.plan_name, pc.name as provider_name
    FROM orders o
    JOIN provider_plans pp ON o.plan_id = pp.id
    JOIN providers_catalog pc ON pp.provider_id = pc.id
    WHERE o.is_trial = 1
      AND o.status = 'completed'
      AND o.created_at >= datetime('now', '-4 days')
      AND o.customer_email NOT IN (SELECT lead_email FROM email_queue WHERE sequence_type = ?)
    ORDER BY o.created_at DESC
  `).all(SEQUENCE_TYPES.TRIAL_TO_PAID)

  let enrolled = 0
  for (const trial of recentlyCompletedTrials) {
    const count = await enrollTrialUser(trial.id, trial.customer_email, trial.customer_name, trial)
    enrolled += count > 0 ? 1 : 0
  }

  return enrolled
}

async function convertAbandonedCarts() {
  const db = getDb()
  const abandoned = db.prepare(`
    SELECT * FROM orders
    WHERE status = 'pending'
      AND source IN ('direct_buy', 'stripe', 'paypal')
      AND created_at >= datetime('now', '-2 days')
      AND customer_email NOT IN (SELECT lead_email FROM email_queue WHERE sequence_type = ?)
    ORDER BY created_at DESC
    LIMIT 20
  `).all(SEQUENCE_TYPES.ABANDONED_CART)

  let enrolled = 0
  for (const order of abandoned) {
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || 'http://localhost:3000'
    const checkoutUrl = `${siteUrl}/checkout?order=${order.id}`
    const plan = db.prepare('SELECT plan_name FROM provider_plans WHERE id = ?').get(order.plan_id)
    const count = await enrollAbandonedCart(
      order.customer_email,
      order.customer_name,
      plan?.plan_name || 'IPTV Plan',
      order.amount,
      checkoutUrl
    )
    enrolled += count > 0 ? 1 : 0
  }

  return enrolled
}

function getSalesEngineStats() {
  const db = getDb()

  const totalLeads = db.prepare("SELECT COUNT(*) as c FROM demand_signals WHERE status != 'dismissed'").get().c
  const enrolledInSequence = db.prepare("SELECT COUNT(DISTINCT lead_email) as c FROM email_queue WHERE status IN ('sent', 'pending')").get().c
  const emailsSent = db.prepare("SELECT COUNT(*) as c FROM email_queue WHERE status = 'sent'").get().c
  const emailsPending = db.prepare("SELECT COUNT(*) as c FROM email_queue WHERE status = 'pending'").get().c
  const whatsappSent = db.prepare("SELECT COUNT(*) as c FROM sales_engine_log WHERE action = 'whatsapp_sent'").get().c

  const bySequence = db.prepare(`
    SELECT sequence_type, COUNT(*) as total, SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent
    FROM email_queue GROUP BY sequence_type
  `).all()

  const recentActivity = db.prepare(`
    SELECT * FROM sales_engine_log ORDER BY created_at DESC LIMIT 20
  `).all()

  const conversionRate = totalLeads > 0 ? Math.round((enrolledInSequence / totalLeads) * 100) : 0

  return {
    totalLeads,
    enrolledInSequence,
    emailsSent,
    emailsPending,
    whatsappSent,
    bySequence,
    recentActivity,
    conversionRate,
  }
}

function ensureTables() {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_email TEXT NOT NULL,
      lead_name TEXT,
      sequence_type TEXT NOT NULL,
      template_index INTEGER DEFAULT 0,
      scheduled_at TEXT,
      status TEXT DEFAULT 'pending',
      sent_at TEXT,
      lead_id INTEGER,
      source TEXT,
      language TEXT,
      extra_data TEXT
    );

    CREATE TABLE IF NOT EXISTS sales_engine_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      lead_email TEXT,
      lead_name TEXT,
      sequence_type TEXT,
      details TEXT,
      lead_id INTEGER,
      source TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
    CREATE INDEX IF NOT EXISTS idx_email_queue_email ON email_queue(lead_email);
    CREATE INDEX IF NOT EXISTS idx_sales_log_action ON sales_engine_log(action);
  `)
}

function startSalesEngine() {
  const cron = require('node-cron')

  ensureTables()

  cron.schedule('*/15 * * * *', async () => {
    try {
      const processed = await processEmailQueue()
      if (processed > 0) {
        console.log(`[SalesEngine] Processed ${processed} emails`)
      }
    } catch (e) {
      console.error('[SalesEngine] Email queue error:', e.message)
    }
  })

  cron.schedule('0 */2 * * *', async () => {
    try {
      const enrolled = await outreachToHotLeads()
      if (enrolled > 0) {
        const db = getDb()
        db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
          'SalesEngine', 'hot_lead_enroll', `Enrolled ${enrolled} hot leads in email sequence`
        )
      }
    } catch (e) {
      console.error('[SalesEngine] Hot lead outreach error:', e.message)
    }
  })

  cron.schedule('0 */3 * * *', async () => {
    try {
      const enrolled = await convertTrialUsers()
      if (enrolled > 0) {
        const db = getDb()
        db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
          'SalesEngine', 'trial_conversion', `Enrolled ${enrolled} trial users in follow-up sequence`
        )
      }
    } catch (e) {
      console.error('[SalesEngine] Trial conversion error:', e.message)
    }
  })

  cron.schedule('0 */4 * * *', async () => {
    try {
      const enrolled = await convertAbandonedCarts()
      if (enrolled > 0) {
        const db = getDb()
        db.prepare('INSERT INTO agent_log (agent, action, details) VALUES (?, ?, ?)').run(
          'SalesEngine', 'abandoned_cart', `Enrolled ${enrolled} abandoned carts in recovery sequence`
        )
      }
    } catch (e) {
      console.error('[SalesEngine] Abandoned cart error:', e.message)
    }
  })

  console.log('[SalesEngine] Sales engine started — email sequences, lead scoring, and auto-conversion active')
}

module.exports = {
  startSalesEngine,
  enrollLeadInSequence,
  enrollTrialUser,
  enrollAbandonedCart,
  processEmailQueue,
  sendWhatsApp,
  getSalesEngineStats,
  scoreLead,
  ensureTables,
  SEQUENCE_TYPES,
  EMAIL_TEMPLATES,
}