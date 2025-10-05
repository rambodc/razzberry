// src/components/MobileNavTabs.js
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaWallet, FaEllipsisH } from 'react-icons/fa';

export default function MobileNavTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const Item = ({ icon: Icon, label, active, onClick }) => (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid ' + (active ? '#111827' : 'rgba(0,0,0,0.12)'),
        background: active ? '#111827' : 'white',
        color: active ? '#fff' : '#111827',
        fontWeight: 700,
      }}
    >
      <Icon size={14} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </button>
  );

  const toHome = () => navigate('/home');
  const toDrops = () => navigate('/drops');
  const toBalance = () => navigate('/wallet');
  const toMore = () => navigate('/more');

  const isHome = pathname === '/home';
  const isDrops = pathname.startsWith('/drops');
  const isBalance = pathname.startsWith('/wallet');
  const isMore = pathname.startsWith('/more');

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Item icon={FaHome} label="Home" active={isHome} onClick={toHome} />
      <Item icon={FaWallet} label="Drops" active={isDrops} onClick={toDrops} />
      <Item icon={FaWallet} label="Balance" active={isBalance} onClick={toBalance} />
      <Item icon={FaEllipsisH} label="More" active={isMore} onClick={toMore} />
    </div>
  );
}
