'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCil6QFJ_WFRtFMgMfwIFjZAUM-a1NPI2U',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'restaurante-5665d.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'restaurante-5665d',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'restaurante-5665d.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '755014050914',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:755014050914:web:73ef89f5a1c048e7e31d3b',
};

export const firebaseProjectId = firebaseConfig.projectId;
export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
export const firebaseDataMode = process.env.NEXT_PUBLIC_DATA_MODE === 'firebase';

export function isFirebaseDataMode(): boolean {
  return firebaseDataMode && firebaseConfigured;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let emulatorsConnected = false;

if (firebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' && !emulatorsConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    emulatorsConnected = true;
  }
}

export { app as firebaseApp, auth as firebaseAuth, firestore as firebaseDb };
