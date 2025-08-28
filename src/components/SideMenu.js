// src/components/SideMenu.js
import React, { useEffect } from 'react';

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
          background: '#121317',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          transform: open ? 'translateX(0)' : 'translateX(102%)',
          transition: 'transform 200ms ease',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <strong style={{ color: '#fff' }}>Menu</strong>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={iconBtn}
          >
            ✕
          </button>
        </div>

        {/* Links */}
        <nav style={{ padding: '10px 8px', overflowY: 'auto' }}>
          <Section title="Navigation">
            <MenuItem label="Home" onClick={onHome} />
            <MenuItem label="Chat" onClick={onChat} />
            {/* ✅ New Wallet item (shown only if handler provided) */}
            {onWallet && <MenuItem label="Wallet" onClick={onWallet} />}
          </Section>

          <Section title="Account">
            {signedIn ? (
              <>
                <MenuItem label="Profile" onClick={onProfile} />
                <MenuItem
                  label="Log out"
                  onClick={async () => {
                    try { await onLogout?.(); } finally { onClose?.(); }
                  }}
                />
              </>
            ) : (
              <>
                <MenuItem label="Sign in" onClick={onSignin} />
                <MenuItem label="Sign up" onClick={onSignup} />
              </>
            )}
          </Section>
        </nav>

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '12px 16px', opacity: 0.7, fontSize: 12, color: '#cfd3dc' }}>
          <div>Showbat · v1</div>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <div style={{ padding: '8px 8px 6px', fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', color: '#8f96a3' }}>
        {title}
      </div>
      <div>{children}</div>
    </section>
  );
}

function MenuItem({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={itemBtn}
    >
      <span>{label}</span>
      <span aria-hidden style={{ opacity: 0.5 }}>›</span>
    </button>
  );
}

const itemBtn = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 12px',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#e9ecf3',
  cursor: 'pointer',
  margin: '6px 8px',
};

const iconBtn = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  color: '#e9ecf3',
  padding: '4px 8px',
  cursor: 'pointer',
};
