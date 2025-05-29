import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <footer className="py-12 px-4 border-t border-[var(--color-primary)]/10" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="container mx-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">ECHO</h3>
            <p className="text-[var(--color-text)]/70 mb-4">
              Building the future of digital interaction.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">
                <Github className="w-6 h-6" />
              </a>
              <a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">Features</a></li>
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">Pricing</a></li>
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">Documentation</a></li>
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">Updates</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">About</a></li>
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">Blog</a></li>
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">Careers</a></li>
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">Privacy</a></li>
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">Terms</a></li>
              <li><a href="#" className="text-[var(--color-text)]/70 hover:text-[var(--color-secondary)]">Security</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-[var(--color-primary)]/10 text-center text-[var(--color-text)]/60">
          <p>&copy; {new Date().getFullYear()} ECHO. All rights reserved.</p>
        </div>
      </motion.div>
    </footer>
  );
}

export default Footer;