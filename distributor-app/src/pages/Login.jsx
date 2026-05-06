import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Lock, User, AlertCircle } from 'lucide-react';
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
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        // Ensure they have the distributor role
        if (res.data.user.role === 'DISTRIBUTOR' || res.data.user.role === 'STATE_ADMIN') {
          navigate('/dashboard');
        } else {
          setError('Unauthorized: You must be a distributor to access this app.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: "url('/distributor_bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-yellow-900/40 backdrop-blur-[2px]"></div>

      <div className="relative z-10 bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/20">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-yellow-600/90 rounded-2xl shadow-lg flex items-center justify-center backdrop-blur-md border border-white/20">
            <Package className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-white mb-2">Distributor Login</h1>
        <p className="text-center text-sm text-yellow-50/90 mb-6 font-medium">Offline-First Ration Distribution System</p>
        
        <form className="space-y-5" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl flex items-center text-red-100 text-sm font-medium backdrop-blur-md">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-1.5 ml-1">Username / Device ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-yellow-200" />
              </div>
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-white placeholder-yellow-100/50 transition-all" 
                placeholder="Enter username" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-1.5 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-yellow-200" />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 px-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-white placeholder-yellow-100/50 transition-all" 
                placeholder="Enter password" 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-yellow-600/90 hover:bg-yellow-500 text-white font-bold py-3.5 rounded-xl mt-8 transition-all shadow-lg shadow-yellow-900/50 border border-white/10 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
          >
            {loading ? 'Authenticating...' : 'Login Offline'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
