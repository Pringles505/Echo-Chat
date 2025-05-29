import Navbar from './HomepageComponents/Navbar';
import Hero from './HomepageComponents/Hero';
import Features from './HomepageComponents/Features';
import Testimonials from './HomepageComponents/Testimonials';
import Pricing from './HomepageComponents/Pricing';
import Footer from './HomepageComponents/Footer';
import WaveBackground from './HomepageComponents/WaveBackground';
import ParticlesBackground from './HomepageComponents/ParticlesBackground';

function HomePage() {
  return (
    <div className="relative min-h-screen bg-primary-150 text-white font-sans">
      <ParticlesBackground />
      <Navbar />
      <WaveBackground />
      <div className="relative z-10">
        <Hero />
        <Features />
        <Testimonials />
        <Pricing />
        <Footer />
      </div>
    </div>
  );
}

export default HomePage;
