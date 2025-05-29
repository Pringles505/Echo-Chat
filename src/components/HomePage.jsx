import React, { useState, useEffect, useRef } from "react";
import { Twitter, Instagram, Linkedin, Shield, Smartphone, MessageSquare } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";
import ReactFlagsSelect from "react-flags-select";
import { AuthModal } from "../components/AuthModal";
import "./styles/HomePage.css";

import "./i18n";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

gsap.registerPlugin(ScrollTrigger);

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState("GB");
  const [authType, setAuthType] = useState("login");
  const featuresRef = useRef(null);
  const securityRef = useRef(null);

  const handleFlagSelect = (countryCode) => {
    const langMap = { GB: "en", ES: "es", RU: "ru" };
    if (langMap[countryCode]) {
      setSelectedFlag(countryCode);
      i18n.changeLanguage(langMap[countryCode]);
    }
  };

  const initAnimations = () => {
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

      document.querySelectorAll(".feature-card").forEach(card => {
        card.addEventListener("mouseenter", () => gsap.to(card, { scale: 1.05, duration: 0.2 }));
        card.addEventListener("mouseleave", () => gsap.to(card, { scale: 1, duration: 0.2 }));
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
  };

  const initParticles = () => {
    const container = document.getElementById("particles-container");
    if (!container) return;

    const createParticle = () => {
      const particle = document.createElement("div");
      particle.className = "particle";
      const size = Math.random() * 3 + 1;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      container.appendChild(particle);
      animateParticle(particle);
    };

    const animateParticle = (particle) => {
      const posX = Math.random() * 100;
      const posY = Math.random() * 100;
      particle.style.left = `${posX}%`;
      particle.style.top = `${posY}%`;
      particle.style.opacity = "0";

      const duration = Math.random() * 10 + 10;
      const delay = Math.random() * 5;

      setTimeout(() => {
        particle.style.transition = `all ${duration}s linear`;
        particle.style.opacity = Math.random() * 0.3 + 0.1;
        particle.style.left = `${posX + (Math.random() * 20 - 10)}%`;
        particle.style.top = `${posY - Math.random() * 30}%`;
        setTimeout(() => animateParticle(particle), duration * 1000);
      }, delay * 1000);
    };

    Array.from({ length: 80 }).forEach(createParticle);
  };

  useEffect(() => {
    initAnimations();
    initParticles();
  }, [i18n]);

  const NavLink = ({ href, children }) => (
    <a href={href} className="nav-link">{children}</a>
  );

  const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="feature-card">
      <Icon size={48} className="mb-4 mx-auto text-primary" />
      <h3 className="text-xl mb-2">{title}</h3>
      <p>{description}</p>
    </div>
  );

  const SocialIcon = ({ href, icon: Icon }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Icon size={24} />
    </a>
  );

  return (
    <>
      <div id="particles-container">
        <div className="gradient-background">
          <div className="gradient-sphere sphere-1"></div>
          <div className="gradient-sphere sphere-2">
          </div>
          <div className="gradient-sphere sphere-3"></div>
          <div className="glow"></div>
          <div className="grid-overlay"></div>
          <div className="noise-overlay"></div>
        </div>
      </div>

      <header className="header">
        <div className="header-content">
          <img src="/echo-logo-light.svg" alt="Echo Logo" className="logo" />
          <nav className="nav-links">
            <NavLink href="#home">{t("nav.home")}</NavLink>
            <NavLink href="#features">{t("nav.features")}</NavLink>
            <NavLink href="#security">{t("nav.security")}</NavLink>
            <NavLink href="#contact">{t("nav.contact")}</NavLink>

            <div className="auth-buttons">
              <button className="btn btn-outline">
                {t("nav.login")}
              </button>
              <button className="btn btn-primary">
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
          <div className="canvas-container">
            <Canvas camera={{ position: [0, 0, 5] }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              <OrbitControls enableZoom={false} autoRotate />
            </Canvas>
          </div>
        </div>
      </section>

      <section className="section features" id="features" ref={featuresRef}>
        <div className="content-container">
          <h2 className="text-center text-4xl mb-12">{t("features.title")}</h2>
          <div className="features-grid">
            <FeatureCard icon={Shield} title={t("features.card1.title")} description={t("features.card1.description")} />
            <FeatureCard icon={MessageSquare} title={t("features.card2.title")} description={t("features.card2.description")} />
            <FeatureCard icon={Smartphone} title={t("features.card3.title")} description={t("features.card3.description")} />
          </div>
        </div>
      </section>

      <section className="section security" id="security" ref={securityRef}>
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
              <li><NavLink href="#features">Características</NavLink></li>
              <li><NavLink href="#security">Seguridad</NavLink></li>
              <li><NavLink href="#contact">Contacto</NavLink></li>
            </ul>
          </div>

          <div className="footer-section follow-us">
            <h3>Síguenos</h3>
            <div className="social-icons">
              <SocialIcon href="https://twitter.com" icon={Twitter} />
              <SocialIcon href="https://instagram.com" icon={Instagram} />
              <SocialIcon href="https://linkedin.com" icon={Linkedin} />
            </div>
          </div>

          <div className="footer-section logo-section">
            <img src="./echo-logo-light.svg" alt="Logo Echo Light" className="footer-logo" />
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2025 ECHO. Todos los derechos reservados.</p>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default HomePage;
