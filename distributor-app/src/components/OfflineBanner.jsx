import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getPendingDistributions } from '../db';

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    const loadPending = async () => {
      try {
        const p = await getPendingDistributions();
        setPendingCount(p.length);
      } catch {}
    };
    loadPending();
    const interval = setInterval(loadPending, 10000);

    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`flex items-center justify-between px-6 py-2.5 text-sm font-medium ${isOnline ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'}`}>
      <div className="flex items-center gap-2">
        {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
        {isOnline
          ? `Connected — ${pendingCount} transaction${pendingCount !== 1 ? 's' : ''} pending sync`
          : `OFFLINE MODE — ${pendingCount} pending transaction${pendingCount !== 1 ? 's' : ''} stored locally`
        }
      </div>
      {pendingCount > 0 && (
        <a href="/sync" className="underline text-xs font-bold opacity-90 hover:opacity-100">Sync Now →</a>
      )}
    </div>
  );
};

export default OfflineBanner;
