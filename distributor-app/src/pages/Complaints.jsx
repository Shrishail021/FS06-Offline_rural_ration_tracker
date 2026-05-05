import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Upload, Loader2, Send, ArrowLeft, Camera } from 'lucide-react';
import { complaintsDb, syncComplaint, searchRationCards } from '../db';
import OfflineBanner from '../components/OfflineBanner';

const COMPLAINT_TYPES = [
  { id: 'DEAD_PERSON', label: '🪦 Deceased Person Still Listed', color: 'bg-red-50 border-red-300 text-red-800' },
  { id: 'WRONG_GRAIN_QUALITY', label: '⚠️ Wrong Grain Quality', color: 'bg-orange-50 border-orange-300 text-orange-800' },
  { id: 'WEIGHT_MISMATCH', label: '⚖️ Weight Mismatch', color: 'bg-amber-50 border-amber-300 text-amber-800' },
  { id: 'FRAUD', label: '🚫 Fraud / Impersonation', color: 'bg-purple-50 border-purple-300 text-purple-800' },
  { id: 'DUPLICATE', label: '🔁 Duplicate Distribution Attempt', color: 'bg-blue-50 border-blue-300 text-blue-800' },
  { id: 'OTHER', label: '📝 Other Issue', color: 'bg-surface-variant border-outline-variant text-on-surface' },
];

const Complaints = () => {
  const [complaintType, setComplaintType] = useState(null);
  const [form, setForm] = useState({
    rationCardId: '',
    // DEAD_PERSON fields
    deceasedName: '', deceasedAge: '', deceasedAadhaar: '', dateOfDeath: '', relationship: '',
    // WRONG_GRAIN_QUALITY fields
    batchNumber: '', grainType: '', qualityIssue: '',
    // WEIGHT_MISMATCH fields
    shipmentId: '', expectedWeight: '', actualWeight: '', grainTypeWeight: '',
    // FRAUD fields
    suspectName: '', fraudDetails: '',
    // DUPLICATE fields
    duplicateTransactionId: '',
    // COMMON
    description: '', photoBase64: '',
  });
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const fileRef = useRef();

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    loadComplaints();
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const result = await complaintsDb.allDocs({ include_docs: true, descending: true });
      setComplaints(result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, photoBase64: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!complaintType || !form.rationCardId) return;
    setSubmitting(true);
    try {
      const doc = {
        _id: `complaint_${Date.now()}`,
        type: complaintType, ...form,
        status: 'OPEN',
        sync_status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      await complaintsDb.put(doc);

      if (isOnline) {
        const synced = await syncComplaint(doc);
        if (synced) { doc.sync_status = 'SYNCED'; await complaintsDb.put(doc); }
      }

      setMsg({ type: 'success', text: 'Complaint submitted! It will be synced to the server when online.' });
      setComplaintType(null);
      setForm({ rationCardId: '', deceasedName: '', deceasedAge: '', deceasedAadhaar: '', dateOfDeath: '', relationship: '', batchNumber: '', grainType: '', qualityIssue: '', shipmentId: '', expectedWeight: '', actualWeight: '', grainTypeWeight: '', suspectName: '', fraudDetails: '', duplicateTransactionId: '', description: '', photoBase64: '' });
      loadComplaints();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to save complaint.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const selectedType = COMPLAINT_TYPES.find(t => t.id === complaintType);

  return (
    <div className="min-h-screen bg-surface-variant/30">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-on-surface-variant hover:text-on-surface"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-error" /> Complaints
            </h1>
          </div>
        </div>

        {msg && (
          <div className={`p-4 mb-5 rounded-xl flex items-start gap-3 border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {msg.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <p className="text-sm">{msg.text}</p>
          </div>
        )}

        {/* ─── STEP 1: Type Selection ─── */}
        {!complaintType ? (
          <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 p-6">
            <h2 className="text-lg font-bold text-on-surface mb-1">New Complaint</h2>
            <p className="text-sm text-on-surface-variant mb-5">Select the type of issue to raise:</p>
            <div className="grid grid-cols-1 gap-3">
              {COMPLAINT_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setComplaintType(type.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 font-semibold transition-all hover:scale-[1.01] ${type.color}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // ─── STEP 2: Dynamic Form ───
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 p-6">
              {/* Back + Type header */}
              <div className="flex items-center justify-between mb-5">
                <button type="button" onClick={() => setComplaintType(null)} className="text-sm text-primary font-bold hover:underline flex items-center gap-1">
                  ← Change Type
                </button>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${selectedType?.color}`}>{selectedType?.label}</span>
              </div>

              {/* Common: Ration Card */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-on-surface mb-1">Ration Card Number *</label>
                <input required value={form.rationCardId} onChange={e => setForm(f => ({ ...f, rationCardId: e.target.value }))} placeholder="e.g. RC-001" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-mono" />
              </div>

              {/* ─── DEAD_PERSON Form ─── */}
              {complaintType === 'DEAD_PERSON' && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
                    <span>🪦</span> Provide details of the deceased person. This will prevent further ration distributions for them.
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-1">Name of Deceased *</label>
                      <input required value={form.deceasedName} onChange={e => setForm(f => ({ ...f, deceasedName: e.target.value }))} placeholder="Full name" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-1">Age</label>
                      <input type="number" value={form.deceasedAge} onChange={e => setForm(f => ({ ...f, deceasedAge: e.target.value }))} placeholder="e.g. 65" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-1">Aadhaar (Last 4 digits)</label>
                      <input maxLength={4} value={form.deceasedAadhaar} onChange={e => setForm(f => ({ ...f, deceasedAadhaar: e.target.value }))} placeholder="XXXX" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-1">Date of Death</label>
                      <input type="date" value={form.dateOfDeath} onChange={e => setForm(f => ({ ...f, dateOfDeath: e.target.value }))} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-1">Relationship to Card Holder</label>
                    <select value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm">
                      <option value="">Select...</option>
                      <option>Self (Head of Family)</option><option>Spouse</option><option>Child</option><option>Parent</option><option>Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ─── WRONG_GRAIN_QUALITY Form ─── */}
              {complaintType === 'WRONG_GRAIN_QUALITY' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
                    ⚠️ Describe the quality issue and upload a photo as evidence if possible.
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-1">Grain Type *</label>
                      <select required value={form.grainType} onChange={e => setForm(f => ({ ...f, grainType: e.target.value }))} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm">
                        <option value="">Select...</option>
                        <option>Wheat</option><option>Rice</option><option>Dal</option><option>Jowar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-1">Batch / Lot Number</label>
                      <input value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} placeholder="e.g. LOT-2026-045" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-1">Quality Issue *</label>
                    <select required value={form.qualityIssue} onChange={e => setForm(f => ({ ...f, qualityIssue: e.target.value }))} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm">
                      <option value="">Select type...</option>
                      <option>Mouldy / Rotten</option><option>Mixed with stones/debris</option><option>Wrong grain delivered</option><option>Foul odour</option><option>Insect infestation</option><option>Damaged packaging</option>
                    </select>
                  </div>
                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-2">📷 Photo Evidence</label>
                    <div className="border-2 border-dashed border-outline-variant rounded-xl p-4 text-center cursor-pointer hover:bg-surface-variant/20 transition-colors" onClick={() => fileRef.current.click()}>
                      {form.photoBase64 ? (
                        <div>
                          <img src={form.photoBase64} alt="Evidence" className="max-h-40 mx-auto rounded-lg mb-2 object-cover" />
                          <p className="text-xs text-primary font-semibold">Tap to change photo</p>
                        </div>
                      ) : (
                        <div className="py-4">
                          <Camera className="w-8 h-8 text-on-surface-variant mx-auto mb-2" />
                          <p className="text-sm text-on-surface-variant font-medium">Tap to capture or upload photo</p>
                          <p className="text-xs text-on-surface-variant mt-1">JPG, PNG — works offline</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
                  </div>
                </div>
              )}

              {/* ─── WEIGHT_MISMATCH Form ─── */}
              {complaintType === 'WEIGHT_MISMATCH' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    ⚖️ Compare the shipment order details with what was actually received. Discrepancies will be reviewed by the State Admin.
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-1">Shipment ID (from delivery note)</label>
                    <input value={form.shipmentId} onChange={e => setForm(f => ({ ...f, shipmentId: e.target.value }))} placeholder="e.g. ship_1746456789123" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-1">Grain Type *</label>
                    <select required value={form.grainTypeWeight} onChange={e => setForm(f => ({ ...f, grainTypeWeight: e.target.value }))} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm">
                      <option value="">Select...</option>
                      <option>Wheat</option><option>Rice</option><option>Dal</option><option>Jowar</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-1">Expected Weight (kg) *</label>
                      <input required type="number" value={form.expectedWeight} onChange={e => setForm(f => ({ ...f, expectedWeight: e.target.value }))} placeholder="As per order" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-on-surface mb-1">Actual Received (kg) *</label>
                      <input required type="number" value={form.actualWeight} onChange={e => setForm(f => ({ ...f, actualWeight: e.target.value }))} placeholder="Weighed on arrival" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
                    </div>
                  </div>
                  {form.expectedWeight && form.actualWeight && (
                    <div className={`p-4 rounded-xl border ${Number(form.actualWeight) < Number(form.expectedWeight) ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <p className="text-sm font-bold text-on-surface">Difference: <span className={Number(form.actualWeight) < Number(form.expectedWeight) ? 'text-red-600' : 'text-green-600'}>
                        {(Number(form.actualWeight) - Number(form.expectedWeight)).toFixed(1)} kg ({Number(form.actualWeight) < Number(form.expectedWeight) ? 'Shortfall' : 'Surplus'})
                      </span></p>
                    </div>
                  )}
                  {/* Photo Evidence */}
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-2">📷 Photo of Weighing Scale (optional)</label>
                    <div className="border-2 border-dashed border-outline-variant rounded-xl p-4 text-center cursor-pointer hover:bg-surface-variant/20" onClick={() => fileRef.current.click()}>
                      {form.photoBase64 ? (
                        <img src={form.photoBase64} alt="Scale" className="max-h-32 mx-auto rounded-lg" />
                      ) : (
                        <div className="py-2"><Camera className="w-6 h-6 text-on-surface-variant mx-auto mb-1" /><p className="text-xs text-on-surface-variant">Upload weighing scale photo</p></div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
                  </div>
                </div>
              )}

              {/* ─── FRAUD Form ─── */}
              {complaintType === 'FRAUD' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-700">
                    🚫 Report suspected fraud or impersonation. This is a serious complaint and will be reviewed urgently.
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-1">Name of Suspect (if known)</label>
                    <input value={form.suspectName} onChange={e => setForm(f => ({ ...f, suspectName: e.target.value }))} placeholder="Person's name" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-1">Describe the Fraud *</label>
                    <textarea required rows={3} value={form.fraudDetails} onChange={e => setForm(f => ({ ...f, fraudDetails: e.target.value }))} placeholder="What happened? How was fraud detected?" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm resize-none" />
                  </div>
                </div>
              )}

              {/* ─── DUPLICATE Form ─── */}
              {complaintType === 'DUPLICATE' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                    🔁 Report a duplicate distribution attempt. Provide the original transaction ID if available.
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-1">Original Transaction ID</label>
                    <input value={form.duplicateTransactionId} onChange={e => setForm(f => ({ ...f, duplicateTransactionId: e.target.value }))} placeholder="e.g. DEV-ABC_1746000000_RC-001" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-mono" />
                  </div>
                </div>
              )}

              {/* Common: Description */}
              <div className="mt-4">
                <label className="block text-sm font-bold text-on-surface mb-1">Additional Details {complaintType === 'OTHER' ? '*' : '(optional)'}</label>
                <textarea
                  required={complaintType === 'OTHER'}
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Any other relevant information..."
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm resize-none"
                />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm">
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <><Send className="w-5 h-5" /> Submit {isOnline ? 'Online' : '(Offline — will sync later)'}</>}
            </button>
          </form>
        )}

        {/* ─── Complaint History ─── */}
        <div className="mt-8 bg-white rounded-2xl shadow-card border border-outline-variant/10">
          <div className="p-5 border-b border-outline-variant/10">
            <h2 className="font-bold text-on-surface">My Complaint History</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">All complaints stored on this device.</p>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
          ) : complaints.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p className="text-sm">No complaints found.</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {complaints.map(c => {
                const typeInfo = COMPLAINT_TYPES.find(t => t.id === c.type);
                return (
                  <div key={c._id} className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${typeInfo?.color || 'bg-surface-variant'}`}>{typeInfo?.label || c.type}</span>
                          {c.rationCardId && <span className="text-xs font-mono bg-surface-variant/50 px-2 py-0.5 rounded">{c.rationCardId}</span>}
                        </div>
                        {c.deceasedName && <p className="text-sm text-on-surface mt-1">Deceased: <strong>{c.deceasedName}</strong></p>}
                        {c.qualityIssue && <p className="text-sm text-on-surface mt-1">Issue: <strong>{c.qualityIssue}</strong> ({c.grainType})</p>}
                        {c.expectedWeight && <p className="text-sm text-on-surface mt-1">Expected {c.expectedWeight}kg, received {c.actualWeight}kg</p>}
                        {c.description && <p className="text-xs text-on-surface-variant mt-1">{c.description}</p>}
                        <p className="text-xs text-on-surface-variant mt-1.5">{new Date(c.createdAt).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.status === 'OPEN' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{c.status}</span>
                        <span className={`text-xs font-semibold ${c.sync_status === 'SYNCED' ? 'text-green-600' : 'text-amber-500'}`}>
                          {c.sync_status === 'SYNCED' ? '☁ Synced' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Complaints;
