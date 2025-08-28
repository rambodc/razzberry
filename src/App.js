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
import { doc, getDoc } from 'firebase/firestore';

// Public pages
import LandingPage from './LandingPage';
import Login from './Login';
import Signup from './Signup';
import ForgotPassword from './ForgotPassword';
import ListingDetail from './ListingDetail';

// Protected pages
import Home from './Home';
import CreateArtist from './CreateArtist';
import Chat from './Chat';
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
      <Route path="/artist/:artistUid" element={<ListingDetail />} />

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
  const [appUser, setAppUser] = useState(null);                // canonical /users/{userId} doc
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
        // Map auth.uid -> userId via /userAuth/{uid}, then load /users/{userId}
        const authRef = doc(db, 'userAuth', u.uid);
        const authSnap = await getDoc(authRef);

        let nextAppUser = { firebaseUid: u.uid, email: u.email ?? null };

        if (authSnap.exists()) {
          const { userId } = authSnap.data() || {};
          if (userId) {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              nextAppUser = { id: userSnap.id, ...userSnap.data(), firebaseUid: u.uid };
            }
          }
        }

        setAppUser(nextAppUser);
      } catch (err) {
        console.error('Failed to load app user profile:', err);
        setAppUser({ firebaseUid: u.uid, email: u.email ?? null });
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
