// src/Wallet.js
import React, { useEffect, useMemo, useState } from 'react';
import { XummPkce } from 'xumm-oauth2-pkce'; // requires: npm i xumm-oauth2-pkce
import './App.css';
import './Home.css';

// Wallet feature components (all inside src/components/wallet/)
import AccountInfo from './components/wallet/AccountInfo';
import TokenList from './components/wallet/TokenList';
import RazTrustlineCard from './components/wallet/RazTrustlineCard';

// ✅ Public identifier only (do NOT put your API secret in frontend code)
const XAMAN_API_KEY = '287dd619-0e34-46e6-8a59-2303135fa082';

export default function Wallet() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Not connected');
  const [me, setMe] = useState(null);   // { account, picture, name? ... }
  const [jwt, setJwt] = useState(null); // short-lived OAuth2/PKCE JWT

  // Used to force-refresh TokenList after adding trustline
  const [bump, setBump] = useState(0);

  // Instantiate the Xaman OAuth client once
  const xumm = useMemo(
    () =>
      new XummPkce(XAMAN_API_KEY, {
        redirectUrl: `${window.location.origin}/wallet`,
        rememberJwt: true, // keeps session across reloads
      }),
    []
  );

  useEffect(() => {
    xumm.on('success', async () => {
      const state = await xumm.state();
      setMe(state?.me ?? null);
      setJwt(state?.jwt ?? null);
      setStatus('Connected');
      setBusy(false);
    });

    xumm.on('retrieved', async () => {
      const state = await xumm.state();
      setMe(state?.me ?? null);
      setJwt(state?.jwt ?? null);
      setStatus(state?.me ? 'Connected' : 'Not connected');
      setBusy(false);
    });

    xumm.on('error', (err) => {
      console.error(err);
      setStatus(err?.message || 'Sign-in cancelled or failed');
      setBusy(false);
    });
  }, [xumm]);

  const handleSignIn = async () => {
    setBusy(true);
    setStatus('Opening Xaman…');
    try {
      await xumm.authorize(); // desktop shows QR; mobile deep-links
    } catch (e) {
      console.error(e);
      setStatus('Could not start sign-in');
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await xumm.logout();
    setMe(null);
    setJwt(null);
    setStatus('Not connected');
  };

  // Called when RAZ trustline is added; forces TokenList to reload by remounting
  const handleRazChanged = () => setBump((n) => n + 1);

  return (
    <div className="wallet-page" style={styles.page}>
      <div style={styles.card}>
        <div style={styles.iconWrap} aria-hidden>
          <svg viewBox="0 0 64 64" width="72" height="72">
            <path d="M56 22H10a6 6 0 0 1 0-12h36a2 2 0 1 1 0 4H10a2 2 0 1 0 0 4h46a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V16a2 2 0 1 1 4 0v22a2 2 0 0 0 2 2h46a2 2 0 0 0 2-2V24a2 2 0 0 0-2-2Zm-8 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" />
          </svg>
        </div>

        <h1 style={styles.title}>Wallet</h1>
        <p style={styles.subtitle}>
          Connect your <strong>Xaman</strong> wallet to view balances and manage trustlines.
        </p>

        {!me ? (
          <button
            onClick={handleSignIn}
            disabled={busy}
            style={{ ...styles.button, ...(busy ? styles.buttonDisabled : {}) }}
          >
            {busy ? 'Opening Xaman…' : 'Sign in with Xaman'}
          </button>
        ) : (
          <button onClick={handleLogout} style={{ ...styles.button, opacity: 0.9 }}>
            Disconnect
          </button>
        )}

        <p style={styles.status} aria-live="polite">{status}</p>
      </div>

      {/* When connected, show XRPL info/components */}
      {me?.account && (
        <>
          <AccountInfo account={me.account} />
          <RazTrustlineCard account={me.account} jwt={jwt} onChanged={handleRazChanged} />
          {/* key={bump} forces remount to reload after trustline changes */}
          <TokenList key={bump} account={me.account} />
        </>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100dvh', display: 'grid', placeItems: 'start center', background: 'var(--bg, #0b0b0c)', padding: 16 },
  card: {
    width: 'min(560px, 92vw)',
    background: 'var(--card, #141417)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    padding: 20,
    textAlign: 'center',
    color: 'var(--fg, #e9e9ee)',
    margin: '18px 0',
  },
  iconWrap: { display: 'grid', placeItems: 'center', width: 88, height: 88, borderRadius: 22, margin: '8px auto 12px', background: 'rgba(255,255,255,0.04)' },
  title: { fontSize: 28, lineHeight: 1.2, margin: '10px 0 6px', letterSpacing: '0.2px' },
  subtitle: { opacity: 0.85, margin: '0 0 12px' },
  button: {
    display: 'inline-block', padding: '10px 16px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
    color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  buttonDisabled: { opacity: 0.6, cursor: 'default' },
  status: { marginTop: 10, fontSize: 13, opacity: 0.8 },
};
