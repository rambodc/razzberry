// src/create-artist.js
import React, { useContext, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import app, { db, auth, storage, logStorageDebug } from '../firebase';
import { UserContext } from '../App';
import TopBar from '../components/TopBar';
import layoutStyles from '../styles/layout.module.css';
import { useCallback } from 'react';

function CreateArtist() {
  const appUser = useContext(UserContext);
  const navigate = useNavigate();
  // No sidebar; use a back button like Artists
  const handleBack = useCallback(() => {
    if (window.history.length > 2) navigate(-1); else navigate('/home');
  }, [navigate]);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [passError, setPassError] = useState('');

  const inputRef = useRef(null);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && !!file && !saving;
  }, [title, file, saving]);

  const handlePasscodeChange = (e) => {
    const v = e.target.value.replace(/\D+/g, '').slice(0, 6);
    setCode(v);
    if (v.length === 6) {
      if (v === '123456') {
        setUnlocked(true);
        setPassError('');
      } else {
        setPassError('Incorrect passcode');
      }
    } else {
      setPassError('');
    }
  };

  const handleFileChange = (e) => {
    setError('');
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith('image/')) {
      setError('Please choose an image file (jpg, png, webp, etc).');
      setFile(null);
      setPreviewUrl('');
      return;
    }

    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const genId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSaving(true);
      setError('');
      const artistUid = genId();
      // Debug which bucket we're actually using in the running build
      try { logStorageDebug(); } catch {}

      // Upload original image to Storage
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
      const objectPath = `artists/${artistUid}/cover.${ext}`;
      const storageRef = ref(storage, objectPath);

      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'image/jpeg',
      });

      await new Promise((resolve, reject) => {
        task.on(
          'state_changed',
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgress(pct);
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      const imgUrl = await getDownloadURL(task.snapshot.ref);

      // Write Firestore doc
      const data = {
        artistUid,
        title: title.trim(),
        desc: desc.trim(),
        img: imgUrl,                  // <-- Home.js expects c.img
        createdAt: serverTimestamp(),
        createdByUid: auth.currentUser?.uid || appUser?.id || null, // prefer live auth UID
        createdByEmail: appUser?.email || null,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'artists', artistUid), data);

      // Go to the new artist page
      navigate(`/artist/${artistUid}`);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to create artist.');
      setSaving(false);
    }
  };

  if (!unlocked) {
    return (
      <div className={layoutStyles.detailPage}>
        <TopBar variant="back" backLabel="Back" onBack={handleBack} />
        <div style={{ maxWidth: 480, width: '100%', margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
          <h1 style={{ marginBottom: 8 }}>Enter Passcode</h1>
          <p style={{ color: '#4b5563', marginBottom: 12 }}>Enter the 6-digit passcode to continue.</p>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            type="text"
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            name="create-artist-passcode"
            value={code}
            onChange={handlePasscodeChange}
            placeholder="••••••"
            maxLength={6}
            autoFocus
            style={{
              letterSpacing: 6,
              textAlign: 'center',
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid #ddd',
              fontSize: 24,
              width: 220,
            }}
          />
          {passError && <p style={{ color: '#b91c1c', marginTop: 10 }}>{passError}</p>}
          <p style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>Hint for dev: 123456</p>
        </div>
      </div>
    );
  }

  return (
    <div className={layoutStyles.homeContainer}>
      <TopBar variant="back" backLabel="Back" onBack={handleBack} />

      <div className="page-container" style={{ maxWidth: 680, width: '100%', margin: '80px auto 0', padding: 16 }}>
      <h1 style={{ margin: '20px 0' }}>Create Artist (Image)</h1>

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Title</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="Artist title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
            placeholder="Short description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={1000}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Cover Image</label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'block' }}
          />
          {previewUrl ? (
            <div style={{ marginTop: 12 }}>
              <img
                src={previewUrl}
                alt="preview"
                style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 10 }}
              />
            </div>
          ) : (
            <p style={{ color: '#666', marginTop: 8 }}>Choose an image (JPG/PNG/WebP).</p>
          )}
        </div>

        {saving && (
          <div style={{ margin: '12px 0', fontSize: 14 }}>
            Uploading… {progress}%
          </div>
        )}

        {error && (
          <div style={{ margin: '12px 0', color: '#c00', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className={layoutStyles.createBtn} type="submit" disabled={!canSubmit}>
            {saving ? 'Saving…' : 'Create'}
          </button>
          <button
            type="button"
            className={layoutStyles.createBtn}
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

export default CreateArtist;
