function generateHostingPage() {
  const plans = [
    { name: 'Starter Hosting', price: '14.99', period: '/month', features: ['1 Website', '10 GB SSD Storage', '100 GB Bandwidth', '1 Email Account', 'Free SSL Certificate', '24/7 Support'], popular: false },
    { name: 'Premium Hosting', price: '24.99', period: '/month', features: ['10 Websites', '50 GB SSD Storage', '500 GB Bandwidth', '10 Email Accounts', 'Free SSL & Domain', 'Priority Support', 'Daily Backups'], popular: true },
    { name: 'Ultimate Hosting', price: '89.99', period: '/year', features: ['Unlimited Websites', '200 GB SSD Storage', '2 TB Bandwidth', 'Unlimited Email', 'Free SSL & Domain', 'Priority Support', 'Daily Backups', 'Dedicated IP'], popular: false },
  ];

  const planCards = plans.map((p, i) => `
    <div class="plan-card ${p.popular ? 'popular' : ''}">
      ${p.popular ? '<div class="popular-badge">Most Popular</div>' : ''}
      <h3>${p.name}</h3>
      <div class="price">€${p.price}<span>${p.period}</span></div>
      <ul>${p.features.map(f => `<li>✓ ${f}</li>`).join('')}</ul>
      <a href="#contact" class="plan-cta">Get Started</a>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NexusHost — Fast & Reliable Web Hosting</title>
<meta name="robots" content="noindex,nofollow">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f8f9fa;color:#333;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6}
.container{max-width:1100px;margin:0 auto;padding:0 24px}
header{background:#fff;border-bottom:1px solid #e8e8e8;padding:16px 0;position:sticky;top:0;z-index:100}
header .container{display:flex;align-items:center;justify-content:space-between}
.logo{font-size:22px;font-weight:700;color:#1a1a2e;text-decoration:none}
.logo span{color:#4361ee}
nav a{color:#555;text-decoration:none;font-size:14px;margin-left:24px;transition:color .2s}
nav a:hover{color:#4361ee}
.hero{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);color:#fff;padding:100px 0 80px;text-align:center}
.hero h1{font-size:44px;font-weight:700;margin-bottom:16px;letter-spacing:-0.5px}
.hero p{font-size:18px;color:#a0b4d0;max-width:600px;margin:0 auto 32px}
.hero-cta{display:inline-block;background:#4361ee;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;transition:background .2s}
.hero-cta:hover{background:#3651d4}
.hero .speed-badges{display:flex;gap:16px;justify-content:center;margin-top:32px;flex-wrap:wrap}
.hero .speed-badges span{background:rgba(255,255,255,0.08);padding:8px 20px;border-radius:20px;font-size:13px;color:#a0b4d0}
.plans-section{padding:80px 0;background:#fff}
.plans-section h2{font-size:32px;font-weight:700;text-align:center;margin-bottom:12px;color:#1a1a2e}
.plans-section .subtitle{text-align:center;color:#666;font-size:16px;max-width:500px;margin:0 auto 48px}
.plans-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;align-items:start}
.plan-card{background:#f8f9fa;border:1px solid #e8e8e8;border-radius:12px;padding:32px 24px;text-align:center;position:relative;transition:transform .2s,box-shadow .2s}
.plan-card:hover{transform:translateY(-4px);box-shadow:0 8px 30px rgba(0,0,0,0.08)}
.plan-card.popular{border:2px solid #4361ee;background:#fff}
.plan-card .popular-badge{background:#4361ee;color:#fff;font-size:12px;font-weight:600;padding:4px 16px;border-radius:12px;display:inline-block;margin-bottom:12px}
.plan-card h3{font-size:18px;font-weight:600;margin-bottom:12px;color:#1a1a2e}
.plan-card .price{font-size:36px;font-weight:700;color:#4361ee;margin-bottom:20px}
.plan-card .price span{font-size:14px;font-weight:400;color:#666}
.plan-card ul{list-style:none;text-align:left;margin:0 0 24px;padding:0}
.plan-card ul li{padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #eee}
.plan-card ul li:last-child{border-bottom:none}
.plan-cta{display:inline-block;width:100%;padding:12px;background:#4361ee;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;transition:background .2s;border:none;cursor:pointer}
.plan-cta:hover{background:#3651d4}
.features-section{padding:80px 0;background:#f8f9fa}
.features-section h2{font-size:32px;font-weight:700;text-align:center;margin-bottom:48px;color:#1a1a2e}
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:32px}
.feature-item{text-align:center;padding:24px}
.feature-item .icon{font-size:36px;margin-bottom:12px}
.feature-item h3{font-size:16px;font-weight:600;margin-bottom:8px;color:#1a1a2e}
.feature-item p{font-size:13px;color:#666}
.contact-section{background:#1a1a2e;color:#fff;text-align:center;padding:60px 0}
.contact-section h2{color:#fff;margin-bottom:12px}
.contact-section p{color:#a0b4d0;font-size:15px;margin-bottom:24px}
.contact-section .email{display:inline-block;background:#4361ee;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600}
.contact-section .email:hover{background:#3651d4}
footer{background:#0f0f1a;color:#666;text-align:center;padding:24px 0;font-size:13px}
@media(max-width:768px){
  header .container{flex-direction:column;gap:12px}
  nav a{margin:0 12px}
  .hero h1{font-size:32px}
  .plans-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>
<header>
  <div class="container">
    <a href="/" class="logo">Nexus<span>.</span> Host</a>
    <nav>
      <a href="#plans">Plans</a>
      <a href="#features">Features</a>
      <a href="#contact">Support</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="container">
    <h1>Lightning Fast Web Hosting</h1>
    <p>Reliable, secure, and blazing-fast hosting solutions for businesses and developers worldwide.</p>
    <a href="#plans" class="hero-cta">View Plans</a>
    <div class="speed-badges">
      <span>⚡ 99.9% Uptime</span>
      <span>🔒 Free SSL</span>
      <span>🌍 Global CDN</span>
      <span>💾 Daily Backups</span>
    </div>
  </div>
</section>

<section class="plans-section" id="plans">
  <div class="container">
    <h2>Choose Your Plan</h2>
    <p class="subtitle">Scalable hosting solutions that grow with your business</p>
    <div class="plans-grid">${planCards}</div>
  </div>
</section>

<section class="features-section" id="features">
  <div class="container">
    <h2>Why Choose NexusHost?</h2>
    <div class="features-grid">
      <div class="feature-item"><div class="icon">🚀</div><h3>Blazing Speed</h3><p>NVMe SSD storage and LiteSpeed servers deliver lightning-fast page loads.</p></div>
      <div class="feature-item"><div class="icon">🔒</div><h3>Enterprise Security</h3><p>Free SSL, DDoS protection, malware scanning, and automated firewalls.</p></div>
      <div class="feature-item"><div class="icon">🌐</div><h3>Global CDN</h3><p>Content delivery across 200+ locations worldwide for optimal performance.</p></div>
      <div class="feature-item"><div class="icon">📞</div><h3>24/7 Expert Support</h3><p>Our team is available around the clock to help with any issues.</p></div>
      <div class="feature-item"><div class="icon">🔄</div><h3>Daily Backups</h3><p>Automated daily backups with one-click restore for peace of mind.</p></div>
      <div class="feature-item"><div class="icon">📊</div><h3>cPanel Control Panel</h3><p>Industry-standard control panel for easy management of your hosting.</p></div>
    </div>
  </div>
</section>

<section class="contact-section" id="contact">
  <div class="container">
    <h2>Get Started Today</h2>
    <p>Have questions? Our hosting specialists are ready to help you find the perfect plan.</p>
    <a href="mailto:support@nexushost.com" class="email">support@nexushost.com</a>
  </div>
</section>

<footer>
  <div class="container">
    <p>&copy; ${new Date().getFullYear()} NexusHost — All rights reserved.</p>
  </div>
</footer>
</body>
</html>`;
}

module.exports = { generateHostingPage };
