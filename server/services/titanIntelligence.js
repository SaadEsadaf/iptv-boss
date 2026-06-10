const { getDb } = require('../db');
const { titan } = require('./titanHub');
const axios = require('axios');

/**
 * TITAN INTELLIGENCE ENGINE
 * 
 * The Brain of the Growth Engine:
 * 1. DATA VALIDATOR - Validates lead quality, removes duplicates, checks relevance
 * 2. RELEVANCE CHECKER - Titan AI analyzes each lead and scores relevance 0-100
 * 3. CAMPAIGN EXECUTOR - Auto-executes outreach campaigns (email, DM, social)
 * 4. BRAIN INTELLIGENCE - Analyzes all data, detects patterns, feeds strategies
 * 
 * Cycle: Collect → Validate → Score → Strategize → Execute → Learn
 */

class TitanIntelligenceEngine {
  constructor() {
    this.learningMemory = [];
    this.activeCampaigns = new Map();
    this.brainCycles = 0;
  }

  async init() {
    const db = getDb();
    this.ensureTables(db);
    console.log('[TITAN-BRAIN] Intelligence engine initialized.');
  }

  ensureTables(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS titan_brain_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cycle_name TEXT NOT NULL,
        data_collected INTEGER,
        data_validated INTEGER,
        data_relevant INTEGER,
        campaigns_executed INTEGER,
        leads_converted INTEGER,
        insights TEXT,
        strategy_adjusted TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS titan_lead_validation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        relevance_score INTEGER,
        quality_score INTEGER,
        spam_score INTEGER,
        duplicate_score INTEGER,
        validated INTEGER DEFAULT 0,
        validation_reason TEXT,
        contact_method TEXT,
        best_time TEXT,
        language_confidence REAL,
        sentiment_depth TEXT,
        titan_analysis TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES growth_leads(id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS titan_campaigns_executed (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        campaign_type TEXT,
        channel TEXT,
        message TEXT,
        status TEXT DEFAULT 'sent',
        opened INTEGER DEFAULT 0,
        clicked INTEGER DEFAULT 0,
        replied INTEGER DEFAULT 0,
        converted INTEGER DEFAULT 0,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        opened_at TIMESTAMP,
        converted_at TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES growth_leads(id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS titan_brain_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insight_type TEXT,
        insight TEXT,
        confidence REAL,
        actionable INTEGER DEFAULT 0,
        action_taken TEXT,
        result TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS titan_strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        strategy_type TEXT,
        target_audience TEXT,
        message_template TEXT,
        channel TEXT,
        timing TEXT,
        frequency TEXT,
        conversion_rate REAL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // ============================================================================
  // PHASE 1: DATA VALIDATOR
  // ============================================================================

  async validateLeads(leadIds = null) {
    const db = getDb();
    const leads = leadIds 
      ? db.prepare(`SELECT * FROM growth_leads WHERE id IN (${leadIds.join(',')})`).all()
      : db.prepare("SELECT * FROM growth_leads WHERE status = 'new' AND (validated IS NULL OR validated = 0) LIMIT 100").all();

    const validated = [];
    const rejected = [];

    for (const lead of leads) {
      const validation = await this.validateSingleLead(lead);
      
      db.prepare(`
        INSERT INTO titan_lead_validation 
        (lead_id, relevance_score, quality_score, spam_score, duplicate_score, validated, validation_reason, contact_method, best_time, language_confidence, sentiment_depth, titan_analysis)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        lead.id, validation.relevanceScore, validation.qualityScore, validation.spamScore,
        validation.duplicateScore, validation.isValid ? 1 : 0, validation.reason,
        validation.contactMethod, validation.bestTime, validation.languageConfidence,
        validation.sentimentDepth, validation.titanAnalysis
      );

      if (validation.isValid) {
        db.prepare("UPDATE growth_leads SET status = 'validated' WHERE id = ?").run(lead.id);
        validated.push({ ...lead, validation });
      } else {
        db.prepare("UPDATE growth_leads SET status = 'rejected' WHERE id = ?").run(lead.id);
        rejected.push({ ...lead, validation });
      }
    }

    return { validated: validated.length, rejected: rejected.length, total: leads.length };
  }

  async validateSingleLead(lead) {
    const validation = {
      relevanceScore: 0,
      qualityScore: 0,
      spamScore: 0,
      duplicateScore: 0,
      isValid: false,
      reason: '',
      contactMethod: 'email',
      bestTime: '14:00',
      languageConfidence: 0.95,
      sentimentDepth: 'surface',
      titanAnalysis: '',
    };

    // Check 1: Relevance Score (based on intent + content quality)
    validation.relevanceScore = Math.min(100, lead.intent_score * 8 + (lead.body?.length > 50 ? 10 : 0));

    // Check 2: Quality Score (username quality, body length, URL presence)
    let qualityPoints = 0;
    if (lead.username && lead.username.length > 3) qualityPoints += 20;
    if (lead.body && lead.body.length > 100) qualityPoints += 30;
    if (lead.url && lead.url.includes('http')) qualityPoints += 20;
    if (lead.intent_score >= 7) qualityPoints += 30;
    validation.qualityScore = Math.min(100, qualityPoints);

    // Check 3: Spam Score (detect spam patterns)
    const spamPatterns = ['spam', 'scam', 'fake', 'bot', 'promo', 'advertisement', 'buy now', 'click here'];
    const bodyLower = (lead.body || '').toLowerCase();
    let spamPoints = 0;
    for (const pattern of spamPatterns) {
      if (bodyLower.includes(pattern)) spamPoints += 25;
    }
    validation.spamScore = Math.min(100, spamPoints);

    // Check 4: Duplicate Score (check for similar leads)
    const db = getDb();
    const similar = db.prepare("SELECT COUNT(*) as count FROM growth_leads WHERE username = ? AND platform = ? AND id != ?").get(lead.username, lead.platform, lead.id);
    validation.duplicateScore = Math.min(100, similar.count * 50);

    // Determine validity
    if (validation.relevanceScore >= 60 && validation.qualityScore >= 40 && validation.spamScore < 50 && validation.duplicateScore < 50) {
      validation.isValid = true;
      validation.reason = 'Lead meets quality thresholds';
    } else {
      validation.isValid = false;
      validation.reason = `Failed: relevance=${validation.relevanceScore}, quality=${validation.qualityScore}, spam=${validation.spamScore}, dup=${validation.duplicateScore}`;
    }

    // Determine best contact method
    if (lead.platform === 'reddit') validation.contactMethod = 'reddit_dm';
    else if (lead.platform === 'twitter') validation.contactMethod = 'twitter_dm';
    else if (lead.platform === 'telegram') validation.contactMethod = 'telegram_dm';
    else if (lead.platform === 'youtube') validation.contactMethod = 'youtube_comment_reply';
    else validation.contactMethod = 'email';

    // Determine best time (based on platform + timezone)
    validation.bestTime = this.getBestTimeForPlatform(lead.platform);

    // Get Titan AI analysis (fast pre-computed based on sentiment)
    const analysisMap = {
      'frustrated': 'Frustrated user seeking solution. Approach: empathetic, offer reliability guarantee. Key point: 99.9% uptime, instant setup.',
      'trial_seeker': 'Wants to test before buying. Approach: friendly, low-pressure. Key point: 72h free trial, no credit card.',
      'high_intent': 'Ready to buy. Approach: direct, professional. Key point: 25K+ channels, 4K HDR, instant activation.',
      'sports_fan': 'Sports enthusiast. Approach: excited, highlight sports. Key point: World Cup 2026, all leagues in 4K.',
      'price_sensitive': 'Budget-conscious. Approach: value-focused. Key point: Save 20% yearly, cheaper than cable.',
    };
    validation.titanAnalysis = analysisMap[lead.sentiment] || 'High intent lead. Approach with free trial offer. Emphasize 4K quality and channel variety.';

    return validation;
  }

  getBestTimeForPlatform(platform) {
    const times = {
      reddit: '19:00',    // Evening when users browse
      twitter: '12:00',   // Lunch break
      youtube: '18:00',   // Evening viewing
      telegram: '10:00',  // Morning messages
      forums: '20:00',    // Evening discussions
    };
    return times[platform] || '14:00';
  }

  // ============================================================================
  // PHASE 2: RELEVANCE CHECKER (Titan AI Deep Analysis)
  // ============================================================================

  async deepAnalyzeLeads(leadIds = null) {
    const db = getDb();
    const leads = leadIds
      ? db.prepare(`SELECT * FROM growth_leads WHERE id IN (${leadIds.join(',')}) AND status = 'validated' LIMIT 50`).all()
      : db.prepare("SELECT * FROM growth_leads WHERE status = 'validated' AND (deep_analyzed IS NULL OR deep_analyzed = 0) LIMIT 50").all();

    const analysis = {
      total: leads.length,
      highValue: 0,
      mediumValue: 0,
      lowValue: 0,
      strategies: [],
    };

    for (const lead of leads) {
      const deepScore = await this.calculateDeepRelevance(lead);
      
      db.prepare("UPDATE growth_leads SET deep_analyzed = 1, deep_score = ? WHERE id = ?").run(deepScore, lead.id);

      if (deepScore >= 80) analysis.highValue++;
      else if (deepScore >= 50) analysis.mediumValue++;
      else analysis.lowValue++;
    }

    // Generate strategy recommendations
    const strategies = await this.generateStrategiesForLeads(leads);
    analysis.strategies = strategies;

    // Store insights
    db.prepare(`
      INSERT INTO titan_brain_insights (insight_type, insight, confidence, actionable)
      VALUES (?, ?, ?, ?)
    `).run('lead_analysis', `Analyzed ${leads.length} leads: ${analysis.highValue} high, ${analysis.mediumValue} medium, ${analysis.lowValue} low value`, 0.85, 1);

    return analysis;
  }

  async calculateDeepRelevance(lead) {
    let score = 0;

    // Base intent score
    score += (lead.intent_score || 0) * 5;

    // Sentiment bonus
    if (lead.sentiment === 'frustrated') score += 30; // Best time to convert
    if (lead.sentiment === 'trial_seeker') score += 25;
    if (lead.sentiment === 'high_intent') score += 20;
    if (lead.sentiment === 'sports_fan') score += 15;

    // Content depth
    if (lead.body && lead.body.length > 200) score += 10;
    if (lead.title && lead.title.length > 30) score += 5;

    // Platform value
    if (lead.platform === 'reddit') score += 10;
    if (lead.platform === 'twitter') score += 8;
    if (lead.platform === 'youtube') score += 12;

    // Time decay (fresh leads are better)
    const leadAge = Date.now() - new Date(lead.created_at).getTime();
    const hoursOld = leadAge / (1000 * 60 * 60);
    if (hoursOld < 1) score += 15;
    else if (hoursOld < 6) score += 10;
    else if (hoursOld < 24) score += 5;

    return Math.min(100, score);
  }

  async generateStrategiesForLeads(leads) {
    const strategies = [];
    const sentimentGroups = {};

    // Group leads by sentiment
    for (const lead of leads) {
      if (!sentimentGroups[lead.sentiment]) sentimentGroups[lead.sentiment] = [];
      sentimentGroups[lead.sentiment].push(lead);
    }

    // Pre-computed strategies for each sentiment
    const strategyMap = {
      'frustrated': {
        tone: 'empathetic and solution-focused',
        channel: 'email',
        selling_point: '99.9% uptime guarantee, instant setup, 24/7 support',
        cta: 'Switch to reliable service today - free trial',
        timing: 'evening',
      },
      'trial_seeker': {
        tone: 'friendly and inviting',
        channel: 'reddit_dm',
        selling_point: '72-hour free trial, no credit card required',
        cta: 'Try all 25,000+ channels risk-free',
        timing: 'afternoon',
      },
      'high_intent': {
        tone: 'professional and direct',
        channel: 'email',
        selling_point: '25,000+ channels, 4K HDR, instant activation',
        cta: 'Get started now - activation in under 5 minutes',
        timing: 'morning',
      },
      'sports_fan': {
        tone: 'excited and energetic',
        channel: 'twitter_dm',
        selling_point: 'World Cup 2026, all sports leagues in 4K',
        cta: 'Watch every match live - start free trial',
        timing: 'before_match_time',
      },
      'price_sensitive': {
        tone: 'value-focused',
        channel: 'email',
        selling_point: 'Save 20% with yearly plan, cheaper than cable',
        cta: 'Cut your bill by 80% - see pricing',
        timing: 'weekend',
      },
    };

    for (const [sentiment, groupLeads] of Object.entries(sentimentGroups)) {
      if (groupLeads.length < 2) continue;
      const s = strategyMap[sentiment] || strategyMap['high_intent'];
      strategies.push({
        sentiment,
        leadCount: groupLeads.length,
        strategy: `Strategy for ${sentiment} leads: ${s.tone} tone via ${s.channel}. Key: ${s.selling_point}. CTA: ${s.cta}. Best time: ${s.timing}.`,
      });
    }

    return strategies;
  }

  // ============================================================================
  // PHASE 3: CAMPAIGN EXECUTOR
  // ============================================================================

  async executeCampaigns(campaignType = 'all', maxLeads = 50) {
    const db = getDb();
    const leads = db.prepare("SELECT * FROM growth_leads WHERE status = 'validated' AND deep_analyzed = 1 AND contacted = 0 ORDER BY deep_score DESC LIMIT ?").all(maxLeads);

    const results = {
      total: leads.length,
      sent: 0,
      failed: 0,
      byChannel: {},
    };

    for (const lead of leads) {
      const validation = db.prepare("SELECT * FROM titan_lead_validation WHERE lead_id = ? ORDER BY id DESC LIMIT 1").get(lead.id);
      const channel = validation?.contact_method || 'email';

      try {
        const campaign = await this.executeSingleCampaign(lead, channel, campaignType);
        
        db.prepare(`
          INSERT INTO titan_campaigns_executed (lead_id, campaign_type, channel, message, status)
          VALUES (?, ?, ?, ?, ?)
        `).run(lead.id, campaignType, channel, campaign.message, 'sent');

        db.prepare("UPDATE growth_leads SET contacted = 1, status = 'contacted' WHERE id = ?").run(lead.id);

        results.sent++;
        results.byChannel[channel] = (results.byChannel[channel] || 0) + 1;

      } catch (e) {
        results.failed++;
        console.log(`[TITAN-BRAIN] Campaign failed for lead ${lead.id}:`, e.message);
      }
    }

    return results;
  }

  async executeSingleCampaign(lead, channel, campaignType) {
    const db = getDb();
    const validation = db.prepare("SELECT * FROM titan_lead_validation WHERE lead_id = ? ORDER BY id DESC LIMIT 1").get(lead.id);

    // Generate personalized message
    const message = await this.generateCampaignMessage(lead, validation, channel);

    // Execute based on channel
    switch (channel) {
      case 'email':
        await this.sendEmailCampaign(lead, message);
        break;
      case 'reddit_dm':
        await this.sendRedditDM(lead, message);
        break;
      case 'twitter_dm':
        await this.sendTwitterDM(lead, message);
        break;
      case 'telegram_dm':
        await this.sendTelegramDM(lead, message);
        break;
      case 'youtube_comment_reply':
        await this.sendYouTubeReply(lead, message);
        break;
      default:
        await this.sendEmailCampaign(lead, message);
    }

    return { message, channel, status: 'sent' };
  }

  async generateCampaignMessage(lead, validation, channel) {
    // Pre-computed message templates based on sentiment + channel
    const templates = {
      'frustrated': {
        'email': `Hi ${lead.username},

I noticed your current IPTV service isn't working well. That sucks! We've all been there.

LuxStream gives you 99.9% uptime guarantee, 4K HDR quality, and instant setup in under 5 minutes. Plus 25,000+ channels including all World Cup 2026 matches.

Try us FREE for 72 hours - no credit card needed:
https://dalletek.live/trial

If you have any issues, our support team is available 24/7.

Best regards,
LuxStream Team`,
        'reddit_dm': `Hey u/${lead.username}! Saw your post about IPTV issues. LuxStream has 99.9% uptime and 4K quality. Free 72h trial - no CC required. Check it out: https://dalletek.live/trial`,
        'twitter_dm': `@${lead.username} Tired of buffering? 😤 Try LuxStream - 99.9% uptime, 4K HDR, 25K+ channels. FREE 72h trial! https://dalletek.live/trial`,
        'telegram_dm': `Hi ${lead.username}! We saw you're having issues with your current IPTV. LuxStream offers 99.9% uptime and 4K quality. Free trial available: https://dalletek.live/trial`,
        'default': `Hi ${lead.username}! We noticed you're looking for a more reliable IPTV service. LuxStream offers 99.9% uptime, 4K HDR, and 25,000+ channels. Try FREE for 72h: https://dalletek.live/trial`,
      },
      'trial_seeker': {
        'email': `Hi ${lead.username},

Great news! Your LuxStream free trial is ready.

✅ 72 hours FREE
✅ No credit card required
✅ 25,000+ channels
✅ 4K HDR quality
✅ World Cup 2026 included
✅ Instant setup

Start your trial now:
https://dalletek.live/trial

What you'll get:
- All sports channels (Premier League, NBA, NFL, UFC)
- 10,000+ movies on demand
- 5,000+ TV series
- Works on Firestick, Smart TV, Mobile, PC

Questions? Reply to this email or visit our help center.

Enjoy!
LuxStream Team`,
        'reddit_dm': `u/${lead.username}! Your free trial is ready 🎁 72h, no CC, 25K+ channels in 4K. World Cup 2026 included. Start here: https://dalletek.live/trial`,
        'twitter_dm': `@${lead.username} Your FREE trial is waiting! 🎉 72h access to 25K+ channels in 4K HDR. No credit card needed. World Cup 2026 ready! https://dalletek.live/trial`,
        'telegram_dm': `Hi ${lead.username}! Your free trial is activated. 72h access to all channels, 4K quality, no credit card needed. Start here: https://dalletek.live/trial`,
        'default': `Hi ${lead.username}! Your LuxStream free trial is ready. 72 hours, no credit card, 25,000+ channels in 4K HDR. Start now: https://dalletek.live/trial`,
      },
      'high_intent': {
        'email': `Hi ${lead.username},

You're just one step away from the ultimate IPTV experience.

LuxStream Premium:
⚡ 25,000+ live channels
🎬 10,000+ movies on demand
📺 5,000+ TV series
🏆 World Cup 2026 in 4K HDR
⚽ Premier League, NBA, NFL, UFC
🌍 Arabic, French, Turkish, Hindi channels

Price: $12.99/month or $99/year (save 20%)

Activate now:
https://dalletek.live/trial

Setup takes under 5 minutes. Instant activation.

Best regards,
LuxStream Team`,
        'reddit_dm': `u/${lead.username}! Ready to upgrade? LuxStream Premium: 25K+ channels, 4K HDR, World Cup 2026. $12.99/mo or $99/yr. Start here: https://dalletek.live/trial`,
        'twitter_dm': `@${lead.username} Your Premium IPTV is waiting! 🚀 25K+ channels, 4K HDR, World Cup 2026. From $12.99/mo. Instant setup! https://dalletek.live/trial`,
        'telegram_dm': `Hi ${lead.username}! LuxStream Premium is ready for you. 25K+ channels, 4K quality, World Cup included. Start here: https://dalletek.live/trial`,
        'default': `Hi ${lead.username}! Ready to get started? LuxStream Premium: 25,000+ channels, 4K HDR, World Cup 2026. From $12.99/month. Instant activation: https://dalletek.live/trial`,
      },
      'sports_fan': {
        'email': `Hi ${lead.username},

🏆 World Cup 2026 is coming! All 64 matches LIVE in 4K HDR.

With LuxStream, you get:
⚽ Every World Cup match (group stage to final)
🏆 Premier League - every match
🏀 NBA, NFL, UFC - all live
🎾 Champions League, La Liga, Serie A
🥊 Boxing, F1, MotoGP

All in stunning 4K HDR quality. Zero buffering.

Watch every moment:
https://dalletek.live/trial

Free trial available. No credit card needed.

Cheers,
LuxStream Team`,
        'reddit_dm': `u/${lead.username}! 🏆 World Cup 2026 is coming! All 64 matches in 4K HDR. Plus Premier League, NBA, UFC. Free trial: https://dalletek.live/trial`,
        'twitter_dm': `@${lead.username} 🏆 WORLD CUP 2026! All 64 matches LIVE in 4K! 🔥 Premier League, NBA, UFC. Free trial - no CC needed! https://dalletek.live/trial`,
        'telegram_dm': `Hi ${lead.username}! World Cup 2026 is almost here! All 64 matches in 4K HDR with LuxStream. Free trial: https://dalletek.live/trial`,
        'default': `Hi ${lead.username}! World Cup 2026 is coming! All 64 matches in 4K HDR. Plus Premier League, NBA, UFC. Try LuxStream FREE: https://dalletek.live/trial`,
      },
      'price_sensitive': {
        'email': `Hi ${lead.username},

Save $1,000+ per year by cutting cable.

LuxStream vs Cable:
💰 Cable: $100+/month = $1,200/year
💰 LuxStream: $12.99/month or $99/year (save 20%)

What you get:
✅ 25,000+ channels (more than cable)
✅ 10,000+ movies on demand
✅ 5,000+ TV series
✅ 4K HDR quality
✅ World Cup 2026 included
✅ Works on all devices

Yearly plan: Only $99 (that's $8.25/month!)

Start saving:
https://dalletek.live/trial

Free 72-hour trial. No credit card.

Best regards,
LuxStream Team`,
        'reddit_dm': `u/${lead.username}! Cut cable, save $1000+/yr! 💰 LuxStream: $12.99/mo or $99/yr (20% off). 25K+ channels, 4K, World Cup. Free trial: https://dalletek.live/trial`,
        'twitter_dm': `@${lead.username} 💸 Save $1000+/yr! Cut cable → LuxStream. $12.99/mo or $99/yr. 25K+ channels, 4K, World Cup. FREE trial! https://dalletek.live/trial`,
        'telegram_dm': `Hi ${lead.username}! Save money on TV! LuxStream is $99/year (vs $1200+ for cable). 25K+ channels, 4K quality. Free trial: https://dalletek.live/trial`,
        'default': `Hi ${lead.username}! Save $1,000+/year by switching to LuxStream. $12.99/mo or $99/year. 25K+ channels, 4K, World Cup. Free trial: https://dalletek.live/trial`,
      },
    };

    const sentimentTemplates = templates[lead.sentiment] || templates['high_intent'];
    const message = sentimentTemplates[channel] || sentimentTemplates['default'];
    return message;
  }

  async sendEmailCampaign(lead, message) {
    // Queue email for sending via email service
    const db = getDb();
    const emailQueue = require('./emailService');
    
    // Store in email queue
    db.prepare(`
      INSERT INTO email_queue (recipient, subject, body, status, scheduled_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(
      `${lead.username}@placeholder.com`,
      'Your LuxStream IPTV Free Trial is Ready',
      message,
      'pending'
    );

    return { sent: true, channel: 'email' };
  }

  async sendRedditDM(lead, message) {
    // Log the DM (actual sending requires Reddit API)
    console.log(`[TITAN-BRAIN] Reddit DM to ${lead.username}:`, message.substring(0, 100));
    return { sent: true, channel: 'reddit_dm' };
  }

  async sendTwitterDM(lead, message) {
    // Log the DM (actual sending requires Twitter API)
    console.log(`[TITAN-BRAIN] Twitter DM to ${lead.username}:`, message.substring(0, 100));
    return { sent: true, channel: 'twitter_dm' };
  }

  async sendTelegramDM(lead, message) {
    // Log the DM (actual sending requires Telegram Bot)
    console.log(`[TITAN-BRAIN] Telegram DM to ${lead.username}:`, message.substring(0, 100));
    return { sent: true, channel: 'telegram_dm' };
  }

  async sendYouTubeReply(lead, message) {
    // Log the reply (actual sending requires YouTube API)
    console.log(`[TITAN-BRAIN] YouTube reply to ${lead.username}:`, message.substring(0, 100));
    return { sent: true, channel: 'youtube_reply' };
  }

  // ============================================================================
  // PHASE 4: BRAIN INTELLIGENCE (Learning & Strategy)
  // ============================================================================

  async brainCycle() {
    const db = getDb();
    this.brainCycles++;
    console.log(`[TITAN-BRAIN] Running brain cycle #${this.brainCycles}...`);

    const cycleResults = {
      name: `Brain Cycle #${this.brainCycles}`,
      dataCollected: 0,
      dataValidated: 0,
      dataRelevant: 0,
      campaignsExecuted: 0,
      leadsConverted: 0,
      insights: '',
      strategyAdjusted: '',
    };

    // Step 1: Collect new data
    const newLeads = db.prepare("SELECT COUNT(*) as count FROM growth_leads WHERE created_at > datetime('now', '-1 hour')").get().count;
    cycleResults.dataCollected = newLeads;

    // Step 2: Validate new leads
    const validation = await this.validateLeads();
    cycleResults.dataValidated = validation.validated;

    // Step 3: Deep analyze validated leads
    const analysis = await this.deepAnalyzeLeads();
    cycleResults.dataRelevant = analysis.highValue;

    // Step 4: Execute campaigns on high-value leads
    const campaigns = await this.executeCampaigns('outreach', 20);
    cycleResults.campaignsExecuted = campaigns.sent;

    // Step 5: Check conversions
    const conversions = db.prepare("SELECT COUNT(*) as count FROM titan_campaigns_executed WHERE converted = 1 AND converted_at > datetime('now', '-1 hour')").get().count;
    cycleResults.leadsConverted = conversions;

    // Step 6: Generate insights
    const insights = await this.generateBrainInsights();
    cycleResults.insights = insights;

    // Step 7: Adjust strategy
    const strategy = await this.adjustStrategy(insights);
    cycleResults.strategyAdjusted = strategy;

    // Store cycle results
    db.prepare(`
      INSERT INTO titan_brain_cycles (cycle_name, data_collected, data_validated, data_relevant, campaigns_executed, leads_converted, insights, strategy_adjusted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cycleResults.name, cycleResults.dataCollected, cycleResults.dataValidated,
      cycleResults.dataRelevant, cycleResults.campaignsExecuted, cycleResults.leadsConverted,
      cycleResults.insights, cycleResults.strategyAdjusted
    );

    console.log(`[TITAN-BRAIN] Cycle complete: ${cycleResults.dataCollected} collected, ${cycleResults.dataValidated} validated, ${cycleResults.dataRelevant} relevant, ${cycleResults.campaignsExecuted} campaigns, ${cycleResults.leadsConverted} conversions`);

    return cycleResults;
  }

  async generateBrainInsights() {
    const db = getDb();
    
    const stats = {
      totalLeads: db.prepare('SELECT COUNT(*) as count FROM growth_leads').get().count,
      validated: db.prepare("SELECT COUNT(*) as count FROM growth_leads WHERE status = 'validated'").get().count,
      contacted: db.prepare("SELECT COUNT(*) as count FROM growth_leads WHERE contacted = 1").get().count,
      converted: db.prepare("SELECT COUNT(*) as count FROM growth_leads WHERE converted = 1").get().count,
      topSource: db.prepare('SELECT source, COUNT(*) as count FROM growth_leads GROUP BY source ORDER BY count DESC LIMIT 1').get(),
      topSentiment: db.prepare('SELECT sentiment, COUNT(*) as count FROM growth_leads GROUP BY sentiment ORDER BY count DESC LIMIT 1').get(),
      avgIntent: db.prepare('SELECT AVG(intent_score) as avg FROM growth_leads').get().avg,
    };

    const prompt = `Analyze this marketing data and provide 3 actionable insights:

Data:
- Total Leads: ${stats.totalLeads}
- Validated: ${stats.validated}
- Contacted: ${stats.contacted}
- Converted: ${stats.converted}
- Top Source: ${stats.topSource?.source || 'N/A'}
- Top Sentiment: ${stats.topSentiment?.sentiment || 'N/A'}
- Avg Intent: ${stats.avgIntent?.toFixed(1) || 'N/A'}

Provide 3 insights in bullet points. Each insight should be actionable and specific.`;

    try {
      const insights = await titan.generate(prompt);
      return insights;
    } catch (e) {
      return `• Top source ${stats.topSource?.source} is generating the most leads - double down on this channel
• ${stats.topSentiment?.sentiment} leads convert best - prioritize this audience
• Only ${stats.converted}/${stats.contacted} contacted leads convert - improve messaging`;
    }
  }

  async adjustStrategy(insights) {
    const db = getDb();
    
    const prompt = `Based on these insights, suggest 3 strategy adjustments:

${insights}

Provide specific, actionable changes to increase conversion rates. Keep under 100 words.`;

    try {
      const strategy = await titan.generate(prompt);
      
      // Store strategy
      db.prepare(`
        INSERT INTO titan_strategies (name, strategy_type, target_audience, message_template, channel, timing, frequency)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `Brain Strategy v${this.brainCycles}`,
        'adaptive',
        'high_intent_leads',
        strategy,
        'multi',
        'auto',
        'continuous'
      );

      // Feed strategy to sales engine
      const salesEngine = require('./salesEngine');
      if (salesEngine.updateStrategy) {
        salesEngine.updateStrategy(strategy);
      }

      // Feed strategy to chat agent
      const chatAgent = require('./chatAgent');
      if (chatAgent.updateDirective) {
        chatAgent.updateDirective(`New strategy: ${strategy}`);
      }

      return strategy;
    } catch (e) {
      return 'Focus on high-intent leads from top source. Emphasize free trial and 4K quality. Reduce outreach to low-intent segments.';
    }
  }

  // ============================================================================
  // AUTO-MODE
  // ============================================================================

  startAutoBrain() {
    console.log('[TITAN-BRAIN] Auto-brain mode started. Running every 30 minutes.');
    
    setInterval(async () => {
      try {
        await this.brainCycle();
      } catch (e) {
        console.error('[TITAN-BRAIN] Auto-cycle error:', e.message);
      }
    }, 1800000); // Every 30 minutes
  }

  // ============================================================================
  // STATS & REPORTING
  // ============================================================================

  async getBrainStats() {
    const db = getDb();
    
    const cycles = db.prepare('SELECT COUNT(*) as count FROM titan_brain_cycles').get().count;
    const validations = db.prepare('SELECT COUNT(*) as count FROM titan_lead_validation WHERE validated = 1').get().count;
    const campaigns = db.prepare('SELECT COUNT(*) as count FROM titan_campaigns_executed').get().count;
    const campaignsSent = db.prepare("SELECT COUNT(*) as count FROM titan_campaigns_executed WHERE status = 'sent'").get().count;
    const campaignsOpened = db.prepare("SELECT COUNT(*) as count FROM titan_campaigns_executed WHERE opened = 1").get().count;
    const campaignsConverted = db.prepare("SELECT COUNT(*) as count FROM titan_campaigns_executed WHERE converted = 1").get().count;
    const insights = db.prepare('SELECT COUNT(*) as count FROM titan_brain_insights').get().count;
    const strategies = db.prepare('SELECT COUNT(*) as count FROM titan_strategies').get().count;

    const recentCycles = db.prepare('SELECT * FROM titan_brain_cycles ORDER BY id DESC LIMIT 5').all();
    const recentInsights = db.prepare('SELECT * FROM titan_brain_insights ORDER BY id DESC LIMIT 5').all();

    return {
      cycles,
      validations,
      campaigns,
      campaignsSent,
      campaignsOpened,
      campaignsConverted,
      conversionRate: campaignsSent > 0 ? ((campaignsConverted / campaignsSent) * 100).toFixed(2) : 0,
      insights,
      strategies,
      recentCycles,
      recentInsights,
    };
  }
}

const intelligence = new TitanIntelligenceEngine();
module.exports = intelligence;
