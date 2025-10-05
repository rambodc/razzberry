// src/components/TopBar.js
import React from 'react';
import { FaBars, FaArrowLeft } from 'react-icons/fa';

/**
 * Minimal top bar: left back button on inner pages, left menu on main.
 *
 * Props:
 * - variant: 'back' to show the back button; anything else shows menu
 * - backLabel: string (aria-label for back button)
 * - onBack: function
 * - onOpenMenu: function
 */
export default function TopBar({
  variant = 'menu',
  backLabel = 'Back',
  onBack,
  onOpenMenu,
  children,
  hideLeft = false,
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        zIndex: 1000,
        background: 'transparent',
        borderBottom: 'none',
        boxShadow: 'none',
      }}
    >
      <div style={styles.inner}>
        {!hideLeft && variant === 'back' ? (
          <button
            onClick={onBack}
            aria-label={backLabel}
            title={backLabel}
            style={styles.iconBtn}
          >
            <FaArrowLeft />
          </button>
        ) : !hideLeft ? (
          <button
            onClick={onOpenMenu}
            aria-label="Open menu"
            title="Menu"
            style={styles.iconBtn}
          >
            <FaBars />
          </button>
        ) : <div style={{ width: 40 }} />}
        <div style={styles.center}>{children}</div>
        <div style={{ width: 40 }} />
      </div>
    </div>
  );
}

/* ---------- Inline styles ---------- */
const styles = {
  inner: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
  },
  center: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    background: 'transparent',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: '1.1rem',
  },
};
