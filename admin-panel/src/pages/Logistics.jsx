import React, { useState, useEffect } from 'react';
import { Truck, Plus, CheckCircle, Clock, Package, Loader2, BarChart2 } from 'lucide-react';
import axios from 'axios';

const BACKEND = 'http://localhost:5000';
const STATUSES = ['PENDING', 'IN_TRANSIT', 'DELIVERED'];
const KARNATAKA_FLAT = [
  'Hubli Central', 'Gokul', 'Vidyanagar', 'Keshwapur', 'Unkal',
  'Dharwad City', 'Amargol', 'Sattur', 'Hosur',
  'Belagavi North', 'Belagavi South', 'Kakati', 'Hukeri',
  'Gokak', 'Mudalagi', 'Gadag City', 'Betgeri', 'Lakshmeshwar',
  'Mysuru City', 'Hubli', 'Hospet', 'Hampi', 'Ballari City',
];
const DISTRICTS = ['Dharwad', 'Belagavi', 'Gadag', 'Mysuru', 'Ballari'];

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
};
const statusIcon = {
  PENDING: <Clock className="w-4 h-4" />,
  IN_TRANSIT: <Truck className="w-4 h-4" />,
  DELIVERED: <CheckCircle className="w-4 h-4" />,
};

const Logistics = () => {
  const [shipments, setShipments] = useState([]);
  const [grains, setGrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [form, setForm] = useState({ grainType: 'wheat', grainName: 'Wheat', quantity: '', fromLocation: 'State Depot, Belagavi', toVillage: KARNATAKA_FLAT[0], toDistrict: DISTRICTS[0], deliveryDate: '', notes: '' });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const [shipRes, grainRes] = await Promise.all([
        axios.get(`${BACKEND}/api/logistics/shipments`),
        axios.get(`${BACKEND}/api/admin/grains`)
      ]);
      setShipments(shipRes.data.data);
      setGrains(grainRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchShipments(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${BACKEND}/api/logistics/shipments`, form);
      setMsg({ type: 'success', text: `Shipment of ${form.quantity}kg ${form.grainName || form.grainType} created for ${form.toVillage}` });
      setShowForm(false);
      setForm({ grainType: 'wheat', grainName: 'Wheat', quantity: '', fromLocation: 'State Depot, Belagavi', toVillage: KARNATAKA_FLAT[0], toDistrict: DISTRICTS[0], deliveryDate: '', notes: '' });
      fetchShipments();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create shipment' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await axios.put(`${BACKEND}/api/logistics/shipments/${id}`, { status: newStatus });
      fetchShipments();
    } catch (err) { console.error(err); }
    finally { setUpdatingId(null); }
  };

  const filtered = filter === 'ALL' ? shipments : shipments.filter(s => s.status === filter);
  const totalPending = shipments.filter(s => s.status === 'PENDING').length;
  const totalInTransit = shipments.filter(s => s.status === 'IN_TRANSIT').length;
  const totalDelivered = shipments.filter(s => s.status === 'DELIVERED').length;
  const totalKg = shipments.filter(s => s.status === 'DELIVERED').reduce((sum, s) => sum + (s.quantity || 0), 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" /> Logistics Dashboard
          </h1>
          <p className="text-on-surface-variant mt-1">Track grain shipments from state depot to villages.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md">
          <Plus className="w-4 h-4 mr-2" /> New Shipment
        </button>
      </div>

      {msg && (
        <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : '⚠'} {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending', value: totalPending, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
          { label: 'In Transit', value: totalInTransit, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Delivered', value: totalDelivered, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
          { label: 'Kg Delivered', value: totalKg, color: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
        ].map(s => (
          <div key={s.label} className={`border rounded-2xl p-5 ${s.bg}`}>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 mb-8">
          <h2 className="text-lg font-bold text-on-surface mb-1">Create New Shipment</h2>
          <p className="text-sm text-on-surface-variant mb-4">Select grain from purchased inventory. Stock must be available before creating a shipment.</p>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-on-surface mb-2">Select Grain *</label>
              <div className="grid grid-cols-4 gap-2">
                {grains.length > 0 ? grains.map(g => {
                  const isSelected = form.grainType === g._id;
                  const isLow = (g.currentStock || 0) < 100;
                  return (
                    <button
                      type="button"
                      key={g._id}
                      onClick={() => setForm(f => ({ ...f, grainType: g._id, grainName: g.name }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-primary/40'}`}
                    >
                      <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{g.name}</p>
                      <p className={`text-xs mt-0.5 ${isLow ? 'text-red-500 font-semibold' : 'text-on-surface-variant'}`}>{(g.currentStock || 0)} kg available</p>
                    </button>
                  );
                }) : ['Wheat','Rice','Dal','Jowar'].map(g => (
                  <button type="button" key={g} onClick={() => setForm(f => ({ ...f, grainType: g.toLowerCase(), grainName: g }))} className={`p-3 rounded-xl border-2 text-center ${form.grainName === g ? 'border-primary bg-primary/5' : 'border-outline-variant/20'}`}>
                    <p className="text-sm font-bold">{g}</p>
                  </button>
                ))}
              </div>
              {/* Stock check warning */}
              {form.quantity && grains.length > 0 && (() => {
                const sel = grains.find(g => g._id === form.grainType);
                if (sel && Number(form.quantity) > (sel.currentStock || 0)) {
                  return <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">⚠ Insufficient stock! Available: {sel.currentStock} kg. Go to Grain Procurement to buy more.</div>;
                }
                return null;
              })()}
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Quantity (kg)</label>
              <input required type="number" min={1} value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} placeholder="e.g. 500" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Destination District</label>
              <select value={form.toDistrict} onChange={e => setForm({...form, toDistrict: e.target.value})} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none">
                {DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Destination Village</label>
              <select value={form.toVillage} onChange={e => setForm({...form, toVillage: e.target.value})} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none">
                {KARNATAKA_FLAT.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">From Location</label>
              <input value={form.fromLocation} onChange={e => setForm({...form, fromLocation: e.target.value})} placeholder="e.g. State Depot, Belagavi" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Expected Delivery Date</label>
              <input type="date" value={form.deliveryDate} onChange={e => setForm({...form, deliveryDate: e.target.value})} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-on-surface mb-1">Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any special instructions..." className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={submitting} className="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary/90 disabled:opacity-50">{submitting ? 'Creating...' : 'Create Shipment'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-surface-variant text-on-surface font-bold py-3 px-6 rounded-xl">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter + Table */}
      <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10">
        <div className="p-5 border-b border-outline-variant/10 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-on-surface-variant mr-2">Filter:</span>
          {['ALL', ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === s ? 'bg-primary text-white' : 'bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant/50'}`}>{s}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No shipments found. Create one above!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-variant/30 text-on-surface-variant uppercase text-xs tracking-wider">
                  <th className="px-5 py-3 text-left">Shipment ID</th>
                  <th className="px-5 py-3 text-left">Grain</th>
                  <th className="px-5 py-3 text-left">Qty</th>
                  <th className="px-5 py-3 text-left">To Village</th>
                  <th className="px-5 py-3 text-left">District</th>
                  <th className="px-5 py-3 text-left">Delivery</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map(s => (
                  <tr key={s._id} className="hover:bg-surface-variant/10">
                    <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{s._id?.slice(-10)}</td>
                    <td className="px-5 py-3 font-semibold">{s.grainType}</td>
                    <td className="px-5 py-3 font-bold">{s.quantity} kg</td>
                    <td className="px-5 py-3">{s.toVillage}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{s.toDistrict}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{s.deliveryDate || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[s.status] || 'bg-surface-variant'}`}>
                        {statusIcon[s.status]} {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {s.status !== 'DELIVERED' && (
                        <select
                          value={s.status}
                          onChange={e => updateStatus(s._id, e.target.value)}
                          disabled={updatingId === s._id}
                          className="text-xs border border-outline-variant rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                        >
                          {STATUSES.map(st => <option key={st}>{st}</option>)}
                        </select>
                      )}
                      {s.status === 'DELIVERED' && <span className="text-xs text-green-700 font-bold">✓ Complete</span>}
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

export default Logistics;
