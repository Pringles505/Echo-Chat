import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { User, X, Instagram, Linkedin } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslation } from 'react-i18next';
import ReactFlagsSelect from 'react-flags-select';
import { Lock, Shield, Smartphone, MessageSquare, Twitter } from 'lucide-react';

import './App.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Dashboard/Chat';
import Dashboard from './components/Dashboard/Dashboard';
import PrivateRoute from './components/Dashboard/PrivateRoute';
import { AuthModal } from './components/AuthModal';
import { ChatWidget } from './components/ChatWidget';
import './i18n';

gsap.registerPlugin(ScrollTrigger);

function LockModel() {
  return (
    <mesh rotation={[0, 0.5, 0]}>
      <boxGeometry args={[1, 1.5, 0.5]} />
      <meshStandardMaterial color="#5750a1" />
    </mesh>
  );
}

function SphereModel() {
  return (
    <mesh>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshStandardMaterial color="#5750a1" wireframe />
    </mesh>
  );
}

function App() {
  const { t, i18n } = useTranslation();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authType, setAuthType] = useState<'login' | 'register'>('login');
  const [selectedFlag, setSelectedFlag] = useState('GB');
  
  const featuresRef = useRef(null);
  const securityRef = useRef(null);

  const handleFlagSelect = (countryCode) => {
    if (countryCode && ['GB', 'ES', 'RU'].includes(countryCode)) {
      setSelectedFlag(countryCode);
      const langMap = {
        'GB': 'en',
        'ES': 'es',
        'RU': 'ru'
      };
      i18n.changeLanguage(langMap[countryCode]);
    }
  };

  useEffect(() => {
    if (featuresRef.current) {
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: 'top center',
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        y: 100,
        stagger: 0.2,
        duration: 1
      });
    }

    if (securityRef.current) {
      gsap.from(securityRef.current, {
        scrollTrigger: {
          trigger: securityRef.current,
          start: 'top center',
          toggleActions: 'play none none reverse'
        },
        opacity: 0,
        scale: 0.8,
        duration: 1
      });
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <>
            <header className="header">
              <div className="header-content">
                <img src="/echo-logo.svg" alt="Echo Logo" className="logo" />
                
                <nav className="nav-links">
                  <a href="#home" className="nav-link">{t('nav.home')}</a>
                  <a href="#features" className="nav-link">{t('nav.features')}</a>
                  <a href="#security" className="nav-link">{t('nav.security')}</a>
                  <a href="#contact" className="nav-link">{t('nav.contact')}</a>
                  
                  <div className="language-selector">
                    <ReactFlagsSelect
                      selected={selectedFlag}
                      onSelect={handleFlagSelect}
                      countries={['GB', 'ES', 'RU']}
                      customLabels={{ GB: 'EN', ES: 'ES', RU: 'RU' }}
                      placeholder="Select Language"
                    />
                  </div>
                  
                  <div className="auth-buttons">
                    <button 
                      className="btn btn-outline"
                      onClick={() => {
                        setAuthType('login');
                        setAuthModalOpen(true);
                      }}
                    >
                      {t('nav.login')}
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setAuthType('register');
                        setAuthModalOpen(true);
                      }}
                    >
                      {t('nav.register')}
                    </button>
                  </div>
                </nav>
              </div>
            </header>

            <section className="section hero" id="home">
              <div className="hero-content">
                <h1>{t('hero.title')}</h1>
                <p>{t('hero.subtitle')}</p>
                <button className="btn btn-primary">{t('hero.cta')}</button>
                
                <div style={{ height: '300px', marginTop: '2rem', width: '100%' }}>
                  <Canvas camera={{ position: [0, 0, 5] }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <LockModel />
                    <OrbitControls enableZoom={false} autoRotate />
                  </Canvas>
                </div>
              </div>
            </section>

            <section className="section features" id="features" ref={featuresRef}>
              <div>
                <h2 className="text-center text-4xl mb-12">{t('features.title')}</h2>
                <div className="features-grid">
                  <div className="feature-card">
                    <Shield size={48} className="mb-4 mx-auto text-primary" />
                    <h3 className="text-xl mb-2">{t('features.card1.title')}</h3>
                    <p>{t('features.card1.description')}</p>
                  </div>
                  <div className="feature-card">
                    <MessageSquare size={48} className="mb-4 mx-auto text-primary" />
                    <h3 className="text-xl mb-2">{t('features.card2.title')}</h3>
                    <p>{t('features.card2.description')}</p>
                  </div>
                  <div className="feature-card">
                    <Smartphone size={48} className="mb-4 mx-auto text-primary" />
                    <h3 className="text-xl mb-2">{t('features.card3.title')}</h3>
                    <p>{t('features.card3.description')}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="section security" id="security" ref={securityRef}>
              <div>
                <h2 className="text-4xl mb-8">{t('security.title')}</h2>
                <p className="text-xl mb-12">{t('security.description')}</p>
                <div style={{ height: '400px', width: '100%' }}>
                  <Canvas camera={{ position: [0, 0, 5] }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <SphereModel />
                    <OrbitControls enableZoom={false} autoRotate />
                  </Canvas>
                </div>
              </div>
            </section>

            <footer className="footer">
              <div className="footer-content">
                <div className="footer-section">
                  <h3>{t('footer.about')}</h3>
                  <p>ECHO - 2025</p>
                </div>
                <div className="footer-section">
                  <h3>{t('footer.quickLinks')}</h3>
                  <ul className="footer-links">
                    <li><a href="#features">{t('nav.features')}</a></li>
                    <li><a href="#security">{t('nav.security')}</a></li>
                    <li><a href="#contact">{t('nav.contact')}</a></li>
                  </ul>
                </div>
                <div className="footer-section">
                  <h3>{t('footer.followUs')}</h3>
                  <div className="social-icons">
                    <X size={24} />
                    <Instagram size={24} />
                    <Linkedin size={24} />
                  </div>
                </div>
              </div>
            </footer>

            <ChatWidget />

            <AuthModal
              isOpen={authModalOpen}
              onClose={() => setAuthModalOpen(false)}
              type={authType}
            />
          </>
        } />
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