import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io(import.meta.env.VITE_SOCKET_URL);

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Username and password cannot be empty');
      console.error('Username and password cannot be empty');
      return;
    }

    const hashedPassword = CryptoJS.SHA256(password).toString();
    console.log('Logging in with', username, password);
    console.log('HashedPassword', hashedPassword);

    socket.emit('login', { username, hashedPassword }, (response) => {
      if (response.success) {
        navigate('/dashboard');
      } else {
        setError('Login failed: ' + response.error);
        console.error('Login failed:', response.error);
      }
    });
  };

  const handleNavigateToRegister = () => {
    navigate('/register');
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account?{' '}
        <button onClick={handleNavigateToRegister} className="register-link">
          Register
        </button>
      </p>
    </div>
  );
};

export default Login;