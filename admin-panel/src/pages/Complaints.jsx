import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import axios from 'axios';

const BACKEND = 'http://localhost:5000';

const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState('ALL');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND}/api/complaints`);
      setComplaints(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const resolveComplaint = async (id, replacementQuantity, replacementVillage, grainType) => {
    try {
      const payload = { resolutionNotes: notes };
      if (replacementQuantity && replacementVillage && grainType) {
        payload.createReplacementShipment = true;
        payload.replacementQuantity = replacementQuantity;
        payload.replacementVillage = replacementVillage;
        payload.grainType = grainType;
      }
      await axios.put(`${BACKEND}/api/complaints/${id}/resolve`, payload);
      setSelectedId(null);
      setNotes('');
      fetchComplaints();
    } catch (err) { console.error(err); }
  };

  const filtered = filter === 'ALL' ? complaints : complaints.filter(c => c.status === filter);
  const openCount = complaints.filter(c => c.status === 'OPEN').length;

  const typeColors = {
    Weight_Mismatch: 'bg-orange-100 text-orange-700',
    Wrong_Grain_Quality: 'bg-yellow-100 text-yellow-700',
    Card_Fraud_Suspicion: 'bg-red-100 text-red-700',
    DEAD_PERSON: 'bg-red-100 text-red-700',
    FRAUD: 'bg-red-100 text-red-700',
    DUPLICATE: 'bg-purple-100 text-purple-700',
    Other: 'bg-surface-variant text-on-surface-variant',
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-error" /> Complaints
          </h1>
          <p className="text-on-surface-variant mt-1">{openCount} open complaint{openCount !== 1 ? 's' : ''} require{openCount === 1 ? 's' : ''} attention.</p>
        </div>
        <div className="flex gap-2">
          {['ALL', 'OPEN', 'RESOLVED'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === f ? 'bg-primary text-white' : 'bg-white border border-outline-variant/20 text-on-surface-variant hover:bg-surface-variant/30'}`}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 py-20 text-center text-on-surface-variant">
          <CheckCircle className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No {filter !== 'ALL' ? filter.toLowerCase() : ''} complaints found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(c => (
            <div key={c._id} className="bg-white rounded-2xl shadow-card border border-outline-variant/10 p-5">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeColors[c.type] || 'bg-surface-variant text-on-surface-variant'}`}>{c.type}</span>
                    {c.rationCardId && <span className="text-xs font-mono bg-surface-variant/50 px-2 py-0.5 rounded">Card: {c.rationCardId}</span>}
                    {c.cardNumber && <span className="text-xs font-mono bg-surface-variant/50 px-2 py-0.5 rounded">Card: {c.cardNumber}</span>}
                  </div>
                  <p className="text-on-surface font-medium mt-2">{c.message || c.description}</p>
                  <p className="text-xs text-on-surface-variant mt-2">By: {c.raisedBy || c.deviceId || 'distributor'} · {new Date(c.createdAt).toLocaleString('en-IN')}</p>
                  {c.resolutionNotes && (
                    <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100">
                      <p className="text-xs text-green-700 font-semibold">Resolution Note:</p>
                      <p className="text-xs text-green-700 mt-0.5">{c.resolutionNotes}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.status === 'OPEN' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{c.status}</span>
                  {c.status === 'OPEN' && (
                    <button onClick={() => setSelectedId(selectedId === c._id ? null : c._id)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Resolve
                    </button>
                  )}
                </div>
              </div>

                {selectedId === c._id && (
                  <div className="mt-4 pt-4 border-t border-outline-variant/10">
                    {/* Render extra complaint details */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {c.photoBase64 && (
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-xs font-bold text-on-surface-variant mb-1">Attached Photo:</p>
                          <img src={c.photoBase64} alt="Evidence" className="max-h-48 rounded-lg border border-outline-variant/20" />
                        </div>
                      )}
                      <div className="col-span-2 md:col-span-1 text-sm space-y-1">
                        {c.deceasedName && <p><span className="font-semibold text-on-surface-variant">Deceased:</span> {c.deceasedName} (Age {c.deceasedAge || '?'})</p>}
                        {c.deceasedAadhaar && <p><span className="font-semibold text-on-surface-variant">Aadhaar (Last 4):</span> {c.deceasedAadhaar}</p>}
                        {c.dateOfDeath && <p><span className="font-semibold text-on-surface-variant">Date of Death:</span> {c.dateOfDeath}</p>}
                        {c.relationship && <p><span className="font-semibold text-on-surface-variant">Relation:</span> {c.relationship}</p>}
                        
                        {c.batchNumber && <p><span className="font-semibold text-on-surface-variant">Batch No:</span> <span className="font-mono">{c.batchNumber}</span></p>}
                        {c.qualityIssue && <p><span className="font-semibold text-on-surface-variant">Quality Issue:</span> {c.qualityIssue}</p>}
                        {c.grainType && <p><span className="font-semibold text-on-surface-variant">Grain Type:</span> {c.grainType}</p>}
                        
                        {c.shipmentId && <p><span className="font-semibold text-on-surface-variant">Shipment ID:</span> <span className="font-mono">{c.shipmentId}</span></p>}
                        {c.expectedWeight && <p><span className="font-semibold text-on-surface-variant">Expected vs Actual:</span> {c.expectedWeight}kg vs {c.actualWeight}kg</p>}
                        
                        {c.suspectName && <p><span className="font-semibold text-on-surface-variant">Suspect Name:</span> {c.suspectName}</p>}
                        {c.fraudDetails && <p><span className="font-semibold text-on-surface-variant">Fraud Details:</span> {c.fraudDetails}</p>}
                        
                        {c.duplicateTransactionId && <p><span className="font-semibold text-on-surface-variant">Original Tx:</span> <span className="font-mono">{c.duplicateTransactionId}</span></p>}
                      </div>
                    </div>

                    {c.type === 'WRONG_GRAIN_QUALITY' && (
                      <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-4">
                        <p className="text-sm font-bold text-orange-800 mb-2">Send Replacement Shipment & Recall Bad Grain</p>
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <label className="text-xs font-semibold text-orange-700">Replacement Quantity (kg)</label>
                            <input id={`qty-${c._id}`} type="number" placeholder="e.g. 50" className="w-full px-3 py-2 border border-orange-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-semibold text-orange-700">Village</label>
                            <input id={`vil-${c._id}`} type="text" placeholder="e.g. Hubli Central" className="w-full px-3 py-2 border border-orange-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
                          </div>
                        </div>
                      </div>
                    )}

                    <textarea
                      rows={2}
                      placeholder="Add resolution notes..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm resize-none"
                    />
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => {
                        let qty = 0, vil = '';
                        if (c.type === 'WRONG_GRAIN_QUALITY') {
                          qty = document.getElementById(`qty-${c._id}`)?.value;
                          vil = document.getElementById(`vil-${c._id}`)?.value;
                        }
                        resolveComplaint(c._id, qty, vil, c.grainType);
                      }} className="bg-green-600 text-white font-bold py-2 px-5 rounded-xl text-sm hover:bg-green-700 transition-colors">
                        Mark Resolved
                      </button>
                      <button onClick={() => setSelectedId(null)} className="bg-surface-variant text-on-surface font-bold py-2 px-4 rounded-xl text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Complaints;
