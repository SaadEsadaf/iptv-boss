const crypto = require('crypto');
const { getDb } = require('../db');

const API_BASE = 'https://api.sellup.io/v1';

function getApiKey() {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'sellup_api_key'").get();
  const key = row?.value || process.env.SELLUP_API_KEY || '';
  return key && key !== 'your_sellup_api_key_here' ? key : null;
}

async function createPaymentLink({ productId, customerEmail, customerName, orderId }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const db = getDb();
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || process.env.SITE_URL || 'http://localhost:3000';
    return `${siteUrl}/checkout?order=${orderId}`;
  }

  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      customer_email: customerEmail,
      customer_name: customerName,
      metadata: { internal_order_id: orderId },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sellup API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return { checkoutUrl: data.checkout_url, sellupOrderId: data.id };
}

function verifyWebhookSignature(body, signature) {
  const secret = process.env.SELLUP_WEBHOOK_SECRET;
  if (!secret || secret === 'your_sellup_webhook_secret_here') return true;

  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function getPaymentStatus(orderId) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Sellup API key not configured');

  const response = await fetch(`${API_BASE}/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) throw new Error(`Sellup API error ${response.status}`);
  return response.json();
}

async function createOrder({ productId, orderId, amount }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const db = getDb();
    const siteUrl = (db.prepare("SELECT value FROM app_settings WHERE key = 'site_url'").get() || {}).value || process.env.SITE_URL || 'http://localhost:3000';
    return `${siteUrl}/checkout?order=${orderId}`;
  }

  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      metadata: { internal_order_id: orderId },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sellup API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.checkout_url;
}

module.exports = { createPaymentLink, createOrder, verifyWebhookSignature, getPaymentStatus };
