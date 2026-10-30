import { initializeApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

// 開発(npm run dev)はローカルのエミュレーターへ、本番ビルドは VITE_FIREBASE_* の設定で実プロジェクトへ接続する。
// エミュレーターのプロジェクトIDは demo- 始まりなので、実プロジェクトには接続しない。
const useEmulator = import.meta.env.DEV

const app = initializeApp(
  useEmulator
    ? { projectId: 'demo-skill-map', apiKey: 'demo', storageBucket: 'demo-skill-map.appspot.com' }
    : {
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      },
)

export const db = getFirestore(app)
export const storage = getStorage(app)

if (useEmulator) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
