import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Shield, Lock, Key, RefreshCw, Zap, UserPlus } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'End-to-End Encryption',
    description: 'Your messages are encrypted before they leave your device, ensuring only intended recipients can read them.',
  },
  {
    icon: Lock,
    title: 'Zero-Knowledge Architecture',
    description: 'We cannot access your messages - your privacy is guaranteed by design.',
  },
  {
    icon: Key,
    title: 'Perfect Forward Secrecy',
    description: 'New encryption keys for every message ensure past communications remain secure.',
  },
  {
    icon: RefreshCw,
    title: 'Self-Destructing Messages',
    description: 'Set messages to automatically delete after a specified time.',
  },
  {
    icon: Zap,
    title: 'Instant Delivery',
    description: 'Lightning-fast message delivery without compromising security.',
  },
  {
    icon: UserPlus,
    title: 'Secure Group Chats',
    description: 'Create encrypted group conversations with unlimited participants.',
  },
];

const Features = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="features" className="py-20 px-4" ref={ref}>
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Security First, Always</h2>
          <p className="text-lg text-[var(--color-text)]/70">Built with your privacy in mind</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="p-6 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10 hover:border-[var(--color-primary)]/20 transition-all hover:transform hover:scale-105"
            >
              <feature.icon className="w-12 h-12 text-[var(--color-secondary)] mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-[var(--color-text)]/70">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;