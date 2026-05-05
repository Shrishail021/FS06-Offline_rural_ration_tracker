import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Search, Loader2, MapPin, Calendar, Package } from 'lucide-react';
import { shipmentsDb } from '../db';
import OfflineBanner from '../components/OfflineBanner';

const Shipments = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadShipments = async () => {
    setLoading(true);
    try {
      const result = await shipmentsDb.allDocs({ include_docs: true, descending: true });
      setShipments(result.rows.filter(r => !r.id.startsWith('_design')).map(r => r.doc));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, []);

  const filtered = shipments.filter(s =>
    s.toVillage?.toLowerCase().includes(search.toLowerCase()) ||
    s.grainType?.toLowerCase().includes(search.toLowerCase()) ||
    s.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Incoming Shipments
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">Track grain shipments allocated to villages by the State Admin.</p>
        </div>
        <button onClick={loadShipments} className="text-primary font-semibold text-sm hover:underline">Refresh</button>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 overflow-hidden">
        <div className="p-4 border-b border-outline-variant/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-on-surface-variant" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by village, grain, or status..."
            className="flex-1 outline-none text-sm text-on-surface placeholder-on-surface-variant"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No shipments found.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10 max-h-[500px] overflow-y-auto">
            {filtered.map(s => (
              <div key={s._id} className="p-5 hover:bg-surface-variant/10 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      s.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                      s.status === 'IN_TRANSIT' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {s.status}
                    </span>
                    <span className="text-xs font-mono text-on-surface-variant">{s._id.split('_').pop().slice(0, 8)}</span>
                  </div>
                  <div className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-6 mt-3">
                  <div>
                    <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wide">Destination</p>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shipments;
