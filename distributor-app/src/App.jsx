import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Distribution from './pages/Distribution';
import Sync from './pages/Sync';
import Complaints from './pages/Complaints';
import Shipments from './pages/Shipments';
import Sidebar from './components/Sidebar';
import OfflineBanner from './components/OfflineBanner';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

import { startLiveSync } from './db';

const DistributorLayout = ({ children }) => {
  React.useEffect(() => {
    // Start global sync so that ration_cards and shipments are always fetched 
    // in the background while online.
    const syncHandler = startLiveSync();
    return () => syncHandler && syncHandler.cancel();
  }, []);

  return (
    <div className="flex min-h-screen bg-surface-variant/30">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-on-background flex flex-col">
        <OfflineBanner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><DistributorLayout><Dashboard /></DistributorLayout></PrivateRoute>} />
          <Route path="/distribution" element={<PrivateRoute><DistributorLayout><Distribution /></DistributorLayout></PrivateRoute>} />
          <Route path="/shipments" element={<PrivateRoute><DistributorLayout><Shipments /></DistributorLayout></PrivateRoute>} />
          <Route path="/sync" element={<PrivateRoute><DistributorLayout><Sync /></DistributorLayout></PrivateRoute>} />
          <Route path="/complaints" element={<PrivateRoute><DistributorLayout><Complaints /></DistributorLayout></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
