// functions/fireblocks.js 2
// Node 20, ESM, Firebase Functions v2
// Endpoint: fireblocksPing → sanity check for Fireblocks auth/connectivity

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import admin from 'firebase-admin';
import { FireblocksSDK } from 'fireblocks-sdk';

// ---- Secrets (set these via Firebase Functions Secrets) ----
//   firebase functions:secrets:set FIREBLOCKS_API_KEY
//   firebase functions:secrets:set FIREBLOCKS_API_PRIVATE_KEY   # PEM contents
//   (optional) firebase functions:secrets:set FIREBLOCKS_BASE_URL  # e.g. https://api.fireblocks.io
const FIREBLOCKS_API_KEY = defineSecret('FIREBLOCKS_API_KEY');
const FIREBLOCKS_API_PRIVATE_KEY = defineSecret('FIREBLOCKS_API_PRIVATE_KEY');
const FIREBLOCKS_BASE_URL = defineSecret('FIREBLOCKS_BASE_URL'); // optional

// ---- Lazy init Firebase Admin ----
try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();

// ---- Helpers ----
async function verifyIdToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const m = /^Bearer\s+([A-Za-z0-9-_.~]+)$/i.exec(String(auth));
  if (!m) throw Object.assign(new Error('Missing Authorization: Bearer <ID_TOKEN>'), { code: 401 });
  const idToken = m[1];
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded; // contains uid, email, etc.
}

function corsify(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'authorization, content-type');
  res.set('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
}

function maskKey(key) {
  if (!key) return '';
  return key.length <= 6 ? '******' : `${key.slice(0, 3)}***${key.slice(-3)}`;
}

// ---- Build Fireblocks client from secrets ----
function buildFireblocksClient({ apiKey, privateKeyPem, baseUrl }) {
  // FireblocksSDK(privateKey: string, apiKey: string, apiBaseUrl?: string)
  const url = baseUrl || 'https://api.fireblocks.io';
  return new FireblocksSDK(privateKeyPem, apiKey, url);
}

// ---- Helpers: vault listing ----
async function listAllVaultAccounts(fb) {
  const out = [];
  let before = undefined;
  for (let i = 0; i < 5; i++) {
    try {
      const page = await fb.getVaultAccounts?.({ limit: 200, orderBy: 'ASC', before });
      const accounts = page?.accounts ?? page ?? [];
      if (!Array.isArray(accounts) || accounts.length === 0) break;
      out.push(...accounts);
      if (!page?.paging?.before) break;
      before = page.paging.before;
    } catch (e) {
      logger.warn('[listAllVaultAccounts] page fetch failed:', e?.message || e);
      break;
    }
  }
  return out;
}

// ---- HTTPS Function: Ping Fireblocks ----
export const fireblocksPing = onRequest({
  cors: true,
  secrets: [FIREBLOCKS_API_KEY, FIREBLOCKS_API_PRIVATE_KEY, FIREBLOCKS_BASE_URL],
  region: 'us-central1',
  maxInstances: 5,
}, async (req, res) => {
  try {
    corsify(res);
    if (req.method === 'OPTIONS') return res.status(204).end();

    // 1) Verify caller (must be a signed-in Firebase user)
    const user = await verifyIdToken(req);

    // 2) Read secrets
    const apiKey = FIREBLOCKS_API_KEY.value();
    const privateKeyPem = FIREBLOCKS_API_PRIVATE_KEY.value();
    const baseUrl = FIREBLOCKS_BASE_URL.value() || 'https://api.fireblocks.io';

    if (!apiKey || !privateKeyPem) {
      throw Object.assign(new Error('Fireblocks secrets are not set'), { code: 500 });
    }

    // 3) Init Fireblocks SDK
    const fb = buildFireblocksClient({ apiKey, privateKeyPem, baseUrl });

    // 4) Make a couple of harmless calls to prove connectivity
    // These are read-only and safe.
    let assets = [];
    let firstVault = null;
    try {
      const supported = await fb.getSupportedAssets?.();
      if (Array.isArray(supported)) assets = supported;
    } catch (e) {
      logger.warn('[fireblocksPing] getSupportedAssets failed:', e?.message || e);
    }
    try {
      const vaults = await fb.getVaultAccounts?.({ limit: 1, orderBy: 'ASC' });
      if (Array.isArray(vaults?.accounts)) firstVault = vaults.accounts[0] || null;
      else if (Array.isArray(vaults)) firstVault = vaults[0] || null;
    } catch (e) {
      logger.warn('[fireblocksPing] getVaultAccounts failed:', e?.message || e);
    }

    // 5) Prepare safe response (no secrets)
    const sampleAssets = Array.isArray(assets) ? assets.slice(0, 8) : [];

    return res.status(200).json({
      ok: true,
      user: { uid: user.uid, email: user.email || null },
      fireblocks: {
        apiKeyPreview: maskKey(apiKey),
        baseUrl,
        sampleAssetsCount: Array.isArray(assets) ? assets.length : 0,
        sampleAssets,
        hasVaults: !!firstVault,
        sampleVault: firstVault
          ? {
              id: firstVault.id,
              name: firstVault.name,
              hiddenOnUI: firstVault.hiddenOnUI ?? false,
              assets: firstVault.assets ? firstVault.assets.map((a) => a.id).slice(0, 5) : [],
            }
          : null,
      },
    });
  } catch (err) {
    logger.error('fireblocksPing error', err);
    const status = err?.code && Number.isInteger(err.code) ? err.code : 500;
    return res.status(status).json({ ok: false, error: err?.message || 'Unknown error' });
  }
});

// ----------------------------------------
// Test 2: Create / Get named XRPL vaults
// ----------------------------------------
export const fireblocksCreateOrGetVaults = onRequest({
  cors: true,
  secrets: [FIREBLOCKS_API_KEY, FIREBLOCKS_API_PRIVATE_KEY, FIREBLOCKS_BASE_URL],
  region: 'us-central1',
  maxInstances: 5,
}, async (req, res) => {
  try {
    corsify(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

    const user = await verifyIdToken(req);

    const apiKey = FIREBLOCKS_API_KEY.value();
    const privateKeyPem = FIREBLOCKS_API_PRIVATE_KEY.value();
    const baseUrl = FIREBLOCKS_BASE_URL.value() || 'https://api.fireblocks.io';
    if (!apiKey || !privateKeyPem) {
      throw Object.assign(new Error('Fireblocks secrets are not set'), { code: 500 });
    }

    const fb = buildFireblocksClient({ apiKey, privateKeyPem, baseUrl });

    const desired = ['Treasury_XRP', 'Marketplace_Settlement', 'NFT_Minter'];

    const all = await listAllVaultAccounts(fb);
    const byName = new Map(Array.isArray(all) ? all.map((v) => [v.name, v]) : []);

    const results = {};
    for (const name of desired) {
      if (byName.has(name)) {
        const v = byName.get(name);
        results[name] = { id: v.id, existed: true };
        continue;
      }
      // Create if missing
      const created = await fb.createVaultAccount?.(name, false);
      if (!created?.id) throw new Error(`Failed to create vault "${name}"`);
      results[name] = { id: created.id, existed: false };
    }

    return res.status(200).json({
      ok: true,
      user: { uid: user.uid, email: user.email || null },
      vaults: results,
    });
  } catch (err) {
    logger.error('fireblocksCreateOrGetVaults error', err);
    const status = err?.code && Number.isInteger(err.code) ? err.code : 500;
    return res.status(status).json({ ok: false, error: err?.message || 'Unknown error' });
  }
});

// -----------------------------------------------------------
// Test 3: Create per-user XRP deposit handle (address + tag)
// -----------------------------------------------------------
export const fireblocksCreateDepositHandle = onRequest({
  cors: true,
  secrets: [FIREBLOCKS_API_KEY, FIREBLOCKS_API_PRIVATE_KEY, FIREBLOCKS_BASE_URL],
  region: 'us-central1',
  maxInstances: 10,
}, async (req, res) => {
  try {
    corsify(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Use POST' });

    const user = await verifyIdToken(req);
    const uid = user.uid;

    const apiKey = FIREBLOCKS_API_KEY.value();
    const privateKeyPem = FIREBLOCKS_API_PRIVATE_KEY.value();
    const baseUrl = FIREBLOCKS_BASE_URL.value() || 'https://api.fireblocks.io';
    if (!apiKey || !privateKeyPem) {
      throw Object.assign(new Error('Fireblocks secrets are not set'), { code: 500 });
    }

    const fb = buildFireblocksClient({ apiKey, privateKeyPem, baseUrl });

    // 1) If we already issued a handle, return it (idempotent)
    const docRef = db.doc(`users/${uid}/xrpl/deposit`);
    const prev = await docRef.get();
    if (prev.exists) {
      const d = prev.data() || {};
      return res.status(200).json({ ok: true, existed: true, handle: d });
    }

    // 2) Find Treasury_XRP vault
    const all = await listAllVaultAccounts(fb);
    const treasury = Array.isArray(all) ? all.find((v) => v.name === 'Treasury_XRP') : null;
    if (!treasury?.id) throw new Error('Treasury_XRP vault not found. Run Test 2 first.');

    const vaultId = String(treasury.id);
    const assetId = 'XRP';

    // 3) Generate a new XRP deposit address (address + destination tag)
    let created = null;
    try {
      created = await fb.generateNewAddress?.(vaultId, assetId, { description: `user:${uid}` });
    } catch (e) {
      logger.error('[fireblocksCreateDepositHandle] generateNewAddress failed:', e?.message || e);
      throw new Error('generate_address_failed');
    }

    if (!created?.address) throw new Error('No address returned from Fireblocks');

    const addr = created.address;
    const tag =
      (created.addressAdditionalData && (created.addressAdditionalData.tag || created.addressAdditionalData.destinationTag)) ||
      created.tag ||
      null;

    if (!tag) throw new Error('No destination tag returned for XRP');

    const handle = {
      vaultId,
      assetId,
      address: addr,
      tag: String(tag),
      depositAddressId: created.id || null,
      description: created.description || `user:${uid}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(handle, { merge: true });

    return res.status(200).json({ ok: true, existed: false, handle });
  } catch (err) {
    logger.error('fireblocksCreateDepositHandle error', err);
    const status = err?.code && Number.isInteger(err.code) ? err.code : 500;
    return res.status(status).json({ ok: false, error: err?.message || 'Unknown error' });
  }
});
