import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileBarChart2, Send, CheckCircle, Loader2, Package, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { distributionsDb, shipmentsDb } from '../db';
import axios from 'axios';

const BACKEND = 'http://localhost:5000';

const MonthlyReport = () => {
  let user = {};
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch {}
  const village = user.assignedVillage || '';
  const district = user.district || '';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const GRAINS = ['rice','wheat','dal','jowar'];

  const generateReport = useCallback(async () => {
    setLoading(true); setError(null); setSent(false); setReport(null);
    try {
      const [distResult, shipResult] = await Promise.all([
        distributionsDb.allDocs({ include_docs: true }),
        shipmentsDb.allDocs({ include_docs: true }),
      ]);

      const dists = distResult.rows
        .filter(r => !r.id.startsWith('_design'))
        .map(r => r.doc)
        .filter(d => {
          const dm = new Date(d.createdAt);
          return dm.getMonth() + 1 === month && dm.getFullYear() === year;
        });

      const ships = shipResult.rows
        .filter(r => !r.id.startsWith('_design'))
        .map(r => r.doc)
        .filter(s => {
          if (village && s.toVillage?.toLowerCase() !== village.toLowerCase()) return false;
          const dm = new Date(s.createdAt || s.deliveryDate || 0);
          return dm.getMonth() + 1 === month && dm.getFullYear() === year;
        });

      // Total received per grain
      const received = {};
      GRAINS.forEach(g => { received[g] = 0; });
      ships.forEach(s => {
        const g = s.grainType?.toLowerCase();
        if (g && received[g] !== undefined) received[g] += Number(s.quantity) || 0;
      });

      // Total distributed per grain
      const distributed = {};
      GRAINS.forEach(g => { distributed[g] = 0; });
      dists.forEach(d => {
        const g = d.grainType?.toLowerCase();
        if (g && distributed[g] !== undefined) distributed[g] += Number(d.quantity) || 0;
      });

      // Per-beneficiary breakdown
      const beneficiaryMap = {};
      dists.forEach(d => {
        const key = d.rationCardId;
        if (!beneficiaryMap[key]) {
          beneficiaryMap[key] = { rationCardId: key, headName: d.headName, member: d.member?.name || '', grains: {} };
          GRAINS.forEach(g => { beneficiaryMap[key].grains[g] = 0; });
        }
        const g = d.grainType?.toLowerCase();
        if (g) beneficiaryMap[key].grains[g] += Number(d.quantity) || 0;
      });

      // Remaining stock
      const remaining = {};
      GRAINS.forEach(g => { remaining[g] = Math.max(0, (received[g] || 0) - (distributed[g] || 0)); });

      setReport({
        month, year, village, district,
        distributorUsername: user.username || '',
        received, distributed, remaining,
        beneficiaries: Object.values(beneficiaryMap),
        totalBeneficiaries: Object.keys(beneficiaryMap).length,
        totalDistributed: Object.values(distributed).reduce((s, v) => s + v, 0),
        totalReceived: Object.values(received).reduce((s, v) => s + v, 0),
        generatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError('Failed to generate report: ' + e.message);
    } finally { setLoading(false); }
  }, [month, year, village]);

  useEffect(() => { generateReport(); }, [generateReport]);

  const sendToAdmin = async () => {
    if (!report) return;
    setSending(true); setError(null);
    try {
      await axios.post(`${BACKEND}/api/admin/monthly-report`, report);
      setSent(true);
    } catch (e) {
      setError('Failed to send: ' + (e.response?.data?.message || e.message));
    } finally { setSending(false); }
  };

  const grainLabel = { rice: '🍚 Rice', wheat: '🌾 Wheat', dal: '🫘 Dal', jowar: '🌽 Jowar' };
  const grainColor = { rice: 'blue', wheat: 'amber', dal: 'orange', jowar: 'yellow' };

  return (
    <div className="min-h-screen bg-surface-variant/30">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/distribution" className="text-on-surface-variant hover:text-on-surface"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2"><FileBarChart2 className="w-6 h-6 text-primary" /> Monthly Distribution Report</h1>
            <p className="text-sm text-on-surface-variant mt-0.5">{village ? `${village} · ${district}` : 'All villages'} · {user.username}</p>
          </div>
        </div>

        {/* Month/Year selector */}
        <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 p-5 mb-5 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-4 py-2.5 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-semibold">
              {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1 uppercase tracking-wide">Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-4 py-2.5 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-semibold">
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={generateReport} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-surface-variant/50 hover:bg-surface-variant border border-outline-variant/20 rounded-xl font-bold text-sm transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {report && !sent && (
            <button onClick={sendToAdmin} disabled={sending} className="ml-auto flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow hover:-translate-y-0.5">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending...' : 'Send to State Admin'}
            </button>
          )}
          {sent && (
            <div className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-green-100 text-green-700 font-bold rounded-xl border border-green-200">
              <CheckCircle className="w-4 h-4" /> Sent to State Admin!
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3 text-red-700 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />{error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
        )}

        {report && !loading && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-card p-5 text-center">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Beneficiaries</p>
                <p className="text-3xl font-black text-primary">{report.totalBeneficiaries}</p>
                <p className="text-xs text-on-surface-variant mt-1">Families served</p>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-card p-5 text-center">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Total Received</p>
                <p className="text-3xl font-black text-blue-600">{report.totalReceived.toFixed(1)}<span className="text-base font-bold ml-1">kg</span></p>
                <p className="text-xs text-on-surface-variant mt-1">From shipments</p>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-card p-5 text-center">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Total Distributed</p>
                <p className="text-3xl font-black text-green-600">{report.totalDistributed.toFixed(1)}<span className="text-base font-bold ml-1">kg</span></p>
                <p className="text-xs text-on-surface-variant mt-1">To beneficiaries</p>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-card p-5 text-center">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">Remaining Stock</p>
                <p className={`text-3xl font-black ${(report.totalReceived - report.totalDistributed) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {Math.max(0, report.totalReceived - report.totalDistributed).toFixed(1)}<span className="text-base font-bold ml-1">kg</span>
                </p>
                <p className="text-xs text-on-surface-variant mt-1">Surplus/balance</p>
              </div>
            </div>

            {/* Grain breakdown */}
            <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-card p-6 mb-5">
              <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Grain-wise Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-on-surface-variant uppercase tracking-wide border-b border-outline-variant/10">
                      <th className="text-left py-2 pb-3">Grain</th>
                      <th className="text-right py-2 pb-3">Received (kg)</th>
                      <th className="text-right py-2 pb-3">Distributed (kg)</th>
                      <th className="text-right py-2 pb-3">Remaining (kg)</th>
                      <th className="text-right py-2 pb-3">Utilization %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {GRAINS.map(g => {
                      const rec = report.received[g] || 0;
                      const dist = report.distributed[g] || 0;
                      const rem = Math.max(0, rec - dist);
                      const pct = rec > 0 ? Math.round((dist / rec) * 100) : 0;
                      return (
                        <tr key={g} className="hover:bg-surface-variant/10 transition-colors">
                          <td className="py-3 font-semibold text-on-surface">{grainLabel[g]}</td>
                          <td className="py-3 text-right font-mono text-blue-700 font-semibold">{rec.toFixed(1)}</td>
                          <td className="py-3 text-right font-mono text-green-700 font-semibold">{dist.toFixed(1)}</td>
                          <td className="py-3 text-right font-mono text-amber-700 font-semibold">{rem.toFixed(1)}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-24 bg-surface-variant rounded-full h-2 overflow-hidden">
                                <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="font-bold text-xs w-10 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Per-beneficiary table */}
            <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-card overflow-hidden">
              <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center">
                <h2 className="text-lg font-bold text-on-surface">Beneficiary-wise Distribution</h2>
                <span className="text-xs font-bold bg-surface-variant/50 px-3 py-1 rounded-full text-on-surface-variant">{report.beneficiaries.length} families</span>
              </div>
              {report.beneficiaries.length === 0 ? (
                <div className="py-16 text-center text-on-surface-variant">
                  <FileBarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No distributions found for {MONTHS[month-1]} {year}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold text-on-surface-variant uppercase tracking-wide bg-surface-variant/20">
                        <th className="text-left px-5 py-3">Ration Card</th>
                        <th className="text-left px-3 py-3">Head / Member</th>
                        {GRAINS.map(g => <th key={g} className="text-right px-3 py-3">{grainLabel[g].split(' ')[1]}</th>)}
                        <th className="text-right px-5 py-3">Total (kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {report.beneficiaries.map((b, i) => {
                        const total = GRAINS.reduce((s, g) => s + (b.grains[g] || 0), 0);
                        return (
                          <tr key={i} className="hover:bg-surface-variant/10 transition-colors">
                            <td className="px-5 py-3 font-mono font-bold text-on-surface text-xs">{b.rationCardId}</td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-on-surface">{b.headName}</p>
                              {b.member && <p className="text-xs text-on-surface-variant">{b.member}</p>}
                            </td>
                            {GRAINS.map(g => (
                              <td key={g} className="px-3 py-3 text-right font-mono text-on-surface-variant">
                                {(b.grains[g] || 0).toFixed(1)}
                              </td>
                            ))}
                            <td className="px-5 py-3 text-right font-black text-primary">{total.toFixed(1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p className="text-xs text-on-surface-variant text-center mt-4">Report generated: {new Date(report.generatedAt).toLocaleString('en-IN')}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyReport;
