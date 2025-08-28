// src/components/wallet/RazTrustlineCard.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RAZ_CURRENCY, RAZ_ISSUER, findRazTrustline } from './xrplClient';

// small helper
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function RazTrustlineCard({ account, jwt, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [line, setLine] = useState(null);       // existing RAZ trustline or null
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('');     // human status line

  // signing state
  const [payload, setPayload] = useState(null); // created payload response
  const [signState, setSignState] = useState(null); // { resolved, signed, txid? }
  const pollStopRef = useRef(false);

  const exists = useMemo(() => Boolean(line), [line]);

  const refresh = async () => {
    if (!account) return;
    setLoading(true);
    setErr('');
    try {
      const tl = await findRazTrustline(account);
      setLine(tl);
      setStatus(tl ? 'RAZ trustline already exists.' : 'No RAZ trustline yet.');
    } catch (e) {
      console.error(e);
      setErr('Failed to check RAZ trustline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  useEffect(() => {
    return () => { pollStopRef.current = true; };
  }, []);

  // --- Create a TrustSet payload (client-only, via Xaman JWT) ---
  const addRazTrustline = async () => {
    if (!account) { setStatus('Connect Xaman first.'); return; }
    if (!jwt)     { setStatus('Connect Xaman first.'); return; }

    setLoading(true);
    setErr('');
    setPayload(null);
    setSignState(null);
    setStatus('Creating TrustSet request…');
    pollStopRef.current = false;

    try {
      const origin = window.location.origin;
      const res = await fetch('https://xumm.app/api/v1/jwt/payload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txjson: {
            TransactionType: 'TrustSet',
            LimitAmount: {
              currency: RAZ_CURRENCY,
              issuer: RAZ_ISSUER,
              value: '10000000000', // max you’re willing to hold (string)
            },
            // No Flags required for a basic trustline
          },
          options: {
            submit: true, // let Xaman submit after signing (OK for TrustSet)
            return_url: {
              app: `${origin}/wallet?trustset=1`,
              web: `${origin}/wallet?payload={id}`,
            },
          },
          custom_meta: {
            identifier: 'showbat-raz-trustline',
            instruction: 'Add RAZ trustline to your account.',
          },
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Create payload failed: ${res.status} ${t}`);
      }

      const created = await res.json();
      setPayload(created);
      setStatus('TrustSet request created. Open Xaman or scan the QR to continue.');

      // Deep link on mobile; QR on desktop
      if (created?.next?.always) {
        window.open(created.next.always, '_blank', 'noopener,noreferrer');
      }

      // Start polling until user signs/rejects
      await pollUntilResolved(created.uuid);
      if (signState?.resolved && signState?.signed) {
        setStatus('✅ Trustline added (pending validation). Refreshing…');
        // Give network a moment, then refresh
        await wait(2500);
        await refresh();
        onChanged?.();
      }
    } catch (e) {
      console.error(e);
      setErr('Could not create TrustSet request');
    } finally {
      setLoading(false);
    }
  };

  const pollUntilResolved = async (uuid) => {
    try {
      for (let i = 0; i < 120; i++) { // ~4 minutes @2s
        if (pollStopRef.current) return;

        const r = await fetch(`https://xumm.app/api/v1/jwt/payload/${uuid}`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (!r.ok) { await wait(2000); continue; }
        const d = await r.json();

        const resolved = Boolean(d?.meta?.resolved);
        const signed = d?.response?.signed === true;
        const txid = d?.response?.txid || null;

        if (d?.meta?.opened) setStatus('Opened in Xaman…');

        if (resolved) {
          setSignState({ resolved, signed, txid });
          setStatus(signed ? '✅ Signed' : '❌ Rejected');
          return;
        }
        await wait(2000);
      }
      setStatus('Timed out waiting for response.');
    } catch (e) {
      console.error(e);
      setStatus('Error while checking payload status.');
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.title}>RAZ Trustline</div>
        <button onClick={refresh} disabled={loading} style={styles.refreshBtn}>
          {loading ? 'Refreshing…' : 'Check'}
        </button>
      </div>

      <div style={styles.issuerBox}>
        <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 4 }}>Issuer</div>
        <div style={styles.issuer} title={RAZ_ISSUER}>{RAZ_ISSUER}</div>
      </div>

      {exists ? (
        <div style={styles.presentBox}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>RAZ trustline already exists.</div>
          <div style={styles.kv}>
            <div>Currency</div><div>{line.currency}</div>
          </div>
          <div style={styles.kv}>
            <div>Balance</div><div>{line.balance}</div>
          </div>
          <div style={styles.kv}>
            <div>Your limit</div><div>{line.limit}</div>
          </div>
        </div>
      ) : (
        <button
          onClick={addRazTrustline}
          disabled={loading || !account || !jwt}
          style={styles.primaryBtn}
          title={!jwt ? 'Connect Xaman first' : 'Create TrustSet to add the RAZ trustline'}
        >
          {loading ? 'Creating…' : 'Get RAZ Account (Add Trustline)'}
        </button>
      )}

      {status && <div style={styles.status}>{status}</div>}
      {err && <div style={styles.error}>{err}</div>}

      {/* Show QR + deep link if we created a payload */}
      {payload && (
        <div style={styles.payloadBox}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Sign request</div>
          <div style={styles.qrWrap}>
            {payload?.refs?.qr_png ? (
              <img
                src={payload.refs.qr_png}
                alt="Scan with Xaman"
                style={{ width: 180, height: 180, imageRendering: 'pixelated' }}
              />
            ) : (
              <div style={styles.qrFallback}>QR will appear here</div>
            )}
          </div>
          {payload?.next?.always && (
            <a
              href={payload.next.always}
              target="_blank"
              rel="noreferrer"
              style={styles.openLink}
            >
              Open in Xaman
            </a>
          )}
        </div>
      )}

      {/* Outcome */}
      {signState?.resolved && (
        <div style={styles.resultBox}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Result: {signState.signed ? '✅ Signed' : '❌ Rejected'}
          </div>
          {signState.txid && (
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              TxID: <code>{signState.txid}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    width: 'min(720px, 96vw)',
    background: 'var(--card, #141417)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    color: 'var(--fg, #e9e9ee)',
    margin: '12px auto',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: 700 },
  refreshBtn: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
    color: '#fff',
    cursor: 'pointer',
  },
  issuerBox: {
    padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', marginBottom: 10,
  },
  issuer: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    wordBreak: 'break-all', opacity: 0.9, fontSize: 12,
  },
  presentBox: {
    padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', marginBottom: 8,
  },
  kv: { display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, fontSize: 14, margin: '2px 0' },
  primaryBtn: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  status: { marginTop: 10, fontSize: 13, opacity: 0.85 },
  error: { marginTop: 6, color: '#ff9aa2', fontSize: 13 },
  payloadBox: { marginTop: 12, padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 12 },
  qrWrap: { display: 'grid', placeItems: 'center', minHeight: 200 },
  qrFallback: { width: 180, height: 180, borderRadius: 12, background: 'rgba(255,255,255,0.08)' },
  openLink: { display: 'inline-block', marginTop: 8, fontSize: 14, textDecoration: 'underline', color: '#fff' },
  resultBox: { marginTop: 10, padding: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 12, textAlign: 'left' },
};
