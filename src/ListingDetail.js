// src/ListingDetail.js
import React, { useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import TopBar from './components/TopBar';
import SideMenu from './components/SideMenu';
import AudioPlayer from './components/AudioPlayer';
import { UserContext } from './App';
import './Home.css';

function ListingDetail() {
  const appUser = useContext(UserContext); // null when signed out (public view)
  const { artistUid } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  // --------- Fallback tracks (3 example files) ----------
  const fallbackTracks = [
    { id: 't1', title: 'Song One',   url: '/music/song1.mp3' },
    { id: 't2', title: 'Song Two',   url: '/music/song2.mp3' },
    { id: 't3', title: 'Song Three', url: '/music/song3.mp3' },
  ];

  const normalizeTracks = (src) => {
    const list = Array.isArray(src) ? src : [];
    const normalized = list
      .slice(0, 3)
      .map((t, i) => ({
        id: t.id || `trk_${i}`,
        title: t.title || `Track ${i + 1}`,
        url: t.url || t.file || '',
      }))
      .filter((t) => t.url);
    return normalized.length ? normalized : fallbackTracks;
  };

  // --------- Fetch detail (public page) ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ref = doc(db, 'artists', artistUid);
        const snap = await getDoc(ref);

        if (!alive) return;
        if (snap.exists()) {
          const data = snap.data();
          setItem({
            title:  data.title || data.name || 'Untitled',
            desc:   data.desc || data.description || '',
            rating: data.rating || '',
            nights: data.nights || '',
            img:    data.img || data.poster || data.imageUrl || '',
            video:     data.video || data.videoMp4 || data.videoUrl || '',
            videoWebm: data.videoWebm || '',
            animWebp:  data.animWebp || '',
            poster:    data.poster || '',
            tracks: normalizeTracks(data.tracks),
          });
        } else {
          setError('Artist not found.');
        }
      } catch (e) {
        setError(e.message || 'Failed to load.');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [artistUid]);

  // --------- Back handler with smart fallback ----------
  const handleBack = useCallback(() => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(appUser ? '/home' : '/');
    }
  }, [navigate, appUser]);

  // --------- Auth actions ----------
  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = '/signin';
  };

  // Build hero media set
  const hero = useMemo(() => {
    return {
      mp4: item?.video || '',
      webm: item?.videoWebm || '',
      webp: item?.animWebp || '',
      poster: item?.poster || item?.img || '',
      title: item?.title || 'Untitled',
    };
  }, [item]);

  // Tracks to feed the player (either artist data or 3 example files)
  const tracks = useMemo(
    () => (item?.tracks && item.tracks.length ? item.tracks : fallbackTracks),
    [item]
  );

  return (
    <div className="detail-page">
      {/* Reusable top bar: public page, with Back on the left; optional center tabs */}
      <TopBar variant="back" backLabel="Back" onBack={handleBack} />

      {/* Page content; offset for fixed TopBar */}
      <div className="detail-content" style={{ marginTop: 64 }}>
        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <div className="detail-shell">
            {/* Responsive grid:
                - < 1100px: single column, max 500px, centered
                - ≥ 1100px: two columns 500 / 500 with gap, left hero is sticky
            */}
            <div className="detail-grid">
              {/* Left: Hero (video/image) */}
              <div className="detail-left">
                <div className="overlay-hero detail-hero">
                  <VideoHero {...hero} />
                </div>
              </div>

              {/* Right: Content + Custom Audio Player */}
              <div className="detail-right">
                <div className="overlay-body">
                  <h2 className="overlay-title">{item?.title || 'Untitled'}</h2>

                  {(item?.rating || item?.nights) && (
                    <div className="chips">
                      {item?.rating && <span>{item.rating}</span>}
                      {item?.nights && <span>{item.nights}</span>}
                    </div>
                  )}

                  {item?.desc && <p className="overlay-desc">{item.desc}</p>}

                  {/* Custom Audio Player */}
                  <h3 style={{ marginTop: 18, marginBottom: 10 }}>Listen</h3>
                  <AudioPlayer
                    playlist={tracks.map((t) => ({ title: t.title, url: t.url }))}
                  />

                  <div className="overlay-meta" style={{ marginTop: 16 }}>
                    <div><strong>Artist UID:</strong> {artistUid}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar Menu: signed-in vs signed-out */}
      <SideMenu
        signedIn={!!appUser}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onHome={() => {
          setMenuOpen(false);
          navigate(appUser ? '/home' : '/');
        }}
        onWallet={() => {
          setMenuOpen(false);
          navigate('/xaman');
        }}
        onFund={() => {
          setMenuOpen(false);
          navigate('/fund');
        }}
        onProfile={() => {
          setMenuOpen(false);
          // wire later
        }}
        onChat={() => {
          setMenuOpen(false);
          navigate('/chat'); // ProtectedRoute handles redirect
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

/* ==================== VideoHero ==================== */
function VideoHero({ mp4, webm, webp, poster, title }) {
  const videoRef = useRef(null);
  const [mode, setMode] = useState(() => (mp4 || webm ? 'video' : (webp ? 'webp' : 'poster')));

  useEffect(() => {
    setMode(mp4 || webm ? 'video' : (webp ? 'webp' : 'poster'));
  }, [mp4, webm, webp, poster]);

  useEffect(() => {
    if (mode !== 'video') return;
    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    v.playsInline = true;

    const onCanPlay = async () => {
      try {
        await v.play();
      } catch {
        setMode(webp ? 'webp' : 'poster');
      }
    };

    v.addEventListener('canplay', onCanPlay, { once: true });
    return () => v.removeEventListener('canplay', onCanPlay);
  }, [mode, webp]);

  if (mode === 'webp' && webp) {
    return (
      <img
        src={webp}
        alt={title}
        style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block', background: '#000' }}
      />
    );
  }

  if (mode === 'poster') {
    return (
      <img
        src={poster || ''}
        alt={title}
        style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block', background: '#000' }}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster={poster || undefined}
      style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block', background: '#000' }}
      onError={() => setMode(webp ? 'webp' : 'poster')}
    >
      {mp4 ? <source src={mp4} type="video/mp4" /> : null}
      {webm ? <source src={webm} type="video/webm" /> : null}
    </video>
  );
}

export default ListingDetail;
