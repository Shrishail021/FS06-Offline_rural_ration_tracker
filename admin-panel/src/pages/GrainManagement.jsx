import React, { useState, useEffect } from 'react';
import { Package, Plus, TrendingDown, IndianRupee, ShoppingCart, History, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';
import axios from 'axios';

const BACKEND = 'http://localhost:5000';

const GRAIN_OPTIONS = [
  { id: 'wheat', name: 'Wheat', icon: '🌾' },
  { id: 'rice', name: 'Rice', icon: '🍚' },
  { id: 'dal', name: 'Dal', icon: '🟡' },
  { id: 'jowar', name: 'Jowar', icon: '🌽' },
];

const GrainManagement = () => {
  const [grains, setGrains] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'purchase' | 'history'
  const [msg, setMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Purchase form state
  const [form, setForm] = useState({
    grainId: 'wheat', grainName: 'Wheat',
    quantity: '', pricePerUnit: '',
    supplierId: '', supplierName: '',
    invoiceNumber: '', purchaseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  const fetchGrains = async () => {
    try {
      const res = await axios.get(`${BACKEND}/api/admin/grains`);
      setGrains(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchPurchases = async () => {
    try {
      const res = await axios.get(`${BACKEND}/api/admin/grains/purchases`);
      setPurchases(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchGrains(), fetchPurchases()]).finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!form.quantity || !form.pricePerUnit) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${BACKEND}/api/admin/grains/purchase`, form);
      showMsg('success', `✓ Purchased ${form.quantity} kg of ${form.grainName} for ₹${Number(form.quantity) * Number(form.pricePerUnit)}. Stock updated.`);
      setForm(f => ({ ...f, quantity: '', pricePerUnit: form.pricePerUnit, invoiceNumber: '', supplierName: '', notes: '' }));
      await fetchGrains();
      await fetchPurchases();
      setActiveTab('inventory');
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Purchase failed');
    } finally { setSubmitting(false); }
  };

  const totalStockValue = grains.reduce((sum, g) => sum + ((g.currentStock || 0) * (g.pricePerUnit || 0)), 0);
  const totalKg = grains.reduce((sum, g) => sum + (g.currentStock || 0), 0);
  const lowStockCount = grains.filter(g => (g.currentStock || 0) < (g.reorderLevel || 0)).length;

  const grainIcon = (id) => GRAIN_OPTIONS.find(g => g.id === id)?.icon || '📦';
  const grainName = (id) => GRAIN_OPTIONS.find(g => g.id === id)?.name || id;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" /> Grain Procurement
          </h1>
          <p className="text-on-surface-variant mt-1">Purchase grain stock, track inventory, and feed the logistics pipeline.</p>
        </div>
        <button
          onClick={() => setActiveTab(activeTab === 'purchase' ? 'inventory' : 'purchase')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all ${activeTab === 'purchase' ? 'bg-surface-variant text-on-surface' : 'bg-primary text-white'}`}
        >
          {activeTab === 'purchase' ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {activeTab === 'purchase' ? 'Cancel' : 'Buy Grain'}
        </button>
      </div>

      {/* Alert */}
      {msg && (
        <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-medium">{msg.text}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-outline-variant/10 rounded-2xl p-5 shadow-card">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Total Stock</p>
          <p className="text-3xl font-bold text-on-surface">{totalKg.toLocaleString()} <span className="text-base font-normal text-on-surface-variant">kg</span></p>
        </div>
        <div className="bg-white border border-outline-variant/10 rounded-2xl p-5 shadow-card">
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Inventory Value</p>
          <p className="text-3xl font-bold text-primary">₹{totalStockValue.toLocaleString()}</p>
        </div>
        <div className={`border rounded-2xl p-5 shadow-card ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-100'}`}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2 text-on-surface-variant">Low Stock Alerts</p>
          <p className={`text-3xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowStockCount} <span className="text-base font-normal">grains</span></p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-surface-variant/30 rounded-xl p-1 mb-6 w-fit">
        {[['inventory', 'Inventory', Package], ['purchase', 'Buy Grain', ShoppingCart], ['history', 'Purchase History', History]].map(([tab, label, Icon]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ─── INVENTORY TAB ─── */}
      {activeTab === 'inventory' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
          ) : (
            <>
              {/* Stock Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {grains.map(grain => {
                  const isLow = (grain.currentStock || 0) < (grain.reorderLevel || 0);
                  const pct = Math.min(100, Math.round(((grain.currentStock || 0) / ((grain.reorderLevel || 1) * 3)) * 100));
                  return (
                    <div key={grain._id} className={`bg-white rounded-2xl border-2 p-5 shadow-card transition-all hover:shadow-modal ${isLow ? 'border-red-200' : 'border-outline-variant/10'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-3xl">{grainIcon(grain._id)}</span>
                        {isLow && (
                          <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" /> Low
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-on-surface text-lg">{grain.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-on-surface-variant mb-3">
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>{grain.pricePerUnit}/{grain.unit}</span>
                      </div>
                      <p className="text-2xl font-bold text-on-surface mb-2">
                        {(grain.currentStock || 0).toLocaleString()} <span className="text-sm font-normal text-on-surface-variant">{grain.unit}</span>
                      </p>
                      <div className="w-full bg-surface-variant/50 rounded-full h-2 mb-1">
                        <div className={`h-2 rounded-full transition-all ${isLow ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-on-surface-variant">Reorder at {grain.reorderLevel} {grain.unit}</p>
                      <div className="mt-3 pt-3 border-t border-outline-variant/10">
                        <p className="text-xs text-on-surface-variant">Stock value</p>
                        <p className="font-bold text-sm text-primary">₹{((grain.currentStock || 0) * (grain.pricePerUnit || 0)).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inventory Table */}
              <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10">
                <div className="p-5 border-b border-outline-variant/10">
                  <h2 className="text-lg font-bold text-on-surface">Stock Ledger</h2>
                  <p className="text-sm text-on-surface-variant">Current grain inventory — updates automatically after each purchase</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-variant/30 text-on-surface-variant uppercase text-xs tracking-wider">
                        <th className="px-5 py-3 text-left">Grain</th>
                        <th className="px-5 py-3 text-right">Current Stock</th>
                        <th className="px-5 py-3 text-right">Total Purchased</th>
                        <th className="px-5 py-3 text-right">Price/Unit</th>
                        <th className="px-5 py-3 text-right">Stock Value</th>
                        <th className="px-5 py-3 text-right">Reorder Level</th>
                        <th className="px-5 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {grains.map(grain => {
                        const isLow = (grain.currentStock || 0) < (grain.reorderLevel || 0);
                        return (
                          <tr key={grain._id} className="hover:bg-surface-variant/10 transition-colors">
                            <td className="px-5 py-4 font-semibold text-on-surface">{grainIcon(grain._id)} {grain.name}</td>
                            <td className="px-5 py-4 text-right font-bold">{(grain.currentStock || 0).toLocaleString()} {grain.unit}</td>
                            <td className="px-5 py-4 text-right text-on-surface-variant">{(grain.totalPurchased || 0).toLocaleString()} {grain.unit}</td>
                            <td className="px-5 py-4 text-right">₹{grain.pricePerUnit}/{grain.unit}</td>
                            <td className="px-5 py-4 text-right font-bold text-primary">₹{((grain.currentStock || 0) * (grain.pricePerUnit || 0)).toLocaleString()}</td>
                            <td className="px-5 py-4 text-right text-on-surface-variant">{grain.reorderLevel} {grain.unit}</td>
                            <td className="px-5 py-4">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {isLow ? '⚠ Low Stock' : '✓ Sufficient'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── BUY GRAIN TAB ─── */}
      {activeTab === 'purchase' && (
        <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 p-8">
          <h2 className="text-xl font-bold text-on-surface mb-1 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" /> Record Grain Purchase
          </h2>
          <p className="text-sm text-on-surface-variant mb-6">Enter procurement details. Stock will update automatically after submission.</p>

          <form onSubmit={handlePurchase} className="space-y-6">
            {/* Grain Selection */}
            <div>
              <label className="block text-sm font-bold text-on-surface mb-3">Select Grain *</label>
              <div className="grid grid-cols-4 gap-3">
                {GRAIN_OPTIONS.map(g => (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => setForm(f => ({ ...f, grainId: g.id, grainName: g.name }))}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${form.grainId === g.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-outline-variant/20 hover:border-primary/40'}`}
                  >
                    <span className="text-2xl">{g.icon}</span>
                    <span className={`text-sm font-bold ${form.grainId === g.id ? 'text-primary' : 'text-on-surface'}`}>{g.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Quantity Purchased (kg) *</label>
                <input required type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 1000" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Price per kg (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">₹</span>
                  <input required type="number" step="0.01" min="0" value={form.pricePerUnit} onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))} placeholder="e.g. 2.50" className="w-full pl-8 pr-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
                </div>
              </div>
            </div>

            {/* Total cost preview */}
            {form.quantity && form.pricePerUnit && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm text-on-surface-variant">Total Purchase Cost</p>
                  <p className="text-2xl font-bold text-primary">₹{(Number(form.quantity) * Number(form.pricePerUnit)).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-on-surface-variant">Quantity</p>
                  <p className="text-xl font-bold text-on-surface">{Number(form.quantity).toLocaleString()} kg</p>
                </div>
              </div>
            )}

            {/* Supplier & Invoice */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Supplier Name</label>
                <input value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} placeholder="e.g. Karnataka Agri Corp" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Invoice Number</label>
                <input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="e.g. INV-2026-0045" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-mono" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Purchase Date</label>
                <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Notes (optional)</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional details..." className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-primary text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm">
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><ShoppingCart className="w-5 h-5" /> Confirm Purchase & Update Stock</>}
            </button>
          </form>
        </div>
      )}

      {/* ─── HISTORY TAB ─── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10">
          <div className="p-5 border-b border-outline-variant/10">
            <h2 className="text-lg font-bold text-on-surface">Purchase History</h2>
            <p className="text-sm text-on-surface-variant">{purchases.length} total procurement records</p>
          </div>
          {purchases.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No purchases yet. Use "Buy Grain" to record your first procurement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-variant/30 text-on-surface-variant uppercase text-xs tracking-wider">
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Grain</th>
                    <th className="px-5 py-3 text-right">Qty (kg)</th>
                    <th className="px-5 py-3 text-right">₹/kg</th>
                    <th className="px-5 py-3 text-right">Total Cost</th>
                    <th className="px-5 py-3 text-left">Supplier</th>
                    <th className="px-5 py-3 text-left">Invoice</th>
                    <th className="px-5 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {purchases.map(p => (
                    <tr key={p._id} className="hover:bg-surface-variant/10">
                      <td className="px-5 py-3 text-on-surface-variant">{p.purchaseDate}</td>
                      <td className="px-5 py-3 font-semibold">{grainIcon(p.grainId)} {p.grainName}</td>
                      <td className="px-5 py-3 text-right font-bold">{(p.quantity || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right">₹{p.pricePerUnit}</td>
                      <td className="px-5 py-3 text-right font-bold text-primary">₹{(p.totalCost || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-on-surface-variant">{p.supplierName || '—'}</td>
                      <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{p.invoiceNumber || '—'}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">✓ {p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GrainManagement;
