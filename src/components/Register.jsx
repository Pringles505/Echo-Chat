import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Buffer } from 'buffer';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import PhoneInput from 'react-phone-input-2';
import { Shield } from 'lucide-react';
import 'react-phone-input-2/lib/style.css';
import '../styles/Register.css'

import init, { generate_private_key, generate_public_key } from '/dh-wasm/pkg';
import init_xeddsa, { 
  convert_x25519_to_xeddsa, 
  compute_determenistic_nonce, 
  compute_nonce_point, 
  derive_ed25519_keypair_from_x25519, 
  compute_challenge_hash, 
  compute_signature_scaler, 
  compute_signature, 
  verify_signature
} from '/xeddsa-wasm/pkg';

const socket = io(import.meta.env.VITE_SOCKET_URL);

const Register = () => {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ username: '', phone: '', password: '', confirmPassword: '' });
  const navigate = useNavigate();

  const validateUsername = (value) => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers and underscore';
    const lastChar = value[value.length - 1];
    if (!/[a-zA-Z0-9_]/.test(lastChar)) return 'Username cannot end with a special character';
    return '';
  };

  const validatePhone = (value) => {
    if (!value) return 'Phone number is required';
    if (value.length < 6) return 'Please enter a valid phone number';
    return '';
  };

  const validatePassword = (value) => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Password must contain at least one special character';
    return '';
  };

  const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return '';
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const usernameError = validateUsername(username);
    const phoneError = validatePhone(phone);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);

    if (usernameError || phoneError || passwordError || confirmPasswordError) {
      setErrors({
        username: usernameError,
        phone: phoneError,
        password: passwordError,
        confirmPassword: confirmPasswordError
      });
      setIsLoading(false);
      return;
    }

    try {
      await init();
      await init_xeddsa();

      const randomBytes = crypto.getRandomValues(new Uint8Array(32));

      const privateKey = generate_private_key(randomBytes);
      const publicKey = generate_public_key(privateKey);
      const privatePreKey = generate_private_key(randomBytes);
      const publicPreKey = generate_public_key(privatePreKey);

      const xeddsaKey = convert_x25519_to_xeddsa(privateKey);
      const edPrivScaler = xeddsaKey.slice(0, 32);
      const prefix = xeddsaKey.slice(32, 64);
      const deterministicNonce = compute_determenistic_nonce(prefix, publicPreKey);
      const noncePoint = compute_nonce_point(deterministicNonce);
      const publicEdKey = derive_ed25519_keypair_from_x25519(privateKey);
      const challenge_hash = compute_challenge_hash(noncePoint, publicEdKey, publicPreKey);
      const signature_scaler = compute_signature_scaler(deterministicNonce, challenge_hash, edPrivScaler);
      const signature = compute_signature(noncePoint, signature_scaler);

      const valid = verify_signature(signature, publicPreKey, publicEdKey);
      console.log("Signature verification:", valid);

      const publicKeyString = Buffer.from(publicKey).toString('base64');
      const publicPreKeyString = Buffer.from(publicPreKey).toString('base64');
      const signatureString = Buffer.from(signature).toString('base64');

      const arrayBufferToBase64 = (buffer) => {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
      };
      
      const privatePreKeyBase64 = arrayBufferToBase64(privatePreKey);
      const privateKeyBase64 = arrayBufferToBase64(privateKey);

      localStorage.setItem("privateKey", privateKeyBase64);
      localStorage.setItem("privatePreKey", privatePreKeyBase64);

      const keyBundle = {
        publicIdentityKey: publicKeyString,
        publicSignedPreKey: [
          publicPreKeyString,
          signatureString,
        ]
      };

      socket.emit('register', { username, phone, password, keyBundle }, (response) => {
        if (response.success) {
          navigate('/login');
        } else {
          setErrors({
            ...errors,
            username: response.error || 'Registration failed'
          });
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({
        ...errors,
        username: 'An error occurred during registration'
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Registration form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/echo-logo.svg" alt="Echo Logo" className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="mt-2 text-gray-600">Please fill in the details below</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.username ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your username"
                disabled={isLoading}
              />
              {errors.username && <span className="mt-1 text-sm text-red-600">{errors.username}</span>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <PhoneInput
                country={'es'}
                value={phone}
                onChange={setPhone}
                inputProps={{
                  id: 'phone',
                  disabled: isLoading,
                  className: errors.phone ? 'border-red-300' : 'border-gray-300'
                }}
                containerClass="phone-input-container"
                buttonClass="phone-input-button"
                dropdownClass="phone-input-dropdown"
              />
              {errors.phone && <span className="mt-1 text-sm text-red-600">{errors.phone}</span>}
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
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
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
              {errors.password && <span className="mt-1 text-sm text-red-600">{errors.password}</span>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <HiEyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <HiEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && <span className="mt-1 text-sm text-red-600">{errors.confirmPassword}</span>}
            </div>

            <button 
              type="submit" 
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Already have an account? {' '}
              <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </a>
            </p>
          </form>
        </div>
      </div>

      {/* Right side - Decorative section */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-indigo-600">
        <div className="max-w-2xl text-center text-white p-8">
          <Shield className="w-24 h-24 mx-auto mb-8 opacity-75" />
          <h2 className="text-4xl font-bold mb-4">Join Our Community</h2>
          <p className="text-xl opacity-75">
            Create an account to access all features and connect with others in our secure platform.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;