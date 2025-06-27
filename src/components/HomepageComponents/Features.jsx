import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Shield, Lock, Key, RefreshCw, Zap, UserPlus, Code, Server, EyeOff, Fingerprint, MessageSquare, Clock } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Echo Protocol Encryption',
    description: 'Military-grade X3DH protocol ensures your messages are encrypted before transmission.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10'
  },
  {
    icon: Lock,
    title: 'Zero-Knowledge Proof',
    description: 'We never have access to your data - privacy by cryptographic design.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10'
  },
  {
    icon: Key,
    title: 'Perfect Forward Secrecy',
    description: 'Dynamic key rotation protects past communications from future breaches.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10'
  },
  {
    icon: RefreshCw,
    title: 'Ephemeral Messages',
    description: 'Set self-destruct timers from 5 seconds to 30 days.',
    color: 'text-green-400',
    bg: 'bg-green-400/10'
  },
  {
    icon: Zap,
    title: 'Lightning Network',
    description: 'Instant delivery with end-to-end encryption at scale.',
    color: 'text-red-400',
    bg: 'bg-red-400/10'
  },
  {
    icon: UserPlus,
    title: 'Secure Group Chats',
    description: '256-bit encrypted group conversations with up to 500 participants.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10'
  },
  {
    icon: Code,
    title: 'Open Source',
    description: 'Auditable codebase with reproducible builds for transparency.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10'
  },
  {
    icon: Server,
    title: 'Decentralized Options',
    description: 'Choose federated servers or self-host your instance.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10'
  },
  {
    icon: EyeOff,
    title: 'Incognito Mode',
    description: 'Hide your online status and typing indicators.',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10'
  }
];

const Features = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.05,
  });

  return (
    <section id="features" className="py-24 px-4 bg-gradient-to-b from-[var(--color-primary)]/5 to-transparent" ref={ref}>
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center justify-center bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] px-6 py-2 rounded-full mb-4">
            <Fingerprint className="w-5 h-5 mr-2" />
            <span className="font-medium">UNCOMPROMISING SECURITY</span>
          </div>
          <h2 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-[var(--color-secondary)]">
            Privacy by Design
          </h2>
          <p className="text-xl text-[var(--color-text)]/70 max-w-3xl mx-auto">
            Every feature is engineered with your fundamental right to privacy in mind
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2 }
              }}
              className={`p-8 rounded-2xl ${feature.bg} border border-[var(--color-primary)]/10 hover:border-[var(--color-primary)]/30 transition-all group relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className={`w-14 h-14 ${feature.bg} rounded-lg flex items-center justify-center mb-6`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-[var(--color-text)]/80 leading-relaxed">{feature.description}</p>
              <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className={`w-2 h-2 rounded-full ${feature.bg.replace('bg', 'bg-opacity-100')}`}></div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex items-center gap-4 bg-[var(--color-primary)]/10 px-8 py-4 rounded-full border border-[var(--color-primary)]/20">
            <MessageSquare className="w-6 h-6 text-[var(--color-secondary)]" />
            <span className="font-medium text-lg">All communications protected by Echo Protocol</span>
            <Clock className="w-6 h-6 text-[var(--color-secondary)]" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;