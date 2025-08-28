import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import './Auth.css';

// Generate a neutral app user id (UUID). Uses Web Crypto when available.
function generateUserId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  // Fallback (RFC4122-ish), fine for app-side IDs
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1) Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 2) Create neutral app user id (doc id for /users)
      const userId = generateUserId();

      // 3) Build profile doc (canonical user) — now camelCase
      const now = serverTimestamp();
      const profileDoc = {
        userId,
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

      // 4) Write /users/{userId}
      await setDoc(doc(db, 'users', userId), profileDoc);

      // 5) Write resolver /userAuth/{auth.uid} -> { userId }
      const providerId = (user.providerData && user.providerData[0]?.providerId) || 'password';
      await setDoc(doc(db, 'userAuth', user.uid), {
        userId,
        provider: providerId,
        createdAt: now,
      });

      // 6) Send verification email
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
