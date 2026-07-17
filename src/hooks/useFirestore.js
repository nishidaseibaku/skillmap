import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/** コレクションを購読して [{id, ...data}] を返す。読込中は null */
export function useCollection(path) {
  const [docs, setDocs] = useState(null);
  useEffect(
    () =>
      onSnapshot(collection(db, path), (snap) =>
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
    [path],
  );
  return docs;
}

/** 単一ドキュメントを購読する。読込中は undefined、不存在は null */
export function useDoc(path) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    const segments = path.split('/');
    return onSnapshot(doc(db, ...segments), (snap) =>
      setData(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    );
  }, [path]);
  return data;
}
