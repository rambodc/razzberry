// src/components/wallet/AccountInfo.js
import React, { useEffect, useState } from 'react';
import { getAccountInfo } from './xrplClient';

export default function AccountInfo({ account }) {
  const [loading, setLoading] = useState(false);
  const [xrp, setXrp] = useState(null);
  const [seq, setSeq] = useState(null);
  const [err, setErr] = useState('');

  const load = async () => {
    if (!account) return;
    setLoading(true);
    setErr('');
    try {
      const info = await getAccountInfo(account);
      setXrp(info.xrpBalance);
      setSeq(info.raw?.account_data?.Sequence ?? null);
    } catch (e) {
      console.error(e);
      setErr('Failed to load account info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  if (!account) {
    return (
      <div style={styles.card}>
        <div style={styles.title}>Wallet</div>
        <div style={styles.sub}>Connect Xaman to view balances.</div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <div>
          <div style={styles.title}>Wallet</div>
          <div style={styles.addr} title={account}>{account}</div>
          {seq !== null && (
            <div style={styles.meta}>Sequence: {seq}</div>
          )}
        </div>
        <button onClick={load} disabled={loading} style={styles.refreshBtn}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div style={styles.balanceBox}>
        <div style={styles.balanceLabel}>XRP Balance</div>
        <div style={styles.balanceValue}>
          {xrp === null ? (loading ? '…' : '—') : xrp}
        </div>
      </div>

      {err && <div style={styles.error}>{err}</div>}
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
    margin: '0 auto 12px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'space-between',
  },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  sub: { opacity: 0.8 },
  addr: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    opacity: 0.9,
    wordBreak: 'break-all',
    fontSize: 13,
  },
  meta: { opacity: 0.7, fontSize: 12, marginTop: 2 },
  refreshBtn: {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
    color: '#fff',
    cursor: 'pointer',
  },
  balanceBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.04)',
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    justifyContent: 'space-between',
  },
  balanceLabel: { opacity: 0.85 },
  balanceValue: { fontSize: 22, fontWeight: 800, letterSpacing: 0.3 },
  error: {
    marginTop: 8,
    color: '#ff9aa2',
    fontSize: 13,
  },
};
