import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Package, RefreshCw, AlertTriangle, LogOut, Truck, X, User, MapPin, Wifi, WifiOff } from 'lucide-react';
import { getPendingDistributions } from '../db';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Safe parse user from localStorage
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    user = {};
  }

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const loadPending = async () => {
      try {
        const pending = await getPendingDistributions();
        setPendingCount(pending.length);
      } catch { /* ignore */ }
    };
    loadPending();
    const interval = setInterval(loadPending, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Activity },
    { path: '/distribution', label: 'Distributions', icon: Package },
    { path: '/shipments', label: 'Incoming Shipments', icon: Truck },
    { path: '/sync', label: 'Sync Data', icon: RefreshCw },
    { path: '/complaints', label: 'Complaints', icon: AlertTriangle },
  ];

  const village = user.assignedVillage || null;
  const district = user.district || null;

  return (
    <>
      <aside className="w-[280px] bg-white border-r border-outline-variant/30 flex-col hidden md:flex rounded-br-2xl rounded-tr-2xl shadow-card m-4">
        <div className="p-6 border-b border-outline-variant/10">
          <h1 className="text-primary font-bold text-xl tracking-tight">Ration System</h1>
          {village && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <p className="text-xs text-on-surface-variant truncate">{village}{district ? `, ${district}` : ''}</p>
            </div>
          )}
          {/* Online / Offline indicator */}
          <div className={`flex items-center gap-1.5 mt-2 text-xs font-semibold ${isOnline ? 'text-green-600' : 'text-orange-500'}`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online — Syncing' : 'Offline — Storing locally'}
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path} to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-surface-variant/50 text-on-surface border-l-4 border-primary' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span className={isActive ? 'font-semibold' : 'font-medium'}>{item.label}</span>
                {item.path === '/sync' && pendingCount > 0 && (
                  <span className="ml-auto bg-error text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{pendingCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-outline-variant/20">
          {/* Profile button */}
          <button
            onClick={() => setShowProfile(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-variant/40 hover:bg-surface-variant/70 transition-colors mb-2 text-left"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {(user.name || user.username || 'D')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-on-surface text-xs truncate">{user.name || user.username || 'Distributor'}</p>
              <p className="text-xs text-on-surface-variant truncate">
                {user.role?.toLowerCase().replace('_', ' ') || 'distributor'}
              </p>
            </div>
            <User className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-error hover:bg-error/5 rounded-xl transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-on-surface">My Profile</h2>
              <button onClick={() => setShowProfile(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-black">
                {(user.name || user.username || 'D')[0].toUpperCase()}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Name', value: user.name || '—' },
                { label: 'Username', value: user.username || '—' },
                { label: 'Role', value: user.role || '—' },
                { label: 'Assigned Village', value: user.assignedVillage || '—' },
                { label: 'District', value: user.district || '—' },
                { label: 'Connection', value: isOnline ? '🟢 Online' : '🔴 Offline' },
                { label: 'Pending Uploads', value: `${pendingCount} records` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="font-semibold text-on-surface">{value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-5 bg-error text-white font-bold py-3 rounded-xl hover:bg-error/90 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
            <button
              onClick={() => setShowProfile(false)}
              className="w-full mt-2 bg-surface-variant text-on-surface font-bold py-2.5 rounded-xl hover:bg-surface-variant/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
