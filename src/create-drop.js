// src/create-drop.js
import React, { useCallback } from 'react';
import TopBar from './components/TopBar';
import { useNavigate } from 'react-router-dom';

export default function CreateDrop() {
  const navigate = useNavigate();
  const handleBack = useCallback(() => {
    if (window.history.length > 2) navigate(-1); else navigate('/home');
  }, [navigate]);

  return (
    <div className="detail-page">
      <TopBar variant="back" backLabel="Back" onBack={handleBack} />
      <div style={{ maxWidth: 800, margin: '80px auto', padding: '0 16px' }}>
        <h1>Create Drop</h1>
        <p style={{ color: '#4b5563' }}>Coming soon.</p>
      </div>
    </div>
  );
}

