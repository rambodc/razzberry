// src/NftDetail.js
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserContext } from './App';
import './Home.css';

export default function NftDetail() {
  const { id } = useParams(); // nft id
  const navigate = useNavigate();
  const appUser = useContext(UserContext);

  const [nft, setNft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // offer form
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // load NFT
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setErr('');
    const unsub = onSnapshot(
      doc(db, 'nfts', id),
      (snap) => {
        const x = snap.data();
        if (!x) {
          setErr('NFT not found');
          setLoading(false);
          return;
        }
        setNft({
          id,
          name: x.name || 'Untitled',
          desc: x.desc || x.description || '',
          image: x.image || x.img || '',
          price: typeof x.price === 'number' ? x.price : parseFloat(x.price || '0'),
          endsAt: x.endsAt || null,
          createdAt: x.createdAt || null,
          offersCount: x.offersCount || 0,
          status: x.status || 'active',
        });
        setAmount(
          x && (typeof x.price === 'number' ? String(x.price) : String(parseFloat(x.price || '')))
        );
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr(e.message || 'Failed to load NFT');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  const remaining = useMemo(() => {
    try {
      if (!nft?.endsAt) return '';
      const end = nft.endsAt.toDate ? nft.endsAt.toDate() : new Date(nft.endsAt);
      const ms = end.getTime() - Date.now();
      if (ms <= 0) return 'Ended';
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    } catch {
      return '';
    }
  }, [nft]);

  const canOffer = useMemo(() => {
    const a = parseFloat(amount);
    return !!nft && !Number.isNaN(a) && a >= 0 && !saving && nft.status !== 'ended';
  }, [nft, amount, saving]);

  const submitOffer = async (e) => {
    e.preventDefault();
    if (!canOffer) return;
    try {
      setSaving(true);
      setSaveErr('');

      const a = parseFloat(amount);
      const offerRef = collection(db, 'nfts', id, 'offers');
      await addDoc(offerRef, {
        nftId: id,
        amount: a,
        note: note.trim() || null,
        createdAt: serverTimestamp(),
        createdByUid: appUser?.id || null,
        createdByEmail: appUser?.email || null,
      });

      // increment offersCount on parent doc
      await updateDoc(doc(db, 'nfts', id), {
        offersCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      // simple success UX
      setNote('');
      // navigate back to home (optional). Keep here:
      navigate('/home');
    } catch (e1) {
      console.error(e1);
      setSaveErr(e1?.message || 'Failed to submit offer');
      setSaving(false);
    }
  };

  if (loading) return <p style={{ padding: 16 }}>Loading…</p>;
  if (err) return <p className="error" style={{ padding: 16 }}>{err}</p>;
  if (!nft) return null;

  return (
    <div className="home-container">
      <div className="home-content" style={{ maxWidth: 900 }}>
        <div className="home-topbar">
          <button className="create-btn" onClick={() => navigate(-1)}>&larr; Back</button>
          <div />
        </div>

        <div className="glass-card" style={{ maxWidth: 900 }}>
          <div className="card-image-wrap" style={{ height: 420 }}>
            {nft.image ? (
              <img className="card-image" src={nft.image} alt={nft.name} />
            ) : (
              <div
                className="card-image"
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  background: '#f3f3f3',
                  color: '#999',
                  fontSize: 14,
                }}
              >
                No image
              </div>
            )}
            <div className="card-gradient" />
            <div className="card-text-overlay">
              <h2>{nft.name}</h2>
              <p>{nft.desc}</p>
              <div className="chips">
                {Number.isFinite(nft.price) && <span>Price: {nft.price}</span>}
                {remaining && <span>{remaining}</span>}
                {Number.isFinite(nft.offersCount) && <span>Offers: {nft.offersCount}</span>}
              </div>
            </div>
          </div>

          {/* Offer form */}
          <div style={{ padding: 16, display: 'grid', gap: 12 }}>
            <h3 style={{ margin: '0 0 8px 0' }}>Make an Offer</h3>
            <form onSubmit={submitOffer} style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={labelStyle}>Amount</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Note (optional)</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  placeholder="Leave a note for the seller"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                />
              </div>
              {saveErr && <div className="error">{saveErr}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="create-btn" type="submit" disabled={!canOffer}>
                  {saving ? 'Submitting…' : 'Submit Offer'}
                </button>
                <button
                  type="button"
                  className="create-btn"
                  style={{ background: '#eee', color: '#333' }}
                  onClick={() => navigate('/home')}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontWeight: 600, marginBottom: 8, fontSize: 14 };

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #ddd',
  fontSize: 16,
  outline: 'none',
};
