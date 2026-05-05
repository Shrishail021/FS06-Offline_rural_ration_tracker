import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Package, FileText, AlertTriangle, Activity, Wifi, WifiOff, MapPin, Clock, CheckCircle, Database } from 'lucide-react';
import { getAllDistributions, getPendingDistributions, getLocalStock } from '../db';

const Dashboard = () => {
  // Safe user parse
  let user = {};
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }

  const [allDist, setAllDist] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [localStock, setLocalStock] = useState({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);

  const village = user.assignedVillage || null;
  const district = user.district || null;

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await getAllDistributions();
      // Filter to this distributor's village if assigned
      const scoped = village
        ? all.filter(d => d.village?.toLowerCase() === village.toLowerCase())
        : all;
      setAllDist(scoped);
      setPendingCount(scoped.filter(d => d.sync_status === 'PENDING').length);
      setSyncedCount(scoped.filter(d => d.sync_status === 'SYNCED').length);

      // Local stock per grain type for this village
      if (village) {
        const grains = ['wheat', 'rice', 'dal', 'jowar'];
        const stockMap = {};
        for (const g of grains) {
          stockMap[g] = await getLocalStock(village, g);
        }
        setLocalStock(stockMap);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Recent activity from local PouchDB (works offline)
  const recentActivities = [...allDist]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Today's distributions
  const todayStr = new Date().toDateString();
  const todayDist = allDist.filter(d => new Date(d.createdAt).toDateString() === todayStr);

  const grainColors = { wheat: '#F59E0B', rice: '#3B82F6', dal: '#10B981', jowar: '#8B5CF6' };

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-on-background">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},&nbsp;
            {user.name || 'Distributor'} 👋
          </h1>
          {village ? (
            <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium">{village}</span>
              {district && <span className="text-sm">· {district} District</span>}
            </div>
          ) : (
            <p className="text-on-surface-variant mt-1">No location assigned. Contact your admin.</p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full shadow-sm border ${isOnline ? 'bg-white border-outline-variant/20' : 'bg-orange-50 border-orange-200'}`}>
            {isOnline
              ? <><Wifi className="w-4 h-4 text-green-500" /><span className="text-sm font-medium text-on-surface">Online</span></>
              : <><WifiOff className="w-4 h-4 text-orange-500" /><span className="text-sm font-medium text-orange-600">Offline</span></>
            }
          </div>
          <button
            onClick={loadData}
            className="w-10 h-10 rounded-full bg-surface-variant/50 flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Offline Data Notice */}
      {!isOnline && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <WifiOff className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-orange-800">You are offline — all data is from local storage</p>
            <p className="text-sm text-orange-700 mt-0.5">
              Transactions recorded here will sync to the server automatically when internet is restored.
              {pendingCount > 0 && <strong className="ml-1">{pendingCount} record(s) waiting to sync.</strong>}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 hover:shadow-modal transition-shadow">
          <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-2">Today's Distributions</p>
          <h2 className="text-3xl font-bold text-on-surface">{todayDist.length} <span className="text-lg text-primary">Sessions</span></h2>
          <p className="text-sm text-on-surface-variant mt-2">Recorded today locally</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 hover:shadow-modal transition-shadow">
          <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-2">Total This Month</p>
          <h2 className="text-3xl font-bold text-on-surface">{allDist.length}</h2>
          <p className="text-sm text-on-surface-variant mt-2">All local transactions</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 hover:shadow-modal transition-shadow">
          <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-2">Pending Uploads</p>
          <h2 className="text-3xl font-bold text-on-surface">{pendingCount} <span className="text-lg text-on-surface-variant">Records</span></h2>
          {pendingCount > 0
            ? <p className="text-sm text-error font-medium mt-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> Awaiting server sync</p>
            : <p className="text-sm text-green-600 font-medium mt-2 flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> All synced</p>
          }
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 hover:shadow-modal transition-shadow">
          <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-2">Sync Status</p>
          <h2 className="text-3xl font-bold text-on-surface">{isOnline ? 'Ready' : 'Offline'}</h2>
          <p className="text-sm text-on-surface-variant mt-2">
            {isOnline ? `${syncedCount} synced to server` : 'Data stored locally (PouchDB)'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity — from local PouchDB */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-outline-variant/10 p-6">
          <div className="flex justify-between items-center mb-6 border-b border-outline-variant/20 pb-4">
            <div>
              <h3 className="text-xl font-bold text-on-surface">Recent Activity</h3>
              <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                <Database className="w-3.5 h-3.5" /> Showing locally stored data
              </p>
            </div>
            <Link to="/distribution" className="text-primary font-semibold text-sm hover:underline">New Distribution</Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-on-surface-variant">Loading local data...</div>
            ) : recentActivities.length > 0 ? recentActivities.map((tx, i) => (
              <div key={tx._id || i} className="flex items-start p-3 hover:bg-surface-variant/20 rounded-xl transition-colors">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 bg-primary/10 text-primary flex-shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-on-surface">{tx.quantity}kg {tx.grainType} → {tx.member?.name || tx.headName || 'Beneficiary'}</h4>
                  <p className="text-sm text-on-surface-variant truncate">Card: {tx.rationCardId}{tx.village ? ` · ${tx.village}` : ''}</p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  <span className="text-xs text-on-surface-variant font-medium bg-surface-variant/50 px-2 py-0.5 rounded-full">
                    {new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    tx.sync_status === 'SYNCED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>{tx.sync_status}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-on-surface-variant">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No distributions recorded yet{village ? ` for ${village}` : ''}.</p>
                <Link to="/distribution" className="text-primary font-bold text-sm mt-2 inline-block hover:underline">Start one now →</Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Distribution CTA */}
          <div className="bg-primary text-on-primary rounded-2xl shadow-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <h3 className="text-xl font-bold mb-2 relative z-10">Quick Distribution</h3>
            <p className="text-primary-fixed mb-6 relative z-10 text-sm">
              {village ? `Serving beneficiaries in ${village}.` : 'Start a new distribution session.'}
            </p>
            <Link to="/distribution" className="inline-block bg-white text-primary font-bold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative z-10">
              Start Session
            </Link>
          </div>

          {/* Local Stock Card (from PouchDB — works offline) */}
          {village && Object.keys(localStock).length > 0 && (
            <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 p-6">
              <h3 className="text-lg font-bold text-on-surface mb-1">Local Stock</h3>
              <p className="text-xs text-on-surface-variant mb-4 flex items-center gap-1">
                <Database className="w-3.5 h-3.5" /> Calculated from local shipments
              </p>
              <div className="space-y-2">
                {Object.entries(localStock).map(([grain, qty]) => (
                  <div key={grain} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-on-surface capitalize">{grain}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-surface-variant/50 rounded-full overflow-hidden">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${Math.min(100, (qty / 200) * 100)}%`, backgroundColor: grainColors[grain] || '#a16207' }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${qty < 20 ? 'text-error' : 'text-on-surface'}`}>{qty}kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Store Information */}
          <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 p-6">
            <h3 className="text-lg font-bold text-on-surface mb-4">Store Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span className="text-on-surface-variant">Username</span>
                <span className="font-semibold text-on-surface">{user.username || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span className="text-on-surface-variant">Village</span>
                <span className="font-semibold text-on-surface">{village || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                <span className="text-on-surface-variant">District</span>
                <span className="font-semibold text-on-surface">{district || '—'}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-on-surface-variant">Sync Mode</span>
                <span className={`font-semibold ${isOnline ? 'text-green-600' : 'text-orange-500'}`}>
                  {isOnline ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
