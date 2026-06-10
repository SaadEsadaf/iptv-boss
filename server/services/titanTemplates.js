const { getDb } = require('../db');
const { titan } = require('./titanHub');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMPLATE_TYPES = {
  landing_page: {
    name: 'Landing Page',
    description: 'HTML templates for dynamic landing pages',
    extension: 'html',
    injectPath: 'client/public/templates',
    variables: ['title', 'heroTitle', 'heroDesc', 'features', 'pricing', 'cta', 'footer'],
  },
  email_sequence: {
    name: 'Email Sequence',
    description: 'Email templates for sales sequences',
    extension: 'json',
    injectPath: 'server/templates/emails',
    variables: ['subject', 'body', 'cta', 'signature', 'unsubscribe'],
  },
  chat_response: {
    name: 'Chat Response',
    description: 'AI chat bot response templates',
    extension: 'json',
    injectPath: 'server/templates/chat',
    variables: ['greeting', 'objection_handler', 'trial_offer', 'upgrade_pitch', 'goodbye'],
  },
  social_post: {
    name: 'Social Media Post',
    description: 'Templates for social media posts',
    extension: 'json',
    injectPath: 'server/templates/social',
    variables: ['headline', 'body', 'hashtags', 'cta', 'image_prompt'],
  },
  whatsapp_message: {
    name: 'WhatsApp Message',
    description: 'WhatsApp marketing message templates',
    extension: 'json',
    injectPath: 'server/templates/whatsapp',
    variables: ['greeting', 'offer', 'cta', 'signature'],
  },
  ad_copy: {
    name: 'Ad Copy',
    description: 'Advertising copy templates',
    extension: 'json',
    injectPath: 'server/templates/ads',
    variables: ['headline', 'primary_text', 'cta', 'description'],
  },
  push_notification: {
    name: 'Push Notification',
    description: 'Browser push notification templates',
    extension: 'json',
    injectPath: 'server/templates/push',
    variables: ['title', 'body', 'icon', 'url'],
  },
  sms_message: {
    name: 'SMS Message',
    description: 'SMS marketing templates',
    extension: 'json',
    injectPath: 'server/templates/sms',
    variables: ['message', 'short_url', 'optout'],
  },
  popup_modal: {
    name: 'Popup Modal',
    description: 'Exit intent and promotional popup templates',
    extension: 'html',
    injectPath: 'client/public/templates/popups',
    variables: ['title', 'subtitle', 'offer', 'cta', 'form_fields'],
  },
  video_script: {
    name: 'Video Script',
    description: 'YouTube/TikTok video ad scripts',
    extension: 'json',
    injectPath: 'server/templates/video',
    variables: ['hook', 'problem', 'solution', 'cta', 'duration'],
  },
};

class TitanTemplateEngine {
  constructor() {
    this.templates = new Map();
    this.activeInjections = new Map();
    this.abTests = new Map();
  }

  async init() {
    const db = getDb();
    this.ensureTables(db);
    this.loadTemplates(db);
    console.log('[TITAN-TEMPLATES] Template engine initialized.');
  }

  ensureTables(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS titan_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        variables TEXT,
        metadata TEXT,
        active INTEGER DEFAULT 0,
        ab_test_id TEXT,
        conversion_rate REAL DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, type)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS titan_injections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER,
        target TEXT NOT NULL,
        position TEXT DEFAULT 'append',
        conditions TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES titan_templates(id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS titan_ab_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        template_ids TEXT NOT NULL,
        traffic_split TEXT DEFAULT '50,50',
        winner_id INTEGER,
        status TEXT DEFAULT 'running',
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        results TEXT
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS titan_template_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER,
        injection_id INTEGER,
        event_type TEXT,
        user_id TEXT,
        session_id TEXT,
        metadata TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  loadTemplates(db) {
    const templates = db.prepare('SELECT * FROM titan_templates').all();
    for (const t of templates) {
      this.templates.set(`${t.type}:${t.name}`, t);
    }
  }

  async generateTemplate(type, prompt, variables = {}) {
    const templateType = TEMPLATE_TYPES[type];
    if (!templateType) {
      throw new Error(`Unknown template type: ${type}`);
    }

    const titanPrompt = `Generate a ${templateType.name} template for an IPTV service.

Context:
- Service: LuxStream Premium IPTV
- Features: 25,000+ channels, 10,000+ movies, 5,000+ series, 4K HDR
- Target: Sports fans, movie lovers, families cutting cable
- Current event: FIFA World Cup 2026
- Pricing: Monthly $12.99, Yearly $99 (save 20%)

User Request: ${prompt}

Required Variables: ${templateType.variables.join(', ')}

Generate the template in ${templateType.extension} format. Include all required variables as placeholders like {{variable_name}}.

Template:`;

    const content = await titan.generate(titanPrompt);
    return this.parseTemplate(content, type);
  }

  parseTemplate(content, type) {
    const templateType = TEMPLATE_TYPES[type];
    let parsed = { content: '', variables: [] };

    try {
      if (templateType.extension === 'json') {
        // Try to parse as JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = { content: content, variables: this.extractVariables(content) };
        }
      } else {
        parsed = { content: content, variables: this.extractVariables(content) };
      }
    } catch (e) {
      parsed = { content: content, variables: this.extractVariables(content) };
    }

    return parsed;
  }

  extractVariables(content) {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    return [...new Set(matches)];
  }

  async saveTemplate(name, type, content, variables = {}, metadata = {}) {
    const db = getDb();
    const parsed = typeof content === 'string' ? this.parseTemplate(content, type) : content;
    
    const templateVars = variables.length > 0 ? JSON.stringify(variables) : JSON.stringify(parsed.variables || []);
    const meta = JSON.stringify(metadata);
    
    const existing = db.prepare('SELECT id FROM titan_templates WHERE name = ? AND type = ?').get(name, type);
    
    if (existing) {
      db.prepare(`
        UPDATE titan_templates 
        SET content = ?, variables = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(parsed.content, templateVars, meta, existing.id);
      
      this.templates.set(`${type}:${name}`, { id: existing.id, name, type, content: parsed.content, variables: parsed.variables, metadata });
      return { id: existing.id, name, type, action: 'updated' };
    } else {
      const result = db.prepare(`
        INSERT INTO titan_templates (name, type, content, variables, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(name, type, parsed.content, templateVars, meta);
      
      const template = { id: result.lastInsertRowid, name, type, content: parsed.content, variables: parsed.variables, metadata };
      this.templates.set(`${type}:${name}`, template);
      return { id: result.lastInsertRowid, name, type, action: 'created' };
    }
  }

  async injectTemplate(templateId, target, position = 'append', conditions = {}) {
    const db = getDb();
    const template = db.prepare('SELECT * FROM titan_templates WHERE id = ?').get(templateId);
    if (!template) throw new Error('Template not found');

    const result = db.prepare(`
      INSERT INTO titan_injections (template_id, target, position, conditions)
      VALUES (?, ?, ?, ?)
    `).run(templateId, target, position, JSON.stringify(conditions));

    const injection = {
      id: result.lastInsertRowid,
      template_id: templateId,
      target,
      position,
      conditions,
    };

    this.activeInjections.set(`${target}:${position}`, injection);
    return injection;
  }

  async renderTemplate(name, type, variables = {}) {
    const template = this.templates.get(`${type}:${name}`);
    if (!template) throw new Error(`Template ${type}:${name} not found`);

    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return content;
  }

  async getTemplateForABTest(abTestId, userId) {
    const db = getDb();
    const test = db.prepare('SELECT * FROM titan_ab_tests WHERE id = ?').get(abTestId);
    if (!test || test.status !== 'running') return null;

    const templateIds = JSON.parse(test.template_ids);
    const split = JSON.parse(test.traffic_split);
    
    // Simple hash-based assignment
    const hash = userId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const variant = Math.abs(hash) % 100;
    
    let cumulative = 0;
    let selectedIndex = 0;
    for (let i = 0; i < split.length; i++) {
      cumulative += split[i];
      if (variant < cumulative) {
        selectedIndex = i;
        break;
      }
    }

    const templateId = templateIds[selectedIndex];
    return db.prepare('SELECT * FROM titan_templates WHERE id = ?').get(templateId);
  }

  async logEvent(templateId, injectionId, eventType, userId, sessionId, metadata = {}) {
    const db = getDb();
    db.prepare(`
      INSERT INTO titan_template_logs (template_id, injection_id, event_type, user_id, session_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(templateId, injectionId, eventType, userId, sessionId, JSON.stringify(metadata));
  }

  async getAnalytics(templateId, days = 7) {
    const db = getDb();
    const impressions = db.prepare(`
      SELECT COUNT(*) as count FROM titan_template_logs 
      WHERE template_id = ? AND event_type = 'impression' AND timestamp > datetime('now', '-${days} days')
    `).get(templateId);

    const clicks = db.prepare(`
      SELECT COUNT(*) as count FROM titan_template_logs 
      WHERE template_id = ? AND event_type = 'click' AND timestamp > datetime('now', '-${days} days')
    `).get(templateId);

    const conversions = db.prepare(`
      SELECT COUNT(*) as count FROM titan_template_logs 
      WHERE template_id = ? AND event_type = 'conversion' AND timestamp > datetime('now', '-${days} days')
    `).get(templateId);

    const ctr = impressions.count > 0 ? (clicks.count / impressions.count * 100).toFixed(2) : 0;
    const cvr = clicks.count > 0 ? (conversions.count / clicks.count * 100).toFixed(2) : 0;

    return {
      impressions: impressions.count,
      clicks: clicks.count,
      conversions: conversions.count,
      ctr: `${ctr}%`,
      cvr: `${cvr}%`,
      days,
    };
  }

  async createABTest(name, templateIds, trafficSplit = [50, 50]) {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO titan_ab_tests (name, template_ids, traffic_split)
      VALUES (?, ?, ?)
    `).run(name, JSON.stringify(templateIds), JSON.stringify(trafficSplit));

    return { id: result.lastInsertRowid, name, templateIds, trafficSplit };
  }

  async endABTest(testId, winnerId) {
    const db = getDb();
    db.prepare(`
      UPDATE titan_ab_tests 
      SET status = 'completed', winner_id = ?, end_date = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(winnerId, testId);

    // Activate winner, deactivate losers
    const test = db.prepare('SELECT * FROM titan_ab_tests WHERE id = ?').get(testId);
    const templateIds = JSON.parse(test.template_ids);
    
    for (const id of templateIds) {
      db.prepare('UPDATE titan_templates SET active = ? WHERE id = ?').run(id === winnerId ? 1 : 0, id);
    }

    return { winnerId, testId };
  }

  async getTemplates(type = null, active = null) {
    const db = getDb();
    let query = 'SELECT * FROM titan_templates';
    const params = [];
    
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    if (active !== null) {
      query += params.length > 0 ? ' AND active = ?' : ' WHERE active = ?';
      params.push(active ? 1 : 0);
    }
    
    query += ' ORDER BY updated_at DESC';
    return db.prepare(query).all(...params);
  }

  async getInjections(active = null) {
    const db = getDb();
    let query = 'SELECT i.*, t.name as template_name, t.type as template_type FROM titan_injections i JOIN titan_templates t ON i.template_id = t.id';
    if (active !== null) {
      query += ' WHERE i.active = ?';
      return db.prepare(query).all(active ? 1 : 0);
    }
    return db.prepare(query).all();
  }

  async getABTests(status = null) {
    const db = getDb();
    let query = 'SELECT * FROM titan_ab_tests';
    if (status) {
      query += ' WHERE status = ?';
      return db.prepare(query).all(status);
    }
    return db.prepare(query).all();
  }

  async deleteTemplate(id) {
    const db = getDb();
    db.prepare('DELETE FROM titan_templates WHERE id = ?').run(id);
    db.prepare('DELETE FROM titan_injections WHERE template_id = ?').run(id);
    return { deleted: true };
  }

  async deactivateInjection(id) {
    const db = getDb();
    db.prepare('UPDATE titan_injections SET active = 0 WHERE id = ?').run(id);
    return { deactivated: true };
  }

  async bulkGenerateCampaign(campaignName, type, count = 5) {
    const templates = [];
    const angles = [
      'Sports fanatics - World Cup 2026',
      'Movie lovers - 10,000+ VOD library',
      'Families - Multi-device support',
      'Cord cutters - Save money vs cable',
      'Tech enthusiasts - 4K HDR quality',
      'International users - 25,000+ channels',
      'Trial seekers - No credit card required',
      'Price sensitive - 20% yearly discount',
    ];

    for (let i = 0; i < count; i++) {
      const angle = angles[i % angles.length];
      const prompt = `Create a ${type} template for: ${angle}. Campaign: ${campaignName}`;
      const generated = await this.generateTemplate(type, prompt);
      const saved = await this.saveTemplate(
        `${campaignName}_${type}_${i + 1}`,
        type,
        generated.content,
        generated.variables,
        { campaign: campaignName, angle, generated: true }
      );
      templates.push(saved);
    }

    return { campaign: campaignName, type, count, templates };
  }

  async autoOptimize(templateId) {
    const analytics = await this.getAnalytics(templateId, 7);
    const db = getDb();
    const template = db.prepare('SELECT * FROM titan_templates WHERE id = ?').get(templateId);
    
    if (analytics.ctr < 2) {
      // Low CTR - generate improved version
      const prompt = `Improve this template for higher click-through rate. Current CTR: ${analytics.ctr}.

Current template:
${template.content}

Make it more compelling, urgent, and personalized. Add stronger CTAs.

Improved template:`;

      const improved = await titan.generate(prompt);
      const parsed = this.parseTemplate(improved, template.type);
      
      return await this.saveTemplate(
        `${template.name}_v2`,
        template.type,
        parsed.content,
        parsed.variables,
        { parent_id: templateId, optimized: true, original_ctr: analytics.ctr }
      );
    }

    return { message: 'Template is already performing well. No optimization needed.', analytics };
  }
}

const templateEngine = new TitanTemplateEngine();
module.exports = { templateEngine, TEMPLATE_TYPES };
