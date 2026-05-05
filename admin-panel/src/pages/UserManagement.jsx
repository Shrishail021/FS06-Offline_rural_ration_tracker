import React, { useState, useEffect } from 'react';
import { Users, Plus, CheckCircle, XCircle, Edit2, Loader2, Search } from 'lucide-react';
import axios from 'axios';

const BACKEND = 'http://localhost:5000';
const ROLES = ['DISTRIBUTOR', 'DISTRICT_ADMIN', 'STATE_ADMIN'];
const LOCATIONS = ['KA-DH-HU-001 (Hubli Central)', 'KA-DH-HU-002 (Gokul Village)', 'KA-BL-BL-001 (Belagavi North)'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'DISTRIBUTOR', assignedLocation: LOCATIONS[0] });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND}/api/admin/users`);
      setUsers(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await axios.post(`${BACKEND}/api/admin/users`, form);
      setMsg({ type: 'success', text: `User "${form.username}" created successfully!` });
      setShowForm(false);
      setForm({ username: '', password: '', name: '', role: 'DISTRIBUTOR', assignedLocation: LOCATIONS[0] });
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
    } catch (err) { console.error(err); }
  };

  const filtered = users.filter(u =>
    u._id?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3"><Users className="w-8 h-8 text-primary" /> User Management</h1>
          <p className="text-on-surface-variant mt-1">Create and manage distributor and admin accounts.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md transition-all">
          <Plus className="w-4 h-4 mr-2" /> Add User
        </button>
      </div>

      {msg && (
        <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 mb-8">
          <h2 className="text-lg font-bold text-on-surface mb-4">Create New Account</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Full Name</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Ramesh Kumar" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Username</label>
              <input required value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="e.g. ramesh_dist" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Password</label>
              <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 8 chars" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-on-surface mb-1">Assigned Location</label>
              <select value={form.assignedLocation} onChange={e => setForm({...form, assignedLocation: e.target.value})} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none">
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={submitLoading} className="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary/90 transition-colors">
                {submitLoading ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-surface-variant text-on-surface font-bold py-3 px-6 rounded-xl hover:bg-surface-variant/80 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10">
        <div className="p-5 border-b border-outline-variant/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-on-surface-variant" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, username or role..." className="flex-1 outline-none text-on-surface placeholder-on-surface-variant" />
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
                  <th className="px-6 py-3 text-left">Location</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map(u => (
                  <tr key={u._id} className="hover:bg-surface-variant/10 transition-colors">
                    <td className="px-6 py-4 font-semibold text-on-surface">{u.name || '—'}</td>
                    <td className="px-6 py-4 font-mono text-on-surface-variant">{u._id}</td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${roleColors[u.role] || 'bg-surface-variant text-on-surface-variant'}`}>{u.role}</span></td>
                    <td className="px-6 py-4 text-on-surface-variant">{u.assignedLocation || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${u.isActive !== false ? 'text-green-700' : 'text-red-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${u.isActive !== false ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleActive(u)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${u.isActive !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
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
    </div>
  );
};

export default UserManagement;
