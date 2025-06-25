import { useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import init from "/dh-wasm/pkg";
import Navbar from "../components/HomepageComponents/Navbar";
import ParticlesBackground from "../components/HomepageComponents/ParticlesBackground";
import WaveBackground from "../components/HomepageComponents/WaveBackground";
import "./styles/SignIn.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Username and password cannot be empty");
      return;
    }

    await init();
    const tempSocket = io(import.meta.env.VITE_SOCKET_URL);

    tempSocket.emit("login", { username, password }, (response) => {
      if (response.success) {
        localStorage.setItem("token", response.token);
        navigate("/dashboard");
      } else {
        setError(response.error || "Login failed");
      }
      tempSocket.disconnect();
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-primary-1000">
      <Navbar />
      <ParticlesBackground />
      <WaveBackground />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="form-container w-full max-w-md bg-[var(--color-background)]/50 backdrop-blur-md rounded-xl p-6 border border-[var(--color-primary)]/30 shadow-xl relative z-10">
          <h2 className="text-2xl font-bold text-center mb-6 text-white">
            Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-white mb-2"
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
                className="block text-sm font-medium text-white mb-2"
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
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 text-black/60 hover:text-[#514b96]"
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

            {error && <p className="text-sm text-white">{error}</p>}

            <button
              type="submit"
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-[#514b96] to-[#8e79f2] text-white font-medium rounded-lg hover:opacity-90 transition-all active:scale-[0.98] shadow-md"
            >
              Sign In
            </button>

            <p className="text-center text-sm text-white mt-4">
              Don't have an account?{" "}
              <a href="/register" className="text-white hover:text-[#514b96]">
                Register now
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
