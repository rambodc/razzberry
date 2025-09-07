// functions/transak.js
// Transak session + webhook handlers (Node 20, Firebase Functions v2)
// - ENV-aware access-token cache (optional; won't crash if Firestore perms are missing)
// - Prefills user email from Firebase ID token
// - Locks to XRP at your XRPL address, starts at $100 USD
// - Current environment set via secret TRANSAK_ENV (STAGING|PRODUCTION)

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const crypto = require('node:crypto');
const admin = require('firebase-admin');

// -------- Secrets --------
const TRANSAK_API_KEY = defineSecret('TRANSAK_API_KEY');              // partner API key
const TRANSAK_API_SECRET = defineSecret('TRANSAK_API_SECRET');        // partner API secret
const TRANSAK_ENV = defineSecret('TRANSAK_ENV');                      // STAGING | PRODUCTION
const TRANSAK_ALLOWED_ORIGINS = defineSecret('TRANSAK_ALLOWED_ORIGINS'); // CSV of allowed origins (optional)
const TRANSAK_SECRET = defineSecret('TRANSAK_SECRET');                // optional legacy webhook HMAC secret
const TRANSAK_ACCESS_TOKEN = defineSecret('TRANSAK_ACCESS_TOKEN');    // optional fallback token

// -------- Admin init --------
try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();
const TOKEN_DOC = db.doc('system/transak_access_token'); // token cache doc (optional)

// -------- Utils --------
const normEnv = (v) => String(v || 'STAGING').toUpperCase();
const baseApi = (envName) => normEnv(envName) === 'PRODUCTION'
  ? 'https://api.transak.com' : 'https://api-stg.transak.com';

function parseAllowedOrigins(v) {
  const raw = String(v || '').trim();
  return raw ? raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
}
function extractOrigin(req) {
  const o = (req.get('origin') || req.get('Origin') || '').toLowerCase();
  if (o) return o;
  const r = (req.get('referer') || req.get('Referer') || '').toLowerCase();
  try { return r ? new URL(r).origin.toLowerCase() : ''; } catch { return ''; }
}
function extractReferrerDomain(req) {
  const r = req.get('referer') || req.get('Referer') || '';
  try { return new URL(r).host; } catch { return ''; }
}
function decodeJwtExpMs(token) {
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return typeof json?.exp === 'number' ? json.exp * 1000 : null;
  } catch { return null; }
}

// -------- ENV-AWARE cache (tolerant to missing Firestore IAM) --------
async function readCachedToken(expectedEnv) {
  try {
    const snap = await TOKEN_DOC.get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    if (normEnv(d.env) !== normEnv(expectedEnv)) return null;
    if (!d.token || !d.expiresAt) return null;
    return d; // { env, token, expiresAt, ... }
  } catch (e) {
    logger.warn('[transak] cache read skipped:', e.message);
    return null;
  }
}
async function writeCachedToken(envName, token, expiresAtMs) {
  try {
    await TOKEN_DOC.set({
      env: normEnv(envName),
      token,
      issuedAt: Date.now(),
      expiresAt: expiresAtMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    logger.warn('[transak] cache write skipped:', e.message);
  }
}

// -------- Refresh Access Token (respects env) --------
async function refreshPartnerAccessTokenOnce(envName) {
  const apiKey = process.env.TRANSAK_API_KEY;
  const apiSecret = process.env.TRANSAK_API_SECRET;
  if (!apiKey || !apiSecret) {
    logger.error('[transak] Missing TRANSAK_API_KEY or TRANSAK_API_SECRET');
    return null;
  }
  const url = `${baseApi(envName)}/partners/api/v2/refresh-token`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        // IMPORTANT: Transak expects this exact header name
        'api-secret': apiSecret,
      },
      body: JSON.stringify({ apiKey }),
    });

    const text = await resp.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    if (!resp.ok) {
      logger.error('[transak] refresh-token failed', resp.status, String(text).slice(0, 400));
      return null;
    }

    const token = json?.accessToken || json?.data?.accessToken || json?.access_token || json?.token;
    const expiresSec = json?.expiresAt || json?.data?.expiresAt || null;
    if (!token) return null;

    let expMs = decodeJwtExpMs(token);
    if (!expMs && typeof expiresSec === 'number') expMs = expiresSec * 1000;
    if (!expMs) { const SEVEN = 7 * 24 * 60 * 60 * 1000, BUF = 2 * 60 * 60 * 1000; expMs = Date.now() + (SEVEN - BUF); }

    await writeCachedToken(envName, token, expMs);
    return { token, envUsed: normEnv(envName), expMs };
  } catch (e) {
    logger.error('[transak] refresh-token error', e.message || e);
    return null;
  }
}

async function getPartnerAccessToken(requiredEnv) {
  const envWanted = normEnv(requiredEnv || process.env.TRANSAK_ENV || 'STAGING');

  // 1) cached for THIS env only
  const cached = await readCachedToken(envWanted);
  if (cached && typeof cached.expiresAt === 'number' && cached.expiresAt > Date.now() + 3600_000) {
    return { token: cached.token, envUsed: envWanted };
  }

  // 2) refresh in THIS env
  const fresh = await refreshPartnerAccessTokenOnce(envWanted);
  if (fresh?.token) return fresh;

  // 3) fallback (not recommended)
  const fallback = process.env.TRANSAK_ACCESS_TOKEN;
  if (fallback) {
    logger.warn('[transak] using fallback TRANSAK_ACCESS_TOKEN (no cache)');
    return { token: fallback, envUsed: envWanted };
  }

  throw new Error('Unable to obtain Transak access token');
}

// -------- Auth helper --------
async function verifyFirebaseIdToken(req) {
  const authz = req.get('authorization') || req.get('Authorization') || '';
  const m = /Bearer\s+([A-Za-z0-9-_.]+)/.exec(authz);
  if (!m) return null;
  try { return await admin.auth().verifyIdToken(m[1]); } catch { return null; }
}

// -------- Webhook (legacy-compatible stub; upgrade later to JWT decode) --------
function timingsafeEqual(a, b) {
  const ab = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
function computeHmacs(secret, raw) {
  const key = Buffer.from(String(secret || ''), 'utf8');
  const data = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw || ''), 'utf8');
  const h = crypto.createHmac('sha256', key).update(data);
  const hex = h.digest('hex');
  const b64 = Buffer.from(hex, 'hex').toString('base64');
  return { hex, b64 };
}
function verifySignature(req) {
  const secret = process.env.TRANSAK_SECRET || process.env.TRANSAK_WEBHOOK_SECRET || '';
  if (!secret) return true; // dev/staging
  const heads = [req.get('x-transak-signature'), req.get('transak-signature'), req.get('x-signature')].filter(Boolean);
  if (!heads.length) return false;
  const { hex, b64 } = computeHmacs(secret, req.rawBody || '');
  return heads.some(h => timingsafeEqual(h, hex) || timingsafeEqual(h, b64));
}

const transakWebhook = onRequest({ cors: true, secrets: [TRANSAK_SECRET] }, async (req, res) => {
  try {
    if (req.method === 'GET') return res.status(200).send('OK');
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const verified = verifySignature(req);
    const body = (() => { try { return JSON.parse(req.rawBody?.toString('utf8') || '{}'); } catch { return {}; }})();
    const orderId = String(body.orderId || body.id || body?.data?.id || crypto.randomUUID());
    const status = body.status || body?.event || body?.data?.status || 'UNKNOWN';
    const userId = String(body.partnerCustomerId || body?.userId || body?.customerId || '');

    try {
      await db.doc(`transakOrders/${orderId}`).set({
        userId: userId || null,
        environment: normEnv(process.env.TRANSAK_ENV || 'STAGING'),
        status,
        verified,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        rawPayload: body,
      }, { merge: true });
    } catch (e) {
      logger.warn('[transakWebhook] Firestore write skipped:', e.message);
    }
    return res.json({ ok: true, orderId });
  } catch (err) {
    logger.error('[transakWebhook] error', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

// -------- Create Session (prefills email, locks XRP to your wallet, $100 USD) --------
const createTransakSession = onRequest({
  cors: true,
  secrets: [TRANSAK_API_KEY, TRANSAK_API_SECRET, TRANSAK_ENV, TRANSAK_ALLOWED_ORIGINS, TRANSAK_ACCESS_TOKEN],
}, async (req, res) => {
  try {
    if (req.method === 'GET') return res.status(200).json({ ok: true });
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const allowed = parseAllowedOrigins(process.env.TRANSAK_ALLOWED_ORIGINS || '');
    const origin = extractOrigin(req);
    if (allowed.length && (!origin || !allowed.includes(origin))) {
      logger.warn(`[createTransakSession] blocked origin=${origin}`);
      return res.status(403).json({ ok: false, error: 'origin_not_allowed' });
    }

    // Verify Firebase user; we get email from their ID token
    const decoded = await verifyFirebaseIdToken(req);
    if (!decoded?.uid) return res.status(401).json({ ok: false, error: 'unauthorized' });

    // Choose environment (STAGING or PRODUCTION) from secret
    const desiredEnv = normEnv(process.env.TRANSAK_ENV || 'STAGING');
    const { token: accessToken, envUsed } = await getPartnerAccessToken(desiredEnv);

    const apiKey = process.env.TRANSAK_API_KEY;
    const referrerDomain = extractReferrerDomain(req) || process.env.TRANSAK_REFERRER_DOMAIN || 'localhost';

    // ---- WIDGET PARAMS ----
    const widgetParams = {
      referrerDomain,                    // REQUIRED by Transak
      partnerCustomerId: decoded.uid,    // your internal user ID (helps in webhooks)

      // Prefill email (skips email screen; user may still OTP if needed)
      ...(decoded.email ? { email: decoded.email } : {}),

      // Start at $100 USD (user can edit)
      fiatCurrency: 'USD',
      defaultFiatAmount: '100',

      // Lock to XRP + your XRPL address; hide the address form
      cryptoCurrencyCode: 'XRP',
      walletAddress: 'r4a4JzC7H7BY4acKkUR8bMnvjpZD2aTtky',
      disableWalletAddressForm: true,

      // Optional: start on card payments
      defaultPaymentMethod: 'credit_debit_card',

      // Optional (if you gather with consent, uncomment + fill):
      // isAutoFillUserData: true,
      // userData: {
      //   firstName: 'Rambod',
      //   lastName: 'Rad',
      //   dob: '1990-01-01',
      //   address: {
      //     addressLine1: '123 Main St',
      //     city: 'Calgary',
      //     state: 'AB',
      //     countryCode: 'CA',
      //     zipCode: 'T2X1X1'
      //   }
      // }
    };

    const url = `${baseApi(envUsed)}/auth/public/v2/session`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'access-token': accessToken,
      },
      body: JSON.stringify({ widgetParams }),
    });

    const text = await resp.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    if (!resp.ok || !json?.session_id) {
      logger.error('[createTransakSession] create session failed', resp.status, String(text).slice(0, 400));
      return res.status(500).json({ ok: false, error: 'create_session_failed' });
    }

    return res.json({ ok: true, sessionId: json.session_id, apiKey, environment: envUsed });
  } catch (err) {
    logger.error('[createTransakSession] error', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

module.exports = { transakWebhook, createTransakSession };
