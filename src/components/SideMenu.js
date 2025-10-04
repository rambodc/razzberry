// src/components/SideMenu.js
import React, { useEffect, useRef, useState } from 'react';
import {
  FaHome,
  FaWallet,
  FaEllipsisH,
  FaChevronRight,
} from 'react-icons/fa';

/**
 * Props:
 * - open: boolean
 * - signedIn: boolean
 * - onClose(): void
 * - onHome(): void
 * - onCollectibles?(): void
 * - onBalance?(): void
 * - onMore?(): void
*/
export default function SideMenu({
  open = false,
  signedIn = false,
  onClose,
  onHome,
  onCollectibles,
  onBalance,
  onMore,
  /**
   * When true (default), the menu pins open in landscape orientation.
   * In portrait, it behaves as a modal drawer.
   */
  autoLandscape = true,
}) {
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (window.matchMedia) {
        return window.matchMedia('(orientation: landscape)').matches;
      }
    } catch {}
    return (window.innerWidth || 0) > (window.innerHeight || 0);
  });

  // Keep track of orientation changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      let landscape = false;
      try {
        if (window.matchMedia) {
          landscape = window.matchMedia('(orientation: landscape)').matches;
        } else {
          landscape = window.innerWidth > window.innerHeight;
        }
      } catch {
        landscape = window.innerWidth > window.innerHeight;
      }
      setIsLandscape(landscape);
    };

    let mql;
    try {
      mql = window.matchMedia('(orientation: landscape)');
      if (mql && mql.addEventListener) mql.addEventListener('change', update);
      else if (mql && mql.addListener) mql.addListener(update);
    } catch {}

    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('resize', update);
      try {
        if (mql && mql.removeEventListener) mql.removeEventListener('change', update);
        else if (mql && mql.removeListener) mql.removeListener(update);
      } catch {}
    };
  }, []);

  const pinned = autoLandscape && isLandscape; // orientation-based layout state
  // Sidebar visibility now strictly follows `open`, regardless of orientation.
  // We still use `pinned` to decide layout (offset content) but not to force open.
  const computedOpen = open;
  const showOverlay = open && !isLandscape;

  // Width: in portrait overlay, keep it to 60% of viewport for an easy outside-click target.
  // In landscape (pinned or not), keep previous behavior/cap.
  const panelWidth = showOverlay ? 'min(60vw, 340px)' : 'min(88vw, 340px)';

  // Manage a global class and CSS var to shift page content when pinned
  const asideRef = useRef(null);
  useEffect(() => {
    const root = document.documentElement;
    const className = 'sidebar-pinned';

    const setWidthVar = () => {
      if (!asideRef.current) return;
      const w = Math.round(asideRef.current.getBoundingClientRect().width || 0);
      if (w > 0) root.style.setProperty('--sidebar-width', `${w}px`);
    };

    if (isLandscape && computedOpen) {
      root.classList.add(className);
      // establish var
      setWidthVar();
      // Track changes in size
      let ro;
      try {
        if (window.ResizeObserver) {
          ro = new ResizeObserver(setWidthVar);
          if (asideRef.current) ro.observe(asideRef.current);
        }
      } catch {}
      window.addEventListener('resize', setWidthVar);

      return () => {
        window.removeEventListener('resize', setWidthVar);
        try { ro && ro.disconnect && ro.disconnect(); } catch {}
        root.classList.remove(className);
        root.style.removeProperty('--sidebar-width');
      };
    } else {
      // ensure cleanup when not pinned
      root.classList.remove(className);
      root.style.removeProperty('--sidebar-width');
    }
  }, [pinned, computedOpen]);
  // Close on ESC when acting as a modal (portrait)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && showOverlay) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showOverlay, onClose]);

  // Prevent background scroll only when modal overlay is shown
  useEffect(() => {
    if (!showOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showOverlay]);

  return (
    <>
      {/* Dim overlay */}
      <div
        aria-hidden={!showOverlay}
        onClick={showOverlay ? onClose : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          opacity: showOverlay ? 1 : 0,
          pointerEvents: showOverlay ? 'auto' : 'none',
          transition: 'opacity 160ms ease',
          zIndex: 60,
        }}
      />

      {/* Panel */}
      <aside
        ref={asideRef}
        role={showOverlay ? 'dialog' : 'complementary'}
        aria-modal={showOverlay ? 'true' : undefined}
        aria-label="Main menu"
        style={{
          position: 'fixed',
          top: 52,
          bottom: 0,
          left: 0,
          right: 'auto',
          width: panelWidth,
          background: '#ffffff',
          borderRight: '1px solid rgba(0,0,0,0.06)',
          transform: computedOpen ? 'translateX(0)' : 'translateX(-102%)',
          transition: 'transform 220ms ease',
          zIndex: 61,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: showOverlay ? '0 0 30px rgba(0,0,0,0.12)' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Links */}
        <nav style={{ padding: '8px 8px', overflowY: 'auto' }}>
          <Section>
            <MenuItem icon={FaHome} iconColor="#007aff" label="Home" onClick={onHome} />
            {onCollectibles && (
              <MenuItem icon={FaWallet} iconColor="#22c55e" label="Collectibles" onClick={onCollectibles} />
            )}
            {onBalance && (
              <MenuItem icon={FaWallet} iconColor="#0ea5e9" label="Balance" onClick={onBalance} />
            )}
            <MenuItem icon={FaEllipsisH} iconColor="#6b7280" label="More" onClick={onMore} />
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
      {title ? (
        <div style={{ padding: '8px 8px 6px', fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', color: '#9ca3af' }}>
          {title}
        </div>
      ) : null}
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
