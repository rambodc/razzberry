// src/drop-passcode/DropPasscode.js
import React, { useCallback, useState } from 'react';
import TopBar from '../components/TopBar';
import layoutStyles from '../styles/layout.module.css';
import { useNavigate } from 'react-router-dom';

export default function DropPasscode() {
  const navigate = useNavigate();
  const handleBack = useCallback(() => {
    if (window.history.length > 2) navigate(-1); else navigate('/home');
  }, [navigate]);

  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => {
    const v = e.target.value.replace(/\D+/g, '').slice(0, 6);
    setCode(v);
    if (v.length === 6) {
      if (v === '123456') {
        setUnlocked(true);
        setError('');
      } else {
        setError('Incorrect passcode');
      }
    } else {
      setError('');
    }
  };

  return (
    <div className={layoutStyles.detailPage}>
      <TopBar variant="back" backLabel="Back" onBack={handleBack} />
      {!unlocked ? (
        <div style={{ maxWidth: 480, width: '100%', margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
          <h1 style={{ marginBottom: 8 }}>Enter Passcode</h1>
          <p style={{ color: '#4b5563', marginBottom: 12 }}>Enter the 6-digit passcode to continue.</p>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            type="text"
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            name="drop-passcode"
            value={code}
            onChange={onChange}
            placeholder="••••••"
            maxLength={6}
            autoFocus
            style={{
              letterSpacing: 6,
              textAlign: 'center',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid #ddd',
              fontSize: 24,
              width: 220,
            }}
          />
          {error && <p style={{ color: '#b91c1c', marginTop: 10 }}>{error}</p>}
          <p style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>Hint for dev: 123456</p>
        </div>
      ) : (
        <div style={{ maxWidth: 800, width: '100%', margin: '80px auto', padding: '0 16px' }}>
          <h1>Drop</h1>
          <p style={{ color: '#4b5563' }}>Coming soon.</p>
        </div>
      )}
    </div>
  );
}
