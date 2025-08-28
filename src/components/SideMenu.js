// src/components/SideMenu.js
import React, { useEffect, useState } from 'react';
import {
  FaHome,
  FaCommentDots,
  FaWallet,
  FaUser,
  FaSignInAlt,
  FaUserPlus,
  FaSignOutAlt,
  FaTimes,
  FaChevronRight,
} from 'react-icons/fa';

/**
 * Props:
 * - open: boolean
 * - signedIn: boolean
 * - onClose(): void
 * - onHome(): void
 * - onChat(): void
 * - onWallet?(): void   // ✅ NEW (optional)
 * - onProfile?(): void
 * - onSignin?(): void
 * - onSignup?(): void
 * - onLogout?(): Promise|void
 */
export default function SideMenu({
  open = false,
  signedIn = false,
  onClose,
  onHome,
  onChat,
  onWallet,      // ✅ NEW
  onProfile,
  onSignin,
  onSignup,
  onLogout,
}) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      {/* Dim overlay */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 160ms ease',
          zIndex: 60,
        }}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          width: 'min(88vw, 340px)',
          background: '#ffffff',
          borderLeft: '1px solid rgba(0,0,0,0.06)',
          transform: open ? 'translateX(0)' : 'translateX(102%)',
          transition: 'transform 220ms ease',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: open ? '0 0 30px rgba(0,0,0,0.12)' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <strong style={{ color: '#1f2937' }}>Menu</strong>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={iconBtn}
          >
            <FaTimes />
          </button>
        </div>

        {/* Links */}
        <nav style={{ padding: '10px 8px', overflowY: 'auto' }}>
          <Section title="Navigation">
            <MenuItem icon={FaHome} iconColor="#007aff" label="Home" onClick={onHome} />
            <MenuItem icon={FaCommentDots} iconColor="#f59e0b" label="Chat" onClick={onChat} />
            {/* ✅ New Wallet item (shown only if handler provided) */}
            {onWallet && <MenuItem icon={FaWallet} iconColor="#22c55e" label="Wallet" onClick={onWallet} />}
          </Section>

          <Section title="Account">
            {signedIn ? (
              <>
                <MenuItem icon={FaUser} iconColor="#6366f1" label="Profile" onClick={onProfile} />
                <MenuItem
                  icon={FaSignOutAlt}
                  iconColor="#ef4444"
                  label="Log out"
                  onClick={async () => {
                    try { await onLogout?.(); } finally { onClose?.(); }
                  }}
                />
              </>
            ) : (
              <>
                <MenuItem icon={FaSignInAlt} iconColor="#0ea5e9" label="Sign in" onClick={onSignin} />
                <MenuItem icon={FaUserPlus} iconColor="#ec4899" label="Sign up" onClick={onSignup} />
              </>
            )}
          </Section>
        </nav>

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '12px 16px', opacity: 0.8, fontSize: 12, color: '#6b7280' }}>
          <div>Showbat · v1</div>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <div style={{ padding: '8px 8px 6px', fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', color: '#9ca3af' }}>
        {title}
      </div>
      <div>{children}</div>
    </section>
  );
}

function MenuItem({ icon: Icon, label, onClick, iconColor }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const dynamicStyle = {
    background: hovered ? '#f7f9fc' : 'transparent',
    transform: pressed ? 'scale(0.98)' : hovered ? 'translateX(2px)' : 'none',
    boxShadow: hovered ? '0 2px 10px rgba(0,0,0,0.06)' : 'none',
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{ ...itemBtn, ...dynamicStyle }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: '#111827', fontSize: '1.1rem', lineHeight: 1.2 }}>
        {Icon ? <Icon size={20} color={iconColor} /> : null}
        <span style={{ fontSize: '1.06rem' }}>{label}</span>
      </span>
      <span aria-hidden style={{ opacity: 0.5, color: '#6b7280', display: 'inline-flex', fontSize: '1.1rem' }}>
        <FaChevronRight />
      </span>
    </button>
  );
}

const itemBtn = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 14px',
  background: 'transparent',
  border: 'none',
  borderRadius: 12,
  color: '#111827',
  cursor: 'pointer',
  margin: '6px 8px',
  transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
};

const iconBtn = {
  background: 'transparent',
  border: 'none',
  borderRadius: 8,
  color: '#374151',
  padding: '6px 8px',
  cursor: 'pointer',
};
