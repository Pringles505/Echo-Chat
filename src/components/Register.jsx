import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Buffer } from 'buffer';

import init, { generate_private_key, generate_public_key } from '/dh-wasm/pkg';
import init_xeddsa, { convert_x25519_to_xeddsa, compute_determenistic_nonce, 
  compute_nonce_point, derive_ed25519_keypair_from_x25519, compute_challenge_hash, 
  compute_signature_scaler, compute_signature} from '/xeddsa-wasm/pkg';

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
    await init_xeddsa();

    // Generate the identity pair
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));

    const privateKey = generate_private_key(randomBytes);
    const publicKey = generate_public_key(privateKey);
    const privatePreKey = generate_private_key(randomBytes);
    const publicPreKey = generate_public_key(privatePreKey);

    console.log("Private Key:", new Uint8Array(privateKey));
    console.log("Public Key:", new Uint8Array(publicKey));
    console.log("Private Pre Key:", new Uint8Array(privatePreKey));
    console.log("Public Pre Key:", new Uint8Array(publicPreKey));


    const xeddsaKey = convert_x25519_to_xeddsa(publicKey);
    const edPrivScaler = xeddsaKey.slice(0, 32);
    const prefix = xeddsaKey.slice(32, 64);
    const deterministicNonce = compute_determenistic_nonce(prefix, publicPreKey);
    const noncePoint = compute_nonce_point(deterministicNonce);
    const publicEdKey = derive_ed25519_keypair_from_x25519(publicPreKey);
    const challenge_hash = compute_challenge_hash(noncePoint,publicEdKey, publicPreKey);
    const signature_scaler = compute_signature_scaler(deterministicNonce, challenge_hash, edPrivScaler);
    const signature = compute_signature(noncePoint, signature_scaler);
    
    console.log('Xeddsa Public Key:', convert_x25519_to_xeddsa(publicKey));
    console.log('Deterministic nonce:', deterministicNonce);
    console.log('Nonce Point:', noncePoint);
    console.log('publicEdKey:', publicEdKey);
    console.log('Challenge Hash:', challenge_hash);
    console.log('Signature Scaler:', signature_scaler);
    console.log('Signature:', signature);


    // Emit the registration event
    const publicKeyString = Buffer.from(publicKey).toString('base64');
    const publicPreKeyString = Buffer.from(publicPreKey).toString('base64');

    const arrayBufferToBase64 = (buffer) => {
      return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    };
    
    const privatePreKeyBase64 = arrayBufferToBase64(privatePreKey);
    const privateKeyBase64 = arrayBufferToBase64(privateKey);

    localStorage.setItem("privateKey", privateKeyBase64);
    localStorage.setItem("privateKey", privatePreKeyBase64);

    const keyBundle = {
      publicIdentityKey: publicKeyString,
      publicPreKey: publicPreKeyString,
      signature: signature,
    }

    console.log('Key bundle:', keyBundle);

    socket.emit('register', { username, password, keyBundle }, (response) => {
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