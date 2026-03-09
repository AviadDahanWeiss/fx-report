import { useState } from 'react';

const SCHEMA_VERSION = 2;

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      // Envelope format: { _v: 2, data: <value> }
      if (!parsed || parsed._v !== SCHEMA_VERSION) return initialValue;
      return parsed.data;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify({ _v: SCHEMA_VERSION, data: valueToStore }));
    } catch (err) {
      console.warn('useLocalStorage write failed:', err);
    }
  };

  return [storedValue, setValue];
}
