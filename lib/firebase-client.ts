'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

export const firebaseProjectId = firebaseConfig.projectId;
export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
export const firebaseDataMode = process.env.NEXT_PUBLIC_DATA_MODE === 'firebase';
export const firebaseSdkConfigAvailable = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
export const appCheckConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY);
export const productionEnvironmentReady = firebaseDataMode && firebaseSdkConfigAvailable && appCheckConfigured && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== 'true' && process.env.NEXT_PUBLIC_USE_DEVELOPMENT_SEED !== 'true';
const emulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
const emulatorPort = Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || 8180);

export function isFirebaseDataMode(): boolean {
  return firebaseDataMode && firebaseConfigured;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let appCheck: AppCheck | null = null;
let emulatorsConnected = false;

if (firebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);

  const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (appCheckSiteKey && typeof window !== 'undefined') {
    appCheck = initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  }

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' && !emulatorsConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, emulatorHost, emulatorPort);
    emulatorsConnected = true;
  }
}

export const appCheckEnabled = Boolean(appCheck);
export { app as firebaseApp, auth as firebaseAuth, firestore as firebaseDb, appCheck as firebaseAppCheck };
