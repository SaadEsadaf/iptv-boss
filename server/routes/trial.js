const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

router.get('/', (req, res) => {
  const db = getDb();
  const siteName = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_name'").get() || {}).value || 'Dalletek';
  const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || 'http://localhost:3001';
  const code = req.query.code || '';
  const email = req.query.email || '';
  const utmSource = req.query.utm_source || 'direct';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>🏆 World Cup 2026 — Free Trial | ${siteName}</title>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How can I watch the World Cup 2026 for free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Claim a free 72-hour IPTV trial at dalletek.live. You get access to all 64 World Cup matches in 4K with multi-language commentary. No credit card required."
      }
    },
    {
      "@type": "Question",
      "name": "What devices are supported for IPTV streaming?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "IPTV works on Firestick, Android TV, iOS, iPhone, Smart TVs, MAG boxes, Formuler, and Enigma2 devices. Popular apps include TiviMate, IPTV Smarters Pro, GSE Smart IPTV, VLC, and IPTVX."
      }
    },
    {
      "@type": "Question",
      "name": "Is IPTV legal in 2026?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "IPTV services themselves are legal. The legality depends on whether the content is properly licensed. Always choose a provider that offers licensed content."
      }
    },
    {
      "@type": "Question",
      "name": "How many channels does a premium IPTV subscription include?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Premium IPTV services offer 179,915+ channels including international sports, movies, TV series, and VOD content in multiple languages."
      }
    },
    {
      "@type": "Question",
      "name": "Do I need a VPN for IPTV?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A VPN is recommended for privacy and to prevent ISP throttling during streaming. Many IPTV users use VPNs to ensure smooth 4K streaming without buffering."
      }
    }
  ]
}
</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a1a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh}
.container{max-width:500px;margin:0 auto;padding:20px}
.header{text-align:center;padding:40px 0 20px}
.header .trophy{font-size:64px;display:block;margin-bottom:8px}
.header h1{color:#ffd700;font-size:28px;margin:0 0 4px;text-shadow:0 2px 10px rgba(255,215,0,0.3)}
.header p{color:#a0d0ff;font-size:15px;margin:0}
.countdown-box{background:linear-gradient(135deg,#1a1a3e,#0d2818);border:2px solid #ffd70044;border-radius:16px;padding:24px;text-align:center;margin:16px 0}
.countdown-box .big{font-size:48px;font-weight:800;color:#ffd700;margin:8px 0}
.countdown-box .label{color:#888;font-size:13px}
.countdown-box .remaining{background:#ffd70020;color:#ffd700;padding:4px 16px;border-radius:20px;font-size:12px;font-weight:700;display:inline-block;margin-top:8px}
.benefits{background:#1a1a1a;border-radius:12px;padding:20px;margin:16px 0;border:1px solid #2a2a2a}
.benefits h2{color:#fff;font-size:16px;margin:0 0 12px}
.benefits .item{display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#ccc}
.benefits .item:last-child{border-bottom:none}
.benefits .item .icon{font-size:20px;margin-right:12px;width:28px;text-align:center}
.benefits .item .check{color:#00d4ff;margin-left:auto}
.form-box{background:#1a1a1a;border-radius:12px;padding:24px;margin:16px 0;border:1px solid #2a2a2a}
.form-box h2{color:#ffd700;font-size:18px;margin:0 0 16px;text-align:center}
.form-group{margin-bottom:14px}
.form-group label{display:block;color:#888;font-size:12px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}
.form-group input{width:100%;padding:12px 16px;background:#0f0f0f;border:1px solid #333;border-radius:8px;color:#fff;font-size:15px;outline:none}
.form-group input:focus{border-color:#ffd700}
.form-group .error{color:#ff4444;font-size:12px;margin-top:4px;display:none}
.btn{width:100%;padding:16px;background:linear-gradient(135deg,#ffd700,#ff8c00);color:#000;border:none;border-radius:50px;font-size:17px;font-weight:800;cursor:pointer;transition:all .2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(255,215,0,0.4)}
.btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
.spinner{display:none;text-align:center;padding:20px}
.spinner:after{content:" ";display:inline-block;width:32px;height:32px;border:3px solid #ffd700;border-radius:50%;border-top-color:transparent;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.success-box{display:none;background:linear-gradient(135deg,#0d2818,#1a1a3e);border:2px solid #00d4ff44;border-radius:16px;padding:24px;margin:16px 0;text-align:center}
.success-box .check{font-size:48px;display:block;margin-bottom:8px}
.success-box h2{color:#00d4ff;font-size:22px;margin:0 0 8px}
.success-box p{color:#b0b0b0;font-size:14px;margin:0 0 16px;line-height:1.6}
.success-box .creds{background:#0a0a0a;border-radius:8px;padding:16px;font-family:monospace;text-align:left;margin:0 0 16px}
.success-box .creds .row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
.success-box .creds .row .label{color:#666}
.success-box .creds .row .value{color:#fff}
.success-box .creds .row .copy{cursor:pointer;color:#00d4ff;font-size:11px}
.error-box{display:none;background:#2a0a0a;border:1px solid #ff444444;border-radius:12px;padding:16px;margin:16px 0;text-align:center;color:#ff6666;font-size:14px}
.footer{text-align:center;padding:24px 0;color:#555;font-size:12px}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <span class="trophy">🏆</span>
    <h1>World Cup 2026</h1>
    <p>Watch Every Match Live in 4K — Free Trial</p>
  </div>

  <div class="countdown-box">
    <div class="label">Your Free Access</div>
    <div class="big">72h</div>
    <div class="label">of premium IPTV • All World Cup matches</div>
    <div class="remaining">⚡ Only 9 codes remaining today</div>
  </div>

  <div class="benefits">
    <h2>What you get:</h2>
    <div class="item"><span class="icon">📺</span> All 64 World Cup matches in 4K<span class="check">✓</span></div>
    <div class="item"><span class="icon">🏟️</span> Multi-language commentary (FR, EN, AR, ES)<span class="check">✓</span></div>
    <div class="item"><span class="icon">📱</span> Works on Firestick, Android, iOS, Smart TV<span class="check">✓</span></div>
    <div class="item"><span class="icon">⚡</span> No buffering • 99.9% uptime<span class="check">✓</span></div>
    <div class="item"><span class="icon">🎁</span> No credit card required<span class="check">✓</span></div>
  </div>

  <div class="form-box" id="claimForm">
    <h2>🎁 Claim Your Free Trial</h2>
    <div class="form-group">
      <label>Your Name</label>
      <input type="text" id="name" placeholder="Enter your name" value="">
    </div>
    <div class="form-group">
      <label>Your Email</label>
      <input type="email" id="email" placeholder="Enter your email" value="${email}">
      <div class="error" id="emailError">Please enter a valid email</div>
    </div>
    <div class="form-group">
      <label>Your Device / App</label>
      <select id="preferredApp" style="width:100%;padding:12px 16px;background:#0f0f0f;border:1px solid #333;border-radius:8px;color:#fff;font-size:14px;outline:none;">
        <option value="">Select your device...</option>
        <option value="tivimate">🔥 TiviMate (Firestick / Android TV)</option>
        <option value="smarters">📡 IPTV Smarters Pro (Android / iOS)</option>
        <option value="gse">🍎 GSE Smart IPTV (iPhone / Apple TV)</option>
        <option value="vlc">📹 VLC (PC / Mac / Phone)</option>
        <option value="iptvx">📱 IPTVX (iPhone / iPad)</option>
        <option value="mag">📦 MAG Box (STB)</option>
        <option value="formuler">📺 Formuler (MyTVOnline)</option>
        <option value="enigma">🛜 Enigma2 (Dreambox / VU+)</option>
      </select>
      <div class="error" id="appError" style="display:none;">Please select your device</div>
    </div>
    <div class="form-group" style="display:none;">
      <label>Trial Code</label>
      <input type="text" id="code" value="${code}">
    </div>
    <button class="btn" id="claimBtn" onclick="claimTrial()">🎯 CLAIM FREE 72h TRIAL</button>
    <div class="spinner" id="spinner"></div>
  </div>

  <div class="success-box" id="successBox">
    <span class="check">✅</span>
    <h2>Trial Activated!</h2>
    <p>Your 72-hour free trial is ready. Check your email for credentials or use them below:</p>
    <div class="creds" id="credsBox"></div>
    <p style="color:#ffd700;font-size:13px;margin-top:8px;">⚡ Expires in 72 hours — upgrade to keep watching</p>
    <button class="btn" onclick="window.location.href='/#plans'" style="background:linear-gradient(135deg,#00d4ff,#0088cc);margin-top:12px;">🚀 See Premium Plans</button>
  </div>

  <div class="error-box" id="errorBox"></div>

  <div class="footer">
    ${siteName} — Powered by Dalletek<br>
    <a href="${siteUrl}" style="color:#555;">${siteUrl}</a>
  </div>
</div>

<script>
const urlParams = new URLSearchParams(window.location.search);
const prefilledCode = urlParams.get('code') || '${code}';
const prefilledEmail = urlParams.get('email') || '${email}';

if (prefilledCode && document.getElementById('code')) {
  document.getElementById('code').value = prefilledCode;
}
if (prefilledEmail && document.getElementById('email')) {
  document.getElementById('email').value = prefilledEmail;
}

async function claimTrial() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const code = document.getElementById('code').value.trim() || prefilledCode;
  const preferredApp = document.getElementById('preferredApp').value;
  const btn = document.getElementById('claimBtn');
  const spinner = document.getElementById('spinner');
  const emailError = document.getElementById('emailError');
  const appError = document.getElementById('appError');
  const form = document.getElementById('claimForm');
  const successBox = document.getElementById('successBox');
  const errorBox = document.getElementById('errorBox');

  if (!email || !email.includes('@')) {
    emailError.style.display = 'block';
    return;
  }
  emailError.style.display = 'none';

  if (!preferredApp) {
    appError.style.display = 'block';
    return;
  }
  appError.style.display = 'none';

  btn.disabled = true;
  btn.textContent = 'Processing...';
  spinner.style.display = 'block';

  try {
    const resp = await fetch('/api/tracking/activate-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, code, preferredApp, source: 'worldcup_landing' }),
    });
    const data = await resp.json();

    if (data.success) {
      form.style.display = 'none';
      errorBox.style.display = 'none';
      successBox.style.display = 'block';

      let html = '';
      if (data.username) html += '<div class="row"><span class="label">Username</span><span class="value">' + data.username + '</span></div>';
      if (data.password) html += '<div class="row"><span class="label">Password</span><span class="value">' + data.password + '</span></div>';
      if (data.server_url) html += '<div class="row"><span class="label">Server</span><span class="value" style="font-size:11px;">' + data.server_url + '</span></div>';
      if (data.m3u_url) html += '<div class="row"><span class="label">M3U URL</span><span class="value" style="font-size:10px;word-break:break-all;max-width:300px;text-align:right;">' + data.m3u_url + '</span></div>';
      document.getElementById('credsBox').innerHTML = html;
    } else {
      errorBox.textContent = data.error || 'Failed to activate trial. Code may be expired.';
      errorBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = '🎯 CLAIM FREE 72h TRIAL';
      spinner.style.display = 'none';
    }
  } catch (e) {
    errorBox.textContent = 'Connection error. Please try again.';
    errorBox.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '🎯 CLAIM FREE 72h TRIAL';
    spinner.style.display = 'none';
  }
}
</script>
</body>
</html>`);
});

module.exports = router;
