// src/balance/Balance.js
import React from 'react';
import TopBar from '../components/TopBar';
import MobileNavTabs from '../components/MobileNavTabs';
import layoutStyles from '../styles/layout.module.css';

export default function Balance() {
  return (
    <div className={layoutStyles.homeContainer} style={{ paddingBottom: 0 }}>
      <TopBar hideLeft>
        <MobileNavTabs />
      </TopBar>

      <div style={{ maxWidth: 800, width: '100%', margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1 style={{ margin: '8px 0 12px' }}>Balance</h1>
        <p style={{ color: '#4b5563' }}>Balance details coming soon.</p>
      </div>
    </div>
  );
}
