import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";

const securityLayers = [
  { 
    id: "aes", 
    label: "AES-256", 
    description: "Military-grade encryption standard used by governments worldwide.", 
    position: { top: "20%", left: "20%" },
    delay: 0 
  },
  { 
    id: "e2ee", 
    label: "E2EE", 
    description: "End-to-End Encryption: Only you and the recipient can read messages.", 
    position: { bottom: "40%", right: "10%" },
    delay: 1.2 
  },
  { 
    id: "audit", 
    label: "No Logs", 
    description: "Zero-knowledge architecture. We never store your metadata.", 
    position: { top: "15%", left: "50%" },
    delay: 0.5 
  },
  { 
    id: "keys", 
    label: "RSA-4096", 
    description: "Robust asymmetric cryptography for secure key exchange.", 
    position: { bottom: "20%", right: "25%" },
    delay: 1.5 
  },
  { 
    id: "pfs", 
    label: "PFS", 
    description: "Perfect Forward Secrecy ensures past sessions remain secure.", 
    position: { top: "25%", right: "15%" },
    delay: 1 
  },
  { 
    id: "hash", 
    label: "SHA-256", 
    description: "Cryptographic hashing verifies message integrity instantly.", 
    position: { bottom: "30%", left: "15%" },
    delay: 2 
  },
  { 
    id: "tor", 
    label: "Onion Routing", 
    description: "Traffic is bounced through random nodes to hide your location.", 
    position: { top: "40%", left: "10%" },
    delay: 0.8 
  },
];

const HeroAnimation = () => {
  const [activeLayer, setActiveLayer] = useState(null);
  const ref = useRef(null);

  // Valores del mouse
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Suavizado del movimiento
  const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

  // Transformar posición del mouse a grados de rotación
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

  // 1. CORRECCIÓN: Restricción del Área de Efecto
  const handleMouseMove = (e) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calcular centro
    const centerX = rect.left + width / 2;
    const centerY = rect.top + height / 2;
    
    // Calcular distancia del mouse al centro
    const dist = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));
    const maxDist = 350; // Radio de activación (px)

    if (dist < maxDist) {
      // Dentro del radio: calcular tilt normal
      const mouseXVal = (e.clientX - rect.left) / width - 0.5;
      const mouseYVal = (e.clientY - rect.top) / height - 0.5;
      x.set(mouseXVal);
      y.set(mouseYVal);
    } else {
      // Fuera del radio: resetear a 0 (suavizado por useSpring)
      x.set(0);
      y.set(0);
    }
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setActiveLayer(null);
  };

  return (
    <section
      className="relative w-full h-[850px] flex items-center justify-center overflow-hidden perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      ref={ref}
      style={{ perspective: "1000px" }}
    >
      {/* Fondo con Viñeta sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900/50 via-black to-black pointer-events-none" />

      {/* 4. FEATURE: Partículas de Ambiente */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <Particle key={i} />
        ))}
      </div>

      {/* CONTENEDOR CENTRAL ANIMADO (TILT) */}
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative z-10 w-[600px] h-[600px] flex items-center justify-center"
      >
        
        {/* Glow Central */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-violet-600/20 blur-[100px] rounded-full"
          style={{ transform: "translateZ(-50px)" }}
        />

        {/* LOGO CENTRAL */}
        <div 
            className="w-40 h-40 bg-black/80 backdrop-blur-md border border-violet-500/30 rounded-full flex items-center justify-center shadow-2xl relative z-20"
            style={{ transform: "translateZ(50px)" }}
        >
          <img 
            src="/EchoProtocolLogo.png" 
            alt="Echo Protocol" 
            className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(139,92,246,0.8)]" 
          />
        </div>

        {/* Capas de Seguridad Interactivas */}
        {securityLayers.map((layer) => (
          <FloatingText
            key={layer.id}
            data={layer}
            isActive={activeLayer === layer.id}
            isDimmed={activeLayer !== null && activeLayer !== layer.id}
            onHover={() => setActiveLayer(layer.id)}
            onLeave={() => setActiveLayer(null)}
          />
        ))}
        
        {/* Círculos decorativos orbitando */}
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border border-violet-500/10 rounded-full w-full h-full pointer-events-none"
            style={{ transform: "translateZ(-20px)" }}
        />
        <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute inset-12 border border-violet-500/20 rounded-full border-dashed pointer-events-none"
            style={{ transform: "translateZ(-10px)" }}
        />

      </motion.div>
      
      {/* Texto descriptivo */}
      <div className="absolute bottom-12 text-center z-20 pointer-events-none">
        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-white">
          Interactive Security
        </h3>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">
          Hover over the elements to explore our encryption layers.
        </p>
      </div>
    </section>
  );
};

// Componente de Partícula Individual
const Particle = () => {
  const randomX = Math.random() * 100;
  const randomY = Math.random() * 100;
  const duration = 10 + Math.random() * 20;
  
  return (
    <motion.div
      className="absolute w-1 h-1 bg-white/20 rounded-full"
      style={{ 
        left: `${randomX}%`, 
        top: `${randomY}%` 
      }}
      animate={{
        y: [0, -30, 0],
        opacity: [0, 0.5, 0],
        scale: [0, 1, 0]
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: "linear",
        delay: Math.random() * 5
      }}
    />
  );
};

// Componente Interactivo para los textos flotantes
const FloatingText = ({ data, isActive, isDimmed, onHover, onLeave }) => {
  return (
    <motion.div
      // 2. CORRECCIÓN B: Hitbox aumentado (p-6) para facilitar el hover
      className={`absolute p-6 cursor-pointer font-mono text-sm font-bold transition-all duration-300 flex items-center justify-center ${
        isActive 
          ? "text-cyan-400 z-50 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" 
          : isDimmed 
            ? "text-violet-300/20 blur-[1px]" 
            : "text-violet-300/60 hover:text-violet-200"
      }`}
      style={{ 
        ...data.position, 
        transform: "translateZ(30px)",
        textShadow: isActive ? "0 0 20px rgba(34,211,238,0.5)" : "none"
      }}
      initial={{ y: 0 }}
      animate={isActive ? { y: 0, scale: 1.1 } : { y: [0, -15, 0], scale: 1 }}
      transition={{
        y: {
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: data.delay,
        },
        scale: { duration: 0.2 }
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* El texto real */}
      <span className="relative z-10">{data.label}</span>

      {/* Tooltip Educativo */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            // 2. CORRECCIÓN A: pointer-events-none para evitar parpadeo
            // 3. CORRECCIÓN: translateZ(100px) para evitar ocultamiento
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-4 bg-black/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] pointer-events-none z-50"
            style={{ transform: "translateZ(200px)", zIndex: 100 }} 
          >
            <div className="text-xs text-cyan-100 font-sans leading-relaxed text-center">
              <span className="block font-bold text-cyan-400 mb-1 text-xs uppercase tracking-wider">
                {data.label} Protocol
              </span>
              {data.description}
            </div>
            {/* Flecha del tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-cyan-500/30" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default HeroAnimation;