import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle, AlertTriangle, Search, UserCheck, X, Wifi, WifiOff, MapPin, Fingerprint, Loader2, FileBarChart2 } from 'lucide-react';
import { saveBasketOffline, searchRationCards, checkAlreadyDistributed, cardsDb } from '../db';
import axios from 'axios';

const BACKEND = 'http://localhost:5000';

const Distribution = () => {
  // Safe parse
  let user = {};
  try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch { user = {}; }

  const assignedVillage = user.assignedVillage || null;
  const district = user.district || null;

  const [query, setQuery] = useState('');
  const [cardResults, setCardResults] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [memberIndex, setMemberIndex] = useState(0);
  const [status, setStatus] = useState(null); // 'success'|'error'|'duplicate'|'blocked'
  const [statusMsg, setStatusMsg] = useState('');
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authState, setAuthState] = useState('idle'); // 'idle' | 'scanning' | 'success'
  const [searching, setSearching] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Auto-search on type (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query && !selectedCard) {
        handleSearch();
      } else if (!query) {
        setCardResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  /**
   * Search ration cards — village-scoped:
   * 1. First search local PouchDB (offline-first)
   * 2. If online & no local results, fetch from server
   * 3. Always filter by distributor's assigned village (if set)
   */
  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setStatus(null);
    try {
      // Local PouchDB search - Data is automatically synced here via startLiveSync when online!
      let results = await searchRationCards(query);

      // Scope to distributor's village
      if (assignedVillage) {
        results = results.filter(c => c.village?.toLowerCase() === assignedVillage.toLowerCase());
      }

      setCardResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const selectCard = async (card) => {
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
  };

  const getBasket = () => {
    const membersCount = selectedCard?.members?.length || 0;
    return [
      { grainType: 'rice', quantity: membersCount * 4, name: 'Rice' },
      { grainType: 'wheat', quantity: membersCount * 2, name: 'Wheat' },
      { grainType: 'jowar', quantity: membersCount * 1, name: 'Jowar' },
      { grainType: 'dal', quantity: membersCount * 0.5, name: 'Dal' }
    ];
  };

  const handleDistributeClick = () => {
    const member = selectedCard?.members?.[memberIndex];
    if (!member) {
      setStatus('error');
      setStatusMsg('No member selected. Please select a family member.');
      return;
    }
    if (member.alive === false) {
      setStatus('blocked');
      setStatusMsg(`${member.name} is marked as deceased. Distribution blocked.`);
      return;
    }
    setShowAuthPopup(true);
    setAuthState('idle');
  };

  const simulateBiometric = () => {
    setAuthState('scanning');
    setTimeout(() => {
      setAuthState('success');
      setTimeout(() => {
        confirmDistribution();
      }, 1000);
    }, 2000);
  };

  const confirmDistribution = async () => {
    setShowAuthPopup(false);
    const member = selectedCard.members[memberIndex];
    const basket = getBasket();

    try {
      const baseData = {
        rationCardId: selectedCard._id,
        headName: selectedCard.headName,
        member: { name: member.name, age: member.age, aadhaar: member.aadhaar },
        village: selectedCard.village || assignedVillage || '',
        district: selectedCard.district || district || '',
        distributorUsername: user.username || '',
      };
      
      const saved = await saveBasketOffline(baseData, basket);
      setStatus('success');
      setStatusMsg(`Transaction ID: ${saved.transactionId}`);
      setSelectedCard(null);
      setQuery('');
    } catch (err) {
      if (err.message?.includes('ALREADY_DISTRIBUTED')) {
        setStatus('duplicate');
        setStatusMsg('This ration card has already been served this month.');
      } else {
        setStatus('error');
        setStatusMsg(err.message || 'Failed to save distribution.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface-variant/30">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Distribution</h1>
          <div className="flex items-center gap-2 mt-1">
            {assignedVillage
              ? <p className="text-sm text-on-surface-variant flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  Serving <strong className="text-on-surface mx-1">{assignedVillage}</strong>
                  {district && <span>· {district} District</span>}
                  {!isOnline && <span className="ml-2 text-orange-600 font-semibold flex items-center gap-1"><WifiOff className="w-3.5 h-3.5" />Offline — saving locally</span>}
                </p>
              : <p className="text-sm text-on-surface-variant">Search a ration card to begin. Works fully offline.</p>
            }
          </div>
          </div>
          <Link to="/monthly-report" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface hover:shadow-md transition-all shadow-sm flex-shrink-0">
            <FileBarChart2 className="w-4 h-4 text-primary" /> Monthly Report
          </Link>
        </div>

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
          <p className="text-sm font-semibold text-on-surface-variant mb-1">Search Ration Card</p>
          {assignedVillage && (
            <p className="text-xs text-primary mb-3">
              🔒 Showing cards for <strong>{assignedVillage}</strong> only
            </p>
          )}
          <div className="flex gap-3">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Card Number, Name, or Aadhaar"
              className="flex-1 px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="bg-primary text-white px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Search Results */}
          {cardResults.length > 0 && (
            <div className="mt-3 border border-outline-variant/20 rounded-xl overflow-hidden divide-y divide-outline-variant/10">
              {cardResults.map(card => (
                <button
                  key={card._id}
                  onClick={() => selectCard(card)}
                  className="w-full text-left p-4 hover:bg-surface-variant/20 transition-colors flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold font-mono text-on-surface">{card._id}</p>
                    <p className="text-sm text-on-surface-variant">{card.headName} · {card.members?.length || 0} members{card.village ? ` · ${card.village}` : ''}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {card.status}
                  </span>
                </button>
              ))}
            </div>
          )}
          {cardResults.length === 0 && query && !searching && (
            <p className="text-sm text-on-surface-variant mt-3 text-center py-2">
              No results found{assignedVillage ? ` in ${assignedVillage}` : ''}.
              {!isOnline ? ' (Offline — only local data available)' : ''}
            </p>
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
                <button onClick={() => { setSelectedCard(null); setQuery(''); }} className="text-on-surface-variant hover:text-on-surface">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Member Selection */}
              <h3 className="font-semibold text-on-surface mb-3">Select Beneficiary</h3>
              <div className="space-y-2 mb-6">
                {selectedCard.members?.map((m, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition-colors ${memberIndex === idx ? 'border-primary bg-primary/5' : 'border-outline-variant/30'} ${m.alive === false ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <input
                      type="radio" name="member"
                      checked={memberIndex === idx}
                      onChange={() => setMemberIndex(idx)}
                      disabled={m.alive === false}
                      className="mr-3 accent-primary w-4 h-4"
                    />
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

              {/* Distribution Basket */}
              <div className="mb-6">
                <h3 className="font-semibold text-on-surface mb-3">Automatic Distribution Basket</h3>
                <div className="bg-surface-variant/20 rounded-xl p-4 border border-outline-variant/10">
                  <p className="text-xs text-on-surface-variant mb-3">Calculated automatically for {selectedCard.members?.length || 0} family members.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {getBasket().map(b => (
                      <div key={b.grainType} className="bg-white p-3 rounded-lg border border-outline-variant/20 text-center">
                        <p className="text-xs font-semibold text-on-surface-variant uppercase">{b.name}</p>
                        <p className="text-lg font-black text-primary">{b.quantity} <span className="text-sm">kg</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleDistributeClick}
                className="w-full bg-primary text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 text-base shadow-sm hover:shadow-md transition-all"
              >
                <Package className="w-5 h-5" /> Record Distribution
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Popup */}
      {showAuthPopup && selectedCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            {authState === 'idle' && (
              <>
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Fingerprint className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-on-surface mb-1">Biometric Authentication</h2>
                <p className="text-sm text-on-surface-variant mb-6">Ask {selectedCard.members?.[memberIndex]?.name} to place their thumb on the scanner.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowAuthPopup(false)} className="flex-1 bg-surface-variant text-on-surface font-bold py-3 rounded-xl hover:bg-surface-variant/80 transition-colors">Cancel</button>
                  <button onClick={simulateBiometric} className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors">Authenticate</button>
                </div>
              </>
            )}
            {authState === 'scanning' && (
              <div className="py-8">
                <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                <h2 className="text-lg font-bold text-on-surface animate-pulse">Scanning fingerprint...</h2>
              </div>
            )}
            {authState === 'success' && (
              <div className="py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-green-700">Authenticated!</h2>
                <p className="text-sm text-green-600 mt-2">Recording distribution...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Distribution;
