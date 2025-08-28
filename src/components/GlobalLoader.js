// src/components/GlobalLoader.js
// Global loader overlay: instant show, smooth fade-out, white backdrop, spinning raspberry.
// Usage:
//   import { showLoader, hideLoader } from './components/GlobalLoader';
//   showLoader(500);   // keep visible at least 500ms
//   hideLoader();      // hides after remaining min + 100ms linger

let container = null;
let styleEl = null;
let startedAt = 0;
let minMs = 0;
let lingerMs = 100;     // extra linger after ready
let hideTimer = null;

const RASPBERRY_SVG = `
<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
  <!-- leaves -->
  <path fill="#2fbf71" d="M32 10c3.5-4 8.5-6 13-6-2.2 3.8-3.3 7.3-3.6 10.6-2.3-.9-5.6-1.6-9.4-1.5z"/>
  <path fill="#29a85f" d="M32 10c-3.5-4-8.5-6-13-6 2.2 3.8 3.3 7.3 3.6 10.6 2.3-.9 5.6-1.6 9.4-1.5z"/>
  <path fill="#32c978" d="M32 10c0-4.5 2-8.5 5-10 0 4.5-.2 8.5 1 12-1.8-.8-3.8-1.3-6-2z"/>
  <!-- berry body (cluster of drupelets) -->
  <g fill="#e63a79">
    <circle cx="22" cy="24" r="6"/>
    <circle cx="32" cy="24" r="6"/>
    <circle cx="42" cy="24" r="6"/>
    <circle cx="18" cy="34" r="6"/>
    <circle cx="28" cy="34" r="6"/>
    <circle cx="38" cy="34" r="6"/>
    <circle cx="48" cy="34" r="6"/>
    <circle cx="22" cy="44" r="6"/>
    <circle cx="32" cy="44" r="6"/>
    <circle cx="42" cy="44" r="6"/>
    <circle cx="28" cy="54" r="6"/>
    <circle cx="38" cy="54" r="6"/>
  </g>
  <!-- highlights -->
  <g fill="#ff7fb0" opacity="0.8">
    <circle cx="20" cy="22" r="1.5"/>
    <circle cx="30" cy="22" r="1.5"/>
    <circle cx="40" cy="22" r="1.5"/>
    <circle cx="16" cy="32" r="1.5"/>
    <circle cx="26" cy="32" r="1.5"/>
    <circle cx="36" cy="32" r="1.5"/>
    <circle cx="46" cy="32" r="1.5"/>
    <circle cx="20" cy="42" r="1.5"/>
    <circle cx="30" cy="42" r="1.5"/>
    <circle cx="40" cy="42" r="1.5"/>
    <circle cx="26" cy="52" r="1.5"/>
    <circle cx="36" cy="52" r="1.5"/>
  </g>
</svg>
`;

function ensureMounted() {
  if (container) return;

  // Container
  container = document.createElement('div');
  container.id = 'rb-loader';
  container.setAttribute('aria-hidden', 'true');
  document.body.appendChild(container);

  // Markup
  container.innerHTML = `
    <div class="rb-backdrop"></div>
    <div class="rb-center">
      <div class="rb-berry" aria-label="Loading">
        ${RASPBERRY_SVG}
      </div>
      <div class="rb-text">Loading…</div>
    </div>
  `;

  // Styles
  styleEl = document.createElement('style');
  styleEl.type = 'text/css';
  styleEl.textContent = `
    #rb-loader {
      position: fixed;
      inset: 0;
      z-index: 1300;
      pointer-events: none;
      opacity: 0;                      /* default hidden */
      transition: opacity 180ms ease;  /* fade-out only (we'll bypass on show) */
    }
    /* Bypass transition when we want instant show */
    #rb-loader.rb-no-anim { transition: none !important; }

    #rb-loader.rb-visible {
      opacity: 1;
      pointer-events: auto;
    }

    /* Solid white background */
    #rb-loader .rb-backdrop {
      position: absolute;
      inset: 0;
      background: #ffffff;
    }

    /* Center content */
    #rb-loader .rb-center {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      gap: 12px;
    }

    /* Raspberry badge */
    #rb-loader .rb-berry {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: #fafafa;
      border: 1px solid #e9e9e9;
      box-shadow: 0 16px 44px rgba(0,0,0,0.12), inset 0 0 30px rgba(0,0,0,0.02);
      animation: rb-spin 1.2s linear infinite; /* gentle spin */
    }
    #rb-loader .rb-berry svg {
      width: 64px;
      height: 64px;
      display: block;
    }

    #rb-loader .rb-text {
      color: #111;
      font-weight: 700;
      letter-spacing: .2px;
      opacity: .85;
      user-select: none;
    }

    @keyframes rb-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleEl);
}

/**
 * Show the loader immediately (no fade-in).
 * @param {number} minimumMs The minimum visible duration in ms (default 500)
 */
export function showLoader(minimumMs = 500) {
  ensureMounted();
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  startedAt = Date.now();
  minMs = Math.max(0, Number(minimumMs) || 0);

  // Force instant show: disable transition for this frame
  container.classList.add('rb-no-anim');
  container.classList.add('rb-visible');

  // Re-enable transitions on next frame so fade-out works later
  // eslint-disable-next-line no-unused-expressions
  container.offsetHeight; // force reflow
  requestAnimationFrame(() => {
    container.classList.remove('rb-no-anim');
  });
}

/**
 * Hide the loader after respecting the minimum duration + 100ms linger.
 */
export function hideLoader() {
  ensureMounted();
  const elapsed = Date.now() - startedAt;
  const remaining = Math.max(0, minMs - elapsed);
  const totalDelay = remaining + 100; // linger

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    container.classList.remove('rb-visible');
  }, totalDelay);
}
