import React, { useState, useEffect } from 'react';
import { Users, Plus, CheckCircle, XCircle, Edit2, Loader2, Search, MapPin, X, User, Shield, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { KA_DISTRICTS, getDistricts, getDistrictForVillage } from '../locations';

const BACKEND = 'http://localhost:5000';
const ROLES = ['DISTRIBUTOR', 'DISTRICT_ADMIN', 'STATE_ADMIN'];

const EMPTY_FORM = {
  username: '', password: '', name: '', role: 'DISTRIBUTOR',
  district: getDistricts()[0],
  assignedVillage: Object.values(KA_DISTRICTS)[0][0],
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [showProfile, setShowProfile] = useState(null);

  const districts = getDistricts();
  const villagesInDistrict = KA_DISTRICTS[form.district] || [];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND}/api/admin/users`);
      setUsers(res.data.data || []);
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to load users. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDistrictChange = (district) => {
    setForm(f => ({ ...f, district, assignedVillage: KA_DISTRICTS[district]?.[0] || '' }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.role !== 'DISTRIBUTOR' && form.password.length < 4) {
      setMsg({ type: 'error', text: 'Password must be at least 4 characters.' });
      setTimeout(() => setMsg(null), 3500);
      return;
    }
    setSubmitLoading(true);
    try {
      const isDist = form.role === 'DISTRIBUTOR';
      const payload = {
        ...form,
        username: isDist ? `dist_${form.assignedVillage.toLowerCase().replace(/\s+/g, '_')}` : form.username,
        password: isDist && !form.password ? 'dist123' : form.password,
        assignedLocation: `${form.assignedVillage} (${form.district})`,
      };
      await axios.post(`${BACKEND}/api/admin/users`, payload);
      setMsg({ type: 'success', text: `User "${payload.username}" created successfully!` });
      setShowForm(false);
      setForm(EMPTY_FORM);
      fetchUsers();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create user' });
    } finally {
      setSubmitLoading(false);
      setTimeout(() => setMsg(null), 3500);
    }
  };

  const toggleActive = async (user) => {
    try {
      await axios.put(`${BACKEND}/api/admin/users/${user._id}`, { isActive: !user.isActive });
      fetchUsers();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update user status.' });
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const filtered = users.filter(u =>
    u._id?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase()) ||
    u.assignedVillage?.toLowerCase().includes(search.toLowerCase()) ||
    u.district?.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors = {
    STATE_ADMIN: 'bg-purple-100 text-purple-700',
    DISTRICT_ADMIN: 'bg-blue-100 text-blue-700',
    DISTRIBUTOR: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> User Management
          </h1>
          <p className="text-on-surface-variant mt-1">Create and manage distributor and admin accounts with location assignments.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditUser(null); }}
          className="flex items-center bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md transition-all gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {msg && (
        <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 mb-8">
          <h2 className="text-lg font-bold text-on-surface mb-5 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Create New Account
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Full Name *</label>
              <input
                required value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Username *</label>
              <input
                required value={form.role === 'DISTRIBUTOR' ? `dist_${form.assignedVillage.toLowerCase().replace(/\s+/g, '_')}` : form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                placeholder="e.g. ramesh_dist"
                readOnly={form.role === 'DISTRIBUTOR'}
                className={`w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none ${form.role === 'DISTRIBUTOR' ? 'bg-gray-100 text-gray-500' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Password *</label>
              <input
                required type="text" value={form.role === 'DISTRIBUTOR' && !form.password ? 'dist123' : form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min 4 characters"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Role *</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
              >
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            {/* Location Assignment — full hierarchy */}
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">
                <MapPin className="w-4 h-4 inline mr-1 text-primary" />District *
              </label>
              <select
                value={form.district}
                onChange={e => handleDistrictChange(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
              >
                {districts.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">
                <MapPin className="w-4 h-4 inline mr-1 text-primary" />Assigned Village / Ward *
              </label>
              <select
                value={form.assignedVillage}
                onChange={e => setForm({ ...form, assignedVillage: e.target.value })}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
              >
                {villagesInDistrict.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>

            <div className="col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Assignment preview:</strong> This user will only see data for <strong>{form.assignedVillage}</strong> in {form.district} district.
                Distributors with DISTRIBUTOR role are restricted to their assigned village.
              </span>
            </div>

            <div className="col-span-2 flex gap-3">
              <button
                type="submit" disabled={submitLoading}
                className="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {submitLoading ? <><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Creating...</> : 'Create Account'}
              </button>
              <button
                type="button" onClick={() => setShowForm(false)}
                className="bg-surface-variant text-on-surface font-bold py-3 px-6 rounded-xl hover:bg-surface-variant/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10">
        <div className="p-5 border-b border-outline-variant/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, username, role, village or district..."
            className="flex-1 outline-none text-on-surface placeholder-on-surface-variant text-sm"
          />
          <span className="text-xs font-bold bg-surface-variant/50 px-3 py-1 rounded-full text-on-surface-variant">{filtered.length} users</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-variant/30 text-on-surface-variant uppercase text-xs tracking-wider">
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Username</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Village / District</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map(u => (
                  <tr key={u._id} className="hover:bg-surface-variant/10 transition-colors">
                    <td className="px-6 py-4 font-semibold text-on-surface">{u.name || '—'}</td>
                    <td className="px-6 py-4 font-mono text-on-surface-variant text-xs">{u._id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${roleColors[u.role] || 'bg-surface-variant text-on-surface-variant'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.assignedVillage ? (
                        <span className="flex items-center gap-1 text-on-surface-variant">
                          <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="font-medium">{u.assignedVillage}</span>
                          {u.district && <span className="text-xs opacity-60">· {u.district}</span>}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">{u.assignedLocation || '—'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${u.isActive !== false ? 'text-green-700' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <button
                        onClick={() => setShowProfile(u)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-surface-variant/50 text-on-surface hover:bg-surface-variant transition-colors"
                        title="View Profile"
                      >
                        <User className="w-3.5 h-3.5 inline mr-1" />Profile
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${u.isActive !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                      >
                        {u.isActive !== false ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-on-surface-variant">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowProfile(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5">
              <h2 className="text-xl font-bold text-on-surface">User Profile</h2>
              <button onClick={() => setShowProfile(null)} className="text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {(showProfile.name || showProfile._id || 'U')[0].toUpperCase()}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Full Name', value: showProfile.name || '—' },
                { label: 'Username', value: showProfile._id },
                { label: 'Role', value: showProfile.role },
                { label: 'District', value: showProfile.district || '—' },
                { label: 'Assigned Village', value: showProfile.assignedVillage || '—' },
                { label: 'Status', value: showProfile.isActive !== false ? 'Active' : 'Inactive' },
                { label: 'Created', value: showProfile.created_at ? new Date(showProfile.created_at).toLocaleDateString('en-IN') : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b border-outline-variant/10 pb-2">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="font-semibold text-on-surface">{value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowProfile(null)}
              className="w-full mt-5 bg-surface-variant text-on-surface font-bold py-3 rounded-xl hover:bg-surface-variant/80 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
