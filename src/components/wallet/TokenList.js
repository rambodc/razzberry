// src/components/wallet/TokenList.js
import React, { useEffect, useMemo, useState } from 'react';
import { getTrustlines, RAZ_CURRENCY, RAZ_ISSUER } from './xrplClient';

export default function TokenList({ account }) {
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState([]);
  const [err, setErr] = useState('');

  const load = async () => {
    if (!account) return;
    setLoading(true);
    setErr('');
    try {
      const tl = await getTrustlines(account);
      setLines(tl);
    } catch (e) {
      console.error(e);
      setErr('Failed to load trustlines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const sorted = useMemo(() => {
    return [...lines].sort((a, b) =>
      `${a.currency}:${a.issuer}`.localeCompare(`${b.currency}:${b.issuer}`)
    );
  }, [lines]);

  if (!account) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.title}>Tokens & Trustlines</div>
        </div>
        <div style={{ opacity: 0.8 }}>Connect Xaman to view trustlines.</div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.title}>Tokens & Trustlines</div>
        <button onClick={load} disabled={loading} style={styles.refreshBtn}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {err && <div style={styles.error}>{err}</div>}

      {!loading && sorted.length === 0 && (
        <div style={{ opacity: 0.8 }}>No trustlines found.</div>
      )}

      <div style={styles.list}>
        {sorted.map((l, i) => {
          const isRAZ = l.currency === RAZ_CURRENCY && l.issuer === RAZ_ISSUER;
          return (
            <div key={`${l.currency}:${l.issuer}:${i}`} style={styles.item}>
              <div>
                <div style={styles.currLine}>
                  <span style={styles.currency}>{l.currency}</span>
                  {isRAZ && <span style={styles.badge}>RAZ</span>}
                </div>
                <div style={styles.issuer} title={l.issuer}>{l.issuer}</div>
              </div>
              <div style={styles.right}>
                <div style={styles.balance} title={`Balance: ${l.balance}`}>
                  {l.balance}
                </div>
                <div style={styles.limit} title={`Limit: ${l.limit}`}>
                  limit {l.limit}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  card: {
    width: 'min(720px, 96vw)',
    background: '#fff',
    border: '1px solid #e6e6e6',
    borderRadius: 16,
    padding: 16,
    color: '#111',
    margin: '12px auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: 700 },
  refreshBtn: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #ddd',
    background: 'linear-gradient(180deg, #ffffff, #f8f8f8)',
    color: '#111',
    cursor: 'pointer',
  },
  error: { color: '#b3261e', fontSize: 13, marginBottom: 6 },
  list: { display: 'grid', gap: 8 },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    background: 'rgba(0,0,0,0.03)',
  },
  currLine: { display: 'flex', alignItems: 'center', gap: 8 },
  currency: { fontWeight: 800, letterSpacing: 0.3 },
  badge: {
    fontSize: 11,
    padding: '2px 6px',
    borderRadius: 8,
    border: '1px solid rgba(0,0,0,0.2)',
    opacity: 0.85,
  },
  issuer: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    opacity: 0.85,
    fontSize: 12,
    wordBreak: 'break-all',
  },
  right: { textAlign: 'right' },
  balance: { fontWeight: 700 },
  limit: { opacity: 0.75, fontSize: 12 },
};
