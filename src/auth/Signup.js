import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { setDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Auth.css';

// Using Firebase Auth UID as the canonical user document ID.

function Signup() {
  const isPortrait = typeof window !== 'undefined'
    ? window.matchMedia('(orientation: portrait)').matches
    : false;
  const bgUrl = `${process.env.PUBLIC_URL}/assets/${isPortrait ? 'auth-portrait.png' : 'auth-landscape.png'}`;

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const navigate = useNavigate();

  const allocateUserTag = async (uid) => {
    const userRef = doc(db, 'users', uid);
    const registryRoot = 'system/userTags';
    const generateTag = () => String(Math.floor(10000000 + Math.random() * 90000000));

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = generateTag();
      const tagRef = doc(db, registryRoot, candidate);
      const timestamp = serverTimestamp();

      try {
        await runTransaction(db, async (tx) => {
          const tagSnap = await tx.get(tagRef);
          if (tagSnap.exists()) {
            throw new Error('collision');
          }

          tx.set(tagRef, { uid, createdAt: timestamp });
          tx.set(userRef, {
            userTag: candidate,
            userTagCreatedAt: timestamp,
            updatedAt: timestamp,
          }, { merge: true });
        });

        return candidate;
      } catch (err) {
        if (err?.message === 'collision') continue;
        throw err;
      }
    }

    throw new Error('Unable to allocate user tag. Please retry.');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1) Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 2) Build profile doc (canonical user) — use auth.uid as ID
      const now = serverTimestamp();
      const profileDoc = {
        uid: user.uid,
        firstName,
        lastName,
        email: user.email || email,
        photoURL: user.photoURL || '',
        identities: [
          { provider: 'password', subject: user.uid }
        ],
        primaryAuthUid: user.uid,
        createdAt: now,
        updatedAt: now,
      };

      // 3) Write /users/{auth.uid}
      await setDoc(doc(db, 'users', user.uid), profileDoc, { merge: true });

      try {
        await allocateUserTag(user.uid);
      } catch (tagErr) {
        console.error('Failed to allocate userTag', tagErr);
        throw tagErr;
      }

      // 4) Send verification email
      await sendEmailVerification(user);

      alert('Account created! Please check your email to verify your address.');
      navigate('/signin');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-container"
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <form className="auth-box" onSubmit={handleSignup}>
        <h1>Razzberry</h1>
        <h2>Create Account</h2>

        {error && <p className="error">{error}</p>}

        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Create Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Sign Up'}
        </button>

        <p className="link" onClick={() => navigate('/signin')}>
          Already have an account? Log in
        </p>
      </form>
    </div>
  );
}

export default Signup;
