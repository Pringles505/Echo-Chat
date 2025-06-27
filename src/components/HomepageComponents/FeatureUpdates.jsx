import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MessageSquare, Lock, Code, Globe, Zap, Users, Shield, Key, Database, Cpu, Bell, Mail } from 'lucide-react';

const FeatureUpdates = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedCard, setExpandedCard] = useState(null);
  const autoSlideInterval = useRef();

  const updates = [
    {
      icon: MessageSquare,
      title: 'AI-Powered Message Summaries',
      preview: 'Our revolutionary AI technology now provides instant message summaries',
      content: `We're proud to introduce our groundbreaking AI summarization feature that completely transforms how you manage conversations. Using state-of-the-art natural language processing algorithms developed by our team of machine learning experts, this feature analyzes message threads in real-time to extract key points, action items, and important details while maintaining complete end-to-end encryption. The system intelligently identifies:
      • Key discussion topics
      • Decisions made
      • Action items assigned
      • Important dates and deadlines
      • Sentiment analysis
      
      All processing happens locally on your device to ensure maximum privacy. The summary generation takes into account your personal communication patterns and preferences, learning over time to provide increasingly accurate and personalized summaries. This feature is particularly valuable for:
      - Busy professionals managing multiple projects
      - Team leaders coordinating distributed teams
      - Customer support agents handling numerous conversations
      - Anyone who needs to quickly catch up on lengthy discussions`,
      color: 'text-blue-400'
    },
    {
      icon: Lock,
      title: 'Enhanced Quantum-Secure Encryption',
      preview: 'Next-generation security protocols for the post-quantum era',
      content: `We've completely overhauled our encryption infrastructure to prepare for the quantum computing era. Our new security framework implements:
      
      • Lattice-based cryptography resistant to quantum attacks
      • Multi-factor key derivation with biometric components
      • Forward secrecy with ephemeral key rotation every 5 minutes
      • Zero-knowledge proof authentication
      • Hardware security module integration
      
      The system now uses a hybrid approach combining:
      - CRYSTALS-Kyber for key encapsulation
      - CRYSTALS-Dilithium for digital signatures
      - AES-256 with extended key lengths
      
      These cryptographic primitives have been selected after extensive evaluation by our security team and external auditors. Implementation details:
      • 512-bit quantum-resistant key lengths
      • Memory-hard key derivation functions
      • Tamper-evident session tokens
      • Distributed key management
      
      We've reduced encryption overhead by 40% while simultaneously increasing security margins. The new protocol maintains compatibility with existing clients while offering enhanced protection for new connections.`,
      color: 'text-purple-400'
    },
    {
      icon: Code,
      title: 'Developer Platform 2.0',
      preview: 'Complete suite of tools for building secure applications',
      content: `Our completely redesigned developer platform offers unprecedented access to our technology stack while maintaining our strict security standards. Key features include:
      
      **Core Components:**
      • End-to-end encrypted messaging API
      • Secure file transfer endpoints
      • Real-time synchronization engine
      • Identity management services
      • Group communication protocols
      
      **SDK Availability:**
      - JavaScript/TypeScript (Node.js and browser)
      - Python 3.8+
      - Java/Kotlin (Android optimized)
      - Swift (iOS/macOS native)
      - Go (high-performance services)
      - Rust (security-critical applications)
      
      **New Capabilities:**
      • Webhook integrations with payload verification
      • Server-side event streaming
      • Cryptographic proof endpoints
      • Multi-device coordination
      • Cross-platform synchronization
      
      The platform now includes comprehensive documentation, interactive API explorers, and community-contributed code samples. Enterprise customers gain access to dedicated support channels and custom integration assistance.`,
      color: 'text-emerald-400'
    },
    {
      icon: Globe,
      title: 'Global Infrastructure Expansion',
      preview: 'Now serving 15 additional regions with improved performance',
      content: `We've significantly expanded our global footprint to deliver better performance worldwide. Our infrastructure now includes:
      
      **New Regional Clusters:**
      • Southeast Asia (Singapore, Jakarta, Manila)
      • South America (São Paulo, Santiago, Bogotá)
      • Africa (Johannesburg, Lagos, Nairobi)
      • Middle East (Dubai, Tel Aviv)
      • Europe (Warsaw, Vienna, Oslo)
      
      **Performance Enhancements:**
      - 47% average latency reduction in new regions
      - 3x increased throughput capacity
      - Localized data processing
      - Geo-redundant storage
      - Intelligent traffic routing
      
      **Technical Specifications:**
      • Anycast network configuration
      • TLS 1.3 with post-quantum cipher suites
      • IPv6-only edge networks
      • BGP-based DDoS protection
      • Autonomous system peering
      
      The expansion brings our total points of presence to 78 locations across 42 countries. We maintain strict data sovereignty controls and compliance with all local regulations.`,
      color: 'text-amber-400'
    },
    {
      icon: Users,
      title: 'Enterprise Collaboration Suite',
      preview: 'Advanced tools for large organizations and teams',
      content: `Our new enterprise offering transforms how organizations communicate securely. Features include:
      
      **Team Management:**
      • Hierarchical group structures
      • Fine-grained permission controls
      • Delegated administration
      • Audit logging
      • Compliance reporting
      
      **Productivity Tools:**
      - Shared encrypted workspaces
      - Collaborative document editing
      - Secure video conferencing
      - Task management integration
      - Calendar synchronization
      
      **Security Controls:**
      • Data loss prevention policies
      • Legal hold capabilities
      • eDiscovery interfaces
      • Device attestation
      • Session confinement
      
      The suite supports organizations of all sizes, from small teams to multinational corporations with complex compliance requirements. Deployment options include cloud-hosted, private cloud, and on-premises configurations.`,
      color: 'text-red-400'
    },
    {
      icon: Shield,
      title: 'Privacy Control Center',
      preview: 'Complete visibility and control over your data',
      content: `The new Privacy Control Center provides unprecedented transparency and management capabilities:
      
      **Data Dashboard:**
      • Real-time data flow visualization
      • Connection graph analysis
      • Permission usage tracking
      • Third-party access monitoring
      • Encryption status indicators
      
      **Control Features:**
      - Granular consent management
      - Automated data expiration
      - Selective synchronization
      - Cross-service data boundaries
      - Pseudonymization options
      
      **Security Tools:**
      • Device attestation reports
      • Session termination controls
      • Forensic watermarking
      • Data compartmentalization
      • Threat modeling assistance
      
      All controls are designed to be accessible to non-technical users while providing the depth needed by security professionals. The interface adapts to show relevant controls based on your usage patterns.`,
      color: 'text-indigo-400'
    },
    {
      icon: Key,
      title: 'Biometric Authentication System',
      preview: 'Seamless, secure access across all your devices',
      content: `Our enhanced authentication framework combines convenience with uncompromising security:
      
      **Supported Methods:**
      • Face ID (3D depth mapping)
      • Fingerprint recognition
      • Iris scanning
      • Voice pattern matching
      • Behavioral biometrics
      
      **Security Architecture:**
      - On-device matching only
      - Hardware security module integration
      - Anti-spoofing detection
      - Liveness verification
      - Fallback to FIDO2 standards
      
      **Implementation Details:**
      • Zero-knowledge proof protocol
      • Continuous authentication
      • Context-aware confidence scoring
      • Tamper-resistant enclaves
      • Cross-device synchronization
      
      The system provides enterprise-grade security while maintaining the simplicity consumers expect. Authentication events are logged cryptographically for audit purposes without compromising privacy.`,
      color: 'text-cyan-400'
    },
    {
      icon: Database,
      title: 'Encrypted Cloud Storage',
      preview: 'Secure your files with zero-knowledge encryption',
      content: `Our completely redesigned cloud storage solution offers:
      
      **Core Features:**
      • Client-side encryption before upload
      • End-to-end encrypted sharing
      • Version history with cryptographic integrity
      • Distributed storage topology
      • Configurable redundancy
      
      **Advanced Capabilities:**
      - Secure collaborative editing
      - Fine-grained access controls
      - Automated retention policies
      - Legal hold functionality
      - Cross-platform synchronization
      
      **Technical Specifications:**
      • AES-256-GCM for file encryption
      • Argon2id for key derivation
      • Merkle trees for version verification
      • Erasure coding for durability
      • Content-defined chunking
      
      Storage plans range from personal accounts with 50GB to enterprise deployments with petabyte-scale capacity. All data remains encrypted at rest, in transit, and during processing.`,
      color: 'text-green-400'
    },
    {
      icon: Cpu,
      title: 'Performance Optimization Suite',
      preview: 'Faster, more efficient operation across all platforms',
      content: `Our latest performance improvements deliver:
      
      **Speed Enhancements:**
      • 2x faster message delivery
      • 3x reduced sync times
      • 40% smaller memory footprint
      • 30% better battery life
      • Instant cold starts
      
      **Optimization Techniques:**
      - Rewritten networking stack
      - Machine learning-based prefetching
      - Adaptive compression
      - Priority-based resource allocation
      - Hardware acceleration
      
      **Platform-Specific Improvements:**
      • iOS/macOS: Metal-optimized rendering
      • Android: Kotlin Multiplatform core
      • Web: WebAssembly cryptography
      • Windows: DirectX UI acceleration
      • Linux: Native Wayland support
      
      These changes are particularly noticeable on low-end devices and in bandwidth-constrained environments. The system dynamically adjusts based on device capabilities and network conditions.`,
      color: 'text-pink-400'
    },
    {
      icon: Bell,
      title: 'Intelligent Notification System',
      preview: 'AI that understands what matters to you',
      content: `Our smart notification engine revolutionizes how you stay informed:
      
      **Core Intelligence:**
      • Context-aware prioritization
      • Relationship-based routing
      • Temporal pattern recognition
      • Content sensitivity analysis
      • Cross-app correlation
      
      **Customization Options:**
      - Per-contact notification profiles
      - Location-based rules
      - Device-specific delivery
      - Scheduled quiet periods
      - Emergency bypass channels
      
      **Technical Implementation:**
      • On-device processing only
      • Federated learning model
      • Differential privacy guarantees
      • Energy-efficient scheduling
      • Cryptographic verification
      
      The system learns your preferences over time while respecting your privacy. Notifications are grouped intelligently and surfaced at optimal times based on your behavior patterns.`,
      color: 'text-yellow-400'
    }
  ];

  // Auto-advance slides every 7 seconds
  useEffect(() => {
    autoSlideInterval.current = setInterval(() => {
      if (expandedCard === null) {
        setCurrentSlide((prev) => (prev === updates.length - 1 ? 0 : prev + 1));
      }
    }, 7000);
    
    return () => clearInterval(autoSlideInterval.current);
  }, [expandedCard, updates.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === updates.length - 1 ? 0 : prev + 1));
    resetAutoSlide();
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? updates.length - 1 : prev - 1));
    resetAutoSlide();
  };

  const resetAutoSlide = () => {
    clearInterval(autoSlideInterval.current);
    autoSlideInterval.current = setInterval(() => {
      if (expandedCard === null) {
        setCurrentSlide((prev) => (prev === updates.length - 1 ? 0 : prev + 1));
      }
    }, 7000);
  };

  const toggleExpand = (index) => {
    if (expandedCard === index) {
      setExpandedCard(null);
    } else {
      setExpandedCard(index);
      clearInterval(autoSlideInterval.current);
    }
  };

  const CurrentIcon = updates[currentSlide].icon;

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-[var(--color-primary)]/5 to-transparent">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Latest Updates</h2>
          <p className="text-xl text-[var(--color-text)]/70">
            Discover our newest features and improvements
          </p>
        </div>

        <div className="relative">
          <div className="overflow-hidden h-[500px]">
            <AnimatePresence initial={false}>
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 px-4"
              >
                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 h-full">
                  <div className={`w-12 h-12 ${updates[currentSlide].color}/10 rounded-lg flex items-center justify-center mb-6`}>
                    <CurrentIcon className={`w-6 h-6 ${updates[currentSlide].color}`} />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">{updates[currentSlide].title}</h3>
                  
                  <AnimatePresence>
                    {expandedCard === currentSlide ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[var(--color-text)]/80 mb-6 overflow-y-auto max-h-[300px]"
                      >
                        {updates[currentSlide].content.split('\n').map((paragraph, i) => (
                          <p key={i} className="mb-4">{paragraph}</p>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[var(--color-text)]/80 mb-6"
                      >
                        {updates[currentSlide].preview}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button 
                    onClick={() => toggleExpand(currentSlide)}
                    className={`font-medium transition-colors ${expandedCard === currentSlide ? 'text-white' : 'text-white hover:text-purple-300'}`}
                  >
                    {expandedCard === currentSlide ? 'Show Less' : 'Read More'}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button 
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white/10 p-3 rounded-full backdrop-blur-sm border border-white/10 hover:bg-purple-500/30 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="text-white" />
          </button>
          
          <button 
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white/10 p-3 rounded-full backdrop-blur-sm border border-white/10 hover:bg-purple-500/30 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="text-white" />
          </button>
        </div>

        <div className="flex justify-center mt-8 space-x-2">
          {updates.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentSlide(index);
                resetAutoSlide();
              }}
              className={`w-2 h-2 rounded-full transition-colors ${currentSlide === index ? 'bg-purple-500' : 'bg-white/50 hover:bg-white/80'}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureUpdates;