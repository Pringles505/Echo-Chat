import { useState } from 'react';
import {useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

import CryptoJS from 'crypto-js'; 

// IMPORTANTE CAMBIAR PARA DEPLOY
// const socket = io('https://chattuah-backend.onrender.com');

const socket = io('localhost:3001');

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {

    if (!username || !password) {
      console.error('Username and password cannot be empty');
      return;
    }

    e.preventDefault();
    const hashedPassword = CryptoJS.SHA256(password).toString();

    console.log('Logging in with', username, password);
    console.log('HasehdPassword', hashedPassword);

    socket.emit('login', {username, hashedPassword}, (response) => {
      if (response.success){
        navigate('/chat');
      }else {
        console.error('Login failed:', response.error);
      }
    })
    navigate('/chat');
  };

  const handleNavigateToRegister = () => {
    navigate('/register');
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
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

        <button onClick={handleNavigateToRegister}>
          Register</button>
      </form>
    </div>
  );
};

export default Login;