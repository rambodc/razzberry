// src/More.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import TopBar from '../components/TopBar';
import MobileNavTabs from '../components/MobileNavTabs';
import {
  FaFileAlt,
  FaCogs,
  FaEnvelope,
  FaKey,
  FaPaintBrush,
  FaCheckCircle,
  FaSignOutAlt,
  FaChevronRight,
} from 'react-icons/fa';

export default function More() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 900 : false));

  const onLogout = async () => {
    await signOut(auth);
    navigate('/signin');
  };

  const Item = ({ icon: Icon, label, onClick, color = '#111827' }) => (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 14px',
        background: 'white',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
        color: '#111827',
        cursor: 'pointer',
        margin: '8px 0',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        {Icon ? <Icon size={20} color={color} /> : null}
        <span style={{ fontSize: '1.06rem' }}>{label}</span>
      </span>
      <span aria-hidden style={{ opacity: 0.5, color: '#6b7280', display: 'inline-flex', fontSize: '1.1rem' }}>
        <FaChevronRight />
      </span>
    </button>
  );

  // responsive
  React.useEffect(() => {
    const update = () => {
      const mobile = (window.innerWidth || 0) < 900;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', update);
    update();
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="home-container" style={{ paddingBottom: 0 }}>
      <TopBar hideLeft>
        <MobileNavTabs />
      </TopBar>

      <div style={{ maxWidth: 720, margin: '80px auto 24px', padding: '0 16px' }}>
        <h1 style={{ margin: '8px 0 16px' }}>More</h1>

        <Item icon={FaFileAlt} color="#0ea5e9" label="Terms" onClick={() => navigate('/terms')} />
        <Item icon={FaCogs} color="#6366f1" label="Services" onClick={() => navigate('/services')} />
        <Item icon={FaEnvelope} color="#22c55e" label="Change Email" onClick={() => navigate('/account/email')} />
        <Item icon={FaKey} color="#f59e0b" label="Change Password" onClick={() => navigate('/account/password')} />
        <Item icon={FaPaintBrush} color="#ec4899" label="Become an Artist" onClick={() => navigate('/chat')} />
        <Item icon={FaCheckCircle} color="#10b981" label="Validate Drops" onClick={() => navigate('/validate-drops')} />
        <Item icon={FaSignOutAlt} color="#ef4444" label="Logout" onClick={onLogout} />
      </div>

      {/* No sidebar */}
    </div>
  );
}
