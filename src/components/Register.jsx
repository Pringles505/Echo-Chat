import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

import init, { generate_private_key as testFunc } from '/dh-wasm/pkg';


const socket = io(import.meta.env.VITE_SOCKET_URL);

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      console.error('Username and password cannot be empty');
      return;
    }

    console.log('Registering with', username, password);

    // Initialize the WASM module
    await init();

    // Generate the identity pair
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);

    const privateKey = testFunc(randomBytes);

    console.log('Identity:', new Uint8Array(privateKey));

    // Emit the registration event
    socket.emit('register', { username, password }, (response) => {
      if (response.success) {
        navigate('/login');
      } else {
        console.error('Registration failed:', response.error);
      }
    });
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