import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Users, Package, AlertCircle, CreditCard, LogOut, ShieldCheck, Truck, List } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/transactions', label: 'Ration Distributed', icon: List },
  { path: '/grains', label: 'Grain Management', icon: Package },
  { path: '/ration-cards', label: 'Ration Cards', icon: CreditCard },
  { path: '/logistics', label: 'Logistics', icon: Truck },
  { path: '/users', label: 'User Management', icon: Users },
  { path: '/complaints', label: 'Complaints', icon: AlertCircle },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  return (
    <aside className="w-[260px] bg-white border-r border-outline-variant/30 hidden md:flex flex-col m-4 rounded-xl shadow-card flex-shrink-0">
      <div className="p-5 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-primary font-bold text-base">State Control Panel</h1>
            <p className="text-xs text-on-surface-variant">{user.name || 'Admin'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${active ? 'bg-primary/10 text-primary border-l-4 border-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-outline-variant/20">
        <div className="bg-surface-variant/40 rounded-xl p-3 mb-3 text-xs text-on-surface-variant">
          <p className="font-semibold text-on-surface mb-0.5">{user.username || 'admin'}</p>
          <p className="capitalize">{user.role?.toLowerCase().replace('_', ' ')}</p>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-error hover:bg-error/5 rounded-xl transition-colors font-medium text-sm">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
