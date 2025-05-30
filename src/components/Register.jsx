import { useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { Buffer } from "buffer";
import init, {
  generate_ed25519_private_key,
  generate_ed25519_public_key,
  generate_public_prekey,
  generate_private_prekey,
  derive_x25519_from_ed25519_private,
} from "/dh-wasm/pkg";
import init_xeddsa, {
  convert_x25519_to_xeddsa,
  compute_determenistic_nonce,
  compute_nonce_point,
  derive_ed25519_keypair_from_x25519,
  compute_challenge_hash,
  compute_signature_scaler,
  compute_signature,
} from "/xeddsa-wasm/pkg";

import Navbar from "../components/HomepageComponents/Navbar";
import ParticlesBackground from "../components/HomepageComponents/ParticlesBackground";
import WaveBackground from "../components/HomepageComponents/WaveBackground";
import "./styles/SignIn.css";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Username and password cannot be empty");
      return;
    }

    await init();
    await init_xeddsa();

    const randomBytes_IK = crypto.getRandomValues(new Uint8Array(32));
    const randomBytes_SPK = crypto.getRandomValues(new Uint8Array(32));

    const privateKey = generate_ed25519_private_key(randomBytes_IK);
    const publicKey = generate_ed25519_public_key(privateKey);

    const privatePreKey = generate_private_prekey(randomBytes_SPK);
    const publicPreKey = generate_public_prekey(privatePreKey);

    const x25519_key_pair = derive_x25519_from_ed25519_private(privateKey);
    const { x25519_private_key, x25519_public_key } = x25519_key_pair;

    const xeddsaKey = convert_x25519_to_xeddsa(privateKey);
    const edPrivScaler = xeddsaKey.slice(0, 32);
    const prefix = xeddsaKey.slice(32, 64);
    const deterministicNonce = compute_determenistic_nonce(prefix, publicPreKey);
    const noncePoint = compute_nonce_point(deterministicNonce);
    const publicEdKey = derive_ed25519_keypair_from_x25519(privateKey);
    const challenge_hash = compute_challenge_hash(noncePoint, publicEdKey, publicPreKey);
    const signature_scaler = compute_signature_scaler(deterministicNonce, challenge_hash, edPrivScaler);
    const signature = compute_signature(noncePoint, signature_scaler);

    const socket = io(import.meta.env.VITE_SOCKET_URL);
    socket.emit("register", {
      username,
      password,
      publicKey: Array.from(publicKey),
      publicPreKey: Array.from(publicPreKey),
      x25519_public_key: Array.from(x25519_public_key),
      publicEdKey: Array.from(publicEdKey),
      signature: Array.from(signature),
    }, (response) => {
      if (response.success) {
        navigate("/login");
      } else {
        setError(response.error || "Registration failed");
      }
      socket.disconnect();
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-background)]">
      <Navbar />
      <ParticlesBackground />
      <WaveBackground />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="form-container w-full max-w-md bg-[var(--color-background)]/50 backdrop-blur-md rounded-xl p-6 border border-[var(--color-primary)]/30 shadow-xl relative z-10">
          <h2 className="text-2xl font-bold text-center mb-6 text-[var(--color-secondary)]">
            Register
          </h2>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[var(--color-text)]/80 mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-text)]/80 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--color-background)]/20 border border-[var(--color-primary)]/30 rounded-lg text-black placeholder-black/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all pr-10"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-black hover:text-[#514b96]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-.948.135-1.865.388-2.737m3.012 3.5a3.003 3.003 0 014.243-4.243m4.95 1.757a3 3 0 00-4.243 4.243m4.95 1.757A10.05 10.05 0 0112 19c5.523 0 10-4.477 10-10 0-.948-.135-1.865-.388-2.737m-3.012 3.5l-6.36 6.36" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-.914 2.848-3.028 5.21-5.697 6.188M15 12h.01" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-[#514b96] to-[#8e79f2] text-white font-medium rounded-lg hover:opacity-90 transition-all active:scale-[0.98] shadow-md"
            >
              Register
            </button>

            <p className="text-center text-sm text-[var(--color-text)]/60 mt-4">
              Already have an account?{" "}
              <a href="/login" className="register-link">
                Sign in
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
