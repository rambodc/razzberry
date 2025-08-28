// src/Home.js
import React, { useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './App';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import TopBar from './components/TopBar';
import SideMenu from './components/SideMenu';
import { showLoader, hideLoader } from './components/GlobalLoader';
import './Home.css';

function Home() {
  const appUser = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'cart' | 'chat'
  const [menuOpen, setMenuOpen] = useState(false);

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/signin';
  };

  const truncate = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  // Show loader while Home mounts & we get the first snapshot
  useEffect(() => {
    showLoader(500);

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

        hideLoader(); // dismiss loader after content is ready
      },
      (err) => {
        console.error('artists snapshot error:', err);
        setArtists([]);
        setLoading(false);
        hideLoader(); // ensure we hide even on error
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

    // Show loader while routing to /artist/:id
    showLoader(500);
    navigate(`/artist/${artistUid}`);
  };

  const Dashboard = () => (
    <>
      {/* Welcome + Create (scrolls with content) */}
      <div className="home-topbar" style={{ marginTop: 70 }}>
        <div className="home-topbar-left">
          <h1 className="home-welcome">
            Welcome, {appUser?.firstName || 'Friend'} {appUser?.lastName || ''} 👋
          </h1>
          {appUser?.email && <p className="email-text">Email: {appUser.email}</p>}
        </div>
        <div className="home-topbar-right">
          <button
            className="create-btn"
            onClick={() => navigate('/create')}
            aria-label="Create artist"
          >
            <FaPlus /> Create
          </button>
        </div>
      </div>

      {/* Loading / Empty / Grid */}
      {loading ? (
        <p>Loading…</p>
      ) : artists.length === 0 ? (
        <div>
          <p>No artists yet.</p>
          <button className="create-btn" onClick={() => navigate('/create')}>
            <FaPlus /> Make your first artist
          </button>
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
                  <div className="chips">
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
    <div className="home-container" style={{ paddingBottom: 0 }}>
      {/* Fixed, reusable Top Bar */}
      <TopBar
        variant="logo"
        showTabs
        active={activeTab === 'dashboard' ? 'home' : activeTab}
        onHome={() => {
          setActiveTab('dashboard');
          navigate('/home');
        }}
        onChat={() => {
          setActiveTab('chat');
          navigate('/chat');
        }}
        onCart={() => setActiveTab('cart')}
        onOpenMenu={() => setMenuOpen(true)}
      />

      {/* Page content */}
      <div className="home-content">{renderTab()}</div>

      {/* Right Sidebar Menu */}
      <SideMenu
        signedIn
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onHome={() => {
          setMenuOpen(false);
          setActiveTab('dashboard');
          navigate('/home');
        }}
        onWallet={() => {
          setMenuOpen(false);
          navigate('/wallet');
        }}
        onProfile={() => {
          setMenuOpen(false);
          // profile wiring later
        }}
        onChat={() => {
          setMenuOpen(false);
          setActiveTab('chat');
          navigate('/chat');
        }}
        onSignin={() => {
          setMenuOpen(false);
          navigate('/signin');
        }}
        onSignup={() => {
          setMenuOpen(false);
          navigate('/signup');
        }}
        onLogout={async () => {
          setMenuOpen(false);
          await handleLogout();
        }}
      />
    </div>
  );
}

export default Home;
