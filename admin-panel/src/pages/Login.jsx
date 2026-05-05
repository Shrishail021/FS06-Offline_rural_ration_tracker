import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import axios from 'axios';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      });

      if (res.data.success) {
        localStorage.setItem('adminToken', res.data.token);
        localStorage.setItem('adminUser', JSON.stringify(res.data.user));
        
        if (res.data.user.role === 'STATE_ADMIN' || res.data.user.role === 'DISTRICT_ADMIN') {
          navigate('/dashboard');
        } else {
          setError('Unauthorized: Admin privileges required.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-variant/30">
      <div className="bg-white p-8 rounded-2xl shadow-modal max-w-md w-full border border-outline-variant/20">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-2xl shadow-sm flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-primary mb-2">State Admin Portal</h1>
        <p className="text-center text-sm text-on-surface-variant mb-6">Centralized Ration Management Dashboard</p>
        
        <form className="space-y-4" onSubmit={handleLogin}>
          {error && (
            <div className="bg-error/10 border border-error/20 p-3 rounded-xl flex items-center text-error text-sm font-medium">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1">Admin ID / Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-on-surface-variant" />
              </div>
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                placeholder="Enter admin ID" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-on-surface-variant" />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 px-4 py-3 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                placeholder="Enter password" 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-primary text-white font-bold py-3 rounded-xl mt-6 transition-colors shadow-sm ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90 hover:shadow-md'}`}
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
