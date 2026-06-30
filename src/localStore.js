// localStorage-based mock store with a Firestore-like interface.
// Switch to real Firestore by replacing this module's exports with firebase/firestore.

const PREFIX = 'skillmap__';

function getStore(col) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + col) || '{}');
  } catch {
    return {};
  }
}

function setStore(col, data) {
  localStorage.setItem(PREFIX + col, JSON.stringify(data));
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// listeners: { col -> Set<fn> }
const listeners = {};

function notify(col) {
  (listeners[col] || new Set()).forEach(fn => fn());
}

export function onCollectionSnapshot(col, cb) {
  if (!listeners[col]) listeners[col] = new Set();
  const fn = () => {
    const store = getStore(col);
    cb(Object.entries(store).map(([id, d]) => ({ id, ...d })));
  };
  listeners[col].add(fn);
  fn(); // initial call
  return () => listeners[col].delete(fn);
}

export function onDocSnapshot(col, id, cb) {
  if (!listeners[col]) listeners[col] = new Set();
  const fn = () => {
    const store = getStore(col);
    cb(store[id] ? { id, ...store[id] } : null);
  };
  listeners[col].add(fn);
  fn();
  return () => listeners[col].delete(fn);
}

export function setDoc(col, id, data) {
  const store = getStore(col);
  store[id] = data;
  setStore(col, store);
  notify(col);
}

export function updateDoc(col, id, data) {
  const store = getStore(col);
  store[id] = { ...(store[id] || {}), ...data };
  setStore(col, store);
  notify(col);
}

export function deleteDoc(col, id) {
  const store = getStore(col);
  delete store[id];
  setStore(col, store);
  notify(col);
}

export function addDoc(col, data) {
  const id = genId();
  setDoc(col, id, data);
  return id;
}

export function clearCollection(col) {
  setStore(col, {});
  notify(col);
}
