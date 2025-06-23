import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Shield, Lock, Key } from 'lucide-react';

const Hero = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-20 md:py-32">
      <div ref={ref} className="container mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
            ECHO
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-[var(--color-text)]/80">
            End-to-end encrypted messaging for those who value privacy
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-[var(--color-primary)] text-white rounded-lg font-semibold shadow-lg hover:bg-[var(--color-primary)]/90 transition-colors"
              onClick={() => window.location.href = '/register'}
            >
              Get Started Free
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 border-2 border-[var(--color-secondary)] text-[var(--color-secondary)] rounded-lg font-semibold hover:bg-[var(--color-secondary)]/10 transition-colors"
              onClick={() => window.location.href = '/login'}
            >
              Sign In
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;