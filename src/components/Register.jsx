import { useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { Buffer } from "buffer";
import Navbar from "../components/HomepageComponents/Navbar";
import ParticlesBackground from "../components/HomepageComponents/ParticlesBackground";
import WaveBackground from "../components/HomepageComponents/WaveBackground";
import "./styles/SignIn.css";

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
  verify_signature,
  test_sign_and_verify,
} from "/xeddsa-wasm/pkg";

const socket = io(import.meta.env.VITE_SOCKET_URL);

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      console.error("Username and password cannot be empty");
      return;
    }

    console.log("Registering with", username, password);

    // Initialize the WASM module
    await init();
    await init_xeddsa();

    // Generate the identity pair
    const randomBytes_IK = crypto.getRandomValues(new Uint8Array(32));
    const randomBytes_SPK = crypto.getRandomValues(new Uint8Array(32));

    const privateKey = generate_ed25519_private_key(randomBytes_IK);
    const publicKey = generate_ed25519_public_key(privateKey);

    const privatePreKey = generate_private_prekey(randomBytes_SPK);
    const publicPreKey = generate_public_prekey(privatePreKey);

    console.log("Private Key: Ed25519", new Uint8Array(privateKey));
    console.log("Public Key Ed25519:", new Uint8Array(publicKey));
    console.log("Private Pre Key:", new Uint8Array(privatePreKey));
    console.log("Public Pre Key:", new Uint8Array(publicPreKey));

    const x25519_key_pair = derive_x25519_from_ed25519_private(privateKey);
    const { x25519_private_key, x25519_public_key } = x25519_key_pair;

    console.log("X25519 Private Key:", new Uint8Array(x25519_private_key));
    console.log("X25519 Public Key:", new Uint8Array(x25519_public_key));

    const xeddsaKey = convert_x25519_to_xeddsa(privateKey);
    const edPrivScaler = xeddsaKey.slice(0, 32);
    const prefix = xeddsaKey.slice(32, 64);
    const deterministicNonce = compute_determenistic_nonce(
      prefix,
      publicPreKey
    );
    const noncePoint = compute_nonce_point(deterministicNonce);
    const publicEdKey = derive_ed25519_keypair_from_x25519(privateKey);
    const challenge_hash = compute_challenge_hash(
      noncePoint,
      publicEdKey,
      publicPreKey
    );
    const signature_scaler = compute_signature_scaler(
      deterministicNonce,
      challenge_hash,
      edPrivScaler
    );
    const signature = compute_signature(noncePoint, signature_scaler);

    console.log("Signing with:");
    console.log("edPrivScaler", Array.from(edPrivScaler));
    console.log("publicEdKey", Array.from(publicEdKey));
    console.log("publicPreKey (message)", Array.from(publicPreKey));

    console.log("Xeddsa Public Key:", convert_x25519_to_xeddsa(privateKey));
    console.log("Deterministic nonce:", deterministicNonce);
    console.log("Nonce Point:", noncePoint);
    console.log("publicEdKey:", publicEdKey);
    console.log("Challenge Hash:", challenge_hash);
    console.log("Signature Scaler:", signature_scaler);
    console.log("Signature:", signature);
    // RIGHT AFTER generating it, call:
    console.log("Verifying with:", {
      signature: Array.from(signature),
      message: Array.from(publicPreKey),
      publicEdKey: Array.from(publicEdKey),
    });

    const valid = verify_signature(signature, publicPreKey, publicEdKey);
    console.log("Valid?", valid);
    console.log(signature.length, publicEdKey.length);

    console.log("Verifying with:");
    console.log("signature", Array.from(signature));
    console.log("message", Array.from(publicPreKey));
    console.log("publicEdKey", Array.from(publicEdKey));
    console.log(
      "Signature Verification:",
      verify_signature(signature, publicPreKey, publicEdKey)
    );
    console.log(
      "Rust sign+verify self-test:",
      test_sign_and_verify(publicPreKey, privateKey)
    );
    console.log("R (noncePoint)", Array.from(noncePoint));
    console.log("S (signature_scalar)", Array.from(signature_scaler));
    console.log("PublicEdKey used in signature", Array.from(publicEdKey));
    console.log("PreKey used as message", Array.from(publicPreKey));
    console.log("Challenge hash (k)", Array.from(challenge_hash));

    // Emit the registration event
    const publicKeyStringX25519 =
      Buffer.from(x25519_public_key).toString("base64");
    const publicKeyStringED25519 = Buffer.from(publicKey).toString("base64");
    const publicPreKeyString = Buffer.from(publicPreKey).toString("base64");
    const signatureString = Buffer.from(signature).toString("base64");

    const arrayBufferToBase64 = (buffer) => {
      return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    };

    const privatePreKeyBase64 = arrayBufferToBase64(privatePreKey);
    const ed25519PrivateKeyBase64 = arrayBufferToBase64(privateKey);
    const x25519PrivateKeyBase64 = arrayBufferToBase64(x25519_private_key);
    const x25519PublicKeyBase64 = arrayBufferToBase64(x25519_public_key);

    localStorage.setItem("privateKeyEd25519", ed25519PrivateKeyBase64);
    localStorage.setItem("privateKeyX25519", x25519PrivateKeyBase64);
    localStorage.setItem("publicKeyX25519", x25519PublicKeyBase64);
    localStorage.setItem("privatePreKey", privatePreKeyBase64);

    const keyBundle = {
      publicIdentityKeyX25519: publicKeyStringX25519,
      publicIdentityKeyEd25519: publicKeyStringED25519,
      publicSignedPreKey: [publicPreKeyString, signatureString],
    };

    console.log("Key bundle:", keyBundle);

    socket.emit("register", { username, password, keyBundle }, (response) => {
      if (response.success) {
        navigate("/login");
      } else {
        console.error("Registration failed:", response.error);
      }
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3l18 18"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.477 10.477a3 3 0 104.046 4.046"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5c4.477 0 8.268 2.943 9.542 7-1.18 3.753-4.614 6.518-8.665 6.902"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6.343 6.343A9.957 9.957 0 003 12c1.274 4.057 5.065 7 9.542 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
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
              Create Account
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
