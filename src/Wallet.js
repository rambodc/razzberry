// src/Wallet.js
import React, { useState } from 'react';
import { auth } from './firebase';
import { getIdToken } from 'firebase/auth';

export default function Wallet() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const pingFireblocks = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in required');
      const idToken = await getIdToken(user, true);
      const resp = await fetch('/api/fireblocks/ping', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'content-type': 'application/json',
        },
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || `Request failed (${resp.status})`);
      }
      setResult(json);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '28px auto', padding: '0 16px' }}>
      <h1 style={{ margin: '0 0 8px' }}>Wallet</h1>
      <p style={{ margin: '0 0 16px', color: '#4b5563' }}>
        Test 1: Ping Fireblocks to verify credentials and connectivity.
      </p>

      <button
        onClick={pingFireblocks}
        disabled={loading}
        style={{
          padding: '10px 14px',
          background: '#111827',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: loading ? 'default' : 'pointer',
          minWidth: 180,
        }}
      >
        {loading ? 'Pinging…' : 'Ping Fireblocks'}
      </button>

      {error && (
        <div style={{ marginTop: 16, color: '#b91c1c' }}>Error: {error}</div>
      )}

      {result && (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            background: '#0b1220',
            color: '#e5e7eb',
            padding: 12,
            marginTop: 16,
            borderRadius: 8,
            overflowX: 'auto',
          }}
        >{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}

