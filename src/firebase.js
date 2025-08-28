// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {

  apiKey: "AIzaSyCzhiKN966llk-7D3E6nkrFSmI3LdK8C6c",
  authDomain: "production1-fbd5d.firebaseapp.com",
  projectId: "production1-fbd5d",
  storageBucket: "production1-fbd5d.appspot.com",
  messagingSenderId: "276382853797",
  appId: "1:276382853797:web:ffb3a639ac6df5f7b3fb4c",
  measurementId: "G-SM2D5V18L5"

};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
