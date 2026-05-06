import React, { useState, useEffect } from 'react';
import { List, Search, Loader2, Calendar, MapPin, CheckCircle, Clock, XCircle, RefreshCw, Filter } from 'lucide-react';
import axios from 'axios';
import { KA_DISTRICTS, getDistricts } from '../locations';

const BACKEND = 'http://localhost:5000';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterVillage, setFilterVillage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const districts = getDistricts();
  const villagesInDistrict = filterDistrict ? (KA_DISTRICTS[filterDistrict] || []) : [];

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BACKEND}/api/admin/distributions`);
      setTransactions(res.data.data || []);
    } catch (err) {
      setError('Could not reach the backend server. Is it running on port 5000?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const handleDistrictChange = (d) => {
    setFilterDistrict(d);
    setFilterVillage('');
  };

  const filtered = transactions.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      t.rationCardId?.toLowerCase().includes(q) ||
      t.deviceId?.toLowerCase().includes(q) ||
      t.transactionId?.toLowerCase().includes(q) ||
      t.member?.name?.toLowerCase().includes(q) ||
      t.village?.toLowerCase().includes(q) ||
      t.distributorUsername?.toLowerCase().includes(q);
    const matchDistrict = !filterDistrict || t.district?.toLowerCase() === filterDistrict.toLowerCase();
    const matchVillage = !filterVillage || t.village?.toLowerCase() === filterVillage.toLowerCase();
    const matchStatus = !filterStatus || t.sync_status === filterStatus;
    return matchSearch && matchDistrict && matchVillage && matchStatus;
  });

  const statusBadge = {
    SYNCED: <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" />SYNCED</span>,
    PENDING: <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" />PENDING</span>,
    CONFLICT: <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" />CONFLICT</span>,
  };

  const uniqueTxns = new Set(transactions.map(t => t.transactionId || t._id)).size;
  const uniqueSynced = new Set(transactions.filter(t => t.sync_status === 'SYNCED').map(t => t.transactionId || t._id)).size;
  const uniquePending = new Set(transactions.filter(t => t.sync_status === 'PENDING').map(t => t.transactionId || t._id)).size;
  const uniqueConflicts = new Set(transactions.filter(t => t.sync_status === 'CONFLICT').map(t => t.transactionId || t._id)).size;

  const stats = {
    total: uniqueTxns,
    synced: uniqueSynced,
    pending: uniquePending,
    conflicts: uniqueConflicts,
    totalKg: transactions.reduce((s, t) => s + (Number(t.quantity) || 0), 0),
  };

  const groupedFiltered = Object.values(filtered.reduce((acc, t) => {
    const groupId = t.transactionId || t._id;
    if (!acc[groupId]) {
      acc[groupId] = {
        groupId, transactionId: t.transactionId || t._id, rationCardId: t.rationCardId,
        member: t.member, village: t.village, district: t.district,
        createdAt: t.createdAt, sync_status: t.sync_status, items: []
      };
    }
    acc[groupId].items.push({ grainType: t.grainType, quantity: t.quantity, _id: t._id });
    return acc;
  }, {}));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3">
            <List className="w-8 h-8 text-primary" /> Distributed Ration Tracker
          </h1>
          <p className="text-on-surface-variant mt-1">All synced offline transactions from distributors across Karnataka.</p>
        </div>
        <button
          onClick={fetchTransactions}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-outline-variant/20 px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all text-on-surface font-medium text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Txns', value: stats.total, cls: 'bg-white' },
          { label: 'Synced', value: stats.synced, cls: 'bg-green-50 text-green-700' },
          { label: 'Pending', value: stats.pending, cls: 'bg-amber-50 text-amber-700' },
          { label: 'Conflicts', value: stats.conflicts, cls: 'bg-red-50 text-red-700' },
          { label: 'Total Kg', value: `${stats.totalKg}kg`, cls: 'bg-primary/5 text-primary' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`${cls} p-4 rounded-2xl border border-outline-variant/10 shadow-card text-center`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide mt-1 opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3 text-red-800">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold">Backend Unreachable</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10">
        {/* Filters */}
        <div className="p-5 border-b border-outline-variant/10 space-y-3">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ration card, beneficiary, village, device or transaction ID..."
              className="flex-1 outline-none text-on-surface placeholder-on-surface-variant text-sm"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-on-surface-variant" />
              <select
                value={filterDistrict}
                onChange={e => handleDistrictChange(e.target.value)}
                className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Districts</option>
                {districts.map(d => <option key={d}>{d}</option>)}
              </select>
              {filterDistrict && (
                <select
                  value={filterVillage}
                  onChange={e => setFilterVillage(e.target.value)}
                  className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Villages</option>
                  {villagesInDistrict.map(v => <option key={v}>{v}</option>)}
                </select>
              )}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Statuses</option>
                <option value="SYNCED">Synced</option>
                <option value="PENDING">Pending</option>
                <option value="CONFLICT">Conflict</option>
              </select>
              {(filterDistrict || filterVillage || filterStatus) && (
                <button
                  onClick={() => { setFilterDistrict(''); setFilterVillage(''); setFilterStatus(''); }}
                  className="text-xs text-primary font-semibold hover:underline"
                >Clear filters</button>
              )}
            </div>
            <span className="ml-auto text-xs font-bold bg-surface-variant/50 px-3 py-1 rounded-full text-on-surface-variant self-center">
              {groupedFiltered.length} results
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : groupedFiltered.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <List className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No transactions found{filterVillage ? ` for ${filterVillage}` : ''}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-variant/30 text-on-surface-variant uppercase text-xs tracking-wider">
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Transaction ID</th>
                  <th className="px-5 py-3 text-left">Ration Card</th>
                  <th className="px-5 py-3 text-left">Beneficiary</th>
                  <th className="px-5 py-3 text-left">Village / District</th>
                  <th className="px-5 py-3 text-right">Payload</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {groupedFiltered.map(group => (
                  <tr key={group.groupId} className="hover:bg-surface-variant/10 transition-colors">
                    <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(group.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-on-surface-variant max-w-[120px] truncate">{group.transactionId}</td>
                    <td className="px-5 py-3 font-bold text-primary">{group.rationCardId}</td>
                    <td className="px-5 py-3 font-semibold">{group.member?.name || 'Unknown'}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 text-on-surface-variant">
                        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span>{group.village || '—'}</span>
                        {group.district && <span className="text-xs opacity-60">· {group.district}</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {group.items.map(item => (
                          <span key={item._id} className="text-xs font-bold text-on-surface bg-surface-variant/20 px-2 py-0.5 rounded border border-outline-variant/10">
                            {item.quantity}kg <span className="uppercase opacity-70 text-[10px] ml-1">{item.grainType}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {statusBadge[group.sync_status] || statusBadge.PENDING}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
