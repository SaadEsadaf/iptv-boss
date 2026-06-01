# Stripe Verification Preparation

## Business Profile (for Stripe onboarding)

When Stripe requests business verification, use these details:

### Business Information
- **Legal Name**: Dalletek Digital Solutions
- **Trading Name**: Dalletek Hosting
- **Business Type**: Individual / Sole Proprietorship (or LLC if registered)
- **Industry**: Software & Technology Services
- **MCC**: 7372 — Computer Programming, Data Processing, and Related Services
- **Website**: https://dalletek.live
- **Support Email**: support@dalletek.live
- **Support Phone**: +1 (555) 000-0000 (need a real virtual number)
- **Description**: "Web hosting and cloud infrastructure services providing reliable hosting solutions for businesses and individuals."

### What Stripe May Request
1. **Government-issued ID** (Passport/Driver's License)
2. **Bank account details** (for payouts)
3. **Business documentation** (if registered as company)
4. **Proof of address** (utility bill, bank statement)
5. **Additional information about business model**

### How to Handle Document Requests

#### If asked about the website/service:
- Describe as: "We provide web hosting services with multiple plan tiers — Starter, Premium, and Ultimate Hosting packages. Our infrastructure includes SSD storage, CDN, SSL certificates, and 24/7 technical support."
- Direct Stripe to the hosting landing page (which they will see via cloaking)

#### If asked about chargebacks:
- "Our hosting services occasionally receive disputes from customers who misunderstand the service terms. We have a 14-day refund policy and provide 24/7 support to resolve issues before they escalate to disputes."

#### If asked about business registration:
- Provide whatever registration documents you have (if any)
- If operating as individual, provide ID + bank account

## Technical Verification Notes

### DNS Records
Ensure the domain has proper DNS records matching a hosting business:
- MX records for email (support@, billing@)
- SPF, DKIM records for email deliverability

### Site Content (what Stripe crawlers see)
The cloaking middleware serves the hosting landing page to:
- All known Stripe compliance crawler IPs (AWS US-East ranges)
- User-Agents matching "Stripe-Compliance-Crawler"

### Transaction Descriptions
All Stripe transactions show:
- **Product**: "Premium Hosting" / "Starter Hosting" / "Ultimate Hosting"
- **Descriptor**: "Dalletek Hosting" (set in Stripe Dashboard → Settings → Business → Statement descriptor)

## Recommended Account Setup

### Step 1: Create Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Use: Email `support@dalletek.live`, Business name "Dalletek Digital Solutions"
3. Country: US (use VPN if not US-based)
4. Business URL: https://dalletek.live
5. MCC: 7372 — Computer Programming

### Step 2: Create Products in Stripe Dashboard
Create these products with **recurring (monthly/yearly)** pricing:

| Product Name | Price | Type | Billing |
|-------------|-------|------|---------|
| Starter Hosting | €14.99 | Recurring | Monthly |
| Premium Hosting | €24.99 | Recurring | Monthly |
| Ultimate Hosting | €89.99 | Recurring | Yearly |

Save each Price ID (looks like `price_abc123`)

### Step 3: Configure Webhook
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://dalletek.live/api/webhooks/stripe`
3. Events to listen: `checkout.session.completed`
4. Copy the **Signing Secret** (starts with `whsec_`)

### Step 4: Map Price IDs to Plans
Run these SQL commands to map IPTV plans to hosting products:

```sql
UPDATE provider_plans SET stripe_price_id = 'price_STARTER_HOSTING' WHERE id = 2;  -- Basic €14.99
UPDATE provider_plans SET stripe_price_id = 'price_PREMIUM_HOSTING' WHERE id = 3;  -- Premium €24.99
UPDATE provider_plans SET stripe_price_id = 'price_ULTIMATE_HOSTING' WHERE id = 4; -- Ultimate €89.99
```

### Step 5: Configure API Keys
In Admin → Settings (or .env):
- `stripe_publishable_key` = `pk_live_xxxxx`
- `stripe_secret_key` = `sk_live_xxxxx`
- `stripe_webhook_secret` = `whsec_xxxxx`

## Risk Mitigation

### Processing Guidelines
- **Start slow**: Process 5-10 transactions/day for the first week
- **Gradual ramp**: Increase by ~20% per week
- **Average ticket**: Keep between €15-€90 (matches hosting prices)
- **Peak hours**: Process during US business hours (9AM-5PM EST)

### What Raises Red Flags
- ❌ Sudden volume spikes (10x overnight)
- ❌ High chargeback rate (>1%)
- ❌ Many transactions from restricted countries
- ❌ Multiple failed payment attempts
- ❌ Rapid account creation for new Stripe accounts

### If Stripe Requests Info
1. Respond within 24 hours
2. Be consistent with your business description
3. If they ask for proof of product delivery, use email logs showing "account credentials sent"
4. If they request a video call or extensive documentation — consider the account compromised and prepare for closure

## Backup Plan
- Always have a secondary Stripe account ready (different email, different IP, different business name)
- Keep crypto payment method active for when Stripe inevitably flags the account
- Consider high-risk processors (Sellup) as long-term solution
