// src/components/MobileNavTabs.js
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaEllipsisH, FaHome, FaWallet, FaWater } from 'react-icons/fa';

export default function MobileNavTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const Item = ({ icon: Icon, label, active, onClick }) => {
    const accent = '#1d4ed8';
    const base = '#4b5563';
    const color = active ? accent : base;

    return (
      <button
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          minWidth: 88,
          padding: '6px 0',
          borderRadius: 14,
          border: '1px solid ' + (active ? accent : 'rgba(148,163,184,0.25)'),
          background: active ? 'rgba(29,78,216,0.08)' : 'transparent',
          color,
          fontWeight: 600,
          fontSize: 12,
          cursor: 'pointer',
          transition: 'all 160ms ease',
        }}
      >
        <Icon size={18} color={color} />
        <span style={{ fontSize: 12, lineHeight: 1 }}>{label}</span>
      </button>
    );
  };

  const toHome = () => navigate('/home');
  const toDrops = () => navigate('/drops');
  const toBalance = () => navigate('/wallet');
  const toMore = () => navigate('/more');

  const isHome = pathname === '/home';
  const isDrops = pathname.startsWith('/drops');
  const isBalance = pathname.startsWith('/wallet');
  const isMore = pathname.startsWith('/more');

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: 'rgba(255,255,255,0.92)',
        padding: '8px 14px',
        borderRadius: 16,
        boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
        border: '1px solid rgba(226,232,240,0.8)',
      }}
    >
      <Item icon={FaHome} label="Home" active={isHome} onClick={toHome} />
      <Item icon={FaWater} label="Drops" active={isDrops} onClick={toDrops} />
      <Item icon={FaWallet} label="Balance" active={isBalance} onClick={toBalance} />
      <Item icon={FaEllipsisH} label="More" active={isMore} onClick={toMore} />
    </div>
  );
}
