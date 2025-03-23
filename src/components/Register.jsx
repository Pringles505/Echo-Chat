import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Buffer } from 'buffer';

import init, { generate_private_key, generate_public_key } from '/dh-wasm/pkg';


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
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const privateKey = generate_private_key(randomBytes);
    const publicKey = generate_public_key(privateKey);


    console.log("Private Key:", new Uint8Array(privateKey));
    console.log("Public Key:", new Uint8Array(publicKey));


    // Emit the registration event
    const publicKeyString = Buffer.from(publicKey).toString('base64');
    const arrayBufferToBase64 = (buffer) => {
      return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    };
    
    const privateKeyBase64 = arrayBufferToBase64(privateKey);
    localStorage.setItem("privateKey", privateKeyBase64);

    socket.emit('register', { username, password, publicKeyString }, (response) => {
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