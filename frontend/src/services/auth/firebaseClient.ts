import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

let app: FirebaseApp | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

function getApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Phone sign-in is not configured yet. Add the Firebase web app keys to frontend/.env (see frontend/.env.example).'
    );
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

function getVerifier(containerId: string): RecaptchaVerifier {
  const auth = getAuth(getApp());
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  }
  return recaptchaVerifier;
}

export async function sendPhoneOtp(phoneE164: string, recaptchaContainerId: string): Promise<ConfirmationResult> {
  const auth = getAuth(getApp());
  const verifier = getVerifier(recaptchaContainerId);
  return signInWithPhoneNumber(auth, phoneE164, verifier);
}

export function resetRecaptcha() {
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
}

export type { ConfirmationResult };
