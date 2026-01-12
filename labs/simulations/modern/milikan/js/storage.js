const DB_NAME = 'fisikaseru-labs';
const DB_VERSION = 1;
const STORE = 'runs';

const openDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, { keyPath: 'timestamp' });
    }
  };
  request.onerror = () => reject(request.error);
  request.onsuccess = () => resolve(request.result);
});

export const storage = {
  addRun: async (run) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(run);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },
  getRuns: async (simKey) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => {
        const runs = request.result.filter((run) => run.simKey === simKey);
        resolve(runs);
      };
      request.onerror = () => reject(request.error);
    });
  },
  clearRuns: async (simKey) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        request.result
          .filter((run) => run.simKey === simKey)
          .forEach((run) => store.delete(run.timestamp));
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },
};
