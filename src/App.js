// src/App.js
import React, { useEffect, useState, createContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Public pages
import LandingPage from './LandingPage';
import Login from './Login';
import Signup from './Signup';
import ForgotPassword from './ForgotPassword';
import Artists from './Artists';

// Protected pages
import Home from './Home';
import CreateArtist from './CreateArtist';
import Chat from './Chat';
import Xaman from './Xaman';
import Fund from './Fund';
import Wallet from './Wallet';

// Route guard
import ProtectedRoute from './ProtectedRoute';

// App-wide user context (used by Home, etc.)
export const UserContext = createContext(null);

function AppRoutes({ user }) {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={user ? <Navigate to="/home" /> : <LandingPage />} />
      <Route path="/signin" element={!user ? <Login /> : <Navigate to="/home" />} />
      <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/home" />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/artist/:artistUid" element={<Artists />} />

      {/* Protected */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create"
        element={
          <ProtectedRoute>
            <CreateArtist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      {/* ✅ New protected Xaman route */}
      <Route
        path="/xaman"
        element={
          <ProtectedRoute>
            <Xaman />
          </ProtectedRoute>
        }
      />
      {/* ✅ New protected Fund route */}
      <Route
        path="/fund"
        element={
          <ProtectedRoute>
            <Fund />
          </ProtectedRoute>
        }
      />
      {/* ✅ New protected Wallet route */}
      <Route
        path="/wallet"
        element={
          <ProtectedRoute>
            <Wallet />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={user ? '/home' : '/'} />} />
    </Routes>
  );
}

function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);      // raw Firebase Auth user
  const [appUser, setAppUser] = useState(null);                // canonical /users/{uid} doc
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      setCheckingAuth(false);

      if (!u) {
        setAppUser(null);
        setCheckingProfile(false);
        return;
      }

      try {
        // Load canonical user at /users/{auth.uid}
        const userRef = doc(db, 'users', u.uid);
        let userSnap = await getDoc(userRef);

        // If missing, initialize a minimal profile
        if (!userSnap.exists()) {
          const now = serverTimestamp();
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email ?? null,
            firstName: '',
            lastName: '',
            primaryAuthUid: u.uid,
            createdAt: now,
            updatedAt: now,
          }, { merge: true });
          userSnap = await getDoc(userRef);
        }

        const data = userSnap.exists() ? userSnap.data() : {};
        setAppUser({ id: u.uid, firebaseUid: u.uid, email: u.email ?? null, ...data });
      } catch (err) {
        console.error('Failed to load app user profile:', err);
        setAppUser({ id: u.uid, firebaseUid: u.uid, email: u.email ?? null });
      } finally {
        setCheckingProfile(false);
      }
    });

    return () => unsub();
  }, []);

  if (checkingAuth || checkingProfile) return null; // could render a loader if you prefer

  return (
    <Router>
      <UserContext.Provider value={appUser}>
        <AppRoutes user={firebaseUser} />
      </UserContext.Provider>
    </Router>
  );
}

export default App;
