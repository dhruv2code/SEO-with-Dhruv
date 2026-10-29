import { useState } from 'react';
export function usePersistentState(key, initial) {
  const [error, setError] = useState('');
  const [value, setValue] = useState(() => { try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : initial; } catch { return initial; } });
  const update = next => setValue(previous => {
    const result = typeof next === 'function' ? next(previous) : next;
    try { localStorage.setItem(key, JSON.stringify(result)); setError(''); } catch { setError('Browser storage is unavailable. Changes will last only for this session.'); }
    return result;
  });
  return [value, update, error];
}
