import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Instagram, Mail, ArrowUpRight } from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';

const Footer = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const footerLinks = {
    explore: [
      { label: 'Features', href: '#features', icon: <ArrowUpRight size={14} /> },
      { label: 'Pricing', href: '/#pricing', icon: <ArrowUpRight size={14} /> },
    ],
    support: [
      { label: 'Documentation', href: '/documentation' },
      { label: 'Community', href: '/community'},
      { label: 'Contact Us', href: '/contact-us', icon: <Mail size={14} /> },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/legal/privacy-policy' },
      { label: 'Terms of Service', href: '/legal/terms-of-service' },
    ],
  };

  const socialIcons = [
    { Icon: FaXTwitter, href: 'https://twitter.com/echo-app', label: 'X' },
    { Icon: Instagram, href: 'https://instagram.com/echo-app', label: 'Instagram' },
  ];

  const renderLinks = (links) => (
    <ul className="space-y-3">
      {links.map((link, index) => (
        <li key={index}>
          <a
            href={link.href}
            className="flex items-center gap-1 text-sm text-white hover:text-white/80 transition-colors group"
            target={link.target || '_self'}
            rel={link.rel || ''}
          >
            {link.label}
            {link.icon && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white">
                {link.icon}
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <footer className="bg-transparent w-full" ref={ref}>
      <div className="w-full">
        <div className="mx-auto max-w-7xl px-8">
          <div className="w-full h-px bg-white/20"></div>
        </div>
      </div>
      
      <div className="w-full py-16 px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-7xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-6">
                <img 
                  src="/echo-logo.svg"
                  alt="ECHO Logo"
                  className="h-12 w-12 object-contain"
                />
                <h3 className="text-3xl font-bold text-white">ECHO</h3>
              </div>
              <p className="text-white/80 mb-8 max-w-md text-lg">
                Messaging made private by design.
              </p>
              <div className="flex space-x-5">
                {socialIcons.map(({ Icon, href, label }, index) => (
                  <a
                    key={index}
                    href={href}
                    aria-label={label}
                    className="p-3 bg-white/10 rounded-full text-white hover:text-white hover:bg-white/20 transition-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="w-6 h-6" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-white text-lg">Explore</h4>
              {renderLinks(footerLinks.explore)}
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-white text-lg">Support</h4>
              {renderLinks(footerLinks.support)}
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-white text-lg">Legal</h4>
              {renderLinks(footerLinks.legal)}
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center">
            <p className="text-base text-white/60">
              &copy; {currentYear} ECHO. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-8">
              <a href="/legal/cookie-policy" className="text-base text-white/60 hover:text-white">
                Cookie Policy
              </a>
              <a href="/legal/gdpr" className="text-base text-white/60 hover:text-white">
                GDPR
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default React.memo(Footer);