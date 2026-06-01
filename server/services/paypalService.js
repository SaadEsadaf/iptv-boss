const { getDb } = require('../db');

const API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

function getPaypalConfig() {
  const db = getDb();
  const clientId = (db.prepare("SELECT value FROM app_settings WHERE key = 'paypal_client_id'").get() || {}).value || process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = (db.prepare("SELECT value FROM app_settings WHERE key = 'paypal_client_secret'").get() || {}).value || process.env.PAYPAL_CLIENT_SECRET || '';
  const mode = (db.prepare("SELECT value FROM app_settings WHERE key = 'paypal_mode'").get() || {}).value || process.env.PAYPAL_MODE || 'sandbox';
  return { clientId, clientSecret, mode, baseUrl: API_BASE[mode] || API_BASE.sandbox };
}

function isConfigured() {
  const { clientId, clientSecret } = getPaypalConfig();
  return !!(clientId && clientSecret && clientId !== 'your_paypal_client_id_here' && clientSecret !== 'your_paypal_client_secret_here');
}

async function getAccessToken() {
  const { clientId, clientSecret, baseUrl } = getPaypalConfig();
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal auth error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function createOrder({ amount, currency, orderId, returnUrl, cancelUrl }) {
  const token = await getAccessToken();
  const { baseUrl } = getPaypalConfig();

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: String(orderId),
        description: `Order #${orderId}`,
        amount: {
          currency_code: currency || 'EUR',
          value: String(amount),
        },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal create order error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const approvalUrl = data.links?.find(l => l.rel === 'payer-action')?.href;
  return { id: data.id, approvalUrl, status: data.status };
}

async function captureOrder(paypalOrderId) {
  const token = await getAccessToken();
  const { baseUrl } = getPaypalConfig();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal capture error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status,
    captureId: capture?.id,
    orderId: data.id,
    completed: data.status === 'COMPLETED',
  };
}

async function getOrder(paypalOrderId) {
  const token = await getAccessToken();
  const { baseUrl } = getPaypalConfig();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal get order error ${response.status}: ${text}`);
  }

  return response.json();
}

module.exports = { createOrder, captureOrder, getOrder, isConfigured, getPaypalConfig };
