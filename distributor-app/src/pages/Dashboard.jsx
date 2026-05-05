import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw, Package, FileText, AlertTriangle, Activity, LogOut, Wifi, WifiOff } from 'lucide-react';
import { getPendingDistributions, complaintsDb } from '../db';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [pendingCount, setPendingCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Track online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const pending = await getPendingDistributions();
        setPendingCount(pending.length);

        // Build recent activity from pending + synced distributions
        const activities = pending.slice(0, 4).map(doc => ({
          title: `Distribution of ${doc.quantity}kg ${doc.grainType}`,
          desc: `To card ${doc.rationCardId}`,
          time: new Date(doc.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: 'dist'
        }));
        setRecentActivities(activities);
      } catch (err) {
        console.error(err);
      }
    };
    loadStats();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-on-background">Good Morning, {user.name || 'Distributor'}</h1>
            <p className="text-on-surface-variant mt-1 text-lg">Here is the latest overview of your ration distribution center.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full shadow-sm border ${isOnline ? 'bg-white border-outline-variant/20' : 'bg-orange-50 border-orange-200'}`}>
              {isOnline
                ? <><Wifi className="w-4 h-4 text-green-500" /><span className="text-sm font-medium text-on-surface">Online</span></>
                : <><WifiOff className="w-4 h-4 text-orange-500" /><span className="text-sm font-medium text-orange-600">Offline Mode</span></>
              }
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {(user.name || 'D')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 hover:shadow-modal transition-shadow">
            <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-2">Today's Distribution</p>
            <h2 className="text-3xl font-bold text-on-surface">{recentActivities.length} <span className="text-lg text-primary">Sessions</span></h2>
            <p className="text-sm text-on-surface-variant mt-2">Recorded today</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 hover:shadow-modal transition-shadow">
            <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-2">Available Stock</p>
            <h2 className="text-3xl font-bold text-on-surface">1,240 kg</h2>
            <div className="w-full bg-surface-variant/50 rounded-full h-2 mt-4">
              <div className="bg-green-500 h-2 rounded-full w-[85%]"></div>
            </div>
            <p className="text-sm text-on-surface-variant mt-2">85% remaining</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 hover:shadow-modal transition-shadow">
            <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-2">Pending Uploads</p>
            <h2 className="text-3xl font-bold text-on-surface">{pendingCount} <span className="text-lg text-on-surface-variant">Records</span></h2>
            {pendingCount > 0
              ? <p className="text-sm text-error font-medium mt-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-1" /> Awaiting server sync</p>
              : <p className="text-sm text-green-600 font-medium mt-2">✓ All data synced</p>
            }
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 hover:shadow-modal transition-shadow">
            <p className="text-xs font-bold text-on-surface-variant tracking-wider uppercase mb-2">Sync Status</p>
            <h2 className="text-3xl font-bold text-on-surface">{isOnline ? 'Ready' : 'Offline'}</h2>
            <p className="text-sm text-on-surface-variant mt-2">{isOnline ? 'Connected to CouchDB' : 'Data stored locally'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-outline-variant/10 p-6">
            <div className="flex justify-between items-center mb-6 border-b border-outline-variant/20 pb-4">
              <h3 className="text-xl font-bold text-on-surface">Recent Activity</h3>
              <Link to="/distribution" className="text-primary font-semibold text-sm hover:underline">New Distribution</Link>
            </div>
            <div className="space-y-4">
              {recentActivities.length > 0 ? recentActivities.map((activity, i) => (
                <div key={i} className="flex items-start p-3 hover:bg-surface-variant/20 rounded-xl transition-colors">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 bg-primary/10 text-primary">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-on-surface">{activity.title}</h4>
                    <p className="text-sm text-on-surface-variant">{activity.desc}</p>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium bg-surface-variant/50 px-2 py-1 rounded-full">{activity.time}</span>
                </div>
              )) : (
                <div className="text-center py-8 text-on-surface-variant">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No distributions recorded yet today.</p>
                  <Link to="/distribution" className="text-primary font-bold text-sm mt-2 inline-block hover:underline">Start one now →</Link>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-primary text-on-primary rounded-2xl shadow-card p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
              <h3 className="text-xl font-bold mb-2 relative z-10">Quick Distribution</h3>
              <p className="text-primary-fixed mb-6 relative z-10">Start a new distribution session for waiting beneficiaries.</p>
              <Link to="/distribution" className="inline-block bg-white text-primary font-bold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative z-10">
                Start Session
              </Link>
            </div>
            
            <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 p-6">
              <h3 className="text-lg font-bold text-on-surface mb-4">Store Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant">Username</span>
                  <span className="font-semibold text-on-surface">{user.username || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant">Role</span>
                  <span className="font-semibold text-on-surface capitalize">{user.role?.toLowerCase().replace('_', ' ') || '-'}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-on-surface-variant">Sync Mode</span>
                  <span className={`font-semibold ${isOnline ? 'text-green-600' : 'text-orange-500'}`}>{isOnline ? 'Live' : 'Offline'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Dashboard;
