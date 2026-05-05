import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Package, RefreshCw, AlertTriangle, LogOut, Truck } from 'lucide-react';
import { getPendingDistributions } from '../db';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const loadPending = async () => {
      try {
        const pending = await getPendingDistributions();
        setPendingCount(pending.length);
      } catch (err) {}
    };
    loadPending();
    // Refresh interval to keep count updated
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

  return (
    <aside className="w-[280px] bg-white border-r border-outline-variant/30 flex-col hidden md:flex rounded-br-2xl rounded-tr-2xl shadow-card m-4">
      <div className="p-6">
        <h1 className="text-primary font-bold text-xl tracking-tight">Ration System</h1>
        <p className="text-xs text-on-surface-variant mt-1">{user.name || 'Distributor'}</p>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-surface-variant/50 text-on-surface border-l-4 border-primary' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}>
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
        <button onClick={handleLogout} className="flex items-center space-x-3 w-full px-4 py-3 text-error hover:bg-error/5 rounded-xl transition-colors font-medium">
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
