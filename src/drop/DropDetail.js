// src/drop/DropDetail.js
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import TopBar from '../components/TopBar';
import layoutStyles from '../styles/layout.module.css';
import { db } from '../firebase';

export default function DropDetail() {
  const { dropId } = useParams();
  const navigate = useNavigate();

  const [drop, setDrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleBack = useCallback(() => {
    if (window.history.length > 2) navigate(-1);
    else navigate('/drops');
  }, [navigate]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'drops', dropId));
        if (!alive) return;

        if (snap.exists()) {
          setDrop(snap.data());
        } else {
          setError('Drop not found.');
        }
      } catch (err) {
        if (!alive) return;
        setError(err?.message || 'Failed to load drop.');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [dropId]);

  return (
    <div className={layoutStyles.detailPage}>
      <TopBar variant="back" backLabel="Back" onBack={handleBack} />

      <div
        className={layoutStyles.detailContent}
        style={{ marginTop: 72, maxWidth: 720, width: '100%' }}
      >
        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <p style={{ color: '#b91c1c' }}>{error}</p>
        ) : drop ? (
          <article
            style={{
              background: '#ffffff',
              borderRadius: 20,
              border: '1px solid #e5e7eb',
              padding: 24,
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.08)',
            }}
          >
            {drop.mediaPhoto && (
              <div style={{ marginBottom: 20 }}>
                <img
                  src={drop.mediaPhoto}
                  alt={drop.title || 'Drop media'}
                  style={{ width: '100%', borderRadius: 16, objectFit: 'cover' }}
                />
              </div>
            )}

            <h1 style={{ margin: '0 0 12px', fontSize: 28 }}>{drop.title || 'Untitled Drop'}</h1>
            {drop.description && (
              <p style={{ color: '#4b5563', lineHeight: 1.6 }}>{drop.description}</p>
            )}

            <dl style={{ marginTop: 24, display: 'grid', gap: 12 }}>
              <DetailRow label="Drop ID">{drop.dropId}</DetailRow>
              <DetailRow label="Token ID">{drop.tokenId}</DetailRow>
              <DetailRow label="Type">{drop.type}</DetailRow>
              <DetailRow label="Version">{drop.dropVersion?.toUpperCase()}</DetailRow>
              <DetailRow label="Artist ID">{drop.artistId}</DetailRow>
              <DetailRow label="Owned By UID">{drop.ownedByUid}</DetailRow>
              <DetailRow label="URI">{drop.uri}</DetailRow>
            </dl>
          </article>
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({ label, children }) {
  if (!children) return null;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <dt style={{ fontSize: 13, letterSpacing: 0.08, textTransform: 'uppercase', color: '#6b7280' }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontWeight: 600, color: '#111827', wordBreak: 'break-word' }}>
        {children}
      </dd>
    </div>
  );
}
