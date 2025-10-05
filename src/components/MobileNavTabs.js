// src/components/MobileNavTabs.js
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiDroplet, FiCreditCard, FiMoreHorizontal } from 'react-icons/fi';

export default function MobileNavTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { label: 'Home', to: '/home', icon: FiHome, color: '#2563eb' },
    { label: 'Drops', to: '/drops', icon: FiDroplet, color: '#0ea5e9' },
    { label: 'Balance', to: '/wallet', icon: FiCreditCard, color: '#22c55e' },
    { label: 'More', to: '/more', icon: FiMoreHorizontal, color: '#6366f1' },
  ];

  const isActive = (to) => {
    if (to === '/home') return pathname === '/home';
    return pathname.startsWith(to);
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 22,
        background: 'rgba(255,255,255,0.96)',
        padding: '2px 20px 10px',
        borderRadius: 18,
        boxShadow: '0 16px 32px rgba(15,23,42,0.1)',
      }}
    >
      {tabs.map(({ label, to, icon: Icon, color }) => {
        const active = isActive(to);
        const textColor = active ? color : '#475569';
        const iconColor = active ? color : '#94a3b8';

        return (
          <button
            key={label}
            onClick={() => navigate(to)}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              minWidth: 64,
              padding: '4px 0 6px',
              background: 'transparent',
              border: 'none',
              color: textColor,
              fontSize: 10.5,
              fontWeight: active ? 600 : 500,
              letterSpacing: 0.15,
              cursor: 'pointer',
              transition: 'color 160ms ease, transform 160ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
            }}
          >
            <Icon size={14} color={iconColor} />
            <span style={{ fontSize: 10.5, lineHeight: 1.15 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
