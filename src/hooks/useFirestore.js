import { useState, useEffect } from 'react';
import {
  onCollectionSnapshot, onDocSnapshot,
  setDoc as _setDoc, updateDoc as _updateDoc,
  deleteDoc as _deleteDoc, addDoc as _addDoc,
} from '../localStore';

export function useCollection(col) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onCollectionSnapshot(col, (docs) => {
      setData(docs);
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
    const unsub = onDocSnapshot(col, id, (doc) => {
      setData(doc);
      setLoading(false);
    });
    return unsub;
  }, [col, id]);

  return { data, loading };
}

export function updateDocument(col, id, data) {
  _updateDoc(col, id, data);
}

export function setDocument(col, id, data) {
  _setDoc(col, id, data);
}

export function deleteDocument(col, id) {
  _deleteDoc(col, id);
}

export function addDocument(col, data) {
  return _addDoc(col, data);
}
