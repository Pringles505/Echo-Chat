import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

import CryptoJS from 'crypto-js'; 


// IMPORTANTE CAMBIAR PARA DEPLOY
// const socket = io('https://chattuah-backend.onrender.com');

const socket = io('localhost:3001');

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();

    if (!username || !password) {
      console.error('Username and password cannot be empty');
      return;
    }

    const hashedPassword = CryptoJS.SHA256(password).toString();
    console.log('Registering with', username, hashedPassword);

    socket.emit('register', {username, hashedPassword}, (response) => {
      if (response.success){
        navigate('/login');
      }else {
        console.error('Registration failed:', response.error);
      }
    })
    navigate('/login'); 
  };

  return (
    <div className="register-container">
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
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
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;