import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, OAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyDkky6ZH9EQVHl5pqMavmfP8F2ChBK6ry4',
  authDomain: 'skill-map-27189.firebaseapp.com',
  projectId: 'skill-map-27189',
  storageBucket: 'skill-map-27189.firebasestorage.app',
  messagingSenderId: '216677182386',
  appId: '1:216677182386:web:fa3a40921ca745c474d2ab',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
// Cloud Functions は asia-northeast1 にデプロイしている
export const functions = getFunctions(app, 'asia-northeast1');

// 社内テナントに限定した Microsoft SSO
const TENANT_ID = '208aac18-8247-4354-a8bf-617d2198ba7c';

export async function signInWithMicrosoft() {
  const provider = new OAuthProvider('microsoft.com');
  provider.setCustomParameters({
    tenant: TENANT_ID,
    prompt: 'select_account',
  });
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}
