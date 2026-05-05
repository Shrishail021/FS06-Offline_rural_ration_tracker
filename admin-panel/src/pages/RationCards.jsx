import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Plus, CheckCircle, XCircle, Loader2, User } from 'lucide-react';
import axios from 'axios';

const BACKEND = 'http://localhost:5000';

const KA_DISTRICTS = {
  'Dharwad': ['Hubli Central', 'Gokul', 'Vidyanagar', 'Keshwapur', 'Dharwad City', 'Amargol', 'Kalghatgi'],
  'Belagavi': ['Belagavi North', 'Belagavi South', 'Kakati', 'Hukeri', 'Gokak', 'Mudalagi', 'Nippani'],
  'Gadag': ['Gadag City', 'Betgeri', 'Lakshmeshwar', 'Ron', 'Gajendragad'],
  'Mysuru': ['Mysuru City', 'Vijayanagara', 'Hebbal', 'Hunsur', 'Nanjangud'],
  'Ballari': ['Ballari City', 'Kampli', 'Siruguppa', 'Hospet', 'Hampi'],
};

const RationCards = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ cardNumber: '', headName: '', district: 'Dharwad', village: 'Hubli Central', members: [{ name: '', age: '', aadhaar: '', alive: true }] });

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND}/api/admin/ration-cards`);
      setCards(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCards(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BACKEND}/api/admin/ration-cards`, form);
      setMsg({ type: 'success', text: `Ration card ${form.cardNumber} created!` });
      setShowForm(false);
      setForm({ cardNumber: '', headName: '', district: 'Dharwad', village: 'Hubli Central', members: [{ name: '', age: '', aadhaar: '', alive: true }] });
      fetchCards();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create card' });
    }
    setTimeout(() => setMsg(null), 3500);
  };

  const toggleCardStatus = async (card) => {
    try {
      const newStatus = card.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await axios.put(`${BACKEND}/api/admin/ration-cards/${card._id}`, { status: newStatus });
      fetchCards();
    } catch (err) { console.error(err); }
  };

  const toggleMemberAlive = async (card, memberIdx) => {
    try {
      const updatedMembers = card.members.map((m, i) => i === memberIdx ? { ...m, alive: !m.alive } : m);
      await axios.put(`${BACKEND}/api/admin/ration-cards/${card._id}`, { members: updatedMembers });
      fetchCards();
    } catch (err) { console.error(err); }
  };

  const addMember = () => setForm(f => ({ ...f, members: [...f.members, { name: '', age: '', aadhaar: '', alive: true }] }));
  const updateMember = (idx, field, val) => setForm(f => ({ ...f, members: f.members.map((m, i) => i === idx ? { ...m, [field]: val } : m) }));

  const filtered = cards.filter(c =>
    c._id?.toLowerCase().includes(search.toLowerCase()) ||
    c.headName?.toLowerCase().includes(search.toLowerCase()) ||
    c.village?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3"><CreditCard className="w-8 h-8 text-primary" /> Ration Cards</h1>
          <p className="text-on-surface-variant mt-1">Manage ration cards and family member status.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md">
          <Plus className="w-4 h-4 mr-2" /> New Card
        </button>
      </div>

      {msg && (
        <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 border ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-card border border-outline-variant/10 mb-8">
          <h2 className="text-lg font-bold text-on-surface mb-4">New Ration Card</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">Card Number</label>
                <input required value={form.cardNumber} onChange={e => setForm({...form, cardNumber: e.target.value})} placeholder="e.g. RC-009" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">Head of Family</label>
                <input required value={form.headName} onChange={e => setForm({...form, headName: e.target.value})} placeholder="Full name" className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">District</label>
                <select value={form.district} onChange={e => setForm({...form, district: e.target.value, village: KA_DISTRICTS[e.target.value][0]})} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none">
                  {Object.keys(KA_DISTRICTS).map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">Village</label>
                <select value={form.village} onChange={e => setForm({...form, village: e.target.value})} className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none">
                  {(KA_DISTRICTS[form.district] || []).map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-on-surface">Family Members</label>
                <button type="button" onClick={addMember} className="text-xs text-primary font-bold hover:underline">+ Add Member</button>
              </div>
              {form.members.map((m, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 mb-2">
                  <input value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} placeholder="Member name" className="px-3 py-2 border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
                  <input type="number" value={m.age} onChange={e => updateMember(i, 'age', e.target.value)} placeholder="Age" className="px-3 py-2 border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
                  <input value={m.aadhaar} onChange={e => updateMember(i, 'aadhaar', e.target.value)} placeholder="Aadhaar (masked)" className="px-3 py-2 border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary/90">Create Card</button>
              <button type="button" onClick={() => setShowForm(false)} className="bg-surface-variant text-on-surface font-bold py-3 px-6 rounded-xl">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10">
        <div className="p-5 border-b border-outline-variant/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-on-surface-variant" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by card number, name, or village..." className="flex-1 outline-none text-on-surface placeholder-on-surface-variant" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No ration cards found. Create one above!</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {filtered.map(card => (
              <div key={card._id} className="p-5 hover:bg-surface-variant/10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-on-surface font-mono">{card._id}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{card.status}</span>
                    </div>
                    <p className="text-sm text-on-surface">Head: <span className="font-semibold">{card.headName}</span>{card.village ? ` · ${card.village}` : ''}</p>
                    {card.members && card.members.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {card.members.map((m, i) => (
                          <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${m.alive !== false ? 'bg-surface-variant/30 border-outline-variant/20 text-on-surface' : 'bg-red-50 border-red-200 text-red-600 line-through'}`}>
                            <User className="w-3 h-3" />
                            {m.name} ({m.age}y)
                            <button onClick={() => toggleMemberAlive(card, i)} className="ml-1 underline text-primary text-xs" title={m.alive !== false ? 'Mark Deceased' : 'Reactivate'}>
                              {m.alive !== false ? '✕' : '↩'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => toggleCardStatus(card)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${card.status === 'ACTIVE' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                    {card.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RationCards;
