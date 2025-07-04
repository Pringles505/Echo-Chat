import Navbar from './HomepageComponents/Navbar.jsx';
import Hero from './HomepageComponents/Hero.jsx';
import Features from './HomepageComponents/Features.jsx';
import Pricing from './HomepageComponents/Pricing.jsx';
import Footer from './HomepageComponents/Footer.jsx';
import WaveBackground from './HomepageComponents/WaveBackground.jsx';
import ParticlesBackground from './HomepageComponents/ParticlesBackground.jsx';

function HomePage() {
  return (
    <div className="min-h-screen bg-primary-1000 text-white font-sans">
      <ParticlesBackground />
      <Navbar />
      <WaveBackground />
      <div className="relative z-10">
        <Hero />
        <Features />
        <Pricing />
        <Footer />
      </div>
    </div>
  );
}

export default HomePage;
