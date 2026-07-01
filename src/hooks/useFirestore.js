import { useState, useEffect } from 'react';
import {
  collection, doc, onSnapshot,
  setDoc as _setDoc, updateDoc as _updateDoc,
  deleteDoc as _deleteDoc, addDoc as _addDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useCollection(col) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, col), (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [col]);

  return { data, loading };
}

export function useDocument(col, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, col, id), (snap) => {
      setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return unsub;
  }, [col, id]);

  return { data, loading };
}

export function updateDocument(col, id, data) {
  return _updateDoc(doc(db, col, id), data);
}

export function setDocument(col, id, data) {
  return _setDoc(doc(db, col, id), data);
}

export function deleteDocument(col, id) {
  return _deleteDoc(doc(db, col, id));
}

export function addDocument(col, data) {
  return _addDoc(collection(db, col), data);
}
