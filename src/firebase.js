import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'local-api-key',
  authDomain: 'skillmap-local.firebaseapp.com',
  projectId: 'skillmap-local',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
