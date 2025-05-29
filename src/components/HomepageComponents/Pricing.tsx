import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '29',
    features: [
      'Up to 5 team members',
      'Basic analytics',
      'Standard support',
      '1GB storage',
    ],
  },
  {
    name: 'Professional',
    price: '79',
    features: [
      'Up to 20 team members',
      'Advanced analytics',
      'Priority support',
      '10GB storage',
      'Custom integrations',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '199',
    features: [
      'Unlimited team members',
      'Full analytics suite',
      '24/7 dedicated support',
      'Unlimited storage',
      'Custom solutions',
      'API access',
    ],
  },
];

const Pricing = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="py-20 px-4" ref={ref}>
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-[var(--color-text)]/70">Choose the plan that works best for you</p>
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
                  ? 'border-[var(--color-secondary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-primary)]/10 bg-[var(--color-primary)]/5'
              }`}
            >
              {plan.popular && (
                <span className="text-[var(--color-secondary)] text-sm font-semibold mb-4 block">
                  MOST POPULAR
                </span>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-[var(--color-text)]/60">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <Check className="w-5 h-5 text-[var(--color-secondary)] mr-2" />
                    <span className="text-[var(--color-text)]/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary)]/90'
                    : 'border-2 border-[var(--color-primary)] text-[var(--color-text)] hover:bg-[var(--color-primary)]/10'
                }`}
              >
                Get Started
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Pricing;