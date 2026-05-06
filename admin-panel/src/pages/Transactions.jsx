import React, { useState, useEffect } from 'react';
import { List, Search, Loader2, Calendar, MapPin, CheckCircle, Clock, XCircle, RefreshCw, Filter, FileBarChart2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import { KA_DISTRICTS, getDistricts } from '../locations';

const BACKEND = 'http://localhost:5000';
const GRAINS = ['rice', 'wheat', 'dal', 'jowar'];
const GRAIN_LABEL = { rice: '🍚 Rice', wheat: '🌾 Wheat', dal: '🫘 Dal', jowar: '🌽 Jowar' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const Transactions = () => {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'monthly'

  /* ── Transactions state ── */
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterVillage, setFilterVillage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  /* ── Monthly reports state ── */
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  const [expandedReport, setExpandedReport] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterVillageR, setFilterVillageR] = useState('');

  const districts = getDistricts();
  const villagesInDistrict = filterDistrict ? (KA_DISTRICTS[filterDistrict] || []) : [];

  /* ── Fetch transactions ── */
  const fetchTransactions = async () => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${BACKEND}/api/admin/distributions`);
      setTransactions(res.data.data || []);
    } catch (err) {
      setError('Could not reach the backend. Is it running on port 5000?');
    } finally { setLoading(false); }
  };

  /* ── Fetch monthly reports ── */
  const fetchReports = async () => {
    setReportsLoading(true); setReportsError(null);
    try {
      const res = await axios.get(`${BACKEND}/api/admin/monthly-reports`);
      setReports(res.data.data || []);
    } catch (err) {
      setReportsError('Could not load monthly reports. Is the backend running?');
    } finally { setReportsLoading(false); }
  };

  useEffect(() => { fetchTransactions(); }, []);
  useEffect(() => { if (activeTab === 'monthly') fetchReports(); }, [activeTab]);

  /* ── Filter helpers ── */
  const handleDistrictChange = (d) => { setFilterDistrict(d); setFilterVillage(''); };

  const filtered = transactions.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      t.rationCardId?.toLowerCase().includes(q) ||
      t.transactionId?.toLowerCase().includes(q) ||
      t.member?.name?.toLowerCase().includes(q) ||
      t.village?.toLowerCase().includes(q) ||
      t.distributorUsername?.toLowerCase().includes(q);
    const matchDistrict = !filterDistrict || t.district?.toLowerCase() === filterDistrict.toLowerCase();
    const matchVillage = !filterVillage || t.village?.toLowerCase() === filterVillage.toLowerCase();
    const matchStatus = !filterStatus || t.sync_status === filterStatus;
    return matchSearch && matchDistrict && matchVillage && matchStatus;
  });

  const groupedFiltered = Object.values(filtered.reduce((acc, t) => {
    const id = t.transactionId || t._id;
    if (!acc[id]) acc[id] = { groupId: id, transactionId: id, rationCardId: t.rationCardId, member: t.member, village: t.village, district: t.district, createdAt: t.createdAt, sync_status: t.sync_status, distributorUsername: t.distributorUsername, items: [] };
    acc[id].items.push({ grainType: t.grainType, quantity: t.quantity, _id: t._id });
    return acc;
  }, {}));

  const filteredReports = reports.filter(r => {
    const matchMonth = !filterMonth || r.month === Number(filterMonth);
    const matchVillage = !filterVillageR || r.village?.toLowerCase().includes(filterVillageR.toLowerCase());
    return matchMonth && matchVillage;
  });

  const stats = {
    total: new Set(transactions.map(t => t.transactionId || t._id)).size,
    synced: transactions.filter(t => t.sync_status === 'SYNCED').length,
    pending: transactions.filter(t => t.sync_status === 'PENDING').length,
    conflicts: transactions.filter(t => t.sync_status === 'CONFLICT').length,
    totalKg: transactions.reduce((s, t) => s + (Number(t.quantity) || 0), 0),
  };

  const statusBadge = {
    SYNCED: <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" />SYNCED</span>,
    PENDING: <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" />PENDING</span>,
    CONFLICT: <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" />CONFLICT</span>,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3">
            <List className="w-8 h-8 text-primary" /> Distributed Ration Tracker
          </h1>
          <p className="text-on-surface-variant mt-1">All synced offline transactions and monthly reports from distributors across Karnataka.</p>
        </div>
        <button
          onClick={activeTab === 'transactions' ? fetchTransactions : fetchReports}
          disabled={loading || reportsLoading}
          className="flex items-center gap-2 bg-white border border-outline-variant/20 px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all text-on-surface font-medium text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${(loading || reportsLoading) ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-variant/30 p-1 rounded-2xl w-fit mb-6 border border-outline-variant/10">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'transactions' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <List className="w-4 h-4" /> Live Transactions
          <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{stats.total}</span>
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'monthly' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          <FileBarChart2 className="w-4 h-4" /> Monthly Reports
          {reports.length > 0 && <span className="bg-green-100 text-green-700 text-xs font-black px-2 py-0.5 rounded-full">{reports.length}</span>}
        </button>
      </div>

      {/* ══════════════ TAB 1: LIVE TRANSACTIONS ══════════════ */}
      {activeTab === 'transactions' && (
        <>
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
              <div><p className="font-bold">Backend Unreachable</p><p className="text-sm">{error}</p></div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10">
            <div className="p-5 border-b border-outline-variant/10 space-y-3">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ration card, beneficiary, village, or transaction ID..." className="flex-1 outline-none text-on-surface placeholder-on-surface-variant text-sm" />
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-on-surface-variant" />
                  <select value={filterDistrict} onChange={e => handleDistrictChange(e.target.value)} className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary">
                    <option value="">All Districts</option>
                    {districts.map(d => <option key={d}>{d}</option>)}
                  </select>
                  {filterDistrict && (
                    <select value={filterVillage} onChange={e => setFilterVillage(e.target.value)} className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary">
                      <option value="">All Villages</option>
                      {villagesInDistrict.map(v => <option key={v}>{v}</option>)}
                    </select>
                  )}
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-1.5 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary">
                    <option value="">All Statuses</option>
                    <option value="SYNCED">Synced</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFLICT">Conflict</option>
                  </select>
                  {(filterDistrict || filterVillage || filterStatus) && (
                    <button onClick={() => { setFilterDistrict(''); setFilterVillage(''); setFilterStatus(''); }} className="text-xs text-primary font-semibold hover:underline">Clear filters</button>
                  )}
                </div>
                <span className="ml-auto text-xs font-bold bg-surface-variant/50 px-3 py-1 rounded-full text-on-surface-variant self-center">{groupedFiltered.length} results</span>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : groupedFiltered.length === 0 ? (
              <div className="text-center py-16 text-on-surface-variant"><List className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No transactions found.</p></div>
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
                          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(group.createdAt).toLocaleDateString('en-IN')}</div>
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
                        <td className="px-5 py-3">{statusBadge[group.sync_status] || statusBadge.PENDING}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════ TAB 2: MONTHLY REPORTS ══════════════ */}
      {activeTab === 'monthly' && (
        <>
          {reportsError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-3 text-red-800 text-sm">
              <XCircle className="w-5 h-5 flex-shrink-0" />{reportsError}
            </div>
          )}

          {/* Report filters */}
          <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-card p-4 mb-5 flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-on-surface-variant" />
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary">
              <option value="">All Months</option>
              {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            <input value={filterVillageR} onChange={e => setFilterVillageR(e.target.value)} placeholder="Filter by village..." className="px-3 py-2 border border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary flex-1 min-w-[160px]" />
            {(filterMonth || filterVillageR) && (
              <button onClick={() => { setFilterMonth(''); setFilterVillageR(''); }} className="text-xs text-primary font-bold hover:underline">Clear</button>
            )}
            <span className="ml-auto text-xs font-bold bg-surface-variant/50 px-3 py-1 rounded-full text-on-surface-variant">{filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}</span>
          </div>

          {reportsLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant bg-white rounded-2xl border border-outline-variant/10 shadow-card">
              <FileBarChart2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="font-bold text-lg">No monthly reports yet</p>
              <p className="text-sm mt-1">Distributors can send reports from their app under <strong>Distribution → Monthly Report → Send to State Admin</strong></p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((r, idx) => {
                const isOpen = expandedReport === (r._id || idx);
                const totalRec = GRAINS.reduce((s, g) => s + (r.received?.[g] || 0), 0);
                const totalDist = GRAINS.reduce((s, g) => s + (r.distributed?.[g] || 0), 0);
                const totalRem = Math.max(0, totalRec - totalDist);
                return (
                  <div key={r._id || idx} className="bg-white rounded-2xl border border-outline-variant/10 shadow-card overflow-hidden">
                    {/* Report header — always visible */}
                    <button
                      className="w-full flex items-center justify-between p-5 hover:bg-surface-variant/10 transition-colors text-left"
                      onClick={() => setExpandedReport(isOpen ? null : (r._id || idx))}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileBarChart2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-base">{MONTHS[(r.month || 1) - 1]} {r.year}</p>
                          <p className="text-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            {r.village || 'Unknown village'} {r.district ? `· ${r.district}` : ''}
                            {r.distributorUsername && <span className="text-xs bg-surface-variant/50 px-2 py-0.5 rounded-full">{r.distributorUsername}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <p className="text-xl font-black text-blue-600">{totalRec.toFixed(1)}<span className="text-sm font-bold ml-1">kg</span></p>
                          <p className="text-xs text-on-surface-variant">Received</p>
                        </div>
                        <div>
                          <p className="text-xl font-black text-green-600">{totalDist.toFixed(1)}<span className="text-sm font-bold ml-1">kg</span></p>
                          <p className="text-xs text-on-surface-variant">Distributed</p>
                        </div>
                        <div>
                          <p className={`text-xl font-black ${totalRem > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{totalRem.toFixed(1)}<span className="text-sm font-bold ml-1">kg</span></p>
                          <p className="text-xs text-on-surface-variant">Remaining</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs font-bold text-on-surface-variant bg-surface-variant/50 px-2 py-1 rounded-full">{r.totalBeneficiaries || 0} families</span>
                          {isOpen ? <ChevronUp className="w-5 h-5 text-on-surface-variant" /> : <ChevronDown className="w-5 h-5 text-on-surface-variant" />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="border-t border-outline-variant/10 p-5 space-y-5 bg-surface-variant/5">
                        {/* Grain breakdown */}
                        <div>
                          <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Grain-wise Breakdown</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs font-bold text-on-surface-variant uppercase tracking-wide border-b border-outline-variant/10">
                                  <th className="text-left py-2 pb-3">Grain</th>
                                  <th className="text-right py-2 pb-3">Received (kg)</th>
                                  <th className="text-right py-2 pb-3">Distributed (kg)</th>
                                  <th className="text-right py-2 pb-3">Remaining (kg)</th>
                                  <th className="text-right py-2 pb-3">Utilization</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/10">
                                {GRAINS.map(g => {
                                  const rec = r.received?.[g] || 0;
                                  const dist = r.distributed?.[g] || 0;
                                  const rem = Math.max(0, rec - dist);
                                  const pct = rec > 0 ? Math.round((dist / rec) * 100) : 0;
                                  return (
                                    <tr key={g} className="hover:bg-surface-variant/10">
                                      <td className="py-2.5 font-semibold">{GRAIN_LABEL[g]}</td>
                                      <td className="py-2.5 text-right font-mono text-blue-700 font-semibold">{rec.toFixed(1)}</td>
                                      <td className="py-2.5 text-right font-mono text-green-700 font-semibold">{dist.toFixed(1)}</td>
                                      <td className="py-2.5 text-right font-mono text-amber-700 font-semibold">{rem.toFixed(1)}</td>
                                      <td className="py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <div className="w-20 bg-surface-variant rounded-full h-2 overflow-hidden">
                                            <div className="h-2 bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span className="text-xs font-bold w-8 text-right">{pct}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Beneficiary table */}
                        {r.beneficiaries && r.beneficiaries.length > 0 && (
                          <div>
                            <h3 className="text-sm font-bold text-on-surface mb-3">Beneficiary-wise Distribution ({r.beneficiaries.length} families)</h3>
                            <div className="overflow-x-auto rounded-xl border border-outline-variant/10">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-surface-variant/30 text-xs font-bold text-on-surface-variant uppercase tracking-wide">
                                    <th className="text-left px-4 py-2.5">Ration Card</th>
                                    <th className="text-left px-3 py-2.5">Head of Family</th>
                                    {GRAINS.map(g => <th key={g} className="text-right px-3 py-2.5">{GRAIN_LABEL[g].split(' ')[1]}</th>)}
                                    <th className="text-right px-4 py-2.5">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/10">
                                  {r.beneficiaries.map((b, bi) => {
                                    const total = GRAINS.reduce((s, g) => s + (b.grains?.[g] || 0), 0);
                                    return (
                                      <tr key={bi} className="hover:bg-surface-variant/10">
                                        <td className="px-4 py-2.5 font-mono text-xs font-bold text-primary">{b.rationCardId}</td>
                                        <td className="px-3 py-2.5 font-semibold">{b.headName}</td>
                                        {GRAINS.map(g => <td key={g} className="px-3 py-2.5 text-right font-mono text-xs text-on-surface-variant">{(b.grains?.[g] || 0).toFixed(1)}</td>)}
                                        <td className="px-4 py-2.5 text-right font-black text-primary">{total.toFixed(1)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-on-surface-variant">
                          Received by admin: {new Date(r.receivedAt).toLocaleString('en-IN')} ·
                          Generated: {new Date(r.generatedAt).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Transactions;
