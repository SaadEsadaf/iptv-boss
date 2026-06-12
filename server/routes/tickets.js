const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

function generateRef() {
  return 'TKT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Create ticket (public)
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    let { name, email, subject, message, order_id, user_token } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'email, subject, and message required' });
    }

    email = String(email).trim().toLowerCase();
    if (!email.includes('@') || email.length > 254) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    subject = String(subject).trim().slice(0, 200);
    message = String(message).trim().slice(0, 5000);
    name = String(name || email.split('@')[0]).trim().slice(0, 100);

    let customerUserId = null;
    if (user_token) {
      try {
        const { verifyToken } = require('../services/auth');
        const payload = verifyToken(user_token);
        if (payload && payload.id) {
          customerUserId = payload.id;
          const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(payload.id);
          if (user) {
            name = user.name || name;
            email = user.email;
          }
        }
      } catch (e) {}
    }

    const ref = generateRef();
    const result = db.prepare(
      "INSERT INTO tickets (subject, status, priority, customer_name, customer_email, customer_user_id, source, order_id, ref_code) VALUES (?, 'open', 'normal', ?, ?, ?, 'web', ?, ?)"
    ).run(subject, name, email, customerUserId, order_id || null, ref);

    const ticketId = result.lastInsertRowid;

    db.prepare(
      "INSERT INTO ticket_messages (ticket_id, author, author_email, message, is_admin) VALUES (?, ?, ?, ?, 0)"
    ).run(ticketId, name, email, message);

    // Notify admin via email
    try {
      const emailService = require('../services/emailService');
      const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || 'Dalletek';
      await emailService.sendRaw({
        to: 'babilon26@gmail.com',
        subject: `[${siteName}] New Ticket #${ref}: ${subject}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2>New Support Ticket</h2>
          <p><strong>From:</strong> ${sanitize(name)} (${sanitize(email)})</p>
          <p><strong>Subject:</strong> ${sanitize(subject)}</p>
          <p><strong>Ref:</strong> ${ref}</p>
          <hr>
          <p>${sanitize(message).replace(/\n/g, '<br>')}</p>
          <hr>
          <p><a href="https://lab.jobtool.shop/#tickets/${ticketId}" style="background:#00d4ff;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;">View in Dashboard</a></p>
        </div>`,
      });
    } catch (e) {
      console.error('[Ticket] Email notification failed:', e.message);
    }

    // Notify via WhatsApp
    try {
      const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
      const phone = '0031687402093';
      const text = `📬 *New Ticket #${ref}*\nFrom: ${sanitize(name)} <${sanitize(email)}>\nSubject: ${sanitize(subject)}\n\n${sanitize(message).slice(0, 300)}`;
      fetch(`https://wa.quadrate.live/send?phone=${phone}&text=${encodeURIComponent(text)}`).catch(() => {});
    } catch (e) {}

    res.json({ success: true, ticket: { id: ticketId, ref, subject, status: 'open' } });
  } catch (e) {
    console.error('[Ticket] Create error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Email inbound webhook (Brevo / SendGrid format)
router.post('/email-inbound', async (req, res) => {
  try {
    const db = getDb();
    const { From, To, Subject, TextBody, HtmlBody, Attachments, Headers } = req.body;
    const fromEmail = (From || '').replace(/.*<([^>]+)>/, '$1').trim().toLowerCase();
    const subject = Subject || '';
    const text = TextBody || HtmlBody || '';

    if (!fromEmail || !text) {
      return res.status(200).json({ received: true });
    }

    const refMatch = subject.match(/TKT-[A-Z0-9]+/) || text.match(/TKT-[A-Z0-9]+/);
    if (!refMatch) {
      return res.status(200).json({ received: true, note: 'No ref found' });
    }
    const ref = refMatch[0];

    const ticket = db.prepare('SELECT * FROM tickets WHERE ref_code = ?').get(ref);
    if (!ticket) {
      return res.status(200).json({ received: true, note: 'Ticket not found' });
    }

    const reply = text.replace(/On .+ wrote:/s, '').replace(/>.+$/gm, '').trim().slice(0, 5000);
    if (!reply) return res.status(200).json({ received: true, note: 'Empty reply' });

    const authorName = fromEmail === ticket.customer_email ? ticket.customer_name || fromEmail : fromEmail;
    const isAdmin = fromEmail === 'babilon26@gmail.com' ? 1 : 0;

    db.prepare(
      "INSERT INTO ticket_messages (ticket_id, author, author_email, message, is_admin) VALUES (?, ?, ?, ?, ?)"
    ).run(ticket.id, authorName, fromEmail, reply, isAdmin);
    db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(isAdmin ? 'pending' : 'open', ticket.id);

    res.json({ received: true, ticket_id: ticket.id });
  } catch (e) {
    console.error('[Ticket] Email inbound error:', e);
    res.status(200).json({ received: true });
  }
});

// List tickets
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { email, user_id, status, limit } = req.query;

    let query = "SELECT t.*, (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as msg_count, (SELECT message FROM ticket_messages WHERE ticket_id = t.id ORDER BY id DESC LIMIT 1) as last_message FROM tickets t WHERE 1=1";
    const params = [];

    if (email) {
      query += ' AND t.customer_email = ?';
      params.push(String(email).trim().toLowerCase());
    }
    if (user_id) {
      query += ' AND t.customer_user_id = ?';
      params.push(parseInt(user_id));
    }
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    query += ' ORDER BY t.updated_at DESC';
    if (limit) query += ' LIMIT ?';
    params.push(parseInt(limit) || 100);

    const tickets = db.prepare(query).all(...params);
    res.json({ tickets });
  } catch (e) {
    console.error('[Ticket] List error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get single ticket with messages
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC').all(ticket.id);
    res.json({ ticket, messages });
  } catch (e) {
    console.error('[Ticket] Get error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get ticket by ref
router.get('/ref/:ref', (req, res) => {
  try {
    const db = getDb();
    const ticket = db.prepare('SELECT * FROM tickets WHERE ref_code = ?').get(req.params.ref);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC').all(ticket.id);
    res.json({ ticket, messages });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Reply to ticket
router.post('/:id/reply', async (req, res) => {
  try {
    const db = getDb();
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    let { message, author, author_email, is_admin } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    message = String(message).trim().slice(0, 5000);
    author = String(author || 'Support').trim().slice(0, 100);
    author_email = String(author_email || '').trim().slice(0, 254);
    is_admin = is_admin ? 1 : 0;

    db.prepare(
      "INSERT INTO ticket_messages (ticket_id, author, author_email, message, is_admin) VALUES (?, ?, ?, ?, ?)"
    ).run(ticket.id, author, author_email, message, is_admin);

    const newStatus = is_admin ? 'pending' : 'open';
    db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, ticket.id);

    // Notify customer by email if admin replied
    if (is_admin && ticket.customer_email) {
      try {
        const emailService = require('../services/emailService');
        const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || 'Dalletek';
        await emailService.sendRaw({
          to: ticket.customer_email,
          subject: `Re: [${siteName}] #${ticket.ref_code} ${ticket.subject}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr style="margin:20px 0">
            <p style="color:#666;font-size:12px;">Ticket #${ticket.ref_code} — <a href="https://dalletek.live/support?ref=${ticket.ref_code}" style="color:#00d4ff;">View online</a></p>
          </div>`,
        });
      } catch (e) {
        console.error('[Ticket] Reply email error:', e);
      }
    }

    // Notify admin if customer replied
    if (!is_admin) {
      try {
        const emailService = require('../services/emailService');
        const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || 'Dalletek';
        await emailService.sendRaw({
          to: 'babilon26@gmail.com',
          subject: `[${siteName}] New reply on #${ticket.ref_code}: ${ticket.subject}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <p><strong>${author}</strong> replied:</p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <p><a href="https://lab.jobtool.shop/#tickets/${ticket.id}" style="background:#00d4ff;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;">View in Dashboard</a></p>
          </div>`,
        });
      } catch (e) {}
      try {
        const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
        fetch(`https://wa.quadrate.live/send?phone=0031687402093&text=${encodeURIComponent('📬 Reply on #' + ticket.ref_code + ': ' + message.slice(0, 200))}`).catch(() => {});
      } catch (e) {}
    }

    const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC').all(ticket.id);
    res.json({ success: true, messages });
  } catch (e) {
    console.error('[Ticket] Reply error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Update ticket status
router.patch('/:id/status', (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    const validStatuses = ['open', 'pending', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const result = db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Ticket not found' });

    res.json({ success: true, status });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
