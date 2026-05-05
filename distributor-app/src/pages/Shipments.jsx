import React, { useState, useEffect } from 'react';
import { Truck, Search, Loader2, MapPin, Calendar, Package, WifiOff, RefreshCw } from 'lucide-react';
import { shipmentsDb } from '../db';

const Shipments = () => {
  // Safe parse user
  let user = {};
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }
  const assignedVillage = user.assignedVillage || null;

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
            {filtered.map(s => {
              const sc = statusConfig[s.status] || statusConfig.PENDING;
              return (
                <div key={s._id} className="p-5 hover:bg-surface-variant/10 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.cls}`}>{sc.label}</span>
                      <span className="text-xs font-mono text-on-surface-variant">{s._id?.split('_').pop()?.slice(0, 8)}</span>
                    </div>
                    <div className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(s.createdAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wide">To Village</p>
                      <p className="font-bold text-on-surface flex items-center gap-1 mt-0.5">
                        <MapPin className="w-4 h-4 text-primary" /> {s.toVillage || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wide">Payload</p>
                      <p className="font-bold text-on-surface flex items-center gap-1 mt-0.5">
                        <Package className="w-4 h-4 text-primary" /> {s.quantity}kg {s.grainType}
                      </p>
                    </div>
                    {s.deliveryDate && (
                      <div>
                        <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wide">Expected</p>
                        <p className="font-semibold text-on-surface mt-0.5">{s.deliveryDate}</p>
                      </div>
                    )}
                  </div>
                  {s.notes && <p className="text-xs text-on-surface-variant mt-2 italic">Note: {s.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shipments;
