'use client';

import { useEffect } from 'react';

/**
 * Render Free Tier Keep-Alive Hook
 * Pings the backend every 14 minutes to prevent sleep (15m timeout).
 */
export function useKeepAlive() {
  useEffect(() => {
    // Only run if we have a backend URL (production mostly)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) return;

    const pingBackend = async () => {
      try {
        await fetch(`${backendUrl}/health`, { method: 'GET', mode: 'no-cors' });
        console.log('💓 [Keep-Alive] Ping sent to backend');
      } catch (err) {
        console.error('💔 [Keep-Alive] Ping failed', err);
      }
    };

    // Ping immediately on mount
    pingBackend();

    // Ping every 14 minutes (14 * 60 * 1000 = 840000ms)
    const interval = setInterval(pingBackend, 14 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}
