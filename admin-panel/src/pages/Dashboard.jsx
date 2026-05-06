import React, { useState, useEffect } from 'react';
import { Package, Users, AlertCircle, BarChart3, Loader2, RefreshCw, Database, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import axios from 'axios';

const BACKEND = 'http://localhost:5000';

const Dashboard = () => {
  // Safe parse
  let user = {};
  try { user = JSON.parse(localStorage.getItem('adminUser') || '{}'); } catch { user = {}; }

  const [data, setData] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, distRes] = await Promise.all([
        axios.get(`${BACKEND}/api/admin/dashboard`),
        axios.get(`${BACKEND}/api/admin/distributions`).catch(() => ({ data: { data: [] } }))
      ]);
      setData(dashRes.data.data);
      const allDist = distRes.data.data || [];
      setPendingCount(allDist.filter(d => d.sync_status === 'PENDING').length);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Could not reach the backend server. Is it running on port 5000?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    // Auto-refresh every 30 seconds for realtime feel
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, []);



  return (
    <div className="p-8">
      {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-on-background">System Overview</h1>
            <p className="text-on-surface-variant mt-1">Monitor state-wide ration distribution metrics for Karnataka.</p>
          </div>
          <button
            onClick={fetchDashboardStats}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-outline-variant/20 px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all text-on-surface font-medium text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </header>
        {lastUpdated && (
          <p className="text-xs text-on-surface-variant mb-4 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Live · Last updated: {lastUpdated.toLocaleTimeString('en-IN')} · Auto-refreshes every 30s
          </p>
        )}

        {loading && (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4 mb-8">
            <AlertCircle className="w-6 h-6 text-error mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-error mb-1">Backend Unreachable</h3>
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={fetchDashboardStats} className="mt-3 text-sm font-bold text-primary hover:underline">Try again</button>
            </div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase">Total Distributed</p>
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <h2 className="text-4xl font-black text-on-surface flex items-baseline gap-2">
                  {data.totalDistributed} <span className="text-xl font-bold text-amber-500">Kg</span>
                </h2>
                <p className="text-sm text-on-surface-variant mt-2">Total across state</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase">Active Distributors</p>
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-on-surface">{data.activeDistributors}</h2>
                <p className="text-sm text-on-surface-variant mt-2">Registered in system</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase">Open Conflicts</p>
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-error" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-error flex items-center gap-2">
                  {data.openConflicts}
                  {data.openConflicts > 0 && <span className="w-2.5 h-2.5 bg-error rounded-full animate-pulse inline-block" />}
                </h2>
                <p className="text-sm text-on-surface-variant mt-2">Require resolution</p>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Area Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10">
                <h3 className="text-lg font-bold text-on-surface mb-1">Weekly Distribution Trend</h3>
                <p className="text-sm text-on-surface-variant mb-6">Quantity distributed (Kg) per day this week</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e0d1" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0px 4px 20px rgba(0,0,0,.08)', fontSize: '13px' }} />
                      <Area type="monotone" dataKey="dist" stroke="#F59E0B" strokeWidth={2.5} fill="url(#grad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart — grain breakdown */}
              <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10">
                <h3 className="text-lg font-bold text-on-surface mb-1">Grain Breakdown</h3>
                <p className="text-sm text-on-surface-variant mb-6">Kg distributed by type</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.grainBreakdown && data.grainBreakdown.length > 0 ? data.grainBreakdown : [{ name: 'Wheat', kg: 0 }, { name: 'Rice', kg: 0 }, { name: 'Dal', kg: 0 }, { name: 'Jowar', kg: 0 }]} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0e0d1" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 12 }} width={40} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0px 4px 20px rgba(0,0,0,.08)', fontSize: '13px' }} />
                      <Bar dataKey="kg" fill="#a16207" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10">
                <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" /> CouchDB Status
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">admin_users DB</span>
                    <span className="font-semibold text-green-600 flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block"></span> Active</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">distributions DB</span>
                    <span className="font-semibold text-green-600 flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block"></span> Active</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Pending Sync Records</span>
                    <span className={`font-semibold flex items-center gap-1 ${pendingCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      <Clock className="w-3.5 h-3.5" />{pendingCount} records
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-on-surface mb-2">About This System</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Offline-first ration distribution system for rural Karnataka. Distributor apps record transactions locally using PouchDB and sync to this CouchDB instance when connectivity is restored.
                </p>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <span className="bg-white border border-outline-variant/20 text-xs font-semibold px-3 py-1 rounded-full">PouchDB</span>
                  <span className="bg-white border border-outline-variant/20 text-xs font-semibold px-3 py-1 rounded-full">CouchDB</span>
                  <span className="bg-white border border-outline-variant/20 text-xs font-semibold px-3 py-1 rounded-full">React + Vite</span>
                  <span className="bg-white border border-outline-variant/20 text-xs font-semibold px-3 py-1 rounded-full">Express.js</span>
                </div>
              </div>
            </div>
          </>
        )}
    </div>
  );
};

export default Dashboard;
