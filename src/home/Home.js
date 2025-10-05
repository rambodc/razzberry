// src/Home.js
import React, { useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import TopBar from '../components/TopBar';
import MobileNavTabs from '../components/MobileNavTabs';
import layoutStyles from '../styles/layout.module.css';
import './Home.css';
import { UI_BUILD_TAG } from '../version';

function Home() {
  const appUser = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'cart'

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // No sidebar; no responsive sidebar toggling needed

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/signin';
  };

  const truncate = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  // Fetch initial artists snapshot
  useEffect(() => {
    const q = query(collection(db, 'artists'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setArtists(list);
        setLoading(false);

        // ---- Restore scroll position if we have one in history.state ----
        const savedY = typeof window.history.state?.homeScrollY === 'number'
          ? window.history.state.homeScrollY
          : null;

        if (savedY !== null) {
          // Try to restore after layout; one RAF is usually enough
          requestAnimationFrame(() => {
            window.scrollTo(0, savedY);
          });
        }

      },
      (err) => {
        console.error('artists snapshot error:', err);
        setArtists([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Open the full artist page with a smooth loader transition
  const openCard = (item) => {
    const artistUid = item.artistUid || item.id;

    // Save current scroll Y into the *current* history entry, so when the user
    // hits Back, that entry still carries the exact position to restore.
    try {
      const currentState = window.history.state || {};
      window.history.replaceState(
        { ...currentState, homeScrollY: window.scrollY },
        ''
      );
    } catch {
      // ignore if replaceState is blocked
    }

    navigate(`/artist/${artistUid}`);
  };

  const Dashboard = () => (
    <>
      {/* Welcome message */}
      <div className="home-topbar" style={{ marginTop: 64 }}>
        <div className="home-topbar-left">
          <h1 className="home-welcome">
            Welcome, {appUser?.firstName || 'Friend'} {appUser?.lastName || ''} 👋
          </h1>
          {appUser?.email && <p className="email-text">Email: {appUser.email}</p>}
        </div>
      </div>

      {/* Loading / Empty / Grid */}
      {loading ? (
        <p>Loading…</p>
      ) : artists.length === 0 ? (
        <div>
          <p>No artists yet.</p>
        </div>
      ) : (
        <div className="card-grid" style={{ paddingTop: 6 }}>
          {artists.map((c) => (
            <div
              className="glass-card"
              key={c.artistUid || c.id}
              role="button"
              tabIndex={0}
              onClick={() => openCard(c)}
              onKeyDown={(e) => (e.key === 'Enter' ? openCard(c) : null)}
            >
              <div className="card-image-wrap">
                <img className="card-image" src={c.img} alt={c.title || 'Artist'} />
                <div className="card-gradient" />
                <div className="card-text-overlay">
                  <h2>{truncate(c.title || 'Untitled', 30)}</h2>
                  <p>{truncate(c.desc || '', 50)}</p>
                  <div className={layoutStyles.chips}>
                    {c.rating && <span>{c.rating}</span>}
                    {c.nights && <span>{c.nights}</span>}
                  </div>
                  <button>Open</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'cart':
        return <h2 style={{ marginTop: 86 }}>🛒 Shopping Cart (Coming soon)</h2>;
      default:
        return null;
    }
  };

  return (
    <div className={layoutStyles.homeContainer} style={{ paddingBottom: 0 }}>
      {/* Fixed, reusable Top Bar */}
      <TopBar hideLeft>
        <MobileNavTabs />
      </TopBar>

      {/* Small build/version badge so you can spot new deploys */}
      <div className="build-badge" aria-label="Build tag">{UI_BUILD_TAG}</div>

      {/* Page content */}
      <div className="home-content">{renderTab()}</div>

      {/* No sidebar — topbar tabs only */}
    </div>
  );
}

export default Home;
  
