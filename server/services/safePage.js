function generateSafePage(config) {
  const s = config.safe_page || {};
  const features = s.features || [];

  const featureCards = features.map((f, i) => `
    <div class="feature-card" style="animation-delay:${i * 0.1}s">
      <div class="feature-icon">${f.icon}</div>
      <h3>${f.title}</h3>
      <p>${f.text}</p>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${s.title || 'Digital Solutions'}</title>
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
.hero p{font-size:18px;color:#a0b4d0;max-width:700px;margin:0 auto 32px}
.hero-cta{display:inline-block;background:#4361ee;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;transition:background .2s}
.hero-cta:hover{background:#3651d4}
.section{padding:80px 0}
.section h2{font-size:32px;font-weight:700;text-align:center;margin-bottom:12px;color:#1a1a2e}
.section .subtitle{text-align:center;color:#666;font-size:16px;max-width:600px;margin:0 auto 48px}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
.feature-card{background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:32px 24px;text-align:center;transition:transform .2s,box-shadow .2s}
.feature-card:hover{transform:translateY(-4px);box-shadow:0 8px 30px rgba(0,0,0,0.08)}
.feature-icon{font-size:36px;margin-bottom:16px}
.feature-card h3{font-size:18px;font-weight:600;margin-bottom:8px;color:#1a1a2e}
.feature-card p{font-size:14px;color:#666;line-height:1.7}
.about{background:#fff}
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.about-text p{color:#555;font-size:15px;margin-bottom:16px}
.about-text p:last-child{margin-bottom:0}
.about-img{background:linear-gradient(135deg,#4361ee15,#4361ee05);border-radius:16px;padding:40px;text-align:center;font-size:80px}
.contact{background:#1a1a2e;color:#fff;text-align:center;padding:60px 0}
.contact h2{color:#fff}
.contact p{color:#a0b4d0;font-size:15px;margin-bottom:24px}
.contact-email{display:inline-block;background:#4361ee;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600}
.contact-email:hover{background:#3651d4}
footer{background:#0f0f1a;color:#666;text-align:center;padding:24px 0;font-size:13px}
@media(max-width:768px){
  header .container{flex-direction:column;gap:12px}
  nav a{margin:0 12px}
  .hero h1{font-size:32px}
  .about-grid{grid-template-columns:1fr}
  .features{grid-template-columns:1fr}
}
</style>
</head>
<body>
<header>
  <div class="container">
    <a href="/" class="logo">Dalletek<span>.</span></a>
    <nav>
      <a href="#about">About</a>
      <a href="#services">Services</a>
      <a href="#contact">Contact</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="container">
    <h1>${s.heading || 'Digital Solutions & Consulting'}</h1>
    <p>${s.subheading || 'Empowering businesses with innovative technology services'}</p>
    <a href="#contact" class="hero-cta">Get in Touch</a>
  </div>
</section>

<section class="section about" id="about">
  <div class="container">
    <div class="about-grid">
      <div class="about-text">
        <h2 style="text-align:left">About Us</h2>
        <p>${s.description || 'We provide comprehensive technology consulting, digital transformation, and managed IT services to businesses worldwide.'}</p>
        <p>Founded with a mission to bridge the gap between cutting-edge technology and practical business needs, we help organizations navigate the complex digital landscape with confidence and clarity.</p>
      </div>
      <div class="about-img">🏢</div>
    </div>
  </div>
</section>

<section class="section" id="services" style="background:#f8f9fa">
  <div class="container">
    <h2>Our Services</h2>
    <p class="subtitle">Comprehensive solutions designed to accelerate your digital journey</p>
    <div class="features">
      ${featureCards}
    </div>
  </div>
</section>

<section class="contact" id="contact">
  <div class="container">
    <h2>Contact Us</h2>
    <p>Have a project in mind? We'd love to hear from you.</p>
    <a href="mailto:${s.email || 'info@dalletek.live'}" class="contact-email">${s.email || 'info@dalletek.live'}</a>
  </div>
</section>

<footer>
  <div class="container">
    <p>&copy; ${new Date().getFullYear()} Dalletek Digital Solutions. All rights reserved.</p>
  </div>
</footer>
</body>
</html>`;
}

module.exports = { generateSafePage };
