// src/components/wallet/xrplClient.js
// Lightweight XRPL helpers (Mainnet) scoped to the wallet feature.
// - Singleton WebSocket client
// - Get XRP balance & account info
// - Get trustlines
// - Check for RAZ trustline from your issuer

import { Client, dropsToXrp } from 'xrpl';

// --- Network endpoint (Mainnet) ---
const MAINNET_WSS = 'wss://xrplcluster.com'; // reliable mainnet cluster

// --- Your token issuer & currency ---
export const RAZ_ISSUER = 'rUhwR4gM7KS2M6xLHMeL2hVCF86WhqocTj';
export const RAZ_CURRENCY = 'RAZ';

// --- Singleton client ---
let client = null;
let connectPromise = null;

export async function connectOnce() {
  if (client && client.isConnected()) return client;
  if (connectPromise) return connectPromise;

  client = new Client(MAINNET_WSS);
  connectPromise = client.connect().then(() => {
    connectPromise = null;
    client.once('disconnected', () => {
      client = null;
    });
    return client;
  });

  return connectPromise;
}

/**
 * Get validated account info (XRP balance, sequence, flags, etc.)
 * @param {string} classicAddress - r... address
 * @returns {Promise<{ xrpBalance: string, raw: any }>}
 */
export async function getAccountInfo(classicAddress) {
  const c = await connectOnce();

  const resp = await c.request({
    command: 'account_info',
    account: classicAddress,
    ledger_index: 'validated',
  });

  const drops = resp.result?.account_data?.Balance ?? '0';
  return {
    xrpBalance: dropsToXrp(drops), // e.g. "12.345"
    raw: resp.result,
  };
}

/**
 * Get IOU trustlines for the account (validated)
 * @param {string} classicAddress - r... address
 * @returns {Promise<Array<{currency:string, issuer:string, balance:string, limit:string, limit_peer:string}>>}
 */
export async function getTrustlines(classicAddress) {
  const c = await connectOnce();

  const lines = [];
  let marker;

  do {
    // eslint-disable-next-line no-await-in-loop
    const resp = await c.request({
      command: 'account_lines',
      account: classicAddress,
      ledger_index: 'validated',
      marker,
    });

    const page = resp.result?.lines || [];
    lines.push(
      ...page.map((l) => ({
        currency: l.currency,
        issuer: l.account,     // issuer address
        balance: l.balance,    // string
        limit: l.limit,        // your side limit
        limit_peer: l.limit_peer,
        authorized: l.authorized ?? false,
        peer_authorized: l.peer_authorized ?? false,
        freeze: l.freeze ?? false,
        freeze_peer: l.freeze_peer ?? false,
        no_ripple: l.no_ripple ?? false,
        quality_in: l.quality_in ?? 0,
        quality_out: l.quality_out ?? 0,
      }))
    );

    marker = resp.result?.marker;
  } while (marker);

  return lines;
}

/**
 * Find the RAZ trustline (if it exists).
 * @param {string} classicAddress
 * @returns {Promise<null | {currency:string, issuer:string, balance:string, limit:string, limit_peer:string}>}
 */
export async function findRazTrustline(classicAddress) {
  const lines = await getTrustlines(classicAddress);
  return (
    lines.find(
      (l) => l.currency === RAZ_CURRENCY && l.issuer === RAZ_ISSUER
    ) || null
  );
}

/** Optional helper to close the socket (usually not needed in SPA). */
export async function disconnect() {
  if (client && client.isConnected()) {
    await client.disconnect();
    client = null;
  }
}
