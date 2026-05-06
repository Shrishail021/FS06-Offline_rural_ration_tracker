import React, { useState, useEffect } from 'react';
import { Truck, Plus, CheckCircle, Clock, Package, Loader2, BarChart2, FileText } from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [quantities, setQuantities] = useState({});
  const [form, setForm] = useState({ fromLocation: 'State Depot, Belagavi', toVillage: KARNATAKA_FLAT[0], toDistrict: DISTRICTS[0], deliveryDate: '', notes: '' });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [manifestData, setManifestData] = useState(null);

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
    const grainsToShip = Object.entries(quantities).filter(([id, qty]) => Number(qty) > 0);
    if (grainsToShip.length === 0) {
      setMsg({ type: 'error', text: 'Please enter a quantity for at least one grain.' });
      return;
    }
    
    setSubmitting(true);
    const baseId = Date.now().toString();
    try {
      await Promise.all(grainsToShip.map(([grainType, qty]) => 
        axios.post(`${BACKEND}/api/logistics/shipments`, {
          _id: `${baseId}_${grainType}`,
          ...form,
          grainType,
          quantity: qty
        })
      ));
      setMsg({ type: 'success', text: `Successfully created ${grainsToShip.length} shipment(s) for ${form.toVillage}` });
      setShowForm(false);
      setForm({ fromLocation: 'State Depot, Belagavi', toVillage: KARNATAKA_FLAT[0], toDistrict: DISTRICTS[0], deliveryDate: '', notes: '' });
      setQuantities({});
      fetchShipments();

      // Auto-generate manifest doc
      const groupForPdf = {
        groupId: baseId,
        toVillage: form.toVillage,
        toDistrict: form.toDistrict,
        deliveryDate: form.deliveryDate,
        status: 'PENDING',
        items: grainsToShip.map(([grainType, quantity]) => ({
          grainType, quantity, _id: `${baseId}_${grainType}`
        }))
      };
      generateManifest(groupForPdf);
      
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create one or more shipments' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const generateManifest = (group) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Logistics Shipment Manifest', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Shipment ID: ${group.groupId}`, 14, 32);
    doc.text(`Status: ${group.status}`, 14, 38);
    doc.text(`Created At: ${new Date().toLocaleString('en-IN')}`, 14, 44);
    
    doc.text(`Destination: ${group.toVillage}, District: ${group.toDistrict || 'Unknown'}`, 14, 54);
    doc.text(`Expected Delivery: ${group.deliveryDate || 'N/A'}`, 14, 60);

    const tableData = group.items.map(item => [
      item.grainType.toUpperCase(),
      `${item.quantity} kg`,
      item._id
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Grain Type', 'Quantity', 'Internal Record ID']],
      body: tableData,
    });

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 120;
    doc.text('Authorized Signature: _______________________', 14, finalY + 30);
    doc.text('Driver Signature: _______________________', 14, finalY + 40);

    const pdfBlobUrl = doc.output('bloburl');
    setManifestData({
      url: pdfBlobUrl,
      name: `manifest_${group.groupId || 'shipment'}.pdf`,
      doc: doc
    });
  };

  const updateStatus = async (rawIds, newStatus) => {
    setUpdatingId(rawIds[0]);
    try {
      await Promise.all(rawIds.map(id => 
        axios.put(`${BACKEND}/api/logistics/shipments/${id}`, { status: newStatus })
      ));
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
              <label className="block text-sm font-semibold text-on-surface mb-2">Enter Quantities (kg) for Multiple Grains *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {grains.length > 0 ? grains.map(g => {
                  const qty = quantities[g._id] || '';
                  const isLow = (g.currentStock || 0) < 100;
                  const error = qty && Number(qty) > (g.currentStock || 0);
                  
                  return (
                    <div key={g._id} className={`p-4 rounded-xl border-2 transition-all bg-surface-variant/5 ${qty ? 'border-primary' : 'border-outline-variant/20'}`}>
                      <p className="text-sm font-bold text-on-surface mb-1">{g.name}</p>
                      <p className={`text-xs mb-3 ${isLow ? 'text-red-500 font-semibold' : 'text-on-surface-variant'}`}>Stock: {(g.currentStock || 0)} kg</p>
                      <input 
                        type="number" min={0} placeholder="Qty (kg)" 
                        value={qty} onChange={e => setQuantities({...quantities, [g._id]: e.target.value})}
                        className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 ${error ? 'border-red-400 focus:ring-red-400' : 'border-outline-variant focus:ring-primary'}`} 
                      />
                      {error && <p className="text-[10px] text-red-600 font-bold mt-1 leading-tight">Exceeds stock!</p>}
                    </div>
                  );
                }) : <p className="text-sm text-on-surface-variant">Loading grains...</p>}
              </div>
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
                {Object.values(filtered.reduce((acc, s) => {
                  let groupKey = s._id;
                  if (s._id.includes('_') && !s._id.startsWith('ship_')) {
                    groupKey = s._id.split('_')[0];
                  } else if (s._id.startsWith('ship_')) {
                    // Group legacy ones by exact minute + village
                    groupKey = `legacy_${s.toVillage}_${s.createdAt?.slice(0, 16)}`;
                  }
                  if (!acc[groupKey]) {
                    acc[groupKey] = {
                      groupId: s._id.includes('_') && !s._id.startsWith('ship_') ? s._id.split('_')[0] : s._id,
                      toVillage: s.toVillage, toDistrict: s.toDistrict,
                      deliveryDate: s.deliveryDate, status: s.status, items: [], rawIds: []
                    };
                  }
                  acc[groupKey].items.push({ grainType: s.grainType, quantity: s.quantity, _id: s._id });
                  acc[groupKey].rawIds.push(s._id);
                  return acc;
                }, {})).map(group => (
                  <tr key={group.groupId} className="hover:bg-surface-variant/10">
                    <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{group.groupId.slice(-10)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {group.items.map(item => (
                          <span key={item._id} className="text-[10px] bg-surface-variant/20 px-2 py-0.5 rounded font-bold border border-outline-variant/10 uppercase tracking-wider">
                            {item.grainType}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-bold text-primary">
                      {group.items.map(i => `${i.quantity}kg`).join(' + ')}
                    </td>
                    <td className="px-5 py-3">{group.toVillage}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{group.toDistrict}</td>
                    <td className="px-5 py-3 text-on-surface-variant">{group.deliveryDate || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[group.status] || 'bg-surface-variant'}`}>
                        {statusIcon[group.status]} {group.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {group.status !== 'DELIVERED' && (
                          <select
                            value={group.status}
                            onChange={e => updateStatus(group.rawIds, e.target.value)}
                            disabled={updatingId === group.rawIds[0]}
                            className="text-xs border border-outline-variant rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary"
                          >
                            {STATUSES.map(st => <option key={st}>{st}</option>)}
                          </select>
                        )}
                        {group.status === 'DELIVERED' && <span className="text-xs text-green-700 font-bold">✓ Complete</span>}
                        <button onClick={() => generateManifest(group)} className="p-1.5 bg-surface-variant/30 hover:bg-surface-variant rounded-lg text-on-surface-variant transition-colors" title="Download Manifest">
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Manifest Modal */}
      {manifestData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface leading-tight">Shipment Manifest</h2>
                  <p className="text-xs font-semibold text-on-surface-variant mt-0.5">ID: {manifestData.name.replace('manifest_', '').replace('.pdf', '')}</p>
                </div>
              </div>
              <button onClick={() => setManifestData(null)} className="p-2 hover:bg-surface-variant/50 rounded-full text-on-surface-variant hover:text-on-surface transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* PDF Viewer */}
            <div className="bg-surface-variant/20 p-4 sm:p-6">
               <div className="bg-white rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
                 <iframe src={`${manifestData.url}#toolbar=0&navpanes=0`} className="w-full h-[60vh] sm:h-[65vh]" title="PDF Preview" />
               </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-outline-variant/10 bg-white flex flex-wrap justify-end gap-3">
              <button onClick={() => setManifestData(null)} className="px-6 py-2.5 font-bold text-on-surface-variant hover:bg-surface-variant/50 rounded-xl transition-colors">Close</button>
              <button onClick={() => {
                manifestData.doc.autoPrint();
                window.open(manifestData.doc.output('bloburl'), '_blank');
              }} className="px-6 py-2.5 bg-white text-on-surface font-bold rounded-xl hover:bg-surface-variant/30 transition-all flex items-center gap-2 border-2 border-outline-variant/20 shadow-sm hover:shadow">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print Document
              </button>
              <button onClick={() => {
                manifestData.doc.save(manifestData.name);
              }} className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm hover:shadow hover:-translate-y-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Logistics;
