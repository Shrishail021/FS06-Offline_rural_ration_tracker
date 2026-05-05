import React, { useState, useEffect } from 'react';
import { Users, Search, MapPin, Printer, Download, Mail, Loader2, ShieldCheck, CheckCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND = 'http://localhost:5000';

const DistributorList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND}/api/admin/users`);
      // Only keep distributors
      setUsers(res.data.data.filter(u => u.role === 'DISTRIBUTOR'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u._id.toLowerCase().includes(search.toLowerCase()) || 
    (u.district || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.assignedVillage || '').toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    const header = "Username,Name,District,Village,Status,Created At\n";
    const csv = filteredUsers.map(u => 
      `${u._id},${u.name},${u.district || 'N/A'},${u.assignedVillage || 'N/A'},${u.isActive ? 'Active' : 'Inactive'},${new Date(u.created_at).toLocaleDateString()}`
    ).join("\n");

    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'distributor_directory.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-on-background">Distributor Directory</h1>
          <p className="text-on-surface-variant mt-1">Official list of all registered distributors and their village assignments.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/20 rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-semibold text-on-surface">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl shadow-md hover:bg-primary/90 transition-all text-sm font-semibold">
            <Printer className="w-4 h-4" /> Print Roster
          </button>
        </div>
      </header>

      {/* Print Only Header */}
      <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black">KARNATAKA STATE CIVIL SUPPLIES</h1>
        <h2 className="text-lg font-bold text-gray-700 mt-1">OFFICIAL DISTRIBUTOR ROSTER</h2>
        <p className="text-sm text-gray-500 mt-1">Generated on: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 print:shadow-none print:border-none print:p-0">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div className="relative w-80">
            <Search className="w-5 h-5 absolute left-3 top-3.5 text-on-surface-variant/50" />
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, district or village..." 
              className="w-full pl-10 pr-4 py-3 bg-surface-variant/20 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div className="text-sm text-on-surface-variant font-medium bg-surface-variant/30 px-3 py-1.5 rounded-lg">
            Showing {filteredUsers.length} of {users.length} distributors
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:grid-cols-2">
          {filteredUsers.map(user => (
            <div key={user._id} className="border border-outline-variant/20 rounded-2xl p-5 hover:border-primary/30 transition-colors bg-surface-variant/5 print:break-inside-avoid print:border-black">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg print:border print:border-black">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface leading-tight">{user.name}</h3>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5 font-mono">@{user._id}</p>
                  </div>
                </div>
                {user.isActive ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full uppercase tracking-wider print:border print:border-black">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full uppercase tracking-wider print:border print:border-black">
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-outline-variant/10">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">Assigned Village</p>
                    <p className="text-sm font-bold text-on-surface">{user.assignedVillage || 'Not Assigned'}</p>
                    <p className="text-xs text-on-surface-variant">{user.district || 'Not Assigned'} District</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-outline-variant/10">
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">Role</p>
                    <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                      <ShieldCheck className="w-4 h-4" /> {user.role}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">Joined</p>
                    <p className="text-sm font-semibold text-on-surface">{new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-on-surface">No distributors found</h3>
            <p className="text-on-surface-variant">Try adjusting your search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DistributorList;
