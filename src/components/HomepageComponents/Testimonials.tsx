import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Product Designer',
    content: 'ECHO has transformed how we handle our digital workflow. The interface is intuitive and the features are exactly what we needed.',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'Tech Lead',
    content: 'The security features and performance optimizations are impressive. ECHO has become an essential part of our tech stack.',
    rating: 5,
  },
  {
    name: 'Emma Davis',
    role: 'Marketing Director',
    content: 'The analytics and reporting features have given us invaluable insights into our campaigns. Highly recommended!',
    rating: 5,
  },
];

const Testimonials = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="py-20 px-4 bg-[var(--color-primary)]/5" ref={ref}>
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">What Our Users Say</h2>
          <p className="text-lg text-[var(--color-text)]/70">Don't just take our word for it</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="p-6 rounded-xl bg-[var(--color-background)] border border-[var(--color-primary)]/10"
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-[var(--color-secondary)]" fill="currentColor" />
                ))}
              </div>
              <p className="text-[var(--color-text)]/80 mb-4">{testimonial.content}</p>
              <div>
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-[var(--color-text)]/60">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;