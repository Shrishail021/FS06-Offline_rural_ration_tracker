import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Users, Package, AlertCircle, CreditCard, LogOut, ShieldCheck, Truck, List, X, MapPin, User } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/transactions', label: 'Ration Distributed', icon: List },
  { path: '/grains', label: 'Grain Management', icon: Package },
  { path: '/ration-cards', label: 'Ration Cards', icon: CreditCard },
  { path: '/logistics', label: 'Logistics', icon: Truck },
  { path: '/users', label: 'User Management', icon: Users },
  { path: '/distributors', label: 'Distributor Directory', icon: Users },
  { path: '/complaints', label: 'Complaints', icon: AlertCircle },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  // Safely parse adminUser; handle malformed JSON gracefully
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('adminUser') || '{}');
  } catch {
    user = {};
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  return (
    <>
      <aside className="w-[260px] bg-white border-r border-outline-variant/30 hidden md:flex flex-col m-4 rounded-xl shadow-card flex-shrink-0">
        <div className="p-5 border-b border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-primary font-bold text-base">State Control Panel</h1>
              <p className="text-xs text-on-surface-variant">Karnataka Ration System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path} to={path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${active ? 'bg-primary/10 text-primary border-l-4 border-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {label}
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
              {(user.name || user.username || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-on-surface text-xs truncate">{user.name || user.username || 'Admin'}</p>
              <p className="text-xs text-on-surface-variant capitalize truncate">
                {user.role?.toLowerCase().replace('_', ' ') || 'admin'}
              </p>
            </div>
            <User className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-error hover:bg-error/5 rounded-xl transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" /> Logout
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
                {(user.name || user.username || 'A')[0].toUpperCase()}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Name', value: user.name || '—' },
                { label: 'Username', value: user.username || '—' },
                { label: 'Role', value: user.role || '—' },
                { label: 'District', value: user.district || 'All Districts' },
                { label: 'Assigned Village', value: user.assignedVillage || 'State-Wide Access' },
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
