import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

let socket;

const Login = () => {
  console.log('Login component rendered');
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

    // Connect to the server temporarily to handle login
    console.log(import.meta.env.VITE_SOCKET_URL);
    const tempSocket = io(import.meta.env.VITE_SOCKET_URL); // No auth for login

    tempSocket.on('connect', () => {
      console.log('TempSocket connected');
    });

    tempSocket.on('connect_error', (err) => {
      console.error('TempSocket connection error:', err);
    });

    // Handle login response
    tempSocket.emit('login', { username, password }, (response) => {
      if (response.success) {
        // Save token to local storage
        localStorage.setItem('token', response.token);
        console.log('Login successful:', response.token);

        // Establish persistent socket connection with authentication
        socket = io(import.meta.env.VITE_SOCKET_URL, {
          auth: { token: localStorage.getItem('token') },
        });

        navigate('/dashboard');
      } else {
        setError('Login failed: ' + response.error);
        console.error('Error Token:', response.token);
        console.error('Login failed:', response.error);
      }
      tempSocket.disconnect();
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