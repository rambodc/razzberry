// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Prefer env-driven config so we can point the app at any project
// Define these in .env.local or CI env vars prefixed with REACT_APP_
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyCzhiKN966llk-7D3E6nkrFSmI3LdK8C6c',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'production1-fbd5d.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'production1-fbd5d',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'production1-fbd5d.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '276382853797',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:276382853797:web:ffb3a639ac6df5f7b3fb4c',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-SM2D5V18L5',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
