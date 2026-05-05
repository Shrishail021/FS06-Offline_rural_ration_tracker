import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, AlertTriangle, Search, UserCheck, X, Wifi, WifiOff } from 'lucide-react';
import { saveDistributionOffline, searchRationCards, checkAlreadyDistributed, getLocalStock } from '../db';
import OfflineBanner from '../components/OfflineBanner';
import axios from 'axios';

const GRAIN_TYPES = ['Wheat', 'Rice', 'Dal', 'Jowar'];
const BACKEND = 'http://localhost:5000';

const Distribution = () => {
  const [query, setQuery] = useState('');
  const [cardResults, setCardResults] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [memberIndex, setMemberIndex] = useState(0);
  const [grainType, setGrainType] = useState('Wheat');
  const [quantity, setQuantity] = useState(5);
  const [status, setStatus] = useState(null); // 'success'|'error'|'duplicate'|'blocked'
  const [statusMsg, setStatusMsg] = useState('');
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentStock, setCurrentStock] = useState(null);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handleSearch = async () => {
    if (!query) return;
    setSearching(true);

    // First try local PouchDB
    let results = await searchRationCards(query);

    // If online and no local results, fetch from server
    if (results.length === 0 && isOnline) {
      try {
        const res = await axios.get(`${BACKEND}/api/admin/ration-cards`);
        const all = res.data.data || [];
        const q = query.toLowerCase();
        results = all.filter(c =>
          c._id?.toLowerCase().includes(q) ||
          c.headName?.toLowerCase().includes(q)
        );
      } catch (e) { /* offline */ }
    }
    setCardResults(results);
    setSearching(false);
    setStatus(null);
  };

  const selectCard = async (card) => {
    // Validation checks
    if (card.status === 'INACTIVE') {
      setStatus('blocked');
      setStatusMsg('This ration card is INACTIVE and cannot receive distribution.');
      return;
    }
    const alreadyDone = await checkAlreadyDistributed(card._id);
    if (alreadyDone) {
      setStatus('duplicate');
      setStatusMsg(`Card ${card._id} has already received ration this month.`);
      return;
    }
    setSelectedCard(card);
    setMemberIndex(0);
    setCardResults([]);
    setQuery(card._id);
    setStatus(null);
    checkStock(card.village, grainType);
  };

  const checkStock = async (village, type) => {
    if (!village) return;
    const stock = await getLocalStock(village, type);
    setCurrentStock(stock);
  };

  // Re-check stock when grain type changes
  useEffect(() => {
    if (selectedCard) {
      checkStock(selectedCard.village, grainType);
    }
  }, [grainType, selectedCard]);

  const handleDistributeClick = () => {
    const member = selectedCard?.members?.[memberIndex];
    if (!member) return;
    if (member.alive === false) {
      setStatus('blocked');
      setStatusMsg(`${member.name} is marked as deceased. Distribution blocked.`);
      return;
    }
    if (currentStock !== null && quantity > currentStock) {
      setStatus('error');
      setStatusMsg(`Insufficient stock for ${selectedCard.village}. Only ${currentStock}kg available.`);
      return;
    }
    setShowAuthPopup(true);
  };

  const confirmDistribution = async () => {
    setShowAuthPopup(false);
    const member = selectedCard.members[memberIndex];
    try {
      const transaction = {
        rationCardId: selectedCard._id,
        headName: selectedCard.headName,
        member: { name: member.name, age: member.age, aadhaar: member.aadhaar },
        grainType: grainType.toLowerCase(),
        quantity,
        village: selectedCard.village || '',
      };
      const saved = await saveDistributionOffline(transaction);
      setStatus('success');
      setStatusMsg(`Transaction ID: ${saved.transactionId}`);
      setSelectedCard(null);
      setQuery('');
    } catch (err) {
      if (err.message.includes('ALREADY_DISTRIBUTED')) {
        setStatus('duplicate');
        setStatusMsg('This ration card has already been served this month.');
      } else {
        setStatus('error');
        setStatusMsg(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface-variant/30">
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-on-surface mb-1">Distribution</h1>
        <p className="text-sm text-on-surface-variant mb-6">Search a ration card to begin. Works fully offline.</p>

        {/* Status Messages */}
        {status === 'success' && (
          <div className="bg-green-50 border border-green-200 p-4 mb-6 rounded-xl flex items-start gap-3">
            <CheckCircle className="text-green-600 w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-bold">Distribution recorded offline!</p>
              <p className="text-green-700 text-sm font-mono mt-1">{statusMsg}</p>
              <p className="text-green-600 text-xs mt-1">Will sync automatically when connected.</p>
            </div>
          </div>
        )}
        {(status === 'error' || status === 'blocked' || status === 'duplicate') && (
          <div className={`border p-4 mb-6 rounded-xl flex items-start gap-3 ${status === 'duplicate' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${status === 'duplicate' ? 'text-orange-500' : 'text-red-500'}`} />
            <div>
              <p className={`font-bold ${status === 'duplicate' ? 'text-orange-800' : 'text-red-800'}`}>
                {status === 'duplicate' ? 'Already Distributed This Month' : status === 'blocked' ? 'Distribution Blocked' : 'Error'}
              </p>
              <p className={`text-sm mt-0.5 ${status === 'duplicate' ? 'text-orange-700' : 'text-red-700'}`}>{statusMsg}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white p-5 rounded-2xl shadow-card border border-outline-variant/10 mb-6">
          <p className="text-sm font-semibold text-on-surface-variant mb-3">Search by Card Number, Name, or Aadhaar</p>
          <div className="flex gap-3">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. RC-001 or Rajesh Kumar"
              className="flex-1 px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
            />
            <button onClick={handleSearch} disabled={searching} className="bg-primary text-white px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2">
              <Search className="w-4 h-4" /> {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {cardResults.length > 0 && (
            <div className="mt-3 border border-outline-variant/20 rounded-xl overflow-hidden divide-y divide-outline-variant/10">
              {cardResults.map(card => (
                <button key={card._id} onClick={() => selectCard(card)} className="w-full text-left p-4 hover:bg-surface-variant/20 transition-colors flex justify-between items-center">
                  <div>
                    <p className="font-semibold font-mono text-on-surface">{card._id}</p>
                    <p className="text-sm text-on-surface-variant">{card.headName} · {card.members?.length || 0} members</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{card.status}</span>
                </button>
              ))}
            </div>
          )}
          {cardResults.length === 0 && query && !searching && (
            <p className="text-sm text-on-surface-variant mt-3 text-center py-2">No results found. {!isOnline ? '(Offline — only local data available)' : ''}</p>
          )}
        </div>

        {/* Distribution Form */}
        {selectedCard && (
          <div className="bg-white rounded-2xl shadow-card border border-outline-variant/10 overflow-hidden">
            <div className="bg-primary/5 p-4 border-b border-outline-variant/10 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-on-surface font-mono">{selectedCard._id}</h2>
                <p className="text-sm text-on-surface-variant">Head: {selectedCard.headName}{selectedCard.village ? ` · ${selectedCard.village}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">{selectedCard.status}</span>
                <button onClick={() => { setSelectedCard(null); setQuery(''); }} className="text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-6">
              {/* Member Selection */}
              <h3 className="font-semibold text-on-surface mb-3">Select Beneficiary</h3>
              <div className="space-y-2 mb-6">
                {selectedCard.members?.map((m, idx) => (
                  <label key={idx} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${memberIndex === idx ? 'border-primary bg-primary/5' : 'border-outline-variant/30'} ${m.alive === false ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="radio" name="member" checked={memberIndex === idx} onChange={() => setMemberIndex(idx)} disabled={m.alive === false} className="mr-3 accent-primary w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-semibold text-on-surface text-sm">{m.name} <span className="text-xs font-normal text-on-surface-variant">(Age: {m.age})</span></p>
                      <p className="text-xs text-on-surface-variant font-mono">{m.aadhaar}</p>
                    </div>
                    {m.alive === false && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full ml-2">Deceased</span>}
                  </label>
                ))}
                {(!selectedCard.members || selectedCard.members.length === 0) && (
                  <p className="text-sm text-on-surface-variant bg-surface-variant/30 p-3 rounded-xl">No family members registered.</p>
                )}
              </div>
              {/* Configuration */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-2">Select Grain</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GRAIN_TYPES.map(g => (
                      <button
                        key={g}
                        onClick={() => setGrainType(g)}
                        className={`p-2 rounded-xl border text-sm font-bold transition-all ${grainType === g ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-outline-variant/20 hover:border-primary/50 text-on-surface'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-2">Quantity (kg)</label>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20].map(q => (
                      <button
                        key={q}
                        onClick={() => setQuantity(q)}
                        className={`flex-1 py-2 rounded-xl border font-bold transition-all ${quantity === q ? 'bg-primary text-white border-primary' : 'bg-white border-outline-variant/20 hover:border-primary/50 text-on-surface'}`}
                      >
                        {q}kg
                      </button>
                    ))}
                  </div>
                  {currentStock !== null && (
                    <p className={`mt-2 text-xs font-bold ${currentStock < quantity ? 'text-red-500' : 'text-green-600'}`}>
                      {currentStock} kg available for {selectedCard.village || 'village'}
                    </p>
                  )}
                </div>
              </div>

              <button onClick={handleDistributeClick} className="w-full bg-primary text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 text-base shadow-sm hover:shadow-md transition-all">
                <Package className="w-5 h-5" /> Record Distribution
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Authentication Popup */}
      {showAuthPopup && selectedCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-on-surface mb-1">Confirm Distribution</h2>
              <p className="text-sm text-on-surface-variant">Verify the beneficiary is present</p>
            </div>
            <div className="bg-surface-variant/30 rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-on-surface-variant">Card ID</span><span className="font-mono font-bold">{selectedCard._id}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Beneficiary</span><span className="font-bold">{selectedCard.members?.[memberIndex]?.name}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Grain</span><span className="font-bold">{grainType}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">Quantity</span><span className="font-bold">{quantity} kg</span></div>
            </div>
            <p className="text-xs text-on-surface-variant text-center mb-4">Clicking <strong>Confirm</strong> will save this transaction to local storage and sync later.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAuthPopup(false)} className="flex-1 bg-surface-variant text-on-surface font-bold py-3 rounded-xl hover:bg-surface-variant/80 transition-colors">Cancel</button>
              <button onClick={confirmDistribution} className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors">✓ Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Distribution;
