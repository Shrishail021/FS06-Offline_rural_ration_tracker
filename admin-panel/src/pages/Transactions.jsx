import React, { useState, useEffect } from 'react';
import { List, Search, Loader2, Calendar } from 'lucide-react';
import axios from 'axios';

const BACKEND = 'http://localhost:5000';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND}/api/admin/conflicts`); // Actually we should fetch all distributions. Wait, does a route exist for all distributions?
      // I will implement a new route /api/admin/distributions on the backend.
      const res2 = await axios.get(`${BACKEND}/api/admin/distributions`);
      setTransactions(res2.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const filtered = transactions.filter(t => 
    t.rationCardId?.toLowerCase().includes(search.toLowerCase()) ||
    t.deviceId?.toLowerCase().includes(search.toLowerCase()) ||
    t.transactionId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3">
            <List className="w-8 h-8 text-primary" /> Distributed Ration Tracker
          </h1>
          <p className="text-on-surface-variant mt-1">View all synced offline transactions from distributors.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10">
        <div className="p-5 border-b border-outline-variant/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-on-surface-variant" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Ration Card, Device ID, or Transaction ID..." className="flex-1 outline-none text-on-surface placeholder-on-surface-variant" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <List className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No transactions found on the server.</p>
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
                  <th className="px-5 py-3 text-right">Grain</th>
                  <th className="px-5 py-3 text-right">Qty (kg)</th>
                  <th className="px-5 py-3 text-left">Device ID</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map(t => (
                  <tr key={t._id} className="hover:bg-surface-variant/10">
                    <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(t.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{t.transactionId}</td>
                    <td className="px-5 py-3 font-bold text-primary">{t.rationCardId}</td>
                    <td className="px-5 py-3 font-semibold">{t.member?.name || 'Unknown'}</td>
                    <td className="px-5 py-3 text-right">{t.grainType}</td>
                    <td className="px-5 py-3 text-right font-bold">{t.quantity}</td>
                    <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{t.deviceId?.slice(0, 8)}...</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${t.sync_status === 'CONFLICT' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{t.sync_status === 'CONFLICT' ? 'CONFLICT' : 'SYNCED'}</span>
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
