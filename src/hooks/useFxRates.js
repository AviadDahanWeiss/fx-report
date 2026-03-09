import { useState, useCallback } from 'react';

const API_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = 'fx_rates_cache';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function useFxRates() {
  const [rates, setRates] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRates = useCallback(async () => {
    // Try cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          setRates(data);
          setLastFetched(new Date(timestamp));
          return data;
        }
      }
    } catch { /* ignore stale cache */ }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.result !== 'success') throw new Error('API returned error');
      const rateData = json.rates;
      const now = Date.now();
      setRates(rateData);
      setLastFetched(new Date(now));
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: rateData, timestamp: now }));
      return rateData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { rates, lastFetched, isLoading, error, fetchRates };
}
