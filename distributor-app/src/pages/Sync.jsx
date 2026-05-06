import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, CheckCircle, XCircle, Clock, Loader2, CloudOff, Cloud } from 'lucide-react';
import { getAllDistributions, getPendingDistributions, pushManualSync, complaintsDb } from '../db';
import OfflineBanner from '../components/OfflineBanner';

const COUCHDB = 'http://admin:shri@127.0.0.1:5984';

const Sync = () => {
  // Safe user parse
  let user = {};
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }
  const assignedVillage = user.assignedVillage || null;

  const [allTx, setAllTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [liveSync, setLiveSync] = useState(null);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllDistributions();
      // Scope to distributor's village if assigned
      const scoped = assignedVillage
        ? all.filter(t => t.village?.toLowerCase() === assignedVillage.toLowerCase())
        : all;
      setAllTx(scoped);
      setPendingCount(scoped.filter(t => t.sync_status === 'PENDING').length);
      setSyncedCount(scoped.filter(t => t.sync_status === 'SYNCED').length);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [assignedVillage]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStartSync = () => {
    if (!isOnline) { setSyncStatus('offline'); return; }
    setSyncStatus('syncing');
    const handler = pushManualSync((event, info) => {
      if (event === 'syncing') setSyncStatus('syncing');
      else if (event === 'complete') { setSyncStatus('idle'); loadData(); setLiveSync(null); }
      else if (event === 'error') setSyncStatus('error');
    });
    setLiveSync(handler);
  };

  const handleStopSync = () => {
    if (liveSync) { liveSync.cancel(); setLiveSync(null); }
    setSyncStatus('idle');
  };

  const statusConfig = {
    idle: { label: 'Start Sync', color: 'bg-primary', icon: <RefreshCw className="w-5 h-5" /> },
    syncing: { label: 'Syncing...', color: 'bg-amber-500', icon: <Loader2 className="w-5 h-5 animate-spin" /> },
    paused: { label: 'Sync Paused', color: 'bg-green-600', icon: <Cloud className="w-5 h-5" /> },
    error: { label: 'Sync Error', color: 'bg-red-600', icon: <XCircle className="w-5 h-5" /> },
    offline: { label: 'No Internet', color: 'bg-gray-500', icon: <CloudOff className="w-5 h-5" /> },
  };

  const cfg = statusConfig[syncStatus] || statusConfig.idle;

  const txStatusIcon = {
    'SYNCED': <CheckCircle className="w-4 h-4 text-green-600" />,
    'PENDING': <Clock className="w-4 h-4 text-amber-500" />,
    'FAILED': <XCircle className="w-4 h-4 text-red-500" />,
    'CONFLICT': <XCircle className="w-4 h-4 text-purple-500" />,
  };

  return (
    <div className="min-h-screen bg-surface-variant/30">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Sync Data</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {assignedVillage
                ? <>Showing transactions for <strong>{assignedVillage}</strong>. Push to central CouchDB when online.</>
                : 'Push offline transactions to the central CouchDB server.'
              }
            </p>
          </div>
          <Link to="/dashboard" className="text-primary hover:underline text-sm font-semibold">← Back</Link>
        </div>

        {/* Sync Control Card */}
        <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-on-surface-variant font-semibold mt-1 uppercase tracking-wide">Pending</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-3xl font-bold text-green-600">{syncedCount}</p>
              <p className="text-xs text-on-surface-variant font-semibold mt-1 uppercase tracking-wide">Synced</p>
            </div>
            <div className="text-center p-4 bg-surface-variant/50 rounded-xl border border-outline-variant/10">
              <p className="text-3xl font-bold text-on-surface">{allTx.length}</p>
              <p className="text-xs text-on-surface-variant font-semibold mt-1 uppercase tracking-wide">Total</p>
            </div>
          </div>

          <div className="flex gap-3">
            {syncStatus !== 'syncing' ? (
              <button onClick={handleStartSync} disabled={!isOnline} className={`flex-1 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl transition-all ${isOnline ? cfg.color + ' hover:opacity-90' : 'bg-gray-300 cursor-not-allowed'}`}>
                {cfg.icon} {cfg.label}
              </button>
            ) : (
              <button onClick={handleStopSync} className="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-white font-bold py-3.5 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin" /> Syncing... (Click to stop)
              </button>
            )}
            <button onClick={loadData} className="px-5 py-3.5 border border-outline-variant/20 bg-white rounded-xl text-on-surface hover:bg-surface-variant/20 transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {syncStatus === 'paused' && (
            <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Live sync is active. Data will sync automatically when records are created.
            </div>
          )}
          {syncStatus === 'offline' && (
            <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 text-sm text-red-700 flex items-center gap-2">
              <CloudOff className="w-4 h-4" /> You are offline. Transactions are saved locally. Connect to the internet to sync.
            </div>
          )}
        </div>

        {/* Transaction Log */}
        <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10">
          <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center">
            <h2 className="text-lg font-bold text-on-surface">Transaction Log</h2>
            <span className="text-xs font-bold bg-surface-variant/50 px-3 py-1 rounded-full text-on-surface-variant">{allTx.length} records</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : allTx.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <Cloud className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No transactions recorded yet.</p>
              <Link to="/distribution" className="text-primary text-sm font-bold mt-2 inline-block hover:underline">Start a distribution →</Link>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10 max-h-[420px] overflow-y-auto">
              {allTx.map(tx => (
                <div key={tx._id} className="p-4 flex items-start gap-3 hover:bg-surface-variant/10">
                  <div className="mt-0.5">{txStatusIcon[tx.sync_status] || txStatusIcon.PENDING}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-on-surface truncate">{tx.rationCardId} — {tx.member?.name || 'Unknown'}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{tx.quantity}kg {tx.grainType} · {new Date(tx.createdAt).toLocaleString('en-IN')}</p>
                    <p className="text-xs font-mono text-on-surface-variant/60 mt-0.5 truncate">{tx.transactionId}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                    tx.sync_status === 'SYNCED' ? 'bg-green-100 text-green-700' :
                    tx.sync_status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    tx.sync_status === 'CONFLICT' ? 'bg-purple-100 text-purple-700' :
                    'bg-red-100 text-red-700'
                  }`}>{tx.sync_status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sync;
