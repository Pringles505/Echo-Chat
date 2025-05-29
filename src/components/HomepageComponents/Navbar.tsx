import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-[var(--color-background)]/90 backdrop-blur-sm shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20 md:h-24">
          <div className="flex-shrink-0">
            <a href="#" className="flex items-center space-x-2 text-[var(--color-text)] font-bold text-xl">
              <img src="/echo-logo.svg" alt="Echo Logo" className="h-16 w-16 md:h-15 md:w-15" />
              <span>ECHO</span>
            </a>

          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-[var(--color-text)]/80 hover:text-[var(--color-text)] transition-colors">Features</a>
            <a href="#security" className="text-[var(--color-text)]/80 hover:text-[var(--color-text)] transition-colors">Security</a>
            <a href="#pricing" className="text-[var(--color-text)]/80 hover:text-[var(--color-text)] transition-colors">Pricing</a>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 text-[var(--color-text)] hover:text-[var(--color-secondary)] transition-colors"
              onClick={() => window.location.href = '/login'}
            >
              Login
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
              onClick={() => window.location.href = '/register'}
            >
              Register
            </motion.button>
          </nav>

          <div className="md:hidden">
            <button
              type="button"
              className="text-[var(--color-text)]/80 hover:text-[var(--color-text)]"
              onClick={toggleMobileMenu}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-[var(--color-background)] border-t border-[var(--color-primary)]/30">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col space-y-4">
              <a href="#features" className="text-[var(--color-text)]/80 hover:text-[var(--color-text)] py-2">Features</a>
              <a href="#security" className="text-[var(--color-text)]/80 hover:text-[var(--color-text)] py-2">Security</a>
              <a href="#pricing" className="text-[var(--color-text)]/80 hover:text-[var(--color-text)] py-2">Pricing</a>
              <button
                className="w-full py-2 text-[var(--color-text)] hover:text-[var(--color-secondary)] transition-colors text-left"
                onClick={() => window.location.href = '/login'}
              >
                Login
              </button>
              <button
                className="w-full py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors"
                onClick={() => window.location.href = '/register'}
              >
                Register
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;