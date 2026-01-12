import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FaXTwitter } from 'react-icons/fa6';
import { 
  Shield, Lock, Key, RefreshCw, Zap, UserPlus, 
  Code, Server, EyeOff, Menu, X, ArrowRight, ChevronRight,
  Unlock, Copy, Check, Send, Network, MessageCircle, User, Sparkles,
  FileText, BarChart, Globe, Cpu, Search, Database, PenTool, Mail, TrendingUp, Users,
  Instagram, ArrowUpRight, Linkedin, Github, Twitter, BookOpen
} from 'lucide-react';
import CryptoJS from 'crypto-js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import HeroAnimation from './HomepageComponents/HeroAnimation';
import Logo from './HomepageComponents/Logo';
import Navbar from './HomepageComponents/Navbar';
import Footer from './HomepageComponents/Footer';

// --- Hero Component ---
const Hero = () => {
  const { scrollY } = useScroll();
  const { t } = useTranslation();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);

  return (
    <section className="relative flex flex-col items-center justify-center pt-32 pb-24 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent_50%)]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full opacity-50 pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-violet-300 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            {t('hero.badge')}
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40">
            ECHO
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            {t('hero.description')} 
            <span className="text-zinc-500 block mt-2 text-lg">{t('hero.tagline')}</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white text-black rounded-full font-semibold text-lg hover:bg-zinc-200 transition-colors flex items-center gap-2"
              onClick={() => window.location.href = '/register'}
            >
              {t('hero.ctaPrimary')} <ArrowRight size={18} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-semibold text-lg hover:bg-white/10 transition-colors"
              onClick={() => window.location.href = '/login'}
            >
              {t('hero.ctaSecondary')}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// --- Features Grid ---
const Features = () => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const { t } = useTranslation();

  const features = [
    { 
      icon: Shield, 
      title: t('features.echoProtocol'), 
      desc: t('features.echoProtocolDesc'), 
      details: t('features.echoProtocolDetails'),
      colSpan: "md:col-span-2", 
      gradient: "from-violet-500/20 to-purple-500/20" 
    },
    { 
      icon: Lock, 
      title: t('features.zeroKnowledge'), 
      desc: t('features.zeroKnowledgeDesc'), 
      details: t('features.zeroKnowledgeDetails'),
      colSpan: "md:col-span-1", 
      gradient: "from-blue-500/20 to-cyan-500/20" 
    },
    { 
      icon: Zap, 
      title: t('features.lightning'), 
      desc: t('features.lightningDesc'), 
      details: t('features.lightningDetails'),
      colSpan: "md:col-span-1", 
      gradient: "from-amber-500/20 to-orange-500/20" 
    },
    { 
      icon: RefreshCw, 
      title: t('features.ephemerals'), 
      desc: t('features.ephemeralDesc'), 
      details: t('features.ephemeralDetails'),
      colSpan: "md:col-span-2", 
      gradient: "from-emerald-500/20 to-green-500/20" 
    },
    { 
      icon: Key, 
      title: t('features.forwardSecrecy'), 
      desc: t('features.forwardSecrecyDesc'), 
      details: t('features.forwardSecrecyDetails'),
      colSpan: "md:col-span-1", 
      gradient: "from-pink-500/20 to-rose-500/20" 
    },
    { 
      icon: UserPlus, 
      title: t('features.groupChats'), 
      desc: t('features.groupChatsDesc'), 
      details: t('features.groupChatsDetails'),
      colSpan: "md:col-span-1", 
      gradient: "from-indigo-500/20 to-blue-500/20" 
    },
    { 
      icon: Globe, 
      title: t('features.decentralized'), 
      desc: t('features.decentralizedDesc'), 
      details: t('features.decentralizedDetails'),
      colSpan: "md:col-span-1", 
      gradient: "from-teal-500/20 to-cyan-500/20" 
    }
  ];

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <section id="features" className="py-32 px-6 relative">
      <div className="max-w-7xl mx-auto">
        <div className="mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('features.titleMain')}<br />
            <span className="text-zinc-500">{t('features.titleSub')}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {features.map((feature, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`group relative p-8 rounded-3xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all duration-500 overflow-hidden ${feature.colSpan}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10 h-full flex flex-col pointer-events-none">
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
                  </div>

                  {/* Expandable Details */}
                  <div 
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-zinc-300 text-sm leading-relaxed">
                        {feature.details}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button 
                      type="button"
                      onClick={() => toggleExpand(i)}
                      className="pointer-events-auto flex items-center text-sm font-medium text-white/50 hover:text-white transition-colors focus:outline-none"
                    >
                      <span>{isExpanded ? t('features.showLess') : t('features.learnMore')}</span>
                      <ChevronRight className={`w-4 h-4 ml-1 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// --- Code Typing Section ---
const CodeTypingSection = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [displayCode, setDisplayCode] = useState('');
  const { t } = useTranslation();

  const codeExamples = [
    {
      language: 'javascript',
      title: t('code.javascript'),
      code: `import { EchoClient } from '@echo/crypto';

const client = new EchoClient();

const message = 'Hello, Echo!';
const encrypted = await client.encrypt(
  message,
  recipientPublicKey
);

await client.sendMessage(encrypted);`,
    },
    {
      language: 'python',
      title: t('code.python'),
      code: `from echo_crypto import EchoClient

client = EchoClient()
message = "Hello, Echo!"

encrypted = client.encrypt(
    message,
    recipient_public_key
)

client.send_message(encrypted)`,
    },
    {
      language: 'go',
      title: t('code.go'),
      code: `package main

import "echo/crypto"

func main() {
    client := crypto.NewEchoClient()
    message := "Hello, Echo!"
    
    encrypted, _ := client.Encrypt(
        message,
        recipientKey,
    )
    
    client.SendMessage(encrypted)
}`,
    },
    {
      language: 'rust',
      title: t('code.rust'),
      code: `use echo_crypto::Client;

#[tokio::main]
async fn main() {
    let client = Client::new();
    let msg = "Hello, Echo!";
    
    let encrypted = client
        .encrypt(msg, &key)
        .await
        .unwrap();
    
    client.send(&encrypted).await;
}`,
    },
  ];

  useEffect(() => {
    if (inView) {
      const code = codeExamples[activeTab].code;
      let index = 0;
      setDisplayCode('');

      const interval = setInterval(() => {
        if (index <= code.length) {
          setDisplayCode(code.slice(0, index));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 10);

      return () => clearInterval(interval);
    }
  }, [activeTab, inView]);

  const copyCode = () => {
    navigator.clipboard.writeText(codeExamples[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      ref={ref}
      className="py-32 px-6 relative"
    >
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center bg-violet-500/10 text-violet-400 px-4 py-1 rounded-full mb-4 text-sm font-medium border border-violet-500/20">
            <Code className="w-4 h-4 mr-2" />
            {t('code.badge')}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('code.title')}
          </h2>
          <p className="text-zinc-400 text-lg">
            {t('code.description')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm"
        >
          <div className="flex flex-wrap gap-0 border-b border-white/5 bg-black/20">
            {codeExamples.map((example, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveTab(index);
                  setDisplayCode('');
                }}
                className={`flex-1 px-4 py-4 text-sm font-medium transition-all border-b-2 ${
                  activeTab === index
                    ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                {example.title}
              </button>
            ))}
          </div>

          <div className="relative p-6 bg-black/50 min-h-[300px]">
            <button
              onClick={copyCode}
              className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center gap-2 z-10 border border-white/5"
            >
              {copied ? (
                <>
                  <Check size={14} />
                  <span className="text-xs font-medium">{t('code.copied')}</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span className="text-xs font-medium">{t('code.copy')}</span>
                </>
              )}
            </button>

            <div className="code-block text-sm overflow-x-auto">
              {displayCode && (
                <SyntaxHighlighter
                  language={codeExamples[activeTab].language}
                  style={atomDark}
                  customStyle={{
                    background: 'transparent',
                    padding: '0',
                    margin: '0',
                    fontFamily: 'Fira Code, monospace',
                    fontSize: '0.9rem',
                  }}
                  showLineNumbers={true}
                  wrapLines={true}
                >
                  {displayCode}
                </SyntaxHighlighter>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { val: "5+", label: t('code.stats.languages') },
            { val: "<2 min", label: t('code.stats.setup') },
            { val: "100%", label: t('code.stats.openSource') },
            { val: "24/7", label: t('code.stats.support') }
          ].map((stat, i) => (
             <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-6 text-center hover:bg-white/10 transition-colors">
              <div className="text-2xl md:text-3xl font-bold text-white mb-2">{stat.val}</div>
              <p className="text-sm text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// --- Hero AI Demo Component ---

const DEMO_SCENARIOS = [
  {
    text: "Summarize the key decisions from the engineering sync",
    results: [
      { icon: Shield, title: "Protocol Update", desc: "Consensus to implement post-quantum cryptography by Q4." },
      { icon: Zap, title: "Performance", desc: "New Rust-based websocket server reduced latency by 40%." },
      { icon: Server, title: "Infrastructure", desc: "Decentralized relay nodes are now fully operational." }
    ]
  },
  {
    text: "Analyze the security audit logs for suspicious activity",
    results: [
      { icon: Lock, title: "Failed Attempts", desc: "Detected and blocked 450 brute-force attempts from known botnet." },
      { icon: Globe, title: "Geo-Fencing", desc: "Traffic from restricted regions has been successfully filtered." },
      { icon: User, title: "User Safety", desc: "No compromised accounts detected in the last 24 hours." }
    ]
  },
  {
    text: "Draft a release note for the new encrypted voice feature",
    results: [
      { icon: PenTool, title: "Key Feature", desc: "Crystal clear voice calls secured with ZRTP protocol." },
      { icon: Check, title: "Availability", desc: "Rolling out to iOS and Android users starting today." },
      { icon: Shield, title: "Privacy", desc: "No metadata retention for call logs or duration." }
    ]
  },
  {
    text: "Generate ideas for the community engagement campaign",
    results: [
      { icon: Users, title: "Bug Bounty", desc: "Launch a new reward tier for critical protocol vulnerabilities." },
      { icon: MessageCircle, title: "AMA Session", desc: "Host a live Q&A with the core cryptography team." },
      { icon: Code, title: "Hackathon", desc: "Sponsor a decentralized app development contest." }
    ]
  },
  {
    text: "Optimize the database query for message retrieval",
    results: [
      { icon: Database, title: "Indexing", desc: "Added composite index on timestamp and sender_id." },
      { icon: Zap, title: "Caching", desc: "Implemented Redis layer for frequently accessed public keys." },
      { icon: Cpu, title: "Load Reduction", desc: "Database CPU usage dropped by 35% during peak hours." }
    ]
  },
  {
    text: "Review the Q3 user growth metrics",
    results: [
      { icon: TrendingUp, title: "Active Users", desc: "Daily Active Users (DAU) increased by 15% month-over-month." },
      { icon: Globe, title: "Expansion", desc: "Significant adoption spike in privacy-conscious regions." },
      { icon: BarChart, title: "Retention", desc: "User retention rate remains steady at 85%." }
    ]
  },
  {
    text: "Scan the codebase for deprecated dependencies",
    results: [
      { icon: Search, title: "Scan Complete", desc: "Found 3 packages requiring updates." },
      { icon: Code, title: "React", desc: "Update to v19 recommended for concurrent features." },
      { icon: Shield, title: "Vulnerability", desc: "Patched a minor regex denial of service in a sub-dependency." }
    ]
  },
  {
    text: "Summarize support tickets regarding the desktop app",
    results: [
      { icon: Mail, title: "Theme Issues", desc: "Users requesting more contrast in the dark mode theme." },
      { icon: Cpu, title: "Performance", desc: "Reports of high RAM usage on older Windows machines." },
      { icon: Check, title: "Resolution", desc: "Fix deployed in patch v2.1.4." }
    ]
  },
  {
    text: "Evaluate the cost of new relay servers",
    results: [
      { icon: Server, title: "Hosting", desc: "Switching to bare-metal providers saves 20% monthly." },
      { icon: Network, title: "Bandwidth", desc: "Negotiated unmetered egress for high-traffic nodes." },
      { icon: BarChart, title: "Projection", desc: "Infrastructure costs stable for next 6 months." }
    ]
  }
];

const HeroAiDemo = () => {
  const [scenario, setScenario] = useState(() => DEMO_SCENARIOS[Math.floor(Math.random() * DEMO_SCENARIOS.length)]);
  const [displayedText, setDisplayedText] = useState('');
  const [status, setStatus] = useState('typing'); // 'typing' | 'ready' | 'processing' | 'done'
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;
    
    const typeText = async () => {
      setStatus('typing');
      setDisplayedText('');
      
      // Small initial delay
      await new Promise(r => setTimeout(r, 500));
      if (!isMounted) return;

      for (let i = 1; i <= scenario.text.length; i++) {
        if (!isMounted) return;
        setDisplayedText(scenario.text.slice(0, i));
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      if (isMounted) setStatus('ready');
    };

    typeText();

    return () => { isMounted = false; };
  }, [scenario]);

  const handleButtonClick = async () => {
    if (status === 'ready') {
      setStatus('processing');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('done');
    } else if (status === 'done') {
      // Pick new scenario
      let nextScenario;
      do {
        nextScenario = DEMO_SCENARIOS[Math.floor(Math.random() * DEMO_SCENARIOS.length)];
      } while (nextScenario === scenario);
      setScenario(nextScenario);
    }
  };

  return (
    <section className="py-32 px-6 relative overflow-hidden">
       {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-16">
           <div className="inline-flex items-center justify-center bg-purple-500/10 text-purple-400 px-4 py-1 rounded-full mb-4 text-sm font-medium border border-purple-500/20">
            <Sparkles className="w-4 h-4 mr-2" /> {t('ai.badge')}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('ai.title')} <span className="text-purple-400">{t('ai.titleHighlight')}</span>
          </h2>
          <p className="text-zinc-400 text-lg">
            {t('ai.description')}
          </p>
        </div>

        <motion.div
          layout
          className="bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden min-h-[200px]"
        >
          <motion.div layout className="p-8">
            {/* Input Area */}
            <div className="flex flex-col gap-6">
              <div className="min-h-[60px] flex items-center">
                <span className="text-2xl md:text-3xl font-medium text-white/90">
                  {displayedText}
                  {status === 'typing' && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="inline-block w-0.5 h-8 bg-purple-400 ml-1 align-middle"
                    />
                  )}
                </span>
              </div>

              {/* Action Button */}
              <div className="flex justify-between items-center border-t border-white/5 pt-6">
                <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                   <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                   <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>

                <motion.button
                  layout
                  onClick={handleButtonClick}
                  disabled={status === 'typing' || status === 'processing'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    status === 'processing'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 cursor-wait'
                      : status === 'done'
                        ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                        : 'bg-purple-600 text-white hover:bg-purple-500 border border-purple-500 shadow-lg shadow-purple-500/20'
                  } ${status === 'typing' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {status === 'processing' ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      {t('ai.analyzing')}
                    </>
                  ) : status === 'done' ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      {t('ai.tryAnother')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {t('ai.generateReport')}
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Generated Content */}
            <AnimatePresence mode="wait">
              {status === 'done' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-8 space-y-3">
                    {scenario.results.map((item, index) => (
                      <motion.div
                        key={`${scenario.text}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 flex-shrink-0">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                          <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// --- Cipher Playground (Interactive) ---
const CipherPlayground = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [plaintext, setPlaintext] = useState('Hello, Echo!');
  const [secretKey, setSecretKey] = useState('EchoSecurityKey123');
  const [ciphertext, setCiphertext] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDecrypt, setShowDecrypt] = useState(false);
  const [encryptionStep, setEncryptionStep] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    if (plaintext && secretKey) {
      setTimeout(() => {
        const encrypted = CryptoJS.AES.encrypt(plaintext, secretKey).toString();
        setCiphertext(encrypted);
        setEncryptionStep(1);
        setTimeout(() => {
          const decrypted = CryptoJS.AES.decrypt(encrypted, secretKey).toString(CryptoJS.enc.Utf8);
          setDecrypted(decrypted);
          setEncryptionStep(2);
        }, 800);
      }, 300);
    }
  }, [plaintext, secretKey]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ciphertext);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section ref={ref} className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center bg-violet-500/10 text-violet-400 px-4 py-1 rounded-full mb-4 text-sm font-medium border border-violet-500/20">
            <Lock className="w-4 h-4 mr-2" /> {t('cipher.badge')}
          </div>
          <h2 className="text-4xl font-bold mb-4">{t('cipher.title')}</h2>
          <p className="text-zinc-400">{t('cipher.description')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-black/40 border border-white/10 rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-lg font-semibold">{t('cipher.plaintext')}</h3>
            </div>
            <textarea
              value={plaintext}
              onChange={(e) => { setPlaintext(e.target.value); setEncryptionStep(0); }}
              className="w-full h-32 bg-zinc-900/50 border border-white/10 rounded-lg p-4 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none font-mono text-sm"
              placeholder={t('cipher.enterMessage')}
            />
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-400">{t('cipher.secretKey')}</span>
              </div>
              <input
                type="text"
                value={secretKey}
                onChange={(e) => { setSecretKey(e.target.value); setEncryptionStep(0); }}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            <div className="bg-violet-900/10 border border-violet-500/20 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-2 h-2 rounded-full ${encryptionStep >= 1 ? 'bg-violet-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                <h3 className="text-lg font-semibold text-violet-200">{t('cipher.ciphertext')}</h3>
              </div>
              <div className="bg-black/40 border border-violet-500/20 rounded-lg p-4 min-h-[120px] break-all font-mono text-xs text-violet-300/80">
                {ciphertext || t('cipher.waitingForInput')}
              </div>
              <button
                onClick={copyToClipboard}
                className="mt-4 flex items-center gap-2 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t('cipher.copied') : t('cipher.copyToClipboard')}
              </button>
            </div>

            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
               <button
                onClick={() => setShowDecrypt(!showDecrypt)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                <Unlock size={16} />
                {showDecrypt ? t('cipher.hide') : t('cipher.decrypt')}
              </button>
              <AnimatePresence>
                {showDecrypt && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-green-400 font-mono text-sm">{decrypted}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// --- Key Exchange Visualizer ---
const KeyExchangeVisualizer = () => {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.2 });
  const [phase, setPhase] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    if (inView) {
      const interval = setInterval(() => {
        setPhase(p => (p + 1) % 5);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [inView]);

  return (
    <section ref={ref} className="py-32 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-16">{t('keyExchange.title')}</h2>
        
        <div className="relative flex items-center justify-between max-w-3xl mx-auto h-40">
          {/* Device A */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-xl">
              <User className="w-8 h-8 text-violet-400" />
            </div>
            <span className="text-sm font-mono text-zinc-500">{t('keyExchange.alice')}</span>
          </div>

          {/* Connection Line */}
          <div className="absolute left-20 right-20 top-10 h-0.5 bg-zinc-800">
            <motion.div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-violet-500 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.8)]"
              animate={{ 
                left: ['0%', '100%', '0%'],
                scale: [1, 1.5, 1]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Device B */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-xl">
              <User className="w-8 h-8 text-blue-400" />
            </div>
            <span className="text-sm font-mono text-zinc-500">{t('keyExchange.bob')}</span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: t('keyExchange.protocols.x3dh'), desc: t('keyExchange.protocols.x3dhDesc') },
            { title: t('keyExchange.protocols.doubleRatchet'), desc: t('keyExchange.protocols.doubleRatchetDesc') },
            { title: t('keyExchange.protocols.forwardSecrecy'), desc: t('keyExchange.protocols.forwardSecrecyDesc') }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/5">
              <h3 className="font-semibold mb-2 text-white">{item.title}</h3>
              <p className="text-sm text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Security Documentation Component ---
const SecurityDocs = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { t } = useTranslation();

  const protocols = [
    {
      icon: Lock,
      title: t('security.protocols.x3dh.title'),
      subtitle: t('security.protocols.x3dh.subtitle'),
      description: t('security.protocols.x3dh.description'),
      features: [
        'Identity-based authentication',
        'Forward secrecy guarantee',
        'Deniable authentication',
        'Post-compromise security',
      ],
      diagram: 'DH(IKa, SPKb) || DH(EKa, IKb) || DH(EKa, SPKb)',
    },
    {
      icon: TrendingUp,
      title: t('security.protocols.doubleRatchet.title'),
      subtitle: t('security.protocols.doubleRatchet.subtitle'),
      description: t('security.protocols.doubleRatchet.description'),
      features: [
        'Per-message key derivation',
        'Independent key chains',
        'Out-of-order message handling',
        'Efficient ratcheting',
      ],
      diagram: 'KDF(ratchet_key, chain_key) → (message_key, next_chain_key)',
    },
    {
      icon: Users,
      title: t('security.protocols.groupProtocol.title'),
      subtitle: t('security.protocols.groupProtocol.subtitle'),
      description: t('security.protocols.groupProtocol.description'),
      features: [
        'Scalable to 500+ members',
        'Linear communication overhead',
        'Group key updates',
        'Member removal support',
      ],
      diagram: 'Tree(member1, member2, ... memberN) → shared_group_key',
    },
    {
      icon: Zap,
      title: t('security.protocols.cryptoOps.title'),
      subtitle: t('security.protocols.cryptoOps.subtitle'),
      description: t('security.protocols.cryptoOps.description'),
      features: [
        'AES-256-GCM encryption',
        'SHA-256 hashing',
        'ED25519 signatures',
        'NIST P-256 curves (optional)',
      ],
      diagram: 'Plaintext → AES256(key) → Ciphertext + HMAC_AUTH',
    },
  ];

  const securityFeatures = [
    {
      title: t('security.guarantees.pfs.title'),
      description: t('security.guarantees.pfs.description'),
      icon: Shield,
    },
    {
      title: t('security.guarantees.bs.title'),
      description: t('security.guarantees.bs.description'),
      icon: Lock,
    },
    {
      title: t('security.guarantees.zka.title'),
      description: t('security.guarantees.zka.description'),
      icon: EyeOff,
    },
  ];

  return (
    <section id="security" className="py-32 px-6 relative overflow-hidden">
       {/* Background Elements */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center bg-violet-500/10 text-violet-400 px-4 py-1.5 rounded-full mb-6 border border-violet-500/20">
            <BookOpen className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">{t('security.badge')}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('security.title')}
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            {t('security.description')}
          </p>
        </div>

        {/* Tabs Container */}
        <div className="bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm mb-20">
          <div className="flex flex-wrap border-b border-white/10">
            {protocols.map((protocol, index) => {
              const Icon = protocol.icon;
              return (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`flex-1 px-6 py-5 text-sm font-semibold transition-all flex items-center justify-center gap-3 relative ${
                    activeTab === index
                      ? 'text-white bg-white/5'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon size={18} className={activeTab === index ? 'text-violet-400' : ''} />
                  <span className="hidden sm:inline">{protocol.title}</span>
                  {activeTab === index && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" 
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-8 md:p-12 min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col md:flex-row gap-12">
                  <div className="flex-1">
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {protocols[activeTab].title}
                      </h3>
                      <p className="text-violet-400 font-medium">
                        {protocols[activeTab].subtitle}
                      </p>
                    </div>

                    <p className="text-zinc-400 leading-relaxed mb-8">
                      {protocols[activeTab].description}
                    </p>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        {t('security.keyFeatures')}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {protocols[activeTab].features.map((feature, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-lg p-3"
                          >
                            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full flex-shrink-0" />
                            <span className="text-zinc-300 text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center">
                     <div className="bg-black/50 border border-white/10 rounded-xl p-6 font-mono text-sm text-cyan-400 shadow-inner">
                        <div className="flex items-center gap-2 mb-4 text-zinc-500 text-xs border-b border-white/5 pb-2">
                           <Code size={12} />
                           <span>{t('security.protocolFlow')}</span>
                        </div>
                        {protocols[activeTab].diagram}
                     </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Security Guarantees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-zinc-900/40 border border-white/10 rounded-2xl p-8 hover:border-violet-500/30 transition-colors group"
              >
                <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-violet-400" />
                </div>
                <h4 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h4>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
        
        <div className="mt-16 text-center">
           <a href="/documentation" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm border-b border-transparent hover:border-white pb-0.5">
              {t('security.viewAudit')} <ArrowRight size={14} />
           </a>
        </div>

      </div>
    </section>
  );
};

// --- Pricing Component ---
const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const { t } = useTranslation();

  const plans = [
    {
      name: t('pricing.plans.starter.name'),
      desc: t('pricing.plans.starter.desc'),
      price: "0",
      features: t('pricing.plans.starter.features', { returnObjects: true }),
      cta: t('pricing.getStarted'),
      highlight: false
    },
    {
      name: t('pricing.plans.pro.name'),
      desc: t('pricing.plans.pro.desc'),
      price: isAnnual ? "8" : "12",
      period: isAnnual ? t('pricing.billedYearly') : "/mo",
      features: t('pricing.plans.pro.features', { returnObjects: true }),
      cta: t('pricing.startFreeTrial'),
      highlight: true
    },
    {
      name: t('pricing.plans.business.name'),
      desc: t('pricing.plans.business.desc'),
      price: isAnnual ? "24" : "30",
      period: t('pricing.perUserMonth'),
      features: t('pricing.plans.business.features', { returnObjects: true }),
      cta: t('pricing.contactSales'),
      highlight: false
    }
  ];

  return (
    <section id="pricing" className="py-32 px-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('pricing.title')}
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
            {t('pricing.description')}
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-white' : 'text-zinc-500'}`}>{t('pricing.monthly')}</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-14 h-8 bg-white/10 rounded-full p-1 relative transition-colors hover:bg-white/20"
            >
              <motion.div
                animate={{ x: isAnnual ? 24 : 0 }}
                className="w-6 h-6 bg-violet-500 rounded-full shadow-lg"
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-white' : 'text-zinc-500'}`}>
              {t('pricing.yearly')} <span className="text-violet-400 text-xs ml-1">({t('pricing.save')})</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-3xl border flex flex-col ${
                plan.highlight 
                  ? 'bg-zinc-900/80 border-violet-500/50 shadow-[0_0_40px_rgba(139,92,246,0.15)]' 
                  : 'bg-zinc-900/40 border-white/10 hover:border-white/20'
              } transition-all duration-300 group`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold rounded-full shadow-lg">
                  {t('pricing.recommended')}
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-zinc-400 h-10">{plan.desc}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">€{plan.price}</span>
                  {plan.price !== "0" && <span className="text-zinc-500 text-sm">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-zinc-300">
                    <div className={`mt-0.5 p-0.5 rounded-full ${plan.highlight ? 'bg-violet-500/20 text-violet-400' : 'bg-white/10 text-zinc-400'}`}>
                      <Check size={12} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <button className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
                plan.highlight 
                  ? 'bg-white text-black hover:bg-zinc-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
              }`}>
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Main Page Component ---
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 font-sans">
      <Navbar />
      <Hero />
      <Features />
      <CodeTypingSection />
      <HeroAiDemo />
      <HeroAnimation />
      <CipherPlayground />
      <KeyExchangeVisualizer />
      <SecurityDocs />
      <Pricing />
      <Footer />
    </div>
  );
}
