import React, { useState, useEffect } from 'react';
import { Truck, Search, Loader2, MapPin, Calendar, Package, WifiOff, RefreshCw, FileText } from 'lucide-react';
import { shipmentsDb } from '../db';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Shipments = () => {
  // Safe parse user
  let user = {};
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }
  const assignedVillage = user.assignedVillage || null;

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [manifestData, setManifestData] = useState(null);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const result = await shipmentsDb.allDocs({ include_docs: true, descending: true });
      let docs = result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc);
      // Scope to assigned village
      if (assignedVillage) {
        docs = docs.filter(s => s.toVillage?.toLowerCase() === assignedVillage.toLowerCase());
      }
      setShipments(docs);
    } catch (err) {
      console.error('Shipments load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadShipments(); }, []);

  const generateManifest = (group) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Logistics Shipment Manifest', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Shipment ID: ${group.groupId}`, 14, 32);
    doc.text(`Status: ${group.status}`, 14, 38);
    doc.text(`Expected Delivery: ${group.deliveryDate || 'N/A'}`, 14, 44);
    
    doc.text(`Destination: ${group.toVillage}`, 14, 54);

    const tableData = group.items.map(item => [
      item.grainType.toUpperCase(),
      `${item.quantity} kg`,
      item._id
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Grain Type', 'Quantity', 'Internal Record ID']],
      body: tableData,
    });

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 120;
    doc.text('Authorized Signature: _______________________', 14, finalY + 30);
    doc.text('Receiver Signature: _______________________', 14, finalY + 40);

    const pdfBlobUrl = doc.output('bloburl');
    setManifestData({
      url: pdfBlobUrl,
      name: `manifest_${group.groupId || 'shipment'}.pdf`,
      doc: doc
    });
  };

  const filtered = shipments.filter(s =>
    s.toVillage?.toLowerCase().includes(search.toLowerCase()) ||
    s.grainType?.toLowerCase().includes(search.toLowerCase()) ||
    s.status?.toLowerCase().includes(search.toLowerCase())
  );

  const statusConfig = {
    DELIVERED: { cls: 'bg-green-100 text-green-700', label: '✓ Delivered' },
    IN_TRANSIT: { cls: 'bg-amber-100 text-amber-700', label: '🚛 In Transit' },
    PENDING: { cls: 'bg-blue-100 text-blue-700', label: '⏳ Pending' },
  };

  const totalDelivered = shipments
    .filter(s => s.status === 'DELIVERED')
    .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Incoming Shipments
          </h1>
          {assignedVillage ? (
            <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-primary" />
              Showing shipments for <strong className="text-on-surface mx-1">{assignedVillage}</strong> only
              {!isOnline && <span className="text-orange-600 flex items-center gap-1 ml-2"><WifiOff className="w-3.5 h-3.5" />Offline — local data</span>}
            </p>
          ) : (
            <p className="text-sm text-on-surface-variant mt-1">Track grain shipments allocated to your village.</p>
          )}
        </div>
        <button
          onClick={loadShipments}
          className="flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary stats */}
      {shipments.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-card border border-outline-variant/10 text-center">
            <p className="text-2xl font-bold text-on-surface">{shipments.length}</p>
            <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wide mt-1">Total Shipments</p>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
            <p className="text-2xl font-bold text-green-700">{shipments.filter(s => s.status === 'DELIVERED').length}</p>
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mt-1">Delivered</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
            <p className="text-2xl font-bold text-amber-700">{totalDelivered}kg</p>
            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mt-1">Total Grain Received</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 overflow-hidden">
        <div className="p-4 border-b border-outline-variant/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-on-surface-variant" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by grain or status..."
            className="flex-1 outline-none text-sm text-on-surface placeholder-on-surface-variant"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No shipments found{assignedVillage ? ` for ${assignedVillage}` : ''}.</p>
            {!isOnline && <p className="text-xs mt-2 text-orange-600">You are offline. Shipments sync from the server when online.</p>}
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10 max-h-[500px] overflow-y-auto">
            {Object.values(filtered.reduce((acc, s) => {
              let groupKey = s._id;
              if (s._id.includes('_') && !s._id.startsWith('ship_')) {
                groupKey = s._id.split('_')[0];
              } else if (s._id.startsWith('ship_')) {
                groupKey = `legacy_${s.toVillage}_${s.createdAt?.slice(0, 16)}`;
              }
              if (!acc[groupKey]) {
                acc[groupKey] = {
                  groupId: s._id.includes('_') && !s._id.startsWith('ship_') ? s._id.split('_')[0] : s._id,
                  toVillage: s.toVillage, deliveryDate: s.deliveryDate,
                  status: s.status, createdAt: s.createdAt, notes: s.notes, items: []
                };
              }
              acc[groupKey].items.push({ grainType: s.grainType, quantity: s.quantity, _id: s._id });
              return acc;
            }, {})).map(group => {
              const sc = statusConfig[group.status] || statusConfig.PENDING;
              return (
                <div key={group.groupId} className="p-5 hover:bg-surface-variant/10 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.cls}`}>{sc.label}</span>
                      <span className="text-xs font-mono text-on-surface-variant">{group.groupId?.slice(-10)}</span>
                      <button onClick={() => generateManifest(group)} className="ml-2 flex items-center gap-1 px-2 py-1 bg-surface-variant/30 hover:bg-surface-variant rounded text-xs font-bold text-on-surface-variant transition-colors" title="View Manifest">
                        <FileText className="w-3.5 h-3.5" /> View Manifest
                      </button>
                    </div>
                    <div className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(group.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wide">To Village</p>
                      <p className="font-bold text-on-surface flex items-center gap-1 mt-0.5">
                        <MapPin className="w-4 h-4 text-primary" /> {group.toVillage || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wide">Payload</p>
                      <div className="mt-1 space-y-1">
                        {group.items.map(item => (
                           <p key={item._id} className="font-bold text-on-surface flex items-center gap-1 text-sm">
                             <Package className="w-3.5 h-3.5 text-primary" /> {item.quantity}kg <span className="uppercase text-[10px] bg-surface-variant/20 px-1 rounded border border-outline-variant/10">{item.grainType}</span>
                           </p>
                        ))}
                      </div>
                    </div>
                    {group.deliveryDate && (
                      <div>
                        <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wide">Expected</p>
                        <p className="font-semibold text-on-surface mt-0.5">{group.deliveryDate}</p>
                      </div>
                    )}
                  </div>
                  {group.notes && <p className="text-xs text-on-surface-variant mt-2 italic">Note: {group.notes}</p>}
                </div>
              );
            })}
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

export default Shipments;
