// src/collectibles/Collectibles.js
import React from 'react';
import TopBar from '../components/TopBar';
import MobileNavTabs from '../components/MobileNavTabs';

export default function Collectibles() {
  return (
    <div className="home-container" style={{ paddingBottom: 0 }}>
      <TopBar hideLeft>
        <MobileNavTabs />
      </TopBar>

      <div style={{ maxWidth: 960, margin: '80px auto 24px', padding: '0 16px', textAlign: 'center' }}>
        <h1 style={{ margin: '8px 0 12px' }}>Drops</h1>
        <p style={{ color: '#4b5563' }}>Your drops will appear here. Coming soon.</p>
      </div>
    </div>
  );
}
