import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Buffer } from 'buffer';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import { Lock } from 'lucide-react';
import '../styles/Login.css'

import init, { generate_private_key, generate_public_key } from '/dh-wasm/pkg';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!username || !password) {
      setError('Username and password cannot be empty');
      setIsLoading(false);
      return;
    }

    try {
      await init();

      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const privatePreKey = generate_private_key(randomBytes);
      const publicPreKey = generate_public_key(privatePreKey);

      const publicPreKeyString = Buffer.from(publicPreKey).toString('base64');
      const arrayBufferToBase64 = (buffer) => {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
      };

      const privateKeyBase64 = arrayBufferToBase64(privatePreKey);
      localStorage.setItem("privatePreKey", privateKeyBase64);

      const tempSocket = io(import.meta.env.VITE_SOCKET_URL);

      tempSocket.on('connect_error', (err) => {
        console.error('Connection error:', err);
        setError('Connection failed. Please try again.');
        setIsLoading(false);
      });

      tempSocket.emit('login', { username, password }, (response) => {
        if (response.success) {
          localStorage.setItem('token', response.token);
          navigate('/dashboard');
        } else {
          setError(response.error || 'Invalid username or password');
        }
        setIsLoading(false);
        tempSocket.disconnect();
      });
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/echo-logo.svg" alt="Echo Logo" className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-600">Please sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <HiEyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <HiEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button 
              type="submit" 
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Don't have an account? {' '}
              <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                Create account
              </a>
            </p>
          </form>
        </div>
      </div>

      {/* Right side - Decorative section */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-indigo-600">
        <div className="max-w-2xl text-center text-white p-8">
          <Lock className="w-24 h-24 mx-auto mb-8 opacity-75" />
          <h2 className="text-4xl font-bold mb-4">Secure by Design</h2>
          <p className="text-xl opacity-75">
            Your security is our top priority. We use state-of-the-art encryption to protect your data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;