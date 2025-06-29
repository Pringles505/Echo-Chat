import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Check, Lock, Code, Server } from "lucide-react";

const plans = [
  {
    name: "Free Tier",
    price: "0",
    features: [
      "Echo Protocol Encryption",
      "Same cryptographic security as paid plans",
      "Basic static wallpapers",
      "10+ curated designs",
      "Community support",
      "Open-source transparency",
    ],
    current: true,
    icon: <Lock className="w-5 h-5 text-green-400" />,
  },
  {
    name: "Wallpaper Bundle",
    price: "9.99",
    features: [
      "All Free Tier security features",
      "API access for custom integrations",
      "Direct protocol implementation",
      "100+ animated 4K wallpapers",
      "Custom color palettes",
      "Unlimited changes",
      "Priority support",
      "Weekly new designs",
    ],
    popular: true,
    badge: "MOST POPULAR",
    icon: <Code className="w-5 h-5 text-[var(--color-secondary)]" />,
  },
  {
    name: "Echo Enterprise",
    price: "49.99",
    features: [
      "Everything in Creator Pass",
      "White-label protocol deployment",
      "Dedicated security audits",
      "AI-powered dynamic wallpapers",
      "Cross-device sync",
      "24/7 VIP support",
      "On-premise deployment options",
      "SLA guarantees",
    ],
    badge: "ENTERPRISE-GRADE",
    icon: <Server className="w-5 h-5 text-purple-400" />,
  },
];

const Pricing = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const handleLoginRedirect = () => {
    window.location.href = "/login";
  };

  return (
    <section id="pricing" className="py-20 px-4" ref={ref}> {/* Añadido id="pricing" aquí */}
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Upgrade Your Experience</h2>
          <p className="text-lg text-[var(--color-text)]/70 max-w-2xl mx-auto">
            Echo Protocol encryption at every tier. Pay only for
            customization and advanced features.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className={`p-6 rounded-xl border ${
                plan.popular
                  ? "border-[var(--color-secondary)] bg-[var(--color-primary)]/10"
                  : "border-[var(--color-primary)]/10 bg-[var(--color-primary)]/5"
              } ${
                plan.name === "Echo Enterprise"
                  ? "border-purple-500/30 bg-gradient-to-b from-[var(--color-primary)]/5 to-purple-500/5"
                  : ""
              }`}
            >
              {/* Plan Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  {plan.badge && (
                    <span
                      className={`text-xs font-semibold mb-2 block px-2 py-1 rounded-full ${
                        plan.name === "Echo Enterprise"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-[var(--color-secondary)]/20 text-[var(--color-secondary)]"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    {plan.icon}
                    {plan.name}
                  </h3>
                </div>
                {plan.current && (
                  <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-1 rounded-full">
                    YOUR PLAN
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  {plan.current ? "Free" : `€${plan.price}`}
                </span>
                {!plan.current && (
                  <span className="text-[var(--color-text)]/60">/month</span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        plan.current
                          ? "text-green-400"
                          : plan.popular
                          ? "text-[var(--color-secondary)]"
                          : "text-purple-400"
                      } mr-2`}
                    />
                    <span className="text-[var(--color-text)]/90">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={plan.current ? handleLoginRedirect : undefined}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? "bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary)]/90"
                    : plan.name === "Echo Enterprise"
                    ? "bg-purple-500 text-white hover:bg-purple-600"
                    : plan.current
                    ? "bg-green-500/10 text-green-500 border border-green-500 hover:bg-green-500/20"
                    : "border-2 border-[var(--color-primary)] text-[var(--color-text)] hover:bg-[var(--color-primary)]/10"
                }`}
              >
                {plan.current
                  ? "Manage Account"
                  : plan.name === "Echo Enterprise"
                  ? "Go Premium+"
                  : "Start Customizing"}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Security Assurance Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full">
            <Lock className="w-5 h-5 text-green-400" />
            <span className="font-medium">All plans include:</span>
            <span className="text-sm opacity-80">
              Zero-Knowledge Encryption • Open-Source Audits • GDPR Compliance
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;