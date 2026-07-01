import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
