// Store file contents locally without putting large blobs in localStorage.
const DATABASE = 'seo-with-dhruv-files';
const STORE = 'files';
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('siteId', 'siteId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other dashboard tabs and try again.'));
  });
}

async function transaction(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error || request.error);
      tx.onabort = () => reject(tx.error || request.error);
    });
  } finally {
    db.close();
  }
}

export async function listFiles(siteId) {
  const files = await transaction('readonly', store => store.index('siteId').getAll(siteId));
  return files.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveFile(siteId, file) {
  if (file.size > MAX_FILE_SIZE) throw new Error('Files must be 20 MB or smaller.');
  const record = {
    id: crypto.randomUUID(),
    siteId,
    name: file.name,
    size: file.size,
    type: file.type,
    createdAt: Date.now(),
    blob: file,
  };
  await transaction('readwrite', store => store.add(record));
  return record;
}

export function deleteFile(id) {
  return transaction('readwrite', store => store.delete(id));
}

export function downloadFile(file) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
