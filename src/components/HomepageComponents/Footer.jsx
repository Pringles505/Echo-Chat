import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const footerLinks = {
    product: [
      { label: 'Features', href: '#' },
      { label: 'Pricing', href: '#' },
      { label: 'Documentation', href: '#' },
      { label: 'Updates', href: '#' }
    ],
    company: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' }
    ],
    legal: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' }
    ]
  };

  const socialIcons = [
    { Icon: Github, href: '#' },
    { Icon: Twitter, href: '#' },
    { Icon: Linkedin, href: '#' }
  ];

  const renderLinks = (links) => (
    <ul className="space-y-2">
      {links.map((link, index) => (
        <li key={index}>
          <a 
            href={link.href} 
            className="inline-block text-[var(--color-text)]/70 hover:text-[#514b96] transition-all duration-300 transform hover:scale-105"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );

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
              {socialIcons.map(({ Icon, href }, index) => (
                <a 
                  key={index}
                  href={href}
                  className="text-[var(--color-text)]/70 hover:text-[#514b96] transition-all duration-300 transform hover:scale-110"
                >
                  <Icon className="w-6 h-6" />
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            {renderLinks(footerLinks.product)}
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            {renderLinks(footerLinks.company)}
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            {renderLinks(footerLinks.legal)}
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-[var(--color-primary)]/10 text-center text-[var(--color-text)]/60">
          <p>&copy; {currentYear} ECHO. All rights reserved.</p>
        </div>
      </motion.div>
    </footer>
  );
};

export default React.memo(Footer);