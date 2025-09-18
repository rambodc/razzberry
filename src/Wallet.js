// src/Wallet.js
import React, { useState } from 'react';
import { auth } from './firebase';
import { getIdToken } from 'firebase/auth';

export default function Wallet() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [creatingHandle, setCreatingHandle] = useState(false);
  const [signing, setSigning] = useState(false);

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

  const createOrGetVaults = async () => {
    setCreating(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in required');
      const idToken = await getIdToken(user, true);
      const resp = await fetch('/api/fireblocks/createOrGetVaults', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) throw new Error(json?.error || `Request failed (${resp.status})`);
      setResult(json);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setCreating(false);
    }
  };

  const createDepositHandle = async () => {
    setCreatingHandle(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in required');
      const idToken = await getIdToken(user, true);
      const resp = await fetch('/api/fireblocks/createDepositHandle', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.ok) throw new Error(json?.error || `Request failed (${resp.status})`);
      setResult(json);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setCreatingHandle(false);
    }
  };

  const xrplSignDryRun = async () => {
    setSigning(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Sign in required');
      const idToken = await getIdToken(user, true);
      const resp = await fetch('/api/fireblocks/xrplSignDryRun', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json?.ok === false) throw new Error(json?.error || json?.note || `Request failed (${resp.status})`);
      setResult(json);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSigning(false);
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '28px auto', padding: '0 16px' }}>
      <h1 style={{ margin: '0 0 8px' }}>Wallet</h1>
      <p style={{ margin: '0 0 16px', color: '#4b5563' }}>
        Test 1: Ping Fireblocks to verify credentials and connectivity.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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

        <button
          onClick={createOrGetVaults}
          disabled={creating}
          style={{
            padding: '10px 14px',
            background: '#0ea5e9',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: creating ? 'default' : 'pointer',
            minWidth: 220,
          }}
        >
          {creating ? 'Creating…' : 'Create/Get Vaults'}
        </button>

        <button
          onClick={createDepositHandle}
          disabled={creatingHandle}
          style={{
            padding: '10px 14px',
            background: '#22c55e',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: creatingHandle ? 'default' : 'pointer',
            minWidth: 260,
          }}
        >
          {creatingHandle ? 'Issuing…' : 'Create Deposit Handle'}
        </button>

        <button
          onClick={xrplSignDryRun}
          disabled={signing}
          style={{
            padding: '10px 14px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: signing ? 'default' : 'pointer',
            minWidth: 240,
          }}
        >
          {signing ? 'Signing…' : 'XRPL Sign Dry Run'}
        </button>
      </div>

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
