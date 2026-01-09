import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Users } from 'lucide-react';
import Navbar from '../components/HomepageComponents/Navbar';
import Footer from '../components/HomepageComponents/Footer';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Pricing = () => {
  const { t } = useTranslation();
  const [userCount, setUserCount] = useState(100);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const containerRef = useRef(null);
  const plansRef = useRef([]);

  const plans = [
    {
      name: 'Free',
      price: 0,
      description: 'Perfect for trying out Echo',
      users: '1-5',
      features: [
        '1-5 users',
        'Encrypted messaging',
        'Basic features',
        'Public documentation',
        'Community support',
      ],
      cta: 'Start Free',
      highlighted: false,
      pricePerUser: 0,
    },
    {
      name: 'Pro',
      price: 99,
      description: 'For growing teams',
      users: '6-50',
      features: [
        '6-50 users',
        'All Free features',
        'Group chats',
        'Ephemeral messages',
        'Advanced analytics',
        'Priority support',
        'Custom integrations',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
      pricePerUser: 2,
    },
    {
      name: 'Enterprise',
      price: null,
      description: 'Custom solution for your needs',
      users: '50+',
      features: [
        'Unlimited users',
        'All Pro features',
        'Dedicated support',
        'Custom SLA',
        'White-label options',
        'Advanced admin panel',
        'Webhooks & API access',
        'On-premise deployment',
      ],
      cta: 'Contact Sales',
      highlighted: false,
      pricePerUser: null,
    },
  ];

  const calculateProPrice = () => {
    const basePrice = 99;
    const extraUsers = Math.max(0, userCount - 6);
    return basePrice + extraUsers * 2;
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      plansRef.current.forEach((plan, index) => {
        gsap.fromTo(
          plan,
          {
            opacity: 0,
            y: 40,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            delay: index * 0.1,
            scrollTrigger: {
              trigger: plan,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleCheckout = (planName) => {
    // Mock Stripe checkout
    const checkoutData = {
      plan: planName,
      users: userCount,
      period: billingPeriod,
      price: planName === 'Pro' ? calculateProPrice() : plans[0].price,
      timestamp: new Date().toISOString(),
    };
    console.log('Mock Stripe Checkout:', checkoutData);
    alert(`Mock checkout for ${planName} plan. In production, this would redirect to Stripe.`);
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <main ref={containerRef} className="pt-24">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-block mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-primary-400 bg-primary-950 px-3 py-1.5 rounded-full border border-primary-800">
                Transparent Pricing
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto mb-8">
              Choose the plan that scales with your team. No hidden fees. Cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="flex justify-center items-center space-x-4 mb-12">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-250 ${
                  billingPeriod === 'monthly'
                    ? 'bg-primary-600 text-white'
                    : 'text-neutral-400 hover:text-primary-400'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-250 ${
                  billingPeriod === 'yearly'
                    ? 'bg-primary-600 text-white'
                    : 'text-neutral-400 hover:text-primary-400'
                }`}
              >
                Yearly
              </button>
              <span className="text-primary-400 text-sm font-semibold">Save 20%</span>
            </div>
          </div>
        </section>

        {/* User Calculator */}
        <section className="relative py-12 bg-neutral-900/50 border-y border-primary-800/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-center md:space-x-8">
              <div className="flex items-center space-x-3 mb-6 md:mb-0">
                <Users className="w-5 h-5 text-primary-400" />
                <span className="text-neutral-300 font-medium">Team size:</span>
              </div>
              <input
                type="range"
                min="1"
                max="500"
                value={userCount}
                onChange={(e) => setUserCount(parseInt(e.target.value))}
                className="w-full md:w-64 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <span className="text-2xl font-bold text-primary-400 min-w-20 text-center">
                {userCount}
              </span>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="relative py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  ref={(el) => (plansRef.current[index] = el)}
                  className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                    plan.highlighted
                      ? 'ring-2 ring-primary-600 md:scale-105'
                      : 'border border-primary-800/20 hover:border-primary-600/40'
                  }`}
                >
                  {/* Background */}
                  <div
                    className={`absolute inset-0 ${
                      plan.highlighted ? 'bg-gradient-to-br from-primary-950 to-neutral-900' : 'bg-neutral-900/50'
                    }`}
                  ></div>

                  {/* Badge */}
                  {plan.highlighted && (
                    <div className="absolute top-0 right-0 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Most Popular
                    </div>
                  )}

                  {/* Content */}
                  <div className="relative z-10 p-8">
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-neutral-400 text-sm mb-6">{plan.description}</p>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.price !== null ? (
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-white">
                            ${plan.name === 'Pro' ? calculateProPrice() : plan.price}
                          </span>
                          <span className="text-neutral-400 ml-2">
                            /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xl text-neutral-300 font-semibold">Custom pricing</p>
                      )}
                      <p className="text-neutral-500 text-sm mt-2">For {plan.users} users</p>
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => handleCheckout(plan.name)}
                      className={`w-full py-3 rounded-lg font-semibold mb-8 transition-all duration-300 flex items-center justify-center space-x-2 ${
                        plan.highlighted
                          ? 'bg-primary-600 hover:bg-primary-500 text-white'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-primary-400'
                      }`}
                    >
                      <span>{plan.cta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Features */}
                    <div className="space-y-3">
                      {plan.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-start space-x-3">
                          <Check className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                          <span className="text-neutral-300 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="relative py-20 bg-neutral-900/50 border-y border-primary-800/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              {[
                {
                  q: 'Can I upgrade or downgrade my plan?',
                  a: 'Yes, you can change your plan at any time. Changes take effect on your next billing cycle.',
                },
                {
                  q: 'What payment methods do you accept?',
                  a: 'We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.',
                },
                {
                  q: 'Is there a free trial?',
                  a: 'Yes! All Pro and Enterprise plans include a 14-day free trial with no credit card required.',
                },
                {
                  q: 'What is your refund policy?',
                  a: 'We offer a 30-day money-back guarantee if you\'re not satisfied with Echo.',
                },
              ].map((item, index) => (
                <details
                  key={index}
                  className="group border border-primary-800/20 rounded-lg p-4 hover:border-primary-600/40 transition-colors duration-250"
                >
                  <summary className="cursor-pointer flex items-center justify-between font-semibold text-white">
                    {item.q}
                    <span className="text-primary-400 group-open:rotate-180 transition-transform duration-300">
                      ▼
                    </span>
                  </summary>
                  <p className="text-neutral-400 mt-4 text-sm leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Not sure which plan is right for you?
            </h2>
            <p className="text-neutral-400 mb-8">
              Our team can help you find the perfect solution for your security needs.
            </p>
            <Link
              to="/contact-us"
              className="inline-flex items-center space-x-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-lg transition-all duration-300"
            >
              <span>Talk to Sales</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
