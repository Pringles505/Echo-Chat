import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import {
  User,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Shield,
  Smartphone,
  MessageSquare,
  Lock,
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";
import ReactFlagsSelect from "react-flags-select";
import Login from "./components/Login";
import Register from "./components/Register";
import Chat from "./components/Dashboard/Chat";
import Dashboard from "./components/Dashboard/Dashboard";
import PrivateRoute from "./components/Dashboard/PrivateRoute";
import { AuthModal } from "./components/AuthModal";
import { ChatWidget } from "./components/ChatWidget";
import "./i18n";
import "./App.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

gsap.registerPlugin(ScrollTrigger);

function App() {
  const { t, i18n } = useTranslation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState("GB");
  const featuresRef = useRef(null);
  const securityRef = useRef(null);
  const [authType, setAuthType] = useState("login");

  const handleFlagSelect = (countryCode) => {
    if (countryCode && ["GB", "ES", "RU"].includes(countryCode)) {
      setSelectedFlag(countryCode);
      const langMap = {
        GB: "en",
        ES: "es",
        RU: "ru",
      };
      i18n.changeLanguage(langMap[countryCode]);
    }
  };

  useEffect(() => {
    if (featuresRef.current) {
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top center",
          toggleActions: "play none none reverse",
        },
        opacity: 0,
        y: 100,
        stagger: 0.2,
        duration: 1,
        ease: "power2.out",
      });

      const featureCards = document.querySelectorAll(".feature-card");
      featureCards.forEach((card) => {
        card.addEventListener("mouseenter", () => {
          gsap.to(card, { scale: 1.05, duration: 0.2, ease: "power2.out" });
        });
        card.addEventListener("mouseleave", () => {
          gsap.to(card, { scale: 1, duration: 0.2, ease: "power2.out" });
        });
      });
    }

    if (securityRef.current) {
      gsap.from(securityRef.current, {
        scrollTrigger: {
          trigger: securityRef.current,
          start: "top center",
          toggleActions: "play none none reverse",
        },
        opacity: 0,
        scale: 0.8,
        duration: 1,
        ease: "power2.out",
      });
    }

    const particlesContainer = document.getElementById("particles-container");
    const particleCount = 80;

    if (particlesContainer) {
      for (let i = 0; i < particleCount; i++) {
        createParticle();
      }

      function createParticle() {
        const particle = document.createElement("div");
        particle.className = "particle";

        const size = Math.random() * 3 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        resetParticle(particle);

        particlesContainer.appendChild(particle);

        animateParticle(particle);
      }

      function resetParticle(particle) {
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;

        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.opacity = "0";

        return {
          x: posX,
          y: posY,
        };
      }

      function animateParticle(particle) {
        const pos = resetParticle(particle);

        const duration = Math.random() * 10 + 10;
        const delay = Math.random() * 5;

        setTimeout(() => {
          particle.style.transition = `all ${duration}s linear`;
          particle.style.opacity = Math.random() * 0.3 + 0.1;

          const moveX = pos.x + (Math.random() * 20 - 10);
          const moveY = pos.y - Math.random() * 30;

          particle.style.left = `${moveX}%`;
          particle.style.top = `${moveY}%`;

          setTimeout(() => {
            animateParticle(particle);
          }, duration * 1000);
        }, delay * 1000);
      }

      document.addEventListener("mousemove", (e) => {
        const mouseX = (e.clientX / window.innerWidth) * 100;
        const mouseY = (e.clientY / window.innerHeight) * 100;

        const particle = document.createElement("div");
        particle.className = "particle";

        const size = Math.random() * 4 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        particle.style.left = `${mouseX}%`;
        particle.style.top = `${mouseY}%`;
        particle.style.opacity = "0.6";

        particlesContainer.appendChild(particle);

        setTimeout(() => {
          particle.style.transition = "all 2s ease-out";
          particle.style.left = `${mouseX + (Math.random() * 10 - 5)}%`;
          particle.style.top = `${mouseY + (Math.random() * 10 - 5)}%`;
          particle.style.opacity = "0";

          setTimeout(() => {
            particle.remove();
          }, 2000);
        }, 10);

        const spheres = document.querySelectorAll(".gradient-sphere");
        const moveX = (e.clientX / window.innerWidth - 0.5) * 5;
        const moveY = (e.clientY / window.innerHeight - 0.5) * 5;

        spheres.forEach((sphere) => {
          const currentTransform = getComputedStyle(sphere).transform;
          sphere.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
      });
    }
  }, [i18n]);

  return (
    <Router>
      <div
        id="particles-container"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <div className="gradient-background">
          <div className="gradient-sphere sphere-1"></div>
          <div className="gradient-sphere sphere-2">
            {" "}
            <img src="./echo-logo.svg" alt="Logo Echo" className="svg-inside" />
          </div>
          <div className="gradient-sphere sphere-3"></div>
          <div className="glow"></div>
          <div className="grid-overlay"></div>
          <div className="noise-overlay"></div>
        </div>
      </div>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <header className="header">
                <div className="header-content">
                  <img
                    src="/echo-logo-light.svg"
                    alt="Echo Logo"
                    className="logo"
                  />
                  <nav className="nav-links">
                    <a href="#home" className="nav-link">
                      {t("nav.home")}
                    </a>
                    <a href="#features" className="nav-link">
                      {t("nav.features")}
                    </a>
                    <a href="#security" className="nav-link">
                      {t("nav.security")}
                    </a>
                    <a href="#contact" className="nav-link">
                      {t("nav.contact")}
                    </a>

                    <div className="auth-buttons">
                      <button
                        href="login"
                        className="btn btn-outline"
                        onClick={() => {
                          setAuthType("login");
                          setAuthModalOpen(true);
                        }}
                      >
                        {t("nav.login")}
                      </button>
                      <button
                        href="register"
                        className="btn btn-primary"
                        onClick={() => {
                          setAuthType("register");
                          setAuthModalOpen(true);
                        }}
                      >
                        {t("nav.register")}
                      </button>
                    </div>
                    <div className="language-selector">
                      <ReactFlagsSelect
                        selected={selectedFlag}
                        onSelect={handleFlagSelect}
                        countries={["GB", "ES", "RU"]}
                        customLabels={{ GB: "EN", ES: "ES", RU: "RU" }}
                        selectButtonClassName="react-flag-select-btn"
                        menuClassName="react-flag-select-menu"
                        optionClassName="react-flag-select-option"
                      />
                    </div>
                  </nav>
                </div>
              </header>
              <section className="section hero" id="home">
                <div className="hero-content">
                  <h1>{t("hero.title")}</h1>
                  <p>{t("hero.subtitle")}</p>
                  <button className="btn btn-primary">{t("hero.cta")}</button>

                  <div
                    style={{
                      height: "300px",
                      marginTop: "2rem",
                      width: "100%",
                    }}
                  >
                    <Canvas camera={{ position: [0, 0, 5] }}>
                      <ambientLight intensity={0.5} />
                      <pointLight position={[10, 10, 10]} />
                      <OrbitControls enableZoom={false} autoRotate />
                    </Canvas>
                  </div>
                </div>
              </section>
              <section
                className="section features"
                id="features"
                ref={featuresRef}
              >
                <div className="content-container">
                  <h2 className="text-center text-4xl mb-12">
                    {t("features.title")}
                  </h2>
                  <p className="text-center text-xl mb-12">
                    {t("features.description")}
                  </p>
                  <div className="features-grid">
                    <div className="feature-card">
                      <Shield size={48} className="mb-4 mx-auto text-primary" />
                      <h3 className="text-xl mb-2">
                        {t("features.card1.title")}
                      </h3>
                      <p>{t("features.card1.description")}</p>
                    </div>
                    <div className="feature-card">
                      <MessageSquare
                        size={48}
                        className="mb-4 mx-auto text-primary"
                      />
                      <h3 className="text-xl mb-2">
                        {t("features.card2.title")}
                      </h3>
                      <p>{t("features.card2.description")}</p>
                    </div>
                    <div className="feature-card">
                      <Smartphone
                        size={48}
                        className="mb-4 mx-auto text-primary"
                      />
                      <h3 className="text-xl mb-2">
                        {t("features.card3.title")}
                      </h3>
                      <p>{t("features.card3.description")}</p>
                    </div>
                  </div>
                </div>
              </section>
              <section
                className="section security"
                id="security"
                ref={securityRef}
              >
                <div className="content-container">
                  <h2 className="text-4xl mb-8">{t("security.title")}</h2>
                  <p className="text-xl mb-12">{t("security.description")}</p>
                </div>
              </section>
              <footer className="footer">
                <div className="footer-content">
                  <div className="footer-section about-section">
                    <h3>ECHO - 2025</h3>
                    <p>La plataforma de mensajería segura para el futuro.</p>
                  </div>

                  <div className="footer-section quick-links">
                    <h3>Enlaces Rápidos</h3>
                    <ul className="footer-links">
                      <li>
                        <a href="#features">Características</a>
                      </li>
                      <li>
                        <a href="#security">Seguridad</a>
                      </li>
                      <li>
                        <a href="#contact">Contacto</a>
                      </li>
                    </ul>
                  </div>

                  <div className="footer-section follow-us">
                    <h3>Síguenos</h3>
                    <div className="social-icons">
                      <a
                        href="https://twitter.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Twitter size={24} />
                      </a>
                      <a
                        href="https://instagram.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram size={24} />
                      </a>
                      <a
                        href="https://linkedin.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Linkedin size={24} />
                      </a>
                    </div>
                  </div>

                  <div className="footer-section logo-section">
                    <img
                      src="./echo-logo-light.svg"
                      alt="Logo Echo Light"
                      className="footer-logo"
                    />
                  </div>
                </div>

                <div className="footer-bottom">
                  <p>&copy; 2025 ECHO. Todos los derechos reservados.</p>
                </div>
              </footer>
              <ChatWidget />
              <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                //type={authType}
              />
            </>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
