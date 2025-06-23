import React, { useEffect } from 'react';

const ParticlesBackground = () => {
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'particles-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '1';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = Math.random() * 3 + 1;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      container.appendChild(particle);
      animateParticle(particle);
    };

    const animateParticle = (particle) => {
      const posX = Math.random() * 100;
      const posY = Math.random() * 100;
      particle.style.left = `${posX}%`;
      particle.style.top = `${posY}%`;
      particle.style.opacity = '0';

      const duration = Math.random() * 10 + 10;
      const delay = Math.random() * 5;

      setTimeout(() => {
        particle.style.transition = `all ${duration}s linear`;
        particle.style.opacity = String(Math.random() * 0.3 + 0.1);
        particle.style.left = `${posX + (Math.random() * 20 - 10)}%`;
        particle.style.top = `${posY - Math.random() * 30}%`;
        setTimeout(() => animateParticle(particle), duration * 1000);
      }, delay * 1000);
    };

    Array.from({ length: 80 }).forEach(createParticle);

    return () => {
      container.remove();
    };
  }, []);

  return null;
};

export default ParticlesBackground;