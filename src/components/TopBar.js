// src/components/TopBar.js
import React from 'react';
import {
  FaHome,
  FaShoppingCart,
  FaCommentDots,
  FaBars,
  FaUser,
  FaArrowLeft,
} from 'react-icons/fa';

/**
 * Reusable, flexible top navigation bar.
 *
 * Props:
 * - variant: "logo" | "back" | "title" (default: "logo")
 * - title: string (used when variant="title")
 * - brand: string (used when variant="logo", default: "Razzberry")
 * - backLabel: string (text for back button, default: "Back")
 * - onBack: function (called when back button clicked)
 * - showTabs: boolean (show center Home/Chat/Cart icons)
 * - active: "home" | "chat" | "cart" | null (active center tab)
 * - onHome: function
 * - onChat: function
 * - onCart: function
 * - onOpenMenu: function (opens right-side menu)
 */
export default function TopBar({
  variant = 'logo',
  title = 'Cool title',
  brand = 'Razzberry',
  backLabel = 'Back',
  onBack,
  showTabs = false,
  active = null,
  onHome,
  onChat,
  onCart,
  onOpenMenu,
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.85)',
        borderBottom: '1px solid #eee',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          gap: 10,
        }}
      >
        {/* Left side */}
        <div style={{ minWidth: 120 }}>
          {variant === 'back' ? (
            <button
              onClick={onBack}
              aria-label={backLabel}
              title={backLabel}
              style={styles.backBtn}
            >
              <FaArrowLeft />
              <span>{backLabel}</span>
            </button>
          ) : variant === 'title' ? (
            <div style={styles.title}>{title}</div>
          ) : (
            <div style={styles.brand}>{brand}</div>
          )}
        </div>

        {/* Center tabs (optional) */}
        <div style={{ display: showTabs ? 'flex' : 'none', gap: 18, alignItems: 'center' }}>
          <IconButton active={active === 'home'} label="Home" onClick={onHome}>
            <FaHome />
          </IconButton>
          <IconButton active={active === 'chat'} label="Chat" onClick={onChat}>
            <FaCommentDots />
          </IconButton>
          <IconButton active={active === 'cart'} label="Cart" onClick={onCart}>
            <FaShoppingCart />
          </IconButton>
        </div>

        {/* Right side: menu button */}
        <div style={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onOpenMenu}
            aria-label="Open menu"
            title="Menu"
            style={styles.menuBtn}
          >
            <FaBars />
            <FaUser />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */

function IconButton({ active, label, onClick, children }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        background: 'none',
        border: 'none',
        fontSize: '1.25rem',
        cursor: 'pointer',
        color: active ? '#007aff' : 'gray',
        transform: active ? 'translateY(-1px)' : 'none',
        transition: 'color .2s, transform .15s',
      }}
    >
      {children}
    </button>
  );
}

/* ---------- Inline styles ---------- */
const styles = {
  brand: {
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  title: {
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'transparent',
    border: '1px solid #ddd',
    padding: '8px 10px',
    borderRadius: 12,
    cursor: 'pointer',
  },
  menuBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'transparent',
    border: '1px solid #ddd',
    padding: '8px 10px',
    borderRadius: 12,
    cursor: 'pointer',
  },
};
