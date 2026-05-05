import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import GrainManagement from './pages/GrainManagement';
import Complaints from './pages/Complaints';
import RationCards from './pages/RationCards';
import Logistics from './pages/Logistics';
import Transactions from './pages/Transactions';
import Sidebar from './components/Sidebar';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" replace />;
};

// Layout wrapper that includes the Sidebar
const AdminLayout = ({ children }) => (
  <div className="flex min-h-screen bg-surface-variant/30">
    <Sidebar />
    <main className="flex-1 overflow-y-auto">
      {children}
    </main>
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-on-background flex flex-col">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><AdminLayout><Dashboard /></AdminLayout></PrivateRoute>} />
          <Route path="/transactions" element={<PrivateRoute><AdminLayout><Transactions /></AdminLayout></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><AdminLayout><UserManagement /></AdminLayout></PrivateRoute>} />
          <Route path="/grains" element={<PrivateRoute><AdminLayout><GrainManagement /></AdminLayout></PrivateRoute>} />
          <Route path="/complaints" element={<PrivateRoute><AdminLayout><Complaints /></AdminLayout></PrivateRoute>} />
          <Route path="/ration-cards" element={<PrivateRoute><AdminLayout><RationCards /></AdminLayout></PrivateRoute>} />
          <Route path="/logistics" element={<PrivateRoute><AdminLayout><Logistics /></AdminLayout></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
